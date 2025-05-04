function skipIntro() {

  const netflixBtn = document.querySelector(
    "button[data-uia='player-skip-intro']"
  );

  const primeBtnAria = document.querySelector(
    "button[aria-label='Salta intro']"
  );

  const primeBtnAriaEng = document.querySelector(
    "button[aria-label='Skip intro']"
  );

  const primeBtnClass = document.querySelector('.skipElement');
  const primeBtnClassSkip = document.querySelector(
    '.atvwebplayersdk-skipelement-button'
  );

  const skipButton =
    netflixBtn ||
    primeBtnClassSkip ||
    primeBtnAria ||
    primeBtnClass ||
    primeBtnAriaEng;

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
