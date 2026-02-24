const TIMING = {
  DEBOUNCE_MUTATIONS: 100,
  PAGE_CHANGE_DELAY: 100,
  ELEMENT_POLL_INTERVAL: 50,
};

const prefs = {
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
  hideMixesEnabled: true,
  hidePlaylistsEnabled: true,
  dateFilterNewerThreshold: 0,
  dateFilterOlderThreshold: 0,
  dateFilterHomeEnabled: false,
  dateFilterChannelEnabled: false,
  dateFilterSearchEnabled: false,
  dateFilterSubsEnabled: false,
  dateFilterCorrEnabled: false,
  floatingButtonEnabled: true,
  floatingButtonPosition: { edge: 'bottom', offset: 20 },
  tutorialCompleted: false,
};

function initPrefs() {
  return new Promise(resolve => {
    try {
      chrome.storage.sync.get(Object.keys(prefs), result => {
        Object.assign(prefs, result);
        chrome.storage.local.get('floatingButtonPosition', localResult => {
          if (localResult.floatingButtonPosition) {
            prefs.floatingButtonPosition = localResult.floatingButtonPosition;
          }
          logger.log('Prefs loaded', prefs);
          resolve();
        });
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
      if (area === 'sync') {
        for (let key in changes) {
          if (prefs.hasOwnProperty(key)) {
            prefs[key] = changes[key].newValue;
            logger.log(`Pref ${key} changed to`, changes[key].newValue);
          }
        }
        if (changes.floatingButtonEnabled) {
          if (changes.floatingButtonEnabled.newValue && !isWatchPage()) {
            createFloatingButton();
          } else {
            cleanupTour();
            removeTutorialOverlay();
            removeFloatingButton();
          }
        }
      }
      if (area === 'local' && changes.floatingButtonPosition) {
        prefs.floatingButtonPosition = changes.floatingButtonPosition.newValue;
      }
    });
  } catch (e) {
    logger.warn('Could not bind onChanged (context invalidated?)', e);
  }
}
