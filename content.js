const TIMING = {
  DEBOUNCE_MUTATIONS: 100,
  PAGE_CHANGE_DELAY: 100,
  ELEMENT_POLL_INTERVAL: 50,
};

const prefs = {
  skipIntroDelay: 1,
  skipEnabled: true,
  hideThreshold: 20,
  hideHomeEnabled: true,
  hideChannelEnabled: true,
  hideSearchEnabled: true,
  hideSubsEnabled: true,
  hideCorrEnabled: true,
  viewsHideThreshold: 1000,
  viewsHideHomeEnabled: true,
  viewsHideChannelEnabled: true,
  viewsHideSearchEnabled: true,
  viewsHideSubsEnabled: true,
  viewsHideCorrEnabled: true,
  hideShortsEnabled: true,
  hideShortsSearchEnabled: true,
  floatingButtonEnabled: true,
  floatingButtonPosition: { edge: 'bottom', offset: 20 },
  welcomeToastCount: 0,
  welcomeToastDismissed: false,
  fabPulseCount: 0,
  firstActionToastShown: false,
  panelTooltipShown: false,
};

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

// ─── Welcome Toast (shown on first N YouTube visits) ─────────────────────────
let welcomeToastElement = null;
let welcomeToastInterval = null;

function removeWelcomeToast() {
  if (welcomeToastElement) {
    welcomeToastElement.style.opacity = '0';
    setTimeout(() => {
      if (welcomeToastElement) {
        welcomeToastElement.remove();
        welcomeToastElement = null;
      }
    }, 300);
  }
  if (welcomeToastInterval) {
    clearInterval(welcomeToastInterval);
    welcomeToastInterval = null;
  }
}

