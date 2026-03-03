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

function normalizeNumStr(numStr) {
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

  if (commas === 1) return numStr.replace(',', '.');

  return numStr;
}

function parseToNumber(input) {
  const { numStr, suffix } = extractNumberAndSuffix(input);
  if (!numStr) return NaN;

  const normalized = normalizeNumStr(numStr);
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

  const normalized = normalizeNumStr(numStr);
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
  const isChannelPage = pathname && pathname.startsWith('/@');

  if (pathname === '/watch') {
    return 'ytd-compact-video-renderer, ytd-rich-item-renderer, ytd-video-renderer, yt-lockup-view-model, ytm-video-with-context-renderer, ytm-compact-video-renderer';
  }
  if (isChannelPage) {
    return 'ytd-compact-video-renderer, ytd-rich-item-renderer, ytd-video-renderer, ytd-grid-video-renderer, ytm-video-with-context-renderer, ytm-compact-video-renderer';
  }
  return 'ytd-compact-video-renderer, ytd-rich-item-renderer, ytd-video-renderer, ytm-video-with-context-renderer, ytm-compact-video-renderer, ytm-rich-item-renderer';
}

function findAndHideContainer(element, selectors) {
  let item = element;
  while (item && !item.matches(selectors)) {
    item = item.parentElement;
  }
  if (item) applyFilter(item);
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

const TIME_UNIT_REGEX = new RegExp(
  '(' +
    Object.keys(TIME_UNIT_DAYS)
      .sort((a, b) => b.length - a.length)
      .join('|') +
    ')',
  'i',
);

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

  // Match the time unit in the remaining text (after number) or full text
  const afterNum = stripped.slice(numMatch[0].length);
  const unitMatch = afterNum.match(TIME_UNIT_REGEX) || s.match(TIME_UNIT_REGEX);
  if (!unitMatch) return NaN;

  const multiplier = TIME_UNIT_DAYS[unitMatch[1].toLowerCase()];
  if (!multiplier) return NaN;

  return base * multiplier;
}

function resolveUploadAgeFromSpans(spans) {
  for (const span of spans) {
    const text = (span.textContent || '').trim();
    const ageDays = extractUploadAgeDays(text);
    if (!isNaN(ageDays) && ageDays >= 0) {
      return { ageDays, span };
    }
  }
  return null;
}
