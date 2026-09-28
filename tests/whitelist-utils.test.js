'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  normalizeTitleKeyword,
  titleKeywordListIncludes,
  titleMatchesKeyword,
} = require('../content/whitelist-utils.js');

test('titleMatchesKeyword: finds a whitelisted word anywhere in the title', () => {
  assert.equal(titleMatchesKeyword('Tools, tips, etc. for beginners', ['etc']), true);
  assert.equal(titleMatchesKeyword('Tools and tips for beginners', ['etc']), false);
});

test('titleMatchesKeyword: ignores upper and lower case on both sides', () => {
  assert.equal(titleMatchesKeyword('FULL TUTORIAL: Blender Donut', ['tutorial']), true);
  assert.equal(titleMatchesKeyword('full tutorial: blender donut', ['Tutorial']), true);
});

test('titleMatchesKeyword: matches inside longer words (substring match)', () => {
  assert.equal(titleMatchesKeyword('How to fetch data in JavaScript', ['etc']), true);
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