function showWelcomeToast() {
  if (!isYouTube()) return;
  if (welcomeToastElement) return;
  if (prefs.welcomeToastDismissed) return;
  if (prefs.welcomeToastCount >= 5) return;

  chrome.storage.sync.set({ welcomeToastCount: prefs.welcomeToastCount + 1 });

  welcomeToastElement = document.createElement('div');
  welcomeToastElement.id = 'yh-welcome-toast';

  Object.assign(welcomeToastElement.style, {
    position: 'fixed',
    top: '20px',
    right: '20px',
    backgroundColor: '#222222',
    borderLeft: '4px solid #10b981',
    color: '#ebebeb',
    padding: '14px 18px 18px 18px',
    borderRadius: '4px',
    zIndex: '2147483646',
    boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontSize: '13px',
    maxWidth: '300px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
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
  title.textContent = 'Youtube Hider is active!';
  Object.assign(title.style, {
    fontWeight: '600',
    fontSize: '13px',
    color: '#10b981',
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
    removeWelcomeToast();
  };

  headerRow.appendChild(branding);
  headerRow.appendChild(closeBtn);

  const msg = document.createElement('span');
  msg.innerHTML =
    'Click the extension icon <span style="font-size:15px; display:inline-block; animation: yhArrowBounce 0.6s ease-in-out 3;">⬆</span> in your toolbar to customize settings.';

  // Inject bounce keyframes for the arrow
  if (!document.getElementById('yh-toast-keyframes')) {
    const ks = document.createElement('style');
    ks.id = 'yh-toast-keyframes';
    ks.textContent = `@keyframes yhArrowBounce { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }`;
    document.head.appendChild(ks);
  }
  Object.assign(msg.style, {
    lineHeight: '1.5',
    color: '#e0e0e0',
    fontSize: '12px',
  });

  const dismissBtn = document.createElement('div');
  dismissBtn.textContent = "Don't show again";
  Object.assign(dismissBtn.style, {
    cursor: 'pointer',
    color: '#888',
    fontSize: '11px',
    textDecoration: 'underline',
    alignSelf: 'flex-end',
    padding: '2px 0',
  });
  dismissBtn.onmouseenter = () => {
    dismissBtn.style.color = '#bbb';
  };
  dismissBtn.onmouseleave = () => {
    dismissBtn.style.color = '#888';
  };
  dismissBtn.onclick = e => {
    e.stopPropagation();
    chrome.storage.sync.set({ welcomeToastDismissed: true });
    prefs.welcomeToastDismissed = true;
    removeWelcomeToast();
  };

  const progressBar = document.createElement('div');
  Object.assign(progressBar.style, {
    position: 'absolute',
    bottom: '0',
    left: '0',
    height: '3px',
    backgroundColor: '#10b981',
    width: '100%',
    transition: 'width 0.1s linear',
  });

  welcomeToastElement.appendChild(headerRow);
  welcomeToastElement.appendChild(msg);
  welcomeToastElement.appendChild(dismissBtn);
  welcomeToastElement.appendChild(progressBar);
  document.body.appendChild(welcomeToastElement);

  requestAnimationFrame(() => {
    if (welcomeToastElement) welcomeToastElement.style.opacity = '1';
  });

  let timeLeft = 8000;
  const updateInterval = 100;
  let isPaused = false;

  welcomeToastElement.onmouseenter = () => {
    isPaused = true;
  };
  welcomeToastElement.onmouseleave = () => {
    isPaused = false;
  };

  welcomeToastInterval = setInterval(() => {
    if (isPaused) return;
    timeLeft -= updateInterval;
    progressBar.style.width = `${(timeLeft / 8000) * 100}%`;
    if (timeLeft <= 0) removeWelcomeToast();
  }, updateInterval);
}

// ─── First-Action Confirmation Toast ─────────────────────────────────────────
let firstActionToastElement = null;

function showFirstActionToast() {
  if (prefs.firstActionToastShown) return;
  if (firstActionToastElement) return;

  prefs.firstActionToastShown = true;
  chrome.storage.sync.set({ firstActionToastShown: true });

  firstActionToastElement = document.createElement('div');
  firstActionToastElement.id = 'yh-first-action-toast';

  Object.assign(firstActionToastElement.style, {
    position: 'fixed',
    top: '20px',
    right: '20px',
    backgroundColor: '#222222',
    borderLeft: '4px solid #10b981',
    color: '#ebebeb',
    padding: '12px 16px',
    borderRadius: '4px',
    zIndex: '2147483646',
    boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontSize: '13px',
    maxWidth: '280px',
    opacity: '0',
    transition: 'opacity 0.3s ease',
    pointerEvents: 'none',
  });

  firstActionToastElement.textContent =
    'Settings saved! Your changes apply instantly.';
  document.body.appendChild(firstActionToastElement);

  requestAnimationFrame(() => {
    if (firstActionToastElement) firstActionToastElement.style.opacity = '1';
  });

  setTimeout(() => {
    if (firstActionToastElement) {
      firstActionToastElement.style.opacity = '0';
      setTimeout(() => {
        if (firstActionToastElement) {
          firstActionToastElement.remove();
          firstActionToastElement = null;
        }
      }, 300);
    }
  }, 4000);
}

// ─── Floating Button & Mini-Panel (Shadow DOM) ──────────────────────────────
let floatingButtonHost = null;
let miniPanelOpen = false;
let fabResizeTimer = null;

function isYouTube() {
  return (
    window.location.hostname === 'www.youtube.com' ||
    window.location.hostname === 'm.youtube.com'
  );
}

function isWatchPage() {
  return window.location.pathname === '/watch';
}

function applyFabPosition(host, shadow, pos) {
  const MARGIN = 20;
  const hostW = host.offsetWidth || 40;
  const hostH = host.offsetHeight || 40;
  const scrollbarW = window.innerWidth - document.documentElement.clientWidth;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const offset = Math.max(0, pos.offset);
  const rightMargin = MARGIN + scrollbarW;

  host.style.top = 'auto';
  host.style.bottom = 'auto';
  host.style.left = 'auto';
  host.style.right = 'auto';

  if (pos.edge === 'left') {
    host.style.left = MARGIN + 'px';
    host.style.top = Math.min(offset, vh - hostH) + 'px';
  } else if (pos.edge === 'right') {
    host.style.right = rightMargin + 'px';
    host.style.top = Math.min(offset, vh - hostH) + 'px';
  } else if (pos.edge === 'top') {
    host.style.top = MARGIN + 'px';
    host.style.left = Math.min(offset, vw - hostW - scrollbarW) + 'px';
  } else {
    host.style.bottom = MARGIN + 'px';
    host.style.left = Math.min(offset, vw - hostW - scrollbarW) + 'px';
  }

  let buttonTopPx;
  if (pos.edge === 'bottom') {
    buttonTopPx = vh - MARGIN - hostH;
  } else if (pos.edge === 'top') {
    buttonTopPx = MARGIN;
  } else {
    buttonTopPx = Math.min(offset, vh - hostH);
  }

  const isLeftHalf = (pos.edge === 'left') ||
    ((pos.edge === 'top' || pos.edge === 'bottom') && offset + hostW / 2 < vw / 2);
  const isBottomHalf = (buttonTopPx + hostH / 2) > (vh / 2);

  const wrapper = shadow.querySelector('.yh-fab-wrapper');
  const panel = shadow.querySelector('.yh-panel');

  const panelH = 350;
  let openAbove = isBottomHalf;
  if (openAbove && buttonTopPx - panelH - 12 < 0) {
    openAbove = false;
  } else if (!openAbove && buttonTopPx + hostH + panelH + 12 > vh) {
    openAbove = true;
  }

  const originV = openAbove ? 'bottom' : 'top';
  const originH = isLeftHalf ? 'left' : 'right';

  if (isLeftHalf) {
    if (wrapper) wrapper.style.alignItems = 'flex-start';
    if (panel) {
      panel.style.right = 'auto';
      panel.style.left = '0';
    }
  } else {
    if (wrapper) wrapper.style.alignItems = 'flex-end';
    if (panel) {
      panel.style.left = 'auto';
      panel.style.right = '0';
    }
  }

  if (panel) {
    panel.style.transformOrigin = originV + ' ' + originH;
  }

  if (openAbove) {
    if (panel) {
      panel.style.top = 'auto';
      panel.style.bottom = '52px';
    }
  } else {
    if (panel) {
      panel.style.bottom = 'auto';
      panel.style.top = '52px';
    }
  }
}

function createFloatingButton() {
  if (!isYouTube()) return;
  if (floatingButtonHost) return;
  if (!prefs.floatingButtonEnabled) return;
  if (isWatchPage()) return;

  floatingButtonHost = document.createElement('div');
  floatingButtonHost.id = 'yh-floating-host';
  Object.assign(floatingButtonHost.style, {
    position: 'fixed',
    bottom: '20px',
    zIndex: '2147483640',
    pointerEvents: 'auto',
  });

  const shadow = floatingButtonHost.attachShadow({ mode: 'closed' });

  const style = document.createElement('style');
  style.textContent = getFloatingButtonCSS();
  shadow.appendChild(style);

  const wrapper = document.createElement('div');
  wrapper.className = 'yh-fab-wrapper';

  const fab = document.createElement('button');
  fab.className = 'yh-fab';
  fab.title = 'Youtube Hider Settings';
  const fabImg = document.createElement('img');
  fabImg.src = chrome.runtime.getURL('assets/icons/youtube-hider-logo.png');
  fabImg.className = 'yh-fab-icon';
  fab.appendChild(fabImg);

  const panel = document.createElement('div');
  panel.className = 'yh-panel';
  panel.innerHTML = getMiniPanelHTML();

  wrapper.appendChild(panel);
  wrapper.appendChild(fab);
  shadow.appendChild(wrapper);

  document.body.appendChild(floatingButtonHost);

  applyFabPosition(floatingButtonHost, shadow, prefs.floatingButtonPosition);

  if (prefs.fabPulseCount < 2) {
    fab.classList.add('pulse');
    fab.addEventListener(
      'animationend',
      () => {
        fab.classList.remove('pulse');
      },
      { once: true },
    );
    chrome.storage.sync.set({ fabPulseCount: prefs.fabPulseCount + 1 });
  }

  let isDragging = false;
  let wasDragged = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let hostStartX = 0;
  let hostStartY = 0;
  const DRAG_THRESHOLD = 5;
  const EDGE_MARGIN = 20;

  function onPointerDown(e) {
    if (e.button && e.button !== 0) return;
    const point = e.touches ? e.touches[0] : e;
    dragStartX = point.clientX;
    dragStartY = point.clientY;
    const rect = floatingButtonHost.getBoundingClientRect();
    hostStartX = rect.left;
    hostStartY = rect.top;
    isDragging = false;

    document.addEventListener('mousemove', onPointerMove);
    document.addEventListener('mouseup', onPointerUp);
    document.addEventListener('touchmove', onPointerMove, { passive: false });
    document.addEventListener('touchend', onPointerUp);
  }

  function onPointerMove(e) {
    const point = e.touches ? e.touches[0] : e;
    const dx = point.clientX - dragStartX;
    const dy = point.clientY - dragStartY;

    if (!isDragging && Math.sqrt(dx * dx + dy * dy) < DRAG_THRESHOLD) return;

    if (!isDragging) {
      isDragging = true;
      floatingButtonHost.style.transition = 'none';
      fab.style.cursor = 'grabbing';
      if (miniPanelOpen) {
        miniPanelOpen = false;
        panel.classList.remove('open');
        fab.classList.remove('active');
      }
    }

    if (e.cancelable) e.preventDefault();

    const hostW = floatingButtonHost.offsetWidth;
    const hostH = floatingButtonHost.offsetHeight;
    const scrollbarW = window.innerWidth - document.documentElement.clientWidth;
    let newX = hostStartX + dx;
    let newY = hostStartY + dy;
    newX = Math.max(0, Math.min(window.innerWidth - hostW - scrollbarW, newX));
    newY = Math.max(0, Math.min(window.innerHeight - hostH, newY));

    Object.assign(floatingButtonHost.style, {
      left: newX + 'px',
      top: newY + 'px',
      right: 'auto',
      bottom: 'auto',
    });
  }

  function onPointerUp() {
    document.removeEventListener('mousemove', onPointerMove);
    document.removeEventListener('mouseup', onPointerUp);
    document.removeEventListener('touchmove', onPointerMove);
    document.removeEventListener('touchend', onPointerUp);
    fab.style.cursor = '';

    if (isDragging) {
      wasDragged = true;
      isDragging = false;

      const rect = floatingButtonHost.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      const distLeft = rect.left;
      const distRight = vw - rect.right;
      const distTop = rect.top;
      const distBottom = vh - rect.bottom;
      const minDist = Math.min(distLeft, distRight, distTop, distBottom);

      let newPos;
      if (minDist === distLeft) {
        newPos = { edge: 'left', offset: Math.max(EDGE_MARGIN, rect.top) };
      } else if (minDist === distRight) {
        newPos = { edge: 'right', offset: Math.max(EDGE_MARGIN, rect.top) };
      } else if (minDist === distTop) {
        newPos = { edge: 'top', offset: Math.max(EDGE_MARGIN, rect.left) };
      } else {
        newPos = { edge: 'bottom', offset: Math.max(EDGE_MARGIN, rect.left) };
      }

      floatingButtonHost.style.transition = 'all 0.3s ease';
      applyFabPosition(floatingButtonHost, shadow, newPos);

      prefs.floatingButtonPosition = newPos;
      chrome.storage.local.set({ floatingButtonPosition: newPos });

      setTimeout(() => {
        if (floatingButtonHost) floatingButtonHost.style.transition = '';
        wasDragged = false;
      }, 300);
    }
  }

  fab.addEventListener('mousedown', onPointerDown);
  fab.addEventListener('touchstart', onPointerDown, { passive: true });

  function onViewportResize() {
    clearTimeout(fabResizeTimer);
    fabResizeTimer = setTimeout(() => {
      if (!floatingButtonHost) return;
      const resetPos = {
        edge: 'right',
        offset: Math.max(EDGE_MARGIN, window.innerHeight - (floatingButtonHost.offsetHeight || 40) - EDGE_MARGIN)
      };
      applyFabPosition(floatingButtonHost, shadow, resetPos);
      prefs.floatingButtonPosition = resetPos;
      chrome.storage.local.set({ floatingButtonPosition: resetPos });
    }, 200);
  }
  window.addEventListener('resize', onViewportResize);
  floatingButtonHost._onViewportResize = onViewportResize;

  fab.addEventListener('click', e => {
    e.stopPropagation();
    if (wasDragged) return;
    miniPanelOpen = !miniPanelOpen;
    panel.classList.toggle('open', miniPanelOpen);
    fab.classList.toggle('active', miniPanelOpen);
    if (miniPanelOpen) {
      syncPanelToPrefs(shadow);
      if (!prefs.panelTooltipShown) {
        prefs.panelTooltipShown = true;
        chrome.storage.sync.set({ panelTooltipShown: true });
        const rows = shadow.querySelectorAll('.yh-panel-row');
        rows.forEach((row, i) => {
          setTimeout(() => {
            row.style.transition = 'background 0.3s ease';
            row.style.background = 'rgba(16, 185, 129, 0.15)';
            setTimeout(() => {
              row.style.background = '';
            }, 600);
          }, i * 200);
        });
      }
    }
  });

  document.addEventListener('click', e => {
    if (miniPanelOpen && !floatingButtonHost.contains(e.target)) {
      miniPanelOpen = false;
      panel.classList.remove('open');
      fab.classList.remove('active');
    }
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && miniPanelOpen) {
      miniPanelOpen = false;
      panel.classList.remove('open');
      fab.classList.remove('active');
    }
  });

  bindPanelEvents(shadow);
}

const miniViewsSteps = [
  0, 100, 500, 1000, 2500, 5000, 7500, 10000, 15000, 25000, 50000, 75000,
  100000, 150000, 250000, 500000, 1000000, 10000000,
];

function formatMiniViews(views) {
  if (views >= 1000000) {
    return (views / 1000000).toFixed(views % 1000000 === 0 ? 0 : 1) + 'M';
  } else if (views >= 1000) {
    return (views / 1000).toFixed(views % 1000 === 0 ? 0 : 1) + 'K';
  }
  return views.toString();
}

function findClosestMiniViewsIndex(value) {
  let closestIndex = 0;
  let minDiff = Math.abs(miniViewsSteps[0] - value);
  for (let i = 1; i < miniViewsSteps.length; i++) {
    const diff = Math.abs(miniViewsSteps[i] - value);
    if (diff < minDiff) {
      minDiff = diff;
      closestIndex = i;
    }
  }
  return closestIndex;
}

function syncPanelToPrefs(shadow) {
  const hideWatchedToggle = shadow.querySelector('#yh-p-hide-watched');
  const hideShortsToggle = shadow.querySelector('#yh-p-hide-shorts');
  const viewsFilterToggle = shadow.querySelector('#yh-p-views-filter');
  const thresholdSlider = shadow.querySelector('#yh-p-threshold');
  const thresholdValue = shadow.querySelector('#yh-p-threshold-val');
  const viewsSlider = shadow.querySelector('#yh-p-views');
  const viewsValue = shadow.querySelector('#yh-p-views-val');

  if (hideWatchedToggle) {
    hideWatchedToggle.checked =
      prefs.hideHomeEnabled ||
      prefs.hideChannelEnabled ||
      prefs.hideSearchEnabled ||
      prefs.hideSubsEnabled ||
      prefs.hideCorrEnabled;
  }
  if (hideShortsToggle) hideShortsToggle.checked = prefs.hideShortsEnabled;
  if (viewsFilterToggle) {
    viewsFilterToggle.checked =
      prefs.viewsHideHomeEnabled ||
      prefs.viewsHideChannelEnabled ||
      prefs.viewsHideSearchEnabled ||
      prefs.viewsHideSubsEnabled ||
      prefs.viewsHideCorrEnabled;
  }
  if (thresholdSlider) {
    thresholdSlider.value = prefs.hideThreshold;
    if (thresholdValue) thresholdValue.textContent = prefs.hideThreshold + '%';
    updateMiniSliderBg(thresholdSlider);
  }
  if (viewsSlider) {
    const idx = findClosestMiniViewsIndex(prefs.viewsHideThreshold);
    viewsSlider.value = idx;
    if (viewsValue)
      viewsValue.textContent = formatMiniViews(miniViewsSteps[idx]);
    updateMiniSliderBg(viewsSlider);
  }
}

function updateMiniSliderBg(slider) {
  const pct = ((slider.value - slider.min) / (slider.max - slider.min)) * 100;
  slider.style.background = `linear-gradient(to right, #ebebeb ${pct}%, #4a4a4a ${pct}%)`;
}

function bindPanelEvents(shadow) {
  const hideWatchedToggle = shadow.querySelector('#yh-p-hide-watched');
  const hideShortsToggle = shadow.querySelector('#yh-p-hide-shorts');
  const viewsFilterToggle = shadow.querySelector('#yh-p-views-filter');
  const thresholdSlider = shadow.querySelector('#yh-p-threshold');
  const thresholdValue = shadow.querySelector('#yh-p-threshold-val');
  const viewsSlider = shadow.querySelector('#yh-p-views');
  const viewsValue = shadow.querySelector('#yh-p-views-val');
  const openFullBtn = shadow.querySelector('#yh-p-open-full');
  const hideButtonLink = shadow.querySelector('#yh-p-hide-btn');
  const closeBtn = shadow.querySelector('#yh-p-close');

  if (hideWatchedToggle) {
    hideWatchedToggle.addEventListener('change', () => {
      const val = hideWatchedToggle.checked;
      chrome.storage.sync.set({
        hideHomeEnabled: val,
        hideChannelEnabled: val,
        hideSearchEnabled: val,
        hideSubsEnabled: val,
        hideCorrEnabled: val,
      });
      showFirstActionToast();
    });
  }

  if (hideShortsToggle) {
    hideShortsToggle.addEventListener('change', () => {
      chrome.storage.sync.set({
        hideShortsEnabled: hideShortsToggle.checked,
        hideShortsSearchEnabled: hideShortsToggle.checked,
      });
      showFirstActionToast();
    });
  }

  if (viewsFilterToggle) {
    viewsFilterToggle.addEventListener('change', () => {
      const val = viewsFilterToggle.checked;
      chrome.storage.sync.set({
        viewsHideHomeEnabled: val,
        viewsHideChannelEnabled: val,
        viewsHideSearchEnabled: val,
        viewsHideSubsEnabled: val,
        viewsHideCorrEnabled: val,
      });
      showFirstActionToast();
    });
  }

  if (thresholdSlider) {
    thresholdSlider.addEventListener('input', () => {
      if (thresholdValue)
        thresholdValue.textContent = thresholdSlider.value + '%';
      updateMiniSliderBg(thresholdSlider);
    });
    thresholdSlider.addEventListener('change', () => {
      chrome.storage.sync.set({
        hideThreshold: parseInt(thresholdSlider.value, 10),
      });
      showFirstActionToast();
    });
  }

  if (viewsSlider) {
    viewsSlider.addEventListener('input', () => {
      const idx = parseInt(viewsSlider.value, 10);
      if (viewsValue)
        viewsValue.textContent = formatMiniViews(miniViewsSteps[idx]);
      updateMiniSliderBg(viewsSlider);
    });
    viewsSlider.addEventListener('change', () => {
      const idx = parseInt(viewsSlider.value, 10);
      chrome.storage.sync.set({ viewsHideThreshold: miniViewsSteps[idx] });
      showFirstActionToast();
    });
  }

  if (openFullBtn) {
    openFullBtn.addEventListener('click', e => {
      e.preventDefault();
      try {
        chrome.runtime.sendMessage({ action: 'openSettings' });
      } catch (err) {
        logger.warn('Could not open settings', err);
      }
    });
  }

  if (hideButtonLink) {
    hideButtonLink.addEventListener('click', e => {
      e.preventDefault();
      chrome.storage.sync.set({ floatingButtonEnabled: false });
      prefs.floatingButtonEnabled = false;
      removeFloatingButton();
    });
  }

  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      miniPanelOpen = false;
      shadow.querySelector('.yh-panel').classList.remove('open');
      shadow.querySelector('.yh-fab').classList.remove('active');
    });
  }
}

