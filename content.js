const TIMING = {
  DEBOUNCE_MUTATIONS: 100,
  PAGE_CHANGE_DELAY: 100,
  ELEMENT_POLL_INTERVAL: 50,
};

const prefs = {
  skipIntroDelay: 1,
  skipEnabled: true,
  hideThreshold: 20,
  hideHomeEnabled: true,
  hideChannelEnabled: true,
  hideSearchEnabled: true,
  hideSubsEnabled: true,
  hideCorrEnabled: true,
  viewsHideThreshold: 1000,
  viewsHideHomeEnabled: true,
  viewsHideChannelEnabled: true,
  viewsHideSearchEnabled: true,
  viewsHideSubsEnabled: true,
  viewsHideCorrEnabled: true,
  hideShortsEnabled: true,
  hideShortsSearchEnabled: true,
};

let hiddenItemsCount = 0;
let warningDismissed = false;
let warningElement = null;
let consecutiveHighLoadStrikes = 0;
const HIDE_WARNING_THRESHOLD = 15;
const HIDE_WARNING_INTERVAL = 2000;
const STRIKES_REQUIRED = 4;

setInterval(() => {
  if (hiddenItemsCount > HIDE_WARNING_THRESHOLD) {
    consecutiveHighLoadStrikes++;
  } else {
    consecutiveHighLoadStrikes = 0;
  }

  if (consecutiveHighLoadStrikes >= STRIKES_REQUIRED && !warningDismissed) {
    showHighFilteringWarning();
  }
  hiddenItemsCount = 0;
}, HIDE_WARNING_INTERVAL);

function incrementHiddenCounter() {
  if (!warningDismissed) {
    hiddenItemsCount++;
  }
}

function showHighFilteringWarning() {
  if (warningElement || warningDismissed) return;

  warningElement = document.createElement('div');
  warningElement.id = 'yh-filter-warning';

  Object.assign(warningElement.style, {
    position: 'fixed',
    bottom: '24px',
    right: '24px',
    backgroundColor: '#222222',
    border: '1px solid #3a3a3a',
    color: '#ebebeb',
    padding: '16px',
    borderRadius: '8px',
    zIndex: '2147483647',
    boxShadow: '0 4px 20px rgba(0,0,0,0.6)',
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontSize: '13.5px',
    maxWidth: '320px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    animation: 'fadeIn 0.3s ease-out',
  });

  const titleRow = document.createElement('div');
  titleRow.style.display = 'flex';
  titleRow.style.alignItems = 'center';
  titleRow.style.gap = '8px';
  titleRow.style.marginBottom = '4px';

  const title = document.createElement('span');
  title.textContent = 'High Filtering Detected';
  title.style.fontWeight = '700';
  title.style.color = '#8ab4f8';
  title.style.fontSize = '14px';

  titleRow.appendChild(title);

  const msg = document.createElement('span');
  msg.textContent =
    'Many videos are being hidden rapidly. This might cause infinite loading. Consider lowering your filter settings.';
  msg.style.color = '#b8b8b8';
  msg.style.lineHeight = '1.4';

  const btnRow = document.createElement('div');
  btnRow.style.display = 'flex';
  btnRow.style.justifyContent = 'flex-end';
  btnRow.style.marginTop = '4px';

  const closeBtn = document.createElement('button');
  closeBtn.textContent = 'Dismiss';
  Object.assign(closeBtn.style, {
    backgroundColor: '#3a3a3a',
    color: '#8ab4f8',
    border: 'none',
    padding: '6px 12px',
    borderRadius: '5px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '12px',
    transition: 'background-color 0.2s',
    outline: 'none',
  });

  closeBtn.onmouseover = () => {
    closeBtn.style.backgroundColor = '#4a4a4a';
  };
  closeBtn.onmouseout = () => {
    closeBtn.style.backgroundColor = '#3a3a3a';
  };

  closeBtn.onclick = () => {
    if (warningElement) {
      warningElement.style.opacity = '0';
      setTimeout(() => {
        if (warningElement) warningElement.remove();
        warningElement = null;
      }, 300);
    }
    warningDismissed = true;
  };

  btnRow.appendChild(closeBtn);
  warningElement.appendChild(titleRow);
  warningElement.appendChild(msg);
  warningElement.appendChild(btnRow);

  document.body.appendChild(warningElement);
}

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

