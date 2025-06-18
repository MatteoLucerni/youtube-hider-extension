function getBadgeText(skipEnabled, hideEnabled) {
  if (skipEnabled && hideEnabled) return 'A';
  if (skipEnabled) return 'S';
  if (hideEnabled) return 'H';
  return 'OFF';
}

function isAnyTrue(flags) {
  return Object.values(flags).some(Boolean);
}

document.addEventListener('DOMContentLoaded', () => {
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
        threshold: 70,
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
    ...Object.values(cfg.skip.keys),
    ...Object.values(cfg.hide.keys),
    ...Object.values(cfg.views.keys),
    ...Object.values(cfg.shorts.keys),
  ];

  chrome.storage.sync.get(storageKeys, prefs => {
    // Skip
    const skipDelay = prefs[cfg.skip.keys.delay] ?? cfg.skip.defaults.delay;
    const skipEnabled =
      prefs[cfg.skip.keys.enabled] ?? cfg.skip.defaults.enabled;
    cfg.skip.slider.value = skipDelay;
    cfg.skip.value.textContent = skipDelay;
    cfg.skip.box.checked = skipEnabled;

    // Watched hide
    const hideThresh =
      prefs[cfg.hide.keys.threshold] ?? cfg.hide.defaults.threshold;
    cfg.hide.slider.value = hideThresh;
    cfg.hide.value.textContent = hideThresh;
    for (let key in cfg.hide.boxes) {
      cfg.hide.boxes[key].checked =
        prefs[cfg.hide.keys[key]] ?? cfg.hide.defaults[key];
    }

    // Views hide
    const viewsThresh =
      prefs[cfg.views.keys.threshold] ?? cfg.views.defaults.threshold;
    cfg.views.slider.value = viewsThresh;
    cfg.views.value.textContent = viewsThresh;
    for (let key in cfg.views.boxes) {
      cfg.views.boxes[key].checked =
        prefs[cfg.views.keys[key]] ?? cfg.views.defaults[key];
    }

    // Shorts hide
    const shortsEnabled =
      prefs[cfg.shorts.keys.enabled] ?? cfg.shorts.defaults.enabled;
    const shortsSearchEnabled =
      prefs[cfg.shorts.keys.search] ?? cfg.shorts.defaults.search;

    cfg.shorts.boxes.enabled.checked = shortsEnabled;
    cfg.shorts.boxes.search.checked = shortsSearchEnabled;
  });

  function saveSettings() {
    const settings = {
      // Skip
      ...Object.fromEntries(
        Object.entries(cfg.skip.keys).map(([k, key]) => [
          key,
          k === 'delay'
            ? parseInt(cfg.skip.slider.value, 10)
            : cfg.skip.box.checked,
        ])
      ),
      // Hide watched
      ...Object.fromEntries(
        Object.entries(cfg.hide.keys).map(([k, key]) => [
          key,
          k === 'threshold'
            ? parseInt(cfg.hide.slider.value, 10)
            : cfg.hide.boxes[k].checked,
        ])
      ),
      // Hide Views
      ...Object.fromEntries(
        Object.entries(cfg.views.keys).map(([k, key]) => [
          key,
          k === 'threshold'
            ? parseInt(cfg.views.slider.value, 10)
            : cfg.views.boxes[k].checked,
        ])
      ),
      // Hide Shorts
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
        // Hide watched
        ...Object.fromEntries(
          Object.entries(cfg.hide.boxes).map(([k]) => [
            k,
            settings[cfg.hide.keys[k]],
          ])
        ),
        // Hide Views
        ...Object.fromEntries(
          Object.entries(cfg.views.boxes).map(([k]) => [
            k,
            settings[cfg.views.keys[k]],
          ])
        ),
        // Hide Shorts
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

  [
    [cfg.skip.slider, cfg.skip.value],
    [cfg.hide.slider, cfg.hide.value],
    [cfg.views.slider, cfg.views.value],
  ].forEach(([slider, display]) => {
    slider.addEventListener(
      'input',
      () => (display.textContent = slider.value)
    );
    slider.addEventListener('change', saveSettings);
  });

  [
    cfg.skip.box,
    ...Object.values(cfg.hide.boxes),
    ...Object.values(cfg.views.boxes),
    cfg.shorts.box,
  ].forEach(box => box.addEventListener('change', saveSettings));
});
