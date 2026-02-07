document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.sync.set({ onboardingCompleted: true });

  const btnStart = document.getElementById('btn-start');
  btnStart.addEventListener('click', () => {
    window.close();
  });
});
