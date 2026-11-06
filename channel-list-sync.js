const CHANNEL_LIST_LOCAL_KEYS = ['channelWhitelist', 'channelBlacklist', 'titleWhitelist', 'titleBlacklist'];
const CHANNEL_LIST_INDEX_KEY = 'channelListsIndex';
const CHANNEL_LIST_CHUNK_PREFIX = 'chl.';
const CHANNEL_LIST_BASE_KEY = 'channelListsSyncBase';
const CHANNEL_LIST_STATE_KEY = 'channelListsSyncState';
const CHANNEL_LIST_FORMAT_VERSION = 2;
const CHANNEL_LIST_READABLE_VERSIONS = [1, 2];
const CHANNEL_LIST_CHUNK_LENGTH = 8000;
const SYNC_QUOTA_BYTES = 102400;
const SYNC_QUOTA_BYTES_PER_ITEM = 8192;
const SYNC_RESERVED_BYTES = 4096;

const LIST_KEYS = ['w', 'b', 'tw', 'tb'];
const CHANNEL_LIST_KEYS = ['w', 'b'];
const TITLE_LIST_KEYS = ['tw', 'tb'];
const LIST_STORAGE_KEYS = {
  w: 'channelWhitelist',
  b: 'channelBlacklist',
  tw: 'titleWhitelist',
  tb: 'titleBlacklist',
};

function listEntryKey(listKey, entry) {
  if (TITLE_LIST_KEYS.includes(listKey)) return entry.replace(/\s+/g, ' ').trim().toLowerCase();
  return entry;
}

function normalizeListEntries(listKey, entries) {
  if (!Array.isArray(entries)) return [];
  const seen = new Set();
  const result = [];
  entries.forEach(entry => {
    if (typeof entry !== 'string' || !entry) return;
    const key = listEntryKey(listKey, entry);
    if (!key || seen.has(key)) return;
    seen.add(key);
    result.push(entry);
  });
  return result;
}

function normalizeChannelLists(lists) {
  const source = lists || {};
  const normalized = {};
  LIST_KEYS.forEach(key => {
    normalized[key] = normalizeListEntries(key, source[key]);
  });
  return normalized;
}

function readChannelListsFromStorage(items) {
  const source = items || {};
  const lists = {};
  LIST_KEYS.forEach(key => {
    lists[key] = source[LIST_STORAGE_KEYS[key]];
  });
  return normalizeChannelLists(lists);
}

function channelListsToStorage(lists) {
  const normalized = normalizeChannelLists(lists);
  const items = {};
  LIST_KEYS.forEach(key => {
    items[LIST_STORAGE_KEYS[key]] = normalized[key];
  });
  return items;
}

function sortedListKeys(listKey, entries) {
  return entries.map(entry => listEntryKey(listKey, entry)).sort();
}

function channelListsEqual(a, b) {
  const left = normalizeChannelLists(a);
  const right = normalizeChannelLists(b);
  return LIST_KEYS.every(
    key => JSON.stringify(sortedListKeys(key, left[key])) === JSON.stringify(sortedListKeys(key, right[key])),
  );
}

function bytesToBase64(bytes) {
  let binary = '';
  const step = 0x8000;
  for (let i = 0; i < bytes.length; i += step) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + step));
  }
  return btoa(binary);
}

