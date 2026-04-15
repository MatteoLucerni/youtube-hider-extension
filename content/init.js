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

async function startHiding(pathname) {
  logger.log('Starting hide operations for:', pathname);

  if (!prefs.extensionEnabled) {
    resetAppliedFilters();
    removeWarning();
    return;
  }

  await waitForPageElements(pathname);

  const canHideWatched = shouldHideWatched(pathname);
  const canHideViews = shouldHideViews(pathname);
  const canHideShortsFlag = shouldHideShorts(pathname);
  const canHideDateFilter = shouldHideDateFilter(pathname);
  const canHideMixes = shouldHideMixes(pathname);
  const canHidePlaylists = shouldHidePlaylists(pathname);
  const canHideLives = shouldHideLives(pathname);

  logger.log('Hide decision for', pathname, {
    hideWatched: canHideWatched,
    hideViews: canHideViews,
    hideShorts: canHideShortsFlag,
    hideDateFilter: canHideDateFilter,
    hideMixes: canHideMixes,
    hidePlaylists: canHidePlaylists,
    hideLives: canHideLives,
    relevantPrefs: {
      hideChannelEnabled: prefs.hideChannelEnabled,
      viewsHideChannelEnabled: prefs.viewsHideChannelEnabled,
      hideShortsEnabled: prefs.hideShortsEnabled,
      hideShortsSearchEnabled: prefs.hideShortsSearchEnabled,
      dateFilterNewerThreshold: prefs.dateFilterNewerThreshold,
      dateFilterOlderThreshold: prefs.dateFilterOlderThreshold,
      hideMixesEnabled: prefs.hideMixesEnabled,
      hidePlaylistsEnabled: prefs.hidePlaylistsEnabled,
      hideLivesEnabled: prefs.hideLivesEnabled,
    },
  });

  if (canHideWatched) {
    logger.log('Hiding watched videos on', pathname);
    hideWatched(pathname);
  }

  if (canHideViews) {
    logger.log('Hiding low view count videos on', pathname);
    hideUnderVisuals();
  }

  if (canHideShortsFlag) {
    logger.log('Hiding shorts on', pathname);
    hideShorts();
  }

  if (canHideDateFilter) {
    logger.log('Hiding videos by upload date on', pathname);
    hideDateFilter();
  }

  if (canHideMixes) {
    logger.log('Hiding mixes on', pathname);
    hideMixes();
  }

  if (canHidePlaylists) {
    logger.log('Hiding playlists on', pathname);
    hidePlaylists();
  }

  if (canHideLives) {
    logger.log('Hiding lives on', pathname);
    hideLives();
  }
}

function detectPageChange() {
  const newPath = window.location.pathname;

  if (newPath !== currentPath) {
    logger.log(`Page changed: ${currentPath} -> ${newPath}`);
    currentPath = newPath;

    removeWarning();
    rapidLoaderCount = 0;
    warningDismissed = false;

    cleanupTour();
    removeTutorialOverlay();

    if (currentPath === '/watch') {
      removeFloatingButton();
    } else if (
      prefs.extensionEnabled &&
      prefs.floatingButtonEnabled &&
      !floatingButtonHost &&
      isYouTube()
    ) {
      createFloatingButton();
    }

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

function onMutations(mutations) {
  detectInfiniteLoaderLoop(mutations);

  debouncedHiding();
}

async function init() {
  await initPrefs();
  setupPrefsListener();
  injectDimStyles();

  logger.log('Extension initialized on', currentPath);
  await startHiding(currentPath);

  const observer = new MutationObserver(onMutations);
  observer.observe(document.body, { childList: true, subtree: true, characterData: true });

  logger.log('MutationObserver started');

  if (isYouTube() && prefs.extensionEnabled) {
    const tutorialPending = !prefs.tutorialCompleted && !isWatchPage();
    if (!isWatchPage()) {
      createFloatingButton(tutorialPending);
    }
    if (tutorialPending && floatingButtonHost) {
      setTimeout(() => showTutorialWelcomeCard(), 1500);
    } else if (!isWatchPage()) {
      chrome.storage.local.get('whatsNewVersion', local => {
        if (local.whatsNewVersion) {
          setTimeout(() => showWhatsNewToast(local.whatsNewVersion), 1500);
        }
      });
    }
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
