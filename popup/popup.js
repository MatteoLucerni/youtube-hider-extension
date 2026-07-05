document.addEventListener('DOMContentLoaded', () => {
  const extensionToggle = document.getElementById('extension-enabled');
  const advancedModeToggle = document.getElementById('advanced-mode-enabled');
  const filterModeHideBtn = document.getElementById('filter-mode-hide');
  const filterModeDimBtn = document.getElementById('filter-mode-dim');
  const setFilterModeUI = isDim => {
    filterModeHideBtn.classList.toggle('active', !isDim);
    filterModeHideBtn.setAttribute('aria-pressed', String(!isDim));
    filterModeDimBtn.classList.toggle('active', isDim);
    filterModeDimBtn.setAttribute('aria-pressed', String(isDim));
  };
  const channelWhitelistToggle = document.getElementById(
    'channel-whitelist-enabled',
  );
  const channelBlacklistToggle = document.getElementById(
    'channel-blacklist-enabled',
  );
  const hideOnPageControlsToggle = document.getElementById(
    'hide-on-page-controls',
  );
  let isEasyMode = true;

  const easyShortsToggle = document.getElementById('hide-shorts-easy');
  const easyMixesToggle = document.getElementById('hide-mixes-easy');
  const easyPlaylistsToggle = document.getElementById('hide-playlists-easy');
  const easyLivesToggle = document.getElementById('hide-lives-easy');

  const footerVersion = document.getElementById('footer-version');
  if (footerVersion) {
    footerVersion.textContent = 'v' + chrome.runtime.getManifest().version;
  }

  const cfg = {
    hide: {
      slider: document.getElementById('perc-hide'),
      value: document.getElementById('perc-hide-value'),
      boxes: {
        home: document.getElementById('hide-home-enabled'),
        channel: document.getElementById('hide-channel-enabled'),
        search: document.getElementById('hide-search-enabled'),
        subs: document.getElementById('hide-subs-enabled'),
        corr: document.getElementById('hide-corr-enabled'),
      },
      keys: {
        threshold: 'hideThreshold',
        home: 'hideHomeEnabled',
        channel: 'hideChannelEnabled',
        search: 'hideSearchEnabled',
        subs: 'hideSubsEnabled',
        corr: 'hideCorrEnabled',
      },
      defaults: {
        threshold: 20,
        home: true,
        channel: true,
        search: true,
        subs: true,
        corr: true,
      },
    },
    shorts: {
      boxes: {
        enabled: document.getElementById('hide-shorts-enabled'),
        search: document.getElementById('hide-shorts-search-enabled'),
      },
      keys: { enabled: 'hideShortsEnabled', search: 'hideShortsSearchEnabled' },
      defaults: { enabled: true, search: false },
    },
    mixesPlaylists: {
      boxes: {
        mixes: document.getElementById('hide-mixes-enabled'),
        playlists: document.getElementById('hide-playlists-enabled'),
        lives: document.getElementById('hide-lives-enabled'),
      },
      keys: { mixes: 'hideMixesEnabled', playlists: 'hidePlaylistsEnabled', lives: 'hideLivesEnabled' },
      defaults: { mixes: true, playlists: true, lives: true },
    },
    views: {
      slider: document.getElementById('views-hide'),
      value: document.getElementById('views-hide-value'),
      boxes: {
        home: document.getElementById('views-hide-home-enabled'),
        channel: document.getElementById('views-hide-channel-enabled'),
        search: document.getElementById('views-hide-search-enabled'),
        subs: document.getElementById('views-hide-subs-enabled'),
        corr: document.getElementById('views-hide-corr-enabled'),
      },
      keys: {
        threshold: 'viewsHideThreshold',
        home: 'viewsHideHomeEnabled',
        channel: 'viewsHideChannelEnabled',
        search: 'viewsHideSearchEnabled',
        subs: 'viewsHideSubsEnabled',
        corr: 'viewsHideCorrEnabled',
      },
      defaults: {
        threshold: 1000,
        home: true,
        channel: true,
        search: true,
        subs: true,
        corr: true,
      },
    },
    date: {
      newerSlider: document.getElementById('date-filter-newer'),
      newerValue: document.getElementById('date-filter-newer-value'),
      olderSlider: document.getElementById('date-filter-older'),
      olderValue: document.getElementById('date-filter-older-value'),
      boxes: {
        home: document.getElementById('date-filter-home-enabled'),
        channel: document.getElementById('date-filter-channel-enabled'),
        search: document.getElementById('date-filter-search-enabled'),
        subs: document.getElementById('date-filter-subs-enabled'),
        corr: document.getElementById('date-filter-corr-enabled'),
      },
      keys: {
        newerThreshold: 'dateFilterNewerThreshold',
        olderThreshold: 'dateFilterOlderThreshold',
        home: 'dateFilterHomeEnabled',
        channel: 'dateFilterChannelEnabled',
        search: 'dateFilterSearchEnabled',
        subs: 'dateFilterSubsEnabled',
        corr: 'dateFilterCorrEnabled',
      },
      defaults: {
        newerThreshold: 0,
        olderThreshold: 0,
        home: false,
        channel: false,
        search: false,
        subs: false,
        corr: false,
      },
    },
  };

  const storageKeys = [
    'extensionEnabled',
    'easyModeEnabled',
    'dimMode',
    'channelWhitelist',
    'channelWhitelistEnabled',
    'channelBlacklist',
    'channelBlacklistEnabled',
    'hideInterfaceElements',
    ...Object.values(cfg.hide.keys),
    ...Object.values(cfg.views.keys),
    ...Object.values(cfg.shorts.keys),
    ...Object.values(cfg.mixesPlaylists.keys),
    ...Object.values(cfg.date.keys),
  ];

  chrome.storage.sync.get(storageKeys, prefs => {
    const isFirstInstall = Object.keys(prefs).length === 0;

    extensionToggle.checked = prefs.extensionEnabled ?? true;

    const easyMode = prefs.easyModeEnabled ?? true;
    isEasyMode = easyMode;
    updateEasyModeUI(easyMode);
    if (advancedModeToggle) {
      advancedModeToggle.checked = !easyMode;
    }

    setFilterModeUI(prefs.dimMode ?? false);
    channelWhitelistToggle.checked = prefs.channelWhitelistEnabled ?? true;
    channelBlacklistToggle.checked = prefs.channelBlacklistEnabled ?? true;
    hideOnPageControlsToggle.checked = prefs.hideInterfaceElements ?? false;

    ['hide', 'views', 'shorts', 'mixesPlaylists'].forEach(sectionName => {
      const section = cfg[sectionName];
      Object.entries(section.keys).forEach(([keyName, storageKey]) => {
        const def = section.defaults[keyName];
        const raw = prefs[storageKey] ?? def;
        const val =
          keyName === 'delay' || keyName === 'threshold'
            ? parseInt(raw, 10)
            : raw;
        if (section.slider && keyName === 'delay') {
          section.slider.value = val;
          section.value.textContent = val;
          updateSliderBackground(section.slider);
        } else if (
          section.slider &&
          keyName === 'threshold' &&
          sectionName === 'views'
        ) {
          const index = findClosestViewsIndex(val);
          section.slider.value = index;
          section.value.textContent = formatViews(viewsSteps[index]);
          updateSliderBackground(section.slider);
        } else if (section.slider && keyName === 'threshold') {
          section.slider.value = val;
          section.value.textContent = val;
          updateSliderBackground(section.slider);
        } else if (section.boxes) {
          section.boxes[keyName].checked = val;
        } else if (section.box) {
          section.box.checked = val;
        }
      });
    });

    easyShortsToggle.checked = isAnyTrue({
      enabled: prefs.hideShortsEnabled ?? cfg.shorts.defaults.enabled,
      search: prefs.hideShortsSearchEnabled ?? cfg.shorts.defaults.search,
    });
    easyMixesToggle.checked =
      prefs.hideMixesEnabled ?? cfg.mixesPlaylists.defaults.mixes;
    easyPlaylistsToggle.checked =
      prefs.hidePlaylistsEnabled ?? cfg.mixesPlaylists.defaults.playlists;
    easyLivesToggle.checked =
      prefs.hideLivesEnabled ?? cfg.mixesPlaylists.defaults.lives;

    // Date filter load
    const newerDays =
      prefs.dateFilterNewerThreshold ?? cfg.date.defaults.newerThreshold;
    const newerIdx = findClosestDateNewerIndex(newerDays);
    cfg.date.newerSlider.value = newerIdx;
    cfg.date.newerValue.textContent = dateNewerStepLabels[newerIdx];
    updateSliderBackground(cfg.date.newerSlider);

    const olderDays =
      prefs.dateFilterOlderThreshold ?? cfg.date.defaults.olderThreshold;
    const olderIdx = findClosestDateIndex(olderDays);
    cfg.date.olderSlider.value = olderIdx;
    cfg.date.olderValue.textContent = dateStepLabels[olderIdx];
    updateSliderBackground(cfg.date.olderSlider);

    Object.entries(cfg.date.boxes).forEach(([k, box]) => {
      box.checked = prefs[cfg.date.keys[k]] ?? cfg.date.defaults[k];
    });

    checkDateOverlap();

    // Apply slider-off visual state & display label for all slider sections
    updateSliderOffState(
      cfg.hide.slider,
      parseInt(cfg.hide.slider.value, 10) === 0,
    );
    updateSliderOffState(
      cfg.views.slider,
      parseInt(cfg.views.slider.value, 10) === 0,
    );
    updateSliderOffState(
      cfg.date.newerSlider,
      parseInt(cfg.date.newerSlider.value, 10) === 0,
    );
    updateSliderOffState(
      cfg.date.olderSlider,
      parseInt(cfg.date.olderSlider.value, 10) === 0,
    );

    // Update display labels for Off state
    if (parseInt(cfg.hide.slider.value, 10) === 0) {
      cfg.hide.value.textContent = 'Off';
      const unit = document.querySelector('.slider-unit');
      if (unit) unit.style.display = 'none';
    }
    if (parseInt(cfg.views.slider.value, 10) === 0) {
      cfg.views.value.textContent = 'Off';
    }

    // Apply per-page disabled state in Advanced Mode when slider is off
    updatePerPageDisabledState(
      'hide',
      parseInt(cfg.hide.slider.value, 10) === 0,
    );
    updatePerPageDisabledState(
      'views',
      parseInt(cfg.views.slider.value, 10) === 0,
    );
    updatePerPageDisabledState(
      'date',
      parseInt(cfg.date.newerSlider.value, 10) === 0 &&
        parseInt(cfg.date.olderSlider.value, 10) === 0,
    );

    if (isFirstInstall) {
      saveSettings();
    }

    whitelistData = Array.isArray(prefs.channelWhitelist) ? prefs.channelWhitelist : [];
    renderWhitelistChips(whitelistData);
    refreshAddButtonState();

    blacklistData = Array.isArray(prefs.channelBlacklist) ? prefs.channelBlacklist : [];
    renderBlacklistChips(blacklistData);
    refreshAddBlacklistButtonState();
  });

  function saveSettings() {
    const easyMode = isEasyMode;

    const settings = {
      extensionEnabled: extensionToggle.checked,
      easyModeEnabled: easyMode,
      ...Object.fromEntries(
        Object.entries(cfg.hide.keys).map(([k, key]) => [
          key,
          k === 'threshold'
            ? parseInt(cfg.hide.slider.value, 10)
            : cfg.hide.boxes[k].checked,
        ]),
      ),
      ...Object.fromEntries(
        Object.entries(cfg.views.keys).map(([k, key]) => [
          key,
          k === 'threshold'
            ? viewsSteps[parseInt(cfg.views.slider.value, 10)]
            : cfg.views.boxes[k].checked,
        ]),
      ),
      ...Object.fromEntries(
        Object.entries(cfg.shorts.keys).map(([k, key]) => [
          key,
          cfg.shorts.boxes[k].checked,
        ]),
      ),
      ...Object.fromEntries(
        Object.entries(cfg.mixesPlaylists.keys).map(([k, key]) => [
          key,
          cfg.mixesPlaylists.boxes[k].checked,
        ]),
      ),
      dateFilterNewerThreshold:
        dateNewerSteps[parseInt(cfg.date.newerSlider.value, 10)],
      dateFilterOlderThreshold:
        dateSteps[parseInt(cfg.date.olderSlider.value, 10)],
      ...Object.fromEntries(
        Object.entries(cfg.date.boxes).map(([k, box]) => [
          cfg.date.keys[k],
          box.checked,
        ]),
      ),
    };

    chrome.storage.sync.set(settings, () => {
      const dateThresholdActive =
        (settings.dateFilterNewerThreshold || 0) > 0 ||
        (settings.dateFilterOlderThreshold || 0) > 0;
      const hideOn =
        settings.extensionEnabled &&
        isAnyTrue({
        ...(settings.hideThreshold > 0
          ? Object.fromEntries(
              Object.entries(cfg.hide.boxes).map(([k]) => [
                k,
                settings[cfg.hide.keys[k]],
              ]),
            )
          : {}),
        ...(settings.viewsHideThreshold > 0
          ? Object.fromEntries(
              Object.entries(cfg.views.boxes).map(([k]) => [
                k,
                settings[cfg.views.keys[k]],
              ]),
            )
          : {}),
        ...Object.fromEntries(
          Object.entries(cfg.shorts.boxes).map(([k]) => [
            k,
            settings[cfg.shorts.keys[k]],
          ]),
        ),
        ...Object.fromEntries(
          Object.entries(cfg.mixesPlaylists.boxes).map(([k]) => [
            k,
            settings[cfg.mixesPlaylists.keys[k]],
          ]),
        ),
        ...(dateThresholdActive
          ? Object.fromEntries(
              Object.entries(cfg.date.boxes).map(([k]) => [
                k,
                settings[cfg.date.keys[k]],
              ]),
            )
          : {}),
        });
      const text = getBadgeText(hideOn);
      chrome.action.setBadgeText({ text });
      chrome.action.setBadgeBackgroundColor({
        color: hideOn ? '#008000' : '#808080',
      });
    });
  }

  if (advancedModeToggle) {
    advancedModeToggle.addEventListener('change', () => {
      isEasyMode = !advancedModeToggle.checked;
      updateEasyModeUI(isEasyMode);
      saveSettings();
    });
  }

  extensionToggle.addEventListener('change', saveSettings);

  easyShortsToggle.addEventListener('change', () => {
    const val = easyShortsToggle.checked;
    Object.values(cfg.shorts.boxes).forEach(box => {
      box.checked = val;
    });
    saveSettings();
  });

  easyMixesToggle.addEventListener('change', () => {
    cfg.mixesPlaylists.boxes.mixes.checked = easyMixesToggle.checked;
    saveSettings();
  });

  easyPlaylistsToggle.addEventListener('change', () => {
    cfg.mixesPlaylists.boxes.playlists.checked = easyPlaylistsToggle.checked;
    saveSettings();
  });

  easyLivesToggle.addEventListener('change', () => {
    cfg.mixesPlaylists.boxes.lives.checked = easyLivesToggle.checked;
    saveSettings();
  });

  const setDimMode = isDim => {
    setFilterModeUI(isDim);
    chrome.storage.sync.set({ dimMode: isDim });
  };

  filterModeHideBtn.addEventListener('click', () => setDimMode(false));
  filterModeDimBtn.addEventListener('click', () => setDimMode(true));

  hideOnPageControlsToggle.addEventListener('change', () => {
    chrome.storage.sync.set({
      hideInterfaceElements: hideOnPageControlsToggle.checked,
    });
  });

  channelWhitelistToggle.addEventListener('change', () => {
    chrome.storage.sync.set({
      channelWhitelistEnabled: channelWhitelistToggle.checked,
    });
  });

  channelBlacklistToggle.addEventListener('change', () => {
    chrome.storage.sync.set({
      channelBlacklistEnabled: channelBlacklistToggle.checked,
    });
  });

  const restartTutorialBtn = document.getElementById('restart-tutorial');
  const restartTutorialConfirm = document.getElementById(
    'restart-tutorial-confirm',
  );
  if (restartTutorialBtn) {
    restartTutorialBtn.addEventListener('click', () => {
      chrome.storage.sync.set({ tutorialCompleted: false });
      restartTutorialBtn.style.display = 'none';
      if (restartTutorialConfirm)
        restartTutorialConfirm.style.display = 'inline-flex';
    });
  }

  // ── Slider-off visual state helper ──

  function updateSliderOffState(slider, isOff) {
    const control = slider.closest('.slider-control');
    if (control) control.classList.toggle('slider-off', isOff);
  }

  function updatePerPageDisabledState(section, isOff) {
    let card;
    if (section === 'hide') {
      card = cfg.hide.slider.closest('.setting-card');
    } else if (section === 'views') {
      card = cfg.views.slider.closest('.setting-card');
    } else if (section === 'date') {
      card = cfg.date.newerSlider.closest('.setting-card');
    }
    if (card) {
      const grid = card.querySelector('.toggle-grid.easy-mode-advanced');
      if (grid) grid.classList.toggle('per-page-disabled', isOff);
    }
  }

  // Auto-enable per-page flags when slider leaves Off (Easy Mode only)
  function autoEnablePerPage(section) {
    if (!isEasyMode) return;
    const boxes =
      section === 'date'
        ? cfg.date.boxes
        : section === 'views'
          ? cfg.views.boxes
          : cfg.hide.boxes;
    const allOff = Object.values(boxes).every(box => !box.checked);
    if (allOff) {
      Object.values(boxes).forEach(box => {
        box.checked = true;
      });
    }
  }

  function checkDateOverlap() {
    const newerIdx = parseInt(cfg.date.newerSlider.value, 10);
    const olderIdx = parseInt(cfg.date.olderSlider.value, 10);
    const newerThreshold = dateNewerSteps[newerIdx];
    const olderThreshold = dateSteps[olderIdx];

    // Both must be active (not Off) and overlapping
    const isOverlap =
      newerIdx > 0 && olderIdx > 0 && newerThreshold >= olderThreshold;

    const warning = document.getElementById('date-overlap-warning');
    if (warning) warning.style.display = isOverlap ? 'flex' : 'none';

    document.querySelectorAll('.date-sub-filter').forEach(el => {
      el.classList.toggle('date-overlap', isOverlap);
    });
  }

  // ── Slider event handlers ──

  cfg.date.newerSlider.addEventListener('input', () => {
    const index = parseInt(cfg.date.newerSlider.value, 10);
    cfg.date.newerValue.textContent = dateNewerStepLabels[index];
    updateSliderBackground(cfg.date.newerSlider);
    updateSliderOffState(cfg.date.newerSlider, index === 0);
    updatePerPageDisabledState(
      'date',
      index === 0 && parseInt(cfg.date.olderSlider.value, 10) === 0,
    );
    checkDateOverlap();
  });
  cfg.date.newerSlider.addEventListener('change', () => {
    const index = parseInt(cfg.date.newerSlider.value, 10);
    if (index > 0) autoEnablePerPage('date');
    saveSettings();
  });

  cfg.date.olderSlider.addEventListener('input', () => {
    const index = parseInt(cfg.date.olderSlider.value, 10);
    cfg.date.olderValue.textContent = dateStepLabels[index];
    updateSliderBackground(cfg.date.olderSlider);
    updateSliderOffState(cfg.date.olderSlider, index === 0);
    updatePerPageDisabledState(
      'date',
      index === 0 && parseInt(cfg.date.newerSlider.value, 10) === 0,
    );
    checkDateOverlap();
  });
  cfg.date.olderSlider.addEventListener('change', () => {
    const index = parseInt(cfg.date.olderSlider.value, 10);
    if (index > 0) autoEnablePerPage('date');
    saveSettings();
  });

  [[cfg.hide.slider, cfg.hide.value]].forEach(([slider, display]) => {
    slider.addEventListener('input', () => {
      const val = parseInt(slider.value, 10);
      if (val === 0) {
        display.textContent = 'Off';
        const unit = display.parentElement.querySelector('.slider-unit');
        if (unit) unit.style.display = 'none';
      } else {
        display.textContent = val;
        const unit = display.parentElement.querySelector('.slider-unit');
        if (unit) unit.style.display = '';
      }
      updateSliderBackground(slider);
      updateSliderOffState(slider, val === 0);
      updatePerPageDisabledState('hide', val === 0);
    });
    slider.addEventListener('change', () => {
      if (parseInt(slider.value, 10) > 0) autoEnablePerPage('hide');
      saveSettings();
    });
  });

  cfg.views.slider.addEventListener('input', () => {
    const index = parseInt(cfg.views.slider.value, 10);
    if (index === 0) {
      cfg.views.value.textContent = 'Off';
    } else {
      cfg.views.value.textContent = formatViews(viewsSteps[index]);
    }
    updateSliderBackground(cfg.views.slider);
    updateSliderOffState(cfg.views.slider, index === 0);
    updatePerPageDisabledState('views', index === 0);
  });
  cfg.views.slider.addEventListener('change', () => {
    if (parseInt(cfg.views.slider.value, 10) > 0) autoEnablePerPage('views');
    saveSettings();
  });

  [
    ...Object.values(cfg.hide.boxes),
    ...Object.values(cfg.views.boxes),
    ...Object.values(cfg.shorts.boxes),
    ...Object.values(cfg.mixesPlaylists.boxes),
    ...Object.values(cfg.date.boxes),
  ].forEach(box => box.addEventListener('change', saveSettings));

  document
    .querySelectorAll('.card-compact-toggle .toggle-switch-large, .mode-switch .toggle-switch-large')
    .forEach(el => {
      el.addEventListener('click', e => {
        if (e.target.tagName.toLowerCase() === 'input') return;
        const input = el.querySelector('input');
        if (input.disabled) return;
        input.checked = !input.checked;
        input.dispatchEvent(new Event('change', { bubbles: true }));
      });
    });

  const chipsContainer = document.getElementById('channel-whitelist-chips');
  const emptyHint = document.getElementById('channel-whitelist-empty');
  const addCurrentBtn = document.getElementById('add-current-channel-btn');
  const whitelistHint = document.getElementById('channel-whitelist-hint');

  let whitelistData = [];
  let currentTabChannel = null;

  function saveWhitelist(list, extraUpdates) {
    chrome.storage.sync.set(Object.assign({ channelWhitelist: list }, extraUpdates));
  }

  function channelDisplayName(channel) {
    return Array.isArray(channel) ? channel.join(', ') : channel;
  }

  function refreshAddButtonState() {
    if (!addCurrentBtn) return;
    if (!currentTabChannel) {
      addCurrentBtn.disabled = true;
      if (whitelistHint) whitelistHint.textContent = 'Navigate to a channel page to add it';
      return;
    }
    const pending = computeWhitelistUpdate(currentTabChannel, true, whitelistData, channelWhitelistToggle.checked);
    if (!pending) {
      addCurrentBtn.disabled = true;
      if (whitelistHint) whitelistHint.textContent = channelDisplayName(currentTabChannel) + ' is already whitelisted';
      return;
    }
    addCurrentBtn.disabled = false;
    if (whitelistHint) whitelistHint.textContent = '';
  }

  function renderWhitelistChips(list) {
    if (!chipsContainer) return;
    chipsContainer.querySelectorAll('.whitelist-chip').forEach(c => c.remove());
    if (emptyHint) emptyHint.style.display = list.length === 0 ? '' : 'none';
    list.forEach(channel => {
      const chip = document.createElement('span');
      chip.className = 'whitelist-chip';
      const label = document.createElement('span');
      label.className = 'whitelist-chip-label';
      label.textContent = channel;
      const remove = document.createElement('button');
      remove.className = 'whitelist-chip-remove';
      remove.type = 'button';
      remove.textContent = '×';
      remove.setAttribute('aria-label', 'Remove ' + channel);
      remove.addEventListener('click', () => {
        const current = Array.isArray(whitelistData) ? [...whitelistData] : [];
        const idx = current.indexOf(channel);
        if (idx !== -1) current.splice(idx, 1);
        whitelistData = current;
        renderWhitelistChips(current);
        saveWhitelist(current);
        refreshAddButtonState();
      });
      chip.appendChild(label);
      chip.appendChild(remove);
      chipsContainer.appendChild(chip);
    });
  }

  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    const tab = tabs && tabs[0];
    if (!tab || !tab.id) {
      refreshAddButtonState();
      return;
    }
    chrome.tabs.sendMessage(tab.id, { type: 'GET_CURRENT_CHANNEL' }, response => {
      if (!chrome.runtime.lastError && response && response.channel) {
        currentTabChannel = response.channel;
      }
      refreshAddButtonState();
    });
  });

  const BLACKLIST_KEYS = { listKey: 'channelBlacklist', enabledKey: 'channelBlacklistEnabled' };

  const blacklistChipsContainer = document.getElementById('channel-blacklist-chips');
  const blacklistEmptyHint = document.getElementById('channel-blacklist-empty');
  const addCurrentBlacklistBtn = document.getElementById('add-current-channel-blacklist-btn');
  const blacklistHint = document.getElementById('channel-blacklist-hint');

  let blacklistData = [];

  function saveBlacklist(list, extraUpdates) {
    chrome.storage.sync.set(Object.assign({ channelBlacklist: list }, extraUpdates));
  }

  function refreshAddBlacklistButtonState() {
    if (!addCurrentBlacklistBtn) return;
    if (!currentTabChannel) {
      addCurrentBlacklistBtn.disabled = true;
      if (blacklistHint) blacklistHint.textContent = 'Navigate to a channel page to add it';
      return;
    }
    const pending = computeWhitelistUpdate(currentTabChannel, true, blacklistData, channelBlacklistToggle.checked, BLACKLIST_KEYS);
    if (!pending) {
      addCurrentBlacklistBtn.disabled = true;
      if (blacklistHint) blacklistHint.textContent = channelDisplayName(currentTabChannel) + ' is already blacklisted';
      return;
    }
    addCurrentBlacklistBtn.disabled = false;
    if (blacklistHint) blacklistHint.textContent = '';
  }

  function renderBlacklistChips(list) {
    if (!blacklistChipsContainer) return;
    blacklistChipsContainer.querySelectorAll('.whitelist-chip').forEach(c => c.remove());
    if (blacklistEmptyHint) blacklistEmptyHint.style.display = list.length === 0 ? '' : 'none';
    list.forEach(channel => {
      const chip = document.createElement('span');
      chip.className = 'whitelist-chip blacklist-chip';
      const label = document.createElement('span');
      label.className = 'whitelist-chip-label';
      label.textContent = channel;
      const remove = document.createElement('button');
      remove.className = 'whitelist-chip-remove';
      remove.type = 'button';
      remove.textContent = '×';
      remove.setAttribute('aria-label', 'Remove ' + channel);
      remove.addEventListener('click', () => {
        const current = Array.isArray(blacklistData) ? [...blacklistData] : [];
        const idx = current.indexOf(channel);
        if (idx !== -1) current.splice(idx, 1);
        blacklistData = current;
        renderBlacklistChips(current);
        saveBlacklist(current);
        refreshAddBlacklistButtonState();
      });
      chip.appendChild(label);
      chip.appendChild(remove);
      blacklistChipsContainer.appendChild(chip);
    });
  }

  if (addCurrentBtn) {
    addCurrentBtn.addEventListener('click', () => {
      if (!currentTabChannel) return;

      const result = computeWhitelistUpdate(
        currentTabChannel,
        true,
        whitelistData,
        channelWhitelistToggle.checked,
      );
      if (!result) return;

      whitelistData = result.list;
      renderWhitelistChips(whitelistData);
      if (result.updates.channelWhitelistEnabled) channelWhitelistToggle.checked = true;
      refreshAddButtonState();

      const updates = Object.assign(
        { channelWhitelist: whitelistData },
        result.updates.channelWhitelistEnabled ? { channelWhitelistEnabled: true } : {},
      );

      const unblacklist = computeWhitelistUpdate(
        result.changedChannels,
        false,
        blacklistData,
        channelBlacklistToggle.checked,
        BLACKLIST_KEYS,
      );
      if (unblacklist && unblacklist.updates.channelBlacklist) {
        blacklistData = unblacklist.list;
        renderBlacklistChips(blacklistData);
        refreshAddBlacklistButtonState();
        updates.channelBlacklist = blacklistData;
      }

      chrome.storage.sync.set(updates);
    });
  }

  if (addCurrentBlacklistBtn) {
    addCurrentBlacklistBtn.addEventListener('click', () => {
      if (!currentTabChannel) return;

      const result = computeWhitelistUpdate(
        currentTabChannel,
        true,
        blacklistData,
        channelBlacklistToggle.checked,
        BLACKLIST_KEYS,
      );
      if (!result) return;

      blacklistData = result.list;
      renderBlacklistChips(blacklistData);
      if (result.updates.channelBlacklistEnabled) channelBlacklistToggle.checked = true;
      refreshAddBlacklistButtonState();

      const updates = Object.assign(
        { channelBlacklist: blacklistData },
        result.updates.channelBlacklistEnabled ? { channelBlacklistEnabled: true } : {},
      );

      const unwhitelist = computeWhitelistUpdate(
        result.changedChannels,
        false,
        whitelistData,
        channelWhitelistToggle.checked,
      );
      if (unwhitelist && unwhitelist.updates.channelWhitelist) {
        whitelistData = unwhitelist.list;
        renderWhitelistChips(whitelistData);
        refreshAddButtonState();
        updates.channelWhitelist = whitelistData;
      }

      chrome.storage.sync.set(updates);
    });
  }

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'sync') return;
    if (changes.channelWhitelist) {
      whitelistData = Array.isArray(changes.channelWhitelist.newValue)
        ? changes.channelWhitelist.newValue
        : [];
      renderWhitelistChips(whitelistData);
    }
    if (changes.channelWhitelistEnabled) {
      channelWhitelistToggle.checked = changes.channelWhitelistEnabled.newValue ?? true;
    }
    if (changes.channelBlacklist) {
      blacklistData = Array.isArray(changes.channelBlacklist.newValue)
        ? changes.channelBlacklist.newValue
        : [];
      renderBlacklistChips(blacklistData);
    }
    if (changes.channelBlacklistEnabled) {
      channelBlacklistToggle.checked = changes.channelBlacklistEnabled.newValue ?? true;
    }
    if (changes.hideInterfaceElements) {
      hideOnPageControlsToggle.checked = changes.hideInterfaceElements.newValue ?? false;
    }
    if (changes.channelWhitelist || changes.channelWhitelistEnabled) {
      refreshAddButtonState();
    }
    if (changes.channelBlacklist || changes.channelBlacklistEnabled) {
      refreshAddBlacklistButtonState();
    }
  });

  const headerEl = document.querySelector('header');
  if (headerEl) {
    document.documentElement.style.setProperty(
      '--yh-header-offset',
      headerEl.offsetHeight + 'px',
    );
  }

  const clearTourHighlight = () => {
    document.querySelectorAll('.yh-tour-highlight').forEach(el => {
      el.classList.remove('yh-tour-highlight');
    });
  };

  window.addEventListener('message', event => {
    if (event.origin !== 'https://www.youtube.com') return;
    const data = event.data;
    if (!data || typeof data !== 'object') return;

    if (data.type === 'YH_TOUR_HIGHLIGHT') {
      clearTourHighlight();
      const target = document.querySelector(
        `[data-tour-section="${data.section}"]`,
      );
      if (target) {
        target.classList.add('yh-tour-highlight');
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } else if (data.type === 'YH_TOUR_CLEAR') {
      clearTourHighlight();
    }
  });

});
