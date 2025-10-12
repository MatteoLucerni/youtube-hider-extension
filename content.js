const prefs = {
  skipIntroDelay: 1,
  skipEnabled: true,
  hideThreshold: 20,
  hideHomeEnabled: true,
  hideSearchEnabled: true,
  hideSubsEnabled: true,
  hideCorrEnabled: true,
  viewsHideThreshold: 1000,
  viewsHideHomeEnabled: true,
  viewsHideSearchEnabled: true,
  viewsHideSubsEnabled: true,
  viewsHideCorrEnabled: true,
  hideShortsEnabled: true,
  hideShortsSearchEnabled: true,
};

function initPrefs() {
  return new Promise(resolve => {
    try {
      chrome.storage.sync.get(Object.keys(prefs), result => {
        Object.assign(prefs, result);
        logger.log('Prefs loaded', prefs);
        resolve();
      });
    } catch (e) {
      logger.warn('Could not load prefs (context invalidated?)', e);
      resolve();
    }
  });
}

function setupPrefsListener() {
  try {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== 'sync') return;
      for (let key in changes) {
        if (prefs.hasOwnProperty(key)) {
          prefs[key] = changes[key].newValue;
          logger.log(`Pref ${key} changed to`, changes[key].newValue);
        }
      }
    });
  } catch (e) {
    logger.warn('Could not bind onChanged (context invalidated?)', e);
  }
}

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
    logger.log('Skipped intro/recap');
  }, prefs.skipIntroDelay * 1000);
}

