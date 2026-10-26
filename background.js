importScripts('channel-list-sync.js');

const DEV_MODE = false;
const logger = {
  log: (...args) => {
    if (DEV_MODE) console.log(...args);
  },
  warn: (...args) => {
    if (DEV_MODE) console.warn(...args);
  },
  error: (...args) => {
    if (DEV_MODE) console.error(...args);
  },
  info: (...args) => {
    if (DEV_MODE) console.info(...args);
  },
};

const UNINSTALL_SURVEY_URL = 'https://forms.gle/RAcQp2acFGkjfuS86';

const flagKeys = [
  'hideHomeEnabled',
  'hideSearchEnabled',
  'hideSubsEnabled',
  'hideChannelEnabled',
  'hideCorrEnabled',
  'viewsHideHomeEnabled',
  'viewsHideSearchEnabled',
  'viewsHideSubsEnabled',
  'viewsHideChannelEnabled',
  'viewsHideCorrEnabled',
  'hideShortsEnabled',
  'hideShortsSearchEnabled',
  'hideMixesEnabled',
  'hidePlaylistsEnabled',
  'hideLivesEnabled',
  'dateFilterHomeEnabled',
  'dateFilterChannelEnabled',
  'dateFilterSearchEnabled',
  'dateFilterSubsEnabled',
  'dateFilterCorrEnabled',
];

const thresholdFlagKeys = [
  'dateFilterNewerThreshold',
  'dateFilterOlderThreshold',
  'viewsHideMaxThreshold',
];
const defaultSettings = {
  extensionEnabled: true,
  easyModeEnabled: true,
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
  hideInterfaceElements: false,
  tutorialCompleted: false,
  sliderOffMigrationDone: true,
  headerButtonMigrationDone: true,
};
function initializeSettings() {
  chrome.storage.sync.get(null, items => {
    if (chrome.runtime.lastError) {
      logger.log('Storage error:', chrome.runtime.lastError.message);
      return;
    }
    const isFirstInstall = Object.keys(items).length === 0;
    if (isFirstInstall) {
      chrome.storage.sync.set(defaultSettings, () => {
        if (chrome.runtime.lastError) {
          logger.log(
            'Error setting defaults:',
            chrome.runtime.lastError.message,
          );
        } else {
          logger.log('Default settings initialized');
          updateBadge(defaultSettings);
        }
      });
    } else {
      migrateSettings(items);
      refreshBadge();
    }
  });
}

function migrateSettings(currentSettings) {
  const newKeys = {};
  for (const [key, value] of Object.entries(defaultSettings)) {
    if (!(key in currentSettings)) {
      if (key === 'tutorialCompleted') {
        newKeys[key] = true;
      } else {
        newKeys[key] = value;
      }
    }
  }
  if (Object.keys(newKeys).length > 0) {
    chrome.storage.sync.set(newKeys, () => {
      if (!chrome.runtime.lastError) {
        logger.log('Migrated new settings:', Object.keys(newKeys));
      }
    });
  }

  if (!currentSettings.sliderOffMigrationDone) {
    migrateSliderOff(currentSettings);
  }

  if (!currentSettings.headerButtonMigrationDone) {
    migrateHeaderButtonCleanup();
  }
}

