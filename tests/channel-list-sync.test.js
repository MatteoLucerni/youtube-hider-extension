'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  CHANNEL_LIST_INDEX_KEY,
  SYNC_QUOTA_BYTES_PER_ITEM,
  channelListsEqual,
  encodeChannelLists,
  decodeChannelLists,
  getChannelListChunkKey,
  buildChannelListSyncItems,
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

test('encode and decode round-trip real handles, including percent-encoded ones', async () => {
  const lists = { w: REAL_HANDLES.slice(0, 6), b: [...REAL_HANDLES.slice(6), '/channel/ucx6oq3dkcsbyne6h8uqquva'] };
  const decoded = await decodeChannelLists(await encodeChannelLists(lists));
  assert.deepEqual(decoded, lists);
});

test('encoded lists are smaller than the plain JSON the old single key stored', async () => {
  const lists = { w: randomHandles(500, 7), b: [] };
  const encoded = await encodeChannelLists(lists);
  assert.ok(encoded.length < JSON.stringify(lists.w).length);
});

test('an empty list still produces one chunk and decodes back to empty lists', async () => {
  const encoded = await encodeChannelLists({ w: [], b: [] });
  const items = buildChannelListSyncItems(encoded, 'gen1', null, 0);
  assert.equal(items[CHANNEL_LIST_INDEX_KEY].n, 1);
  const payload = readChannelListSyncPayload(items);
  assert.equal(payload.status, 'complete');
  assert.deepEqual(await decodeChannelLists(payload.encoded), { w: [], b: [] });
});

test('a list too large for one sync item is split into chunks that each fit the per-item quota', async () => {
  const lists = { w: randomHandles(3000, 3), b: randomHandles(1000, 4) };
  const encoded = await encodeChannelLists(lists);
  const items = buildChannelListSyncItems(encoded, 'abc123', null, 0);
  assert.ok(items[CHANNEL_LIST_INDEX_KEY].n > 1);
  Object.entries(items).forEach(([key, value]) => {
    assert.ok(getSyncItemsBytes({ [key]: value }) <= SYNC_QUOTA_BYTES_PER_ITEM, key);
  });
  const payload = readChannelListSyncPayload(items);
  assert.equal(payload.status, 'complete');
  assert.deepEqual(await decodeChannelLists(payload.encoded), lists);
});

test('a payload missing one of its chunks is reported incomplete, not decoded', async () => {
  const encoded = await encodeChannelLists({ w: randomHandles(3000, 5), b: [] });
  const items = buildChannelListSyncItems(encoded, 'g', null, 0);
  delete items[getChannelListChunkKey('g', 1)];
  assert.equal(readChannelListSyncPayload(items).status, 'incomplete');
});

test('chunks from another generation are never mixed into the current one', async () => {
  const older = buildChannelListSyncItems(await encodeChannelLists({ w: randomHandles(3000, 8), b: [] }), 'old', null, 0);
  const newer = buildChannelListSyncItems(await encodeChannelLists({ w: randomHandles(3000, 9), b: [] }), 'new', null, 1);
  const mixed = { ...older, [CHANNEL_LIST_INDEX_KEY]: newer[CHANNEL_LIST_INDEX_KEY] };
  mixed[getChannelListChunkKey('new', 0)] = newer[getChannelListChunkKey('new', 0)];
  assert.equal(readChannelListSyncPayload(mixed).status, 'incomplete');
});

test('no index in sync storage reads as nothing synced yet', () => {
  assert.equal(readChannelListSyncPayload({ hideThreshold: 20 }).status, 'none');
});

test('a few thousand channels fit in sync next to the other settings', async () => {
  const encoded = await encodeChannelLists({ w: randomHandles(4000, 11), b: randomHandles(1500, 12) });
  const plan = planChannelListSyncWrite({ hideThreshold: 20, dimMode: false }, buildChannelListSyncItems(encoded, 'g', null, 0));
  assert.equal(plan.fits, true);
});

test('lists beyond the total sync quota are reported as not fitting', async () => {
  const encoded = await encodeChannelLists({ w: randomHandles(15000, 13), b: [] });
  const plan = planChannelListSyncWrite({ hideThreshold: 20 }, buildChannelListSyncItems(encoded, 'g', null, 0));
  assert.equal(plan.fits, false);
});

test('stale chunks and legacy keys are planned for removal, other settings are kept', async () => {
  const current = {
    hideThreshold: 20,
    channelWhitelist: ['/@bbcnews'],
    [getChannelListChunkKey('old', 0)]: 'abc',
    [CHANNEL_LIST_INDEX_KEY]: { v: 1, gen: 'old', n: 1, len: 3, ts: 0 },
  };
  const next = buildChannelListSyncItems(await encodeChannelLists({ w: ['/@bbcnews'], b: [] }), 'new', null, 1);
  const plan = planChannelListSyncWrite(current, next);
  assert.deepEqual(plan.staleKeys.sort(), ['channelWhitelist', getChannelListChunkKey('old', 0)].sort());
  assert.equal(plan.removeFirst, false);
});

