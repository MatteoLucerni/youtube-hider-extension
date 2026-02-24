let warningDismissed = false;
let warningElement = null;
let warningProgressInterval = null;

let rapidLoaderCount = 0;
let lastScrollY = 0;
let lastLoaderTime = 0;
const LOADER_THRESHOLD = 4;
const LOADER_RESET_TIME = 10000;

function removeWarning() {
  if (warningElement) {
    warningElement.remove();
    warningElement = null;
  }
  if (warningProgressInterval) {
    clearInterval(warningProgressInterval);
    warningProgressInterval = null;
  }
  warningDismissed = true;
}

function showHighFilteringWarning() {
  if (warningElement || warningDismissed) return;

  warningElement = document.createElement('div');
  warningElement.id = 'yh-filter-warning';

  Object.assign(warningElement.style, {
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    backgroundColor: '#222222',
    borderLeft: '4px solid #8ab4f8',
    color: '#ebebeb',
    padding: '12px 16px 16px 16px',
    borderRadius: '4px',
    zIndex: '2147483647',
    boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontSize: '13px',
    maxWidth: '280px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    opacity: '0',
    transition: 'opacity 0.3s ease',
    overflow: 'hidden',
    pointerEvents: 'auto',
  });

  const headerRow = document.createElement('div');
  Object.assign(headerRow.style, {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: '2px',
  });

  const branding = document.createElement('div');
  Object.assign(branding.style, {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  });

  const icon = document.createElement('img');
  icon.src = chrome.runtime.getURL('assets/icons/youtube-hider-logo.png');
  Object.assign(icon.style, {
    width: '16px',
    height: '16px',
    display: 'block',
    objectFit: 'contain',
  });

  const title = document.createElement('span');
  title.textContent = 'Youtube Hider Extension';
  Object.assign(title.style, {
    fontWeight: '600',
    fontSize: '12px',
    color: '#8ab4f8',
  });

  branding.appendChild(icon);
  branding.appendChild(title);

  const closeBtn = document.createElement('div');
  closeBtn.textContent = '✕';
  Object.assign(closeBtn.style, {
    cursor: 'pointer',
    color: '#aaa',
    fontSize: '14px',
    fontWeight: 'bold',
    lineHeight: '1',
    padding: '2px',
  });

  closeBtn.onmouseenter = () => {
    closeBtn.style.color = '#fff';
  };
  closeBtn.onmouseleave = () => {
    closeBtn.style.color = '#aaa';
  };
  closeBtn.onclick = e => {
    e.stopPropagation();
    removeWarning();
  };

  headerRow.appendChild(branding);
  headerRow.appendChild(closeBtn);

  const msg = document.createElement('span');
  msg.textContent =
    'High filtering detected. Try lowering filters if loading gets stuck.';
  msg.style.lineHeight = '1.4';
  msg.style.color = '#e0e0e0';

  const progressBar = document.createElement('div');
  Object.assign(progressBar.style, {
    position: 'absolute',
    bottom: '0',
    left: '0',
    height: '3px',
    backgroundColor: '#8ab4f8',
    width: '100%',
    transition: 'width 0.1s linear',
  });

  warningElement.appendChild(headerRow);
  warningElement.appendChild(msg);
  warningElement.appendChild(progressBar);
  document.body.appendChild(warningElement);

  requestAnimationFrame(() => {
    if (warningElement) warningElement.style.opacity = '1';
  });

  let timeLeft = 10000;
  const updateInterval = 100;
  let isPaused = false;

  warningElement.onmouseenter = () => {
    isPaused = true;
  };
  warningElement.onmouseleave = () => {
    isPaused = false;
  };
  warningElement.onclick = () => removeWarning();

  warningProgressInterval = setInterval(() => {
    if (isPaused) return;

    timeLeft -= updateInterval;
    const percentage = (timeLeft / 10000) * 100;

    if (progressBar) {
      progressBar.style.width = `${percentage}%`;
    }

    if (timeLeft <= 0) {
      removeWarning();
    }
  }, updateInterval);
}

function detectInfiniteLoaderLoop(mutations) {
  if (warningDismissed || warningElement) return;
  if (window.location.pathname === '/watch') return;

  const now = Date.now();
  const currentScroll = window.scrollY;
  let loaderFound = false;

  if (now - lastLoaderTime > LOADER_RESET_TIME) {
    rapidLoaderCount = 0;
  }

  for (const mutation of mutations) {
    if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType !== 1) continue;
        const loaderSelectors =
          'ytd-continuation-item-renderer, ytm-continuation-item-renderer, ytm-spinner, .spinner, .yt-spinner, .loading-spinner';

        if (
          node.matches(loaderSelectors) ||
          node.querySelector(loaderSelectors)
        ) {
          loaderFound = true;
          break;
        }
      }
    }
    if (loaderFound) break;
  }

  if (loaderFound) {
    const scrollDiff = Math.abs(currentScroll - lastScrollY);

    if (scrollDiff < 100) {
      rapidLoaderCount++;
      lastLoaderTime = now;

      if (rapidLoaderCount >= LOADER_THRESHOLD) {
        showHighFilteringWarning();
      }
    } else {
      rapidLoaderCount = 0;
    }

    lastScrollY = currentScroll;
  }
}
