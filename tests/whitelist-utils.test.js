'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

Object.assign(globalThis, require('../content/i18n.js'));

const {
  MARKED_WATCHED_LIMIT,
  splitChannelListUpdates,
  pickStorageChanges,
  isValidVideoId,
  normalizeMarkedWatched,
  describeMarkedWatchedCount,
  markedWatchedIncludes,
  computeMarkedWatchedUpdate,
  normalizeMarkedWatchedMetaEntry,
  pruneMarkedWatchedMeta,
  normalizeTitleKeyword,
  titleKeywordListIncludes,
  findTitleKeywordMatch,
  titleMatchesKeyword,
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
} = require('../content/whitelist-utils.js');

test('titleMatchesKeyword: finds a whitelisted word anywhere in the title', () => {
  assert.equal(titleMatchesKeyword('Tools, tips, etc. for beginners', ['etc']), true);
  assert.equal(titleMatchesKeyword('Tools and tips for beginners', ['etc']), false);
  assert.equal(titleMatchesKeyword('Etc: the full list', ['etc']), true);
});

test('titleMatchesKeyword: ignores upper and lower case on both sides', () => {
  assert.equal(titleMatchesKeyword('FULL TUTORIAL: Blender Donut', ['tutorial']), true);
  assert.equal(titleMatchesKeyword('full tutorial: blender donut', ['Tutorial']), true);
});

test('titleMatchesKeyword: the keyword has to start where a word starts', () => {
  assert.equal(titleMatchesKeyword('How to fetch data in JavaScript', ['etc']), false);
  assert.equal(titleMatchesKeyword('What he said about the rain', ['AI']), false);
  assert.equal(titleMatchesKeyword('OpenAI ships a new model', ['AI']), false);
  assert.equal(titleMatchesKeyword('AI news this week', ['AI']), true);
  assert.equal(titleMatchesKeyword('Spotting AI-generated images', ['AI']), true);
  assert.equal(titleMatchesKeyword('#AI explained', ['AI']), true);
  assert.equal(titleMatchesKeyword('Said and done, the AI recap', ['AI']), true);
});

test('titleMatchesKeyword: a word start also matches longer forms of the word', () => {
  assert.equal(titleMatchesKeyword('Blender tutorials for beginners', ['tutorial']), true);
  assert.equal(titleMatchesKeyword('Café vlog in Paris', ['café']), true);
  assert.equal(titleMatchesKeyword('Le décafé du matin', ['café']), false);
});

test('titleMatchesKeyword: keywords not starting with a letter or digit match anywhere', () => {
  assert.equal(titleMatchesKeyword('Funny cats#shorts', ['#shorts']), true);
  assert.equal(titleMatchesKeyword('Learning C++ in a weekend', ['++']), true);
});

test('titleMatchesKeyword: scripts without spaces match anywhere and count as word boundaries', () => {
  assert.equal(titleMatchesKeyword('初心者向けチュートリアル 完全版', ['チュートリアル']), true);
  assert.equal(titleMatchesKeyword('รีวิวมือถือใหม่ล่าสุด', ['มือถือ']), true);
  assert.equal(titleMatchesKeyword('これはAIの話です', ['AI']), true);
});

test('findTitleKeywordMatch: returns the first matching keyword as it was typed', () => {
  assert.equal(findTitleKeywordMatch('O LA VICA SE PREFERISCI - POLTERGUYS COMPILATION', ['minecraft', 'Vica']), 'Vica');
  assert.equal(findTitleKeywordMatch('Reaction to the new trailer', ['trailer', 'reaction']), 'trailer');
  assert.equal(findTitleKeywordMatch('What he said about the rain', ['AI']), null);
  assert.equal(findTitleKeywordMatch('', ['AI']), null);
  assert.equal(findTitleKeywordMatch('AI news', []), null);
});

test('titleMatchesKeyword: phrases collapse whitespace, including non-breaking spaces', () => {
  assert.equal(titleMatchesKeyword('Lo-fi beats  to study to', ['lo-fi beats']), true);
  assert.equal(titleMatchesKeyword('Lo-fi beats to study to', ['lo-fi   beats']), true);
});

test('titleMatchesKeyword: works for non-Latin scripts', () => {
  assert.equal(titleMatchesKeyword('初心者向けチュートリアル 完全版', ['チュートリアル']), true);
  assert.equal(titleMatchesKeyword('Обзор ноутбука 2025', ['обзор']), true);
});

test('titleMatchesKeyword: empty or missing input never matches', () => {
  assert.equal(titleMatchesKeyword('', ['etc']), false);
  assert.equal(titleMatchesKeyword(null, ['etc']), false);
  assert.equal(titleMatchesKeyword('etc', []), false);
  assert.equal(titleMatchesKeyword('etc', undefined), false);
  assert.equal(titleMatchesKeyword('anything', ['   ']), false);
});

