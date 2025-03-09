function skipIntro() {
  const skipButton = document.querySelector(
    "button[data-uia='player-skip-intro']"
  );
  if (skipButton) {
    chrome.storage.sync.get(['skipIntroDelay'], result => {
      const delay =
        result.skipIntroDelay !== undefined ? result.skipIntroDelay : 1;
      console.log(
        `Il pulsante 'Salta intro' è stato trovato. Cliccando tra ${delay} secondi...`
      );
      setTimeout(() => {
        skipButton.click();
        console.log('Intro saltata!');
      }, delay * 1000);
    });
  }
}

const observer = new MutationObserver(skipIntro);
observer.observe(document.body, { childList: true, subtree: true });

console.log('Netflix Skip Intro attivo');
