document.addEventListener('DOMContentLoaded', () => {
  const delaySlider = document.getElementById('delay');
  const delayValue = document.getElementById('delay-value');
  const saveButton = document.getElementById('save');

  chrome.storage.sync.get(['skipIntroDelay'], result => {
    const delay =
      result.skipIntroDelay !== undefined ? result.skipIntroDelay : 1;
    delaySlider.value = delay;
    delayValue.textContent = delay;
  });

  delaySlider.addEventListener('input', () => {
    delayValue.textContent = delaySlider.value;
  });

  saveButton.addEventListener('click', () => {
    const delay = parseInt(delaySlider.value, 10);
    chrome.storage.sync.set({ skipIntroDelay: delay }, () => {
      alert('Ritardo salvato con successo!');
    });
  });
});
