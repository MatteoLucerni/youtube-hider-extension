const CHANNEL_LIST_STORAGE_KEYS = ['channelWhitelist', 'channelBlacklist'];
const MARKED_WATCHED_KEY = 'markedWatched';
const MARKED_WATCHED_META_KEY = 'markedWatchedMeta';
const MARKED_WATCHED_LIMIT = 3000;
const MARKED_WATCHED_WARN_AT = 2700;
const LOCAL_PREF_KEYS = [...CHANNEL_LIST_STORAGE_KEYS, MARKED_WATCHED_KEY];

function splitChannelListUpdates(updates) {
  const local = {};
  const sync = {};
  Object.entries(updates || {}).forEach(([key, value]) => {
    if (LOCAL_PREF_KEYS.includes(key)) local[key] = value;
    else sync[key] = value;
  });
  return { local, sync };
}

function pickStorageChanges(changes, area) {
  const picked = {};
  Object.keys(changes || {}).forEach(key => {
    const isListKey = LOCAL_PREF_KEYS.includes(key);
    if ((area === 'local' && isListKey) || (area === 'sync' && !isListKey)) {
      picked[key] = changes[key];
    }
  });
  return Object.keys(picked).length ? picked : null;
}

function channelListIncludes(channel, list) {
  if (!channel || !Array.isArray(list)) return false;
  if (Array.isArray(channel)) return channel.some(c => list.includes(c));
  return list.includes(channel);
}

function pluralizeChannelWord(channel) {
  const isMulti = Array.isArray(channel) && channel.length > 1;
  return {
    channelWord: isMulti ? 'these channels' : 'this channel',
    possessive: isMulti ? 'their' : 'its',
  };
}

function computeWhitelistUpdate(
  channel,
  shouldWhitelist,
  list,
  enabled,
  keys = { listKey: 'channelWhitelist', enabledKey: 'channelWhitelistEnabled' },
) {
  if (!channel) return null;
  const channels = Array.isArray(channel) ? channel : [channel];
  if (!channels.length) return null;

  const current = Array.isArray(list) ? list : [];
  const allPresent = channels.every(c => current.includes(c));
  const anyPresent = channels.some(c => current.includes(c));
  const needsListChange = shouldWhitelist ? !allPresent : anyPresent;
  const needsReEnable = shouldWhitelist && !enabled;
  if (!needsListChange && !needsReEnable) return null;

  const updates = {};
  let nextList = current;
  let changedChannels = [];
  if (needsListChange) {
    changedChannels = shouldWhitelist
      ? channels.filter(c => !current.includes(c))
      : channels.filter(c => current.includes(c));
    nextList = shouldWhitelist
      ? [...current, ...changedChannels]
      : current.filter(c => !channels.includes(c));
    updates[keys.listKey] = nextList;
  }
  if (needsReEnable) {
    updates[keys.enabledKey] = true;
  }

  return { list: nextList, updates, changedChannels, enabledChanged: !!needsReEnable };
}

const TITLE_KEYWORD_MAX_LENGTH = 100;
const TITLE_KEYWORD_LIST_MAX_BYTES = 8192;
const TITLE_WORD_START = /^[\p{L}\p{N}]/u;
const TITLE_WORD_CHAR = /^[\p{L}\p{N}\p{M}]$/u;
const TITLE_UNSPACED_SCRIPT =
  /^[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Thai}\p{Script=Lao}\p{Script=Khmer}\p{Script=Myanmar}]$/u;

function normalizeTitleKeyword(raw) {
  if (typeof raw !== 'string') return '';
  return raw.replace(/\s+/g, ' ').trim().slice(0, TITLE_KEYWORD_MAX_LENGTH);
}

function titleKeywordKey(keyword) {
  return normalizeTitleKeyword(keyword).toLowerCase();
}

function titleKeywordListIncludes(keyword, list) {
  const key = titleKeywordKey(keyword);
  if (!key || !Array.isArray(list)) return false;
  return list.some(k => titleKeywordKey(k) === key);
}

function isTitleWordBoundary(haystack, index) {
  if (index === 0) return true;
  const before = String.fromCodePoint(haystack.codePointAt(index - 1));
  return !TITLE_WORD_CHAR.test(before) || TITLE_UNSPACED_SCRIPT.test(before);
}

function titleContainsKeyword(haystack, key) {
  const first = String.fromCodePoint(key.codePointAt(0));
  if (!TITLE_WORD_START.test(first) || TITLE_UNSPACED_SCRIPT.test(first)) {
    return haystack.includes(key);
  }
  let index = haystack.indexOf(key);
  while (index !== -1) {
    if (isTitleWordBoundary(haystack, index)) return true;
    index = haystack.indexOf(key, index + 1);
  }
  return false;
}

