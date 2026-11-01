'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { resolveI18nMessage, getText, getPluralText } = require('../content/i18n.js');

const LOCALES_DIR = path.join(__dirname, '..', '_locales');
const DEFAULT_LOCALE = 'en';
const PLURAL_SUFFIX = /_(zero|one|two|few|many|other)$/;
const UNTRANSLATED_TERMS = ['YouTube Hider', 'Unblacklist', 'Whitelist', 'Blacklist'];
const UNTRANSLATED_KEYS = ['localeCode'];

function readCatalog(locale) {
  return JSON.parse(fs.readFileSync(path.join(LOCALES_DIR, locale, 'messages.json'), 'utf8'));
}

const locales = fs
  .readdirSync(LOCALES_DIR, { withFileTypes: true })
  .filter(entry => entry.isDirectory())
  .map(entry => entry.name);
const catalogs = Object.fromEntries(locales.map(locale => [locale, readCatalog(locale)]));
const base = catalogs[DEFAULT_LOCALE];

function toLanguageTag(locale) {
  return locale.replace('_', '-');
}

function splitKeys(catalog) {
  const plain = new Set();
  const plural = new Set();
  Object.keys(catalog).forEach(key => {
    if (PLURAL_SUFFIX.test(key)) plural.add(key.replace(PLURAL_SUFFIX, ''));
    else plain.add(key);
  });
  return { plain, plural };
}

function digitSubstitutions(text) {
  return [...new Set((text.match(/\$[1-9]/g) || []).sort())];
}

function namedPlaceholders(text) {
  return [...new Set((text.match(/\$[A-Za-z0-9_@]+\$/g) || []).map(name => name.toLowerCase()).sort())];
}

function placeholderContents(entry) {
  return Object.fromEntries(
    Object.entries(entry.placeholders || {}).map(([name, placeholder]) => [name.toLowerCase(), placeholder.content]),
  );
}

function baseEntryFor(key) {
  return base[key] || base[key.replace(PLURAL_SUFFIX, '_other')];
}

test('i18n catalogs: the default locale exists and every catalog is valid JSON', () => {
  assert.ok(locales.includes(DEFAULT_LOCALE));
  locales.forEach(locale => assert.equal(typeof catalogs[locale], 'object', locale));
});

test('i18n catalogs: localeCode matches the folder name', () => {
  locales.forEach(locale => {
    assert.equal(catalogs[locale].localeCode.message, toLanguageTag(locale), locale);
  });
});

test('i18n catalogs: no two keys differ only by case', () => {
  locales.forEach(locale => {
    const lowered = Object.keys(catalogs[locale]).map(key => key.toLowerCase());
    assert.equal(new Set(lowered).size, lowered.length, locale);
  });
});

test('i18n catalogs: every English message explains itself to translators', () => {
  Object.entries(base).forEach(([key, entry]) => {
    assert.ok(entry.description && entry.description.trim(), 'missing description: ' + key);
    Object.entries(entry.placeholders || {}).forEach(([name, placeholder]) => {
      assert.ok(placeholder.example, 'missing example: ' + key + '.' + name);
    });
  });
});

test('i18n catalogs: every locale has exactly the English keys', () => {
  const expected = splitKeys(base);
  locales.forEach(locale => {
    const actual = splitKeys(catalogs[locale]);
    assert.deepEqual([...actual.plain].sort(), [...expected.plain].sort(), locale + ' plain keys');
    assert.deepEqual([...actual.plural].sort(), [...expected.plural].sort(), locale + ' plural keys');
  });
});

test('i18n catalogs: every plural message has exactly the categories its language needs', () => {
  const { plural } = splitKeys(base);
  locales.forEach(locale => {
    const categories = new Intl.PluralRules(toLanguageTag(locale)).resolvedOptions().pluralCategories.sort();
    plural.forEach(baseKey => {
      const present = Object.keys(catalogs[locale])
        .filter(key => key.replace(PLURAL_SUFFIX, '') === baseKey && PLURAL_SUFFIX.test(key))
        .map(key => key.match(PLURAL_SUFFIX)[1])
        .sort();
      assert.deepEqual(present, categories, locale + ' ' + baseKey);
    });
  });
});

