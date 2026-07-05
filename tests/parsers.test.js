'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  extractViewCount,
  extractUploadAgeDays,
  resolveUploadAgeFromSpans,
} = require('../content/parsers.js');

// resolveUploadAgeFromSpans reads span.textContent, so plain objects suffice.
const spans = (...texts) => texts.map(textContent => ({ textContent }));

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

test('upload-age: valid relative dates across languages (must not regress)', () => {
  assert.equal(extractUploadAgeDays('2 days ago'), 2);
  assert.equal(extractUploadAgeDays('3 weeks ago'), 21);
  assert.equal(extractUploadAgeDays('vor 2 Tagen'), 2);
  assert.equal(extractUploadAgeDays('il y a 3 jours'), 3);
  assert.equal(extractUploadAgeDays('hace 5 días'), 5);
  assert.equal(extractUploadAgeDays('2 giorni fa'), 2);
  assert.equal(extractUploadAgeDays('2일 전'), 2);
  assert.equal(extractUploadAgeDays('2 日前'), 2);
  assert.equal(extractUploadAgeDays('2 дня назад'), 2);
  assert.equal(extractUploadAgeDays('2 dias atrás'), 2);
  assert.equal(extractUploadAgeDays('Streamed 2 days ago'), 2);
  // Spanish/Portuguese plural "minutos" must be recognized like English plural.
  assert.equal(extractUploadAgeDays('hace 5 minutos'), extractUploadAgeDays('5 minutes ago'));
  assert.equal(extractUploadAgeDays('há 5 minutos'), extractUploadAgeDays('5 minutes ago'));
});

test('upload-age: non-date text is not read as an age (the contamination bug)', () => {
  // Channel/title names with <number><unit> patterns.
  assert.ok(Number.isNaN(extractUploadAgeDays('5-Minute Crafts')));
  assert.ok(Number.isNaN(extractUploadAgeDays('7-Second Riddles')));
  assert.ok(Number.isNaN(extractUploadAgeDays('5 Minute Crafts KIDS')));
  // View counts must not be read as dates either.
  assert.ok(Number.isNaN(extractUploadAgeDays('1.2M views')));
  assert.ok(Number.isNaN(extractUploadAgeDays('8,3K visualizzazioni')));
  assert.ok(Number.isNaN(extractUploadAgeDays('98,756 views')));
});

test('upload-age: abbreviated units used in the new YouTube UI (regression for #50)', () => {
  // Single-letter and short abbreviations that YouTube now uses on desktop/mobile.
  assert.equal(extractUploadAgeDays('7y ago'), 365 * 7);
  assert.equal(extractUploadAgeDays('11y ago'), 365 * 11);
  assert.equal(extractUploadAgeDays('1y ago'), 365);
  assert.equal(extractUploadAgeDays('6yr ago'), 365 * 6);
  assert.equal(extractUploadAgeDays('3yrs ago'), 365 * 3);
  assert.equal(extractUploadAgeDays('3mo ago'), 90);
  assert.equal(extractUploadAgeDays('4mos ago'), 120);
  assert.equal(extractUploadAgeDays('2wk ago'), 14);
  assert.equal(extractUploadAgeDays('3w ago'), 21);
  assert.equal(extractUploadAgeDays('5d ago'), 5);
  assert.equal(extractUploadAgeDays('12hr ago'), 0.5);
  assert.equal(extractUploadAgeDays('2h ago'), 2 / 24);

  // Channel names that use the same short letters must NOT be parsed as ages,
  // because a real date span ends with "ago" (or an equivalent marker).
  assert.ok(Number.isNaN(extractUploadAgeDays('3d Printing Tips')));
  assert.ok(Number.isNaN(extractUploadAgeDays('3y Fest')));
});

test('upload-age: resolving spans prefers the real date (last valid)', () => {
  // Channel name first, real date last → date wins.
  assert.equal(
    resolveUploadAgeFromSpans(spans('5-Minute Crafts', '1.2M views', '2 years ago')).ageDays,
    730,
  );
  // "60 Minutes" parses as an age on its own, but the later date overrides it.
  assert.equal(
    resolveUploadAgeFromSpans(spans('60 Minutes', '1M views', '3 days ago')).ageDays,
    3,
  );
  // Single concatenated span: split on separators pairs the right number+unit.
  assert.equal(
    resolveUploadAgeFromSpans(spans('Canale • 1.2M views • 2 years ago')).ageDays,
    730,
  );
});
