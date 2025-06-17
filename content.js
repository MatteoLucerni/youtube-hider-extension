const prefs = {
  // skip
  skipIntroDelay: 1,
  skipEnabled: true,
  // watched
  hideThreshold: 70,
  hideHomeEnabled: true,
  hideSearchEnabled: false,
  hideSubsEnabled: true,
  hideCorrEnabled: true,
  //shorts
  hideShorstsEnabled: true,
  // views
  viewsHideThreshold: 1000,
  viewsHideHomeEnabled: true,
  viewsHideSearchEnabled: true,
  viewsHideSubsEnabled: true,
  viewsHideCorrEnabled: true,
};

(function initPrefs() {
  try {
    chrome.storage.sync.get(Object.keys(prefs), result => {
      Object.assign(prefs, result);
      console.log('Prefs loaded', prefs);
    });
  } catch (e) {
    console.warn('Could not load prefs (context invalidated?)', e);
  }

  try {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== 'sync') return;
      for (let key in changes) {
        if (prefs.hasOwnProperty(key)) {
          prefs[key] = changes[key].newValue;
          console.log(`Pref ${key} changed to`, changes[key].newValue);
        }
      }
    });
  } catch (e) {
    console.warn('Could not bind onChanged (context invalidated?)', e);
  }
})();

function skipIntro() {
  if (!prefs.skipEnabled) return;

  const netflixBtn = document.querySelector(
    "button[data-uia='player-skip-intro']"
  );
  const primeBtn = document.querySelector('[class*="skipelement-button"]');
  const recapBtn =
    document.querySelector(
      "button[data-uia='viewer-skip-recap'], button[data-uia='player-skip-recap']"
    ) || document.querySelector('[class*="skip-recap"], [class*="SkipRecap"]');

  const btn = netflixBtn || primeBtn || recapBtn;
  if (!btn) return;

  setTimeout(() => {
    btn.click();
    console.log('Skipped intro/recap');
  }, prefs.skipIntroDelay * 1000);
}

function hideWatched() {
  const { hideThreshold } = prefs;

  document
    .querySelectorAll(
      'ytd-thumbnail-overlay-resume-playback-renderer #progress'
    )
    .forEach(bar => {
      const pct = parseFloat(bar.style.width) || 0;
      if (pct <= hideThreshold) return;

      let item = bar;

      while (
        item &&
        !item.matches(
          'ytd-compact-video-renderer, ytd-rich-item-renderer, ytd-video-renderer'
        )
      ) {
        item = item.parentElement;
      }
      if (!item) return;

      item.style.display = 'none';
    });
}

function extractNumberAndSuffix(input) {
  const s = String(input).trim();

  // matching number + optional suffix, case insensitive
  const match = s.match(/^([\d.,]+)\s*(K|Mln|M|B)?/i);
  if (!match) return { numStr: '', suffix: '' };
  return {
    numStr: match[1],
    suffix: (match[2] || '').toUpperCase(),
  };
}

function parseToNumber(input) {
  const { numStr, suffix } = extractNumberAndSuffix(input);
  if (!numStr) return NaN;

  let multiplier = 1;
  switch (suffix.toLowerCase()) {
    case 'k':
      numStr.includes('.') ? (multiplier = 1e2) : (multiplier = 1e3);
      break;
    case 'm':
    case 'mln':
      numStr.includes('.') ? (multiplier = 1e5) : (multiplier = 1e6);
      break;
    case 'b':
      numStr.includes('.') ? (multiplier = 1e8) : (multiplier = 1e9);
      break;
  }

  const normalized = numStr.replace(/\./g, '').replace(',', '.');

  const base = parseFloat(normalized);
  return isNaN(base) ? NaN : base * multiplier;
}

function hideUnderVisuals() {
  const { viewsHideThreshold } = prefs;

  document.querySelectorAll('#metadata-line').forEach(metaLine => {
    const span = metaLine.querySelector('span.inline-metadata-item');
    if (!span) return;

    const text = span.textContent;

    const views = parseToNumber(text);

    if (isNaN(views) || views >= viewsHideThreshold) return;

    let item = span;
    while (
      item &&
      !item.matches(
        'ytd-compact-video-renderer, ytd-rich-item-renderer, ytd-video-renderer'
      )
    ) {
      item = item.parentElement;
    }
    if (item) item.style.display = 'none';
  });
}

function hideShorts() {
  if (!prefs.hideShorstsEnabled) return;
  
  document
    .querySelectorAll(
      'ytd-guide-section-renderer, tp-yt-paper-item, ytd-video-renderer'
    )
    .forEach(node => {
      if (node.querySelector('ytd-thumbnail-overlay-time-status-renderer')) {
        node.style.display = 'none';
      }
    });

  document.querySelectorAll('a[href^="/shorts/"]').forEach(link => {
    const shelf = link.closest('ytd-rich-shelf-renderer');
    if (shelf) {
      shelf.style.display = 'none';
      return;
    }
    const item = link.closest('ytd-rich-item-renderer');
    if (item) item.style.display = 'none';
  });
}

function startHiding() {
  const {
    hideHomeEnabled,
    hideSearchEnabled,
    hideSubsEnabled,
    hideCorrEnabled,
    hideShorstsEnabled,
    viewsHideHomeEnabled,
    viewsHideSearchEnabled,
    viewsHideSubsEnabled,
    viewsHideCorrEnabled,
  } = prefs;
  const { pathname } = window.location;

  if (
    (pathname === '/' && hideHomeEnabled) ||
    (pathname === '/results' && hideSearchEnabled) ||
    (pathname === '/watch' && hideCorrEnabled) ||
    (pathname === '/feed/subscriptions' && hideSubsEnabled)
  ) {
    hideWatched();
  }

  if (
    (pathname === '/' && viewsHideHomeEnabled) ||
    (pathname === '/results' && viewsHideSearchEnabled) ||
    (pathname === '/watch' && viewsHideCorrEnabled) ||
    (pathname === '/feed/subscriptions' && viewsHideSubsEnabled)
  ) {
    hideUnderVisuals();
  }

  if (hideShorstsEnabled) {
    hideShorts();
  }
}

function onMutations() {
  skipIntro();
  startHiding();
}

onMutations();

const observer = new MutationObserver(onMutations);
observer.observe(document.body, { childList: true, subtree: true });
