function skipIntro() {
  const netflixBtn = document.querySelector(
    "button[data-uia='player-skip-intro']"
  );

  const primeBtnClassSkip = document.querySelector(
    '[class*="skipelement-button"]'
  );

  const skipButton =
    netflixBtn ||
    primeBtnClassSkip

  if (skipButton) {
    chrome.storage.sync.get(['skipIntroDelay'], result => {
      const delay =
        result.skipIntroDelay !== undefined ? result.skipIntroDelay : 1;
      console.log(`Trovato 'Salta intro'. Clicco tra ${delay} s…`);
      setTimeout(() => {
        skipButton.click();
        console.log('Intro saltata!');
      }, delay * 1000);
    });
  }
}

const observer = new MutationObserver(skipIntro);
observer.observe(document.body, { childList: true, subtree: true });

console.log('Skip Intro estensione attivo');
