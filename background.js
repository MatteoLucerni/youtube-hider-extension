const DEV_MODE = false;
const logger = {
  log: (...args) => {
    if (DEV_MODE) console.log(...args);
  },
  warn: (...args) => {
    if (DEV_MODE) console.warn(...args);
  },
  error: (...args) => {
    if (DEV_MODE) console.error(...args);
  },
  info: (...args) => {
    if (DEV_MODE) console.info(...args);
  },
};

const UNINSTALL_SURVEY_URL = 'https://forms.gle/RAcQp2acFGkjfuS86';

const flagKeys = [
  'hideHomeEnabled',
  'hideSearchEnabled',
  'hideSubsEnabled',
  'hideChannelEnabled',
  'hideCorrEnabled',
  'viewsHideHomeEnabled',
  'viewsHideSearchEnabled',
  'viewsHideSubsEnabled',
  'viewsHideChannelEnabled',
  'viewsHideCorrEnabled',
  'hideShortsEnabled',
  'hideShortsSearchEnabled',
  'dateFilterHomeEnabled',
  'dateFilterChannelEnabled',
  'dateFilterSearchEnabled',
  'dateFilterSubsEnabled',
  'dateFilterCorrEnabled',
];

// Keys whose threshold > 0 also counts as "active" for the badge
const thresholdFlagKeys = [
  'dateFilterNewerThreshold',
  'dateFilterOlderThreshold',
];
const defaultSettings = {
  easyModeEnabled: true,
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
  dateFilterNewerThreshold: 0,
  dateFilterOlderThreshold: 0,
  dateFilterHomeEnabled: false,
  dateFilterChannelEnabled: false,
  dateFilterSearchEnabled: false,
  dateFilterSubsEnabled: false,
  dateFilterCorrEnabled: false,
  floatingButtonEnabled: true,
  tutorialCompleted: false,
};
function initializeSettings() {
  chrome.storage.sync.get(null, items => {
    if (chrome.runtime.lastError) {
      logger.log('Storage error:', chrome.runtime.lastError.message);
      return;
    }
    const isFirstInstall = Object.keys(items).length === 0;
    if (isFirstInstall) {
      chrome.storage.sync.set(defaultSettings, () => {
        if (chrome.runtime.lastError) {
          logger.log(
            'Error setting defaults:',
            chrome.runtime.lastError.message,
          );
        } else {
          logger.log('Default settings initialized');
          updateBadge(defaultSettings);
        }
      });
    } else {
      migrateSettings(items);
      refreshBadge();
    }
  });
}

function migrateSettings(currentSettings) {
  const newKeys = {};
  for (const [key, value] of Object.entries(defaultSettings)) {
    if (!(key in currentSettings)) {
      if (key === 'tutorialCompleted') {
        newKeys[key] = true;
      } else {
        newKeys[key] = value;
      }
    }
  }
  if (Object.keys(newKeys).length > 0) {
    chrome.storage.sync.set(newKeys, () => {
      if (!chrome.runtime.lastError) {
        logger.log('Migrated new settings:', Object.keys(newKeys));
      }
    });
  }

  // Slider-off migration: remove toggle switches, use slider position for on/off
  if (!currentSettings.sliderOffMigrationDone) {
    migrateSliderOff(currentSettings);
  }
}

