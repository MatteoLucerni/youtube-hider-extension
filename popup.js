function getBadgeText(skipEnabled, hideHomeCheckbox, hideSearchCheckbox) {
  const hideEnabled = hideHomeCheckbox || hideSearchCheckbox;
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
  const hideSearchCheckbox = document.getElementById('hide-search-enabled');
  // save
  const saveButton = document.getElementById('save');

  chrome.storage.sync.get(
    [
      'skipIntroDelay',
      'skipEnabled',
      'hideThreshold',
      'hideHomeEnabled',
      'hideSearchEnabled',
    ],
    prefs => {
      const {
        skipIntroDelay = 1,
        skipEnabled = true,
        hideThreshold = 70,
        hideHomeEnabled = true,
        hideSearchEnabled = true,
      } = prefs;

      delaySlider.value = skipIntroDelay;
      delayValue.textContent = skipIntroDelay;
      skipEnabledCheckbox.checked = skipEnabled;

      hideSlider.value = hideThreshold;
      hideValue.textContent = hideThreshold;
      hideHomeCheckbox.checked = hideHomeEnabled;
      hideSearchCheckbox.checked = hideSearchEnabled;
    }
  );

  delaySlider.addEventListener('input', () => {
    delayValue.textContent = delaySlider.value;
  });
  hideSlider.addEventListener('input', () => {
    hideValue.textContent = hideSlider.value;
  });

  saveButton.addEventListener('click', () => {
    const skipIntroDelay = parseInt(delaySlider.value, 10);
    const skipEnabled = skipEnabledCheckbox.checked;
    const hideThreshold = parseInt(hideSlider.value, 10);
    const hideHomeEnabled = hideHomeCheckbox.checked;
    const hideSearchEnabled = hideSearchCheckbox.checked;

    chrome.storage.sync.set(
      {
        skipIntroDelay,
        skipEnabled,
        hideThreshold,
        hideHomeEnabled,
        hideSearchEnabled,
      },
      () => {
        const text = getBadgeText(
          skipEnabled,
          hideHomeEnabled,
          hideSearchEnabled
        );
        chrome.action.setBadgeText({ text });
        chrome.action.setBadgeBackgroundColor({
          color:
            skipEnabled || hideHomeEnabled || hideSearchEnabled
              ? '#008000'
              : '#808080',
        });
      }
    );
  });
});
