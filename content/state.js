const TIMING = {
  DEBOUNCE_MUTATIONS: 100,
  PAGE_CHANGE_DELAY: 100,
  ELEMENT_POLL_INTERVAL: 50,
};

const prefs = {
  extensionEnabled: true,
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
  hideMixesEnabled: true,
  hidePlaylistsEnabled: true,
  hideLivesEnabled: true,
  dateFilterNewerThreshold: 0,
  dateFilterOlderThreshold: 0,
  dateFilterHomeEnabled: false,
  dateFilterChannelEnabled: false,
  dateFilterSearchEnabled: false,
  dateFilterSubsEnabled: false,
  dateFilterCorrEnabled: false,
  dimMode: false,
  tutorialCompleted: false,
  channelWhitelist: [],
  channelWhitelistEnabled: true,
  channelBlacklist: [],
  channelBlacklistEnabled: true,
  hideInterfaceElements: false,
};

const FILTER_REAPPLY_KEYS = new Set([
  'hideThreshold',
  'hideHomeEnabled',
  'hideChannelEnabled',
  'hideSearchEnabled',
  'hideSubsEnabled',
  'hideCorrEnabled',
  'viewsHideThreshold',
  'viewsHideHomeEnabled',
  'viewsHideChannelEnabled',
  'viewsHideSearchEnabled',
  'viewsHideSubsEnabled',
  'viewsHideCorrEnabled',
  'hideShortsEnabled',
  'hideShortsSearchEnabled',
  'hideMixesEnabled',
  'hidePlaylistsEnabled',
  'hideLivesEnabled',
  'dateFilterNewerThreshold',
  'dateFilterOlderThreshold',
  'dateFilterHomeEnabled',
  'dateFilterChannelEnabled',
  'dateFilterSearchEnabled',
  'dateFilterSubsEnabled',
  'dateFilterCorrEnabled',
  'channelWhitelist',
  'channelWhitelistEnabled',
  'channelBlacklist',
  'channelBlacklistEnabled',
]);

const WHITELIST_REAPPLY_KEYS = new Set(['channelWhitelist', 'channelWhitelistEnabled']);

function isChannelListed(channel) {
  return channelListIncludes(channel, prefs.channelWhitelist);
}

function isChannelExempt(channel) {
  return isChannelListed(channel) && !!prefs.channelWhitelistEnabled;
}

function isChannelPaused(channel) {
  return isChannelListed(channel) && !prefs.channelWhitelistEnabled;
}

function isChannelOnBlacklist(channel) {
  return channelListIncludes(channel, prefs.channelBlacklist);
}

function isChannelBlacklisted(channel) {
  return isChannelOnBlacklist(channel) && !!prefs.channelBlacklistEnabled;
}

const CHANNEL_BLACKLIST_KEYS = { listKey: 'channelBlacklist', enabledKey: 'channelBlacklistEnabled' };
const CHANNEL_WHITELIST_KEYS = { listKey: 'channelWhitelist', enabledKey: 'channelWhitelistEnabled' };

function setChannelWhitelisted(channel, shouldWhitelist) {
  const result = computeWhitelistUpdate(
    channel,
    shouldWhitelist,
    prefs.channelWhitelist,
    prefs.channelWhitelistEnabled,
  );
  if (!result) return null;

  if (result.updates.channelWhitelist) prefs.channelWhitelist = result.list;
  if (result.updates.channelWhitelistEnabled) prefs.channelWhitelistEnabled = true;

  if (shouldWhitelist && result.changedChannels.length) {
    const unblacklist = computeWhitelistUpdate(
      result.changedChannels,
      false,
      prefs.channelBlacklist,
      prefs.channelBlacklistEnabled,
      CHANNEL_BLACKLIST_KEYS,
    );
    if (unblacklist && unblacklist.updates.channelBlacklist) {
      prefs.channelBlacklist = unblacklist.list;
      result.updates.channelBlacklist = unblacklist.list;
    }
  }

  safeStorageSet('sync', result.updates);
  return result;
}

function setChannelBlacklisted(channel, shouldBlacklist) {
  const result = computeWhitelistUpdate(
    channel,
    shouldBlacklist,
    prefs.channelBlacklist,
    prefs.channelBlacklistEnabled,
    CHANNEL_BLACKLIST_KEYS,
  );
  if (!result) return null;

  if (result.updates.channelBlacklist) prefs.channelBlacklist = result.list;
  if (result.updates.channelBlacklistEnabled) prefs.channelBlacklistEnabled = true;

  if (shouldBlacklist && result.changedChannels.length) {
    const unwhitelist = computeWhitelistUpdate(
      result.changedChannels,
      false,
      prefs.channelWhitelist,
      prefs.channelWhitelistEnabled,
    );
    if (unwhitelist && unwhitelist.updates.channelWhitelist) {
      prefs.channelWhitelist = unwhitelist.list;
      result.updates.channelWhitelist = unwhitelist.list;
    }
  }

  safeStorageSet('sync', result.updates);
  return result;
}

function initPrefs() {
  return new Promise(resolve => {
    try {
      chrome.storage.sync.get(Object.keys(prefs), result => {
        Object.assign(prefs, result);
        logger.log('Prefs loaded', prefs);
        resolve();
      });
    } catch (e) {
      logger.warn('Could not load prefs (context invalidated?)', e);
      resolve();
    }
  });
}

function setupPrefsListener() {
  try {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'sync') {
        const changedKeys = Object.keys(changes);
        for (let key in changes) {
          if (prefs.hasOwnProperty(key)) {
            prefs[key] = changes[key].newValue;
            logger.log(`Pref ${key} changed to`, changes[key].newValue);
          }
        }
        if ('extensionEnabled' in changes) {
          if (!prefs.extensionEnabled) {
            resetAppliedFilters(true);
            removeWarning();
            cleanupTour();
            removeTutorialOverlay();
            removeHeaderButton();
            removeInlineWhitelistButton();
            removeInlineBlacklistButton();
            removeBlacklistHoverButton();
          } else {
            ensureHeaderButton();
          }
          startHiding(currentPath);
        }
        if ('dimMode' in changes) {
          resetAppliedFilters();
          startHiding(currentPath);
        }
        if ('hideInterfaceElements' in changes) {
          if (prefs.hideInterfaceElements) {
            cleanupTour();
            removeTutorialOverlay();
            removeHeaderButton();
            removeInlineWhitelistButton();
            removeInlineBlacklistButton();
            removeBlacklistHoverButton();
          } else {
            ensureHeaderButton();
          }
          resetAppliedFilters();
          startHiding(currentPath);
        }

        const reapplyKeysChanged = changedKeys.filter(key => FILTER_REAPPLY_KEYS.has(key));
        const onlyWhitelistKeysChanged =
          reapplyKeysChanged.length > 0 &&
          reapplyKeysChanged.every(key => WHITELIST_REAPPLY_KEYS.has(key));

        const shouldReapplyFilters =
          prefs.extensionEnabled &&
          !('extensionEnabled' in changes) &&
          !('dimMode' in changes) &&
          reapplyKeysChanged.length > 0;

        if (shouldReapplyFilters) {
          if (!onlyWhitelistKeysChanged) {
            resetAppliedFilters();
          }
          startHiding(currentPath);
        }
      }
    });
  } catch (e) {
    logger.warn('Could not bind onChanged (context invalidated?)', e);
  }
}
