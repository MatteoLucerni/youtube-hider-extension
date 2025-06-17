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
      box: document.getElementById('hide-shorts-enabled'),
      keys: { enabled: 'hideShorstsEnabled' },
      defaults: { enabled: true },
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
    cfg.skip.keys.delay,
    cfg.skip.keys.enabled,
    cfg.hide.keys.threshold,
    ...Object.values(cfg.hide.keys),
    cfg.views.keys.threshold,
    ...Object.values(cfg.views.keys),
    cfg.shorts.keys.enabled,
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

    // Shorts hide
    const shortsEnabled =
      prefs[cfg.hide.keys.shorts] ?? cfg.hide.defaults.shorts;
    cfg.shorts.box.checked = shortsEnabled;

    // Views hide
    const viewsThresh =
      prefs[cfg.views.keys.threshold] ?? cfg.views.defaults.threshold;
    cfg.views.slider.value = viewsThresh;
    cfg.views.value.textContent = viewsThresh;
    for (let key in cfg.views.boxes) {
      cfg.views.boxes[key].checked =
        prefs[cfg.views.keys[key]] ?? cfg.views.defaults[key];
    }
  });

  function saveSettings() {
    const settings = {
      // Skip
      [cfg.skip.keys.delay]: parseInt(cfg.skip.slider.value, 10),
      [cfg.skip.keys.enabled]: cfg.skip.box.checked,
      // Watched hide
      [cfg.hide.keys.threshold]: parseInt(cfg.hide.slider.value, 10),
      ...Object.fromEntries(
        Object.entries(cfg.hide.boxes).map(([k, box]) => [
          cfg.hide.keys[k],
          box.checked,
        ])
      ),
      // Shorts hide
      [cfg.shorts.keys.enabled]: cfg.shorts.box.checked,
      // Views hide
      [cfg.views.keys.threshold]: parseInt(cfg.views.slider.value, 10),
      ...Object.fromEntries(
        Object.entries(cfg.views.boxes).map(([k, box]) => [
          cfg.views.keys[k],
          box.checked,
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
        [cfg.shorts.keys.enabled]: settings[cfg.shorts.keys.enabled],
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