let skipClickedButtons = new WeakSet();
let skipTimeout = null;

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

  if (!btn || skipClickedButtons.has(btn)) return;

  if (skipTimeout) {
    clearTimeout(skipTimeout);
  }

  skipClickedButtons.add(btn);

  skipTimeout = setTimeout(() => {
    btn.click();
    logger.log('Skipped intro/recap');
    skipTimeout = null;
  }, prefs.skipIntroDelay * 1000);
}

function hideWatched(pathname) {
  const { hideThreshold } = prefs;

  document
    .querySelectorAll(
      'ytd-thumbnail-overlay-resume-playback-renderer #progress, .ytThumbnailOverlayProgressBarHostWatchedProgressBarSegment, ytm-thumbnail-overlay-resume-playback-renderer .thumbnail-overlay-resume-playback-progress'
    )
    .forEach(bar => {
      const alreadyHidden = bar.getAttribute('data-yh-hidden');
      if (alreadyHidden) return;

      const pct = parseFloat(bar.style.width) || 0;
      if (pct <= hideThreshold) return;

      let item = bar;

      const isChannelPage = pathname && pathname.startsWith('/@');

      const selectors =
        pathname === '/watch'
          ? 'ytd-compact-video-renderer, ytd-rich-item-renderer, ytd-video-renderer, yt-lockup-view-model, ytm-video-with-context-renderer, ytm-compact-video-renderer'
          : isChannelPage
          ? 'ytd-compact-video-renderer, ytd-rich-item-renderer, ytd-video-renderer, ytd-grid-video-renderer, ytm-video-with-context-renderer, ytm-compact-video-renderer'
          : 'ytd-compact-video-renderer, ytd-rich-item-renderer, ytd-video-renderer, ytm-video-with-context-renderer, ytm-compact-video-renderer, ytm-rich-item-renderer';

      while (item && !item.matches(selectors)) {
        item = item.parentElement;
      }
      if (!item) return;

      if (item.style.display !== 'none') {
        item.style.display = 'none';
        bar.setAttribute('data-yh-hidden', 'true');
        incrementHiddenCounter();
      }
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
  const isChannelPage = pathname && pathname.startsWith('/@');

  document.querySelectorAll('#metadata-line').forEach(metaLine => {
    let span;
    if (isChannelPage) {
      const spans = metaLine.querySelectorAll('span.style-scope');
      span = spans[0];
    } else {
      span = metaLine.querySelector('span.inline-metadata-item');
    }

    if (!span) return;

    if (span.getAttribute('data-yh-checked')) return;

    const text = span.textContent;

    if (
      /ago|fa|ore|hours|mesi|months|anni|years/.test(text) &&
      !/views|visualizzazioni/.test(text)
    )
      return;

    const views = parseToNumber(text);
    if (isNaN(views) || views >= viewsHideThreshold) return;

    let item = span;
    const selectors = isChannelPage
      ? 'ytd-compact-video-renderer, ytd-rich-item-renderer, ytd-video-renderer, ytd-grid-video-renderer, yt-lockup-view-model'
      : 'ytd-compact-video-renderer, ytd-rich-item-renderer, ytd-video-renderer, yt-lockup-view-model';

    while (item && !item.matches(selectors)) {
      item = item.parentElement;
    }

    if (item && item.style.display !== 'none') {
      item.style.display = 'none';
      span.setAttribute('data-yh-checked', 'true');
      incrementHiddenCounter();
    }
  });

  document
    .querySelectorAll('.YtmBadgeAndBylineRendererItemByline')
    .forEach(span => {
      if (span.getAttribute('data-yh-checked')) return;

      const text = span.textContent.trim();

      const timeKeywords =
        /ago|fa|ore|hours|mesi|months|anni|years|settimane|weeks|giorni|days/i;
      const viewKeywords = /views|visualizzazioni|vistas|vues|aufrufe/i;

      if (timeKeywords.test(text)) return;

      const { suffix } = extractNumberAndSuffix(text);
      const hasSuffix = ['K', 'M', 'MLN', 'B'].includes(suffix);
      const isExplicitViewString = viewKeywords.test(text);

      if (!hasSuffix && !isExplicitViewString) return;

      const views = parseToNumber(text);
      if (isNaN(views) || views >= viewsHideThreshold) return;

      const container = span.closest(
        'ytm-video-with-context-renderer, ytm-rich-item-renderer, ytm-compact-video-renderer'
      );

      if (container && container.style.display !== 'none') {
        container.style.display = 'none';
        span.setAttribute('data-yh-checked', 'true');
        incrementHiddenCounter();

        const wrapper = container.closest('ytm-rich-item-renderer');
        if (wrapper) wrapper.style.display = 'none';
      }
    });

  hideNewFormatVideos(pathname);

  if (!observerCreated) {
    createVideoObserver(pathname);
    observerCreated = true;
  }
}

function hideNewFormatVideos(pathname) {
  const { viewsHideThreshold } = prefs;

  const isChannelPage = pathname && pathname.startsWith('/@');

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
      if (viewsSpan.getAttribute('data-yh-checked')) return;

      const text = viewsSpan.textContent;
      const views = parseToNumber(text);

      try {
        logger.log('views-check', {
          views,
          threshold: viewsHideThreshold,
          pathname,
        });
      } catch (e) {}

      if (isNaN(views) || views >= viewsHideThreshold) return;

      let item = viewsSpan;

      const selectors =
        pathname === '/watch'
          ? 'ytd-compact-video-renderer, ytd-rich-item-renderer, ytd-video-renderer, yt-lockup-view-model, ytm-video-with-context-renderer, ytm-compact-video-renderer'
          : isChannelPage
          ? 'ytd-compact-video-renderer, ytd-rich-item-renderer, ytd-video-renderer, ytd-grid-video-renderer, ytm-video-with-context-renderer, ytm-compact-video-renderer'
          : 'ytd-compact-video-renderer, ytd-rich-item-renderer, ytd-video-renderer';

      while (item && !item.matches(selectors)) {
        item = item.parentElement;
      }

      if (item && item.style.display !== 'none') {
        item.style.display = 'none';
        viewsSpan.setAttribute('data-yh-checked', 'true');
        incrementHiddenCounter();
      }
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
  document.querySelectorAll('ytm-rich-section-renderer').forEach(section => {
    if (section.querySelector('ytm-shorts-lockup-view-model')) {
      if (section.style.display !== 'none') {
        section.style.display = 'none';
        incrementHiddenCounter();
      }
    }
  });

  document.querySelectorAll('ytm-pivot-bar-item-renderer').forEach(item => {
    if (item.querySelector('.pivot-shorts')) {
      item.style.display = 'none';
    }
  });

  document
    .querySelectorAll(
      'ytd-guide-section-renderer, tp-yt-paper-item, ytd-video-renderer, ytd-reel-shelf-renderer, ytm-reel-shelf-renderer'
    )
    .forEach(node => {
      let shouldHide = false;
      if (node.querySelector('ytm-shorts-lockup-view-model')) shouldHide = true;
      if (
        node.querySelector('badge-shape[aria-label="Shorts"]') ||
        node.querySelector(
          'ytd-thumbnail-overlay-time-status-renderer[overlay-style="SHORTS"]'
        )
      )
        shouldHide = true;

      if (shouldHide && node.style.display !== 'none') {
        node.style.display = 'none';
        incrementHiddenCounter();
      }
    });

  document.querySelectorAll('a[href^="/shorts/"]').forEach(link => {
    const shelf = link.closest(
      'ytd-rich-shelf-renderer, ytm-reel-shelf-renderer'
    );
    if (shelf) {
      if (shelf.style.display !== 'none') {
        shelf.style.display = 'none';
        incrementHiddenCounter();
      }
      return;
    }
    const item = link.closest(
      'ytd-rich-item-renderer, ytm-video-with-context-renderer'
    );
    if (item && item.style.display !== 'none') {
      item.style.display = 'none';
      incrementHiddenCounter();
    }
  });

  document.querySelectorAll('a[title="Shorts"]').forEach(link => {
    const entry =
      link.closest('ytd-guide-entry-renderer') ||
      link.closest('ytd-mini-guide-entry-renderer') ||
      link.closest('ytm-pivot-bar-item-renderer');
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

  document.querySelectorAll('ytm-chip-cloud-chip-renderer').forEach(chip => {
    if (chip.textContent.trim() === 'Shorts') {
      chip.style.display = 'none';
    }
  });

  document
    .querySelectorAll('yt-tab-shape[tab-title="Shorts"]')
    .forEach(link => {
      link.style.display = 'none';
    });

  document.querySelectorAll('grid-shelf-view-model').forEach(node => {
    if (
      node.querySelector(
        'ytm-shorts-lockup-view-model-v2, ytm-shorts-lockup-view-model'
      )
    ) {
      if (node.style.display !== 'none') {
        node.style.display = 'none';
        incrementHiddenCounter();
      }
    }
  });

  document
    .querySelectorAll(
      'grid-shelf-view-model:has(ytm-shorts-lockup-view-model-v2), grid-shelf-view-model:has(ytm-shorts-lockup-view-model)'
    )
    .forEach(node => {
      if (node.style.display !== 'none') {
        node.style.display = 'none';
        incrementHiddenCounter();
      }
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

  document
    .querySelectorAll('ytd-mini-guide-entry-renderer a[href^="/shorts"]')
    .forEach(link => {
      const entry = link.closest('ytd-mini-guide-entry-renderer');
      if (entry) entry.style.display = 'none';
    });

  document
    .querySelectorAll('a[aria-label="Shorts"][href^="/shorts"]')
    .forEach(link => {
      const mini = link.closest('ytd-mini-guide-entry-renderer');
      const guide = link.closest('ytd-guide-entry-renderer');
      const pivot = link.closest('ytm-pivot-bar-item-renderer');
      if (mini) mini.style.display = 'none';
      if (guide) guide.style.display = 'none';
      if (pivot) pivot.style.display = 'none';
    });
}

let currentPath = window.location.pathname;
let pageLoadTimeout = null;

const PAGE_SELECTORS = {
  '/': [
    'ytd-rich-grid-renderer',
    'ytd-two-column-browse-results-renderer',
    'ytm-browse',
    'ytm-rich-grid-renderer',
  ],
  '/results': [
    'ytd-search',
    'ytd-item-section-renderer',
    'ytm-search',
    'ytm-section-list-renderer',
  ],
  '/watch': [
    'ytd-watch-flexy',
    '#primary',
    'ytm-watch',
    'ytm-single-column-watch-next-results-renderer',
  ],
  '/feed/subscriptions': [
    'ytd-browse',
    'ytd-section-list-renderer',
    'ytm-browse',
  ],
};

function waitForPageElements(pathname, timeout = 3000) {
  return new Promise(resolve => {
    let selectors = PAGE_SELECTORS[pathname];

    if (!selectors && pathname && pathname.startsWith('/@')) {
      selectors = PAGE_SELECTORS['/'];
    }

    if (!selectors) {
      resolve(true);
      return;
    }

    const checkElements = () => {
      for (const selector of selectors) {
        if (document.querySelector(selector)) {
          logger.log(`Page ready: found ${selector} for ${pathname}`);
          resolve(true);
          return true;
        }
      }
      return false;
    };

    if (checkElements()) return;

    const startTime = Date.now();
    const interval = setInterval(() => {
      if (checkElements()) {
        clearInterval(interval);
      } else if (Date.now() - startTime > timeout) {
        logger.warn(`Timeout waiting for page elements on ${pathname}`);
        clearInterval(interval);
        resolve(false);
      }
    }, TIMING.ELEMENT_POLL_INTERVAL);
  });
}

function shouldHideWatched(pathname) {
  const {
    hideHomeEnabled,
    hideChannelEnabled,
    hideSearchEnabled,
    hideSubsEnabled,
    hideCorrEnabled,
  } = prefs;

  return (
    (pathname === '/' && hideHomeEnabled) ||
    (pathname && pathname.startsWith('/@') && hideChannelEnabled) ||
    (pathname === '/results' && hideSearchEnabled) ||
    (pathname === '/watch' && hideCorrEnabled) ||
    (pathname === '/feed/subscriptions' && hideSubsEnabled)
  );
}

function shouldHideViews(pathname) {
  const {
    viewsHideHomeEnabled,
    viewsHideChannelEnabled,
    viewsHideSearchEnabled,
    viewsHideSubsEnabled,
    viewsHideCorrEnabled,
  } = prefs;

  return (
    (pathname === '/' && viewsHideHomeEnabled) ||
    (pathname && pathname.startsWith('/@') && viewsHideChannelEnabled) ||
    (pathname === '/results' && viewsHideSearchEnabled) ||
    (pathname === '/watch' && viewsHideCorrEnabled) ||
    (pathname === '/feed/subscriptions' && viewsHideSubsEnabled)
  );
}

function shouldHideShorts(pathname) {
  const { hideShortsEnabled, hideShortsSearchEnabled } = prefs;

  return (
    hideShortsEnabled &&
    pathname !== '/feed/history' &&
    (hideShortsSearchEnabled || pathname !== '/results')
  );
}

async function startHiding(pathname) {
  logger.log('Starting hide operations for:', pathname);

  await waitForPageElements(pathname);

  const canHideWatched = shouldHideWatched(pathname);
  const canHideViews = shouldHideViews(pathname);
  const canHideShortsFlag = shouldHideShorts(pathname);

  logger.log('Hide decision for', pathname, {
    hideWatched: canHideWatched,
    hideViews: canHideViews,
    hideShorts: canHideShortsFlag,
    relevantPrefs: {
      hideChannelEnabled: prefs.hideChannelEnabled,
      viewsHideChannelEnabled: prefs.viewsHideChannelEnabled,
      hideShortsEnabled: prefs.hideShortsEnabled,
      hideShortsSearchEnabled: prefs.hideShortsSearchEnabled,
    },
  });

  if (canHideWatched) {
    logger.log('Hiding watched videos on', pathname);
    hideWatched(pathname);
  }

  if (canHideViews) {
    logger.log('Hiding low view count videos on', pathname);
    hideUnderVisuals(pathname);
  }

  if (canHideShortsFlag) {
    logger.log('Hiding shorts on', pathname);
    hideShorts();
  }
}

function detectPageChange() {
  const newPath = window.location.pathname;

  if (newPath !== currentPath) {
    logger.log(`Page changed: ${currentPath} -> ${newPath}`);
    currentPath = newPath;

    if (pageLoadTimeout) {
      clearTimeout(pageLoadTimeout);
    }

    pageLoadTimeout = setTimeout(() => {
      startHiding(currentPath);
      pageLoadTimeout = null;
    }, TIMING.PAGE_CHANGE_DELAY);

    return true;
  }

  return false;
}

const debouncedHiding = debounce(() => {
  if (!detectPageChange()) {
    startHiding(currentPath);
  }
}, TIMING.DEBOUNCE_MUTATIONS);

function onMutations() {
  skipIntro();
  debouncedHiding();
}

async function init() {
  await initPrefs();
  setupPrefsListener();

  logger.log('Extension initialized on', currentPath);
  await startHiding(currentPath);

  const observer = new MutationObserver(onMutations);
  observer.observe(document.body, { childList: true, subtree: true });

  logger.log('MutationObserver started');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
