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
    { skipEnabled: true, hideEnabled: true },
    ({ skipEnabled, hideEnabled }) => {
      updateBadge(skipEnabled, hideEnabled);
    }
  );
}

function getBadgeText(skipEnabled, hideEnabled) {
  if (skipEnabled && hideEnabled) {
    return 'A';
  } else if (skipEnabled) {
    return 'S';
  } else if (hideEnabled) {
    return 'H';
  } else {
    return 'OFF';
  }
}

function updateBadge(skipEnabled, hideEnabled) {
  const text = getBadgeText(skipEnabled, hideEnabled);
  const color = skipEnabled || hideEnabled ? '#008000' : '#808080';
  chrome.action.setBadgeText({ text });
  chrome.action.setBadgeBackgroundColor({ color });
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'sync') return;
  if (changes.skipEnabled || changes.hideEnabled) {
    refreshBadge();
  }
});
