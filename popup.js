function getBadgeText(hideEnabled) {
  if (hideEnabled) return '';
  return 'OFF';
}

function isAnyTrue(flags) {
  return Object.values(flags).some(Boolean);
}

function updateSliderBackground(slider) {
  const min = slider.min || 0;
  const max = slider.max || 100;
  const value = slider.value;
  const percentage = ((value - min) / (max - min)) * 100;
  slider.style.background = `linear-gradient(to right, #ebebeb ${percentage}%, #4a4a4a ${percentage}%)`;
}

const viewsSteps = [
  0, 100, 500, 1000, 2500, 5000, 7500, 10000, 15000, 25000, 50000, 75000,
  100000, 150000, 250000, 500000, 1000000, 10000000,
];

function formatViews(views) {
  if (views >= 1000000) {
    return (views / 1000000).toFixed(views % 1000000 === 0 ? 0 : 1) + 'M';
  } else if (views >= 1000) {
    return (views / 1000).toFixed(views % 1000 === 0 ? 0 : 1) + 'K';
  }
  return views.toString();
}

function findClosestViewsIndex(value) {
  let closestIndex = 0;
  let minDiff = Math.abs(viewsSteps[0] - value);
  for (let i = 1; i < viewsSteps.length; i++) {
    const diff = Math.abs(viewsSteps[i] - value);
    if (diff < minDiff) {
      minDiff = diff;
      closestIndex = i;
    }
  }
  return closestIndex;
}

const dateSteps = [0, 1, 3, 7, 14, 30, 60, 90, 180, 365, 730, 1825, 3650];

const dateStepLabels = [
  'Off',
  '1 day',
  '3 days',
  '1 week',
  '2 weeks',
  '1 month',
  '2 months',
  '3 months',
  '6 months',
  '1 year',
  '2 years',
  '5 years',
  '10 years',
];

const dateNewerSteps = [
  0,
  1 / 24,
  0.25,
  0.5,
  1,
  3,
  7,
  14,
  30,
  60,
  90,
  180,
  365,
  730,
  1825,
  3650,
];

const dateNewerStepLabels = [
  'Off',
  '1 hour',
  '6 hours',
  '12 hours',
  '1 day',
  '3 days',
  '1 week',
  '2 weeks',
  '1 month',
  '2 months',
  '3 months',
  '6 months',
  '1 year',
  '2 years',
  '5 years',
  '10 years',
];

function findClosestDateNewerIndex(value) {
  let closestIndex = 0;
  let minDiff = Math.abs(dateNewerSteps[0] - value);
  for (let i = 1; i < dateNewerSteps.length; i++) {
    const diff = Math.abs(dateNewerSteps[i] - value);
    if (diff < minDiff) {
      minDiff = diff;
      closestIndex = i;
    }
  }
  return closestIndex;
}

function formatDateThreshold(days) {
  const idx = findClosestDateIndex(days);
  return dateStepLabels[idx];
}

function findClosestDateIndex(value) {
  let closestIndex = 0;
  let minDiff = Math.abs(dateSteps[0] - value);
  for (let i = 1; i < dateSteps.length; i++) {
    const diff = Math.abs(dateSteps[i] - value);
    if (diff < minDiff) {
      minDiff = diff;
      closestIndex = i;
    }
  }
  return closestIndex;
}

function setEasyModeClass(isEasy) {
  document.body.classList.toggle('easy-mode-on', isEasy);
  document.body.classList.toggle('easy-mode-off', !isEasy);
}

function updateEasyModeUI(isEasyMode) {
  setEasyModeClass(isEasyMode);
}

document.addEventListener('DOMContentLoaded', () => {
  const easyModeToggle = document.getElementById('easy-mode-enabled');
  const hideShortsMaster = document.getElementById('hide-shorts-master');
  const floatingButtonToggle = document.getElementById(
    'floating-button-enabled',
  );

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
    ...Object.values(cfg.hide.keys),
    ...Object.values(cfg.views.keys),
    ...Object.values(cfg.shorts.keys),
    ...Object.values(cfg.date.keys),
  ];

  chrome.storage.sync.get(storageKeys, prefs => {
    const isFirstInstall = Object.keys(prefs).length === 0;

    const easyMode = prefs.easyModeEnabled ?? true;
    easyModeToggle.checked = easyMode;
    updateEasyModeUI(easyMode);

    floatingButtonToggle.checked = prefs.floatingButtonEnabled ?? true;

    ['hide', 'views', 'shorts'].forEach(sectionName => {
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

    hideShortsMaster.checked = isAnyTrue({
      enabled: prefs.hideShortsEnabled ?? cfg.shorts.defaults.enabled,
      search: prefs.hideShortsSearchEnabled ?? cfg.shorts.defaults.search,
    });

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
      const hideOn = isAnyTrue({
        ...Object.fromEntries(
          Object.entries(cfg.hide.boxes).map(([k]) => [
            k,
            settings[cfg.hide.keys[k]],
          ]),
        ),
        ...Object.fromEntries(
          Object.entries(cfg.views.boxes).map(([k]) => [
            k,
            settings[cfg.views.keys[k]],
          ]),
        ),
        ...Object.fromEntries(
          Object.entries(cfg.shorts.boxes).map(([k]) => [
            k,
            settings[cfg.shorts.keys[k]],
          ]),
        ),
        ...Object.fromEntries(
          Object.entries(cfg.date.boxes).map(([k]) => [
            k,
            settings[cfg.date.keys[k]],
          ]),
        ),
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
      Object.values(cfg.views.boxes).forEach(box => {
        box.checked = true;
      });
      Object.values(cfg.date.boxes).forEach(box => {
        box.checked = true;
      });
      hideShortsMaster.checked = true;
    }
    saveSettings();
  });

  floatingButtonToggle.addEventListener('change', () => {
    chrome.storage.sync.set({
      floatingButtonEnabled: floatingButtonToggle.checked,
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

  hideShortsMaster.addEventListener('change', () => {
    const isEnabled = hideShortsMaster.checked;
    Object.values(cfg.shorts.boxes).forEach(box => {
      box.checked = isEnabled;
    });
    saveSettings();
  });

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
    ...Object.values(cfg.date.boxes),
  ].forEach(box => box.addEventListener('change', saveSettings));

  document
    .querySelectorAll('.card-compact-toggle .toggle-switch-large')
    .forEach(el => {
      el.addEventListener('click', e => {
        if (e.target.tagName.toLowerCase() === 'input') return;
        const input = el.querySelector('input');
        input.checked = !input.checked;
        input.dispatchEvent(new Event('change', { bubbles: true }));
      });
    });
});