function migrateSliderOff(s) {
  const updates = { sliderOffMigrationDone: true };
  const removals = [];

  const watchAllOff =
    !s.hideHomeEnabled &&
    !s.hideChannelEnabled &&
    !s.hideSearchEnabled &&
    !s.hideSubsEnabled &&
    !s.hideCorrEnabled;
  if (watchAllOff) {
    updates.hideThreshold = 0;
  } else if (s.hideThreshold === 0) {
    updates.hideThreshold = 5;
  }

  const viewsAllOff =
    !s.viewsHideHomeEnabled &&
    !s.viewsHideChannelEnabled &&
    !s.viewsHideSearchEnabled &&
    !s.viewsHideSubsEnabled &&
    !s.viewsHideCorrEnabled;
  if (viewsAllOff) {
    updates.viewsHideThreshold = 0;
  }

  if (s.dateFilterNewerEnabled === false) {
    updates.dateFilterNewerThreshold = 0;
  }
  if (s.dateFilterOlderEnabled === false) {
    updates.dateFilterOlderThreshold = 0;
  }

  removals.push('dateFilterNewerEnabled', 'dateFilterOlderEnabled');

  chrome.storage.sync.set(updates, () => {
    if (!chrome.runtime.lastError) {
      logger.log('Slider-off migration applied:', Object.keys(updates));
    }
  });
  if (removals.length > 0) {
    chrome.storage.sync.remove(removals, () => {
      if (!chrome.runtime.lastError) {
        logger.log('Removed deprecated keys:', removals);
      }
    });
  }
}
function migrateHeaderButtonCleanup() {
  chrome.storage.sync.set({ headerButtonMigrationDone: true }, () => {
    if (!chrome.runtime.lastError) {
      logger.log('Header button migration done');
    }
  });
  chrome.storage.sync.remove('floatingButtonEnabled', () => {
    if (!chrome.runtime.lastError) {
      logger.log('Removed deprecated key: floatingButtonEnabled');
    }
  });
  chrome.storage.local.remove('floatingButtonPosition', () => {
    if (!chrome.runtime.lastError) {
      logger.log('Removed deprecated local key: floatingButtonPosition');
    }
  });
}
function reloadOpenYouTubeTabs() {
  try {
    chrome.tabs.query(
      { url: ['https://www.youtube.com/*', 'https://m.youtube.com/*'] },
      tabs => {
        if (chrome.runtime.lastError) {
          logger.log(
            'Could not query YouTube tabs:',
            chrome.runtime.lastError.message,
          );
          return;
        }
        if (!Array.isArray(tabs)) return;
        tabs.forEach(tab => {
          if (typeof tab.id !== 'number') return;
          chrome.tabs.reload(tab.id, {}, () => {
            if (chrome.runtime.lastError) {
              logger.log(
                'Could not reload tab:',
                chrome.runtime.lastError.message,
              );
            }
          });
        });
        logger.log('Reloaded open YouTube tabs:', tabs.length);
      },
    );
  } catch (e) {
    logger.log('Tab reload unavailable:', e);
  }
}
const CHANNEL_LIST_SYNC_DELAY_MS = 500;
const CHANNEL_LIST_RETRY_DELAY_MS = 60000;
const CHANNEL_LIST_INCOMPLETE_HEAL_MS = 10 * 60 * 1000;
let channelListSyncQueue = Promise.resolve();
let channelListPushTimer = null;
let channelListPullTimer = null;

function enqueueChannelListSync(task) {
  channelListSyncQueue = channelListSyncQueue
    .then(task)
    .catch(e => logger.log('Channel list sync failed:', e));
  return channelListSyncQueue;
}

function scheduleChannelListPush(delay = CHANNEL_LIST_SYNC_DELAY_MS) {
  clearTimeout(channelListPushTimer);
  channelListPushTimer = setTimeout(() => {
    enqueueChannelListSync(() => pushChannelLists());
  }, delay);
}

function scheduleChannelListPull() {
  clearTimeout(channelListPullTimer);
  channelListPullTimer = setTimeout(() => {
    reconcileChannelLists();
  }, CHANNEL_LIST_SYNC_DELAY_MS);
}

async function readLocalChannelListState() {
  const local = await chrome.storage.local.get([
    ...CHANNEL_LIST_LOCAL_KEYS,
    CHANNEL_LIST_BASE_KEY,
    CHANNEL_LIST_STATE_KEY,
  ]);
  return {
    lists: normalizeChannelLists({ w: local.channelWhitelist, b: local.channelBlacklist }),
    base: local[CHANNEL_LIST_BASE_KEY] ? normalizeChannelLists(local[CHANNEL_LIST_BASE_KEY]) : null,
    state: local[CHANNEL_LIST_STATE_KEY] || {},
  };
}

function getChannelListLocalUpdates(previous, next) {
  if (channelListsEqual(previous, next)) return {};
  return { channelWhitelist: next.w, channelBlacklist: next.b };
}

function markChannelListIncomplete(state, gen) {
  if (state.incompleteGen === gen) return;
  state.incompleteGen = gen;
  state.incompleteSince = Date.now();
}

async function pullChannelLists() {
  const items = await chrome.storage.sync.get(null);
  const { lists, base, state } = await readLocalChannelListState();
  let nextLists = lists;
  const nextState = { ...state };
  const updates = {};

  const legacy = readLegacyChannelLists(items);
  if (legacy) nextLists = unionChannelLists(nextLists, legacy);

  const payload = readChannelListSyncPayload(items);
  if (payload.status === 'complete' && payload.gen !== state.gen) {
    let remote = null;
    try {
      remote = await decodeChannelLists(payload.encoded);
    } catch (e) {
      logger.log('Could not decode synced channel lists:', e);
    }
    if (remote) {
      const mergeBase = resolveChannelListMergeBase(payload.parent, state.gen, base);
      nextLists = mergeChannelLists(nextLists, mergeBase, remote);
      updates[CHANNEL_LIST_BASE_KEY] = remote;
      nextState.gen = payload.gen;
      nextState.status = channelListsEqual(nextLists, remote) ? 'ok' : 'pending';
      delete nextState.incompleteGen;
      delete nextState.incompleteSince;
    } else {
      markChannelListIncomplete(nextState, payload.gen);
    }
  } else if (
    (payload.status === 'incomplete' || payload.status === 'invalid') &&
    payload.gen !== state.gen
  ) {
    markChannelListIncomplete(nextState, payload.gen);
  }

  Object.assign(updates, getChannelListLocalUpdates(lists, nextLists));
  if (JSON.stringify(nextState) !== JSON.stringify(state)) {
    updates[CHANNEL_LIST_STATE_KEY] = nextState;
  }
  if (Object.keys(updates).length) await chrome.storage.local.set(updates);
  if (legacy) await chrome.storage.sync.remove(CHANNEL_LIST_LOCAL_KEYS);
}

