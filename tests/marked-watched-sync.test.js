'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

Object.assign(globalThis, require('../channel-list-sync.js'), require('../content/whitelist-utils.js'));

const {
  MARKED_WATCHED_SYNC_INDEX_KEY,
  getMarkedWatchedChunkKey,
  isMarkedWatchedSyncKey,
  encodeMarkedWatched,
  decodeMarkedWatched,
  buildMarkedWatchedSyncItems,
  readMarkedWatchedSyncPayload,
  planMarkedWatchedSyncWrite,
  mergeMarkedWatched,
} = require('../marked-watched-sync.js');

const {
  CHANNEL_LIST_INDEX_KEY,
  SYNC_QUOTA_BYTES,
  SYNC_RESERVED_BYTES,
  SYNC_QUOTA_BYTES_PER_ITEM,
  getChannelListChunkKey,
  buildChannelListSyncItems,
  getSyncItemsBytes,
  planChannelListSyncWrite,
} = require('../channel-list-sync.js');

const { MARKED_WATCHED_LIMIT } = require('../content/whitelist-utils.js');

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

function randomMarkedWatched(count, seed = 1) {
  const random = seededRandom(seed);
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  const ids = new Set();
  while (ids.size < count) {
    let id = '';
    for (let i = 0; i < 11; i++) id += alphabet[Math.floor(random() * 64)];
    ids.add(id);
  }
  let markedAt = 1760000000;
  return [...ids].map(id => {
    markedAt += 1 + Math.floor(random() * 86400);
    return [id, markedAt];
  });
}

test('marked watched: encode and decode round-trip keeps ids, times and order', async () => {
  const list = [
    ['1Tl2FtV06qo', 1761900000],
    ['-zWP3XVLvJU', 1761900042],
    ['l9plo_h4fMQ', 1761990000],
  ];
  assert.deepEqual(await decodeMarkedWatched(await encodeMarkedWatched(list)), list);
  assert.deepEqual(await decodeMarkedWatched(await encodeMarkedWatched([])), []);
});

test('marked watched: a full list of 3000 videos fits next to a reasonable share for the channel lists', async () => {
  const list = randomMarkedWatched(MARKED_WATCHED_LIMIT, 7);
  const encoded = await encodeMarkedWatched(list);
  const items = buildMarkedWatchedSyncItems(encoded, 'gen1');
  const bytes = getSyncItemsBytes(items);
  assert.ok(bytes < 60000, 'full list takes ' + bytes + ' bytes');
  Object.entries(items).forEach(([key, value]) => {
    assert.ok(getSyncItemsBytes({ [key]: value }) <= SYNC_QUOTA_BYTES_PER_ITEM, key);
  });
  assert.deepEqual(await decodeMarkedWatched(encoded), list);
});

test('marked watched: chunks are read back only when complete', async () => {
  const encoded = await encodeMarkedWatched(randomMarkedWatched(1500, 3));
  const items = buildMarkedWatchedSyncItems(encoded, 'genA', 'genZ');
  const payload = readMarkedWatchedSyncPayload(items);
  assert.equal(payload.status, 'complete');
  assert.equal(payload.parent, 'genZ');
  assert.equal(payload.encoded, encoded);

  const partial = { ...items };
  delete partial[getMarkedWatchedChunkKey('genA', 1)];
  assert.equal(readMarkedWatchedSyncPayload(partial).status, 'incomplete');
  assert.equal(readMarkedWatchedSyncPayload({}).status, 'none');
  assert.equal(
    readMarkedWatchedSyncPayload({ [MARKED_WATCHED_SYNC_INDEX_KEY]: { v: 99, gen: 'x', n: 1, len: 0 } }).status,
    'unsupported',
  );
});

test('marked watched: sync keys never collide with the channel list keys', () => {
  assert.equal(isMarkedWatchedSyncKey(MARKED_WATCHED_SYNC_INDEX_KEY), true);
  assert.equal(isMarkedWatchedSyncKey(getMarkedWatchedChunkKey('g', 0)), true);
  assert.equal(isMarkedWatchedSyncKey(CHANNEL_LIST_INDEX_KEY), false);
  assert.equal(isMarkedWatchedSyncKey(getChannelListChunkKey('g', 0)), false);
  assert.equal(isMarkedWatchedSyncKey('hideThreshold'), false);
});

