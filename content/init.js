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
  let selectors = PAGE_SELECTORS[pathname];

  if (!selectors && isChannelPagePath(pathname)) {
    selectors = PAGE_SELECTORS['/'];
  }

  if (!selectors) {
    return Promise.resolve(true);
  }

  const checkElements = () => {
    for (const selector of selectors) {
      if (document.querySelector(selector)) {
        logger.log(`Page ready: found ${selector} for ${pathname}`);
        return true;
      }
    }
    return false;
  };

  return pollUntil(checkElements, { timeout }).promise.then(found => {
    if (!found) logger.warn(`Timeout waiting for page elements on ${pathname}`);
    return found;
  });
}

async function startHiding(pathname) {
  // logger.log('Starting hide operations for:', pathname);

  if (!prefs.extensionEnabled) {
    resetAppliedFilters(true);
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

  // logger.log('Hide decision for', pathname, {
  //   hideWatched: canHideWatched,
  //   hideViews: canHideViews,
  //   hideShorts: canHideShortsFlag,
  //   hideDateFilter: canHideDateFilter,
  //   hideMixes: canHideMixes,
  //   hidePlaylists: canHidePlaylists,
  //   hideLives: canHideLives,
  //   relevantPrefs: {
  //     hideChannelEnabled: prefs.hideChannelEnabled,
  //     viewsHideChannelEnabled: prefs.viewsHideChannelEnabled,
  //     hideShortsEnabled: prefs.hideShortsEnabled,
  //     hideShortsSearchEnabled: prefs.hideShortsSearchEnabled,
  //     dateFilterNewerThreshold: prefs.dateFilterNewerThreshold,
  //     dateFilterOlderThreshold: prefs.dateFilterOlderThreshold,
  //     hideMixesEnabled: prefs.hideMixesEnabled,
  //     hidePlaylistsEnabled: prefs.hidePlaylistsEnabled,
  //     hideLivesEnabled: prefs.hideLivesEnabled,
  //   },
  // });

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

  if (isInlineWhitelistPath(pathname)) {
    syncInlineWhitelistButton(pathname);
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

    removeInlineWhitelistButton();

    if (pageLoadTimeout) {
      clearTimeout(pageLoadTimeout);
    }

    pageLoadTimeout = setTimeout(() => {
      startHiding(currentPath);
      pageLoadTimeout = null;
    }, TIMING.PAGE_CHANGE_DELAY);

    if (fabShadow && miniPanelOpen) {
      syncPanelWhitelistRow(fabShadow);
    }

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
  const cacheChanged = mutations.some(
    m => m.type === 'attributes' && m.attributeName === YT_HIDER_CACHE_ATTR,
  );
  const channelIdCacheChanged = mutations.some(
    m =>
      m.type === 'attributes' &&
      m.attributeName === YT_HIDER_CHANNELID_CACHE_ATTR,
  );
  const videoCacheUpdated = cacheChanged && readChannelCacheFromDOM();
  const channelIdCacheUpdated =
    channelIdCacheChanged && readChannelIdentityCacheFromDOM();
  if ((videoCacheUpdated || channelIdCacheUpdated) && prefs.extensionEnabled) {
    startHiding(window.location.pathname);
  }

  detectInfiniteLoaderLoop(mutations);

  debouncedHiding();
}

async function init() {
  await initPrefs();
  setupPrefsListener();
  injectDimStyles();
  injectInlineWhitelistStyles();
  watchYouTubeTheme();
  preventHoverPreviewOnDimmedItems();

  logger.log('Extension initialized on', currentPath);
  readChannelCacheFromDOM();
  readChannelIdentityCacheFromDOM();
  await startHiding(currentPath);

  const observer = new MutationObserver(onMutations);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: [YT_HIDER_CACHE_ATTR, YT_HIDER_CHANNELID_CACHE_ATTR],
  });
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
  });

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

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'GET_CURRENT_CHANNEL') {
    sendResponse({ channel: getCurrentPageChannel() });
    return true;
  }
});
