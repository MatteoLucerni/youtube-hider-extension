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

test('regression: Japanese full-form view counts use the exact YouTube label', () => {
  assert.equal(views('1526 回視聴'), 1526);
  assert.equal(views('9,999 回視聴'), 9999);
  assert.equal(views('10,000 回視聴'), 10000);
  assert.equal(views('1万 回視聴'), 10000);
  assert.equal(views('9.5万 回視聴'), 95000);

  assert.ok(Number.isNaN(views('1526 日前')));
  assert.ok(Number.isNaN(views('1526 コメント')));
});

test('with a 10k-view threshold, Japanese full-form counts filter correctly', () => {
  const THRESHOLD = 10000;
  assert.ok(views('1526 回視聴') < THRESHOLD);
  assert.ok(views('9.5万 回視聴') >= THRESHOLD);
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

test('regression: full view counts in the locales YouTube does not write in Latin script', () => {
  const cases = [
    ['am', '220 ዕይታዎች', 220],
    ['ar', '36 مشاهدة', 36],
    ['ar', '9,704 مشاهدات', 9704],
    ['as', '28টা ভিউ', 28],
    ['be', '1741 прагляд', 1741],
    ['be', '28 праглядаў', 28],
    ['be', '9002 прагляды', 9002],
    ['bg', '36 показвания', 36],
    ['bn', '104টি ভিউ', 104],
    ['el', '36 προβολές', 36],
    ['fa', '\u200f36 بازدید', 36],
    ['gu', '182 જોવાયાની સંખ્યા', 182],
    ['hi', '36 व्यू', 36],
    ['hy', '44 դիտում', 44],
    ['id', '235 x ditonton', 235],
    ['iw', '36 צפיות', 36],
    ['ka', '337 ნახვა', 337],
    ['kk', '239 рет көрілді', 239],
    ['km', 'ចំនួនមើល 553', 553],
    ['kn', '239 ವೀಕ್ಷಣೆಗಳು', 239],
    ['ko', '조회수 36회', 36],
    ['ky', '28 жолу көрүлдү', 28],
    ['lo', 'ຍອດເບິ່ງ 686 ເທື່ອ', 686],
    ['mk', '36 прегледи', 36],
    ['ml', '21 കാഴ്‌ച', 21],
    ['mn', '380 үзэлт', 380],
    ['mr', '235 व्ह्यू', 235],
    ['my', 'ကြည့်ရှုမှု 104', 104],
    ['ne', '36 भ्यु', 36],
    ['or', '28ଟି\u00a0ଭ୍ୟୁ', 28],
    ['pa', '337 ਵਾਰ ਦੇਖਿਆ', 337],
    ['ro', '36 de vizionări', 36],
    ['ru', '64 просмотра', 64],
    ['ru', '36 просмотров', 36],
    ['ru', '102\u00a0991 просмотр', 102991],
    ['si', 'බැලීම් 10', 10],
    ['sr', '36 прегледа', 36],
    ['sr', '691.701 преглед', 691701],
    ['sw', 'Kutazamwa:\n36', 36],
    ['ta', '29 பார்வைகள்', 29],
    ['te', '28 వీక్షణలు', 28],
    ['th', 'การดู 104 ครั้ง', 104],
    ['uk', '36 переглядів', 36],
    ['uk', '1\u00a0193 перегляди', 1193],
    ['uk', '439\u00a0491 перегляд', 439491],
    ['ur', '337 ملاحظات', 337],
    ['vi', '36 lượt xem', 36],
    ['zh-CN', '36次观看', 36],
    ['zh-HK', '收看次數：36 次', 36],
    ['zh-TW', '觀看次數：36次', 36],
  ];

  for (const [locale, text, expected] of cases) {
    assert.equal(views(text), expected, locale + ': ' + text);
  }
});

test('regression: localized upload dates are never read as a view count', () => {
  const rejected = [
    ['ru', '1 год назад'],
    ['ru', '2 дня назад'],
    ['uk', '1 рік тому'],
    ['uk', '4 дні тому'],
    ['ja', '1 年前'],
    ['ja', '2 日前'],
    ['ko', '1년 전'],
    ['ko', '1일 전'],
    ['zh-CN', '1年前'],
    ['zh-CN', '3周前'],
    ['zh-TW', '1 年前'],
    ['zh-TW', '2 天前'],
    ['th', '1 ปีที่แล้ว'],
    ['th', '2 วันที่ผ่านมา'],
    ['ar', 'قبل 11 سنة'],
    ['ar', 'قبل 3 أشهر'],
    ['iw', 'לפני 3 ימים'],
    ['iw', 'לפני 3 שנים'],
    ['hi', '1 माह पहले'],
    ['hi', '4 दिन पहले'],
    ['el', 'πριν από 2 έτη'],
    ['el', 'πριν από 1 έτος'],
    ['vi', '1 năm trước'],
    ['vi', '14 giờ trước'],
    ['id', '2 jam yang lalu'],
    ['id', '2 hari yang lalu'],
    ['ro', 'acum 1 an'],
    ['ro', 'acum 1 zi'],
    ['fa', '1 روز پیش'],
    ['fa', '1 سال پیش'],
    ['sr', 'пре 1 дана'],
    ['sr', 'пре 7 сати'],
    ['bg', 'преди 1 ден'],
    ['bg', 'преди 2 дни'],
  ];

  for (const [locale, text] of rejected) {
    assert.ok(Number.isNaN(views(text)), locale + ': ' + text);
  }
});
