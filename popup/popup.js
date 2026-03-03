const WHATS_NEW = {
  '2.7': {
    title: "What's New in v2.7",
    features: [
      { heading: 'Filter Mode', body: 'Videos can now be dimmed instead of hidden. Toggle it in Extra Settings.' },
      { heading: 'Upload Date Filter', body: 'Hide videos newer or older than a configurable date threshold.' },
    ],
  },
};

document.addEventListener('DOMContentLoaded', () => {
  const easyModeToggle = document.getElementById('easy-mode-enabled');
  const floatingButtonToggle = document.getElementById(
    'floating-button-enabled',
  );
  const dimModeToggle = document.getElementById('dim-mode-enabled');

  const easyShortsToggle = document.getElementById('hide-shorts-easy');
  const easyMixesToggle = document.getElementById('hide-mixes-easy');
  const easyPlaylistsToggle = document.getElementById('hide-playlists-easy');
  const easyLivesToggle = document.getElementById('hide-lives-easy');

  const footerVersion = document.getElementById('footer-version');
  if (footerVersion) {
    footerVersion.textContent = 'v' + chrome.runtime.getManifest().version;
  }

  chrome.storage.local.get('whatsNewVersion', local => {
    const version = local.whatsNewVersion;
    if (version && WHATS_NEW[version]) {
      showWhatsNew(WHATS_NEW[version]);
    }
  });

  function showWhatsNew(data) {
    const overlay = document.createElement('div');
    overlay.id = 'wn-overlay';

    const modal = document.createElement('div');
    modal.id = 'wn-modal';

    const header = document.createElement('div');
    header.id = 'wn-header';
    const titleEl = document.createElement('span');
    titleEl.id = 'wn-title';
    titleEl.textContent = data.title;
    header.appendChild(titleEl);

    const list = document.createElement('ul');
    list.id = 'wn-list';
    data.features.forEach(f => {
      const item = document.createElement('li');
      const h = document.createElement('span');
      h.className = 'wn-feature-heading';
      h.textContent = f.heading;
      const b = document.createElement('span');
      b.className = 'wn-feature-body';
      b.textContent = f.body;
      item.appendChild(h);
      item.appendChild(b);
      list.appendChild(item);
    });

    const footer = document.createElement('div');
    footer.id = 'wn-footer';
    const btn = document.createElement('button');
    btn.id = 'wn-dismiss-btn';
    btn.textContent = 'Got it';
    btn.addEventListener('click', () => {
      overlay.remove();
      chrome.storage.local.remove('whatsNewVersion');
    });
    footer.appendChild(btn);

    modal.appendChild(header);
    modal.appendChild(list);
    modal.appendChild(footer);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
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
    'easyModeEnabled',
    'floatingButtonEnabled',
    'dimMode',
    ...Object.values(cfg.hide.keys),
    ...Object.values(cfg.views.keys),
    ...Object.values(cfg.shorts.keys),
    ...Object.values(cfg.mixesPlaylists.keys),
    ...Object.values(cfg.date.keys),
  ];

  chrome.storage.sync.get(storageKeys, prefs => {
    const isFirstInstall = Object.keys(prefs).length === 0;

    const easyMode = prefs.easyModeEnabled ?? true;
    easyModeToggle.checked = easyMode;
    updateEasyModeUI(easyMode);

    floatingButtonToggle.checked = prefs.floatingButtonEnabled ?? true;
    dimModeToggle.checked = prefs.dimMode ?? false;

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
  });

  function saveSettings() {
    const easyMode = easyModeToggle.checked;

    const settings = {
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
      const hideOn = isAnyTrue({
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

  easyModeToggle.addEventListener('change', () => {
    const isEasyMode = easyModeToggle.checked;
    updateEasyModeUI(isEasyMode);
    if (isEasyMode) {
      Object.values(cfg.hide.boxes).forEach(box => {
        box.checked = true;
      });
      Object.values(cfg.shorts.boxes).forEach(box => {
        box.checked = true;
      });
      Object.values(cfg.mixesPlaylists.boxes).forEach(box => {
        box.checked = true;
      });
      Object.values(cfg.views.boxes).forEach(box => {
        box.checked = true;
      });
      Object.values(cfg.date.boxes).forEach(box => {
        box.checked = true;
      });
      easyShortsToggle.checked = true;
      easyMixesToggle.checked = true;
      easyPlaylistsToggle.checked = true;
      easyLivesToggle.checked = true;
    }
    saveSettings();
  });

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

  floatingButtonToggle.addEventListener('change', () => {
    chrome.storage.sync.set({
      floatingButtonEnabled: floatingButtonToggle.checked,
    });
  });

  dimModeToggle.addEventListener('change', () => {
    chrome.storage.sync.set({ dimMode: dimModeToggle.checked });
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
    if (!easyModeToggle.checked) return;
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
        input.checked = !input.checked;
        input.dispatchEvent(new Event('change', { bubbles: true }));
      });
    });
});