test('merge adopts the remote lists when this device has no unsynced changes', () => {
  const base = { w: ['/@bbcnews'], b: ['/@baablu'] };
  const remote = { w: ['/@bbcnews', '/@theeconomist'], b: [] };
  assert.deepEqual(mergeChannelLists(base, base, remote), remote);
});

test('merge keeps channels only this device has while applying remote additions and removals', () => {
  const base = { w: ['/@bbcnews', '/@spacegaming'], b: [] };
  const local = { w: ['/@bbcnews', '/@spacegaming', '/@pamelaasmr'], b: ['/@baablu'] };
  const remote = { w: ['/@bbcnews', '/@theeconomist'], b: [] };
  assert.deepEqual(mergeChannelLists(local, base, remote), {
    w: ['/@bbcnews', '/@pamelaasmr', '/@theeconomist'],
    b: ['/@baablu'],
  });
});

test('merge with no known base never removes anything', () => {
  const local = { w: ['/@bbcnews'], b: [] };
  const remote = { w: ['/@theeconomist'], b: ['/@baablu'] };
  assert.deepEqual(mergeChannelLists(local, null, remote), {
    w: ['/@bbcnews', '/@theeconomist'],
    b: ['/@baablu'],
  });
});

test('a channel moved to the blacklist on another device leaves the whitelist here', () => {
  const base = { w: ['/@bbcnews'], b: [] };
  const remote = { w: [], b: ['/@bbcnews'] };
  assert.deepEqual(mergeChannelLists(base, base, remote), remote);
});

test('a channel added to opposite lists on two devices ends up only where the remote put it', () => {
  const base = { w: [], b: [] };
  const local = { w: ['/@bbcnews'], b: [] };
  const remote = { w: [], b: ['/@bbcnews'] };
  assert.deepEqual(mergeChannelLists(local, base, remote), { w: [], b: ['/@bbcnews'] });
});

test('legacy lists are only ever added, never used to remove channels', () => {
  const local = { w: ['/@bbcnews', '/@theeconomist'], b: ['/@baablu'] };
  const legacy = { w: ['/@bbcnews', '/@pamelaasmr'], b: ['/@theeconomist'] };
  assert.deepEqual(unionChannelLists(local, legacy), {
    w: ['/@bbcnews', '/@theeconomist', '/@pamelaasmr'],
    b: ['/@baablu'],
  });
});

test('list equality is order-sensitive and ignores non-string entries', () => {
  assert.equal(channelListsEqual({ w: ['/@a', 3], b: [] }, { w: ['/@a'] }), true);
  assert.equal(channelListsEqual({ w: ['/@a', '/@b'] }, { w: ['/@b', '/@a'] }), false);
});

test('the index records which generation a write was derived from', async () => {
  const items = buildChannelListSyncItems(await encodeChannelLists({ w: ['/@bbcnews'], b: [] }), 'child', 'parent', 0);
  const payload = readChannelListSyncPayload(items);
  assert.equal(payload.gen, 'child');
  assert.equal(payload.parent, 'parent');
});

test('remote removals are applied only when the remote write derives from what this device last synced', () => {
  const base = { w: ['/@bbcnews'], b: [] };
  assert.equal(resolveChannelListMergeBase('g1', 'g1', base), base);
  assert.equal(resolveChannelListMergeBase('g0', 'g1', base), null);
  assert.equal(resolveChannelListMergeBase(null, null, null), null);
});

test('a fresh device publishing its own list cannot wipe channels another device already synced', () => {
  const synced = { w: ['/@bbcnews', '/@theeconomist'], b: ['/@baablu'] };
  const fromFreshDevice = { w: ['/@pamelaasmr'], b: [] };
  const base = resolveChannelListMergeBase(null, 'g1', synced);
  assert.deepEqual(mergeChannelLists(synced, base, fromFreshDevice), {
    w: ['/@bbcnews', '/@theeconomist', '/@pamelaasmr'],
    b: ['/@baablu'],
  });
});

test('a payload written by a newer format version is reported unsupported, not decoded', () => {
  const items = { [CHANNEL_LIST_INDEX_KEY]: { v: 2, gen: 'future', n: 1, len: 0, ts: 0 } };
  assert.equal(readChannelListSyncPayload(items).status, 'unsupported');
});

test('legacy single-key lists are read from sync storage, absent ones are not', () => {
  assert.deepEqual(readLegacyChannelLists({ channelWhitelist: ['/@bbcnews'] }), { w: ['/@bbcnews'], b: [] });
  assert.equal(readLegacyChannelLists({ hideThreshold: 20 }), null);
});
