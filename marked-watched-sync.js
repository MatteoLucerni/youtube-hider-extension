const MARKED_WATCHED_SYNC_INDEX_KEY = 'markedWatchedIndex';
const MARKED_WATCHED_SYNC_CHUNK_PREFIX = 'mwl.';
const MARKED_WATCHED_SYNC_BASE_KEY = 'markedWatchedSyncBase';
const MARKED_WATCHED_SYNC_STATE_KEY = 'markedWatchedSyncState';
const MARKED_WATCHED_SYNC_FORMAT_VERSION = 1;
const MARKED_WATCHED_ID_LENGTH = 11;

function getMarkedWatchedChunkKey(gen, index) {
  return MARKED_WATCHED_SYNC_CHUNK_PREFIX + gen + '.' + index;
}

const MARKED_WATCHED_SYNC_LAYOUT = {
  indexKey: MARKED_WATCHED_SYNC_INDEX_KEY,
  version: MARKED_WATCHED_SYNC_FORMAT_VERSION,
  chunkKey: getMarkedWatchedChunkKey,
};

function isMarkedWatchedSyncKey(key) {
  return (
    key === MARKED_WATCHED_SYNC_INDEX_KEY ||
    (typeof key === 'string' && key.startsWith(MARKED_WATCHED_SYNC_CHUNK_PREFIX))
  );
}

async function encodeMarkedWatched(list) {
  const entries = normalizeMarkedWatched(list);
  let previous = 0;
  const payload = {
    i: entries.map(entry => entry[0]).join(''),
    t: entries.map(entry => {
      const delta = entry[1] - previous;
      previous = entry[1];
      return delta;
    }),
  };
  const json = JSON.stringify(payload);
  const compressed = await pipeBytes(new TextEncoder().encode(json), new CompressionStream('deflate-raw'));
  return bytesToBase64(compressed);
}

async function decodeMarkedWatched(text) {
  const bytes = await pipeBytes(base64ToBytes(text), new DecompressionStream('deflate-raw'));
  const payload = JSON.parse(new TextDecoder().decode(bytes)) || {};
  const ids = typeof payload.i === 'string' ? payload.i : '';
  const deltas = Array.isArray(payload.t) ? payload.t : [];
  const list = [];
  let markedAt = 0;
  for (let i = 0; i < deltas.length && (i + 1) * MARKED_WATCHED_ID_LENGTH <= ids.length; i++) {
    markedAt += Number(deltas[i]) || 0;
    list.push([ids.slice(i * MARKED_WATCHED_ID_LENGTH, (i + 1) * MARKED_WATCHED_ID_LENGTH), markedAt]);
  }
  return normalizeMarkedWatched(list);
}

function buildMarkedWatchedSyncItems(encoded, gen, parent = null, now = Date.now()) {
  return buildChunkedSyncItems(encoded, gen, parent, now, MARKED_WATCHED_SYNC_LAYOUT);
}

function readMarkedWatchedSyncPayload(items) {
  return readChunkedSyncPayload(items, MARKED_WATCHED_SYNC_LAYOUT);
}

function planMarkedWatchedSyncWrite(currentItems, newItems) {
  return planSyncWrite(currentItems, newItems, isMarkedWatchedSyncKey);
}

function mergeMarkedWatched(local, base, remote) {
  const l = normalizeMarkedWatched(local);
  const r = normalizeMarkedWatched(remote);
  const b = base ? normalizeMarkedWatched(base) : [];
  const baseIds = new Set(b.map(entry => entry[0]));
  const remoteIds = new Set(r.map(entry => entry[0]));
  const removed = base ? new Set(b.filter(entry => !remoteIds.has(entry[0])).map(entry => entry[0])) : new Set();
  const kept = l.filter(entry => !removed.has(entry[0]));
  const keptIds = new Set(kept.map(entry => entry[0]));
  const fromRemote = r.filter(entry => keptIds.has(entry[0]) || !baseIds.has(entry[0]));
  return normalizeMarkedWatched([...kept, ...fromRemote]);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    MARKED_WATCHED_SYNC_INDEX_KEY,
    MARKED_WATCHED_SYNC_BASE_KEY,
    MARKED_WATCHED_SYNC_STATE_KEY,
    getMarkedWatchedChunkKey,
    isMarkedWatchedSyncKey,
    encodeMarkedWatched,
    decodeMarkedWatched,
    buildMarkedWatchedSyncItems,
    readMarkedWatchedSyncPayload,
    planMarkedWatchedSyncWrite,
    mergeMarkedWatched,
  };
}
