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
  const anyHide = Object.values(flags)
    .filter((_, i) => i > 0)
    .some(Boolean);
  const color = anyHide ? '#008000' : '#808080';

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

refreshBadge();
chrome.runtime.onStartup.addListener(refreshBadge);
chrome.runtime.onInstalled.addListener(refreshBadge);
