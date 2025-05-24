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
    },
    ({ skipEnabled, hideHomeEnabled, hideSearchEnabled }) => {
      updateBadge(skipEnabled, hideHomeEnabled, hideSearchEnabled);
    }
  );
}

function getBadgeText(skipEnabled, hideHome, hideSearch) {
  if (skipEnabled && (hideHome || hideSearch)) return 'A';
  if (skipEnabled) return 'S';
  if (hideHome || hideSearch) return 'H';
  return 'OFF';
}

function updateBadge(skipEnabled, hideHome, hideSearch) {
  const text = getBadgeText(skipEnabled, hideHome, hideSearch);
  const color = skipEnabled || hideHome || hideSearch ? '#008000' : '#808080';
  chrome.action.setBadgeText({ text });
  chrome.action.setBadgeBackgroundColor({ color });
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'sync') return;
  if (
    changes.skipEnabled ||
    changes.hideHomeEnabled ||
    changes.hideSearchEnabled
  ) {
    refreshBadge();
  }
});
