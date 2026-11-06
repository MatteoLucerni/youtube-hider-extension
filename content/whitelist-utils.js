const CHANNEL_LIST_STORAGE_KEYS = ['channelWhitelist', 'channelBlacklist'];
const TITLE_LIST_STORAGE_KEYS = ['titleWhitelist', 'titleBlacklist'];
const MARKED_WATCHED_KEY = 'markedWatched';
const MARKED_WATCHED_META_KEY = 'markedWatchedMeta';
const MARKED_WATCHED_LIMIT = 3000;
const MARKED_WATCHED_WARN_AT = 2700;
const LOCAL_PREF_KEYS = [...CHANNEL_LIST_STORAGE_KEYS, ...TITLE_LIST_STORAGE_KEYS, MARKED_WATCHED_KEY];

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

const LIST_EXPORT_FORMAT = 'youtube-hider-lists';
const LIST_EXPORT_VERSION = 1;
const MARKED_WATCHED_EXPORT_FORMAT = 'youtube-hider-marked-watched';
const CHANNEL_INPUT_HOST = /(^|\.)youtube\.com$/i;
const CHANNEL_INPUT_SCHEME = /^[a-z][a-z0-9+.-]*:\/\//i;

function normalizeChannelPath(pathname) {
  if (typeof pathname !== 'string') return null;
  const handle = pathname.match(/^\/@([^/?#\s]+)/);
  if (handle) return ('/@' + handle[1]).toLowerCase();
  const id = pathname.match(/^\/channel\/([A-Za-z0-9_-]+)/);
  if (id) return ('/channel/' + id[1]).toLowerCase();
  const user = pathname.match(/^\/user\/([^/?#\s]+)/);
  if (user) return ('/user/' + user[1]).toLowerCase();
  return null;
}

function parseChannelEntry(raw) {
  const text = typeof raw === 'string' ? raw.trim() : '';
  if (!text) return null;
  let pathname;
  if (text.startsWith('@')) {
    pathname = '/' + text;
  } else if (text.startsWith('/')) {
    pathname = text;
  } else {
    try {
      const url = new URL(CHANNEL_INPUT_SCHEME.test(text) ? text : 'https://' + text);
      if (!CHANNEL_INPUT_HOST.test(url.hostname)) return null;
      pathname = url.pathname;
    } catch (_) {
      return null;
    }
  }
  try {
    pathname = new URL(pathname, 'https://www.youtube.com').pathname;
  } catch (_) {
    return null;
  }
  return normalizeChannelPath(pathname);
}

function parseChannelInput(text) {
  const tokens = typeof text === 'string' ? text.split(/[\s,]+/).filter(Boolean) : [];
  const channels = [];
  const invalid = [];
  tokens.forEach(token => {
    const channel = parseChannelEntry(token);
    if (channel) {
      if (!channels.includes(channel)) channels.push(channel);
    } else if (!invalid.includes(token)) {
      invalid.push(token);
    }
  });
  return { entries: channels, invalid };
}

function parseTitleInput(text) {
  const lines = typeof text === 'string' ? text.split(/\r?\n/) : [];
  const words = [];
  lines.forEach(line => {
    const word = normalizeTitleKeyword(line);
    if (word && !titleKeywordListIncludes(word, words)) words.push(word);
  });
  return { entries: words, invalid: [] };
}

function listEntryIdentity(kind, entry) {
  return kind === 'title' ? titleKeywordKey(entry) : entry;
}

function planListAddition(kind, entries, list, otherList) {
  const identity = entry => listEntryIdentity(kind, entry);
  const present = new Set((Array.isArray(list) ? list : []).map(identity));
  const inOther = new Set((Array.isArray(otherList) ? otherList : []).map(identity));
  const plan = { add: [], existing: [], moved: [] };
  (Array.isArray(entries) ? entries : []).forEach(entry => {
    const key = identity(entry);
    if (present.has(key)) plan.existing.push(entry);
    else if (inOther.has(key)) plan.moved.push(entry);
    else plan.add.push(entry);
    present.add(key);
  });
  return plan;
}

function removeListEntries(kind, list, entries) {
  const targets = new Set((Array.isArray(entries) ? entries : []).map(entry => listEntryIdentity(kind, entry)));
  const kept = [];
  const removed = [];
  (Array.isArray(list) ? list : []).forEach((entry, index) => {
    if (targets.has(listEntryIdentity(kind, entry))) removed.push([entry, index]);
    else kept.push(entry);
  });
  return { list: kept, removed };
}

function restoreListEntries(kind, list, removed) {
  const next = Array.isArray(list) ? [...list] : [];
  const present = new Set(next.map(entry => listEntryIdentity(kind, entry)));
  [...(Array.isArray(removed) ? removed : [])]
    .sort((a, b) => a[1] - b[1])
    .forEach(([entry, index]) => {
      const key = listEntryIdentity(kind, entry);
      if (present.has(key)) return;
      next.splice(Math.min(index, next.length), 0, entry);
      present.add(key);
    });
  return next;
}

function formatChannelForDisplay(channel) {
  if (typeof channel !== 'string') return '';
  let text = channel;
  try {
    text = decodeURIComponent(channel);
  } catch (_) {}
  return text.startsWith('/') ? text.slice(1) : text;
}

function getChannelPageUrl(channel) {
  if (typeof channel !== 'string') return null;
  if (channel.startsWith('/@') || channel.startsWith('/user/')) return 'https://www.youtube.com' + channel;
  return null;
}

function matchesListQuery(texts, query) {
  const needle = typeof query === 'string' ? query.replace(/\s+/g, ' ').trim().toLowerCase() : '';
  if (!needle) return true;
  return texts.some(text => typeof text === 'string' && text.toLowerCase().includes(needle));
}

function parseImportedMarkedVideos(videos, now) {
  const list = [];
  const meta = {};
  videos.forEach(video => {
    const id = typeof video === 'string' ? video : video && video.id;
    if (!isValidVideoId(id)) return;
    const markedAt = video && Number.isFinite(video.markedAt) ? video.markedAt : now;
    list.push([id, markedAt]);
    if (video && (video.title || video.channel)) meta[id] = normalizeMarkedWatchedMetaEntry(video.title, video.channel);
  });
  return { list, meta };
}

function parseListsImport(data, now = Math.floor(Date.now() / 1000)) {
  const result = {
    channelWhitelist: [],
    channelBlacklist: [],
    titleWhitelist: [],
    titleBlacklist: [],
    markedWatched: { list: [], meta: {} },
  };
  if (Array.isArray(data)) {
    result.markedWatched = parseImportedMarkedVideos(data, now);
    return result;
  }
  if (!data || typeof data !== 'object') throw new Error('unrecognized');
  if (data.format === LIST_EXPORT_FORMAT) {
    CHANNEL_LIST_STORAGE_KEYS.forEach(key => {
      const raw = Array.isArray(data[key]) ? data[key] : [];
      result[key] = parseChannelInput(raw.filter(entry => typeof entry === 'string').join('\n')).entries;
    });
    TITLE_LIST_STORAGE_KEYS.forEach(key => {
      const raw = Array.isArray(data[key]) ? data[key] : [];
      result[key] = parseTitleInput(raw.filter(entry => typeof entry === 'string').join('\n')).entries;
    });
    if (Array.isArray(data.markedWatched)) result.markedWatched = parseImportedMarkedVideos(data.markedWatched, now);
    return result;
  }
  if (data.format === MARKED_WATCHED_EXPORT_FORMAT || Array.isArray(data.videos)) {
    result.markedWatched = parseImportedMarkedVideos(Array.isArray(data.videos) ? data.videos : [], now);
    return result;
  }
  throw new Error('unrecognized');
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    MARKED_WATCHED_KEY,
    MARKED_WATCHED_META_KEY,
    MARKED_WATCHED_LIMIT,
    LOCAL_PREF_KEYS,
    LIST_EXPORT_FORMAT,
    parseChannelEntry,
    parseChannelInput,
    parseTitleInput,
    planListAddition,
    removeListEntries,
    restoreListEntries,
    formatChannelForDisplay,
    getChannelPageUrl,
    matchesListQuery,
    parseListsImport,
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
  };
}
