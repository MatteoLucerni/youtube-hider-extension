'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  normalizeTitleKeyword,
  titleKeywordListIncludes,
  findTitleKeywordMatch,
  titleMatchesKeyword,
  titleKeywordListFits,
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

test('titleKeywordListFits: accepts lists under the sync item quota and rejects larger ones', () => {
  assert.equal(titleKeywordListFits('titleWhitelist', []), true);
  assert.equal(titleKeywordListFits('titleBlacklist', Array.from({ length: 300 }, (_, i) => 'keyword ' + i)), true);
  assert.equal(titleKeywordListFits('titleWhitelist', Array.from({ length: 100 }, () => 'x'.repeat(100))), false);
  assert.equal(titleKeywordListFits('titleBlacklist', Array.from({ length: 30 }, () => 'チ'.repeat(100))), false);
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
