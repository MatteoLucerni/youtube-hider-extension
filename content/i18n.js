const I18N_PLURAL_RULES_CACHE = {};
let i18nNodeCatalog = null;

function hasChromeI18n() {
  return typeof chrome !== 'undefined' && !!chrome.i18n && typeof chrome.i18n.getMessage === 'function';
}

function loadNodeI18nCatalog() {
  if (!i18nNodeCatalog && typeof require === 'function') {
    i18nNodeCatalog = require('../_locales/en/messages.json');
  }
  return i18nNodeCatalog || {};
}

function normalizeI18nSubstitutions(substitutions) {
  if (substitutions === undefined || substitutions === null) return [];
  return [].concat(substitutions).map(value => String(value));
}

function resolveI18nMessage(entry, substitutions) {
  if (!entry || typeof entry.message !== 'string') return '';
  const subs = normalizeI18nSubstitutions(substitutions);
  const placeholders = {};
  Object.entries(entry.placeholders || {}).forEach(([name, placeholder]) => {
    placeholders[name.toLowerCase()] = placeholder && typeof placeholder.content === 'string' ? placeholder.content : '';
  });
  const fillDigits = text => text.replace(/\$\$|\$([1-9])/g, (match, digit) => (match === '$$' ? '$' : subs[digit - 1] ?? ''));
  return entry.message.replace(/\$\$|\$([A-Za-z0-9_@]+)\$|\$([1-9])/g, (match, name, digit) => {
    if (match === '$$') return '$';
    if (name !== undefined) {
      const content = placeholders[name.toLowerCase()];
      return content === undefined ? '' : fillDigits(content);
    }
    return subs[digit - 1] ?? '';
  });
}

function lookupI18nMessage(key, substitutions) {
  if (hasChromeI18n()) {
    return chrome.i18n.getMessage(key, normalizeI18nSubstitutions(substitutions));
  }
  const catalog = loadNodeI18nCatalog();
  const entry = Object.keys(catalog).find(name => name.toLowerCase() === key.toLowerCase());
  return entry ? resolveI18nMessage(catalog[entry], substitutions) : '';
}

function getText(key, substitutions) {
  return lookupI18nMessage(key, substitutions) || key;
}

function getUiLocale() {
  return lookupI18nMessage('localeCode') || 'en';
}

function getPluralCategory(count) {
  const locale = getUiLocale();
  if (!I18N_PLURAL_RULES_CACHE[locale]) {
    I18N_PLURAL_RULES_CACHE[locale] = new Intl.PluralRules(locale);
  }
  return I18N_PLURAL_RULES_CACHE[locale].select(count);
}

function getPluralText(baseKey, count, substitutions) {
  return (
    lookupI18nMessage(baseKey + '_' + getPluralCategory(count), substitutions) ||
    getText(baseKey + '_other', substitutions)
  );
}

function formatLocaleNumber(value, options) {
  return new Intl.NumberFormat(getUiLocale(), options).format(value);
}

function formatLocaleDate(date, options) {
  return new Intl.DateTimeFormat(getUiLocale(), options).format(date);
}

function applyDocumentI18n(root) {
  const scope = root || document;
  scope.querySelectorAll('[data-i18n]').forEach(element => {
    element.textContent = getText(element.dataset.i18n);
  });
  scope.querySelectorAll('[data-i18n-attr]').forEach(element => {
    element.dataset.i18nAttr.split(',').forEach(pair => {
      const [attribute, key] = pair.split(':').map(part => part.trim());
      if (attribute && key) element.setAttribute(attribute, getText(key));
    });
  });
  if (scope === document) document.documentElement.lang = getUiLocale();
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    resolveI18nMessage,
    getText,
    getUiLocale,
    getPluralCategory,
    getPluralText,
    formatLocaleNumber,
    formatLocaleDate,
  };
}