function isChannelListSyncStalled(state, payload) {
  return (
    (payload.status === 'incomplete' || payload.status === 'invalid') &&
    state.incompleteGen === payload.gen &&
    Date.now() - (state.incompleteSince || 0) > CHANNEL_LIST_INCOMPLETE_HEAL_MS
  );
}

async function setChannelListSyncStatus(state, status) {
  if (state.status === status) return;
  await chrome.storage.local.set({ [CHANNEL_LIST_STATE_KEY]: { ...state, status } });
}

async function pushChannelLists() {
  const current = await chrome.storage.sync.get(null);
  const local = await readLocalChannelListState();
  const { base, state } = local;
  let lists = local.lists;

  const legacy = readLegacyChannelLists(current);
  if (legacy) {
    lists = unionChannelLists(lists, legacy);
    const legacyUpdates = getChannelListLocalUpdates(local.lists, lists);
    if (Object.keys(legacyUpdates).length) await chrome.storage.local.set(legacyUpdates);
  }

  const payload = readChannelListSyncPayload(current);
  if (payload.status === 'unsupported') {
    await setChannelListSyncStatus(state, 'outdated');
    return;
  }

  const stalled = isChannelListSyncStalled(state, payload);
  const inSync = !!base && channelListsEqual(lists, base) && state.status === 'ok';
  if (inSync && !stalled && !legacy) return;
  if (!base && !state.gen && !lists.w.length && !lists.b.length && !legacy) return;

  const gen = createChannelListGeneration();
  const newItems = buildChannelListSyncItems(await encodeChannelLists(lists), gen, state.gen || null);
  const plan = planChannelListSyncWrite(current, newItems);

  if (!plan.fits) {
    await setChannelListSyncStatus(state, 'paused');
    logger.log('Channel lists too large to sync:', plan.newBytes, 'bytes');
    return;
  }

  try {
    if (plan.removeFirst && plan.staleKeys.length) {
      await chrome.storage.sync.remove(plan.staleKeys);
    }
    await chrome.storage.sync.set(newItems);
    if (!plan.removeFirst && plan.staleKeys.length) {
      await chrome.storage.sync.remove(plan.staleKeys);
    }
  } catch (e) {
    const message = String((e && e.message) || e);
    const status = /QUOTA_BYTES/.test(message) ? 'paused' : 'error';
    await setChannelListSyncStatus(state, status);
    logger.log('Channel list sync write failed:', message);
    if (status === 'error') scheduleChannelListPush(CHANNEL_LIST_RETRY_DELAY_MS);
    return;
  }

  await chrome.storage.local.set({
    [CHANNEL_LIST_BASE_KEY]: lists,
    [CHANNEL_LIST_STATE_KEY]: { status: 'ok', gen },
  });
  logger.log('Channel lists synced:', plan.newBytes, 'bytes, generation', gen);
}

