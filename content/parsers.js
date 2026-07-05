const SUFFIX_MULTIPLIERS = {
  k: 1e3,
  m: 1e6,
  mln: 1e6,
  mio: 1e6,
  mn: 1e6,
  b: 1e9,
  md: 1e9,
  万: 1e4,
  만: 1e4,
  억: 1e8,
  тыс: 1e3,
  млн: 1e6,
  млрд: 1e9,
  mi: 1e3,
  mil: 1e3,
  rb: 1e3,
  lakh: 1e5,
  cr: 1e7,
};

const SUFFIX_REGEX = new RegExp(
  '(' +
    Object.keys(SUFFIX_MULTIPLIERS)
      .sort((a, b) => b.length - a.length)
      .map(s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .join('|') +
    ')\\.?',
  'i',
);

function extractNumberAndSuffix(input) {
  const s = String(input)
    .trim()
    .replace(/\s+(?=\d)/g, '');
  const numMatch = s.match(/^([\d.,]+)/);
  if (!numMatch) return { numStr: '', suffix: '', remainder: s };

  const numStr = numMatch[1];
  const afterNum = s.slice(numMatch[0].length).trimStart();

  const suffixMatch = afterNum.match(SUFFIX_REGEX);
  if (suffixMatch && afterNum.indexOf(suffixMatch[0]) === 0) {
    const charAfterMatch = afterNum[suffixMatch[0].length];
    const lastSuffixChar = suffixMatch[1][suffixMatch[1].length - 1];
    if (charAfterMatch && /[a-z]/i.test(lastSuffixChar) && /[a-z]/i.test(charAfterMatch)) {
      return { numStr, suffix: '', remainder: afterNum.trim() };
    }
    const suffix = suffixMatch[1].toLowerCase();
    const remainder = afterNum.slice(suffixMatch[0].length).trim();
    return { numStr, suffix, remainder };
  }

  return { numStr, suffix: '', remainder: afterNum.trim() };
}

function normalizeNumStr(numStr, hasSuffix = false) {
  const dots = (numStr.match(/\./g) || []).length;
  const commas = (numStr.match(/,/g) || []).length;

  if (dots > 0 && commas > 0) {
    const lastDot = numStr.lastIndexOf('.');
    const lastComma = numStr.lastIndexOf(',');
    if (lastDot > lastComma) {
      return numStr.replace(/,/g, '');
    } else {
      return numStr.replace(/\./g, '').replace(',', '.');
    }
  }

  if (dots > 1) return numStr.replace(/\./g, '');
  if (commas > 1) return numStr.replace(/,/g, '');

  // Single separator. Without a suffix the count is an integer, so the
  // separator is a thousands grouping (e.g. "98.756"/"98,756" → 98756).
  // With a suffix it is a decimal point (e.g. "1,2 Mn" → 1.2).
  if (!hasSuffix) return numStr.replace(/[.,]/g, '');
  if (commas === 1) return numStr.replace(',', '.');

  return numStr;
}

function parseToNumber(input) {
  const { numStr, suffix } = extractNumberAndSuffix(input);
  if (!numStr) return NaN;

  const normalized = normalizeNumStr(numStr, Boolean(suffix));
  const base = parseFloat(normalized);
  if (isNaN(base)) return NaN;

  const multiplier = suffix ? SUFFIX_MULTIPLIERS[suffix] || 1 : 1;
  return base * multiplier;
}

function extractViewCount(text) {
  const s = String(text).trim();
  if (!/\d/.test(s)) return NaN;

  const { numStr, suffix, remainder } = extractNumberAndSuffix(s);
  if (!numStr) return NaN;

  const normalized = normalizeNumStr(numStr, Boolean(suffix));
  const base = parseFloat(normalized);
  if (isNaN(base)) return NaN;

  if (suffix && SUFFIX_MULTIPLIERS[suffix]) {
    return { views: base * SUFFIX_MULTIPLIERS[suffix], confidence: 'high' };
  }

  if (!remainder) {
    return { views: base, confidence: 'low' };
  }

  const words = remainder.split(/\s+/).filter(Boolean);
  if (words.length === 1 && /^[\p{Script=Latin}]+$/u.test(words[0])) {
    return { views: base, confidence: 'low' };
  }

  return NaN;
}

function getVideoContainerSelectors() {
  const pathname = window.location.pathname;
  const isChannelPage = isChannelPagePath(pathname);

  if (pathname === '/watch') {
    return 'ytd-compact-video-renderer, ytd-rich-item-renderer, ytd-video-renderer, yt-lockup-view-model, ytm-video-with-context-renderer, ytm-compact-video-renderer';
  }
  if (isChannelPage) {
    return 'ytd-compact-video-renderer, ytd-rich-item-renderer, ytd-video-renderer, ytd-grid-video-renderer, yt-lockup-view-model, ytm-video-with-context-renderer, ytm-compact-video-renderer';
  }
  return 'ytd-compact-video-renderer, ytd-rich-item-renderer, ytd-video-renderer, yt-lockup-view-model, ytm-video-with-context-renderer, ytm-compact-video-renderer, ytm-rich-item-renderer';
}

function findOutermostMatch(element, selectors) {
  let item = element;
  let match = null;
  while (item) {
    if (item.matches(selectors)) {
      match = item;
    }
    item = item.parentElement;
  }
  return match;
}

function findAndHideContainer(element, selectors, reason) {
  const match = findOutermostMatch(element, selectors);
  if (match) applyFilter(match, reason);
}

function resolveViewsFromSpans(spans) {
  let lowCandidate = null;
  let anchorSpan = null;

  for (const span of spans) {
    const text = (span.textContent || '').trim();
    const result = extractViewCount(text);
    if (result && typeof result === 'object') {
      if (result.confidence === 'high') {
        return { views: result.views, span };
      }
      if (!lowCandidate) {
        lowCandidate = result.views;
        anchorSpan = span;
      }
    }
  }

  if (lowCandidate !== null) {
    return { views: lowCandidate, span: anchorSpan };
  }
  return null;
}

// ── Upload Date Filter: parsing engine ──

const TIME_UNIT_DAYS = {};
const TIME_UNIT_ENTRIES = [
  [
    1 / 86400,
    [
      'second',
      'seconds',
      'sec',
      'secs',
      'секунд',
      'секунды',
      'секунду',
      '秒',
      '초',
      'ثاني',
      'ثانية',
      'ثوان',
      'secondo',
      'secondi',
      'seconde',
      'secondes',
      'Sekunde',
      'Sekunden',
      'segundo',
      'segundos',
    ],
  ],
  [
    1 / 1440,
    [
      'minute',
      'minutes',
      'min',
      'mins',
      'минут',
      'минуты',
      'минуту',
      '分',
      '분',
      'دقيقة',
      'دقائق',
      'minuto',
      'minutos',
      'minuti',
      'minuta',
      'Minute',
      'Minuten',
    ],
  ],
  [
    1 / 24,
    [
      'hour',
      'hours',
      'hr',
      'hrs',
      'h',
      'час',
      'часа',
      'часов',
      '時間',
      '시간',
      'ساعة',
      'ساعات',
      'ora',
      'ore',
      'heure',
      'heures',
      'Stunde',
      'Stunden',
      'hora',
      'horas',
    ],
  ],
  [
    1,
    [
      'day',
      'days',
      'd',
      'день',
      'дня',
      'дней',
      '日',
      '일',
      'يوم',
      'يومين',
      'أيام',
      'giorno',
      'giorni',
      'jour',
      'jours',
      'Tag',
      'Tagen',
      'Tage',
      'día',
      'días',
      'dia',
      'dias',
    ],
  ],
  [
    7,
    [
      'week',
      'weeks',
      'wk',
      'wks',
      'w',
      'неделю',
      'недели',
      'недель',
      '週間',
      '주',
      'أسبوع',
      'أسبوعين',
      'أسابيع',
      'settimana',
      'settimane',
      'semaine',
      'semaines',
      'Woche',
      'Wochen',
      'semana',
      'semanas',
    ],
  ],
  [
    30,
    [
      'month',
      'months',
      'mo',
      'mos',
      'mth',
      'mths',
      'месяц',
      'месяца',
      'месяцев',
      'か月',
      'ヶ月',
      '개월',
      'شهر',
      'شهرين',
      'أشهر',
      'mese',
      'mesi',
      'mois',
      'Monat',
      'Monaten',
      'Monate',
      'mes',
      'meses',
      'mês',
      'meses',
    ],
  ],
  [
    365,
    [
      'year',
      'years',
      'yr',
      'yrs',
      'y',
      'год',
      'года',
      'лет',
      '年',
      '년',
      'سنة',
      'سنتين',
      'سنوات',
      'anno',
      'anni',
      'an',
      'ans',
      'année',
      'années',
      'Jahr',
      'Jahren',
      'Jahre',
      'año',
      'años',
      'ano',
      'anos',
    ],
  ],
];

TIME_UNIT_ENTRIES.forEach(([multiplier, words]) => {
  words.forEach(w => {
    TIME_UNIT_DAYS[w.toLowerCase()] = multiplier;
  });
});

// The time unit must sit immediately after the number (only spaces allowed
// between them), so non-date text like "5-Minute Crafts" is not read as an age.
const TIME_UNIT_ANCHORED = new RegExp(
  '^\\s*(' +
    Object.keys(TIME_UNIT_DAYS)
      .sort((a, b) => b.length - a.length)
      .join('|') +
    ')(?![a-zA-Z])',
  'i',
);

// Words that may legitimately trail a relative date ("2 days ago", "2 giorni fa",
// "2 日前"). Languages with a leading marker (de "vor", fr "il y a", es "hace",
// ar "منذ") strip it before the first digit, so their tail comes out empty.
const RELATIVE_SUFFIX = new Set(['ago', 'fa', 'atrás', 'atras', 'назад', '前', '전']);

function extractUploadAgeDays(text) {
  const s = String(text).trim();
  if (!/\d/.test(s)) return NaN;

  // Strip everything before the first digit
  const stripped = s.replace(/^[^\d]+/, '');
  if (!stripped) return NaN;

  const numMatch = stripped.match(/^([\d.,]+)/);
  if (!numMatch) return NaN;

  const numStr = numMatch[1];
  const normalized = normalizeNumStr(numStr);
  const base = parseFloat(normalized);
  if (isNaN(base) || base < 0) return NaN;

  const afterNum = stripped.slice(numMatch[0].length);
  const unitMatch = afterNum.match(TIME_UNIT_ANCHORED);
  if (!unitMatch) return NaN;

  const multiplier = TIME_UNIT_DAYS[unitMatch[1].toLowerCase()];
  if (!multiplier) return NaN;

  // After the unit, allow only end-of-string or a known relative marker.
  // This rejects channel/title text such as "5 Minute Crafts KIDS".
  const tail = afterNum.slice(unitMatch[0].length).trim();
  if (tail) {
    const firstToken = tail.split(/\s+/)[0].replace(/[.,!?;:]+$/, '').toLowerCase();
    if (!RELATIVE_SUFFIX.has(firstToken)) return NaN;
  }

  return base * multiplier;
}

function resolveUploadAgeFromSpans(spans) {
  let last = null;
  for (const span of spans) {
    const text = (span.textContent || '').trim();
    // Evaluate each metadata part separately ("Channel • views • date") and keep
    // the LAST valid age, since the date is conventionally the final item. This
    // prevents earlier text (e.g. a "60 Minutes" channel) from winning.
    for (const part of text.split(/[·•]/)) {
      const ageDays = extractUploadAgeDays(part.trim());
      if (!isNaN(ageDays) && ageDays >= 0) {
        last = { ageDays, span };
      }
    }
  }
  return last;
}

const ytVideoChannelCache = {};
const YT_HIDER_CACHE_ATTR = 'data-yt-hider-channel-cache';

function channelCacheValuesEqual(a, b) {
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    return a.every((v, i) => v === b[i]);
  }
  return a === b;
}

