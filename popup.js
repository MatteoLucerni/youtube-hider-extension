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

const dateSteps = [1, 3, 7, 14, 30, 60, 90, 180, 365, 730, 1825, 3650];

const dateStepLabels = [
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
  const hideWatchedMaster = document.getElementById('hide-watched-master');
  const hideShortsMaster = document.getElementById('hide-shorts-master');
  const viewsHideMaster = document.getElementById('views-hide-master');
  const dateFilterMaster = document.getElementById('date-filter-master');
  const dateFilterNewerToggle = document.getElementById(
    'date-filter-newer-toggle',
  );
  const dateFilterOlderToggle = document.getElementById(
    'date-filter-older-toggle',
  );
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
        newerEnabled: 'dateFilterNewerEnabled',
        newerThreshold: 'dateFilterNewerThreshold',
        olderEnabled: 'dateFilterOlderEnabled',
        olderThreshold: 'dateFilterOlderThreshold',
        home: 'dateFilterHomeEnabled',
        channel: 'dateFilterChannelEnabled',
        search: 'dateFilterSearchEnabled',
        subs: 'dateFilterSubsEnabled',
        corr: 'dateFilterCorrEnabled',
      },
      defaults: {
        newerEnabled: false,
        newerThreshold: 30,
        olderEnabled: false,
        olderThreshold: 1825,
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

    hideWatchedMaster.checked = isAnyTrue({
      home: prefs.hideHomeEnabled ?? cfg.hide.defaults.home,
      channel: prefs.hideChannelEnabled ?? cfg.hide.defaults.channel,
      search: prefs.hideSearchEnabled ?? cfg.hide.defaults.search,
      subs: prefs.hideSubsEnabled ?? cfg.hide.defaults.subs,
      corr: prefs.hideCorrEnabled ?? cfg.hide.defaults.corr,
    });

    hideShortsMaster.checked = isAnyTrue({
      enabled: prefs.hideShortsEnabled ?? cfg.shorts.defaults.enabled,
      search: prefs.hideShortsSearchEnabled ?? cfg.shorts.defaults.search,
    });

    viewsHideMaster.checked = isAnyTrue({
      home: prefs.viewsHideHomeEnabled ?? cfg.views.defaults.home,
      channel: prefs.viewsHideChannelEnabled ?? cfg.views.defaults.channel,
      search: prefs.viewsHideSearchEnabled ?? cfg.views.defaults.search,
      subs: prefs.viewsHideSubsEnabled ?? cfg.views.defaults.subs,
      corr: prefs.viewsHideCorrEnabled ?? cfg.views.defaults.corr,
    });

    // Date filter load
    dateFilterNewerToggle.checked =
      prefs.dateFilterNewerEnabled ?? cfg.date.defaults.newerEnabled;
    dateFilterOlderToggle.checked =
      prefs.dateFilterOlderEnabled ?? cfg.date.defaults.olderEnabled;

    const newerDays =
      prefs.dateFilterNewerThreshold ?? cfg.date.defaults.newerThreshold;
    const newerIdx = findClosestDateIndex(newerDays);
    cfg.date.newerSlider.value = newerIdx;
    cfg.date.newerValue.textContent = dateStepLabels[newerIdx];
    updateSliderBackground(cfg.date.newerSlider);
    updateDateSliderDisabled(
      cfg.date.newerSlider,
      dateFilterNewerToggle.checked,
    );

    const olderDays =
      prefs.dateFilterOlderThreshold ?? cfg.date.defaults.olderThreshold;
    const olderIdx = findClosestDateIndex(olderDays);
    cfg.date.olderSlider.value = olderIdx;
    cfg.date.olderValue.textContent = dateStepLabels[olderIdx];
    updateSliderBackground(cfg.date.olderSlider);
    updateDateSliderDisabled(
      cfg.date.olderSlider,
      dateFilterOlderToggle.checked,
    );

    Object.entries(cfg.date.boxes).forEach(([k, box]) => {
      box.checked = prefs[cfg.date.keys[k]] ?? cfg.date.defaults[k];
    });

    checkDateOverlap();

    dateFilterMaster.checked = isAnyTrue({
      home: prefs.dateFilterHomeEnabled ?? cfg.date.defaults.home,
      channel: prefs.dateFilterChannelEnabled ?? cfg.date.defaults.channel,
      search: prefs.dateFilterSearchEnabled ?? cfg.date.defaults.search,
      subs: prefs.dateFilterSubsEnabled ?? cfg.date.defaults.subs,
      corr: prefs.dateFilterCorrEnabled ?? cfg.date.defaults.corr,
    });

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
      dateFilterNewerEnabled: dateFilterNewerToggle.checked,
      dateFilterNewerThreshold:
        dateSteps[parseInt(cfg.date.newerSlider.value, 10)],
      dateFilterOlderEnabled: dateFilterOlderToggle.checked,
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
      hideWatchedMaster.checked = true;
      hideShortsMaster.checked = true;
      viewsHideMaster.checked = true;
      dateFilterMaster.checked = true;
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

  hideWatchedMaster.addEventListener('change', () => {
    const isEnabled = hideWatchedMaster.checked;
    Object.values(cfg.hide.boxes).forEach(box => {
      box.checked = isEnabled;
    });
    saveSettings();
  });

  hideShortsMaster.addEventListener('change', () => {
    const isEnabled = hideShortsMaster.checked;
    Object.values(cfg.shorts.boxes).forEach(box => {
      box.checked = isEnabled;
    });
    saveSettings();
  });

  viewsHideMaster.addEventListener('change', () => {
    const isEnabled = viewsHideMaster.checked;
    Object.values(cfg.views.boxes).forEach(box => {
      box.checked = isEnabled;
    });
    saveSettings();
  });

  dateFilterMaster.addEventListener('change', () => {
    const isEnabled = dateFilterMaster.checked;
    Object.values(cfg.date.boxes).forEach(box => {
      box.checked = isEnabled;
    });
    saveSettings();
  });

  function updateDateSliderDisabled(slider, enabled) {
    const control = slider.closest('.slider-control');
    if (control) control.classList.toggle('date-sub-disabled', !enabled);
  }

  function checkDateOverlap() {
    const newerEnabled = dateFilterNewerToggle.checked;
    const olderEnabled = dateFilterOlderToggle.checked;
    const newerThreshold = dateSteps[parseInt(cfg.date.newerSlider.value, 10)];
    const olderThreshold = dateSteps[parseInt(cfg.date.olderSlider.value, 10)];

    const isOverlap =
      newerEnabled && olderEnabled && newerThreshold >= olderThreshold;

    const warning = document.getElementById('date-overlap-warning');
    if (warning) warning.style.display = isOverlap ? 'flex' : 'none';

    document.querySelectorAll('.date-sub-filter').forEach(el => {
      el.classList.toggle('date-overlap', isOverlap);
    });
  }

  dateFilterNewerToggle.addEventListener('change', () => {
    updateDateSliderDisabled(
      cfg.date.newerSlider,
      dateFilterNewerToggle.checked,
    );
    checkDateOverlap();
    saveSettings();
  });

  dateFilterOlderToggle.addEventListener('change', () => {
    updateDateSliderDisabled(
      cfg.date.olderSlider,
      dateFilterOlderToggle.checked,
    );
    checkDateOverlap();
    saveSettings();
  });

  cfg.date.newerSlider.addEventListener('input', () => {
    const index = parseInt(cfg.date.newerSlider.value, 10);
    cfg.date.newerValue.textContent = dateStepLabels[index];
    updateSliderBackground(cfg.date.newerSlider);
    checkDateOverlap();
  });
  cfg.date.newerSlider.addEventListener('change', saveSettings);

  cfg.date.olderSlider.addEventListener('input', () => {
    const index = parseInt(cfg.date.olderSlider.value, 10);
    cfg.date.olderValue.textContent = dateStepLabels[index];
    updateSliderBackground(cfg.date.olderSlider);
    checkDateOverlap();
  });
  cfg.date.olderSlider.addEventListener('change', saveSettings);

  [[cfg.hide.slider, cfg.hide.value]].forEach(([slider, display]) => {
    slider.addEventListener('input', () => {
      display.textContent = slider.value;
      updateSliderBackground(slider);
    });
    slider.addEventListener('change', saveSettings);
  });

  cfg.views.slider.addEventListener('input', () => {
    const index = parseInt(cfg.views.slider.value, 10);
    cfg.views.value.textContent = formatViews(viewsSteps[index]);
    updateSliderBackground(cfg.views.slider);
  });
  cfg.views.slider.addEventListener('change', saveSettings);

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
