chrome.runtime.onInstalled.addListener(() => {
  console.log('Skipper installed');
});

// Colori e testo
const BADGE_ON = { text: 'A', color: '#008000' }; // verde
const BADGE_OFF = { text: 'D', color: '#808080' }; // grigio

// Imposta badge in base allo stato
function updateBadge(isEnabled) {
  if (isEnabled) {
    chrome.action.setBadgeText({ text: BADGE_ON.text });
    chrome.action.setBadgeBackgroundColor({ color: BADGE_ON.color });
  } else {
    chrome.action.setBadgeText({ text: BADGE_OFF.text });
    chrome.action.setBadgeBackgroundColor({ color: BADGE_OFF.color });
  }
}

// All’avvio: leggi da storage e inizializza badge
chrome.storage.sync.get({ skipEnabled: true }, ({ skipEnabled }) => {
  updateBadge(skipEnabled);
});

// Ogni volta che skipEnabled cambia, aggiorna badge
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync' && changes.skipEnabled) {
    updateBadge(changes.skipEnabled.newValue);
  }
});