test('normalizeTitleKeyword: trims, collapses whitespace and keeps the typed case', () => {
  assert.equal(normalizeTitleKeyword('  Full   Tutorial \n'), 'Full Tutorial');
  assert.equal(normalizeTitleKeyword(42), '');
  assert.equal(normalizeTitleKeyword('x'.repeat(150)).length, 100);
});

test('titleKeywordListIncludes: duplicates are detected case-insensitively', () => {
  assert.equal(titleKeywordListIncludes('ETC', ['etc']), true);
  assert.equal(titleKeywordListIncludes(' etc ', ['Etc']), true);
  assert.equal(titleKeywordListIncludes('etc.', ['etc']), false);
  assert.equal(titleKeywordListIncludes('', ['etc']), false);
});

const REAL_VIDEO_IDS = ['1Tl2FtV06qo', '-zWP3XVLvJU', 'l9plo_h4fMQ', '1J4a9cT2lkw', 'BYTxPFj44uo'];

function fakeVideoId(index) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  let id = '';
  let n = index;
  for (let i = 0; i < 11; i++) {
    id += alphabet[n % 64];
    n = Math.floor(n / 64);
  }
  return id;
}

test('isValidVideoId: accepts 11-character YouTube ids only', () => {
  REAL_VIDEO_IDS.forEach(id => assert.equal(isValidVideoId(id), true, id));
  assert.equal(isValidVideoId('RDATfcbG9maQ'), false);
  assert.equal(isValidVideoId('1Tl2FtV06q'), false);
  assert.equal(isValidVideoId('1Tl2FtV06q!'), false);
  assert.equal(isValidVideoId(null), false);
});

test('normalizeMarkedWatched: drops invalid entries, keeps the latest mark per id, sorts oldest first', () => {
  const list = normalizeMarkedWatched([
    ['1Tl2FtV06qo', 300],
    ['bad', 100],
    ['-zWP3XVLvJU', 200],
    'l9plo_h4fMQ',
    ['1Tl2FtV06qo', 100],
    ['l9plo_h4fMQ', 'x'],
  ]);
  assert.deepEqual(list, [
    ['l9plo_h4fMQ', 0],
    ['-zWP3XVLvJU', 200],
    ['1Tl2FtV06qo', 300],
  ]);
  assert.deepEqual(normalizeMarkedWatched(null), []);
});

test('normalizeMarkedWatched: past the limit the oldest marks are dropped first', () => {
  const list = [];
  for (let i = 0; i < MARKED_WATCHED_LIMIT + 5; i++) list.push([fakeVideoId(i), 1000 + i]);
  const normalized = normalizeMarkedWatched(list);
  assert.equal(normalized.length, MARKED_WATCHED_LIMIT);
  assert.equal(normalized[0][0], fakeVideoId(5));
  assert.equal(normalized[normalized.length - 1][0], fakeVideoId(MARKED_WATCHED_LIMIT + 4));
});

test('computeMarkedWatchedUpdate: marking adds the id with the current time, re-marking refreshes it', () => {
  const marked = computeMarkedWatchedUpdate([['-zWP3XVLvJU', 10]], '1Tl2FtV06qo', true, 50);
  assert.deepEqual(marked, [['-zWP3XVLvJU', 10], ['1Tl2FtV06qo', 50]]);
  const remarked = computeMarkedWatchedUpdate(marked, '-zWP3XVLvJU', true, 90);
  assert.deepEqual(remarked, [['1Tl2FtV06qo', 50], ['-zWP3XVLvJU', 90]]);
  assert.equal(computeMarkedWatchedUpdate(remarked, '-zWP3XVLvJU', true, 90), null);
});

test('computeMarkedWatchedUpdate: marking at the limit evicts the oldest mark', () => {
  const list = [];
  for (let i = 0; i < MARKED_WATCHED_LIMIT; i++) list.push([fakeVideoId(i), 1000 + i]);
  const next = computeMarkedWatchedUpdate(list, '1Tl2FtV06qo', true, 999999);
  assert.equal(next.length, MARKED_WATCHED_LIMIT);
  assert.equal(markedWatchedIncludes(next, fakeVideoId(0)), false);
  assert.equal(markedWatchedIncludes(next, '1Tl2FtV06qo'), true);
});

test('computeMarkedWatchedUpdate: unmarking removes ids and is a no-op when absent', () => {
  const list = [['-zWP3XVLvJU', 10], ['1Tl2FtV06qo', 50]];
  assert.deepEqual(computeMarkedWatchedUpdate(list, '-zWP3XVLvJU', false), [['1Tl2FtV06qo', 50]]);
  assert.deepEqual(computeMarkedWatchedUpdate(list, ['-zWP3XVLvJU', '1Tl2FtV06qo'], false), []);
  assert.equal(computeMarkedWatchedUpdate(list, 'l9plo_h4fMQ', false), null);
  assert.equal(computeMarkedWatchedUpdate(list, 'not-an-id', true), null);
});