test('marked watched merge: with a common base, remote removals and additions both apply', () => {
  const base = [['1Tl2FtV06qo', 10], ['-zWP3XVLvJU', 20]];
  const remote = [['-zWP3XVLvJU', 20], ['l9plo_h4fMQ', 40]];
  const local = [['1Tl2FtV06qo', 10], ['-zWP3XVLvJU', 20], ['BYTxPFj44uo', 30]];
  assert.deepEqual(mergeMarkedWatched(local, base, remote), [
    ['-zWP3XVLvJU', 20],
    ['BYTxPFj44uo', 30],
    ['l9plo_h4fMQ', 40],
  ]);
});

test('marked watched merge: a local removal is not undone by the remote copy it was based on', () => {
  const base = [['1Tl2FtV06qo', 10], ['-zWP3XVLvJU', 20]];
  const remote = [['1Tl2FtV06qo', 10], ['-zWP3XVLvJU', 20], ['l9plo_h4fMQ', 40]];
  const local = [['-zWP3XVLvJU', 20]];
  assert.deepEqual(mergeMarkedWatched(local, base, remote), [['-zWP3XVLvJU', 20], ['l9plo_h4fMQ', 40]]);
});

test('marked watched merge: without a common base nothing is removed', () => {
  const remote = [['l9plo_h4fMQ', 40]];
  const local = [['1Tl2FtV06qo', 10]];
  assert.deepEqual(mergeMarkedWatched(local, null, remote), [['1Tl2FtV06qo', 10], ['l9plo_h4fMQ', 40]]);
});

test('marked watched merge: a video marked again keeps its most recent time', () => {
  const base = [['1Tl2FtV06qo', 10]];
  const remote = [['1Tl2FtV06qo', 90]];
  const local = [['1Tl2FtV06qo', 10], ['-zWP3XVLvJU', 50]];
  assert.deepEqual(mergeMarkedWatched(local, base, remote), [['-zWP3XVLvJU', 50], ['1Tl2FtV06qo', 90]]);
});

test('marked watched merge: the union is cut back to the limit, oldest first', () => {
  const local = randomMarkedWatched(MARKED_WATCHED_LIMIT, 11);
  const newest = local[local.length - 1][1];
  const remote = [['1Tl2FtV06qo', newest + 100]];
  const merged = mergeMarkedWatched(local, null, remote);
  assert.equal(merged.length, MARKED_WATCHED_LIMIT);
  assert.equal(merged.some(entry => entry[0] === local[0][0]), false);
  assert.deepEqual(merged[merged.length - 1], ['1Tl2FtV06qo', newest + 100]);
});

test('sync planner: the channel lists evict the marked videos when both do not fit', async () => {
  const watchedItems = buildMarkedWatchedSyncItems(
    await encodeMarkedWatched(randomMarkedWatched(MARKED_WATCHED_LIMIT, 5)),
    'w1',
  );
  const watchedBytes = getSyncItemsBytes(watchedItems);
  const room = SYNC_QUOTA_BYTES - SYNC_RESERVED_BYTES - watchedBytes;
  const bigChannelItems = buildChannelListSyncItems('x'.repeat(room + 2000), 'c1');
  const smallChannelItems = buildChannelListSyncItems('x'.repeat(2000), 'c2');

  const evicting = planChannelListSyncWrite(watchedItems, bigChannelItems, isMarkedWatchedSyncKey);
  assert.equal(evicting.fits, true);
  assert.deepEqual(evicting.evictKeys.sort(), Object.keys(watchedItems).sort());

  const sharing = planChannelListSyncWrite(watchedItems, smallChannelItems, isMarkedWatchedSyncKey);
  assert.equal(sharing.fits, true);
  assert.deepEqual(sharing.evictKeys, []);

  const legacy = planChannelListSyncWrite(watchedItems, bigChannelItems);
  assert.equal(legacy.fits, false);
  assert.deepEqual(legacy.evictKeys, []);
});

test('sync planner: the marked videos never push the channel lists out', async () => {
  const watchedItems = buildMarkedWatchedSyncItems(
    await encodeMarkedWatched(randomMarkedWatched(MARKED_WATCHED_LIMIT, 9)),
    'w2',
  );
  const watchedBytes = getSyncItemsBytes(watchedItems);
  const room = SYNC_QUOTA_BYTES - SYNC_RESERVED_BYTES - watchedBytes;
  const channelItems = buildChannelListSyncItems('x'.repeat(room + 2000), 'c3');

  const plan = planMarkedWatchedSyncWrite(channelItems, watchedItems);
  assert.equal(plan.fits, false);
  assert.deepEqual(plan.evictKeys, []);

  const fitting = planMarkedWatchedSyncWrite(buildChannelListSyncItems('x'.repeat(2000), 'c4'), watchedItems);
  assert.equal(fitting.fits, true);
});