test('i18n catalogs: translations keep the same placeholders and substitutions', () => {
  locales.forEach(locale => {
    Object.entries(catalogs[locale]).forEach(([key, entry]) => {
      const original = baseEntryFor(key);
      assert.ok(original, locale + ' unknown key ' + key);
      assert.deepEqual(namedPlaceholders(entry.message), namedPlaceholders(original.message), locale + ' ' + key);
      assert.deepEqual(digitSubstitutions(entry.message), digitSubstitutions(original.message), locale + ' ' + key);
      assert.deepEqual(placeholderContents(entry), placeholderContents(original), locale + ' ' + key);
    });
  });
});

test('i18n catalogs: every placeholder used in a message is defined', () => {
  locales.forEach(locale => {
    Object.entries(catalogs[locale]).forEach(([key, entry]) => {
      const defined = Object.keys(placeholderContents(entry));
      namedPlaceholders(entry.message).forEach(name => {
        assert.ok(defined.includes(name.slice(1, -1)), locale + ' ' + key + ' ' + name);
      });
    });
  });
});

test('i18n catalogs: no message is empty and none contains an em dash', () => {
  locales.forEach(locale => {
    Object.entries(catalogs[locale]).forEach(([key, entry]) => {
      assert.ok(typeof entry.message === 'string' && entry.message.trim(), locale + ' empty ' + key);
      assert.ok(!entry.message.includes('—'), locale + ' em dash in ' + key);
    });
  });
});

test('i18n catalogs: store name and description fit the Chrome Web Store limits', () => {
  locales.forEach(locale => {
    assert.ok(catalogs[locale].extName.message.length <= 75, locale + ' extName');
    assert.ok(catalogs[locale].extDescription.message.length <= 132, locale + ' extDescription');
  });
});

test('i18n catalogs: product terms stay untranslated in every locale', () => {
  locales.forEach(locale => {
    Object.entries(catalogs[locale]).forEach(([key, entry]) => {
      if (UNTRANSLATED_KEYS.includes(key)) return;
      const original = baseEntryFor(key).message;
      UNTRANSLATED_TERMS.forEach(term => {
        if (original.includes(term)) {
          assert.ok(entry.message.includes(term), locale + ' ' + key + ' lost "' + term + '"');
        }
      });
    });
  });
});

test('resolveI18nMessage: fills named placeholders, digits and escaped dollars like Chrome', () => {
  const entry = {
    message: 'Removed $COUNT$ videos from $list$ for $$5',
    placeholders: { count: { content: '$1' }, list: { content: '$2' } },
  };
  assert.equal(resolveI18nMessage(entry, ['3', 'Blacklist']), 'Removed 3 videos from Blacklist for $5');
  assert.equal(resolveI18nMessage({ message: 'Hello $1 and $2' }, 'you'), 'Hello you and ');
  assert.equal(resolveI18nMessage({ message: 'Missing $nope$' }), 'Missing ');
  assert.equal(resolveI18nMessage(undefined), '');
});

test('getText: keeps answering from memory once the extension context is invalidated', () => {
  let invalidated = false;
  globalThis.chrome = {
    i18n: {
      getMessage(key, subs) {
        if (invalidated) throw new Error('Extension context invalidated.');
        return key === 'localeCode' ? 'it' : key + ':' + subs.join(',');
      },
    },
  };
  try {
    assert.equal(getText('reasonBlacklistedWord', 'reaction'), 'reasonBlacklistedWord:reaction');
    assert.equal(getText('localeCode'), 'it');
    invalidated = true;
    assert.equal(getText('reasonBlacklistedWord', 'reaction'), 'reasonBlacklistedWord:reaction');
    assert.equal(getText('reasonBlacklistedWord', 'other'), 'reasonBlacklistedWord');
  } finally {
    delete globalThis.chrome;
  }
});

test('getText: falls back to the key when a message is missing', () => {
  assert.equal(getText('extName'), base.extName.message);
  assert.equal(getText('thisKeyDoesNotExist'), 'thisKeyDoesNotExist');
  assert.equal(getPluralText('thisKeyDoesNotExist', 2), 'thisKeyDoesNotExist_other');
});