function removeFloatingButton() {
  if (floatingButtonHost) {
    if (floatingButtonHost._onViewportResize) {
      window.removeEventListener('resize', floatingButtonHost._onViewportResize);
    }
    clearTimeout(fabResizeTimer);
    floatingButtonHost.remove();
    floatingButtonHost = null;
    miniPanelOpen = false;
  }
}

function getMiniPanelHTML() {
  const infoSvg = `<svg class="yh-info-icon" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" stroke-width="1.2"/><text x="8" y="11.5" text-anchor="middle" font-size="9" font-weight="700" fill="currentColor">?</text></svg>`;
  return `
    <div class="yh-panel-header">
      <div class="yh-panel-branding">
        <img src="${chrome.runtime.getURL('assets/icons/youtube-hider-logo.png')}" class="yh-panel-logo" />
        <span class="yh-panel-title">Youtube Hider</span>
      </div>
      <div class="yh-panel-close" id="yh-p-close">✕</div>
    </div>
    <div class="yh-panel-body">
      <div class="yh-panel-group">
        <label class="yh-panel-row">
          <div class="yh-panel-label-wrap">
            <span class="yh-panel-label">Hide Watched Videos</span>
            <span class="yh-info-wrap">${infoSvg}<span class="yh-tooltip">Hides videos you've already watched beyond the set threshold</span></span>
          </div>
          <div class="yh-toggle"><input type="checkbox" id="yh-p-hide-watched" /><span class="yh-toggle-slider"></span></div>
        </label>
        <div class="yh-panel-slider-row">
          <span class="yh-panel-sublabel">Watch threshold</span>
          <div class="yh-panel-slider-wrap">
            <input type="range" id="yh-p-threshold" min="0" max="100" step="5" value="20" class="yh-panel-slider" />
            <span class="yh-panel-slider-val" id="yh-p-threshold-val">20%</span>
          </div>
        </div>
      </div>
      <div class="yh-panel-group">
        <label class="yh-panel-row">
          <div class="yh-panel-label-wrap">
            <span class="yh-panel-label">Hide Shorts</span>
            <span class="yh-info-wrap">${infoSvg}<span class="yh-tooltip">Removes Shorts from your YouTube feed and search results</span></span>
          </div>
          <div class="yh-toggle"><input type="checkbox" id="yh-p-hide-shorts" /><span class="yh-toggle-slider"></span></div>
        </label>
      </div>
      <div class="yh-panel-group">
        <label class="yh-panel-row">
          <div class="yh-panel-label-wrap">
            <span class="yh-panel-label">Minimum Views Filter</span>
            <span class="yh-info-wrap">${infoSvg}<span class="yh-tooltip">Hides videos with fewer views than the set minimum</span></span>
          </div>
          <div class="yh-toggle"><input type="checkbox" id="yh-p-views-filter" /><span class="yh-toggle-slider"></span></div>
        </label>
        <div class="yh-panel-slider-row">
          <span class="yh-panel-sublabel">Minimum views</span>
          <div class="yh-panel-slider-wrap">
            <input type="range" id="yh-p-views" min="0" max="17" step="1" value="3" class="yh-panel-slider" />
            <span class="yh-panel-slider-val" id="yh-p-views-val">1K</span>
          </div>
        </div>
      </div>
    </div>
    <div class="yh-panel-footer">
      <a href="#" class="yh-panel-link" id="yh-p-open-full">Open full settings <svg class="yh-external-icon" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><path d="M6 3h7v7m0-7L6 10" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></a>
      <span class="yh-panel-hint">You can also change settings by clicking the extension icon in your toolbar</span>
      <a href="#" class="yh-panel-link yh-panel-link-muted" id="yh-p-hide-btn">Hide this button</a>
    </div>
  `;
}