function reconcileChannelLists() {
  return enqueueChannelListSync(async () => {
    await pullChannelLists();
    await pushChannelLists();
  });
}
function refreshBadge() {
  const defaults = Object.fromEntries(flagKeys.map(key => [key, true]));
  const thresholdDefaults = Object.fromEntries(
    thresholdFlagKeys.map(key => [key, 0]),
  );
  chrome.storage.sync.get(
    {
      ...defaults,
      ...thresholdDefaults,
      extensionEnabled: true,
      hideThreshold: 20,
      viewsHideThreshold: 1000,
      channelBlacklist: [],
      channelBlacklistEnabled: true,
    },
    prefs => {
      if (chrome.runtime.lastError) {
        logger.log('Storage error:', chrome.runtime.lastError.message);
        return;
      }
      if (!prefs) return;
      chrome.storage.local.get('channelBlacklist', local => {
        if (!chrome.runtime.lastError && local && Array.isArray(local.channelBlacklist)) {
          prefs.channelBlacklist = local.channelBlacklist;
        }
        updateBadge(prefs);
      });
    },
  );
}
function isRangeOverlapping(lowerBound, upperBound) {
  const lower = lowerBound || 0;
  const upper = upperBound || 0;
  return lower > 0 && upper > 0 && lower >= upper;
}
function getBadgeText(flags = {}) {
  if (flags.extensionEnabled === false) return 'OFF';

  const hideWatchedActive =
    (flags.hideThreshold || 0) > 0 &&
    ['hideHomeEnabled', 'hideSearchEnabled', 'hideSubsEnabled', 'hideChannelEnabled', 'hideCorrEnabled'].some(k => flags[k]);
  const viewsActive =
    ((flags.viewsHideThreshold || 0) > 0 ||
      (flags.viewsHideMaxThreshold || 0) > 0) &&
    !isRangeOverlapping(flags.viewsHideThreshold, flags.viewsHideMaxThreshold) &&
    ['viewsHideHomeEnabled', 'viewsHideSearchEnabled', 'viewsHideSubsEnabled', 'viewsHideChannelEnabled', 'viewsHideCorrEnabled'].some(k => flags[k]);
  const shortsActive = flags.hideShortsEnabled || flags.hideShortsSearchEnabled;
  const mixesPlaylistsActive = flags.hideMixesEnabled || flags.hidePlaylistsEnabled || flags.hideLivesEnabled;
  const dateOn =
    ((flags.dateFilterNewerThreshold || 0) > 0 ||
      (flags.dateFilterOlderThreshold || 0) > 0) &&
    !isRangeOverlapping(
      flags.dateFilterNewerThreshold,
      flags.dateFilterOlderThreshold,
    );
  const dateActive =
    dateOn &&
    ['dateFilterHomeEnabled', 'dateFilterChannelEnabled', 'dateFilterSearchEnabled', 'dateFilterSubsEnabled', 'dateFilterCorrEnabled'].some(k => flags[k]);
  const blacklistActive =
    !!flags.channelBlacklistEnabled && Array.isArray(flags.channelBlacklist) && flags.channelBlacklist.length > 0;
  if (hideWatchedActive || viewsActive || shortsActive || mixesPlaylistsActive || dateActive || blacklistActive) return '';
  return 'OFF';
}
function updateBadge(flags = {}) {
  const text = getBadgeText(flags);
  const color = text === '' ? '#008000' : '#808080';
  chrome.action.setBadgeText({ text }, () => {
    if (chrome.runtime.lastError) {
      logger.log('Badge text error:', chrome.runtime.lastError.message);
    }
  });
  chrome.action.setBadgeBackgroundColor({ color }, () => {
    if (chrome.runtime.lastError) {
      logger.log('Badge color error:', chrome.runtime.lastError.message);
    }
  });
}
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local') {
    if (CHANNEL_LIST_LOCAL_KEYS.some(key => key in changes)) {
      scheduleChannelListPush();
    }
    if ('channelBlacklist' in changes) refreshBadge();
    return;
  }
  if (area !== 'sync') return;
  if (Object.keys(changes).some(key => isChannelListSyncKey(key))) {
    scheduleChannelListPull();
  }
  const allBadgeKeys = [
    ...flagKeys,
    ...thresholdFlagKeys,
    'extensionEnabled',
    'hideThreshold',
    'viewsHideThreshold',
    'channelBlacklist',
    'channelBlacklistEnabled',
  ];
  if (Object.keys(changes).some(key => allBadgeKeys.includes(key))) {
    refreshBadge();
  }
});
chrome.runtime.onStartup.addListener(() => {
  refreshBadge();
});
chrome.runtime.onInstalled.addListener(details => {
  if (details.reason === chrome.runtime.OnInstalledReason.INSTALL) {
    chrome.runtime.setUninstallURL(UNINSTALL_SURVEY_URL);
    logger.log('Uninstall URL set for new installation');

    chrome.tabs.create({
      url: 'https://youtubehider.com/welcome.html',
      active: true,
    });
    logger.log('Welcome page opened');

    reloadOpenYouTubeTabs();
  }

  if (details.reason === chrome.runtime.OnInstalledReason.UPDATE) {
    chrome.runtime.setUninstallURL(UNINSTALL_SURVEY_URL);
    logger.log('Uninstall URL updated');

    chrome.storage.local.remove('whatsNewVersion');
  }

  initializeSettings();
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'openSettings') {
    chrome.tabs.create({
      url: chrome.runtime.getURL('popup/popup.html?standalone=true'),
      active: true,
    });
    sendResponse({ success: true });
  }
  return false;
});

initializeSettings();
reconcileChannelLists();