test('pruneMarkedWatchedMeta: keeps metadata only for ids still marked', () => {
  const meta = {
    '1Tl2FtV06qo': ['lofi hip hop radio', '/@lofigirl'],
    '-zWP3XVLvJU': ['old', '/@x'],
  };
  assert.deepEqual(pruneMarkedWatchedMeta(meta, [['1Tl2FtV06qo', 1]]), {
    '1Tl2FtV06qo': ['lofi hip hop radio', '/@lofigirl'],
  });
  assert.deepEqual(pruneMarkedWatchedMeta(null, [['1Tl2FtV06qo', 1]]), {});
  assert.deepEqual(normalizeMarkedWatchedMetaEntry('  two   spaces ', ['/@a', '/channel/uc1']), ['two spaces', '/@a']);
});

test('local storage split: markedWatched lives in local next to the channel lists', () => {
  const { local, sync } = splitChannelListUpdates({ markedWatched: [], channelWhitelist: [], dimMode: true });
  assert.deepEqual(Object.keys(local).sort(), ['channelWhitelist', 'markedWatched']);
  assert.deepEqual(Object.keys(sync), ['dimMode']);
  assert.deepEqual(Object.keys(pickStorageChanges({ markedWatched: {} }, 'local')), ['markedWatched']);
  assert.equal(pickStorageChanges({ markedWatched: {} }, 'sync'), null);
});

test('local storage split: the title lists live in local, their switches stay in sync', () => {
  const { local, sync } = splitChannelListUpdates({
    titleWhitelist: ['ai'],
    titleBlacklist: ['reaction'],
    titleWhitelistEnabled: true,
  });
  assert.deepEqual(Object.keys(local).sort(), ['titleBlacklist', 'titleWhitelist']);
  assert.deepEqual(Object.keys(sync), ['titleWhitelistEnabled']);
  assert.equal(pickStorageChanges({ titleBlacklist: {} }, 'sync'), null);
  assert.deepEqual(Object.keys(pickStorageChanges({ titleBlacklist: {} }, 'local')), ['titleBlacklist']);
});

test('describeMarkedWatchedCount: warns before the list is full and says what happens at the limit', () => {
  assert.deepEqual(describeMarkedWatchedCount(0), { text: 'No videos marked yet', nearLimit: false });
  assert.deepEqual(describeMarkedWatchedCount(1), { text: '1 video of 3,000', nearLimit: false });
  assert.deepEqual(describeMarkedWatchedCount(2699), { text: '2,699 videos of 3,000', nearLimit: false });
  assert.equal(describeMarkedWatchedCount(2700).nearLimit, true);
  assert.match(describeMarkedWatchedCount(2700).text, /^2,700 videos of 3,000\. Almost full/);
  assert.match(describeMarkedWatchedCount(MARKED_WATCHED_LIMIT).text, /Full: each new mark drops the oldest one$/);
});

test('parseChannelEntry: handles, channel links and ids become the stored lowercase path', () => {
  assert.equal(parseChannelEntry('@MKBHD'), '/@mkbhd');
  assert.equal(parseChannelEntry('https://www.youtube.com/@Veritasium/videos'), '/@veritasium');
  assert.equal(parseChannelEntry('youtube.com/@veritasium'), '/@veritasium');
  assert.equal(parseChannelEntry('m.youtube.com/@bbcnews?si=abc'), '/@bbcnews');
  assert.equal(parseChannelEntry('https://www.youtube.com/channel/UCX6OQ3DkcsbYNE6H8uQQuVA'), '/channel/ucx6oq3dkcsbyne6h8uqquva');
  assert.equal(parseChannelEntry('/user/Vsauce'), '/user/vsauce');
});

test('parseChannelEntry: a non-ASCII handle is percent-encoded like the paths YouTube links to', () => {
  assert.equal(parseChannelEntry('@Ôngbômytạo'), '/@%c3%94ngb%c3%b4myt%e1%ba%a1o');
});

test('parseChannelEntry: anything that is not a YouTube channel is rejected', () => {
  assert.equal(parseChannelEntry('bbcnews'), null);
  assert.equal(parseChannelEntry('https://youtu.be/dQw4w9WgXcQ'), null);
  assert.equal(parseChannelEntry('https://www.youtube.com/watch?v=dQw4w9WgXcQ'), null);
  assert.equal(parseChannelEntry('https://example.com/@bbcnews'), null);
  assert.equal(parseChannelEntry('@'), null);
  assert.equal(parseChannelEntry(''), null);
});