function getFloatingButtonCSS() {
  return `
    .yh-fab-wrapper {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
    }
    @keyframes yhFabPulse {
      0% { transform: scale(1); box-shadow: 0 2px 10px rgba(0,0,0,0.4); }
      50% { transform: scale(1.15); box-shadow: 0 0 16px rgba(16,185,129,0.4), 0 2px 10px rgba(0,0,0,0.4); }
      100% { transform: scale(1); box-shadow: 0 2px 10px rgba(0,0,0,0.4); }
    }
    .yh-fab {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      border: none;
      background: #222222;
      box-shadow: 0 2px 10px rgba(0,0,0,0.4);
      cursor: grab;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0.55;
      transition: opacity 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
      padding: 0;
      outline: none;
      user-select: none;
      -webkit-user-select: none;
    }
    .yh-fab.pulse {
      opacity: 1;
      animation: yhFabPulse 0.8s ease-in-out 3;
    }
    .yh-fab:hover {
      opacity: 1;
      transform: scale(1.08);
      box-shadow: 0 4px 16px rgba(0,0,0,0.5);
    }
    .yh-fab.active {
      opacity: 1;
      box-shadow: 0 0 0 2px #8ab4f8, 0 4px 16px rgba(0,0,0,0.5);
    }
    .yh-fab-icon {
      width: 22px;
      height: 22px;
      object-fit: contain;
      pointer-events: none;
    }

    /* Mini Panel */
    .yh-panel {
      position: absolute;
      bottom: 52px;
      right: 0;
      width: 280px;
      background: #222222;
      border: 1px solid #3a3a3a;
      border-radius: 10px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.5);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 13px;
      color: #ebebeb;
      transform: scale(0.92) translateY(8px);
      opacity: 0;
      pointer-events: none;
      transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s ease;
      transform-origin: bottom right;
    }
    .yh-panel.open {
      transform: scale(1) translateY(0);
      opacity: 1;
      pointer-events: auto;
    }

    .yh-panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 14px 10px;
      border-bottom: 1px solid #3a3a3a;
    }
    .yh-panel-branding {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .yh-panel-logo {
      width: 18px;
      height: 18px;
      object-fit: contain;
    }
    .yh-panel-title {
      font-weight: 700;
      font-size: 14px;
      background: linear-gradient(135deg, #8ab4f8, #6ba3ff);
      -webkit-background-clip: text;
      background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .yh-panel-close {
      cursor: pointer;
      color: #aaa;
      font-size: 14px;
      font-weight: bold;
      line-height: 1;
      padding: 2px 4px;
      border-radius: 4px;
      transition: color 0.15s, background 0.15s;
    }
    .yh-panel-close:hover {
      color: #fff;
      background: #3a3a3a;
    }

    .yh-panel-body {
      padding: 10px 14px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .yh-panel-group {
      background: #2a2a2a;
      border-radius: 6px;
    }
    .yh-panel-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 10px;
      cursor: pointer;
      transition: background 0.15s;
    }
    .yh-panel-row:hover {
      background: #313131;
    }
    .yh-panel-label-wrap {
      display: flex;
      align-items: center;
      gap: 5px;
    }
    .yh-panel-label {
      font-size: 13px;
      font-weight: 500;
      color: #fff;
    }
    .yh-info-wrap {
      position: relative;
      display: inline-flex;
      align-items: center;
    }
    .yh-info-icon {
      width: 13px;
      height: 13px;
      color: #666;
      cursor: help;
      transition: color 0.15s;
      flex-shrink: 0;
      vertical-align: middle;
      margin-top: -1px;
    }
    .yh-info-wrap:hover .yh-info-icon {
      color: #aaa;
    }
    .yh-tooltip {
      visibility: hidden;
      opacity: 0;
      position: absolute;
      bottom: calc(100% + 6px);
      right: -8px;
      background: #333;
      color: #ddd;
      font-size: 11px;
      font-weight: 400;
      line-height: 1.4;
      padding: 6px 10px;
      border-radius: 4px;
      white-space: normal;
      width: 180px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.4);
      pointer-events: none;
      transition: opacity 0.15s, visibility 0.15s;
      z-index: 10;
    }
    .yh-tooltip::after {
      content: '';
      position: absolute;
      top: 100%;
      right: 12px;
      border-width: 4px;
      border-style: solid;
      border-color: #333 transparent transparent transparent;
    }
    .yh-info-wrap:hover .yh-tooltip {
      visibility: visible;
      opacity: 1;
    }
    .yh-panel-slider-row {
      padding: 4px 10px 8px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .yh-panel-sublabel {
      font-size: 10px;
      font-weight: 600;
      color: #95c4f5;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .yh-panel-slider-wrap {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .yh-panel-slider {
      flex: 1;
      height: 3px;
      border-radius: 2px;
      background: #4a4a4a;
      outline: none;
      -webkit-appearance: none;
      appearance: none;
      cursor: pointer;
    }
    .yh-panel-slider::-webkit-slider-thumb {
      -webkit-appearance: none;
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: #ebebeb;
      cursor: pointer;
    }
    .yh-panel-slider::-moz-range-thumb {
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: #ebebeb;
      cursor: pointer;
      border: none;
    }
    .yh-panel-slider-val {
      font-size: 13px;
      font-weight: 600;
      color: #fff;
      min-width: 36px;
      text-align: right;
    }

    /* Toggle */
    .yh-toggle {
      position: relative;
      width: 32px;
      height: 18px;
      flex-shrink: 0;
    }
    .yh-toggle input {
      opacity: 0;
      width: 0;
      height: 0;
      position: absolute;
    }
    .yh-toggle-slider {
      position: absolute;
      cursor: pointer;
      top: 0; left: 0; right: 0; bottom: 0;
      background-color: #4a4a4a;
      border-radius: 20px;
      transition: background 0.25s;
    }
    .yh-toggle-slider::before {
      content: "";
      position: absolute;
      height: 12px;
      width: 12px;
      left: 3px;
      bottom: 3px;
      background-color: #ebebeb;
      border-radius: 50%;
      transition: transform 0.25s;
    }
    .yh-toggle input:checked + .yh-toggle-slider {
      background-color: #10b981;
    }
    .yh-toggle input:checked + .yh-toggle-slider::before {
      transform: translateX(14px);
    }

    .yh-panel-footer {
      padding: 6px 14px 8px;
      border-top: 1px solid #3a3a3a;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .yh-panel-hint {
      font-size: 10px;
      color: #777;
      line-height: 1.3;
      padding: 0;
    }
    .yh-panel-link {
      font-size: 12px;
      color: #8ab4f8;
      text-decoration: none;
      cursor: pointer;
      padding: 2px 0;
      transition: color 0.15s;
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
    .yh-external-icon {
      width: 11px;
      height: 11px;
      flex-shrink: 0;
    }
    .yh-panel-link:hover {
      color: #aac8ff;
      text-decoration: underline;
    }
    .yh-panel-link-muted {
      color: #666;
      font-size: 11px;
    }
    .yh-panel-link-muted:hover {
      color: #999;
    }
  `;
}

