'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const zlib = require('node:zlib');

const {
  CHANNEL_LIST_INDEX_KEY,
  SYNC_QUOTA_BYTES_PER_ITEM,
  BASE91_ALPHABET,
  bytesToBase64,
  bytesToBase91,
  base91ToBytes,
  channelListsEqual,
  normalizeChannelLists,
  readChannelListsFromStorage,
  channelListsToStorage,
  serializeChannelLists,
  deserializeChannelLists,
  encodeChannelLists,
  decodeChannelLists,
  getChannelListChunkKey,
  isChannelListSyncKey,
  buildChannelListSyncItems,
  buildChunkedSyncItems,
  readChannelListSyncPayload,
  resolveChannelListMergeBase,
  readLegacyChannelLists,
  getSyncItemsBytes,
  planChannelListSyncWrite,
  mergeChannelLists,
  unionChannelLists,
} = require('../channel-list-sync.js');

const REAL_HANDLES = [
  '/@triggerpod',
  '/@podcastandchillnetwork',
  '/@baablu',
  '/@musiquizofficial',
  '/@bbcnews',
  '/@%c3%94ngb%c3%b4myt%e1%ba%a1o',
  '/@sleepycharliee',
  '/@fishy.motors',
  '/@pamelaasmr',
  '/@spacegaming',
  '/@5minutecraftsyoutube',
  '/@theeconomist',
];

function lists(w = [], b = [], tw = [], tb = []) {
  return { w, b, tw, tb };
}

function sorted(value) {
  const normalized = normalizeChannelLists(value);
  return Object.fromEntries(Object.entries(normalized).map(([key, entries]) => [key, [...entries].sort()]));
}

function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randomHandles(count, seed = 1) {
  const random = seededRandom(seed);
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789._-';
  const result = new Set();
  while (result.size < count) {
    const length = 6 + Math.floor(random() * 12);
    let handle = '/@';
    for (let i = 0; i < length; i++) handle += alphabet[Math.floor(random() * alphabet.length)];
    result.add(handle);
  }
  return [...result];
}

async function encodeV1(value) {
  const json = JSON.stringify({ w: value.w || [], b: value.b || [] });
  return bytesToBase64(new Uint8Array(zlib.deflateRawSync(Buffer.from(json))));
}

test('encode and decode round-trip real handles, including percent-encoded ones', async () => {
  const value = lists(REAL_HANDLES.slice(0, 6), [...REAL_HANDLES.slice(6), '/channel/ucx6oq3dkcsbyne6h8uqquva']);
  const decoded = await decodeChannelLists(await encodeChannelLists(value));
  assert.deepEqual(sorted(decoded), sorted(value));
});

test('v2 round-trips all four lists, channel ids, legacy user paths and non-Latin words', async () => {
  const value = lists(
    ['/@bbcnews', '/user/vsauce', '/@#odd', '/@!odder'],
    ['/channel/ucx6oq3dkcsbyne6h8uqquva', '/@theeconomist'],
    ['tutorial', 'AI', 'c++', 'これはAI'],
    ['reaction', 'Ελληνικά', 'emoji \u{1F600} test', '#shorts'],
  );
  const decoded = await decodeChannelLists(await encodeChannelLists(value));
  assert.deepEqual(sorted(decoded), sorted(value));
});

test('front coding never splits a surrogate pair between two entries', () => {
  const value = lists([], [], ['\u{1F600}a', '\u{1F600}b', '\u{1F601}c']);
  assert.deepEqual(sorted(deserializeChannelLists(serializeChannelLists(value))), sorted(value));
});

test('control characters in a word cannot break the serialized format', () => {
  const decoded = deserializeChannelLists(serializeChannelLists(lists([], [], ['one\ntwo', 'three\u001efour'])));
  assert.deepEqual(decoded.tw.sort(), ['one two', 'three four']);
});

test('the base91 alphabet has 91 characters and never needs escaping in JSON', () => {
  assert.equal(BASE91_ALPHABET.length, 91);
  assert.equal(new Set(BASE91_ALPHABET).size, 91);
  [...BASE91_ALPHABET].forEach(char => assert.equal(JSON.stringify(char).length, 3, char));
});