test('parseChannelInput: splits on lines, spaces and commas, dedupes, and keeps what it could not read', () => {
  const parsed = parseChannelInput(['@bbcnews, youtube.com/@BBCNews', '@theeconomist  hello', '', 'hello'].join('\n'));
  assert.deepEqual(parsed.entries, ['/@bbcnews', '/@theeconomist']);
  assert.deepEqual(parsed.invalid, ['hello']);
});

test('parseTitleInput: one entry per line, normalized and deduplicated case-insensitively', () => {
  const text = ['  AI news ', 'reaction', 'ai NEWS', '', ''].join('\n');
  assert.deepEqual(parseTitleInput(text).entries, ['AI news', 'reaction']);
});

test('planListAddition: splits new entries from ones already listed or in the opposite list', () => {
  const plan = planListAddition('channel', ['/@a', '/@b', '/@c', '/@a'], ['/@b'], ['/@c']);
  assert.deepEqual(plan, { add: ['/@a'], existing: ['/@b', '/@a'], moved: ['/@c'] });
  assert.deepEqual(planListAddition('title', ['ai'], ['AI'], null), { add: [], existing: ['ai'], moved: [] });
});

test('removeListEntries and restoreListEntries: undo puts entries back where they were', () => {
  const { list, removed } = removeListEntries('channel', ['/@a', '/@b', '/@c', '/@d'], ['/@b', '/@d']);
  assert.deepEqual(list, ['/@a', '/@c']);
  assert.deepEqual(restoreListEntries('channel', list, removed), ['/@a', '/@b', '/@c', '/@d']);
  assert.deepEqual(restoreListEntries('channel', ['/@b'], removed), ['/@b', '/@d']);
  assert.deepEqual(removeListEntries('title', ['AI', 'news'], ['ai']).list, ['news']);
});

test('formatChannelForDisplay and getChannelPageUrl: readable names, links only where the path is reliable', () => {
  assert.equal(formatChannelForDisplay('/@%c3%94ngb%c3%b4myt%e1%ba%a1o'), '@Ôngbômytạo');
  assert.equal(formatChannelForDisplay('/channel/ucx6oq3dkcsbyne6h8uqquva'), 'channel/ucx6oq3dkcsbyne6h8uqquva');
  assert.equal(getChannelPageUrl('/@bbcnews'), 'https://www.youtube.com/@bbcnews');
  assert.equal(getChannelPageUrl('/channel/ucx6oq3dkcsbyne6h8uqquva'), null);
});

test('matchesListQuery: case-insensitive substring over any of the given texts', () => {
  assert.equal(matchesListQuery(['@BBCNews', '/@bbcnews'], 'news'), true);
  assert.equal(matchesListQuery(['@bbcnews'], '  '), true);
  assert.equal(matchesListQuery(['@bbcnews', ''], 'economist'), false);
});

test('parseListsImport: reads every list from an export and drops entries it cannot use', () => {
  const imported = parseListsImport(
    {
      format: LIST_EXPORT_FORMAT,
      version: 1,
      channelWhitelist: ['/@bbcnews', 'not a channel', 42],
      channelBlacklist: ['/channel/ucx6oq3dkcsbyne6h8uqquva'],
      titleWhitelist: ['AI', 'ai', ''],
      titleBlacklist: ['reaction'],
      markedWatched: [{ id: '1Tl2FtV06qo', markedAt: 5, title: 'T', channel: '/@a' }, { id: 'bad' }],
    },
    100,
  );
  assert.deepEqual(imported.channelWhitelist, ['/@bbcnews']);
  assert.deepEqual(imported.channelBlacklist, ['/channel/ucx6oq3dkcsbyne6h8uqquva']);
  assert.deepEqual(imported.titleWhitelist, ['AI']);
  assert.deepEqual(imported.titleBlacklist, ['reaction']);
  assert.deepEqual(imported.markedWatched.list, [['1Tl2FtV06qo', 5]]);
  assert.deepEqual(imported.markedWatched.meta, { '1Tl2FtV06qo': ['T', '/@a'] });
});

test('parseListsImport: still reads the older marked videos export and rejects unknown files', () => {
  const legacy = parseListsImport({ format: 'youtube-hider-marked-watched', videos: [{ id: '1Tl2FtV06qo' }] }, 100);
  assert.deepEqual(legacy.markedWatched.list, [['1Tl2FtV06qo', 100]]);
  assert.deepEqual(legacy.channelBlacklist, []);
  assert.deepEqual(parseListsImport(['1Tl2FtV06qo'], 7).markedWatched.list, [['1Tl2FtV06qo', 7]]);
  assert.throws(() => parseListsImport({ hello: 'world' }));
  assert.throws(() => parseListsImport(null));
});