function initPrefs() {
  return new Promise(resolve => {
    try {
      chrome.storage.sync.get(Object.keys(prefs), result => {
        Object.assign(prefs, result);
        chrome.storage.local.get('floatingButtonPosition', localResult => {
          if (localResult.floatingButtonPosition) {
            prefs.floatingButtonPosition = localResult.floatingButtonPosition;
          }
          logger.log('Prefs loaded', prefs);
          resolve();
        });
      });
    } catch (e) {
      logger.warn('Could not load prefs (context invalidated?)', e);
      resolve();
    }
  });
}

function setupPrefsListener() {
  try {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'sync') {
        for (let key in changes) {
          if (prefs.hasOwnProperty(key)) {
            prefs[key] = changes[key].newValue;
            logger.log(`Pref ${key} changed to`, changes[key].newValue);
          }
        }
        if (changes.floatingButtonEnabled) {
          if (changes.floatingButtonEnabled.newValue && !isWatchPage()) {
            createFloatingButton();
          } else {
            removeFloatingButton();
          }
        }
      }
      if (area === 'local' && changes.floatingButtonPosition) {
        prefs.floatingButtonPosition = changes.floatingButtonPosition.newValue;
      }
    });
  } catch (e) {
    logger.warn('Could not bind onChanged (context invalidated?)', e);
  }
}

