function getBadgeText(
  skipEnabled,
  hideHomeCheckbox,
  hideSearchCheckbox,
  hideCorrCheckbox,
  hideSubsCheckbox,
  viewsHideHomeEnabled,
  viewsHideSearchEnabled,
  viewsHideSubsEnabled,
  viewsHideCorrEnabled
) {
  const hideEnabled =
    hideHomeCheckbox ||
    hideSearchCheckbox ||
    hideSubsCheckbox ||
    hideCorrCheckbox ||
    viewsHideHomeEnabled ||
    viewsHideSearchEnabled ||
    viewsHideSubsEnabled ||
    viewsHideCorrEnabled;

  if (skipEnabled && hideEnabled) {
    return 'A';
  } else if (skipEnabled) {
    return 'S';
  } else if (hideEnabled) {
    return 'H';
  } else {
    return 'OFF';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  // skip
  const delaySlider = document.getElementById('delay');
  const delayValue = document.getElementById('delay-value');
  const skipEnabledCheckbox = document.getElementById('skip-enabled');
  // hide
  const hideSlider = document.getElementById('perc-hide');
  const hideValue = document.getElementById('perc-hide-value');
  const hideHomeCheckbox = document.getElementById('hide-home-enabled');
  const hideSubsCheckbox = document.getElementById('hide-subs-enabled');
  const hideSearchCheckbox = document.getElementById('hide-search-enabled');
  const hideCorrCheckbox = document.getElementById('hide-corr-enabled');
  // views
  const viewsHideSlider = document.getElementById('views-hide');
  const viewsHideValue = document.getElementById('views-hide-value');
  const viewsHideHomeCheckbox = document.getElementById(
    'views-hide-home-enabled'
  );
  const viewsHideSubsCheckbox = document.getElementById(
    'views-hide-subs-enabled'
  );
  const viewsHideSearchCheckbox = document.getElementById(
    'views-hide-search-enabled'
  );
  const viewsHideCorrCheckbox = document.getElementById(
    'views-hide-corr-enabled'
  );

  chrome.storage.sync.get(
    [
      'skipIntroDelay',
      'skipEnabled',
      'hideThreshold',
      'hideHomeEnabled',
      'hideSearchEnabled',
      'hideSubsEnabled',
      'hideCorrEnabled',
      'viewsHideThreshold',
      'viewsHideHomeEnabled',
      'viewsHideSearchEnabled',
      'viewsHideSubsEnabled',
      'viewsHideCorrEnabled',
    ],
    prefs => {
      const {
        skipIntroDelay = 1,
        skipEnabled = true,
        hideThreshold = 70,
        hideHomeEnabled = true,
        hideSearchEnabled = true,
        hideSubsEnabled = true,
        hideCorrEnabled = true,
        viewsHideThreshold = 1000,
        viewsHideHomeEnabled = true,
        viewsHideSearchEnabled = true,
        viewsHideSubsEnabled = true,
        viewsHideCorrEnabled = true,
      } = prefs;

      delaySlider.value = skipIntroDelay;
      delayValue.textContent = skipIntroDelay;
      skipEnabledCheckbox.checked = skipEnabled;

      hideSlider.value = hideThreshold;
      hideValue.textContent = hideThreshold;
      hideHomeCheckbox.checked = hideHomeEnabled;
      hideSearchCheckbox.checked = hideSearchEnabled;
      hideSubsCheckbox.checked = hideSubsEnabled;
      hideCorrCheckbox.checked = hideCorrEnabled;

      viewsHideSlider.value = viewsHideThreshold;
      viewsHideValue.textContent = viewsHideThreshold;
      viewsHideHomeCheckbox.checked = viewsHideHomeEnabled;
      viewsHideSearchCheckbox.checked = viewsHideSearchEnabled;
      viewsHideSubsCheckbox.checked = viewsHideSubsEnabled;
      viewsHideCorrCheckbox.checked = viewsHideCorrEnabled;
    }
  );

  function saveUserSettings() {
    const skipIntroDelay = parseInt(delaySlider.value, 10);
    const skipEnabled = skipEnabledCheckbox.checked;

    const hideThreshold = parseInt(hideSlider.value, 10);
    const hideHomeEnabled = hideHomeCheckbox.checked;
    const hideSearchEnabled = hideSearchCheckbox.checked;
    const hideSubsEnabled = hideSubsCheckbox.checked;
    const hideCorrEnabled = hideCorrCheckbox.checked;

    const viewsHideThreshold = parseInt(viewsHideSlider.value, 10);
    const viewsHideHomeEnabled = viewsHideHomeCheckbox.checked;
    const viewsHideSearchEnabled = viewsHideSearchCheckbox.checked;
    const viewsHideSubsEnabled = viewsHideSubsCheckbox.checked;
    const viewsHideCorrEnabled = viewsHideCorrCheckbox.checked;

    chrome.storage.sync.set(
      {
        skipIntroDelay,
        skipEnabled,
        hideThreshold,
        hideHomeEnabled,
        hideSearchEnabled,
        hideSubsEnabled,
        hideCorrEnabled,
        viewsHideThreshold,
        viewsHideHomeEnabled,
        viewsHideSearchEnabled,
        viewsHideSubsEnabled,
        viewsHideCorrEnabled,
      },
      () => {
        const text = getBadgeText(
          skipEnabled,
          hideHomeEnabled,
          hideSearchEnabled,
          hideCorrEnabled,
          hideSubsEnabled,
          viewsHideHomeEnabled,
          viewsHideSearchEnabled,
          viewsHideSubsEnabled,
          viewsHideCorrEnabled
        );
        chrome.action.setBadgeText({ text });
        chrome.action.setBadgeBackgroundColor({
          color:
            skipEnabled ||
            hideHomeEnabled ||
            hideSearchEnabled ||
            hideCorrEnabled ||
            hideSubsEnabled ||
            viewsHideHomeEnabled ||
            viewsHideSearchEnabled ||
            viewsHideSubsEnabled ||
            viewsHideCorrEnabled
              ? '#008000'
              : '#808080',
        });
      }
    );
  }

  delaySlider.addEventListener('input', () => {
    delayValue.textContent = delaySlider.value;
    saveUserSettings();
  });
  hideSlider.addEventListener('input', () => {
    hideValue.textContent = hideSlider.value;
    saveUserSettings();
  });
  viewsHideSlider.addEventListener('input', () => {
    viewsHideValue.textContent = viewsHideSlider.value;
    saveUserSettings();
  });

  skipEnabledCheckbox.addEventListener('change', saveUserSettings);

  hideHomeCheckbox.addEventListener('change', saveUserSettings);
  hideSearchCheckbox.addEventListener('change', saveUserSettings);
  hideSubsCheckbox.addEventListener('change', saveUserSettings);
  hideCorrCheckbox.addEventListener('change', saveUserSettings);

  viewsHideHomeCheckbox.addEventListener('change', saveUserSettings);
  viewsHideSearchCheckbox.addEventListener('change', saveUserSettings);
  viewsHideSubsCheckbox.addEventListener('change', saveUserSettings);
  viewsHideCorrCheckbox.addEventListener('change', saveUserSettings);
});
