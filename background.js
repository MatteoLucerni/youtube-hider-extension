chrome.runtime.onInstalled.addListener(() => {
  console.log('Skipper installed');
});

const BADGE_ON = { text: 'A', color: '#008000' };
const BADGE_OFF = { text: 'D', color: '#808080' };

function updateBadge(isEnabled) {
  const { text, color } = isEnabled ? BADGE_ON : BADGE_OFF;
  chrome.action.setBadgeText({ text });
  chrome.action.setBadgeBackgroundColor({ color });
}

chrome.runtime.onStartup.addListener(() => {
  chrome.storage.sync.get({ skipEnabled: true }, ({ skipEnabled }) => {
    updateBadge(skipEnabled);
  });
});

chrome.storage.sync.get({ skipEnabled: true }, ({ skipEnabled }) => {
  updateBadge(skipEnabled);
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync' && changes.skipEnabled) {
    updateBadge(changes.skipEnabled.newValue);
  }
});