function hideWatched(pathname) {
  const { hideThreshold } = prefs;

  document
    .querySelectorAll(
      'ytd-thumbnail-overlay-resume-playback-renderer #progress, .ytThumbnailOverlayProgressBarHostWatchedProgressBarSegment'
    )
    .forEach(bar => {
      const pct = parseFloat(bar.style.width) || 0;
      if (pct <= hideThreshold) return;

      let item = bar;

      while (
        item &&
        !item.matches(
          pathname === '/watch'
            ? 'ytd-compact-video-renderer, ytd-rich-item-renderer, ytd-video-renderer, yt-lockup-view-model'
            : 'ytd-compact-video-renderer, ytd-rich-item-renderer, ytd-video-renderer'
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

let observerCreated = false;

function hideUnderVisuals(pathname) {
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
        'ytd-compact-video-renderer, ytd-rich-item-renderer, ytd-video-renderer, yt-lockup-view-model'
      )
    ) {
      item = item.parentElement;
    }
    if (item) item.style.display = 'none';
  });

  hideNewFormatVideos(pathname);

  if (!observerCreated) {
    createVideoObserver(pathname);
    observerCreated = true;
  }
}

function hideNewFormatVideos(pathname) {
  const { viewsHideThreshold } = prefs;

  document
    .querySelectorAll('yt-content-metadata-view-model, yt-lockup-view-model')
    .forEach(metadataContainer => {
      const metadataRows = metadataContainer.querySelectorAll(
        '.yt-content-metadata-view-model-wiz__metadata-row, .yt-content-metadata-view-model__metadata-row'
      );
      if (metadataRows.length < 2) return;

      const viewsRow = metadataRows[1];
      const viewsSpan = viewsRow.querySelector(
        'span.yt-core-attributed-string'
      );

      if (!viewsSpan) return;

      const text = viewsSpan.textContent;
      const views = parseToNumber(text);

      if (isNaN(views) || views >= viewsHideThreshold) return;

      let item = viewsSpan;
      while (
        item &&
        !item.matches(
          pathname === '/watch'
            ? 'ytd-compact-video-renderer, ytd-rich-item-renderer, ytd-video-renderer, yt-lockup-view-model'
            : 'ytd-compact-video-renderer, ytd-rich-item-renderer, ytd-video-renderer'
        )
      ) {
        item = item.parentElement;
      }

      if (item) item.style.display = 'none';
    });
}

function createVideoObserver(pathname) {
  const observer = new MutationObserver(() => {
    hideNewFormatVideos(pathname);
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

function hideShorts() {
  document
    .querySelectorAll(
      'ytd-guide-section-renderer, tp-yt-paper-item, ytd-video-renderer, ytd-reel-shelf-renderer'
    )
    .forEach(node => {
      if (node.querySelector('ytm-shorts-lockup-view-model')) {
        node.style.display = 'none';
      }
      if (
        node.querySelector('badge-shape[aria-label="Shorts"]') ||
        node.querySelector(
          'ytd-thumbnail-overlay-time-status-renderer[overlay-style="SHORTS"]'
        )
      ) {
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

  document.querySelectorAll('a[title="Shorts"]').forEach(link => {
    const entry =
      link.closest('ytd-guide-entry-renderer') ||
      link.closest('ytd-mini-guide-entry-renderer');
    if (entry) entry.style.display = 'none';
  });

  document.querySelectorAll('a[title="Shorts"]').forEach(link => {
    const entry = link.closest('ytd-guide-entry-renderer');
    if (entry) entry.style.display = 'none';
  });

  document
    .querySelectorAll('yt-formatted-string[title="Shorts"]')
    .forEach(link => {
      const entry = link.closest('yt-chip-cloud-chip-renderer');
      if (entry) entry.style.display = 'none';
    });

  document
    .querySelectorAll('yt-tab-shape[tab-title="Shorts"]')
    .forEach(link => {
      link.style.display = 'none';
    });

  document.querySelectorAll('grid-shelf-view-model').forEach(node => {
    if (node.querySelector('ytm-shorts-lockup-view-model-v2')) {
      node.style.display = 'none';
    }
  });

  document
    .querySelectorAll(
      'grid-shelf-view-model:has(ytm-shorts-lockup-view-model-v2)'
    )
    .forEach(node => {
      node.style.display = 'none';
    });

  document.querySelectorAll('yt-chip-cloud-chip-renderer').forEach(node => {
    const label = node.querySelector('.ytChipShapeChip');
    if (label && label.textContent.trim() === 'Shorts') {
      node.style.display = 'none';
    }
  });

  document.querySelectorAll('ytd-rich-section-renderer').forEach(section => {
    const allChildren = section.querySelectorAll('*');
    for (const child of allChildren) {
      if (child.style.display === 'none') {
        section.style.display = 'none';
        break;
      }
    }
  });
}

function startHiding() {
  const {
    hideHomeEnabled,
    hideSearchEnabled,
    hideSubsEnabled,
    hideCorrEnabled,
    viewsHideHomeEnabled,
    viewsHideSearchEnabled,
    viewsHideSubsEnabled,
    viewsHideCorrEnabled,
    hideShortsEnabled,
    hideShortsSearchEnabled,
  } = prefs;
  const { pathname } = window.location;

  logger.log('Current path:', pathname);
  logger.log('Hiding prefs:', {
    hideHomeEnabled,
    hideSearchEnabled,
    hideSubsEnabled,
    hideCorrEnabled,
    viewsHideHomeEnabled,
    viewsHideSearchEnabled,
    viewsHideSubsEnabled,
    viewsHideCorrEnabled,
    hideShortsEnabled,
    hideShortsSearchEnabled,
  });

  if (
    (pathname === '/' && hideHomeEnabled) ||
    (pathname === '/results' && hideSearchEnabled) ||
    (pathname === '/watch' && hideCorrEnabled) ||
    (pathname === '/feed/subscriptions' && hideSubsEnabled)
  ) {
    logger.log('Hiding watched videos on', pathname);
    hideWatched(pathname);
  }

  if (
    (pathname === '/' && viewsHideHomeEnabled) ||
    (pathname === '/results' && viewsHideSearchEnabled) ||
    (pathname === '/watch' && viewsHideCorrEnabled) ||
    (pathname === '/feed/subscriptions' && viewsHideSubsEnabled)
  ) {
    logger.log('Hiding low view count videos on', pathname);
    hideUnderVisuals(pathname);
  }

  if (
    hideShortsEnabled &&
    pathname !== '/feed/history' &&
    (hideShortsSearchEnabled || pathname !== '/results')
  ) {
    logger.log('Hiding shorts on', pathname);
    hideShorts();
  }
}

function onMutations() {
  skipIntro();
  startHiding();
}

async function init() {
  await initPrefs();
  setupPrefsListener();

  onMutations();

  const observer = new MutationObserver(onMutations);
  observer.observe(document.body, { childList: true, subtree: true });
}

init();