let skipClickedButtons = new WeakSet();
let skipTimeout = null;

function skipIntro() {
  if (!prefs.skipEnabled) return;

  const netflixBtn = document.querySelector(
    "button[data-uia='player-skip-intro']",
  );
  const primeBtn = document.querySelector('[class*="skipelement-button"]');
  const recapBtn =
    document.querySelector(
      "button[data-uia='viewer-skip-recap'], button[data-uia='player-skip-recap']",
    ) || document.querySelector('[class*="skip-recap"], [class*="SkipRecap"]');

  const btn = netflixBtn || primeBtn || recapBtn;

  if (!btn || skipClickedButtons.has(btn)) return;

  if (skipTimeout) {
    clearTimeout(skipTimeout);
  }

  skipClickedButtons.add(btn);

  skipTimeout = setTimeout(() => {
    btn.click();
    logger.log('Skipped intro/recap');
    skipTimeout = null;
  }, prefs.skipIntroDelay * 1000);
}

function hideWatched(pathname) {
  const { hideThreshold } = prefs;

  document
    .querySelectorAll(
      'ytd-thumbnail-overlay-resume-playback-renderer #progress, .ytThumbnailOverlayProgressBarHostWatchedProgressBarSegment, ytm-thumbnail-overlay-resume-playback-renderer .thumbnail-overlay-resume-playback-progress',
    )
    .forEach(bar => {
      const pct = parseFloat(bar.style.width) || 0;
      if (pct <= hideThreshold) return;

      let item = bar;

      const isChannelPage = pathname && pathname.startsWith('/@');

      const selectors =
        pathname === '/watch'
          ? 'ytd-compact-video-renderer, ytd-rich-item-renderer, ytd-video-renderer, yt-lockup-view-model, ytm-video-with-context-renderer, ytm-compact-video-renderer'
          : isChannelPage
            ? 'ytd-compact-video-renderer, ytd-rich-item-renderer, ytd-video-renderer, ytd-grid-video-renderer, ytm-video-with-context-renderer, ytm-compact-video-renderer'
            : 'ytd-compact-video-renderer, ytd-rich-item-renderer, ytd-video-renderer, ytm-video-with-context-renderer, ytm-compact-video-renderer, ytm-rich-item-renderer';

      while (item && !item.matches(selectors)) {
        item = item.parentElement;
      }
      if (!item) return;

      item.style.display = 'none';
    });
}

function extractNumberAndSuffix(input) {
  const s = String(input).trim();

  const match = s.match(/^([\d.,]+)\s*(K|Mln|M|B)?/i);
  if (!match) return { numStr: '', suffix: '' };
  return {
    numStr: match[1],
    suffix: (match[2] || '').toUpperCase(),
  };
}

function parseToNumber(input) {
  const { numStr, suffix } = extractNumberAndSuffix(input);
  if (!numStr) return NaN;

  let multiplier = 1;
  switch (suffix.toLowerCase()) {
    case 'k':
      numStr.includes('.') ? (multiplier = 1e2) : (multiplier = 1e3);
      break;
    case 'm':
    case 'mln':
      numStr.includes('.') ? (multiplier = 1e5) : (multiplier = 1e6);
      break;
    case 'b':
      numStr.includes('.') ? (multiplier = 1e8) : (multiplier = 1e9);
      break;
  }

  const normalized = numStr.replace(/\./g, '').replace(',', '.');

  const base = parseFloat(normalized);
  return isNaN(base) ? NaN : base * multiplier;
}

let observerCreated = false;

