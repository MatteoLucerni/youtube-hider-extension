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
      hideCorrEnabled: true,
      viewsHideHomeEnabled: true,
      viewsHideSearchEnabled: true,
      viewsHideSubsEnabled: true,
      viewsHideCorrEnabled: true,
      hideShortsEnabled: true,
    },
    ({
      skipEnabled,
      hideHomeEnabled,
      hideSearchEnabled,
      hideSubsEnabled,
      hideCorrEnabled,
      viewsHideHomeEnabled,
      viewsHideSearchEnabled,
      viewsHideSubsEnabled,
      viewsHideCorrEnabled,
      hideShortsEnabled,
    }) => {
      updateBadge(
        skipEnabled,
        hideHomeEnabled,
        hideSearchEnabled,
        hideCorrEnabled,
        hideSubsEnabled,
        viewsHideHomeEnabled,
        viewsHideSearchEnabled,
        viewsHideSubsEnabled,
        viewsHideCorrEnabled,
        hideShortsEnabled
      );
    }
  );
}

function getBadgeText(
  skipEnabled,
  hideHome,
  hideSearch,
  hideSubs,
  hideCorr,
  viewsHideHomeEnabled,
  viewsHideSearchEnabled,
  viewsHideSubsEnabled,
  viewsHideCorrEnabled,
  hideShortsEnabled
) {
  const hideCondition =
    hideHome ||
    hideSearch ||
    hideSubs ||
    hideCorr ||
    viewsHideHomeEnabled ||
    viewsHideSearchEnabled ||
    viewsHideSubsEnabled ||
    viewsHideCorrEnabled ||
    hideShortsEnabled;

  if (skipEnabled && hideCondition) return 'A';
  if (skipEnabled) return 'S';
  if (hideCondition) return 'H';
  return 'OFF';
}

function updateBadge(
  skipEnabled,
  hideHome,
  hideSearch,
  hideSubs,
  hideCorr,
  viewsHideHomeEnabled,
  viewsHideSearchEnabled,
  viewsHideSubsEnabled,
  viewsHideCorrEnabled,
  hideShortsEnabled
) {
  const text = getBadgeText(
    skipEnabled,
    hideHome,
    hideSearch,
    hideSubs,
    hideCorr,
    viewsHideHomeEnabled,
    viewsHideSearchEnabled,
    viewsHideSubsEnabled,
    viewsHideCorrEnabled,
    hideShortsEnabled
  );

  const oneIsOn =
    hideHome ||
    hideSearch ||
    hideSubs ||
    hideCorr ||
    viewsHideHomeEnabled ||
    viewsHideSearchEnabled ||
    viewsHideSubsEnabled ||
    viewsHideCorrEnabled ||
    hideShortsEnabled;

  const color = oneIsOn ? '#008000' : '#808080';
  chrome.action.setBadgeText({ text });
  chrome.action.setBadgeBackgroundColor({ color });
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'sync') return;
  if (
    changes.skipEnabled ||
    changes.hideHomeEnabled ||
    changes.hideSubsEnabled ||
    changes.hideCorrEnabled ||
    changes.hideSearchEnabled ||
    changes.viewsHideEnabled ||
    changes.viewsHideHomeEnabled ||
    changes.viewsHideSubsEnabled ||
    changes.viewsHideCorrEnabled ||
    changes.hideShortsEnabled
  ) {
    refreshBadge();
  }
});
