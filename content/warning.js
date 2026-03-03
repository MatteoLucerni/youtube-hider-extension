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
    border: '1px solid #3a3a3a',
    color: '#ebebeb',
    padding: '0',
    borderRadius: '10px',
    zIndex: '2147483647',
    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontSize: '13px',
    maxWidth: '280px',
    display: 'flex',
    flexDirection: 'column',
    opacity: '0',
    transform: 'scale(0.92) translateY(8px)',
    transformOrigin: 'bottom right',
    transition:
      'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s ease',
    overflow: 'hidden',
    pointerEvents: 'auto',
  });

  const headerRow = document.createElement('div');
  Object.assign(headerRow.style, {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    padding: '12px 14px 10px',
    borderBottom: '1px solid #3a3a3a',
    boxSizing: 'border-box',
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
    width: '18px',
    height: '18px',
    display: 'block',
    objectFit: 'contain',
  });

  const title = document.createElement('span');
  title.textContent = 'Youtube Hider Extension';
  Object.assign(title.style, {
    fontWeight: '700',
    fontSize: '14px',
    background: 'linear-gradient(135deg, #8ab4f8, #6ba3ff)',
    WebkitBackgroundClip: 'text',
    backgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
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
    padding: '2px 4px',
    borderRadius: '4px',
    transition: 'color 0.15s, background 0.15s',
  });

  closeBtn.onmouseenter = () => {
    closeBtn.style.color = '#fff';
    closeBtn.style.background = '#3a3a3a';
  };
  closeBtn.onmouseleave = () => {
    closeBtn.style.color = '#aaa';
    closeBtn.style.background = '';
  };
  closeBtn.onclick = e => {
    e.stopPropagation();
    removeWarning();
  };

  headerRow.appendChild(branding);
  headerRow.appendChild(closeBtn);

  const bodyDiv = document.createElement('div');
  Object.assign(bodyDiv.style, {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    padding: '10px 14px 14px',
  });

  const msg = document.createElement('span');
  msg.textContent =
    'High filtering detected. Try lowering filters if loading gets stuck.';
  msg.style.lineHeight = '1.4';
  msg.style.color = '#ebebeb';

  bodyDiv.appendChild(msg);

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
  warningElement.appendChild(bodyDiv);
  warningElement.appendChild(progressBar);
  document.body.appendChild(warningElement);

  requestAnimationFrame(() => {
    if (warningElement) {
      warningElement.style.opacity = '1';
      warningElement.style.transform = 'scale(1) translateY(0)';
    }
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

function dismissWhatsNewToast(toast) {
  if (toast) toast.remove();
  chrome.storage.local.remove('whatsNewVersion');
}

function showWhatsNewToast(version) {
  const toast = document.createElement('div');
  toast.id = 'yh-whats-new-toast';

  Object.assign(toast.style, {
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    backgroundColor: '#222222',
    border: '1px solid #3a3a3a',
    color: '#ebebeb',
    padding: '0',
    borderRadius: '10px',
    zIndex: '2147483647',
    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontSize: '13px',
    maxWidth: '280px',
    display: 'flex',
    flexDirection: 'column',
    opacity: '0',
    transform: 'scale(0.92) translateY(8px)',
    transformOrigin: 'bottom right',
    transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s ease',
    overflow: 'hidden',
    pointerEvents: 'auto',
  });

  const headerRow = document.createElement('div');
  Object.assign(headerRow.style, {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    padding: '12px 14px 10px',
    borderBottom: '1px solid #3a3a3a',
    boxSizing: 'border-box',
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
    width: '18px',
    height: '18px',
    display: 'block',
    objectFit: 'contain',
  });

  const titleEl = document.createElement('span');
  titleEl.textContent = 'Youtube Hider Extension';
  Object.assign(titleEl.style, {
    fontWeight: '700',
    fontSize: '14px',
    background: 'linear-gradient(135deg, #8ab4f8, #6ba3ff)',
    WebkitBackgroundClip: 'text',
    backgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  });

  branding.appendChild(icon);
  branding.appendChild(titleEl);

  const closeBtn = document.createElement('div');
  closeBtn.textContent = '✕';
  Object.assign(closeBtn.style, {
    cursor: 'pointer',
    color: '#aaa',
    fontSize: '14px',
    fontWeight: 'bold',
    lineHeight: '1',
    padding: '2px 4px',
    borderRadius: '4px',
    transition: 'color 0.15s, background 0.15s',
  });

  closeBtn.onmouseenter = () => {
    closeBtn.style.color = '#fff';
    closeBtn.style.background = '#3a3a3a';
  };
  closeBtn.onmouseleave = () => {
    closeBtn.style.color = '#aaa';
    closeBtn.style.background = '';
  };
  closeBtn.onclick = e => {
    e.stopPropagation();
    dismissWhatsNewToast(toast);
  };

  headerRow.appendChild(branding);
  headerRow.appendChild(closeBtn);

  const bodyDiv = document.createElement('div');
  Object.assign(bodyDiv.style, {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    padding: '10px 14px 14px',
  });

  const msg = document.createElement('span');
  msg.textContent = `Updated to v${version}. Check out what's new!`;
  msg.style.lineHeight = '1.4';
  msg.style.color = '#ebebeb';

  const ctaBtn = document.createElement('button');
  ctaBtn.textContent = "See what's new";
  Object.assign(ctaBtn.style, {
    padding: '7px 14px',
    background: '#10b981',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '12.5px',
    fontWeight: '600',
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'background 0.15s ease',
    alignSelf: 'flex-start',
  });

  ctaBtn.onmouseenter = () => { ctaBtn.style.background = '#0d9668'; };
  ctaBtn.onmouseleave = () => { ctaBtn.style.background = '#10b981'; };
  ctaBtn.onclick = e => {
    e.stopPropagation();
    dismissWhatsNewToast(toast);
    chrome.runtime.sendMessage({ action: 'openSettings' });
  };

  bodyDiv.appendChild(msg);
  bodyDiv.appendChild(ctaBtn);

  toast.appendChild(headerRow);
  toast.appendChild(bodyDiv);
  document.body.appendChild(toast);

  requestAnimationFrame(() => {
    if (toast) {
      toast.style.opacity = '1';
      toast.style.transform = 'scale(1) translateY(0)';
    }
  });
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