function hideUnderVisuals(pathname) {
  const { viewsHideThreshold } = prefs;
  const isChannelPage = pathname && pathname.startsWith('/@');

  document.querySelectorAll('#metadata-line').forEach(metaLine => {
    let span;
    if (isChannelPage) {
      const spans = metaLine.querySelectorAll('span.style-scope');
      span = spans[0];
    } else {
      span = metaLine.querySelector('span.inline-metadata-item');
    }

    if (!span) return;

    const text = span.textContent;

    if (
      /ago|fa|ore|hours|mesi|months|anni|years/.test(text) &&
      !/views|visualizzazioni/.test(text)
    )
      return;

    const views = parseToNumber(text);
    if (isNaN(views) || views >= viewsHideThreshold) return;

    let item = span;
    const selectors = isChannelPage
      ? 'ytd-compact-video-renderer, ytd-rich-item-renderer, ytd-video-renderer, ytd-grid-video-renderer, yt-lockup-view-model'
      : 'ytd-compact-video-renderer, ytd-rich-item-renderer, ytd-video-renderer, yt-lockup-view-model';

    while (item && !item.matches(selectors)) {
      item = item.parentElement;
    }
    if (item) item.style.display = 'none';
  });

  document
    .querySelectorAll('.YtmBadgeAndBylineRendererItemByline')
    .forEach(span => {
      const text = span.textContent.trim();

      const timeKeywords =
        /ago|fa|ore|hours|mesi|months|anni|years|settimane|weeks|giorni|days/i;
      const viewKeywords = /views|visualizzazioni|vistas|vues|aufrufe/i;

      if (timeKeywords.test(text)) return;

      const { suffix } = extractNumberAndSuffix(text);
      const hasSuffix = ['K', 'M', 'MLN', 'B'].includes(suffix);
      const isExplicitViewString = viewKeywords.test(text);

      if (!hasSuffix && !isExplicitViewString) return;

      const views = parseToNumber(text);
      if (isNaN(views) || views >= viewsHideThreshold) return;

      const container = span.closest(
        'ytm-video-with-context-renderer, ytm-rich-item-renderer, ytm-compact-video-renderer',
      );

      if (container) {
        container.style.display = 'none';
        const wrapper = container.closest('ytm-rich-item-renderer');
        if (wrapper) wrapper.style.display = 'none';
      }
    });

  hideNewFormatVideos(pathname);

  if (!observerCreated) {
    createVideoObserver(pathname);
    observerCreated = true;
  }
}

function hideNewFormatVideos(pathname) {
  const { viewsHideThreshold } = prefs;

  const isChannelPage = pathname && pathname.startsWith('/@');

  document
    .querySelectorAll('yt-content-metadata-view-model, yt-lockup-view-model')
    .forEach(metadataContainer => {
      const metadataRows = metadataContainer.querySelectorAll(
        '.yt-content-metadata-view-model-wiz__metadata-row, .yt-content-metadata-view-model__metadata-row',
      );
      if (metadataRows.length < 2) return;

      const viewsRow = metadataRows[1];
      const viewsSpan = viewsRow.querySelector(
        'span.yt-core-attributed-string',
      );

      if (!viewsSpan) return;

      const text = viewsSpan.textContent;
      const views = parseToNumber(text);

      try {
        logger.log('views-check', {
          views,
          threshold: viewsHideThreshold,
          pathname,
        });
      } catch (e) {}

      if (isNaN(views) || views >= viewsHideThreshold) return;

      let item = viewsSpan;

      const selectors =
        pathname === '/watch'
          ? 'ytd-compact-video-renderer, ytd-rich-item-renderer, ytd-video-renderer, yt-lockup-view-model, ytm-video-with-context-renderer, ytm-compact-video-renderer'
          : isChannelPage
            ? 'ytd-compact-video-renderer, ytd-rich-item-renderer, ytd-video-renderer, ytd-grid-video-renderer, ytm-video-with-context-renderer, ytm-compact-video-renderer'
            : 'ytd-compact-video-renderer, ytd-rich-item-renderer, ytd-video-renderer';

      while (item && !item.matches(selectors)) {
        item = item.parentElement;
      }

      if (item) item.style.display = 'none';
    });
}

