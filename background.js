// background.js

chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed');
  refreshBadge();
});

chrome.runtime.onStartup.addListener(() => {
  console.log('Extension started');
  refreshBadge();
});

function refreshBadge() {
  chrome.storage.sync.get(
    {
      skipEnabled: true,
      hideHomeEnabled: true,
      hideSearchEnabled: true,
      hideSubsEnabled: true,
    },
    ({ skipEnabled, hideHomeEnabled, hideSearchEnabled, hideSubsEnabled }) => {
      updateBadge(
        skipEnabled,
        hideHomeEnabled,
        hideSearchEnabled,
        hideSubsEnabled
      );
    }
  );
}

function getBadgeText(skipEnabled, hideHome, hideSearch, hideSubs) {
  if (skipEnabled && (hideHome || hideSearch || hideSubs)) return 'A';
  if (skipEnabled) return 'S';
  if (hideHome || hideSearch || hideSubs) return 'H';
  return 'OFF';
}

function updateBadge(skipEnabled, hideHome, hideSearch, hideSubs) {
  const text = getBadgeText(skipEnabled, hideHome, hideSearch, hideSubs);
  const color =
    skipEnabled || hideHome || hideSearch || hideSubs ? '#008000' : '#808080';
  chrome.action.setBadgeText({ text });
  chrome.action.setBadgeBackgroundColor({ color });
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'sync') return;
  if (
    changes.skipEnabled ||
    changes.hideHomeEnabled ||
    changes.hideSubsEnabled ||
    changes.hideSearchEnabled
  ) {
    refreshBadge();
  }
});