function migrateSliderOff(s) {
  const updates = { sliderOffMigrationDone: true };
  const removals = [];

  // Hide Watched: if all per-page flags are false, set threshold to 0 (Off)
  const watchAllOff =
    !s.hideHomeEnabled &&
    !s.hideChannelEnabled &&
    !s.hideSearchEnabled &&
    !s.hideSubsEnabled &&
    !s.hideCorrEnabled;
  if (watchAllOff) {
    updates.hideThreshold = 0;
  } else if (s.hideThreshold === 0) {
    // User had 0% threshold with feature on - move to 5 (closest active value)
    updates.hideThreshold = 5;
  }

  // Min Views: if all per-page flags are false, set threshold to 0 (Off)
  const viewsAllOff =
    !s.viewsHideHomeEnabled &&
    !s.viewsHideChannelEnabled &&
    !s.viewsHideSearchEnabled &&
    !s.viewsHideSubsEnabled &&
    !s.viewsHideCorrEnabled;
  if (viewsAllOff) {
    updates.viewsHideThreshold = 0;
  }

  // Date Newer: if toggle was off, set threshold to 0 (Off)
  if (s.dateFilterNewerEnabled === false) {
    updates.dateFilterNewerThreshold = 0;
  }
  // Date Older: if toggle was off, set threshold to 0 (Off)
  if (s.dateFilterOlderEnabled === false) {
    updates.dateFilterOlderThreshold = 0;
  }

  // Remove deprecated boolean keys
  removals.push('dateFilterNewerEnabled', 'dateFilterOlderEnabled');

  chrome.storage.sync.set(updates, () => {
    if (!chrome.runtime.lastError) {
      logger.log('Slider-off migration applied:', Object.keys(updates));
    }
  });
  if (removals.length > 0) {
    chrome.storage.sync.remove(removals, () => {
      if (!chrome.runtime.lastError) {
        logger.log('Removed deprecated keys:', removals);
      }
    });
  }
}
function refreshBadge() {
  const defaults = Object.fromEntries(flagKeys.map(key => [key, true]));
  const thresholdDefaults = Object.fromEntries(
    thresholdFlagKeys.map(key => [key, 0]),
  );
  chrome.storage.sync.get(
    { ...defaults, ...thresholdDefaults, hideThreshold: 20, viewsHideThreshold: 1000 },
    prefs => {
      if (chrome.runtime.lastError) {
        logger.log('Storage error:', chrome.runtime.lastError.message);
        return;
      }
      if (prefs) {
        updateBadge(prefs);
      }
    },
  );
}
function getBadgeText(flags = {}) {
  const hideWatchedActive =
    (flags.hideThreshold || 0) > 0 &&
    ['hideHomeEnabled', 'hideSearchEnabled', 'hideSubsEnabled', 'hideChannelEnabled', 'hideCorrEnabled'].some(k => flags[k]);
  const viewsActive =
    (flags.viewsHideThreshold || 0) > 0 &&
    ['viewsHideHomeEnabled', 'viewsHideSearchEnabled', 'viewsHideSubsEnabled', 'viewsHideChannelEnabled', 'viewsHideCorrEnabled'].some(k => flags[k]);
  const shortsActive = flags.hideShortsEnabled || flags.hideShortsSearchEnabled;
  const dateOn =
    (flags.dateFilterNewerThreshold || 0) > 0 ||
    (flags.dateFilterOlderThreshold || 0) > 0;
  const dateActive =
    dateOn &&
    ['dateFilterHomeEnabled', 'dateFilterChannelEnabled', 'dateFilterSearchEnabled', 'dateFilterSubsEnabled', 'dateFilterCorrEnabled'].some(k => flags[k]);
  if (hideWatchedActive || viewsActive || shortsActive || dateActive) return '';
  return 'OFF';
}
function updateBadge(flags = {}) {
  const text = getBadgeText(flags);
  const color = text === '' ? '#008000' : '#808080';
  chrome.action.setBadgeText({ text }, () => {
    if (chrome.runtime.lastError) {
      logger.log('Badge text error:', chrome.runtime.lastError.message);
    }
  });
  chrome.action.setBadgeBackgroundColor({ color }, () => {
    if (chrome.runtime.lastError) {
      logger.log('Badge color error:', chrome.runtime.lastError.message);
    }
  });
}
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'sync') return;
  const allBadgeKeys = [
    ...flagKeys,
    ...thresholdFlagKeys,
    'hideThreshold',
    'viewsHideThreshold',
  ];
  if (Object.keys(changes).some(key => allBadgeKeys.includes(key))) {
    refreshBadge();
  }
});
chrome.runtime.onStartup.addListener(() => {
  refreshBadge();
});
chrome.runtime.onInstalled.addListener(details => {
  if (details.reason === chrome.runtime.OnInstalledReason.INSTALL) {
    chrome.runtime.setUninstallURL(UNINSTALL_SURVEY_URL);
    logger.log('Uninstall URL set for new installation');

    chrome.tabs.create({
      url: 'https://youtubehider.com/welcome.html',
      active: true,
    });
    logger.log('Welcome page opened');
  }

  if (details.reason === chrome.runtime.OnInstalledReason.UPDATE) {
    chrome.runtime.setUninstallURL(UNINSTALL_SURVEY_URL);
    logger.log('Uninstall URL updated');
  }

  initializeSettings();
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'openSettings') {
    chrome.tabs.create({
      url: chrome.runtime.getURL('popup.html?standalone=true'),
      active: true,
    });
    sendResponse({ success: true });
  }
  return false;
});

initializeSettings();