function createVideoObserver(pathname) {
  const observer = new MutationObserver(() => {
    hideNewFormatVideos(pathname);
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

function hideShorts() {
  document.querySelectorAll('ytm-rich-section-renderer').forEach(section => {
    if (section.querySelector('ytm-shorts-lockup-view-model')) {
      section.style.display = 'none';
    }
  });

  document.querySelectorAll('ytm-pivot-bar-item-renderer').forEach(item => {
    if (item.querySelector('.pivot-shorts')) {
      item.style.display = 'none';
    }
  });

  document
    .querySelectorAll(
      'ytd-guide-section-renderer, tp-yt-paper-item, ytd-video-renderer, ytd-reel-shelf-renderer, ytm-reel-shelf-renderer',
    )
    .forEach(node => {
      if (node.querySelector('ytm-shorts-lockup-view-model')) {
        node.style.display = 'none';
      }
      if (
        node.querySelector('badge-shape[aria-label="Shorts"]') ||
        node.querySelector(
          'ytd-thumbnail-overlay-time-status-renderer[overlay-style="SHORTS"]',
        )
      ) {
        node.style.display = 'none';
      }
    });

  document.querySelectorAll('a[href^="/shorts/"]').forEach(link => {
    const shelf = link.closest(
      'ytd-rich-shelf-renderer, ytm-reel-shelf-renderer',
    );
    if (shelf) {
      shelf.style.display = 'none';
      return;
    }
    const item = link.closest(
      'ytd-rich-item-renderer, ytm-video-with-context-renderer',
    );
    if (item) item.style.display = 'none';
  });

  document.querySelectorAll('a[title="Shorts"]').forEach(link => {
    const entry =
      link.closest('ytd-guide-entry-renderer') ||
      link.closest('ytd-mini-guide-entry-renderer') ||
      link.closest('ytm-pivot-bar-item-renderer');
    if (entry) entry.style.display = 'none';
  });

  document.querySelectorAll('a[title="Shorts"]').forEach(link => {
    const entry = link.closest('ytd-guide-entry-renderer');
    if (entry) entry.style.display = 'none';
  });

  document
    .querySelectorAll('yt-formatted-string[title="Shorts"]')
    .forEach(link => {
      const entry = link.closest('yt-chip-cloud-chip-renderer');
      if (entry) entry.style.display = 'none';
    });

  document.querySelectorAll('ytm-chip-cloud-chip-renderer').forEach(chip => {
    if (chip.textContent.trim() === 'Shorts') {
      chip.style.display = 'none';
    }
  });

  document
    .querySelectorAll('yt-tab-shape[tab-title="Shorts"]')
    .forEach(link => {
      link.style.display = 'none';
    });

  document.querySelectorAll('grid-shelf-view-model').forEach(node => {
    if (
      node.querySelector(
        'ytm-shorts-lockup-view-model-v2, ytm-shorts-lockup-view-model',
      )
    ) {
      node.style.display = 'none';
    }
  });

  document
    .querySelectorAll(
      'grid-shelf-view-model:has(ytm-shorts-lockup-view-model-v2), grid-shelf-view-model:has(ytm-shorts-lockup-view-model)',
    )
    .forEach(node => {
      node.style.display = 'none';
    });

  document.querySelectorAll('yt-chip-cloud-chip-renderer').forEach(node => {
    const label = node.querySelector('.ytChipShapeChip');
    if (label && label.textContent.trim() === 'Shorts') {
      node.style.display = 'none';
    }
  });

  document.querySelectorAll('ytd-rich-section-renderer').forEach(section => {
    const allChildren = section.querySelectorAll('*');
    for (const child of allChildren) {
      if (child.style.display === 'none') {
        section.style.display = 'none';
        break;
      }
    }
  });

  document
    .querySelectorAll('ytd-mini-guide-entry-renderer a[href^="/shorts"]')
    .forEach(link => {
      const entry = link.closest('ytd-mini-guide-entry-renderer');
      if (entry) entry.style.display = 'none';
    });

  document
    .querySelectorAll('a[aria-label="Shorts"][href^="/shorts"]')
    .forEach(link => {
      const mini = link.closest('ytd-mini-guide-entry-renderer');
      const guide = link.closest('ytd-guide-entry-renderer');
      const pivot = link.closest('ytm-pivot-bar-item-renderer');
      if (mini) mini.style.display = 'none';
      if (guide) guide.style.display = 'none';
      if (pivot) pivot.style.display = 'none';
    });
}

let currentPath = window.location.pathname;
let pageLoadTimeout = null;

const PAGE_SELECTORS = {
  '/': [
    'ytd-rich-grid-renderer',
    'ytd-two-column-browse-results-renderer',
    'ytm-browse',
    'ytm-rich-grid-renderer',
  ],
  '/results': [
    'ytd-search',
    'ytd-item-section-renderer',
    'ytm-search',
    'ytm-section-list-renderer',
  ],
  '/watch': [
    'ytd-watch-flexy',
    '#primary',
    'ytm-watch',
    'ytm-single-column-watch-next-results-renderer',
  ],
  '/feed/subscriptions': [
    'ytd-browse',
    'ytd-section-list-renderer',
    'ytm-browse',
  ],
};

function waitForPageElements(pathname, timeout = 3000) {
  return new Promise(resolve => {
    let selectors = PAGE_SELECTORS[pathname];

    if (!selectors && pathname && pathname.startsWith('/@')) {
      selectors = PAGE_SELECTORS['/'];
    }

    if (!selectors) {
      resolve(true);
      return;
    }

    const checkElements = () => {
      for (const selector of selectors) {
        if (document.querySelector(selector)) {
          logger.log(`Page ready: found ${selector} for ${pathname}`);
          resolve(true);
          return true;
        }
      }
      return false;
    };

    if (checkElements()) return;

    const startTime = Date.now();
    const interval = setInterval(() => {
      if (checkElements()) {
        clearInterval(interval);
      } else if (Date.now() - startTime > timeout) {
        logger.warn(`Timeout waiting for page elements on ${pathname}`);
        clearInterval(interval);
        resolve(false);
      }
    }, TIMING.ELEMENT_POLL_INTERVAL);
  });
}

function shouldHideWatched(pathname) {
  const {
    hideHomeEnabled,
    hideChannelEnabled,
    hideSearchEnabled,
    hideSubsEnabled,
    hideCorrEnabled,
  } = prefs;

  return (
    (pathname === '/' && hideHomeEnabled) ||
    (pathname && pathname.startsWith('/@') && hideChannelEnabled) ||
    (pathname === '/results' && hideSearchEnabled) ||
    (pathname === '/watch' && hideCorrEnabled) ||
    (pathname === '/feed/subscriptions' && hideSubsEnabled)
  );
}

function shouldHideViews(pathname) {
  const {
    viewsHideHomeEnabled,
    viewsHideChannelEnabled,
    viewsHideSearchEnabled,
    viewsHideSubsEnabled,
    viewsHideCorrEnabled,
  } = prefs;

  return (
    (pathname === '/' && viewsHideHomeEnabled) ||
    (pathname && pathname.startsWith('/@') && viewsHideChannelEnabled) ||
    (pathname === '/results' && viewsHideSearchEnabled) ||
    (pathname === '/watch' && viewsHideCorrEnabled) ||
    (pathname === '/feed/subscriptions' && viewsHideSubsEnabled)
  );
}

function shouldHideShorts(pathname) {
  const { hideShortsEnabled, hideShortsSearchEnabled } = prefs;

  return (
    hideShortsEnabled &&
    pathname !== '/feed/history' &&
    (hideShortsSearchEnabled || pathname !== '/results')
  );
}

async function startHiding(pathname) {
  logger.log('Starting hide operations for:', pathname);

  await waitForPageElements(pathname);

  const canHideWatched = shouldHideWatched(pathname);
  const canHideViews = shouldHideViews(pathname);
  const canHideShortsFlag = shouldHideShorts(pathname);

  logger.log('Hide decision for', pathname, {
    hideWatched: canHideWatched,
    hideViews: canHideViews,
    hideShorts: canHideShortsFlag,
    relevantPrefs: {
      hideChannelEnabled: prefs.hideChannelEnabled,
      viewsHideChannelEnabled: prefs.viewsHideChannelEnabled,
      hideShortsEnabled: prefs.hideShortsEnabled,
      hideShortsSearchEnabled: prefs.hideShortsSearchEnabled,
    },
  });

  if (canHideWatched) {
    logger.log('Hiding watched videos on', pathname);
    hideWatched(pathname);
  }

  if (canHideViews) {
    logger.log('Hiding low view count videos on', pathname);
    hideUnderVisuals(pathname);
  }

  if (canHideShortsFlag) {
    logger.log('Hiding shorts on', pathname);
    hideShorts();
  }
}

function detectPageChange() {
  const newPath = window.location.pathname;

  if (newPath !== currentPath) {
    logger.log(`Page changed: ${currentPath} -> ${newPath}`);
    currentPath = newPath;

    removeWarning();
    rapidLoaderCount = 0;
    warningDismissed = false;

    if (currentPath === '/watch') {
      removeFloatingButton();
    } else if (prefs.floatingButtonEnabled && !floatingButtonHost && isYouTube()) {
      createFloatingButton();
    }

    if (pageLoadTimeout) {
      clearTimeout(pageLoadTimeout);
    }

    pageLoadTimeout = setTimeout(() => {
      startHiding(currentPath);
      pageLoadTimeout = null;
    }, TIMING.PAGE_CHANGE_DELAY);

    return true;
  }

  return false;
}

const debouncedHiding = debounce(() => {
  if (!detectPageChange()) {
    startHiding(currentPath);
  }
}, TIMING.DEBOUNCE_MUTATIONS);

function onMutations(mutations) {
  detectInfiniteLoaderLoop(mutations);

  skipIntro();
  debouncedHiding();
}

async function init() {
  await initPrefs();
  setupPrefsListener();

  logger.log('Extension initialized on', currentPath);
  await startHiding(currentPath);

  const observer = new MutationObserver(onMutations);
  observer.observe(document.body, { childList: true, subtree: true });

  logger.log('MutationObserver started');

  if (isYouTube()) {
    setTimeout(() => showWelcomeToast(), 1500);
    if (!isWatchPage()) {
      createFloatingButton();
    }
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