test('base91 round-trips arbitrary bytes, including empty input', () => {
  const random = seededRandom(42);
  [0, 1, 2, 3, 13, 14, 255, 1000].forEach(length => {
    const bytes = new Uint8Array(length).map(() => Math.floor(random() * 256));
    assert.deepEqual(base91ToBytes(bytesToBase91(bytes)), bytes);
  });
});

test('base91 is denser than base64 for the same bytes', () => {
  const bytes = new Uint8Array(6000).map((_, i) => (i * 131) % 256);
  assert.ok(bytesToBase91(bytes).length < bytesToBase64(bytes).length * 0.94);
});

test('v2 needs clearly fewer sync bytes than v1 for the same channels', async () => {
  const value = lists(randomHandles(3000, 21), randomHandles(3000, 22));
  const v1 = await encodeV1(value);
  const v2 = await encodeChannelLists(value);
  assert.ok(v2.length < v1.length * 0.85, `v2 ${v2.length} vs v1 ${v1.length}`);
});

test('a v1 payload written by an older version is still read', async () => {
  const value = lists(['/@bbcnews'], ['/@baablu']);
  const items = buildChunkedSyncItems(await encodeV1(value), 'old', null, 0, {
    indexKey: CHANNEL_LIST_INDEX_KEY,
    version: 1,
    chunkKey: getChannelListChunkKey,
  });
  const payload = readChannelListSyncPayload(items);
  assert.equal(payload.status, 'complete');
  assert.equal(payload.version, 1);
  assert.deepEqual(await decodeChannelLists(payload.encoded, payload.version), value);
});

test('an empty list still produces one chunk and decodes back to empty lists', async () => {
  const encoded = await encodeChannelLists(lists());
  const items = buildChannelListSyncItems(encoded, 'gen1', null, 0);
  assert.equal(items[CHANNEL_LIST_INDEX_KEY].n, 1);
  const payload = readChannelListSyncPayload(items);
  assert.equal(payload.status, 'complete');
  assert.deepEqual(await decodeChannelLists(payload.encoded, payload.version), lists());
});

test('a list too large for one sync item is split into chunks that each fit the per-item quota', async () => {
  const value = lists(randomHandles(3000, 3), randomHandles(1000, 4));
  const encoded = await encodeChannelLists(value);
  const items = buildChannelListSyncItems(encoded, 'abc123', null, 0);
  assert.ok(items[CHANNEL_LIST_INDEX_KEY].n > 1);
  Object.entries(items).forEach(([key, item]) => {
    assert.ok(getSyncItemsBytes({ [key]: item }) <= SYNC_QUOTA_BYTES_PER_ITEM, key);
  });
  const payload = readChannelListSyncPayload(items);
  assert.equal(payload.status, 'complete');
  assert.deepEqual(sorted(await decodeChannelLists(payload.encoded)), sorted(value));
});

test('a payload missing one of its chunks is reported incomplete, not decoded', async () => {
  const encoded = await encodeChannelLists(lists(randomHandles(3000, 5)));
  const items = buildChannelListSyncItems(encoded, 'g', null, 0);
  delete items[getChannelListChunkKey('g', 1)];
  assert.equal(readChannelListSyncPayload(items).status, 'incomplete');
});

test('chunks from another generation are never mixed into the current one', async () => {
  const older = buildChannelListSyncItems(await encodeChannelLists(lists(randomHandles(3000, 8))), 'old', null, 0);
  const newer = buildChannelListSyncItems(await encodeChannelLists(lists(randomHandles(3000, 9))), 'new', null, 1);
  const mixed = { ...older, [CHANNEL_LIST_INDEX_KEY]: newer[CHANNEL_LIST_INDEX_KEY] };
  mixed[getChannelListChunkKey('new', 0)] = newer[getChannelListChunkKey('new', 0)];
  assert.equal(readChannelListSyncPayload(mixed).status, 'incomplete');
});

test('no index in sync storage reads as nothing synced yet', () => {
  assert.equal(readChannelListSyncPayload({ hideThreshold: 20 }).status, 'none');
});

