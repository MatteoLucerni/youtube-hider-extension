const SUFFIX_MULTIPLIERS = {
  k: 1e3,
  m: 1e6,
  mln: 1e6,
  mio: 1e6,
  mn: 1e6,
  b: 1e9,
  md: 1e9,
  万: 1e4,
  億: 1e8,
  亿: 1e8,
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

const VIEW_COUNT_LABELS_BY_LOCALE = {
  am: ['ዕይታዎች'],
  ar: ['مشاهدات', 'مشاهدة'],
  as: ['টা ভিউ'],
  be: ['прагляд', 'праглядаў', 'прагляды'],
  bg: ['показвания'],
  bn: ['টি ভিউ'],
  el: ['προβολές'],
  fa: ['بازدید'],
  gu: ['જોવાયાની સંખ્યા'],
  hi: ['व्यू'],
  hy: ['դիտում'],
  id: ['x ditonton'],
  iw: ['צפיות'],
  ja: ['回視聴'],
  ka: ['ნახვა'],
  kk: ['рет көрілді'],
  kn: ['ವೀಕ್ಷಣೆಗಳು'],
  ky: ['жолу көрүлдү'],
  mk: ['прегледи'],
  ml: ['കാഴ്‌ച'],
  mn: ['үзэлт'],
  mr: ['व्ह्यू'],
  ne: ['भ्यु'],
  or: ['ଟି ଭ୍ୟୁ'],
  pa: ['ਵਾਰ ਦੇਖਿਆ'],
  ro: ['de vizionări'],
  ru: ['просмотр', 'просмотра', 'просмотров'],
  sr: ['преглед', 'прегледа'],
  ta: ['பார்வைகள்'],
  te: ['వీక్షణలు'],
  uk: ['перегляд', 'перегляди', 'переглядів'],
  ur: ['ملاحظات'],
  vi: ['lượt xem'],
  'zh-CN': ['次观看'],
};

function normalizeViewLabel(label) {
  return String(label).replace(/\s+/g, ' ').trim();
}

const VIEW_COUNT_LABELS = new Set(
  Object.keys(VIEW_COUNT_LABELS_BY_LOCALE).reduce(
    (all, locale) =>
      all.concat(VIEW_COUNT_LABELS_BY_LOCALE[locale].map(normalizeViewLabel)),
    [],
  ),
);

const VIEW_COUNT_PREFIXES_BY_LOCALE = {
  km: ['ចំនួនមើល', ''],
  ko: ['조회수', '회'],
  lo: ['ຍອດເບິ່ງ', 'ເທື່ອ'],
  my: ['ကြည့်ရှုမှု', ''],
  si: ['බැලීම්', ''],
  sw: ['Kutazamwa:', ''],
  th: ['การดู', 'ครั้ง'],
  'zh-HK': ['收看次數：', '次'],
  'zh-TW': ['觀看次數：', '次'],
};

const VIEW_COUNT_PREFIXES = Object.keys(VIEW_COUNT_PREFIXES_BY_LOCALE)
  .map(locale => VIEW_COUNT_PREFIXES_BY_LOCALE[locale])
  .sort((a, b) => b[0].length - a[0].length);

const BIDI_MARKS_REGEX = /[\u200e\u200f\u061c\u202a-\u202e\u2066-\u2069]/g;

const LOCALE_TEMPLATE_NUMBER = '\\d+(?:[.,\\u00a0\\u202f ]\\d{3})*(?:[.,]\\d+)?';

const UPLOAD_AGE_UNIT_DAYS = {
  second: 1 / 86400,
  minute: 1 / 1440,
  hour: 1 / 24,
  day: 1,
  week: 7,
  month: 30,
  year: 365,
};

const UPLOAD_AGE_TEMPLATES_BY_LOCALE = {
  'af-ZA': {
    second: ['# s. gelede', '# sekonde gelede', '# sekondes gelede'],
    minute: ['# min. gelede', '# minute gelede', '# minuut gelede'],
    hour: ['# u. gelede', '# uur gelede'],
    day: ['# dae gelede', '# dag gelede'],
    week: ['# w. gelede', '# week gelede', '# weke gelede'],
    month: ['# maand gelede', '# maande gelede', '# md. gelede'],
    year: ['# j. gelede', '# jaar gelede'],
  },
  'az-Latn-AZ': {
    second: ['# saniyə öncə'],
    minute: ['# dəqiqə öncə'],
    hour: ['# saat öncə'],
    day: ['# gün öncə'],
    week: ['# həftə öncə'],
    month: ['# ay öncə'],
    year: ['# il öncə'],
  },
  'id-ID': {
    second: ['# detik yang lalu', '# dtk lalu'],
    minute: ['# menit yang lalu', '# mnt lalu'],
    hour: ['# jam lalu', '# jam yang lalu'],
    day: ['# h lalu', '# hari yang lalu'],
    week: ['# mgg lalu', '# minggu yang lalu'],
    month: ['# bln lalu', '# bulan yang lalu'],
    year: ['# tahun yang lalu', '# thn lalu'],
  },
  'ms-MY': {
    second: ['# saat lalu'],
    minute: ['# min lalu', '# minit lalu'],
    hour: ['# jam lalu'],
    day: ['# hari lalu'],
    week: ['# mgu lalu', '# minggu lalu'],
    month: ['# bln lalu', '# bulan lalu'],
    year: ['# tahun lalu', '# thn lalu'],
  },
  'bs-Latn-BA': {
    second: ['prije # sek.', 'prije # sekunde', 'prije # sekundi', 'prije # sekundu'],
    minute: ['prije # min', 'prije # minuta', 'prije # minute', 'prije # minutu'],
    hour: ['prije # sat', 'prije # sata', 'prije # sati'],
    day: ['prije # d.', 'prije # dan', 'prije # dana'],
    week: ['prije # sed.', 'prije # sedm.', 'prije # sedmica', 'prije # sedmice', 'prije # sedmicu'],
    month: ['prije # mj.', 'prije # mjesec', 'prije # mjeseca', 'prije # mjeseci'],
    year: ['prije # g.', 'prije # god.', 'prije # godina', 'prije # godine', 'prije # godinu'],
  },
  'ca-ES': {
    second: ['fa # s', 'fa # segon', 'fa # segons'],
    minute: ['fa # min', 'fa # minut', 'fa # minuts'],
    hour: ['fa # h', 'fa # hora', 'fa # hores'],
    day: ['fa # dia', 'fa # dies'],
    week: ['fa # setm.', 'fa # setmana', 'fa # setmanes'],
    month: ['fa # mes', 'fa # mesos'],
    year: ['fa # any', 'fa # anys'],
  },
  'cs-CZ': {
    second: ['před # s', 'před # sekundami', 'před # sekundou'],
    minute: ['před # min', 'před # minutami', 'před # minutou'],
    hour: ['před # h', 'před # hodinami', 'před # hodinou'],
    day: ['před # dnem', 'před # dny'],
    week: ['před # týd.', 'před # týdnem', 'před # týdny'],
    month: ['před # měs.', 'před # měsícem', 'před # měsíci'],
    year: ['před # l.', 'před # lety', 'před # r.', 'před # rokem'],
  },
  'da-DK': {
    second: ['# sek. siden', 'for # sekund siden', 'for # sekunder siden'],
    minute: ['# min. siden', 'for # minut siden', 'for # minutter siden'],
    hour: ['# time siden', '# timer siden'],
    day: ['# dag siden', '# dage siden'],
    week: ['# uge siden', '# uger siden'],
    month: ['# md. siden', '# mdr. siden', 'for # måned siden', 'for # måneder siden'],
    year: ['# år siden'],
  },
  'de-DE': {
    second: ['vor # s', 'vor # sek.', 'vor # sekunde', 'vor # sekunden'],
    minute: ['vor # m', 'vor # min.', 'vor # minute', 'vor # minuten'],
    hour: ['vor # std.', 'vor # stunde', 'vor # stunden'],
    day: ['vor # tag', 'vor # tagen'],
    week: ['vor # wo.', 'vor # woche', 'vor # wochen'],
    month: ['vor # monat', 'vor # monaten'],
    year: ['vor # jahr', 'vor # jahren'],
  },
  'et-EE': {
    second: ['# s eest', '# sek eest', '# sekundi eest'],
    minute: ['# min eest', '# minuti eest'],
    hour: ['# t eest', '# tunni eest'],
    day: ['# p eest', '# päeva eest'],
    week: ['# näd eest', '# nädala eest'],
    month: ['# k eest', '# kuu eest'],
    year: ['# a eest', '# aasta eest'],
  },
  'en-GB': {
    second: ['# sec ago', '# second ago', '# seconds ago'],
    minute: ['# min ago', '# minute ago', '# minutes ago'],
    hour: ['# hour ago', '# hours ago', '# hr ago'],
    day: ['# day ago', '# days ago'],
    week: ['# week ago', '# weeks ago', '# wk ago'],
    month: ['# mo ago', '# month ago', '# months ago'],
    year: ['# year ago', '# years ago', '# yr ago'],
  },
  en: {
    second: ['# sec. ago', '# second ago', '# seconds ago', '#s ago'],
    minute: ['# min ago', '# min. ago', '# minute ago', '# minutes ago', '#m ago'],
    hour: ['# hour ago', '# hours ago', '# hr. ago', '#h ago'],
    day: ['# day ago', '# days ago', '#d ago'],
    week: ['# week ago', '# weeks ago', '# wk. ago', '#w ago'],
    month: ['# mo. ago', '# month ago', '# months ago', '#mo ago'],
    year: ['# year ago', '# years ago', '# yr. ago', '#y ago'],
  },
  'es-ES': {
    second: ['hace # s', 'hace # segundo', 'hace # segundos'],
    minute: ['hace # min', 'hace # minuto', 'hace # minutos'],
    hour: ['hace # h', 'hace # hora', 'hace # horas'],
    day: ['hace # d', 'hace # día', 'hace # días'],
    week: ['hace # sem.', 'hace # semana', 'hace # semanas'],
    month: ['hace # m', 'hace # mes', 'hace # meses'],
    year: ['hace # a', 'hace # año', 'hace # años'],
  },
  'es-419': {
    second: ['hace # s', 'hace # segundo', 'hace # segundos'],
    minute: ['hace # min', 'hace # minuto', 'hace # minutos'],
    hour: ['hace # h', 'hace # hora', 'hace # horas'],
    day: ['hace # día', 'hace # días'],
    week: ['hace # sem.', 'hace # semana', 'hace # semanas'],
    month: ['hace # m', 'hace # mes', 'hace # meses'],
    year: ['hace # a', 'hace # año', 'hace # años'],
  },
  'eu-ES': {
    second: ['duela # segundo'],
    minute: ['duela # minutu'],
    hour: ['duela # ordu'],
    day: ['duela # egun'],
    week: ['duela # aste'],
    month: ['duela # hilabete'],
    year: ['duela # urte'],
  },
  'fil-PH': {
    second: ['# seg. ang nakalipas', '# segundo ang nakalipas'],
    minute: ['# min. ang nakalipas', '# minuto ang nakalipas'],
    hour: ['# oras ang nakalipas'],
    day: ['# (na) araw ang nakalipas', '# araw ang nakalipas'],
    week: ['# (na) linggo ang nakalipas', '# linggo ang nakalipas'],
    month: ['# buwan ang nakalipas'],
    year: ['# taon ang nakalipas'],
  },
  'fr-FR': {
    second: ['il y a # s', 'il y a # seconde', 'il y a # secondes'],
    minute: ['il y a # min', 'il y a # minute', 'il y a # minutes'],
    hour: ['il y a # h', 'il y a # heure', 'il y a # heures'],
    day: ['il y a # j', 'il y a # jour', 'il y a # jours'],
    week: ['il y a # sem.', 'il y a # semaine', 'il y a # semaines'],
    month: ['il y a # m.', 'il y a # mois'],
    year: ['il y a # a', 'il y a # an', 'il y a # ans'],
  },
  'gl-ES': {
    second: ['hai # s', 'hai # segundo', 'hai # segundos'],
    minute: ['hai # min', 'hai # minuto', 'hai # minutos'],
    hour: ['hai # h', 'hai # hora', 'hai # horas'],
    day: ['hai # día', 'hai # días'],
    week: ['hai # sem.', 'hai # semana', 'hai # semanas'],
    month: ['hai # mes', 'hai # meses'],
    year: ['hai # ano', 'hai # anos'],
  },
  'hr-HR': {
    second: ['prije # s', 'prije # sekunde', 'prije # sekundi', 'prije # sekundu'],
    minute: ['prije # min', 'prije # minuta', 'prije # minute', 'prije # minutu'],
    hour: ['prije # h', 'prije # sat', 'prije # sata', 'prije # sati'],
    day: ['prije # d', 'prije # dan', 'prije # dana'],
    week: ['prije # tj.', 'prije # tjedan', 'prije # tjedana', 'prije # tjedna'],
    month: ['prije # mj.', 'prije # mjesec', 'prije # mjeseca', 'prije # mjeseci'],
    year: ['prije # g.', 'prije # godina', 'prije # godine', 'prije # godinu'],
  },
  'zu-ZA': {
    second: ['# amasekhondi edlule', '# isekhondi eledlule'],
    minute: ['# amaminithi edlule', '# iminithi eledlule'],
    hour: ['# amahora edlule', '# ihora eledlule', 'emahoreni angu-# edlule'],
    day: ['# izinsuku ezedlule', '# usuku olwedlule', 'ezinsukwini ezingu-# ezedlule.', 'osukwini olungu-# olwedlule'],
    week: ['amaviki angu-# edlule', 'evikini elingu-# eledlule'],
    month: ['# inyanga edlule', '# izinyanga ezedlule'],
    year: ['# iminyaka edlule', '# unyaka odlule'],
  },
  'is-IS': {
    second: ['fyrir # sek.', 'fyrir # sekúndu', 'fyrir # sekúndum'],
    minute: ['fyrir # mín.', 'fyrir # mínútu', 'fyrir # mínútum'],
    hour: ['fyrir # klst.', 'fyrir # klukkustund', 'fyrir # klukkustundum'],
    day: ['fyrir # degi', 'fyrir # dögum'],
    week: ['fyrir # viku', 'fyrir # vikum'],
    month: ['fyrir # mán.', 'fyrir # mánuði', 'fyrir # mánuðum'],
    year: ['fyrir # ári', 'fyrir # árum'],
  },
  'it-IT': {
    second: ['# s fa', '# sec. fa', '# secondi fa', '# secondo fa'],
    minute: ['# min fa', '# minuti fa', '# minuto fa'],
    hour: ['# h fa', '# ora fa', '# ore fa'],
    day: ['# g fa', '# gg fa', '# giorni fa', '# giorno fa'],
    week: ['# sett. fa', '# settimana fa', '# settimane fa'],
    month: ['# mese fa', '# mesi fa'],
    year: ['# anni fa', '# anno fa'],
  },
  'sw-TZ': {
    second: ['sekunde # iliyopita', 'sekunde # zilizopita'],
    minute: ['dakika # iliyopita', 'dakika # zilizopita'],
    hour: ['saa # iliyopita', 'saa # zilizopita'],
    day: ['siku # iliyopita', 'siku # zilizopita'],
    week: ['wiki # iliyopita', 'wiki # zilizopita'],
    month: ['miezi # iliyopita', 'mwezi # uliopita'],
    year: ['miaka # iliyopita', 'mwaka # uliopita'],
  },
  'lv-LV': {
    second: ['pirms # s', 'pirms # sek.', 'pirms # sekundes', 'pirms # sekundēm'],
    minute: ['pirms # min', 'pirms # minūtes', 'pirms # minūtēm'],
    hour: ['pirms # h', 'pirms # st.', 'pirms # stundas', 'pirms # stundām'],
    day: ['pirms # d.', 'pirms # dienas', 'pirms # dienām'],
    week: ['pirms # ned.', 'pirms # nedēļas', 'pirms # nedēļām'],
    month: ['pirms # mēn.', 'pirms # mēneša', 'pirms # mēnešiem'],
    year: ['pirms # g.', 'pirms # gada', 'pirms # gadiem'],
  },
  'lt-LT': {
    second: ['prieš # s', 'prieš # sek.', 'prieš # sekundes', 'prieš # sekundę', 'prieš # sekundžių'],
    minute: ['prieš # min.', 'prieš # minutes', 'prieš # minutę', 'prieš # minučių'],
    hour: ['prieš # val.', 'prieš # valandas', 'prieš # valandą', 'prieš # valandų'],
    day: ['prieš # d.', 'prieš # dienas', 'prieš # dieną', 'prieš # dienų'],
    week: ['prieš # sav.', 'prieš # savaites', 'prieš # savaitę', 'prieš # savaičių'],
    month: ['prieš # mėn.', 'prieš # mėnesius', 'prieš # mėnesių', 'prieš # mėnesį'],
    year: ['prieš # m.', 'prieš # metus', 'prieš # metų'],
  },
  'hu-HU': {
    second: ['# m.perce', '# másodperccel ezelőtt'],
    minute: ['# perccel ezelőtt', '# perce'],
    hour: ['# órája', '# órával ezelőtt'],
    day: ['# napja', '# nappal ezelőtt'],
    week: ['# hete', '# héttel ezelőtt'],
    month: ['# hónapja', '# hónappal ezelőtt'],
    year: ['# éve', '# évvel ezelőtt'],
  },
  'nl-NL': {
    second: ['# sec. geleden', '# seconde geleden', '# seconden geleden'],
    minute: ['# min. geleden', '# minuten geleden', '# minuut geleden'],
    hour: ['# uur geleden'],
    day: ['# dag geleden', '# dagen geleden', '# dgn geleden'],
    week: ['# week geleden', '# weken geleden'],
    month: ['# maand geleden', '# maanden geleden'],
    year: ['# jaar geleden'],
  },
  'nb-NO': {
    second: ['for # sek siden', 'for # sekund siden', 'for # sekunder siden'],
    minute: ['for # min siden', 'for # minutt siden', 'for # minutter siden'],
    hour: ['for # t siden', 'for # time siden', 'for # timer siden'],
    day: ['for # d. siden', 'for # døgn siden'],
    week: ['for # u. siden', 'for # uke siden', 'for # uker siden'],
    month: ['for # md. siden', 'for # måned siden', 'for # måneder siden'],
    year: ['for # år siden'],
  },
  'uz-Latn-UZ': {
    second: ['# soniya oldin'],
    minute: ['# daqiqa oldin'],
    hour: ['# soat oldin'],
    day: ['# kun oldin'],
    week: ['# hafta oldin'],
    month: ['# oy oldin'],
    year: ['# yil oldin'],
  },
  'pl-PL': {
    second: ['# s temu', '# sek. temu', '# sekund temu', '# sekundy temu', '# sekundę temu'],
    minute: ['# min temu', '# minut temu', '# minuty temu', '# minutę temu'],
    hour: ['# g. temu', '# godz. temu', '# godzin temu', '# godziny temu', '# godzinę temu'],
    day: ['# dni temu', '# dzień temu'],
    week: ['# tydz. temu', '# tydzień temu', '# tyg. temu', '# tygodni temu', '# tygodnie temu'],
    month: ['# mies. temu', '# miesiąc temu', '# miesiące temu', '# miesięcy temu'],
    year: ['# lat temu', '# lata temu', '# rok temu'],
  },
  'pt-PT': {
    second: ['há # s', 'há # segundo', 'há # segundos'],
    minute: ['há # min', 'há # minuto', 'há # minutos'],
    hour: ['há # h', 'há # hora', 'há # horas'],
    day: ['há # dia', 'há # dias'],
    week: ['há # sem.', 'há # semana', 'há # semanas'],
    month: ['há # meses', 'há # mês'],
    year: ['há # ano', 'há # anos'],
  },
  'pt-BR': {
    second: ['há # seg.', 'há # segundo', 'há # segundos'],
    minute: ['há # min.', 'há # minuto', 'há # minutos'],
    hour: ['há # h', 'há # hora', 'há # horas'],
    day: ['há # dia', 'há # dias'],
    week: ['há # sem.', 'há # semana', 'há # semanas'],
    month: ['há # meses', 'há # mês'],
    year: ['há # ano', 'há # anos'],
  },
  'ro-RO': {
    second: ['acum # de secunde', 'acum # sec.', 'acum # secunde', 'acum # secundă'],
    minute: ['acum # de minute', 'acum # min.', 'acum # minut', 'acum # minute'],
    hour: ['acum # de ore', 'acum # h', 'acum # ore', 'acum # oră'],
    day: ['acum # de zile', 'acum # zi', 'acum # zile'],
    week: ['acum # de săptămâni', 'acum # săpt.', 'acum # săptămâni', 'acum # săptămână'],
    month: ['acum # de luni', 'acum # luni', 'acum # lună'],
    year: ['acum # an', 'acum # ani', 'acum # de ani'],
  },
  'sq-AL': {
    second: ['# sek më parë', '# sekonda më parë', '# sekondë më parë'],
    minute: ['# min më parë', '# minuta më parë', '# minutë më parë'],
    hour: ['# orë më parë'],
    day: ['# ditë më parë'],
    week: ['# javë më parë'],
    month: ['# muaj më parë'],
    year: ['# vit më parë', '# vjet më parë'],
  },
  'sk-SK': {
    second: ['pred # s', 'pred # sekundami', 'pred # sekundou'],
    minute: ['pred # min', 'pred # minútami', 'pred # minútou'],
    hour: ['pred # h', 'pred # hodinami', 'pred # hodinou'],
    day: ['pred # d.', 'pred # dňami', 'pred # dňom'],
    week: ['pred # týž.', 'pred # týždňami', 'pred # týždňom'],
    month: ['pred # mes.', 'pred # mesiacmi', 'pred # mesiacom'],
    year: ['pred # r.', 'pred # rokmi', 'pred # rokom'],
  },
  'sl-SI': {
    second: ['pred # s', 'pred # sekundama', 'pred # sekundami', 'pred # sekundo'],
    minute: ['pred # min', 'pred # minutama', 'pred # minutami', 'pred # minuto'],
    hour: ['pred # h', 'pred # urama', 'pred # urami', 'pred # uro'],
    day: ['pred # dnevi', 'pred # dnevom', 'pred # dnevoma'],
    week: ['pred # ted.', 'pred # tedni', 'pred # tednom', 'pred # tednoma'],
    month: ['pred # mes.', 'pred # mesecem', 'pred # mesecema', 'pred # meseci'],
    year: ['pred # leti', 'pred # letom', 'pred # letoma'],
  },
  'sr-Latn-RS': {
    second: ['pre # s.', 'pre # sek.', 'pre # sekunde', 'pre # sekundi'],
    minute: ['pre # min.', 'pre # minuta'],
    hour: ['pre # sata', 'pre # sati', 'pre # č.'],
    day: ['pre # d.', 'pre # dana'],
    week: ['pre # n.', 'pre # ned.', 'pre # nedelja', 'pre # nedelje'],
    month: ['pre # m.', 'pre # mes.', 'pre # meseca', 'pre # meseci'],
    year: ['pre # g.', 'pre # god.', 'pre # godina', 'pre # godine'],
  },
  'fi-FI': {
    second: ['# s sitten', '# sekunti sitten', '# sekuntia sitten'],
    minute: ['# min sitten', '# minuutti sitten', '# minuuttia sitten'],
    hour: ['# t sitten', '# tunti sitten', '# tuntia sitten'],
    day: ['# pv sitten', '# päivä sitten', '# päivää sitten'],
    week: ['# viikko sitten', '# viikkoa sitten', '# vk sitten'],
    month: ['# kk sitten', '# kuukausi sitten', '# kuukautta sitten'],
    year: ['# v sitten', '# vuosi sitten', '# vuotta sitten'],
  },
  'sv-SE': {
    second: ['för # s sen', 'för # sekund sedan', 'för # sekunder sedan'],
    minute: ['för # min sen', 'för # minut sedan', 'för # minuter sedan'],
    hour: ['för # tim sedan', 'för # timmar sedan', 'för # timme sedan'],
    day: ['för # d sedan', 'för # dag sedan', 'för # dagar sedan'],
    week: ['för # v. sedan', 'för # vecka sedan', 'för # veckor sedan'],
    month: ['för # mån. sen', 'för # månad sedan', 'för # månader sedan'],
    year: ['för # år sedan', 'för # år sen'],
  },
  'vi-VN': {
    second: ['# giây trước'],
    minute: ['# phút trước'],
    hour: ['# giờ trước'],
    day: ['# ngày trước'],
    week: ['# tuần trước'],
    month: ['# tháng trước'],
    year: ['# năm trước'],
  },
  'tr-TR': {
    second: ['# saniye önce', '# sn. önce'],
    minute: ['# dakika önce', '# dk. önce'],
    hour: ['# sa. önce', '# saat önce'],
    day: ['# gün önce'],
    week: ['# hafta önce', '# hf. önce'],
    month: ['# ay önce'],
    year: ['# yıl önce'],
  },
  'be-BY': {
    second: ['# с таму', '# секунд таму', '# секунду таму', '# секунды таму'],
    minute: ['# хв таму', '# хвілін таму', '# хвіліну таму', '# хвіліны таму'],
    hour: ['# гадз таму', '# гадзін таму', '# гадзіну таму', '# гадзіны таму'],
    day: ['# дзень таму', '# дзён таму', '# дні таму'],
    week: ['# тыд таму', '# тыдзень таму', '# тыдняў таму', '# тыдні таму'],
    month: ['# мес. таму', '# месяц таму', '# месяцаў таму', '# месяцы таму'],
    year: ['# г. таму', '# гадоў таму', '# гады таму', '# год таму'],
  },
  'bg-BG': {
    second: ['пр. # сек', 'преди # сек', 'преди # секунда', 'преди # секунди'],
    minute: ['пр. # мин', 'преди # мин', 'преди # минута', 'преди # минути'],
    hour: ['пр. # ч', 'преди # ч', 'преди # час', 'преди # часа'],
    day: ['пр. # д', 'преди # ден', 'преди # дни'],
    week: ['пр. # седм.', 'преди # седм.', 'преди # седмица', 'преди # седмици'],
    month: ['пр. # м.', 'преди # м.', 'преди # месец', 'преди # месеца'],
    year: ['пр. # г.', 'преди # г.', 'преди # година', 'преди # години'],
  },
  'ky-KG': {
    second: ['# сек. мурн', '# сек. мурун', '# секунд мурун'],
    minute: ['# мүн. мурн', '# мүн. мурун', '# мүнөт мурун'],
    hour: ['# с. мурн', '# саат мурун', '# саат. мурун'],
    day: ['# күн мурун'],
    week: ['# апт. мурун', '# апта мурун'],
    month: ['# ай мурн', '# ай мурун'],
    year: ['# жыл мурун'],
  },
  'kk-KZ': {
    second: ['# сек. бұрын', '# секунд бұрын'],
    minute: ['# мин. бұрын', '# минут бұрын'],
    hour: ['# сағ. бұрын', '# сағат бұрын'],
    day: ['# күн бұрын'],
    week: ['# ап. бұрын', '# апта бұрын'],
    month: ['# ай бұрын'],
    year: ['# ж. бұрын', '# жыл бұрын'],
  },
  'mk-MK': {
    second: ['пред # сек.', 'пред # секунда', 'пред # секунди'],
    minute: ['пред # мин.', 'пред # минута', 'пред # минути'],
    hour: ['пред # час', 'пред # часа'],
    day: ['пред # ден', 'пред # дена'],
    week: ['пред # седмица', 'пред # седмици'],
    month: ['пред # месец', 'пред # месеци'],
    year: ['пред # год.', 'пред # година', 'пред # години'],
  },
  'mn-MN': {
    second: ['# сек өмнө', '# секундын өмнө'],
    minute: ['# мин өмнө', '# минутын өмнө'],
    hour: ['# ц өмнө', '# цагийн өмнө'],
    day: ['# өдрийн өмнө'],
    week: ['# 7 хоногийн өмнө', '# долоо хоногийн өмнө'],
    month: ['# сарын өмнө'],
    year: ['# жилийн өмнө'],
  },
  'ru-RU': {
    second: ['# сек. назад', '# секунд назад', '# секунду назад', '# секунды назад'],
    minute: ['# мин. назад', '# минут назад', '# минуту назад', '# минуты назад'],
    hour: ['# ч назад', '# час назад', '# часа назад', '# часов назад'],
    day: ['# день назад', '# дн. назад', '# дней назад', '# дня назад'],
    week: ['# нед. назад', '# недели назад', '# недель назад', '# неделю назад'],
    month: ['# мес. назад', '# месяц назад', '# месяца назад', '# месяцев назад'],
    year: ['# г. назад', '# год назад', '# года назад', '# л. назад', '# лет назад'],
  },
  'sr-Cyrl-RS': {
    second: ['пре # с.', 'пре # сек.', 'пре # секунде', 'пре # секунди'],
    minute: ['пре # мин.', 'пре # минута'],
    hour: ['пре # сата', 'пре # сати', 'пре # ч.'],
    day: ['пре # д.', 'пре # дана'],
    week: ['пре # н.', 'пре # нед.', 'пре # недеља', 'пре # недеље'],
    month: ['пре # м.', 'пре # мес.', 'пре # месеца', 'пре # месеци'],
    year: ['пре # г.', 'пре # год.', 'пре # година', 'пре # године'],
  },
  'uk-UA': {
    second: ['# с тому', '# секунд тому', '# секунди тому', '# секунду тому'],
    minute: ['# хв тому', '# хвилин тому', '# хвилини тому', '# хвилину тому'],
    hour: ['# год тому', '# годин тому', '# години тому', '# годину тому'],
    day: ['# день тому', '# дн. тому', '# дні тому', '# днів тому'],
    week: ['# тиж. тому', '# тиждень тому', '# тижні тому', '# тижнів тому'],
    month: ['# міс. тому', '# місяць тому', '# місяці тому', '# місяців тому'],
    year: ['# р. тому', '# роки тому', '# років тому', '# рік тому'],
  },
  'el-GR': {
    second: ['# δ. πριν', 'πριν από # δευτ.', 'πριν από # δευτερόλεπτα', 'πριν από # δευτερόλεπτο'],
    minute: ['# λ. πριν', 'πριν από # λεπ.', 'πριν από # λεπτά', 'πριν από # λεπτό'],
    hour: ['# ώ. πριν', 'πριν από # ώ.', 'πριν από # ώρα', 'πριν από # ώρες'],
    day: ['# ημ. πριν', 'πριν από # ημ.', 'πριν από # ημέρα', 'πριν από # ημέρες'],
    week: ['# εβδ. πριν', 'πριν από # εβδ.', 'πριν από # εβδομάδα', 'πριν από # εβδομάδες'],
    month: ['# μ. πριν', 'πριν από # μήνα', 'πριν από # μήνες'],
    year: ['# έτη πριν', '# έτος πριν', 'πριν από # έτη', 'πριν από # έτος'],
  },
  'hy-AM': {
    second: ['# վ առաջ', '# վայրկյան առաջ', '# վրկ առաջ'],
    minute: ['# ր առաջ', '# րոպե առաջ'],
    hour: ['# ժ առաջ', '# ժամ առաջ'],
    day: ['# օր առաջ'],
    week: ['# շաբ առաջ', '# շաբաթ առաջ'],
    month: ['# ամիս առաջ'],
    year: ['# տ առաջ', '# տարի առաջ'],
  },
  'he-IL': {
    second: ['לפני # שניות', 'לפני # שנ׳'],
    minute: ['לפני # דקות', 'לפני # דק׳'],
    hour: ['לפני # שעות', 'לפני # שע׳', 'לפני שעה (#)', 'לפני שעתיים (#)', 'לפני שע׳ (#)'],
    day: ['לפני # ימים', 'לפני יום #', 'לפני יום אחד (#)', 'לפני יומיים (#)'],
    week: ['לפני # שבועות', 'לפני # שב׳', 'לפני שבועיים (#)'],
    month: ['לפני # חודשים', 'לפני # חו׳', 'לפני חודש (#)', 'לפני חודשיים (#)'],
    year: ['לפני # שנים', 'לפני שנה (#)', 'לפני שנתיים (#)'],
  },
  'ur-PK': {
    second: ['# سیکنڈ پہلے'],
    minute: ['# منٹ پہلے'],
    hour: ['# گھنٹہ پہلے', '# گھنٹے پہلے'],
    day: ['# دن پہلے', '# دنوں پہلے'],
    week: ['# ہفتہ پہلے', '# ہفتے پہلے'],
    month: ['# ماہ قبل', '# ماہ پہلے', '# مہینہ پہلے', '# مہینے پہلے'],
    year: ['# سال پہلے'],
  },
  ar: {
    second: ['قبل # ثانية', 'قبل # ثوانٍ', 'قبل # ثوانِ'],
    minute: ['قبل # دقائق', 'قبل # دقيقة'],
    hour: ['قبل # ساعات', 'قبل # ساعة'],
    day: ['قبل # أيام', 'قبل # يوم', 'قبل # يومًا'],
    week: ['قبل # أسابيع', 'قبل # أسبوع', 'قبل # أسبوعًا'],
    month: ['خلال # أشهر', 'قبل # أشهر', 'قبل # شهر', 'قبل # شهرًا'],
    year: ['قبل # سنة', 'قبل # سنوات'],
  },
  'fa-IR': {
    second: ['# ثانیه پیش'],
    minute: ['# دقیقه پیش'],
    hour: ['# ساعت پیش'],
    day: ['# روز پیش'],
    week: ['# هفته پیش'],
    month: ['# ماه پیش'],
    year: ['# سال پیش'],
  },
  'ne-NP': {
    second: ['# सेकेन्ड पहिले'],
    minute: ['# मिनेट पहिले'],
    hour: ['# घण्टा पहिले'],
    day: ['# दिन पहिले'],
    week: ['# हप्ता पहिले'],
    month: ['# महिना पहिले'],
    year: ['# वर्ष अघि'],
  },
  'mr-IN': {
    second: ['# से. पूर्वी', '# सेकंदांपूर्वी', '# सेकंदापूर्वी'],
    minute: ['# मिनि. पूर्वी', '# मिनिटांपूर्वी', '# मिनिटापूर्वी'],
    hour: ['# तासांपूर्वी', '# तासापूर्वी'],
    day: ['# दिवसांपूर्वी', '# दिवसापूर्वी'],
    week: ['# आठवड्यांपूर्वी', '# आठवड्यापूर्वी'],
    month: ['# महिन्यांपूर्वी', '# महिन्यापूर्वी'],
    year: ['# वर्षांपूर्वी', '# वर्षापूर्वी'],
  },
  'hi-IN': {
    second: ['# सेकंड पहले', '# से॰ पहले'],
    minute: ['# मिनट पहले', '# मि॰ पहले'],
    hour: ['# घंटे पहले', '# घं॰ पहले'],
    day: ['# दिन पहले'],
    week: ['# सप्ताह पहले'],
    month: ['# माह पहले'],
    year: ['# वर्ष पहले'],
  },
  'as-IN': {
    second: ['# ছেকেণ্ড পূৰ্বে'],
    minute: ['# মিনিট পূৰ্বে'],
    hour: ['# ঘণ্টা পূৰ্বে', '# ঘণ্টা পূৰ্বেত ষ্ট্ৰীম কৰা হৈছিল'],
    day: ['# দিন পূৰ্বে'],
    week: ['# সপ্তাহ পূৰ্বে'],
    month: ['# মাহ পূৰ্বে'],
    year: ['# বছৰৰ পূৰ্বে'],
  },
  'bn-BD': {
    second: ['# সেকেন্ড আগে', '# সেকেন্ড পূর্বে'],
    minute: ['# মিনিট আগে'],
    hour: ['# ঘণ্টা আগে', '# ঘন্টা আগে'],
    day: ['# দিন আগে'],
    week: ['# সপ্তাহ আগে'],
    month: ['# মাস আগে'],
    year: ['# বছর পূর্বে'],
  },
  'pa-Guru-IN': {
    second: ['# ਸਕਿੰਟ ਪਹਿਲਾਂ'],
    minute: ['# ਮਿੰਟ ਪਹਿਲਾਂ'],
    hour: ['# ਘੰਟਾ ਪਹਿਲਾਂ', '# ਘੰਟੇ ਪਹਿਲਾਂ'],
    day: ['# ਦਿਨ ਪਹਿਲਾਂ'],
    week: ['# ਹਫ਼ਤਾ ਪਹਿਲਾਂ', '# ਹਫ਼ਤੇ ਪਹਿਲਾਂ'],
    month: ['# ਮਹੀਨਾ ਪਹਿਲਾਂ', '# ਮਹੀਨੇ ਪਹਿਲਾਂ'],
    year: ['# ਸਾਲ ਪਹਿਲਾਂ'],
  },
  'gu-IN': {
    second: ['# સેકંડ પહેલાં'],
    minute: ['# મિનિટ પહેલાં'],
    hour: ['# કલાક પહેલાં'],
    day: ['# દિવસ પહેલાં'],
    week: ['# અઠ. પહેલાં', '# અઠવાડિયા પહેલાં'],
    month: ['# મહિના પહેલાં'],
    year: ['# વર્ષ પહેલાં'],
  },
  'or-IN': {
    second: ['# ସେ. ପୂର୍ବେ', '# ସେକେଣ୍ଡ ପୂର୍ବେ'],
    minute: ['# ମି. ପୂର୍ବେ', '# ମିନିଟ୍ ପୂର୍ବେ'],
    hour: ['# ଘ. ପୂର୍ବେ', '# ଘ. ପୂର୍ବେରେ ଷ୍ଟ୍ରିମ୍ ହେଉଛି', '# ଘଣ୍ଟା ପୂର୍ବେ'],
    day: ['# ଦିନ ପୂର୍ବେ'],
    week: ['# ସପ୍ତା. ପୂର୍ବେ', '# ସପ୍ତାହ ପୂର୍ବେ'],
    month: ['# ମା. ପୂର୍ବେ', '# ମାସ ପୂର୍ବେ'],
    year: ['# ବ. ପୂର୍ବେ', '# ବର୍ଷ ପୂର୍ବେ'],
  },
  'ta-IN': {
    second: ['# வி. முன்', '# விநா. முன்', '# விநாடிகளுக்கு முன்', '# விநாடிக்கு முன்'],
    minute: ['# நி. முன்', '# நிமி. முன்', '# நிமிடங்களுக்கு முன்', '# நிமிடத்திற்கு முன்'],
    hour: ['# ம. முன்', '# மணி. முன்', '# மணிநேரம் முன்'],
    day: ['# நா. முன்', '# நாட்களுக்கு முன்', '# நாளுக்கு முன்'],
    week: ['# வா. முன்', '# வார. முன்', '# வாரங்களுக்கு முன்', '# வாரத்திற்கு முன்'],
    month: ['# மா. முன்', '# மாத. முன்', '# மாதங்களுக்கு முன்', '# மாதத்துக்கு முன்'],
    year: ['# ஆ. முன்', '# ஆண்டிற்கு முன்', '# ஆண்டுகளுக்கு முன்'],
  },
  'te-IN': {
    second: ['# సెక. క్రితం', '# సెకను క్రితం', '# సెకన్ల క్రితం'],
    minute: ['# నిమి. క్రితం', '# నిమిషం క్రితం', '# నిమిషాల క్రితం'],
    hour: ['# గం. క్రితం', '# గంట క్రితం', '# గంటల క్రితం'],
    day: ['# రోజు క్రితం', '# రోజుల క్రితం'],
    week: ['# వారం క్రితం', '# వారాల క్రితం'],
    month: ['# నెల క్రితం', '# నెలల క్రితం'],
    year: ['# సం. క్రితం', '# సంవత్సరం క్రితం', '# సంవత్సరాల క్రితం'],
  },
  'kn-IN': {
    second: ['# ಸೆಕೆಂಡುಗಳ ಹಿಂದೆ', '# ಸೆಕೆಂಡ್ ಹಿಂದೆ'],
    minute: ['# ನಿಮಿಷಗಳ ಹಿಂದೆ', '# ನಿಮಿಷದ ಹಿಂದೆ'],
    hour: ['# ಗಂಟೆ ಹಿಂದೆ', '# ಗಂಟೆಗಳ ಹಿಂದೆ'],
    day: ['# ದಿನಗಳ ಹಿಂದೆ', '# ದಿನದ ಹಿಂದೆ'],
    week: ['# ವಾರಗಳ ಹಿಂದೆ', '# ವಾರದ ಹಿಂದೆ'],
    month: ['# ತಿಂಗಳ ಹಿಂದೆ', '# ತಿಂಗಳು ಹಿಂದೆ', '# ತಿಂಗಳುಗಳ ಹಿಂದೆ'],
    year: ['# ವರ್ಷಗಳ ಹಿಂದೆ', '# ವರ್ಷದ ಹಿಂದೆ'],
  },
  'ml-IN': {
    second: ['# സെക്കൻഡ് മുമ്പ്'],
    minute: ['# മിനിറ്റ് മുമ്പ്'],
    hour: ['# മണിക്കൂർ മുമ്പ്'],
    day: ['# ദിവസം മുമ്പ്'],
    week: ['# ആഴ്ച മുമ്പ്'],
    month: ['# മാസം മുമ്പ്'],
    year: ['# വർഷം മുമ്പ്'],
  },
  'si-LK': {
    second: ['තත්පර #කට පෙර'],
    minute: ['මිනිත්තු #කට පෙර'],
    hour: ['පැය #කට පෙර'],
    day: ['දින #කට පෙර'],
    week: ['සති #කට පෙර'],
    month: ['මාස #කට පෙර'],
    year: ['වසර #කට පෙර'],
  },
  'th-TH': {
    second: ['# วินาทีที่ผ่านมา', '# วินาทีที่แล้ว'],
    minute: ['# นาทีที่ผ่านมา', '# นาทีที่แล้ว'],
    hour: ['# ชม. ที่แล้ว', '# ชั่วโมงที่ผ่านมา'],
    day: ['# วันที่ผ่านมา', '# วันที่แล้ว'],
    week: ['# สัปดาห์ที่ผ่านมา', '# สัปดาห์ที่แล้ว'],
    month: ['# เดือนที่ผ่านมา', '# เดือนที่แล้ว'],
    year: ['# ปีที่แล้ว'],
  },
  'lo-LA': {
    second: ['# ວິ. ກ່ອນ', '# ວິນາທີກ່ອນ'],
    minute: ['# ນທ. ກ່ອນ', '# ນາທີກ່ອນ'],
    hour: ['# ຊມ. ກ່ອນ', '# ຊົ່ວໂມງກ່ອນ'],
    day: ['# ມື້ກ່ອນ'],
    week: ['# ອທ. ກ່ອນ', '# ອາທິດກ່ອນ'],
    month: ['# ດ. ກ່ອນ', '# ເດືອນກ່ອນ'],
    year: ['# ປີກ່ອນ'],
  },
  'my-MM': {
    second: ['ပြီးခဲ့သည့် # စက္ကန့်'],
    minute: ['ပြီးခဲ့သည့် # မိနစ်'],
    hour: ['ပြီးခဲ့သည့် # နာရီ'],
    day: ['ပြီးခဲ့သည့် # ရက်'],
    week: ['ပြီးခဲ့သည့် # ပတ်'],
    month: ['ပြီးခဲ့သည့် # လ'],
    year: ['ပြီးခဲ့သည့် # နှစ်'],
  },
  'ka-GE': {
    second: ['# წამის წინ', '# წმ წინ'],
    minute: ['# წთ წინ', '# წუთის წინ'],
    hour: ['# საათის წინ', '# სთ წინ'],
    day: ['# დღის წინ'],
    week: ['# კვ. წინ', '# კვირის წინ'],
    month: ['# თვის წინ'],
    year: ['# წლის წინ'],
  },
  'am-ET': {
    second: ['ከ# ሰከንድ በፊት', 'ከ# ሰከንዶች በፊት'],
    minute: ['ከ# ደቂቃ በፊት', 'ከ# ደቂቃዎች በፊት'],
    hour: ['ከ# ሰዓት በፊት', 'ከ# ሰዓቶች በፊት'],
    day: ['ከ # ቀን በፊት', 'ከ# ቀናት በፊት', 'ከ# ቀን በፊት', 'ከ# ቀኖች በፊት'],
    week: ['ከ# ሳምንታት በፊት', 'ከ# ሳምንት በፊት'],
    month: ['ከ# ወራት በፊት', 'ከ# ወር በፊት'],
    year: ['ከ# ዓመታት በፊት', 'ከ# ዓመት በፊት'],
  },
  'km-KH': {
    second: ['# វិនាទី​មុន'],
    minute: ['# នាទី​មុន', '# នាទី​​មុន'],
    hour: ['# ម៉ោង​មុន'],
    day: ['# ថ្ងៃ​មុន', '# ថ្ងៃ​​មុន'],
    week: ['# សប្ដាហ៍​មុន'],
    month: ['# ខែមុន'],
    year: ['# ឆ្នាំ​មុន'],
  },
  'zh-Hans-CN': {
    second: ['#秒前', '#秒钟前'],
    minute: ['#分钟前'],
    hour: ['#小时前'],
    day: ['#天前'],
    week: ['#周前'],
    month: ['#个月前'],
    year: ['#年前'],
  },
  'zh-Hant-TW': {
    second: ['# 秒前'],
    minute: ['# 分鐘前'],
    hour: ['# 小時前'],
    day: ['# 天前'],
    week: ['# 週前'],
    month: ['# 個月前'],
    year: ['# 年前'],
  },
  'zh-Hant-HK': {
    second: ['# 秒前', '#秒前'],
    minute: ['# 分鐘前', '#分前'],
    hour: ['# 小時前', '# 小時前曾經串流', '#小時前'],
    day: ['# 日前', '#日前'],
    week: ['# 星期前', '#星期前'],
    month: ['# 個月前', '#個月前'],
    year: ['# 年前', '#年前'],
  },
  'ja-JP': {
    second: ['# 秒前', '#秒前'],
    minute: ['# 分前', '#分前'],
    hour: ['# 時間前', '#時間前'],
    day: ['# 日前', '#日前'],
    week: ['# 週間前', '#週間前'],
    month: ['# か月前', '#か月前'],
    year: ['# 年前', '#年前'],
  },
  'ko-KR': {
    second: ['#초 전'],
    minute: ['#분 전'],
    hour: ['#시간 전'],
    day: ['#일 전'],
    week: ['#주 전'],
    month: ['#개월 전'],
    year: ['#년 전'],
  },
};

const UPLOAD_AGE_TEMPLATE_ALIASES = {
  'es-US': 'es-419',
  'fr-CA': 'fr-FR',
};

const UPLOAD_AGE_PHRASES_BY_LOCALE = {
  'he-IL': {
    second: [['לפני שנ׳', 1], ['לפני שנייה', 1], ['לפני שתי שנ׳', 2], ['לפני שתי שניות', 2]],
    minute: [['לפני דקה', 1], ['לפני שתי דק׳', 2], ['לפני שתי דקות', 2]],
    hour: [['לפני שעה', 1], ['לפני שעתיים', 2]],
    day: [['אתמול', 1], ['לפני יומיים', 2]],
    week: [['לפני שב׳', 1], ['לפני שבוע', 1], ['לפני שבועיים', 2]],
    month: [['לפני חו׳', 1], ['לפני חודש', 1], ['לפני חודשיים', 2]],
    year: [['לפני שנה', 1], ['לפני שנתיים', 2]],
  },
  ar: {
    second: [['قبل ثانية واحدة', 1], ['قبل ثانيتين', 2]],
    minute: [['قبل دقيقة واحدة', 1], ['قبل دقيقتين', 2]],
    hour: [['قبل ساعة واحدة', 1], ['قبل ساعتين', 2]],
    day: [['قبل يوم واحد', 1], ['قبل يومين', 2]],
    week: [['قبل أسبوع واحد', 1], ['قبل أسبوعين', 2]],
    month: [['قبل شهر واحد', 1], ['قبل شهرين', 2]],
    year: [['قبل سنة واحدة', 1], ['قبل سنتين', 2]],
  },
};

const COMPACT_VIEW_TEMPLATES_BY_LOCALE = {
  'af-ZA': {
    3: ['# k'],
    6: ['# m'],
    9: ['# mjd'],
    12: ['# bn'],
  },
  'az-Latn-AZ': {
    3: ['#K'],
    6: ['# mln'],
    9: ['# mlrd'],
    12: ['# trln'],
  },
  'id-ID': {
    3: ['# rb'],
    6: ['# jt'],
    9: ['# M'],
    12: ['# T'],
  },
  'ms-MY': {
    3: ['#K'],
    6: ['#J'],
    9: ['#B'],
    12: ['#T'],
  },
  'bs-Latn-BA': {
    3: ['# hilj.'],
    6: ['# mil.'],
    9: ['# mlrd.'],
    12: ['# bil.'],
  },
  'ca-ES': {
    3: ['# k'],
    6: ['# M'],
    9: ['# kM'],
    12: ['# B'],
  },
  'cs-CZ': {
    3: ['# tis.'],
    6: ['# mil.'],
    9: ['# mld.'],
    12: ['# bil.'],
  },
  'da-DK': {
    3: ['# t'],
    6: ['# mio.'],
    9: ['# mia.'],
    12: ['# bio.'],
  },
  'de-DE': {
    6: ['# Mio.'],
    9: ['# Mrd.'],
    12: ['# Bio.'],
  },
  'et-EE': {
    3: ['# tuh'],
    6: ['# mln'],
    9: ['# mld'],
    12: ['# trln'],
  },
  'en-GB': {
    3: ['#K', '#k'],
    6: ['#M', '#m'],
    9: ['#B', '#bn'],
    12: ['#T'],
  },
  en: {
    3: ['#K'],
    6: ['#M'],
    9: ['#B'],
    12: ['#T'],
  },
  'es-ES': {
    3: ['# K', '# mil'],
    6: ['# M'],
    9: ['# mil M'],
    12: ['# B'],
  },
  'es-419': {
    3: ['# K', '# k'],
    6: ['# M'],
    9: ['# mil M'],
    12: ['# B'],
  },
  'es-US': {
    3: ['# K'],
    6: ['# M'],
    9: ['# mil M'],
    12: ['# B'],
  },
  'eu-ES': {
    6: ['# M'],
    12: ['# B'],
  },
  'fr-FR': {
    3: ['# k'],
    6: ['# M'],
    9: ['# Md'],
    12: ['# Bn'],
  },
  'fr-CA': {
    3: ['# k'],
    6: ['# M'],
    9: ['# G'],
    12: ['# T'],
  },
  'hr-HR': {
    3: ['# tis.'],
    6: ['# mil.'],
    9: ['# mlr.'],
    12: ['# bil.'],
  },
  'is-IS': {
    3: ['# þ.'],
    6: ['# m.'],
    9: ['# ma.'],
    12: ['# bn'],
  },
  'it-IT': {
    3: ['#K'],
    6: ['# Mln'],
    9: ['# Mld'],
    12: ['# Bln'],
  },
  'sw-TZ': {
    3: ['elfu #'],
    6: ['#M'],
    9: ['#B'],
    12: ['#T'],
  },
  'lv-LV': {
    3: ['# tūkst.'],
    6: ['# milj.'],
    9: ['# mljrd.'],
    12: ['# trilj.'],
  },
  'lt-LT': {
    3: ['# tūkst.'],
    6: ['# mln.'],
    9: ['# mlrd.'],
    12: ['# trln.'],
  },
  'hu-HU': {
    3: ['# E'],
    6: ['# M'],
    9: ['# Mrd'],
    12: ['# B'],
  },
  'nl-NL': {
    3: ['#K'],
    6: ['# mln.'],
    9: ['# mld.'],
    12: ['# bln.'],
  },
  'nb-NO': {
    3: ['#k'],
    6: ['# mill.'],
    9: ['# mrd.'],
    12: ['# bill.'],
  },
  'uz-Latn-UZ': {
    3: ['# ming'],
    6: ['# mln'],
    9: ['# mlrd'],
    12: ['# trln'],
  },
  'pl-PL': {
    3: ['# tys.'],
    6: ['# mln'],
    9: ['# mld'],
    12: ['# bln'],
  },
  'pt-PT': {
    3: ['# mil'],
    6: ['# M'],
    9: ['# mM'],
    12: ['# Bi'],
  },
  'pt-BR': {
    3: ['# mil'],
    6: ['# mi'],
    9: ['# bi'],
    12: ['# tri'],
  },
  'ro-RO': {
    3: ['# K'],
    6: ['# mil.'],
    9: ['# mld.'],
    12: ['# tril.'],
  },
  'sq-AL': {
    3: ['# mijë'],
    6: ['# mln'],
    9: ['# mld'],
    12: ['# bln'],
  },
  'sl-SI': {
    3: ['# tis.'],
    6: ['# mio.'],
    9: ['# mrd.'],
    12: ['# bil.'],
  },
  'fi-FI': {
    3: ['# t.'],
    6: ['# milj.'],
    9: ['# mrd.'],
    12: ['# bilj.'],
  },
  'sv-SE': {
    3: ['# tn'],
    6: ['# mn'],
    9: ['# md'],
    12: ['# bn'],
  },
  'vi-VN': {
    3: ['# N'],
    6: ['# Tr'],
    9: ['# T'],
    12: ['# NT'],
  },
  'tr-TR': {
    3: ['# B'],
    6: ['# Mn'],
    9: ['# Mr'],
    12: ['# Tn'],
  },
  'be-BY': {
    3: ['# тыс.'],
    6: ['# млн'],
    9: ['# млрд'],
    12: ['# трлн'],
  },
  'bg-BG': {
    3: ['# хил.'],
    6: ['# млн.'],
    9: ['# млрд.'],
    12: ['# трлн.'],
  },
  'ky-KG': {
    3: ['# миң'],
    6: ['# млн'],
    9: ['# млд'],
    12: ['# трлн'],
  },
  'kk-KZ': {
    3: ['# м.', '# мың'],
    6: ['# млн'],
    9: ['# млрд'],
    12: ['# трлн'],
  },
  'mk-MK': {
    3: ['# илј.'],
    6: ['# М', '# мил.'],
    9: ['# ми.', '# милј.', '# мј.'],
    12: ['# бил.'],
  },
  'mn-MN': {
    3: ['# мян', '# мянга'],
    6: ['# сая'],
    9: ['# тэрбум', '#Т'],
    12: ['#ИН'],
  },
  'sr-Cyrl-RS': {
    3: ['# хиљ.'],
    6: ['# мил.'],
    9: ['# млрд.'],
    12: ['# бил.'],
  },
  'uk-UA': {
    3: ['# тис.'],
    6: ['# млн'],
    9: ['# млрд'],
    12: ['# трлн'],
  },
  'el-GR': {
    3: ['# χιλ.'],
    6: ['# εκ.'],
    9: ['# δισ.'],
    12: ['# τρισ.'],
  },
  'hy-AM': {
    3: ['# հզր'],
    6: ['# մլն'],
    9: ['# մլրդ'],
    12: ['# տրլն'],
  },
  'ur-PK': {
    3: ['# ہزار'],
    5: ['# لاکھ'],
    7: ['# کروڑ'],
    9: ['# ارب'],
    11: ['# کھرب'],
    12: ['# ٹریلین'],
  },
  ar: {
    3: ['# آلاف', '# ألف'],
    6: ['# مليون'],
    9: ['# مليار'],
    12: ['# ترليون'],
  },
  'fa-IR': {
    3: ['# هزار'],
    6: ['# میلیون'],
    9: ['# میلیارد'],
    12: ['# تریلیون'],
  },
  'ne-NP': {
    3: ['# हजार'],
    5: ['# लाख'],
    7: ['# करोड'],
    9: ['# अरब'],
    11: ['# खरब'],
    13: ['# शंख'],
  },
  'mr-IN': {
    3: ['# ह'],
    5: ['# लाख'],
    7: ['# कोटी'],
    9: ['# अब्ज'],
    11: ['# खर्व'],
    13: ['# पद्म'],
  },
  'hi-IN': {
    3: ['# हज़ार'],
    5: ['# लाख'],
    7: ['# क॰'],
    9: ['# अ॰'],
    11: ['# ख॰'],
    13: ['# नील'],
  },
  'as-IN': {
    3: ['# হাজাৰ'],
    5: ['# লাখ'],
    6: ['# নিযুত'],
    8: ['# নিঃ'],
    9: ['# শঃ কঃ', '# শঃ কোঃ'],
    12: ['# শঃ পঃ'],
  },
  'bn-BD': {
    3: ['# হা'],
    5: ['# লা'],
    7: ['# কো'],
    9: ['#কো', '#শত কো'],
    12: ['# লা.কো.'],
  },
  'pa-Guru-IN': {
    3: ['# ਹਜ਼ਾਰ'],
    5: ['# ਲੱਖ'],
    7: ['# ਕਰੋੜ'],
    9: ['# ਅਰਬ'],
    11: ['# ਖਰਬ'],
    13: ['# ਨੀਲ'],
  },
  'gu-IN': {
    3: ['# હજાર'],
    5: ['# લાખ'],
    7: ['# કરોડ'],
    9: ['# અબજ'],
    11: ['# નિખર્વ'],
    12: ['# મહાપદ્મ'],
    13: ['# શંકુ'],
    14: ['# જલધિ'],
  },
  'or-IN': {
    3: ['#ହ'],
    6: ['#ନି'],
    9: ['#ବି'],
    12: ['#ଟ୍ରି'],
  },
  'ta-IN': {
    3: ['#ஆ'],
    5: ['# லட்சம்'],
    6: ['#மி'],
    7: ['# கோடி'],
    9: ['#பி'],
    12: ['#டி'],
  },
  'te-IN': {
    3: ['#వే'],
    5: ['# లక్ష', '# లక్షలు'],
    6: ['#మి'],
    7: ['# కోటి', '# కోట్లు'],
    9: ['#బి'],
    12: ['#ట్రి'],
  },
  'kn-IN': {
    3: ['#ಸಾ'],
    5: ['# ಲಕ್ಷ'],
    6: ['#ಮಿ'],
    7: ['# ಕೋಟಿ'],
    9: ['#ಬಿ'],
    12: ['#ಟ್ರಿ'],
  },
  'ml-IN': {
    3: ['#K'],
    5: ['# ലക്ഷം'],
    6: ['#M'],
    7: ['# കോടി'],
    9: ['#B'],
    12: ['#T'],
  },
  'si-LK': {
    3: ['ද#'],
    6: ['මි#'],
    9: ['බි#'],
    12: ['ට්‍රි#'],
  },
  'th-TH': {
    3: ['# พัน', '#K'],
    4: ['# หมื่น'],
    5: ['# แสน'],
    6: ['# ล้าน', '#M'],
    9: ['# พันล้าน', '#B'],
    12: ['#T'],
  },
  'lo-LA': {
    3: ['# ພັນ'],
    6: ['# ລ້ານ'],
    9: ['# ຕື້'],
    12: ['# ລ້ານລ້ານ', '#ລລ'],
  },
  'my-MM': {
    3: ['# ထောင်'],
    4: ['# သောင်း'],
    5: ['# သိန်း'],
    6: ['# သန်း'],
    7: ['# ကုဋေ', '# ဋေ'],
    10: ['ဋေ # ထ'],
    11: ['ဋေ # သ'],
    12: ['ဋေ # သိန်း'],
    13: ['ဋေ # သန်း'],
    14: ['# ကောဋိ'],
  },
  'ka-GE': {
    3: ['# ათ.'],
    6: ['# მლნ.'],
    9: ['# მლრ.', '# მლრდ.'],
    12: ['# ტრლ.'],
  },
  'am-ET': {
    3: ['# ሺ'],
    6: ['# ሚ'],
    9: ['# ቢ'],
    12: ['# ት'],
  },
  'km-KH': {
    3: ['# ពាន់', '#ពាន់'],
    6: ['# លាន'],
    9: ['# ប៊ីលាន'],
    12: ['# ទ្រីលាន'],
  },
  'zh-Hans-CN': {
    4: ['#万'],
    8: ['#亿'],
    12: ['#万亿'],
  },
  'zh-Hant-TW': {
    4: ['#萬'],
    8: ['#億'],
    12: ['#兆'],
  },
  'ja-JP': {
    4: ['#万'],
    8: ['#億'],
    12: ['#兆'],
  },
  'ko-KR': {
    3: ['#천'],
    4: ['#만'],
    8: ['#억'],
    12: ['#조'],
  },
};

const COMPACT_VIEW_TEMPLATE_ALIASES = {
  'fil-PH': 'en',
  'gl-ES': 'eu-ES',
  'zu-ZA': 'en',
  'sk-SK': 'cs-CZ',
  'sr-Latn-RS': 'bs-Latn-BA',
  'ru-RU': 'be-BY',
  'he-IL': 'en',
  'zh-Hant-HK': 'en',
};

const compiledUploadAgeTemplates = {};
const compiledUploadAgePhrases = {};
const compiledCompactViewTemplates = {};

function getPageLocale() {
  if (typeof document === 'undefined' || !document.documentElement) return '';
  return document.documentElement.lang || '';
}

function normalizeLocaleTemplateInput(text) {
  return String(text)
    .replace(BIDI_MARKS_REGEX, '')
    .replace(/[\s\u00a0\u202f]+/g, ' ')
    .trim();
}

function escapeTemplateText(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function resolveLocaleTableKey(tables, aliases, locale) {
  if (!locale) return null;
  if (tables[locale]) return locale;
  if (aliases[locale]) return aliases[locale];
  const base = locale.split('-')[0].toLowerCase();
  const match = Object.keys(tables)
    .concat(Object.keys(aliases))
    .find(key => key.split('-')[0].toLowerCase() === base);
  if (!match) return null;
  return tables[match] ? match : aliases[match];
}

function compileUploadAgeTemplates(key) {
  if (!compiledUploadAgeTemplates[key]) {
    const table = UPLOAD_AGE_TEMPLATES_BY_LOCALE[key];
    const entries = [];
    Object.keys(table).forEach(unit => {
      table[unit].forEach(template => {
        const [before, after] = template.split('#');
        entries.push({
          length: template.length,
          days: UPLOAD_AGE_UNIT_DAYS[unit],
          regex: new RegExp(
            '(?<![\\p{L}\\p{M}\\p{N}])' +
              escapeTemplateText(before) +
              '(' +
              LOCALE_TEMPLATE_NUMBER +
              ')' +
              escapeTemplateText(after) +
              '(?![\\p{L}\\p{M}\\p{N}])',
            'u',
          ),
        });
      });
    });
    compiledUploadAgeTemplates[key] = entries.sort((a, b) => b.length - a.length);
  }
  return compiledUploadAgeTemplates[key];
}

function compileUploadAgePhrases(key) {
  if (!compiledUploadAgePhrases[key]) {
    const table = UPLOAD_AGE_PHRASES_BY_LOCALE[key];
    const entries = [];
    Object.keys(table).forEach(unit => {
      table[unit].forEach(([phrase, count]) => {
        entries.push({
          length: phrase.length,
          days: UPLOAD_AGE_UNIT_DAYS[unit] * count,
          regex: new RegExp(
            '(?<![\\p{L}\\p{M}\\p{N}])' +
              escapeTemplateText(phrase) +
              '(?![\\p{L}\\p{M}\\p{N}])',
            'u',
          ),
        });
      });
    });
    compiledUploadAgePhrases[key] = entries.sort((a, b) => b.length - a.length);
  }
  return compiledUploadAgePhrases[key];
}

function matchUploadAgeTemplate(text, locale) {
  const s = normalizeLocaleTemplateInput(text).toLowerCase();

  const key = resolveLocaleTableKey(
    UPLOAD_AGE_TEMPLATES_BY_LOCALE,
    UPLOAD_AGE_TEMPLATE_ALIASES,
    locale,
  );
  if (key) {
    for (const entry of compileUploadAgeTemplates(key)) {
      const match = s.match(entry.regex);
      if (match) return parseInt(match[1].replace(/\D/g, ''), 10) * entry.days;
    }
  }

  const phraseKey = resolveLocaleTableKey(UPLOAD_AGE_PHRASES_BY_LOCALE, {}, locale);
  if (phraseKey) {
    for (const entry of compileUploadAgePhrases(phraseKey)) {
      if (entry.regex.test(s)) return entry.days;
    }
  }

  return NaN;
}

function compileCompactViewTemplates(key) {
  if (!compiledCompactViewTemplates[key]) {
    const table = COMPACT_VIEW_TEMPLATES_BY_LOCALE[key];
    const entries = [];
    Object.keys(table).forEach(exponent => {
      table[exponent].forEach(template => {
        const [before, after] = template.split('#');
        entries.push({
          multiplier: Math.pow(10, Number(exponent)),
          regex: new RegExp(
            '^' +
              escapeTemplateText(before) +
              '(' +
              LOCALE_TEMPLATE_NUMBER +
              ')' +
              escapeTemplateText(after) +
              '$',
            'u',
          ),
        });
      });
    });
    compiledCompactViewTemplates[key] = entries;
  }
  return compiledCompactViewTemplates[key];
}

function matchCompactViewTemplate(text, locale) {
  const key = resolveLocaleTableKey(
    COMPACT_VIEW_TEMPLATES_BY_LOCALE,
    COMPACT_VIEW_TEMPLATE_ALIASES,
    locale,
  );
  if (!key) return NaN;
  const s = normalizeLocaleTemplateInput(text);
  for (const entry of compileCompactViewTemplates(key)) {
    const match = s.match(entry.regex);
    if (match) {
      const base = parseFloat(match[1].replace(/[\s\u00a0\u202f]/g, '').replace(',', '.'));
      if (!isNaN(base)) return base * entry.multiplier;
    }
  }
  return NaN;
}

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

function extractViewCount(text, locale = getPageLocale()) {
  const templated = matchCompactViewTemplate(text, locale);
  if (!isNaN(templated)) return { views: templated, confidence: 'high' };

  const s = String(text).replace(BIDI_MARKS_REGEX, '').trim();
  if (!/\d/.test(s)) return NaN;

  let body = s;
  let requiredLabel = null;
  for (const [prefix, label] of VIEW_COUNT_PREFIXES) {
    if (body.startsWith(prefix)) {
      body = body.slice(prefix.length).trim();
      requiredLabel = label;
      break;
    }
  }

  const { numStr, suffix, remainder } = extractNumberAndSuffix(body);
  if (!numStr) return NaN;

  const normalized = normalizeNumStr(numStr, Boolean(suffix));
  const base = parseFloat(normalized);
  if (isNaN(base)) return NaN;

  if (suffix && SUFFIX_MULTIPLIERS[suffix]) {
    return { views: base * SUFFIX_MULTIPLIERS[suffix], confidence: 'high' };
  }

  const label = normalizeViewLabel(remainder);

  if (requiredLabel !== null) {
    if (label === normalizeViewLabel(requiredLabel)) {
      return { views: base, confidence: 'high' };
    }
    return NaN;
  }

  if (!remainder) {
    return { views: base, confidence: 'low' };
  }

  if (VIEW_COUNT_LABELS.has(label)) {
    return { views: base, confidence: 'high' };
  }

  const words = remainder.split(/\s+/).filter(Boolean);
  if (words.length === 1 && /^[\p{Script=Latin}]+$/u.test(words[0])) {
    return { views: base, confidence: 'low' };
  }

  return NaN;
}

const VIDEO_CONTAINER_SELECTORS_WATCH =
  'ytd-compact-video-renderer, ytd-rich-item-renderer, ytd-video-renderer, yt-lockup-view-model, ytm-video-with-context-renderer, ytm-compact-video-renderer';
const VIDEO_CONTAINER_SELECTORS_CHANNEL =
  'ytd-compact-video-renderer, ytd-rich-item-renderer, ytd-video-renderer, ytd-grid-video-renderer, yt-lockup-view-model, ytm-video-with-context-renderer, ytm-compact-video-renderer';
const VIDEO_CONTAINER_SELECTORS_DEFAULT =
  'ytd-compact-video-renderer, ytd-rich-item-renderer, ytd-video-renderer, yt-lockup-view-model, ytm-video-with-context-renderer, ytm-compact-video-renderer, ytm-rich-item-renderer';

function getVideoContainerSelectors() {
  const pathname = window.location.pathname;
  const isChannelPage = isChannelPagePath(pathname);

  if (pathname === '/watch') {
    return VIDEO_CONTAINER_SELECTORS_WATCH;
  }
  if (isChannelPage) {
    return VIDEO_CONTAINER_SELECTORS_CHANNEL;
  }
  return VIDEO_CONTAINER_SELECTORS_DEFAULT;
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

function resolveViewsFromSpans(spans, locale = getPageLocale()) {
  let lowCandidate = null;
  let anchorSpan = null;

  for (const span of spans) {
    const text = (span.textContent || '').trim();
    const result = extractViewCount(text, locale);
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

const TIME_UNIT_ANCHORED = new RegExp(
  '^\\s*(' +
    Object.keys(TIME_UNIT_DAYS)
      .sort((a, b) => b.length - a.length)
      .join('|') +
    ')(?![a-zA-Z])',
  'i',
);

const RELATIVE_SUFFIX = new Set(['ago', 'fa', 'atrás', 'atras', 'назад', '前', '전']);

function extractUploadAgeDays(text, locale = getPageLocale()) {
  const templated = matchUploadAgeTemplate(text, locale);
  if (!isNaN(templated)) return templated;

  const s = String(text).trim();
  if (!/\d/.test(s)) return NaN;

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

  const tail = afterNum.slice(unitMatch[0].length).trim();
  if (tail) {
    const firstToken = tail.split(/\s+/)[0].replace(/[.,!?;:]+$/, '').toLowerCase();
    if (!RELATIVE_SUFFIX.has(firstToken)) return NaN;
  }

  return base * multiplier;
}

function resolveUploadAgeFromSpans(spans, locale = getPageLocale()) {
  let last = null;
  for (const span of spans) {
    const text = (span.textContent || '').trim();
    for (const part of text.split(/[·•]/)) {
      const ageDays = extractUploadAgeDays(part.trim(), locale);
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
