const CHANNEL_LIST_LOCAL_KEYS = ['channelWhitelist', 'channelBlacklist'];
const CHANNEL_LIST_INDEX_KEY = 'channelListsIndex';
const CHANNEL_LIST_CHUNK_PREFIX = 'chl.';
const CHANNEL_LIST_BASE_KEY = 'channelListsSyncBase';
const CHANNEL_LIST_STATE_KEY = 'channelListsSyncState';
const CHANNEL_LIST_FORMAT_VERSION = 1;
const CHANNEL_LIST_CHUNK_LENGTH = 8000;
const SYNC_QUOTA_BYTES = 102400;
const SYNC_QUOTA_BYTES_PER_ITEM = 8192;
const SYNC_RESERVED_BYTES = 4096;

function normalizeChannelLists(lists) {
  const source = lists || {};
  return {
    w: Array.isArray(source.w) ? source.w.filter(c => typeof c === 'string') : [],
    b: Array.isArray(source.b) ? source.b.filter(c => typeof c === 'string') : [],
  };
}

function channelListsEqual(a, b) {
  return JSON.stringify(normalizeChannelLists(a)) === JSON.stringify(normalizeChannelLists(b));
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

async function pipeBytes(bytes, transform) {
  const stream = new Blob([bytes]).stream().pipeThrough(transform);
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function encodeChannelLists(lists) {
  const json = JSON.stringify(normalizeChannelLists(lists));
  const compressed = await pipeBytes(new TextEncoder().encode(json), new CompressionStream('deflate-raw'));
  return bytesToBase64(compressed);
}

async function decodeChannelLists(text) {
  const bytes = await pipeBytes(base64ToBytes(text), new DecompressionStream('deflate-raw'));
  return normalizeChannelLists(JSON.parse(new TextDecoder().decode(bytes)));
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
  if (index.v !== layout.version) return { status: 'unsupported', gen: index.gen };
  const count = Number(index.n);
  if (!Number.isInteger(count) || count < 1) return { status: 'invalid', gen: index.gen };
  let encoded = '';
  for (let i = 0; i < count; i++) {
    const chunk = items[layout.chunkKey(index.gen, i)];
    if (typeof chunk !== 'string') return { status: 'incomplete', gen: index.gen };
    encoded += chunk;
  }
  if (encoded.length !== index.len) return { status: 'incomplete', gen: index.gen };
  return { status: 'complete', gen: index.gen, parent: index.p || null, encoded };
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
  const hasWhitelist = Array.isArray(source.channelWhitelist);
  const hasBlacklist = Array.isArray(source.channelBlacklist);
  if (!hasWhitelist && !hasBlacklist) return null;
  return normalizeChannelLists({ w: source.channelWhitelist, b: source.channelBlacklist });
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

function mergeChannelLists(local, base, remote) {
  const l = normalizeChannelLists(local);
  const r = normalizeChannelLists(remote);
  const b = base ? normalizeChannelLists(base) : { w: [], b: [] };
  const merged = {};
  ['w', 'b'].forEach(key => {
    const baseSet = new Set(b[key]);
    const remoteSet = new Set(r[key]);
    const removed = base ? new Set(b[key].filter(c => !remoteSet.has(c))) : new Set();
    const kept = l[key].filter(c => !removed.has(c));
    const keptSet = new Set(kept);
    const added = r[key].filter(c => !baseSet.has(c) && !keptSet.has(c));
    merged[key] = [...kept, ...added];
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
  return { w, b };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    CHANNEL_LIST_INDEX_KEY,
    CHANNEL_LIST_CHUNK_LENGTH,
    SYNC_QUOTA_BYTES,
    SYNC_QUOTA_BYTES_PER_ITEM,
    SYNC_RESERVED_BYTES,
    bytesToBase64,
    base64ToBytes,
    pipeBytes,
    getSyncItemBytes,
    planSyncWrite,
    buildChunkedSyncItems,
    readChunkedSyncPayload,
    normalizeChannelLists,
    channelListsEqual,
    encodeChannelLists,
    decodeChannelLists,
    createChannelListGeneration,
    getChannelListChunkKey,
    isChannelListChunkKey,
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
