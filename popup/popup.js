const PAGE_KEYS = ['home', 'subs', 'search', 'channel', 'corr'];

const PAGE_LABEL_KEYS = {
  home: 'pageHome',
  subs: 'pageSubs',
  search: 'pageSearch',
  channel: 'pageChannel',
  corr: 'pageRelated',
};

const FILTER_PAGE_KEYS = {
  hide: {
    home: 'hideHomeEnabled',
    subs: 'hideSubsEnabled',
    search: 'hideSearchEnabled',
    channel: 'hideChannelEnabled',
    corr: 'hideCorrEnabled',
  },
  views: {
    home: 'viewsHideHomeEnabled',
    subs: 'viewsHideSubsEnabled',
    search: 'viewsHideSearchEnabled',
    channel: 'viewsHideChannelEnabled',
    corr: 'viewsHideCorrEnabled',
  },
  date: {
    home: 'dateFilterHomeEnabled',
    subs: 'dateFilterSubsEnabled',
    search: 'dateFilterSearchEnabled',
    channel: 'dateFilterChannelEnabled',
    corr: 'dateFilterCorrEnabled',
  },
};

const FILTER_THRESHOLD_KEYS = {
  hide: ['hideThreshold'],
  views: ['viewsHideThreshold', 'viewsHideMaxThreshold'],
  date: ['dateFilterNewerThreshold', 'dateFilterOlderThreshold'],
};

const FILTER_ON_DEFAULTS = {
  hide: { hideThreshold: 20 },
  views: { viewsHideThreshold: 1000, viewsHideMaxThreshold: 0 },
  date: { dateFilterNewerThreshold: 0, dateFilterOlderThreshold: 365 },
};

const LAST_VALUE_SUFFIX = 'Last';

const SYNC_DEFAULTS = {
  extensionEnabled: true,
  dimMode: false,
  hideThreshold: 20,
  hideHomeEnabled: true,
  hideSubsEnabled: true,
  hideSearchEnabled: true,
  hideChannelEnabled: true,
  hideCorrEnabled: true,
  hideWatchedKeepMusic: false,
  viewsHideThreshold: 1000,
  viewsHideMaxThreshold: 0,
  viewsHideHomeEnabled: true,
  viewsHideSubsEnabled: true,
  viewsHideSearchEnabled: true,
  viewsHideChannelEnabled: true,
  viewsHideCorrEnabled: true,
  hideShortsEnabled: true,
  hideShortsSearchEnabled: true,
  hideMixesEnabled: true,
  hidePlaylistsEnabled: true,
  hideLivesEnabled: true,
  dateFilterNewerThreshold: 0,
  dateFilterOlderThreshold: 0,
  dateFilterHomeEnabled: false,
  dateFilterSubsEnabled: false,
  dateFilterSearchEnabled: false,
  dateFilterChannelEnabled: false,
  dateFilterCorrEnabled: false,
  channelWhitelistEnabled: true,
  channelBlacklistEnabled: true,
  titleWhitelistEnabled: true,
  titleBlacklistEnabled: true,
  hideInterfaceElements: false,
};

const LAST_VALUE_KEYS = Object.values(FILTER_THRESHOLD_KEYS)
  .flat()
  .map(key => key + LAST_VALUE_SUFFIX);

const FORMAT_TOGGLES = {
  'hide-shorts-enabled': 'hideShortsEnabled',
  'hide-shorts-search-enabled': 'hideShortsSearchEnabled',
  'hide-mixes-enabled': 'hideMixesEnabled',
  'hide-playlists-enabled': 'hidePlaylistsEnabled',
  'hide-lives-enabled': 'hideLivesEnabled',
};

const LIST_TOGGLES = {
  'channel-whitelist-enabled': 'channelWhitelistEnabled',
  'channel-blacklist-enabled': 'channelBlacklistEnabled',
  'title-whitelist-enabled': 'titleWhitelistEnabled',
  'title-blacklist-enabled': 'titleBlacklistEnabled',
};

const WHITELIST_KEYS = { listKey: 'channelWhitelist', enabledKey: 'channelWhitelistEnabled' };
const BLACKLIST_KEYS = { listKey: 'channelBlacklist', enabledKey: 'channelBlacklistEnabled' };
const CHANNEL_LIST_SYNC_STATE_KEY = 'channelListsSyncState';
const MARKED_WATCHED_SYNC_STATE_KEY = 'markedWatchedSyncState';
const PLACEHOLDER_MARK = '\u0000';

const CONTEXT_ICONS = {
  home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>',
  subs: '<rect width="18" height="14" x="3" y="6" rx="2"/><path d="M7 3h10M10 10.5v5l4-2.5z"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  channel: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  watch: '<rect width="20" height="14" x="2" y="5" rx="2"/><path d="m10 9 5 3-5 3z"/>',
  other: '<circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01"/>',
};

const SHIELD_ICON =
  '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 13c0 5-3.5 7.5-7.7 9a1 1 0 0 1-.7 0C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.2-2.7a1.2 1.2 0 0 1 1.5 0C14.5 3.8 17 5 19 5a1 1 0 0 1 1 1z"/></svg>';

function fillWithEmphasis(element, text, emphasis, tagName) {
  element.textContent = '';
  const parts = text.split(PLACEHOLDER_MARK);
  parts.forEach((part, index) => {
    if (part) element.appendChild(document.createTextNode(part));
    if (index < parts.length - 1) {
      const strong = document.createElement(tagName || 'strong');
      strong.textContent = emphasis;
      element.appendChild(strong);
    }
  });
}

