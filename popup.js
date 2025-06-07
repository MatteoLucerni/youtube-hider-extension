import { debounce } from './utils';

function getBadgeText(
  skipEnabled,
  hideHomeCheckbox,
  hideSearchCheckbox,
  hideCorrCheckbox,
  hideSubsCheckbox
) {
  const hideEnabled =
    hideHomeCheckbox ||
    hideSearchCheckbox ||
    hideSubsCheckbox ||
    hideCorrCheckbox;

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

  function saveSettings() {
    const skipIntroDelay = parseInt(delaySlider.value, 10);
    const skipEnabled = skipEnabledCheckbox.checked;
    const hideThreshold = parseInt(hideSlider.value, 10);
    const hideHomeEnabled = hideHomeCheckbox.checked;
    const hideSearchEnabled = hideSearchCheckbox.checked;
    const hideSubsEnabled = hideSubsCheckbox.checked;
    const hideCorrEnabled = hideCorrCheckbox.checked;

    chrome.storage.sync.set(
      {
        skipIntroDelay,
        skipEnabled,
        hideThreshold,
        hideHomeEnabled,
        hideSearchEnabled,
        hideSubsEnabled,
        hideCorrEnabled,
      },
      () => {
        const text = getBadgeText(
          skipEnabled,
          hideHomeEnabled,
          hideSearchEnabled,
          hideCorrEnabled,
          hideSubsEnabled
        );
        chrome.action.setBadgeText({ text });
        chrome.action.setBadgeBackgroundColor({
          color:
            skipEnabled ||
            hideHomeEnabled ||
            hideSearchEnabled ||
            hideCorrEnabled ||
            hideSubsEnabled
              ? '#008000'
              : '#808080',
        });
      }
    );
  }

  saveSettings();

  const saveSettingsDebounced = debounce(saveSettings, 300);

  chrome.storage.sync.get(
    [
      'skipIntroDelay',
      'skipEnabled',
      'hideThreshold',
      'hideHomeEnabled',
      'hideSearchEnabled',
      'hideSubsEnabled',
      'hideCorrEnabled',
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
    }
  );

  delaySlider.addEventListener('input', () => {
    delayValue.textContent = delaySlider.value;
    saveSettingsDebounced();
  });
  hideSlider.addEventListener('input', () => {
    hideValue.textContent = hideSlider.value;
    saveSettingsDebounced();
  });

  skipEnabledCheckbox.addEventListener('change', saveSettingsDebounced);
  hideHomeCheckbox.addEventListener('change', saveSettingsDebounced);
  hideSearchCheckbox.addEventListener('change', saveSettingsDebounced);
  hideSubsCheckbox.addEventListener('change', saveSettingsDebounced);
  hideCorrCheckbox.addEventListener('change', saveSettingsDebounced);
});
