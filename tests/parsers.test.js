'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  extractViewCount,
  extractUploadAgeDays,
} = require('../content/parsers.js');

// Helper: extractViewCount returns { views, confidence } on success, or NaN.
function views(text) {
  const result = extractViewCount(text);
  return result && typeof result === 'object' ? result.views : result;
}

test('regression: full-form counts must not be read as decimals (the reported bug)', () => {
  // Locale with "." as thousands separator (DE/IT/ES/PT-BR...).
  assert.equal(views('98.756 visualizzazioni'), 98756);
  assert.equal(views('1.234 Aufrufe'), 1234);
  assert.equal(views('99.999'), 99999);
  // Locale with "," as thousands separator (e.g. English full numbers).
  assert.equal(views('98,756 views'), 98756);
  assert.equal(views('1,234 views'), 1234);
});

test('with a 100-view threshold, a 98k video is no longer hidden', () => {
  const THRESHOLD = 100;
  // Hiding condition in filters.js is `views < threshold`.
  assert.ok(views('98.756 visualizzazioni') >= THRESHOLD);
  assert.ok(views('98,756 views') >= THRESHOLD);
});

test('abbreviated formats keep working (must not regress)', () => {
  assert.equal(views('98K views'), 98000);
  assert.equal(views('1.2M views'), 1200000);
  assert.equal(views('1.5K'), 1500);
  assert.equal(views('1,2 Mn'), 1200000); // comma-decimal abbreviation
  assert.equal(views('3B views'), 3000000000);
});

test('multiple grouping separators', () => {
  assert.equal(views('1.234.567'), 1234567); // dot grouping
  assert.equal(views('1,234,567'), 1234567); // comma grouping
  assert.equal(views('1 234 567 views'), 1234567); // space grouping
});

test('small numbers and edge cases', () => {
  assert.equal(views('847 views'), 847);
  assert.equal(views('100'), 100);
  assert.equal(views('0 views'), 0);
  assert.ok(Number.isNaN(views('no digits here')));
});

test('upload-age parsing is unaffected by the fix', () => {
  assert.equal(extractUploadAgeDays('2 days ago'), 2);
  assert.equal(extractUploadAgeDays('3 weeks ago'), 21);
});