function getStoredArray(value) {
  return Array.isArray(value) ? value : [];
}

document.addEventListener('DOMContentLoaded', () => {
  applyDocumentI18n(document);

  const isStandalone = new URLSearchParams(window.location.search).get('standalone') === 'true';
  if (isStandalone) document.body.classList.add('standalone-page');
  if (isStandalone || window.top !== window) document.body.classList.add('fills-viewport');

  const $ = id => document.getElementById(id);

  const state = Object.assign({}, SYNC_DEFAULTS);
  const lists = { channelWhitelist: [], channelBlacklist: [], titleWhitelist: [], titleBlacklist: [], markedWatched: [] };
  const syncStatus = { lists: null, marked: null };
  let pageContext = null;
  let activeTabId = null;

  const extensionToggle = $('extension-enabled');
  const supportButton = $('support-button');

  function storeSync(updates) {
    Object.assign(state, updates);
    chrome.storage.sync.set(updates, () => {
      void chrome.runtime.lastError;
      updateToolbarBadge();
      scheduleContextRefresh();
    });
  }

  function storeListUpdates(updates) {
    Object.keys(updates).forEach(key => {
      if (key in lists) lists[key] = updates[key];
      else state[key] = updates[key];
    });
    const { local, sync } = splitChannelListUpdates(updates);
    if (Object.keys(local).length) chrome.storage.local.set(local);
    if (Object.keys(sync).length) chrome.storage.sync.set(sync, () => void chrome.runtime.lastError);
    scheduleContextRefresh();
  }

  function pagesEnabledCount(filter) {
    return PAGE_KEYS.filter(page => state[FILTER_PAGE_KEYS[filter][page]]).length;
  }

  function isFilterOn(filter) {
    return FILTER_THRESHOLD_KEYS[filter].some(key => (state[key] || 0) > 0);
  }

  function isFilterOverlapping(filter) {
    if (filter === 'views') return isRangeOverlapping(state.viewsHideThreshold, state.viewsHideMaxThreshold);
    if (filter === 'date') return isRangeOverlapping(state.dateFilterNewerThreshold, state.dateFilterOlderThreshold);
    return false;
  }

  function isFilterEffective(filter) {
    return isFilterOn(filter) && !isFilterOverlapping(filter) && pagesEnabledCount(filter) > 0;
  }

  function updateToolbarBadge() {
    const active =
      state.extensionEnabled &&
      (isFilterEffective('hide') ||
        isFilterEffective('views') ||
        isFilterEffective('date') ||
        Object.values(FORMAT_TOGGLES).some(key => state[key]));
    chrome.action.setBadgeText({ text: getBadgeText(active) });
    chrome.action.setBadgeBackgroundColor({ color: active ? '#008000' : '#808080' });
  }

  function enableAllPagesIfNone(filter, updates) {
    if (pagesEnabledCount(filter) > 0) return;
    PAGE_KEYS.forEach(page => {
      updates[FILTER_PAGE_KEYS[filter][page]] = true;
    });
  }

  function setFilterOn(filter, on) {
    const updates = {};
    const keys = FILTER_THRESHOLD_KEYS[filter];
    if (on) {
      keys.forEach(key => {
        const last = state[key + LAST_VALUE_SUFFIX];
        updates[key] = typeof last === 'number' ? last : 0;
      });
      if (keys.every(key => !updates[key])) Object.assign(updates, FILTER_ON_DEFAULTS[filter]);
      enableAllPagesIfNone(filter, updates);
    } else {
      keys.forEach(key => {
        updates[key + LAST_VALUE_SUFFIX] = state[key] || 0;
        updates[key] = 0;
      });
    }
    storeSync(updates);
    renderFilter(filter);
  }

  function storeThresholds(filter, values) {
    const updates = Object.assign({}, values);
    if (Object.values(values).some(value => value > 0)) enableAllPagesIfNone(filter, updates);
    storeSync(updates);
    renderFilter(filter);
  }

  function displayedThreshold(key, filter) {
    if (isFilterOn(filter)) return state[key] || 0;
    const last = state[key + LAST_VALUE_SUFFIX];
    if (typeof last === 'number' && FILTER_THRESHOLD_KEYS[filter].some(k => (state[k + LAST_VALUE_SUFFIX] || 0) > 0)) {
      return last;
    }
    return FILTER_ON_DEFAULTS[filter][key] || 0;
  }

  const sliders = {
    hide: $('perc-hide'),
    viewsMin: $('views-hide'),
    viewsMax: $('views-hide-max'),
    dateNewer: $('date-filter-newer'),
    dateOlder: $('date-filter-older'),
  };

  function setSliderFill(slider) {
    const min = Number(slider.min) || 0;
    const max = Number(slider.max) || 100;
    const percent = ((Number(slider.value) - min) / (max - min)) * 100;
    slider.style.background = `linear-gradient(90deg, var(--accent-blue) 0 ${percent}%, var(--toggle-inactive) ${percent}% 100%)`;
  }

  function setOutput(output, text, isOff) {
    output.textContent = text;
    output.classList.toggle('is-off', !!isOff);
  }

  function formatPercent(value) {
    return formatLocaleNumber(value / 100, { style: 'percent' });
  }

  function pagesSummary(filter) {
    const count = pagesEnabledCount(filter);
    if (count === PAGE_KEYS.length) return getText('summaryAllPages');
    return getText('summaryPages', [formatLocaleNumber(count), formatLocaleNumber(PAGE_KEYS.length)]);
  }

  function describeFilterValue(filter) {
    if (filter === 'hide') return getText('summaryWatched', formatPercent(state.hideThreshold));
    if (filter === 'views') {
      const min = state.viewsHideThreshold || 0;
      const max = state.viewsHideMaxThreshold || 0;
      if (min && max) return getText('summaryViewsBetween', [formatViews(min), formatViews(max)]);
      if (min) return getText('summaryViewsUnder', formatViews(min));
      return getText('summaryViewsOver', formatViews(max));
    }
    const newer = state.dateFilterNewerThreshold || 0;
    const older = state.dateFilterOlderThreshold || 0;
    const newerLabel = dateNewerStepLabels[findClosestDateNewerIndex(newer)];
    const olderLabel = dateStepLabels[findClosestDateIndex(older)];
    if (newer && older) return getText('summaryDateWindow', [newerLabel, olderLabel]);
    if (newer) return getText('summaryDateNewer', newerLabel);
    return getText('summaryDateOlder', olderLabel);
  }

  function renderSummary(filter, element) {
    let text;
    let warning = false;
    if (!isFilterOn(filter)) {
      text = getText('sliderOff');
    } else if (isFilterOverlapping(filter)) {
      text = getText('summaryOverlap');
      warning = true;
    } else if (!pagesEnabledCount(filter)) {
      text = getText('summaryNoPages');
      warning = true;
    } else {
      text = describeFilterValue(filter) + ' · ' + pagesSummary(filter);
    }
    element.textContent = text;
    element.classList.toggle('is-warning', warning);
  }

  const filterCards = {
    hide: { card: $('filter-watched'), toggle: $('watched-enabled'), summary: $('watched-summary') },
    views: { card: $('filter-views'), toggle: $('views-enabled'), summary: $('views-summary') },
    date: { card: $('filter-date'), toggle: $('date-enabled'), summary: $('date-summary') },
  };

  const chipInputs = { hide: {}, views: {}, date: {} };

  function renderChips(filter) {
    const inputs = chipInputs[filter];
    PAGE_KEYS.forEach(page => {
      if (inputs[page]) inputs[page].checked = !!state[FILTER_PAGE_KEYS[filter][page]];
    });
    if (inputs.all) inputs.all.checked = pagesEnabledCount(filter) === PAGE_KEYS.length;
  }

  function renderSliders(filter) {
    if (filter === 'hide') {
      const value = displayedThreshold('hideThreshold', 'hide') || FILTER_ON_DEFAULTS.hide.hideThreshold;
      sliders.hide.value = value;
      setOutput($('perc-hide-value'), formatPercent(value));
      setSliderFill(sliders.hide);
      return;
    }
    if (filter === 'views') {
      const minIndex = findClosestViewsIndex(displayedThreshold('viewsHideThreshold', 'views'));
      const maxIndex = findClosestViewsMaxIndex(displayedThreshold('viewsHideMaxThreshold', 'views'));
      sliders.viewsMin.value = minIndex;
      sliders.viewsMax.value = maxIndex;
      setOutput($('views-hide-value'), minIndex ? formatViews(viewsSteps[minIndex]) : getText('sliderOff'), !minIndex);
      setOutput($('views-hide-max-value'), maxIndex ? formatViews(viewsMaxSteps[maxIndex]) : getText('sliderOff'), !maxIndex);
      setSliderFill(sliders.viewsMin);
      setSliderFill(sliders.viewsMax);
      return;
    }
    const newerIndex = findClosestDateNewerIndex(displayedThreshold('dateFilterNewerThreshold', 'date'));
    const olderIndex = findClosestDateIndex(displayedThreshold('dateFilterOlderThreshold', 'date'));
    sliders.dateNewer.value = newerIndex;
    sliders.dateOlder.value = olderIndex;
    setOutput($('date-filter-newer-value'), dateNewerStepLabels[newerIndex], !newerIndex);
    setOutput($('date-filter-older-value'), dateStepLabels[olderIndex], !olderIndex);
    setSliderFill(sliders.dateNewer);
    setSliderFill(sliders.dateOlder);
  }

  function renderOverlap(filter) {
    if (filter === 'hide') return;
    const overlapping = isFilterOn(filter) && isFilterOverlapping(filter);
    const prefix = filter === 'views' ? 'views' : 'date';
    $(prefix + '-overlap-warning').hidden = !overlapping;
    $(prefix + '-filter-group')
      .querySelectorAll('.range-sub-filter')
      .forEach(box => box.classList.toggle('range-overlap', overlapping));
  }

  function renderFilter(filter) {
    const { card, toggle, summary } = filterCards[filter];
    toggle.checked = isFilterOn(filter);
    card.classList.toggle('is-active', isFilterEffective(filter));
    renderSummary(filter, summary);
    renderSliders(filter);
    renderChips(filter);
    renderOverlap(filter);
    if (filter === 'hide') $('hide-watched-keep-music').checked = !!state.hideWatchedKeepMusic;
  }

  $('views-overlap-text').textContent = getText('viewsOverlapWarning', [getText('viewsMaxLabel'), getText('viewsMinLabel')]);
  $('date-overlap-text').textContent = getText('dateOverlapWarning', [getText('dateOlderLabel'), getText('dateNewerLabel')]);

  const chipTemplate = $('chip-template');

  function createChip(labelKey, onChange) {
    const chip = chipTemplate.content.firstElementChild.cloneNode(true);
    chip.querySelector('.chip-label').textContent = getText(labelKey);
    const input = chip.querySelector('input');
    input.addEventListener('change', () => onChange(input.checked));
    return { chip, input };
  }

  document.querySelectorAll('[data-chip-group]').forEach(grid => {
    const filter = grid.dataset.chipGroup;
    const all = createChip('chipAllPages', checked => {
      const updates = {};
      PAGE_KEYS.forEach(page => {
        updates[FILTER_PAGE_KEYS[filter][page]] = checked;
      });
      storeSync(updates);
      renderFilter(filter);
    });
    chipInputs[filter].all = all.input;
    grid.appendChild(all.chip);
    PAGE_KEYS.forEach(page => {
      const item = createChip(PAGE_LABEL_KEYS[page], checked => {
        storeSync({ [FILTER_PAGE_KEYS[filter][page]]: checked });
        renderFilter(filter);
      });
      chipInputs[filter][page] = item.input;
      grid.appendChild(item.chip);
    });
  });

  Object.entries(filterCards).forEach(([filter, { card, toggle }]) => {
    toggle.addEventListener('change', () => setFilterOn(filter, toggle.checked));
    const button = card.querySelector('.filter-toggle');
    button.addEventListener('click', () => {
      const opening = button.getAttribute('aria-expanded') !== 'true';
      Object.values(filterCards).forEach(entry => {
        const otherButton = entry.card.querySelector('.filter-toggle');
        const isTarget = entry.card === card;
        const open = isTarget && opening;
        otherButton.setAttribute('aria-expanded', String(open));
        entry.card.classList.toggle('is-open', open);
        $(otherButton.getAttribute('aria-controls')).hidden = !open;
      });
    });
  });

  sliders.hide.addEventListener('input', () => {
    setOutput($('perc-hide-value'), formatPercent(Number(sliders.hide.value)));
    setSliderFill(sliders.hide);
  });
  sliders.hide.addEventListener('change', () => storeThresholds('hide', { hideThreshold: Number(sliders.hide.value) }));

  function storeViewsSliders() {
    storeThresholds('views', {
      viewsHideThreshold: viewsSteps[Number(sliders.viewsMin.value)],
      viewsHideMaxThreshold: viewsMaxSteps[Number(sliders.viewsMax.value)],
    });
  }

  function storeDateSliders() {
    storeThresholds('date', {
      dateFilterNewerThreshold: dateNewerSteps[Number(sliders.dateNewer.value)],
      dateFilterOlderThreshold: dateSteps[Number(sliders.dateOlder.value)],
    });
  }

  sliders.viewsMin.addEventListener('input', () => {
    const index = Number(sliders.viewsMin.value);
    setOutput($('views-hide-value'), index ? formatViews(viewsSteps[index]) : getText('sliderOff'), !index);
    setSliderFill(sliders.viewsMin);
  });
  sliders.viewsMin.addEventListener('change', storeViewsSliders);

  sliders.viewsMax.addEventListener('input', () => {
    const index = Number(sliders.viewsMax.value);
    setOutput($('views-hide-max-value'), index ? formatViews(viewsMaxSteps[index]) : getText('sliderOff'), !index);
    setSliderFill(sliders.viewsMax);
  });
  sliders.viewsMax.addEventListener('change', storeViewsSliders);

  sliders.dateNewer.addEventListener('input', () => {
    const index = Number(sliders.dateNewer.value);
    setOutput($('date-filter-newer-value'), dateNewerStepLabels[index], !index);
    setSliderFill(sliders.dateNewer);
  });
  sliders.dateNewer.addEventListener('change', storeDateSliders);

  sliders.dateOlder.addEventListener('input', () => {
    const index = Number(sliders.dateOlder.value);
    setOutput($('date-filter-older-value'), dateStepLabels[index], !index);
    setSliderFill(sliders.dateOlder);
  });
  sliders.dateOlder.addEventListener('change', storeDateSliders);

  $('hide-watched-keep-music').addEventListener('change', event => {
    storeSync({ hideWatchedKeepMusic: event.target.checked });
  });

  function renderFormats() {
    Object.entries(FORMAT_TOGGLES).forEach(([id, key]) => {
      $(id).checked = !!state[key];
    });
    $('hide-shorts-search-enabled').disabled = !state.hideShortsEnabled;
    $('hide-shorts-search-enabled').closest('.format-item').classList.toggle('is-disabled', !state.hideShortsEnabled);
  }

  Object.entries(FORMAT_TOGGLES).forEach(([id, key]) => {
    $(id).addEventListener('change', event => {
      storeSync({ [key]: event.target.checked });
      renderFormats();
    });
  });

  const modeHide = $('filter-mode-hide');
  const modeDim = $('filter-mode-dim');

  function renderFilterMode() {
    const dim = !!state.dimMode;
    modeHide.setAttribute('aria-checked', String(!dim));
    modeDim.setAttribute('aria-checked', String(dim));
    modeHide.tabIndex = dim ? -1 : 0;
    modeDim.tabIndex = dim ? 0 : -1;
  }

  function setDimMode(dim) {
    storeSync({ dimMode: dim });
    renderFilterMode();
  }

  modeHide.addEventListener('click', () => setDimMode(false));
  modeDim.addEventListener('click', () => setDimMode(true));
  [modeHide, modeDim].forEach(button => {
    button.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
      event.preventDefault();
      const dim = !state.dimMode;
      setDimMode(dim);
      (dim ? modeDim : modeHide).focus();
    });
  });

  function renderExtensionState() {
    const on = !!state.extensionEnabled;
    extensionToggle.checked = on;
    document.body.classList.toggle('is-off', !on);
    $('extension-state').textContent = getText(on ? 'stateOn' : 'stateOff');
    $('off-banner').hidden = on;
    $('off-note').hidden = on;
    $('context-bar').hidden = !on;
  }

  extensionToggle.addEventListener('change', () => {
    storeSync({ extensionEnabled: extensionToggle.checked });
    renderExtensionState();
  });

  $('turn-on-button').addEventListener('click', () => {
    storeSync({ extensionEnabled: true });
    renderExtensionState();
    extensionToggle.focus();
  });

  const tabs = Array.from(document.querySelectorAll('.tab'));

  function selectTab(tab, focus) {
    tabs.forEach(other => {
      const selected = other === tab;
      other.setAttribute('aria-selected', String(selected));
      other.tabIndex = selected ? 0 : -1;
      $(other.getAttribute('aria-controls')).hidden = !selected;
    });
    $('panel-main').scrollTop = 0;
    if (focus) tab.focus();
  }

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => selectTab(tab));
    tab.addEventListener('keydown', event => {
      let next = null;
      if (event.key === 'ArrowRight') next = tabs[(index + 1) % tabs.length];
      else if (event.key === 'ArrowLeft') next = tabs[(index - 1 + tabs.length) % tabs.length];
      else if (event.key === 'Home') next = tabs[0];
      else if (event.key === 'End') next = tabs[tabs.length - 1];
      if (!next) return;
      event.preventDefault();
      selectTab(next, true);
    });
  });

  function renderContext() {
    const where = $('context-where');
    const count = $('context-count');
    const icon = $('context-icon');
    count.textContent = '';
    if (!pageContext) {
      icon.innerHTML = CONTEXT_ICONS.other;
      where.textContent = getText('contextNotYouTube');
      return;
    }
    const kind = pageContext.page;
    icon.innerHTML = CONTEXT_ICONS[kind] || CONTEXT_ICONS.other;
    if (kind === 'other') {
      where.textContent = getText('contextOtherPage');
      return;
    }
    let pageName;
    if (kind === 'channel') {
      const channel = Array.isArray(pageContext.channel) ? pageContext.channel[0] : pageContext.channel;
      pageName = channel ? formatChannelForDisplay(channel) : getText('contextPageChannel');
    } else {
      pageName = getText({ home: 'contextPageHome', subs: 'contextPageSubs', search: 'contextPageSearch', watch: 'contextPageVideo' }[kind]);
    }
    fillWithEmphasis(where, getText('contextYouAreOn', PLACEHOLDER_MARK), pageName);
    const active = pageContext.activeFilters || 0;
    const formatted = formatLocaleNumber(active);
    if (!active) count.textContent = getText('contextNoFiltersHere');
    else if (kind === 'watch') count.textContent = getPluralText('contextFiltersSidebar', active, formatted);
    else count.textContent = getPluralText('contextFiltersHere', active, formatted);
  }

  let contextRefreshTimer = null;

  function requestContext() {
    if (activeTabId === null) {
      renderContext();
      renderChannelCard();
      return;
    }
    chrome.tabs.sendMessage(activeTabId, { type: 'GET_PAGE_CONTEXT' }, response => {
      if (chrome.runtime.lastError || !response) pageContext = null;
      else pageContext = response;
      renderContext();
      renderChannelCard();
    });
  }

  function scheduleContextRefresh() {
    clearTimeout(contextRefreshTimer);
    contextRefreshTimer = setTimeout(requestContext, 200);
  }

  chrome.tabs.query({ active: true, currentWindow: true }, result => {
    const tab = result && result[0];
    activeTabId = tab && typeof tab.id === 'number' && tab.id >= 0 ? tab.id : null;
    requestContext();
  });

  function currentChannels() {
    if (!pageContext || !pageContext.channel) return [];
    return (Array.isArray(pageContext.channel) ? pageContext.channel : [pageContext.channel]).filter(Boolean);
  }

  function channelStatus(channel) {
    if (lists.channelWhitelist.includes(channel)) return 'white';
    if (lists.channelBlacklist.includes(channel)) return 'black';
    return 'none';
  }

  function addChannelTo(channel, target) {
    const toWhite = target === 'white';
    const keys = toWhite ? WHITELIST_KEYS : BLACKLIST_KEYS;
    const otherKeys = toWhite ? BLACKLIST_KEYS : WHITELIST_KEYS;
    const result = computeWhitelistUpdate(channel, true, lists[keys.listKey], state[keys.enabledKey], keys);
    if (!result) return;
    const updates = Object.assign({}, result.updates);
    const strip = computeWhitelistUpdate(
      result.changedChannels.length ? result.changedChannels : channel,
      false,
      lists[otherKeys.listKey],
      state[otherKeys.enabledKey],
      otherKeys,
    );
    if (strip && strip.updates[otherKeys.listKey]) updates[otherKeys.listKey] = strip.updates[otherKeys.listKey];
    storeListUpdates(updates);
    renderLists();
  }

  function removeChannelFrom(channel, target) {
    const keys = target === 'white' ? WHITELIST_KEYS : BLACKLIST_KEYS;
    const result = computeWhitelistUpdate(channel, false, lists[keys.listKey], state[keys.enabledKey], keys);
    if (!result) return;
    storeListUpdates(result.updates);
    renderLists();
  }

  function makeButton(className, text, onClick, ariaLabel) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = className;
    button.textContent = text;
    if (ariaLabel) button.setAttribute('aria-label', ariaLabel);
    button.addEventListener('click', onClick);
    return button;
  }

  function buildStatus(status) {
    const line = document.createElement('span');
    line.className = 'channel-status';
    if (status !== 'none') {
      line.classList.add(status === 'white' ? 'is-white' : 'is-black');
      const dot = document.createElement('span');
      dot.className = 'status-dot';
      dot.setAttribute('aria-hidden', 'true');
      line.appendChild(dot);
    }
    const listEnabled = status === 'white' ? state.channelWhitelistEnabled : state.channelBlacklistEnabled;
    let key = 'statusNotInList';
    if (status === 'white') key = listEnabled ? 'statusInWhitelist' : 'statusInWhitelistPaused';
    if (status === 'black') key = listEnabled ? 'statusInBlacklist' : 'statusInBlacklistPaused';
    line.appendChild(document.createTextNode(getText(key)));
    return line;
  }

  function buildNameBlock(channel, status, withEyebrow) {
    const block = document.createElement('span');
    block.className = 'channel-name-block';
    if (withEyebrow) {
      const eyebrow = document.createElement('span');
      eyebrow.className = 'eyebrow';
      eyebrow.textContent = getText('channelCardLabel');
      block.appendChild(eyebrow);
    }
    const name = document.createElement('span');
    name.className = 'channel-name';
    name.textContent = formatChannelForDisplay(channel);
    block.appendChild(name);
    if (!withEyebrow) block.appendChild(buildStatus(status));
    return block;
  }

  function channelActions(channel, status, compact) {
    const name = formatChannelForDisplay(channel);
    const whiteTitle = getText('channelWhitelistTitle');
    const blackTitle = getText('channelBlacklistTitle');
    const whiteText = getText(compact ? 'buttonWhitelist' : 'actionWhitelistChannel');
    const blackText = getText(compact ? 'buttonBlacklist' : 'actionBlacklistChannel');
    if (status === 'white') {
      return [
        makeButton('btn-quiet btn-list', getText('actionRemove'), () => removeChannelFrom(channel, 'white'), getText('actionRemoveFromList', [name, whiteTitle])),
        makeButton('btn-black btn-list', blackText, () => addChannelTo(channel, 'black'), getText('actionMoveToList', [name, blackTitle])),
      ];
    }
    if (status === 'black') {
      return [
        makeButton('btn-white btn-list', whiteText, () => addChannelTo(channel, 'white'), getText('actionMoveToList', [name, whiteTitle])),
        makeButton('btn-quiet btn-list', getText('actionRemove'), () => removeChannelFrom(channel, 'black'), getText('actionRemoveFromList', [name, blackTitle])),
      ];
    }
    return [
      makeButton('btn-white btn-list', whiteText, () => addChannelTo(channel, 'white'), getText('actionWhitelistNamed', name)),
      makeButton('btn-black btn-list', blackText, () => addChannelTo(channel, 'black'), getText('actionBlacklistNamed', name)),
    ];
  }

  function renderChannelCard() {
    const card = $('channel-card');
    card.textContent = '';
    card.classList.remove('is-empty', 'is-multi');
    const channels = currentChannels();
    if (!channels.length) {
      card.classList.add('is-empty');
      card.insertAdjacentHTML('afterbegin', SHIELD_ICON);
      const text = document.createElement('span');
      text.textContent = getText('channelCardEmpty');
      card.appendChild(text);
      return;
    }
    if (channels.length === 1) {
      const channel = channels[0];
      const status = channelStatus(channel);
      const head = document.createElement('div');
      head.className = 'channel-head';
      head.appendChild(buildNameBlock(channel, status, true));
      head.appendChild(buildStatus(status));
      const actions = document.createElement('div');
      actions.className = 'channel-actions';
      channelActions(channel, status, false).forEach(button => actions.appendChild(button));
      card.appendChild(head);
      card.appendChild(actions);
      return;
    }
    card.classList.add('is-multi');
    const title = document.createElement('h2');
    title.className = 'eyebrow';
    title.textContent = getPluralText('channelsOnVideo', channels.length, formatLocaleNumber(channels.length));
    card.appendChild(title);
    channels.forEach(channel => {
      const status = channelStatus(channel);
      const line = document.createElement('div');
      line.className = 'channel-line';
      line.appendChild(buildNameBlock(channel, status, false));
      const actions = document.createElement('span');
      actions.className = 'channel-line-actions';
      channelActions(channel, status, true).forEach(button => actions.appendChild(button));
      line.appendChild(actions);
      card.appendChild(line);
    });
  }

  const LIST_ROWS = {
    'channel-whitelist': { listKey: 'channelWhitelist', enabledKey: 'channelWhitelistEnabled', countKey: 'countChannelsNeverFiltered', pausedKey: 'listPausedChannels', emptyKey: 'listNoChannels' },
    'channel-blacklist': { listKey: 'channelBlacklist', enabledKey: 'channelBlacklistEnabled', countKey: 'countChannelsAlwaysHidden', pausedKey: 'listPausedChannels', emptyKey: 'listNoChannels' },
    'title-whitelist': { listKey: 'titleWhitelist', enabledKey: 'titleWhitelistEnabled', countKey: 'countWordsNeverFiltered', pausedKey: 'listPausedWords', emptyKey: 'listNoWords' },
    'title-blacklist': { listKey: 'titleBlacklist', enabledKey: 'titleBlacklistEnabled', countKey: 'countWordsAlwaysHidden', pausedKey: 'listPausedWords', emptyKey: 'listNoWords' },
  };

  function renderListRows() {
    Object.entries(LIST_ROWS).forEach(([id, row]) => {
      const count = lists[row.listKey].length;
      const enabled = state[row.enabledKey] !== false;
      const formatted = formatLocaleNumber(count);
      let text = getText(row.emptyKey);
      if (count) text = enabled ? getPluralText(row.countKey, count, formatted) : getPluralText(row.pausedKey, count, formatted);
      $(id + '-count').textContent = text;
    });
    Object.entries(LIST_TOGGLES).forEach(([id, key]) => {
      $(id).checked = state[key] !== false;
    });
    const marked = normalizeMarkedWatched(lists.markedWatched).length;
    const markedStatus = $('marked-watched-count');
    const nearLimit = marked >= MARKED_WATCHED_WARN_AT;
    const syncPaused = !!syncStatus.marked && syncStatus.marked.status === 'paused';
    let text;
    if (nearLimit) text = getText('markedNearLimit', [formatLocaleNumber(marked), formatLocaleNumber(MARKED_WATCHED_LIMIT)]);
    else if (syncPaused) text = getText('markedSyncPausedShort');
    else if (marked) text = getPluralText('markedFollowsWatched', marked, formatLocaleNumber(marked));
    else text = getText('markedNoneFollowsWatched');
    markedStatus.textContent = text;
    markedStatus.classList.toggle('is-near-limit', nearLimit);
    markedStatus.classList.toggle('is-sync-paused', !nearLimit && syncPaused);
  }

  function renderSyncStatus() {
    const paused = !!syncStatus.lists && syncStatus.lists.status === 'paused';
    document.querySelectorAll('[data-channel-sync-warning]').forEach(el => {
      el.hidden = !paused;
    });
    $('sync-row').classList.toggle('is-paused', paused);
    $('sync-text').textContent = getText(paused ? 'channelListsSyncPaused' : 'syncOk');
  }

  function renderLists() {
    renderListRows();
    renderChannelCard();
    renderWordState();
  }

  Object.entries(LIST_TOGGLES).forEach(([id, key]) => {
    $(id).addEventListener('change', event => {
      storeSync({ [key]: event.target.checked });
      renderLists();
    });
  });

  document.querySelectorAll('[data-manage-list]').forEach(button => {
    button.setAttribute('aria-label', getText('manageListLabel', getText(button.dataset.manageTitle)));
    button.addEventListener('click', () => {
      chrome.runtime.sendMessage({ action: 'openManager', list: button.dataset.manageList }, () => {
        void chrome.runtime.lastError;
      });
    });
  });

  const wordInput = $('word-input');
  const wordStatus = $('word-status');
  const WORD_TARGETS = {
    whitelist: { listKey: 'titleWhitelist', enabledKey: 'titleWhitelistEnabled', titleKey: 'titleWhitelistTitle' },
    blacklist: { listKey: 'titleBlacklist', enabledKey: 'titleBlacklistEnabled', titleKey: 'titleBlacklistTitle' },
  };

  function showWordMessage(messageKey, word, listTitleKey) {
    wordStatus.textContent = '';
    const text = getText(messageKey, [PLACEHOLDER_MARK, getText(listTitleKey)]);
    const [before, after] = text.split(PLACEHOLDER_MARK);
    if (before) {
      const lead = document.createElement('span');
      lead.className = 'word-status-rest';
      lead.textContent = before;
      wordStatus.appendChild(lead);
    }
    const wordEl = document.createElement('span');
    wordEl.className = 'word-status-word';
    wordEl.textContent = word;
    wordEl.title = word;
    wordStatus.appendChild(wordEl);
    if (after) {
      const rest = document.createElement('span');
      rest.className = 'word-status-rest';
      rest.textContent = after;
      wordStatus.appendChild(rest);
    }
  }

  function renderWordState() {
    const keyword = normalizeTitleKeyword(wordInput.value);
    $('word-whitelist').disabled = !keyword;
    $('word-blacklist').disabled = !keyword;
    if (!keyword) return;
    const listed = Object.values(WORD_TARGETS).find(target => titleKeywordListIncludes(keyword, lists[target.listKey]));
    if (listed) showWordMessage('wordAlreadyInList', keyword, listed.titleKey);
    else wordStatus.textContent = '';
  }

  wordInput.addEventListener('input', renderWordState);

  $('word-form').addEventListener('submit', event => {
    event.preventDefault();
    const submitter = event.submitter && event.submitter.value ? event.submitter.value : 'whitelist';
    const target = WORD_TARGETS[submitter];
    const keyword = normalizeTitleKeyword(wordInput.value);
    if (!keyword || !target) return;
    if (titleKeywordListIncludes(keyword, lists[target.listKey])) {
      showWordMessage('wordAlreadyInList', keyword, target.titleKey);
      return;
    }
    const updates = { [target.listKey]: [...lists[target.listKey], keyword] };
    if (state[target.enabledKey] === false) updates[target.enabledKey] = true;
    storeListUpdates(updates);
    wordInput.value = '';
    renderListRows();
    $('word-whitelist').disabled = true;
    $('word-blacklist').disabled = true;
    showWordMessage('wordAdded', keyword, target.titleKey);
  });

  const hideControlsToggle = $('hide-on-page-controls');
  hideControlsToggle.addEventListener('change', () => storeSync({ hideInterfaceElements: hideControlsToggle.checked }));

  $('restart-tutorial').addEventListener('click', () => {
    chrome.storage.sync.set({ tutorialCompleted: false });
    $('restart-tutorial').disabled = true;
    $('restart-tutorial-hint').textContent = getText('tutorialRestartConfirm');
  });

  $('footer-version').textContent = getText('footerVersion', chrome.runtime.getManifest().version);

  function fitSupportButton() {
    supportButton.classList.remove('is-icon-only');
    const label = supportButton.querySelector('.support-button-label');
    if (label.scrollWidth > label.clientWidth + 1) supportButton.classList.add('is-icon-only');
  }

  fitSupportButton();
  window.addEventListener('resize', fitSupportButton);

  const supportModal = $('support-modal');
  const supportClose = $('support-modal-close');

  function openSupport() {
    supportModal.hidden = false;
    document.body.classList.add('support-modal-open');
    supportButton.setAttribute('aria-expanded', 'true');
    supportClose.focus();
  }

  function closeSupport() {
    if (supportModal.hidden) return;
    supportModal.hidden = true;
    document.body.classList.remove('support-modal-open');
    supportButton.setAttribute('aria-expanded', 'false');
    supportButton.focus();
  }

  supportButton.addEventListener('click', openSupport);
  supportClose.addEventListener('click', closeSupport);
  $('support-modal-scrim').addEventListener('click', closeSupport);
  supportModal.querySelectorAll('.support-option').forEach(option => option.addEventListener('click', closeSupport));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeSupport();
  });

  function renderAll() {
    renderExtensionState();
    renderFilterMode();
    ['hide', 'views', 'date'].forEach(renderFilter);
    renderFormats();
    hideControlsToggle.checked = !!state.hideInterfaceElements;
    renderLists();
    renderSyncStatus();
  }

  chrome.storage.sync.get([...Object.keys(SYNC_DEFAULTS), ...LAST_VALUE_KEYS], stored => {
    const isFirstInstall = Object.keys(stored).length === 0;
    Object.assign(state, stored);
    chrome.storage.local.get([...LOCAL_PREF_KEYS, CHANNEL_LIST_SYNC_STATE_KEY, MARKED_WATCHED_SYNC_STATE_KEY], local => {
      Object.keys(lists).forEach(key => {
        lists[key] = getStoredArray(local[key]);
      });
      syncStatus.lists = local[CHANNEL_LIST_SYNC_STATE_KEY] || null;
      syncStatus.marked = local[MARKED_WATCHED_SYNC_STATE_KEY] || null;
      renderAll();
      if (isFirstInstall) storeSync(Object.assign({}, SYNC_DEFAULTS));
      else updateToolbarBadge();
    });
  });

  chrome.storage.onChanged.addListener((areaChanges, area) => {
    if (area === 'local') {
      if (areaChanges[CHANNEL_LIST_SYNC_STATE_KEY]) {
        syncStatus.lists = areaChanges[CHANNEL_LIST_SYNC_STATE_KEY].newValue || null;
        renderSyncStatus();
      }
      if (areaChanges[MARKED_WATCHED_SYNC_STATE_KEY]) {
        syncStatus.marked = areaChanges[MARKED_WATCHED_SYNC_STATE_KEY].newValue || null;
        renderListRows();
      }
    }
    const changes = pickStorageChanges(areaChanges, area);
    if (!changes) return;
    let listsChanged = false;
    let settingsChanged = false;
    Object.entries(changes).forEach(([key, change]) => {
      if (key in lists) {
        lists[key] = getStoredArray(change.newValue);
        listsChanged = true;
      } else if (key in SYNC_DEFAULTS || LAST_VALUE_KEYS.includes(key)) {
        state[key] = change.newValue === undefined ? SYNC_DEFAULTS[key] : change.newValue;
        settingsChanged = true;
      }
    });
    if (settingsChanged) {
      renderExtensionState();
      renderFilterMode();
      ['hide', 'views', 'date'].forEach(renderFilter);
      renderFormats();
      hideControlsToggle.checked = !!state.hideInterfaceElements;
    }
    if (listsChanged || settingsChanged) renderLists();
  });

  function clearTourHighlight() {
    document.querySelectorAll('.yh-tour-highlight').forEach(el => el.classList.remove('yh-tour-highlight'));
  }

  window.addEventListener('message', event => {
    if (event.origin !== 'https://www.youtube.com') return;
    const data = event.data;
    if (!data || typeof data !== 'object') return;
    if (data.type === 'YH_TOUR_HIGHLIGHT') {
      clearTourHighlight();
      const target = document.querySelector(`[data-tour-section="${data.section}"]`);
      if (!target) return;
      const panel = target.closest('.tab-panel');
      const tab = panel && tabs.find(item => item.getAttribute('aria-controls') === panel.id);
      if (tab) selectTab(tab);
      target.classList.add('yh-tour-highlight');
      target.scrollIntoView({ block: 'nearest' });
      requestAnimationFrame(() => {
        const rect = target.getBoundingClientRect();
        const visibleTop = Math.max(0, rect.top);
        const visibleBottom = Math.min(window.innerHeight, rect.bottom);
        event.source.postMessage(
          {
            type: 'YH_TOUR_TARGET_RECT',
            section: data.section,
            rect: { top: visibleTop, left: rect.left, width: rect.width, height: Math.max(0, visibleBottom - visibleTop) },
          },
          event.origin,
        );
      });
    } else if (data.type === 'YH_TOUR_CLEAR') {
      clearTourHighlight();
    }
  });
});