function readChannelCacheFromDOM() {
  try {
    const root = document.documentElement;
    if (!root) return false;
    const raw = root.getAttribute(YT_HIDER_CACHE_ATTR);
    if (!raw) return false;
    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object') return false;
    let added = false;
    for (const key in data) {
      if (!Object.prototype.hasOwnProperty.call(data, key)) continue;
      const value = data[key];
      const isValid = typeof value === 'string' || (Array.isArray(value) && value.every(v => typeof v === 'string'));
      if (!isValid) continue;
      if (!channelCacheValuesEqual(ytVideoChannelCache[key], value)) {
        ytVideoChannelCache[key] = value;
        added = true;
      }
    }
    return added;
  } catch (_) {
    return false;
  }
}

const ytChannelIdentityCache = {};
const YT_HIDER_CHANNELID_CACHE_ATTR = 'data-yt-hider-channelid-cache';

function readChannelIdentityCacheFromDOM() {
  try {
    const root = document.documentElement;
    if (!root) return false;
    const raw = root.getAttribute(YT_HIDER_CHANNELID_CACHE_ATTR);
    if (!raw) return false;
    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object') return false;
    let added = false;
    for (const key in data) {
      if (!Object.prototype.hasOwnProperty.call(data, key)) continue;
      const value = data[key];
      if (typeof value !== 'string') continue;
      if (ytChannelIdentityCache[key] !== value) {
        ytChannelIdentityCache[key] = value;
        added = true;
      }
    }
    return added;
  } catch (_) {
    return false;
  }
}

