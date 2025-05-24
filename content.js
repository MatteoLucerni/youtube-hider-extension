function skipIntro() {
  const netflixBtn = document.querySelector(
    "button[data-uia='player-skip-intro']"
  );

  const primeBtnClassSkip = document.querySelector(
    '[class*="skipelement-button"]'
  );

  const netflixRecapBtn =
    document.querySelector(
      "button[data-uia='viewer-skip-recap'], button[data-uia='player-skip-recap']"
    ) || document.querySelector('[class*="skip-recap"], [class*="SkipRecap"]');

  const skipButton = netflixBtn || primeBtnClassSkip || netflixRecapBtn;

  if (skipButton) {
    chrome.storage.sync.get(['skipIntroDelay', 'skipEnabled'], result => {
      if (!result.skipEnabled) return;

      const delay =
        result.skipIntroDelay !== undefined ? result.skipIntroDelay : 1;
      console.log(`Button found. Clicking in ${delay} s…`);
      setTimeout(() => {
        skipButton.click();
        console.log('Skipped');
      }, delay * 1000);
    });
  }
}

function hideWatched() {
  const progressBars = document.querySelectorAll(
    'ytd-thumbnail-overlay-resume-playback-renderer #progress'
  );

  progressBars.forEach(bar => {
    const w = bar.style.width;
    const pct = parseFloat(w) || 0;
    if (pct > 70) {
      let item = bar;
      while (item && !item.matches('ytd-rich-item-renderer')) {
        item = item.parentElement;
      }
      if (item) {
        item.style.display = 'none';
      }
    }
  });
}

function onMutations(mutations) {
  skipIntro();
  hideWatched();
}

skipIntro();
hideWatched();

const observer = new MutationObserver(onMutations);
observer.observe(document.body, { childList: true, subtree: true });

console.log('Skipper is active');
