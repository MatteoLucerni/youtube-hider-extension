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
  'skipEnabled',
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
];
const defaultSettings = {
  easyModeEnabled: true,
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
  floatingButtonEnabled: true,
  onboardingCompleted: false,
  welcomeToastCount: 0,
  welcomeToastDismissed: false,
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
      newKeys[key] = value;
    }
  }
  if (Object.keys(newKeys).length > 0) {
    chrome.storage.sync.set(newKeys, () => {
      if (!chrome.runtime.lastError) {
        logger.log('Migrated new settings:', Object.keys(newKeys));
      }
    });
  }
}
function refreshBadge() {
  const defaults = Object.fromEntries(flagKeys.map(key => [key, true]));
  chrome.storage.sync.get(defaults, prefs => {
    if (chrome.runtime.lastError) {
      logger.log('Storage error:', chrome.runtime.lastError.message);
      return;
    }
    if (prefs) {
      updateBadge(prefs);
    }
  });
}
function getBadgeText(flags = {}) {
  const { skipEnabled = false, ...otherFlags } = flags;
  const hideCondition = Object.values(otherFlags).some(Boolean);
  if (skipEnabled && hideCondition) return 'A';
  if (skipEnabled) return 'S';
  if (hideCondition) return 'H';
  return 'OFF';
}
function updateBadge(flags = {}) {
  const text = getBadgeText(flags);
  const anyEnabled =
    flags.skipEnabled ||
    Object.keys(flags)
      .filter(key => key !== 'skipEnabled')
      .some(key => flags[key]);
  const color = anyEnabled ? '#008000' : '#808080';
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
  if (Object.keys(changes).some(key => flagKeys.includes(key))) {
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
      url: chrome.runtime.getURL('welcome.html'),
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
