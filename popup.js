function getBadgeText(skipEnabled, hideEnabled) {
  if (skipEnabled && hideEnabled) return 'A';
  if (skipEnabled) return 'S';
  if (hideEnabled) return 'H';
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

function updateEasyModeUI(isEasyMode) {
  const simpleElements = document.querySelectorAll('.easy-mode-simple');
  const advancedElements = document.querySelectorAll('.easy-mode-advanced');
  simpleElements.forEach(el => {
    el.style.display = isEasyMode ? 'flex' : 'none';
  });
  advancedElements.forEach(el => {
    el.style.display = isEasyMode ? 'none' : 'grid';
  });
}

function setEasyModeClass(isEasy) {
  document.body.classList.toggle('easy-mode-on', isEasy);
  document.body.classList.toggle('easy-mode-off', !isEasy);
}

document.addEventListener('DOMContentLoaded', () => {
  const easyModeToggle = document.getElementById('easy-mode-enabled');
  const hideWatchedMaster = document.getElementById('hide-watched-master');
  const hideShortsMaster = document.getElementById('hide-shorts-master');
  const viewsHideMaster = document.getElementById('views-hide-master');

  const cfg = {
    skip: {
      slider: document.getElementById('delay'),
      value: document.getElementById('delay-value'),
      box: document.getElementById('skip-enabled'),
      keys: { delay: 'skipIntroDelay', enabled: 'skipEnabled' },
      defaults: { delay: 1, enabled: true },
    },
    hide: {
      slider: document.getElementById('perc-hide'),
      value: document.getElementById('perc-hide-value'),
      boxes: {
        home: document.getElementById('hide-home-enabled'),
        search: document.getElementById('hide-search-enabled'),
        subs: document.getElementById('hide-subs-enabled'),
        corr: document.getElementById('hide-corr-enabled'),
      },
      keys: {
        threshold: 'hideThreshold',
        home: 'hideHomeEnabled',
        search: 'hideSearchEnabled',
        subs: 'hideSubsEnabled',
        corr: 'hideCorrEnabled',
      },
      defaults: {
        threshold: 30,
        home: true,
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
        search: document.getElementById('views-hide-search-enabled'),
        subs: document.getElementById('views-hide-subs-enabled'),
        corr: document.getElementById('views-hide-corr-enabled'),
      },
      keys: {
        threshold: 'viewsHideThreshold',
        home: 'viewsHideHomeEnabled',
        search: 'viewsHideSearchEnabled',
        subs: 'viewsHideSubsEnabled',
        corr: 'viewsHideCorrEnabled',
      },
      defaults: {
        threshold: 1000,
        home: true,
        search: true,
        subs: true,
        corr: true,
      },
    },
  };

  const storageKeys = [
    'easyModeEnabled',
    ...Object.values(cfg.skip.keys),
    ...Object.values(cfg.hide.keys),
    ...Object.values(cfg.views.keys),
    ...Object.values(cfg.shorts.keys),
  ];

  chrome.storage.sync.get(storageKeys, prefs => {
    const isFirstInstall = Object.keys(prefs).length === 0;

    const easyMode = prefs.easyModeEnabled ?? true;
    easyModeToggle.checked = easyMode;
    updateEasyModeUI(easyMode);
    setEasyModeClass(easyMode);

    ['skip', 'hide', 'views', 'shorts'].forEach(sectionName => {
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
      search: prefs.viewsHideSearchEnabled ?? cfg.views.defaults.search,
      subs: prefs.viewsHideSubsEnabled ?? cfg.views.defaults.subs,
      corr: prefs.viewsHideCorrEnabled ?? cfg.views.defaults.corr,
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
        Object.entries(cfg.skip.keys).map(([k, key]) => [
          key,
          k === 'delay'
            ? parseInt(cfg.skip.slider.value, 10)
            : cfg.skip.box.checked,
        ])
      ),
      ...Object.fromEntries(
        Object.entries(cfg.hide.keys).map(([k, key]) => [
          key,
          k === 'threshold'
            ? parseInt(cfg.hide.slider.value, 10)
            : cfg.hide.boxes[k].checked,
        ])
      ),
      ...Object.fromEntries(
        Object.entries(cfg.views.keys).map(([k, key]) => [
          key,
          k === 'threshold'
            ? viewsSteps[parseInt(cfg.views.slider.value, 10)]
            : cfg.views.boxes[k].checked,
        ])
      ),
      ...Object.fromEntries(
        Object.entries(cfg.shorts.keys).map(([k, key]) => [
          key,
          cfg.shorts.boxes[k].checked,
        ])
      ),
    };

    chrome.storage.sync.set(settings, () => {
      const skipOn = settings[cfg.skip.keys.enabled];
      const hideOn = isAnyTrue({
        ...Object.fromEntries(
          Object.entries(cfg.hide.boxes).map(([k]) => [
            k,
            settings[cfg.hide.keys[k]],
          ])
        ),
        ...Object.fromEntries(
          Object.entries(cfg.views.boxes).map(([k]) => [
            k,
            settings[cfg.views.keys[k]],
          ])
        ),
        ...Object.fromEntries(
          Object.entries(cfg.shorts.boxes).map(([k]) => [
            k,
            settings[cfg.shorts.keys[k]],
          ])
        ),
      });
      const text = getBadgeText(skipOn, hideOn);
      chrome.action.setBadgeText({ text });
      chrome.action.setBadgeBackgroundColor({
        color: skipOn || hideOn ? '#008000' : '#808080',
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
      hideWatchedMaster.checked = true;
      hideShortsMaster.checked = true;
      viewsHideMaster.checked = true;
    }
    setEasyModeClass(isEasyMode);
    saveSettings();
  });

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

  [
    [cfg.skip.slider, cfg.skip.value],
    [cfg.hide.slider, cfg.hide.value],
  ].forEach(([slider, display]) => {
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
    cfg.skip.box,
    ...Object.values(cfg.hide.boxes),
    ...Object.values(cfg.views.boxes),
    ...Object.values(cfg.shorts.boxes),
  ].forEach(box => box.addEventListener('change', saveSettings));
});