function base64ToBytes(text) {
  const binary = atob(text);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

const BASE91_ALPHABET = (() => {
  let alphabet = '';
  for (let code = 0x21; code <= 0x7e; code++) {
    const char = String.fromCharCode(code);
    if (char !== '"' && char !== '\\' && char !== '`') alphabet += char;
  }
  return alphabet;
})();

const BASE91_INDEX = (() => {
  const index = new Map();
  for (let i = 0; i < BASE91_ALPHABET.length; i++) index.set(BASE91_ALPHABET.charCodeAt(i), i);
  return index;
})();

function bytesToBase91(bytes) {
  let out = '';
  let queue = 0;
  let bits = 0;
  for (let i = 0; i < bytes.length; i++) {
    queue |= bytes[i] << bits;
    bits += 8;
    if (bits > 13) {
      let value = queue & 8191;
      if (value > 88) {
        queue >>>= 13;
        bits -= 13;
      } else {
        value = queue & 16383;
        queue >>>= 14;
        bits -= 14;
      }
      out += BASE91_ALPHABET[value % 91] + BASE91_ALPHABET[Math.floor(value / 91)];
    }
  }
  if (bits) {
    out += BASE91_ALPHABET[queue % 91];
    if (bits > 7 || queue > 90) out += BASE91_ALPHABET[Math.floor(queue / 91)];
  }
  return out;
}

function base91ToBytes(text) {
  const out = [];
  let value = -1;
  let queue = 0;
  let bits = 0;
  for (let i = 0; i < text.length; i++) {
    const digit = BASE91_INDEX.get(text.charCodeAt(i));
    if (digit === undefined) throw new Error('Invalid base91 character');
    if (value < 0) {
      value = digit;
      continue;
    }
    value += digit * 91;
    queue |= value << bits;
    bits += (value & 8191) > 88 ? 13 : 14;
    do {
      out.push(queue & 255);
      queue >>>= 8;
      bits -= 8;
    } while (bits > 7);
    value = -1;
  }
  if (value > -1) out.push((queue | (value << bits)) & 255);
  return new Uint8Array(out);
}

async function pipeBytes(bytes, transform) {
  const stream = new Blob([bytes]).stream().pipeThrough(transform);
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

const LIST_SEPARATOR = '\u001e';
const ENTRY_SEPARATOR = '\n';
const FRONT_CODING_BASE = 0x21;
const FRONT_CODING_MAX = 90;
const CHANNEL_ID_MARKER = '#';
const CHANNEL_RAW_MARKER = '!';
const CHANNEL_HANDLE_PREFIX = '/@';
const CHANNEL_ID_PREFIX = '/channel/';

function sanitizeListEntry(entry) {
  return entry.replace(/[\u0000-\u001f]+/g, ' ');
}

function isCompactMarker(char) {
  return char === CHANNEL_ID_MARKER || char === CHANNEL_RAW_MARKER;
}

function compactChannel(channel) {
  if (channel.startsWith(CHANNEL_HANDLE_PREFIX)) {
    const handle = channel.slice(CHANNEL_HANDLE_PREFIX.length);
    if (handle && !isCompactMarker(handle[0])) return handle;
  }
  if (channel.startsWith(CHANNEL_ID_PREFIX)) {
    return CHANNEL_ID_MARKER + channel.slice(CHANNEL_ID_PREFIX.length);
  }
  return CHANNEL_RAW_MARKER + channel;
}

function expandChannel(compact) {
  if (compact[0] === CHANNEL_ID_MARKER) return CHANNEL_ID_PREFIX + compact.slice(1);
  if (compact[0] === CHANNEL_RAW_MARKER) return compact.slice(1);
  return CHANNEL_HANDLE_PREFIX + compact;
}

function sharedPrefixLength(previous, current) {
  const max = Math.min(previous.length, current.length, FRONT_CODING_MAX);
  let length = 0;
  while (length < max && previous.charCodeAt(length) === current.charCodeAt(length)) length++;
  if (length > 0) {
    const last = current.charCodeAt(length - 1);
    if (last >= 0xd800 && last <= 0xdbff) length--;
  }
  return length;
}

function frontCodeEntries(entries) {
  const sorted = [...entries].sort();
  let previous = '';
  return sorted
    .map(entry => {
      const shared = sharedPrefixLength(previous, entry);
      previous = entry;
      return String.fromCharCode(FRONT_CODING_BASE + shared) + entry.slice(shared);
    })
    .join(ENTRY_SEPARATOR);
}

function frontDecodeEntries(text) {
  if (!text) return [];
  let previous = '';
  return text.split(ENTRY_SEPARATOR).map(line => {
    const shared = line.charCodeAt(0) - FRONT_CODING_BASE;
    const entry = previous.slice(0, shared) + line.slice(1);
    previous = entry;
    return entry;
  });
}

function serializeChannelLists(lists) {
  const normalized = normalizeChannelLists(lists);
  return LIST_KEYS.map(key => {
    const entries = normalized[key].map(sanitizeListEntry).filter(entry => entry.trim());
    const stored = CHANNEL_LIST_KEYS.includes(key) ? entries.map(compactChannel) : entries;
    return frontCodeEntries(stored);
  }).join(LIST_SEPARATOR);
}

function deserializeChannelLists(text) {
  const parts = text.split(LIST_SEPARATOR);
  const lists = {};
  LIST_KEYS.forEach((key, i) => {
    const entries = frontDecodeEntries(parts[i] || '');
    lists[key] = CHANNEL_LIST_KEYS.includes(key) ? entries.map(expandChannel) : entries;
  });
  return normalizeChannelLists(lists);
}

async function encodeChannelLists(lists) {
  const text = serializeChannelLists(lists);
  const compressed = await pipeBytes(new TextEncoder().encode(text), new CompressionStream('deflate-raw'));
  return bytesToBase91(compressed);
}

async function decodeChannelListsV1(text) {
  const bytes = await pipeBytes(base64ToBytes(text), new DecompressionStream('deflate-raw'));
  return normalizeChannelLists(JSON.parse(new TextDecoder().decode(bytes)));
}

async function decodeChannelLists(text, version = CHANNEL_LIST_FORMAT_VERSION) {
  if (version === 1) return decodeChannelListsV1(text);
  const bytes = await pipeBytes(base91ToBytes(text), new DecompressionStream('deflate-raw'));
  return deserializeChannelLists(new TextDecoder().decode(bytes));
}

function createChannelListGeneration(now = Date.now(), random = Math.random) {
  return now.toString(36) + random().toString(36).slice(2, 8).padEnd(6, '0');
}

function getChannelListChunkKey(gen, index) {
  return CHANNEL_LIST_CHUNK_PREFIX + gen + '.' + index;
}

function isChannelListChunkKey(key) {
  return typeof key === 'string' && key.startsWith(CHANNEL_LIST_CHUNK_PREFIX);
}

const CHANNEL_LIST_SYNC_LAYOUT = {
  indexKey: CHANNEL_LIST_INDEX_KEY,
  version: CHANNEL_LIST_FORMAT_VERSION,
  readableVersions: CHANNEL_LIST_READABLE_VERSIONS,
  chunkKey: getChannelListChunkKey,
};

function buildChunkedSyncItems(encoded, gen, parent, now, layout) {
  const items = {};
  let count = 0;
  for (let offset = 0; offset < encoded.length || count === 0; offset += CHANNEL_LIST_CHUNK_LENGTH) {
    items[layout.chunkKey(gen, count)] = encoded.slice(offset, offset + CHANNEL_LIST_CHUNK_LENGTH);
    count++;
  }
  items[layout.indexKey] = {
    v: layout.version,
    gen,
    p: parent || null,
    n: count,
    len: encoded.length,
    ts: now,
  };
  return items;
}

function readChunkedSyncPayload(items, layout) {
  const index = items && items[layout.indexKey];
  if (!index || typeof index.gen !== 'string') return { status: 'none' };
  const readable = layout.readableVersions || [layout.version];
  if (!readable.includes(index.v)) return { status: 'unsupported', gen: index.gen };
  const count = Number(index.n);
  if (!Number.isInteger(count) || count < 1) return { status: 'invalid', gen: index.gen };
  let encoded = '';
  for (let i = 0; i < count; i++) {
    const chunk = items[layout.chunkKey(index.gen, i)];
    if (typeof chunk !== 'string') return { status: 'incomplete', gen: index.gen };
    encoded += chunk;
  }
  if (encoded.length !== index.len) return { status: 'incomplete', gen: index.gen };
  return { status: 'complete', gen: index.gen, parent: index.p || null, version: index.v, encoded };
}

function buildChannelListSyncItems(encoded, gen, parent = null, now = Date.now()) {
  return buildChunkedSyncItems(encoded, gen, parent, now, CHANNEL_LIST_SYNC_LAYOUT);
}

function readChannelListSyncPayload(items) {
  return readChunkedSyncPayload(items, CHANNEL_LIST_SYNC_LAYOUT);
}

function resolveChannelListMergeBase(remoteParent, localGen, localBase) {
  if (!localGen || !localBase || remoteParent !== localGen) return null;
  return localBase;
}

function readLegacyChannelLists(items) {
  const source = items || {};
  const present = CHANNEL_LIST_LOCAL_KEYS.some(key => Array.isArray(source[key]));
  if (!present) return null;
  return readChannelListsFromStorage(source);
}

function getSyncItemBytes(key, value) {
  return new TextEncoder().encode(key).length + new TextEncoder().encode(JSON.stringify(value)).length;
}

function getSyncItemsBytes(items) {
  return Object.entries(items).reduce((total, [key, value]) => total + getSyncItemBytes(key, value), 0);
}

function isChannelListSyncKey(key) {
  return key === CHANNEL_LIST_INDEX_KEY || isChannelListChunkKey(key) || CHANNEL_LIST_LOCAL_KEYS.includes(key);
}

function planSyncWrite(currentItems, newItems, isOwnKey, isEvictableKey = () => false) {
  const others = {};
  const stale = {};
  const evictable = {};
  Object.entries(currentItems || {}).forEach(([key, value]) => {
    if (key in newItems) return;
    if (isOwnKey(key)) stale[key] = value;
    else if (isEvictableKey(key)) evictable[key] = value;
    else others[key] = value;
  });
  const oversizedItem = Object.entries(newItems).some(
    ([key, value]) => getSyncItemBytes(key, value) > SYNC_QUOTA_BYTES_PER_ITEM,
  );
  const otherBytes = getSyncItemsBytes(others);
  const newBytes = getSyncItemsBytes(newItems);
  const staleBytes = getSyncItemsBytes(stale);
  const evictableBytes = getSyncItemsBytes(evictable);
  const limit = SYNC_QUOTA_BYTES - SYNC_RESERVED_BYTES;
  const fits = !oversizedItem && otherBytes + newBytes <= limit;
  const keepsEvictable = fits && otherBytes + evictableBytes + newBytes <= limit;
  const keptBytes = otherBytes + (keepsEvictable ? evictableBytes : 0);
  return {
    fits,
    removeFirst: keptBytes + newBytes + staleBytes > limit,
    staleKeys: Object.keys(stale),
    evictKeys: fits && !keepsEvictable ? Object.keys(evictable) : [],
    newBytes,
    otherBytes,
  };
}

function planChannelListSyncWrite(currentItems, newItems, isEvictableKey) {
  return planSyncWrite(currentItems, newItems, isChannelListSyncKey, isEvictableKey);
}

function mergeListEntries(listKey, local, base, remote) {
  const toKey = entry => listEntryKey(listKey, entry);
  const baseKeys = new Set(base ? base.map(toKey) : []);
  const remoteKeys = new Set(remote.map(toKey));
  const removed = base ? new Set(base.map(toKey).filter(key => !remoteKeys.has(key))) : new Set();
  const kept = local.filter(entry => !removed.has(toKey(entry)));
  const keptKeys = new Set(kept.map(toKey));
  const added = remote.filter(entry => !baseKeys.has(toKey(entry)) && !keptKeys.has(toKey(entry)));
  return normalizeListEntries(listKey, [...kept, ...added]);
}

function mergeChannelLists(local, base, remote) {
  const l = normalizeChannelLists(local);
  const r = normalizeChannelLists(remote);
  const b = base ? normalizeChannelLists(base) : null;
  const merged = {};
  LIST_KEYS.forEach(key => {
    merged[key] = mergeListEntries(key, l[key], b ? b[key] : null, r[key]);
  });
  const remoteW = new Set(r.w);
  const remoteB = new Set(r.b);
  const localB = new Set(l.b);
  const mergedB = new Set(merged.b);
  const keepInWhitelist = c => remoteW.has(c) || (!remoteB.has(c) && !localB.has(c));
  const conflicts = new Set(merged.w.filter(c => mergedB.has(c)));
  if (conflicts.size) {
    merged.w = merged.w.filter(c => !conflicts.has(c) || keepInWhitelist(c));
    merged.b = merged.b.filter(c => !conflicts.has(c) || !keepInWhitelist(c));
  }
  return merged;
}

function unionChannelLists(target, extra) {
  const t = normalizeChannelLists(target);
  const e = normalizeChannelLists(extra);
  const w = [...t.w, ...e.w.filter(c => !t.w.includes(c) && !t.b.includes(c))];
  const b = [...t.b, ...e.b.filter(c => !t.b.includes(c) && !w.includes(c))];
  const tw = normalizeListEntries('tw', [...t.tw, ...e.tw]);
  const tb = normalizeListEntries('tb', [...t.tb, ...e.tb]);
  return { w, b, tw, tb };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    CHANNEL_LIST_INDEX_KEY,
    CHANNEL_LIST_LOCAL_KEYS,
    CHANNEL_LIST_FORMAT_VERSION,
    CHANNEL_LIST_CHUNK_LENGTH,
    SYNC_QUOTA_BYTES,
    SYNC_QUOTA_BYTES_PER_ITEM,
    SYNC_RESERVED_BYTES,
    BASE91_ALPHABET,
    bytesToBase64,
    base64ToBytes,
    bytesToBase91,
    base91ToBytes,
    pipeBytes,
    getSyncItemBytes,
    planSyncWrite,
    buildChunkedSyncItems,
    readChunkedSyncPayload,
    normalizeChannelLists,
    readChannelListsFromStorage,
    channelListsToStorage,
    channelListsEqual,
    serializeChannelLists,
    deserializeChannelLists,
    encodeChannelLists,
    decodeChannelLists,
    createChannelListGeneration,
    getChannelListChunkKey,
    isChannelListChunkKey,
    isChannelListSyncKey,
    buildChannelListSyncItems,
    readChannelListSyncPayload,
    resolveChannelListMergeBase,
    readLegacyChannelLists,
    getSyncItemsBytes,
    planChannelListSyncWrite,
    mergeChannelLists,
    unionChannelLists,
  };
}
