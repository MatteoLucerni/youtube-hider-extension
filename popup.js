function getBadgeText(skipEnabled, hideEnabled) {
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
  const hideEnabledCheckbox = document.getElementById('hide-enabled');
  // save
  const saveButton = document.getElementById('save');

  chrome.storage.sync.get(
    ['skipIntroDelay', 'skipEnabled', 'hideThreshold', 'hideEnabled'],
    result => {
      const delay =
        result.skipIntroDelay !== undefined ? result.skipIntroDelay : 1;
      const skipEnabled =
        result.skipEnabled !== undefined ? result.skipEnabled : true;
      const hideThreshold =
        result.hideThreshold !== undefined ? result.hideThreshold : 70;
      const hideEnabled =
        result.hideEnabled !== undefined ? result.hideEnabled : true;

      delaySlider.value = delay;
      delayValue.textContent = delay;
      skipEnabledCheckbox.checked = skipEnabled;

      hideSlider.value = hideThreshold;
      hideValue.textContent = hideThreshold;
      hideEnabledCheckbox.checked = hideEnabled;
    }
  );

  delaySlider.addEventListener('input', () => {
    delayValue.textContent = delaySlider.value;
  });
  hideSlider.addEventListener('input', () => {
    hideValue.textContent = hideSlider.value;
  });

  saveButton.addEventListener('click', () => {
    const delay = parseInt(delaySlider.value, 10);
    const skipEnabled = skipEnabledCheckbox.checked;
    const hideThreshold = parseInt(hideSlider.value, 10);
    const hideEnabled = hideEnabledCheckbox.checked;

    chrome.storage.sync.set(
      { skipIntroDelay: delay, skipEnabled, hideThreshold, hideEnabled },
      () => {
        chrome.action.setBadgeText({
          text: getBadgeText(skipEnabled, hideEnabled),
        });

        chrome.action.setBadgeBackgroundColor({
          color: skipEnabled || hideEnabled ? '#008000' : '#808080',
        });
      }
    );
  });
});
