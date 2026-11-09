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
  viewsHideMaxThreshold: 0,
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
  titleWhitelist: [],
  titleWhitelistEnabled: true,
  titleBlacklist: [],
  titleBlacklistEnabled: true,
  hideInterfaceElements: false,
  markedWatched: [],
};

const FILTER_REAPPLY_KEYS = new Set([
  'hideThreshold',
  'hideHomeEnabled',
  'hideChannelEnabled',
  'hideSearchEnabled',
  'hideSubsEnabled',
  'hideCorrEnabled',
  'viewsHideThreshold',
  'viewsHideMaxThreshold',
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
  'titleWhitelist',
  'titleWhitelistEnabled',
  'titleBlacklist',
  'titleBlacklistEnabled',
  'markedWatched',
]);

const WHITELIST_REAPPLY_KEYS = new Set([
  'channelWhitelist',
  'channelWhitelistEnabled',
  'titleWhitelist',
  'titleWhitelistEnabled',
]);

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

function isTitleWhitelisted(title) {
  return !!prefs.titleWhitelistEnabled && titleMatchesKeyword(title, prefs.titleWhitelist);
}

function getTitleBlacklistMatch(title) {
  if (!prefs.titleBlacklistEnabled) return null;
  return findTitleKeywordMatch(title, prefs.titleBlacklist);
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

  writeChannelListUpdates(result.updates);
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

  writeChannelListUpdates(result.updates);
  return result;
}

function writeChannelListUpdates(updates) {
  const { local, sync } = splitChannelListUpdates(updates);
  if (Object.keys(local).length) safeStorageSet('local', local);
  if (Object.keys(sync).length) safeStorageSet('sync', sync);
}

let markedWatchedIdSource = null;
let markedWatchedIds = new Set();

function isVideoMarkedWatched(videoId) {
  if (!videoId) return false;
  if (markedWatchedIdSource !== prefs.markedWatched) {
    markedWatchedIdSource = prefs.markedWatched;
    markedWatchedIds = new Set(
      (Array.isArray(prefs.markedWatched) ? prefs.markedWatched : [])
        .filter(entry => Array.isArray(entry))
        .map(entry => entry[0]),
    );
  }
  return markedWatchedIds.has(videoId);
}

function hasMarkedWatchedVideos() {
  return Array.isArray(prefs.markedWatched) && prefs.markedWatched.length > 0;
}

let markedWatchedMetaQueue = Promise.resolve();

function runMarkedWatchedMetaUpdate(mutate, done) {
  try {
    chrome.storage.local.get(MARKED_WATCHED_META_KEY, result => {
      try {
        if (chrome.runtime.lastError) return done();
        const meta = pruneMarkedWatchedMeta(result && result[MARKED_WATCHED_META_KEY], prefs.markedWatched);
        if (!mutate(meta)) return done();
        chrome.storage.local.set({ [MARKED_WATCHED_META_KEY]: meta }, () => {
          if (chrome.runtime.lastError) {
            logger.warn('Storage set failed:', chrome.runtime.lastError.message);
          }
          done();
        });
      } catch (e) {
        logger.warn('Could not update marked watched metadata (context invalidated?)', e);
        done();
      }
    });
  } catch (e) {
    logger.warn('Could not update marked watched metadata (context invalidated?)', e);
    done();
  }
}

function updateMarkedWatchedMeta(mutate) {
  markedWatchedMetaQueue = markedWatchedMetaQueue.then(
    () => new Promise(resolve => runMarkedWatchedMetaUpdate(mutate, resolve)),
  );
}

function setVideoMarkedWatched(videoId, shouldMark, details) {
  const next = computeMarkedWatchedUpdate(prefs.markedWatched, videoId, shouldMark);
  if (!next) return false;
  prefs.markedWatched = next;
  safeStorageSet('local', { [MARKED_WATCHED_KEY]: next });
  updateMarkedWatchedMeta(meta => {
    if (shouldMark && details) {
      meta[videoId] = normalizeMarkedWatchedMetaEntry(details.title, details.channel);
    }
    return true;
  });
  return true;
}

let pendingMarkedWatchedMeta = new Map();
const markedWatchedMetaChecked = new Set();

const flushMarkedWatchedMetaBackfill = debounce(() => {
  const pending = pendingMarkedWatchedMeta;
  pendingMarkedWatchedMeta = new Map();
  updateMarkedWatchedMeta(meta => {
    let changed = false;
    pending.forEach((details, videoId) => {
      if (meta[videoId] && meta[videoId][0]) return;
      if (!isVideoMarkedWatched(videoId) || !details.title) return;
      meta[videoId] = normalizeMarkedWatchedMetaEntry(details.title, details.channel);
      changed = true;
    });
    return changed;
  });
}, 2000);

function queueMarkedWatchedMetaBackfill(videoId, details) {
  if (markedWatchedMetaChecked.has(videoId)) return;
  markedWatchedMetaChecked.add(videoId);
  pendingMarkedWatchedMeta.set(videoId, details);
  flushMarkedWatchedMetaBackfill();
}

function initPrefs() {
  return new Promise(resolve => {
    try {
      chrome.storage.sync.get(Object.keys(prefs), syncResult => {
        chrome.storage.local.get(LOCAL_PREF_KEYS, localResult => {
          Object.assign(prefs, syncResult, chrome.runtime.lastError ? {} : localResult);
          logger.log('Prefs loaded', prefs);
          resolve();
        });
      });
    } catch (e) {
      logger.warn('Could not load prefs (context invalidated?)', e);
      resolve();
    }
  });
}

function setupPrefsListener() {
  try {
    chrome.storage.onChanged.addListener((areaChanges, area) => {
      const changes = pickStorageChanges(areaChanges, area);
      if (changes) {
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
        if (
          'tutorialCompleted' in changes &&
          prefs.tutorialCompleted &&
          !tutorialActive
        ) {
          cleanupTour();
          removeTutorialOverlay();
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
