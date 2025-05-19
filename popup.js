document.addEventListener('DOMContentLoaded', () => {
  const delaySlider = document.getElementById('delay');
  const delayValue = document.getElementById('delay-value');
  const enabledCheckbox = document.getElementById('enabled');
  const saveButton = document.getElementById('save');

  chrome.storage.sync.get(['skipIntroDelay', 'skipEnabled'], result => {
    const delay =
      result.skipIntroDelay !== undefined ? result.skipIntroDelay : 1;
    const enabled =
      result.skipEnabled !== undefined ? result.skipEnabled : true;

    delaySlider.value = delay;
    delayValue.textContent = delay;
    enabledCheckbox.checked = enabled;
  });

  delaySlider.addEventListener('input', () => {
    delayValue.textContent = delaySlider.value;
  });

  saveButton.addEventListener('click', () => {
    const delay = parseInt(delaySlider.value, 10);
    const enabled = enabledCheckbox.checked;

    chrome.storage.sync.set(
      { skipIntroDelay: delay, skipEnabled: enabled },
      () => {
        // Aggiorna badge da qui (facoltativo)
        chrome.action.setBadgeText({ text: enabled ? 'A' : 'D' });
        chrome.action.setBadgeBackgroundColor({
          color: enabled ? '#008000' : '#808080',
        });

        const msg = enabled
          ? 'Funzionalità attivata e ritardo salvato!'
          : 'Funzionalità disattivata e ritardo salvato!';
        console.log(msg);
      }
    );
  });
});
