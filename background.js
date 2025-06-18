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
    updateBadge(prefs);
  });
}

function getBadgeText({ skipEnabled, ...flags }) {
  const hideCondition = Object.values(flags).some(Boolean);
  if (skipEnabled && hideCondition) return 'A';
  if (skipEnabled) return 'S';
  if (hideCondition) return 'H';
  return 'OFF';
}

function updateBadge(flags) {
  const text = getBadgeText(flags);
  const anyHide = Object.values(flags)
    .filter((_, i) => i > 0)
    .some(Boolean);
  const color = anyHide ? '#008000' : '#808080';
  chrome.action.setBadgeText({ text });
  chrome.action.setBadgeBackgroundColor({ color });
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'sync') return;
  if (Object.keys(changes).some(key => flagKeys.includes(key))) {
    refreshBadge();
  }
});