function resolveChannelIdentity(channel) {
  if (!channel) return channel;
  if (Array.isArray(channel)) return channel.map(c => ytChannelIdentityCache[c] || c);
  return ytChannelIdentityCache[channel] || channel;
}

function channelHandleFromPathname(pathname) {
  if (!pathname) return null;
  if (pathname.startsWith('/@')) return ('/' + pathname.split('/')[1]).toLowerCase();
  const channelIdMatch = pathname.match(/^\/channel\/([^/]+)/);
  if (channelIdMatch) return resolveChannelIdentity(('/channel/' + channelIdMatch[1]).toLowerCase());
  return null;
}

function isChannelPagePath(pathname) {
  return !!pathname && (pathname.startsWith('/@') || pathname.startsWith('/channel/'));
}

function extractChannelFromContainer(container) {
  if (!container) return null;
  const el =
    container.querySelector('a[href^="/@"]') ||
    container.querySelector('a[href^="/channel/"]') ||
    container.querySelector('a[href^="/user/"]') ||
    container.querySelector('ytd-channel-name a[href], #channel-name a[href]');
  if (el) {
    const href = el.href || el.getAttribute('href');
    if (href) {
      try {
        return resolveChannelIdentity(new URL(href, window.location.origin).pathname.toLowerCase());
      } catch (_) {}
    }
  }
  try {
    const contentEl = container.querySelector('[class*="content-id-"]');
    const match = contentEl?.className?.match(/content-id-([A-Za-z0-9_-]+)/);
    if (match?.[1] && ytVideoChannelCache[match[1]]) {
      return resolveChannelIdentity(ytVideoChannelCache[match[1]]);
    }
  } catch (_) {}
  return null;
}

// Exposed for unit tests (Node). In a content script `module` is undefined,
// so this guard is a no-op in the browser.
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    extractViewCount,
    normalizeNumStr,
    parseToNumber,
    extractNumberAndSuffix,
    extractUploadAgeDays,
    resolveUploadAgeFromSpans,
  };
}