function findTitleKeywordMatch(title, keywords) {
  if (!Array.isArray(keywords) || !keywords.length) return null;
  const haystack = typeof title === 'string' ? title.replace(/\s+/g, ' ').toLowerCase() : '';
  if (!haystack) return null;
  const match = keywords.find(k => {
    const key = titleKeywordKey(k);
    return !!key && titleContainsKeyword(haystack, key);
  });
  return match === undefined ? null : match;
}

function titleMatchesKeyword(title, keywords) {
  return findTitleKeywordMatch(title, keywords) !== null;
}

function titleKeywordListFits(listKey, list) {
  const bytes = new TextEncoder().encode(listKey + JSON.stringify(list)).length;
  return bytes <= TITLE_KEYWORD_LIST_MAX_BYTES;
}

const MARKED_WATCHED_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

function isValidVideoId(id) {
  return typeof id === 'string' && MARKED_WATCHED_ID_PATTERN.test(id);
}

function normalizeMarkedWatched(list, limit = MARKED_WATCHED_LIMIT) {
  if (!Array.isArray(list)) return [];
  const latest = new Map();
  list.forEach(entry => {
    if (!Array.isArray(entry) || !isValidVideoId(entry[0])) return;
    const markedAt = Number.isFinite(entry[1]) ? Math.max(0, Math.floor(entry[1])) : 0;
    const previous = latest.get(entry[0]);
    if (previous === undefined || markedAt > previous) latest.set(entry[0], markedAt);
  });
  const sorted = [...latest.entries()]
    .map(([id, markedAt]) => [id, markedAt])
    .sort((a, b) => a[1] - b[1]);
  return sorted.length > limit ? sorted.slice(sorted.length - limit) : sorted;
}

function describeMarkedWatchedCount(count) {
  if (!count) return { text: getText('markedCountNone'), nearLimit: false };
  const substitutions = [formatLocaleNumber(count), formatLocaleNumber(MARKED_WATCHED_LIMIT)];
  if (count >= MARKED_WATCHED_LIMIT) {
    return { text: getPluralText('markedCountFull', count, substitutions), nearLimit: true };
  }
  if (count >= MARKED_WATCHED_WARN_AT) {
    return { text: getPluralText('markedCountAlmostFull', count, substitutions), nearLimit: true };
  }
  return { text: getPluralText('markedCount', count, substitutions), nearLimit: false };
}

function markedWatchedEqual(a, b) {
  return JSON.stringify(normalizeMarkedWatched(a)) === JSON.stringify(normalizeMarkedWatched(b));
}

function markedWatchedIncludes(list, id) {
  return Array.isArray(list) && list.some(entry => Array.isArray(entry) && entry[0] === id);
}

function computeMarkedWatchedUpdate(list, ids, shouldMark, now = Math.floor(Date.now() / 1000)) {
  const targets = (Array.isArray(ids) ? ids : [ids]).filter(isValidVideoId);
  if (!targets.length) return null;
  const current = normalizeMarkedWatched(list);
  const targetSet = new Set(targets);
  if (shouldMark) {
    const next = normalizeMarkedWatched([
      ...current.filter(entry => !targetSet.has(entry[0])),
      ...targets.map(id => [id, now]),
    ]);
    return markedWatchedEqual(current, next) ? null : next;
  }
  const next = current.filter(entry => !targetSet.has(entry[0]));
  return next.length === current.length ? null : next;
}

function normalizeMarkedWatchedMetaEntry(title, channel) {
  const cleanTitle = typeof title === 'string' ? title.replace(/\s+/g, ' ').trim().slice(0, 200) : '';
  const firstChannel = Array.isArray(channel) ? channel[0] : channel;
  const cleanChannel = typeof firstChannel === 'string' ? firstChannel.slice(0, 100) : '';
  return [cleanTitle, cleanChannel];
}

function pruneMarkedWatchedMeta(meta, list) {
  const source = meta && typeof meta === 'object' && !Array.isArray(meta) ? meta : {};
  const pruned = {};
  normalizeMarkedWatched(list).forEach(([id]) => {
    const entry = source[id];
    if (Array.isArray(entry)) pruned[id] = normalizeMarkedWatchedMetaEntry(entry[0], entry[1]);
  });
  return pruned;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    MARKED_WATCHED_KEY,
    MARKED_WATCHED_META_KEY,
    MARKED_WATCHED_LIMIT,
    LOCAL_PREF_KEYS,
    splitChannelListUpdates,
    pickStorageChanges,
    isValidVideoId,
    normalizeMarkedWatched,
    describeMarkedWatchedCount,
    markedWatchedEqual,
    markedWatchedIncludes,
    computeMarkedWatchedUpdate,
    normalizeMarkedWatchedMetaEntry,
    pruneMarkedWatchedMeta,
    channelListIncludes,
    computeWhitelistUpdate,
    normalizeTitleKeyword,
    titleKeywordListIncludes,
    findTitleKeywordMatch,
    titleMatchesKeyword,
    titleKeywordListFits,
  };
}