test('a few thousand channels fit in sync next to the other settings', async () => {
  const encoded = await encodeChannelLists(lists(randomHandles(4000, 11), randomHandles(1500, 12)));
  const plan = planChannelListSyncWrite({ hideThreshold: 20, dimMode: false }, buildChannelListSyncItems(encoded, 'g', null, 0));
  assert.equal(plan.fits, true);
});

test('v2 fits a list that v1 could not sync', async () => {
  const value = lists([], randomHandles(9500, 31));
  const v1Items = buildChunkedSyncItems(await encodeV1(value), 'g1', null, 0, {
    indexKey: CHANNEL_LIST_INDEX_KEY,
    version: 1,
    chunkKey: getChannelListChunkKey,
  });
  const v2Items = buildChannelListSyncItems(await encodeChannelLists(value), 'g2', null, 0);
  assert.equal(planChannelListSyncWrite({ hideThreshold: 20 }, v1Items).fits, false);
  assert.equal(planChannelListSyncWrite({ hideThreshold: 20 }, v2Items).fits, true);
});

test('lists beyond the total sync quota are reported as not fitting', async () => {
  const encoded = await encodeChannelLists(lists(randomHandles(15000, 13)));
  const plan = planChannelListSyncWrite({ hideThreshold: 20 }, buildChannelListSyncItems(encoded, 'g', null, 0));
  assert.equal(plan.fits, false);
});

test('stale chunks and legacy keys are planned for removal, other settings are kept', async () => {
  const current = {
    hideThreshold: 20,
    channelWhitelist: ['/@bbcnews'],
    titleBlacklist: ['reaction'],
    [getChannelListChunkKey('old', 0)]: 'abc',
    [CHANNEL_LIST_INDEX_KEY]: { v: 1, gen: 'old', n: 1, len: 3, ts: 0 },
  };
  const next = buildChannelListSyncItems(await encodeChannelLists(lists(['/@bbcnews'])), 'new', null, 1);
  const plan = planChannelListSyncWrite(current, next);
  assert.deepEqual(
    plan.staleKeys.sort(),
    ['channelWhitelist', 'titleBlacklist', getChannelListChunkKey('old', 0)].sort(),
  );
  assert.equal(plan.removeFirst, false);
});

test('the legacy title list keys count as list keys in sync storage', () => {
  assert.equal(isChannelListSyncKey('titleWhitelist'), true);
  assert.equal(isChannelListSyncKey('titleBlacklist'), true);
  assert.equal(isChannelListSyncKey('titleWhitelistEnabled'), false);
});

test('merge adopts the remote lists when this device has no unsynced changes', () => {
  const base = lists(['/@bbcnews'], ['/@baablu'], ['tutorial']);
  const remote = lists(['/@bbcnews', '/@theeconomist'], [], ['tutorial', 'review']);
  assert.deepEqual(mergeChannelLists(base, base, remote), remote);
});

test('merge keeps channels only this device has while applying remote additions and removals', () => {
  const base = lists(['/@bbcnews', '/@spacegaming']);
  const local = lists(['/@bbcnews', '/@spacegaming', '/@pamelaasmr'], ['/@baablu']);
  const remote = lists(['/@bbcnews', '/@theeconomist']);
  assert.deepEqual(mergeChannelLists(local, base, remote), lists(['/@bbcnews', '/@pamelaasmr', '/@theeconomist'], ['/@baablu']));
});

test('merge with no known base never removes anything', () => {
  const local = lists(['/@bbcnews'], [], ['ai']);
  const remote = lists(['/@theeconomist'], ['/@baablu'], [], ['reaction']);
  assert.deepEqual(mergeChannelLists(local, null, remote), lists(['/@bbcnews', '/@theeconomist'], ['/@baablu'], ['ai'], ['reaction']));
});

test('title words merge case-insensitively and keep this device spelling', () => {
  const base = lists([], [], ['AI'], ['reaction']);
  const local = lists([], [], ['AI', 'tutorial'], ['reaction']);
  const remote = lists([], [], ['ai', 'Review'], []);
  assert.deepEqual(mergeChannelLists(local, base, remote), lists([], [], ['AI', 'tutorial', 'Review'], []));
});

