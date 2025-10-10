const flagKeys = [
  'skipEnabled',
  'hideHomeEnabled',
  'hideSearchEnabled',
  'hideSubsEnabled',
  'hideCorrEnabled',
  'viewsHideHomeEnabled',
  'viewsHideSearchEnabled',
  'viewsHideSubsEnabled',
  'viewsHideCorrEnabled',
  'hideShortsEnabled',
  'hideShortsSearchEnabled',
];

const defaultSettings = {
  easyModeEnabled: true,
  skipIntroDelay: 1,
  skipEnabled: true,
  hideThreshold: 30,
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

function initializeSettings() {
  chrome.storage.sync.get(null, items => {
    if (chrome.runtime.lastError) {
      console.log('Storage error:', chrome.runtime.lastError.message);
      return;
    }

    const isFirstInstall = Object.keys(items).length === 0;

    if (isFirstInstall) {
      chrome.storage.sync.set(defaultSettings, () => {
        if (chrome.runtime.lastError) {
          console.log(
            'Error setting defaults:',
            chrome.runtime.lastError.message
          );
        } else {
          console.log('Default settings initialized');
          updateBadge(defaultSettings);
        }
      });
    } else {
      refreshBadge();
    }
  });
}

function refreshBadge() {
  const defaults = Object.fromEntries(flagKeys.map(key => [key, true]));
  chrome.storage.sync.get(defaults, prefs => {
    if (chrome.runtime.lastError) {
      console.log('Storage error:', chrome.runtime.lastError.message);
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
      console.log('Badge text error:', chrome.runtime.lastError.message);
    }
  });

  chrome.action.setBadgeBackgroundColor({ color }, () => {
    if (chrome.runtime.lastError) {
      console.log('Badge color error:', chrome.runtime.lastError.message);
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

chrome.runtime.onInstalled.addListener(() => {
  initializeSettings();
});

initializeSettings();
