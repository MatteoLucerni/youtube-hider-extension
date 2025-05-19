chrome.runtime.onInstalled.addListener(() => {
  console.log('Skipper installed');
});

const BADGE_ON = { text: 'A', color: '#008000' };
const BADGE_OFF = { text: 'D', color: '#808080' };

function updateBadge(isEnabled) {
  if (isEnabled) {
    chrome.action.setBadgeText({ text: BADGE_ON.text });
    chrome.action.setBadgeBackgroundColor({ color: BADGE_ON.color });
  } else {
    chrome.action.setBadgeText({ text: BADGE_OFF.text });
    chrome.action.setBadgeBackgroundColor({ color: BADGE_OFF.color });
  }
}

chrome.storage.sync.get({ skipEnabled: true }, ({ skipEnabled }) => {
  updateBadge(skipEnabled);
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync' && changes.skipEnabled) {
    updateBadge(changes.skipEnabled.newValue);
  }
});