test('a word spelled differently on two devices does not count as a change', () => {
  assert.equal(channelListsEqual(lists([], [], ['AI']), lists([], [], ['ai'])), true);
  assert.equal(channelListsEqual(lists(['/@a']), lists(['/@A'])), false);
});

test('a channel moved to the blacklist on another device leaves the whitelist here', () => {
  const base = lists(['/@bbcnews']);
  const remote = lists([], ['/@bbcnews']);
  assert.deepEqual(mergeChannelLists(base, base, remote), remote);
});

test('a channel added to opposite lists on two devices ends up only where the remote put it', () => {
  const base = lists();
  const local = lists(['/@bbcnews']);
  const remote = lists([], ['/@bbcnews']);
  assert.deepEqual(mergeChannelLists(local, base, remote), lists([], ['/@bbcnews']));
});

test('legacy lists are only ever added, never used to remove channels or words', () => {
  const local = lists(['/@bbcnews', '/@theeconomist'], ['/@baablu'], ['AI']);
  const legacy = lists(['/@bbcnews', '/@pamelaasmr'], ['/@theeconomist'], ['ai', 'tutorial'], ['reaction']);
  assert.deepEqual(
    unionChannelLists(local, legacy),
    lists(['/@bbcnews', '/@theeconomist', '/@pamelaasmr'], ['/@baablu'], ['AI', 'tutorial'], ['reaction']),
  );
});

test('list equality ignores order and non-string entries', () => {
  assert.equal(channelListsEqual({ w: ['/@a', 3], b: [] }, { w: ['/@a'] }), true);
  assert.equal(channelListsEqual({ w: ['/@a', '/@b'] }, { w: ['/@b', '/@a'] }), true);
  assert.equal(channelListsEqual({ w: ['/@a'] }, { b: ['/@a'] }), false);
});

test('the index records which generation a write was derived from', async () => {
  const items = buildChannelListSyncItems(await encodeChannelLists(lists(['/@bbcnews'])), 'child', 'parent', 0);
  const payload = readChannelListSyncPayload(items);
  assert.equal(payload.gen, 'child');
  assert.equal(payload.parent, 'parent');
  assert.equal(payload.version, 2);
});

test('remote removals are applied only when the remote write derives from what this device last synced', () => {
  const base = lists(['/@bbcnews']);
  assert.equal(resolveChannelListMergeBase('g1', 'g1', base), base);
  assert.equal(resolveChannelListMergeBase('g0', 'g1', base), null);
  assert.equal(resolveChannelListMergeBase(null, null, null), null);
});

test('a fresh device publishing its own list cannot wipe channels another device already synced', () => {
  const synced = lists(['/@bbcnews', '/@theeconomist'], ['/@baablu']);
  const fromFreshDevice = lists(['/@pamelaasmr']);
  const base = resolveChannelListMergeBase(null, 'g1', synced);
  assert.deepEqual(mergeChannelLists(synced, base, fromFreshDevice), lists(['/@bbcnews', '/@theeconomist', '/@pamelaasmr'], ['/@baablu']));
});

test('a payload written by a newer format version is reported unsupported, not decoded', () => {
  const items = { [CHANNEL_LIST_INDEX_KEY]: { v: 3, gen: 'future', n: 1, len: 0, ts: 0 } };
  assert.equal(readChannelListSyncPayload(items).status, 'unsupported');
});

test('legacy single-key lists are read from sync storage, absent ones are not', () => {
  assert.deepEqual(readLegacyChannelLists({ channelWhitelist: ['/@bbcnews'] }), lists(['/@bbcnews']));
  assert.deepEqual(readLegacyChannelLists({ titleBlacklist: ['reaction'] }), lists([], [], [], ['reaction']));
  assert.equal(readLegacyChannelLists({ hideThreshold: 20 }), null);
});

test('storage keys map to the four lists and back', () => {
  const stored = { channelWhitelist: ['/@a'], channelBlacklist: ['/@b'], titleWhitelist: ['x'], titleBlacklist: ['y'] };
  assert.deepEqual(readChannelListsFromStorage(stored), lists(['/@a'], ['/@b'], ['x'], ['y']));
  assert.deepEqual(channelListsToStorage(readChannelListsFromStorage(stored)), stored);
});
