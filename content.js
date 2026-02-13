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
  tutorialCompleted: false,
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

// ─── Floating Button & Mini-Panel (Shadow DOM) ──────────────────────────────
let floatingButtonHost = null;
let miniPanelOpen = false;
let fabResizeTimer = null;
let fabElement = null;
let fabShadow = null;
let fabPanel = null;

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
  const offset = Math.max(MARGIN, pos.offset);
  const rightMargin = MARGIN + scrollbarW;

  host.style.top = 'auto';
  host.style.bottom = 'auto';
  host.style.left = 'auto';
  host.style.right = 'auto';

  if (pos.edge === 'left') {
    host.style.left = MARGIN + 'px';
    host.style.top = Math.max(MARGIN, Math.min(offset, vh - hostH - MARGIN)) + 'px';
  } else if (pos.edge === 'right') {
    host.style.right = rightMargin + 'px';
    host.style.top = Math.max(MARGIN, Math.min(offset, vh - hostH - MARGIN)) + 'px';
  } else if (pos.edge === 'top') {
    host.style.top = MARGIN + 'px';
    host.style.left = Math.max(MARGIN, Math.min(offset, vw - hostW - scrollbarW - MARGIN)) + 'px';
  } else {
    host.style.bottom = MARGIN + 'px';
    host.style.left = Math.max(MARGIN, Math.min(offset, vw - hostW - scrollbarW - MARGIN)) + 'px';
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

function createFloatingButton(forceForTutorial = false) {
  if (!isYouTube()) return;
  if (floatingButtonHost) return;
  if (!forceForTutorial && !prefs.floatingButtonEnabled) return;
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
  fabShadow = shadow;

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

  fabElement = fab;
  fabPanel = panel;

  document.body.appendChild(floatingButtonHost);

  applyFabPosition(floatingButtonHost, shadow, prefs.floatingButtonPosition);

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
      safeStorageSet('local', { floatingButtonPosition: newPos });

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
      const current = prefs.floatingButtonPosition || { edge: 'bottom', offset: 20 };
      const hostW = floatingButtonHost.offsetWidth || 40;
      const hostH = floatingButtonHost.offsetHeight || 40;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      let maxOffset;
      if (current.edge === 'left' || current.edge === 'right') {
        maxOffset = vh - hostH - EDGE_MARGIN;
      } else {
        maxOffset = vw - hostW - EDGE_MARGIN;
      }
      const clampedPos = {
        edge: current.edge,
        offset: Math.max(EDGE_MARGIN, Math.min(current.offset, maxOffset)),
      };
      applyFabPosition(floatingButtonHost, shadow, clampedPos);
      prefs.floatingButtonPosition = clampedPos;
      safeStorageSet('local', { floatingButtonPosition: clampedPos });
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
    }
  });

  function onDocumentClick(e) {
    if (tutorialActive) return;
    if (miniPanelOpen && floatingButtonHost && !floatingButtonHost.contains(e.target)) {
      miniPanelOpen = false;
      panel.classList.remove('open');
      fab.classList.remove('active');
    }
  }

  function onDocumentKeydown(e) {
    if (tutorialActive) return;
    if (e.key === 'Escape' && miniPanelOpen) {
      miniPanelOpen = false;
      panel.classList.remove('open');
      fab.classList.remove('active');
    }
  }

  document.addEventListener('click', onDocumentClick);
  document.addEventListener('keydown', onDocumentKeydown);
  floatingButtonHost._onDocumentClick = onDocumentClick;
  floatingButtonHost._onDocumentKeydown = onDocumentKeydown;

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
      safeStorageSet('sync', {
        hideHomeEnabled: val,
        hideChannelEnabled: val,
        hideSearchEnabled: val,
        hideSubsEnabled: val,
        hideCorrEnabled: val,
      });
    });
  }

  if (hideShortsToggle) {
    hideShortsToggle.addEventListener('change', () => {
      safeStorageSet('sync', {
        hideShortsEnabled: hideShortsToggle.checked,
        hideShortsSearchEnabled: hideShortsToggle.checked,
      });
    });
  }

  if (viewsFilterToggle) {
    viewsFilterToggle.addEventListener('change', () => {
      const val = viewsFilterToggle.checked;
      safeStorageSet('sync', {
        viewsHideHomeEnabled: val,
        viewsHideChannelEnabled: val,
        viewsHideSearchEnabled: val,
        viewsHideSubsEnabled: val,
        viewsHideCorrEnabled: val,
      });
    });
  }

  if (thresholdSlider) {
    thresholdSlider.addEventListener('input', () => {
      if (thresholdValue)
        thresholdValue.textContent = thresholdSlider.value + '%';
      updateMiniSliderBg(thresholdSlider);
    });
    thresholdSlider.addEventListener('change', () => {
      safeStorageSet('sync', {
        hideThreshold: parseInt(thresholdSlider.value, 10),
      });
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
      safeStorageSet('sync', { viewsHideThreshold: miniViewsSteps[idx] });
    });
  }

  if (openFullBtn) {
    openFullBtn.addEventListener('click', e => {
      e.preventDefault();
      safeSendMessage({ action: 'openSettings' });
    });
  }

  if (hideButtonLink) {
    hideButtonLink.addEventListener('click', e => {
      e.preventDefault();
      safeStorageSet('sync', { floatingButtonEnabled: false });
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
    if (floatingButtonHost._onDocumentClick) {
      document.removeEventListener('click', floatingButtonHost._onDocumentClick);
    }
    if (floatingButtonHost._onDocumentKeydown) {
      document.removeEventListener('keydown', floatingButtonHost._onDocumentKeydown);
    }
    clearTimeout(fabResizeTimer);
    floatingButtonHost.remove();
    floatingButtonHost = null;
    fabElement = null;
    fabShadow = null;
    fabPanel = null;
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
      <a href="#" class="yh-panel-hide-btn" id="yh-p-hide-btn"><svg class="yh-hide-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg> Hide this button</a>
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
      padding: 6px 14px 14px;
      border-top: 1px solid #3a3a3a;
      display: flex;
      flex-direction: column;
      gap: 2px;
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
    .yh-panel-hide-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      width: 100%;
      padding: 7px 0;
      margin-top: 4px;
      font-size: 12px;
      font-weight: 500;
      color: #ccc;
      background: #333;
      border: 1px solid #4a4a4a;
      border-radius: 6px;
      text-decoration: none;
      cursor: pointer;
      transition: background 0.15s, color 0.15s, border-color 0.15s;
    }
    .yh-panel-hide-btn:hover {
      background: #3f3f3f;
      color: #fff;
      border-color: #666;
    }
    .yh-hide-icon {
      width: 14px;
      height: 14px;
      flex-shrink: 0;
    }
  `;
}

// ─── Tutorial: Welcome Card & Spotlight Tour ────────────────────────────────
let tutorialOverlay = null;
let tutorialActive = false;
let tutorialSkipInterval = null;
let tourHost = null;
let tourBlocker = null;

function getTutorialCSS() {
  return `
    * { box-sizing: border-box; margin: 0; padding: 0; }
    .yh-tutorial-overlay {
      position: fixed; inset: 0; z-index: 2147483647;
      background: rgba(0,0,0,0.7);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      transition: opacity 0.3s ease;
    }
    .yh-welcome-card {
      position: absolute; top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      background: #1e1e1e; border: 1px solid #333; border-radius: 12px;
      padding: 32px 28px 24px; width: 380px; max-width: 90vw;
      text-align: center; color: #e0e0e0;
      box-shadow: 0 8px 32px rgba(0,0,0,0.6);
    }
    .yh-welcome-logo { width: 48px; height: 48px; margin-bottom: 16px; }
    .yh-welcome-title {
      font-size: 20px; font-weight: 700; margin-bottom: 8px;
      background: linear-gradient(135deg, #10b981, #3b82f6);
      -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    }
    .yh-welcome-desc { font-size: 13px; line-height: 1.6; color: #aaa; margin-bottom: 24px; }
    .yh-welcome-actions { display: flex; gap: 12px; justify-content: center; }
    .yh-welcome-btn {
      padding: 10px 24px; border-radius: 8px; font-size: 13px; font-weight: 600;
      cursor: pointer; border: none; transition: all 0.2s ease;
    }
    .yh-welcome-btn-start {
      background: #10b981; color: #fff;
    }
    .yh-welcome-btn-start:hover { background: #0d9668; }
    .yh-welcome-btn-skip {
      background: #333; color: #888; border: 1px solid #444;
    }
    .yh-welcome-btn-skip:not(:disabled):hover { background: #444; color: #ccc; }
    .yh-welcome-btn-skip:disabled { opacity: 0.5; cursor: not-allowed; }
    .yh-spotlight-hole {
      position: fixed; z-index: 2147483647;
      border-radius: 8px;
      box-shadow: 0 0 0 9999px rgba(0,0,0,0.7);
      transition: all 0.4s ease;
      pointer-events: none;
    }
    .yh-spotlight-tooltip {
      position: fixed; z-index: 2147483647;
      background: #1e1e1e; border: 1px solid #333; border-radius: 10px;
      padding: 20px; width: 320px; max-width: 90vw;
      color: #e0e0e0;
      box-shadow: 0 4px 20px rgba(0,0,0,0.5);
      transition: all 0.4s ease;
    }
    .yh-spot-step-badge {
      display: inline-block; font-size: 11px; font-weight: 600;
      color: #10b981; background: rgba(16,185,129,0.12);
      padding: 2px 10px; border-radius: 20px; margin-bottom: 10px;
    }
    .yh-spot-title { font-size: 15px; font-weight: 700; margin-bottom: 6px; color: #f0f0f0; }
    .yh-spot-desc { font-size: 12.5px; line-height: 1.6; color: #aaa; margin-bottom: 16px; }
    .yh-spot-footer { display: flex; align-items: center; justify-content: space-between; }
    .yh-spot-dots { display: flex; gap: 6px; }
    .yh-spot-dot {
      width: 7px; height: 7px; border-radius: 50%; background: #444;
      transition: background 0.2s ease;
    }
    .yh-spot-dot.active { background: #10b981; }
    .yh-spot-btns { display: flex; gap: 8px; }
    .yh-spot-btn {
      padding: 7px 16px; border-radius: 6px; font-size: 12px; font-weight: 600;
      cursor: pointer; border: none; transition: all 0.2s ease;
    }
    .yh-spot-btn-back { background: #333; color: #aaa; }
    .yh-spot-btn-back:hover { background: #444; color: #ddd; }
    .yh-spot-btn-next { background: #10b981; color: #fff; }
    .yh-spot-btn-next:hover { background: #0d9668; }
  `;
}

function showTutorialWelcomeCard() {
  if (tutorialOverlay) return;
  if (prefs.tutorialCompleted) return;

  tutorialOverlay = document.createElement('div');
  tutorialOverlay.id = 'yh-tutorial-host';
  const shadow = tutorialOverlay.attachShadow({ mode: 'closed' });

  const style = document.createElement('style');
  style.textContent = getTutorialCSS();
  shadow.appendChild(style);

  const overlay = document.createElement('div');
  overlay.className = 'yh-tutorial-overlay';

  const card = document.createElement('div');
  card.className = 'yh-welcome-card';

  const logo = document.createElement('img');
  logo.src = chrome.runtime.getURL('assets/icons/youtube-hider-logo.png');
  logo.className = 'yh-welcome-logo';

  const title = document.createElement('div');
  title.className = 'yh-welcome-title';
  title.textContent = 'Welcome to Youtube Hider!';

  const desc = document.createElement('div');
  desc.className = 'yh-welcome-desc';
  desc.textContent = 'Take a quick tour to discover how to use the floating button, customize your settings, and get the most out of the extension.';

  const actions = document.createElement('div');
  actions.className = 'yh-welcome-actions';

  const startBtn = document.createElement('button');
  startBtn.className = 'yh-welcome-btn yh-welcome-btn-start';
  startBtn.textContent = 'Start Tutorial';

  const skipBtn = document.createElement('button');
  skipBtn.className = 'yh-welcome-btn yh-welcome-btn-skip';
  skipBtn.disabled = true;
  let skipCountdown = 5;
  skipBtn.textContent = `Skip (${skipCountdown}s)`;
  tutorialSkipInterval = setInterval(() => {
    skipCountdown--;
    if (skipCountdown <= 0) {
      clearInterval(tutorialSkipInterval);
      tutorialSkipInterval = null;
      skipBtn.textContent = 'Skip';
      skipBtn.disabled = false;
    } else {
      skipBtn.textContent = `Skip (${skipCountdown}s)`;
    }
  }, 1000);

  startBtn.addEventListener('click', () => {
    clearInterval(tutorialSkipInterval);
    tutorialSkipInterval = null;
    removeTutorialOverlay();
    startSpotlightTour();
  });

  skipBtn.addEventListener('click', () => {
    if (skipBtn.disabled) return;
    clearInterval(tutorialSkipInterval);
    tutorialSkipInterval = null;
    prefs.tutorialCompleted = true;
    safeStorageSet('sync', { tutorialCompleted: true });
    removeTutorialOverlay();
  });

  actions.appendChild(startBtn);
  actions.appendChild(skipBtn);
  card.appendChild(logo);
  card.appendChild(title);
  card.appendChild(desc);
  card.appendChild(actions);
  overlay.appendChild(card);
  shadow.appendChild(overlay);

  document.body.appendChild(tutorialOverlay);
}

function cleanupTour() {
  if (tutorialActive) {
    tutorialActive = false;
    miniPanelOpen = false;

    if (floatingButtonHost) {
      floatingButtonHost.style.zIndex = '2147483640';
      floatingButtonHost.style.pointerEvents = 'auto';
    }
    if (fabPanel) fabPanel.style.pointerEvents = '';
    if (fabElement) fabElement.style.pointerEvents = '';
  }
  if (tourHost) {
    tourHost.remove();
    tourHost = null;
  }
  if (tourBlocker) {
    tourBlocker.remove();
    tourBlocker = null;
  }
}

function removeTutorialOverlay() {
  if (tutorialSkipInterval) {
    clearInterval(tutorialSkipInterval);
    tutorialSkipInterval = null;
  }
  if (tutorialOverlay) {
    tutorialOverlay.remove();
    tutorialOverlay = null;
  }
}

function startSpotlightTour() {
  if (!floatingButtonHost || !fabElement) {
    prefs.tutorialCompleted = true;
    safeStorageSet('sync', { tutorialCompleted: true });
    return;
  }

  tutorialActive = true;

  const steps = [
    {
      title: 'Your Quick Settings Button',
      desc: 'This is the Youtube Hider floating button. Click it anytime to access quick settings without leaving YouTube.',
      getTarget: () => fabElement,
      onEnter: () => {
        if (miniPanelOpen) {
          miniPanelOpen = false;
          fabPanel.classList.remove('open');
          fabElement.classList.remove('active');
        }
      },
    },
    {
      title: 'Quick Settings Panel',
      desc: 'Here you can toggle Hide Watched Videos, Hide Shorts, and Minimum Views Filter. Changes are applied instantly!',
      getTarget: () => fabPanel,
      onEnter: () => {
        if (!miniPanelOpen) {
          miniPanelOpen = true;
          fabPanel.classList.add('open');
          void fabPanel.offsetHeight;
          fabElement.classList.add('active');
          syncPanelToPrefs(fabShadow);
        }
      },
    },
    {
      title: 'Hide This Button',
      desc: "If the floating button bothers you, click \"Hide this button\" at the bottom of the panel. Don't worry, the extension keeps working in the background and you can re-enable it from settings!",
      getTarget: () => fabShadow.querySelector('#yh-p-hide-btn') || fabPanel,
      onEnter: () => {
        if (!miniPanelOpen) {
          miniPanelOpen = true;
          fabPanel.classList.add('open');
          void fabPanel.offsetHeight;
          fabElement.classList.add('active');
          syncPanelToPrefs(fabShadow);
        }
      },
    },
    {
      title: 'Advanced Settings',
      desc: 'Click "Open full settings" to access per-page controls, Easy Mode, streaming skip settings, and more. All the customization you need in one place!',
      getTarget: () => fabShadow.querySelector('#yh-p-open-full') || fabPanel,
      onEnter: () => {
        if (!miniPanelOpen) {
          miniPanelOpen = true;
          fabPanel.classList.add('open');
          void fabPanel.offsetHeight;
          fabElement.classList.add('active');
          syncPanelToPrefs(fabShadow);
        }
      },
    },
    {
      title: 'Drag It Anywhere!',
      desc: 'The floating button is fully draggable. Click and drag it to snap it to any edge of the screen. Place it wherever suits you best.',
      getTarget: () => fabElement,
      onEnter: () => {
        if (miniPanelOpen) {
          miniPanelOpen = false;
          fabPanel.classList.remove('open');
          fabElement.classList.remove('active');
        }
      },
    },
  ];

  let currentStep = 0;
  let hole = null;
  let tooltip = null;
  let tourShadow = null;

  function createTourElements() {
    tourBlocker = document.createElement('div');
    tourBlocker.id = 'yh-tour-blocker';
    Object.assign(tourBlocker.style, {
      position: 'fixed', inset: '0', zIndex: '2147483645', pointerEvents: 'auto',
      background: 'transparent',
    });
    document.body.appendChild(tourBlocker);

    floatingButtonHost.style.zIndex = '2147483646';
    floatingButtonHost.style.pointerEvents = 'none';
    fabPanel.style.pointerEvents = 'none';
    fabElement.style.pointerEvents = 'none';

    tourHost = document.createElement('div');
    tourHost.id = 'yh-spotlight-host';
    Object.assign(tourHost.style, {
      position: 'fixed', inset: '0', zIndex: '2147483647', pointerEvents: 'none',
    });
    tourShadow = tourHost.attachShadow({ mode: 'closed' });

    const style = document.createElement('style');
    style.textContent = getTutorialCSS();
    tourShadow.appendChild(style);

    hole = document.createElement('div');
    hole.className = 'yh-spotlight-hole';
    tourShadow.appendChild(hole);

    tooltip = document.createElement('div');
    tooltip.className = 'yh-spotlight-tooltip';
    tooltip.style.pointerEvents = 'auto';
    tourShadow.appendChild(tooltip);

    document.body.appendChild(tourHost);
  }

  function computeTargetRect(step) {
    const el = step.getTarget();
    if (!el) return { top: 100, left: 100, width: 40, height: 40 };

    const hostRect = floatingButtonHost.getBoundingClientRect();

    if (el === fabElement) {
      return { top: hostRect.top, left: hostRect.left, width: hostRect.width, height: hostRect.height };
    }

    if (el === fabPanel) {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) {
        return { top: r.top, left: r.left, width: r.width, height: r.height };
      }
      const panelW = el.offsetWidth || 260;
      const panelH = el.offsetHeight || 320;
      let panelTop, panelLeft;
      if (el.style.bottom && el.style.bottom !== 'auto') {
        panelTop = hostRect.top - panelH - 12;
      } else {
        panelTop = hostRect.bottom + 12;
      }
      if (el.style.right && el.style.right !== 'auto' && el.style.right !== '') {
        panelLeft = hostRect.right - panelW;
      } else {
        panelLeft = hostRect.left;
      }
      return { top: panelTop, left: panelLeft, width: panelW, height: panelH };
    }

    if (el.getRootNode() !== document) {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) {
        return { top: r.top, left: r.left, width: r.width, height: r.height };
      }
      const panelRect = computeTargetRect({ getTarget: () => fabPanel });
      return {
        top: panelRect.top,
        left: panelRect.left,
        width: panelRect.width,
        height: panelRect.height,
      };
    }

    const r = el.getBoundingClientRect();
    return { top: r.top, left: r.left, width: r.width, height: r.height };
  }

  function positionTooltip(rect) {
    const PADDING = 12;
    const tooltipW = 320;
    const tooltipH = tooltip.offsetHeight || 180;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let top, left;
    const spaceBelow = vh - (rect.top + rect.height + PADDING);
    const spaceAbove = rect.top - PADDING;

    if (spaceBelow >= tooltipH + PADDING) {
      top = rect.top + rect.height + PADDING;
    } else if (spaceAbove >= tooltipH + PADDING) {
      top = rect.top - tooltipH - PADDING;
    } else {
      top = Math.max(PADDING, Math.min(vh - tooltipH - PADDING, rect.top));
    }

    const centerX = rect.left + rect.width / 2;
    left = centerX - tooltipW / 2;
    left = Math.max(PADDING, Math.min(vw - tooltipW - PADDING, left));

    tooltip.style.top = top + 'px';
    tooltip.style.left = left + 'px';
    tooltip.style.width = tooltipW + 'px';
  }

  function waitForPanelTransition() {
    return new Promise(resolve => {
      let resolved = false;
      const done = () => {
        if (resolved) return;
        resolved = true;
        fabPanel.removeEventListener('transitionend', onEnd);
        resolve();
      };
      const onEnd = (e) => {
        if (e.target === fabPanel) done();
      };
      fabPanel.addEventListener('transitionend', onEnd);
      setTimeout(done, 300);
    });
  }

  function measureAndPosition(step) {
    const PAD = 8;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const rect = computeTargetRect(step);

    rect.top = Math.max(0, Math.min(rect.top, vh - rect.height));
    rect.left = Math.max(0, Math.min(rect.left, vw - rect.width));

    hole.style.top = (rect.top - PAD) + 'px';
    hole.style.left = (rect.left - PAD) + 'px';
    hole.style.width = (rect.width + PAD * 2) + 'px';
    hole.style.height = (rect.height + PAD * 2) + 'px';

    const dotsHTML = steps.map((_, i) =>
      `<div class="yh-spot-dot${i === currentStep ? ' active' : ''}"></div>`
    ).join('');

    const backBtn = currentStep > 0
      ? `<button class="yh-spot-btn yh-spot-btn-back" id="yh-tour-back">Back</button>`
      : '';
    const nextLabel = currentStep === steps.length - 1 ? 'Done' : 'Next';

    tooltip.innerHTML = `
      <div class="yh-spot-step-badge">Step ${currentStep + 1} of ${steps.length}</div>
      <div class="yh-spot-title">${step.title}</div>
      <div class="yh-spot-desc">${step.desc}</div>
      <div class="yh-spot-footer">
        <div class="yh-spot-dots">${dotsHTML}</div>
        <div class="yh-spot-btns">
          ${backBtn}
          <button class="yh-spot-btn yh-spot-btn-next" id="yh-tour-next">${nextLabel}</button>
        </div>
      </div>
    `;

    positionTooltip(rect);

    const nextEl = tourShadow.querySelector('#yh-tour-next');
    const backEl = tourShadow.querySelector('#yh-tour-back');

    nextEl.addEventListener('click', () => {
      if (currentStep < steps.length - 1) {
        currentStep++;
        renderStep();
      } else {
        finishTour();
      }
    });

    if (backEl) {
      backEl.addEventListener('click', () => {
        if (currentStep > 0) {
          currentStep--;
          renderStep();
        }
      });
    }
  }

  async function renderStep() {
    const step = steps[currentStep];
    const wasPanelOpen = miniPanelOpen;
    step.onEnter();
    const isPanelOpen = miniPanelOpen;
    const panelTransitioned = wasPanelOpen !== isPanelOpen;

    if (panelTransitioned) {
      await waitForPanelTransition();
    }

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        measureAndPosition(step);
      });
    });
  }

  function finishTour() {
    tutorialActive = false;
    prefs.tutorialCompleted = true;
    safeStorageSet('sync', { tutorialCompleted: true });

    if (miniPanelOpen && fabPanel && fabElement) {
      miniPanelOpen = false;
      fabPanel.classList.remove('open');
      fabElement.classList.remove('active');
    }

    if (floatingButtonHost) {
      floatingButtonHost.style.zIndex = '2147483640';
      floatingButtonHost.style.pointerEvents = 'auto';
    }
    if (fabPanel) fabPanel.style.pointerEvents = '';
    if (fabElement) fabElement.style.pointerEvents = '';

    if (tourHost) {
      tourHost.remove();
      tourHost = null;
    }
    if (tourBlocker) {
      tourBlocker.remove();
      tourBlocker = null;
    }
  }

  createTourElements();
  renderStep();
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
            cleanupTour();
            removeTutorialOverlay();
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
          ? 'ytd-compact-video-renderer, ytd-rich-item-renderer, ytd-video-renderer, ytm-video-with-context-renderer, ytm-compact-video-renderer'
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

const SUFFIX_MULTIPLIERS = {
  k: 1e3,
  m: 1e6,
  mln: 1e6,
  mio: 1e6,
  mn: 1e6,
  b: 1e9,
  md: 1e9,
  '万': 1e4,
  '만': 1e4,
  '억': 1e8,
  'тыс': 1e3,
  'млн': 1e6,
  'млрд': 1e9,
  mi: 1e3,
  mil: 1e3,
  rb: 1e3,
  lakh: 1e5,
  cr: 1e7,
};

const SUFFIX_REGEX = new RegExp(
  '(' +
    Object.keys(SUFFIX_MULTIPLIERS)
      .sort((a, b) => b.length - a.length)
      .map(s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .join('|') +
  ')\\.?',
  'i',
);

function extractNumberAndSuffix(input) {
  const s = String(input).trim().replace(/\s+(?=\d)/g, '');
  const numMatch = s.match(/^([\d.,]+)/);
  if (!numMatch) return { numStr: '', suffix: '', remainder: s };

  const numStr = numMatch[1];
  const afterNum = s.slice(numMatch[0].length).trimStart();

  const suffixMatch = afterNum.match(SUFFIX_REGEX);
  if (suffixMatch && afterNum.indexOf(suffixMatch[0]) === 0) {
    const suffix = suffixMatch[1].toLowerCase();
    const remainder = afterNum.slice(suffixMatch[0].length).trim();
    return { numStr, suffix, remainder };
  }

  return { numStr, suffix: '', remainder: afterNum.trim() };
}

function normalizeNumStr(numStr) {
  const dots = (numStr.match(/\./g) || []).length;
  const commas = (numStr.match(/,/g) || []).length;

  if (dots > 0 && commas > 0) {
    const lastDot = numStr.lastIndexOf('.');
    const lastComma = numStr.lastIndexOf(',');
    if (lastDot > lastComma) {
      return numStr.replace(/,/g, '');
    } else {
      return numStr.replace(/\./g, '').replace(',', '.');
    }
  }

  if (dots > 1) return numStr.replace(/\./g, '');
  if (commas > 1) return numStr.replace(/,/g, '');

  if (commas === 1) return numStr.replace(',', '.');

  return numStr;
}

function parseToNumber(input) {
  const { numStr, suffix } = extractNumberAndSuffix(input);
  if (!numStr) return NaN;

  const normalized = normalizeNumStr(numStr);
  const base = parseFloat(normalized);
  if (isNaN(base)) return NaN;

  const multiplier = suffix ? (SUFFIX_MULTIPLIERS[suffix] || 1) : 1;
  return base * multiplier;
}

function extractViewCount(text) {
  const s = String(text).trim();
  if (!/\d/.test(s)) return NaN;

  const { numStr, suffix, remainder } = extractNumberAndSuffix(s);
  if (!numStr) return NaN;

  const normalized = normalizeNumStr(numStr);
  const base = parseFloat(normalized);
  if (isNaN(base)) return NaN;

  if (suffix && SUFFIX_MULTIPLIERS[suffix]) {
    return { views: base * SUFFIX_MULTIPLIERS[suffix], confidence: 'high' };
  }

  if (!remainder) {
    return { views: base, confidence: 'low' };
  }

  const words = remainder.split(/\s+/).filter(Boolean);
  if (words.length === 1 && /^[\p{Script=Latin}]+$/u.test(words[0])) {
    return { views: base, confidence: 'low' };
  }

  return NaN;
}

function getVideoContainerSelectors() {
  const pathname = window.location.pathname;
  const isChannelPage = pathname && pathname.startsWith('/@');

  if (pathname === '/watch') {
    return 'ytd-compact-video-renderer, ytd-rich-item-renderer, ytd-video-renderer, ytm-video-with-context-renderer, ytm-compact-video-renderer';
  }
  if (isChannelPage) {
    return 'ytd-compact-video-renderer, ytd-rich-item-renderer, ytd-video-renderer, ytd-grid-video-renderer, ytm-video-with-context-renderer, ytm-compact-video-renderer';
  }
  return 'ytd-compact-video-renderer, ytd-rich-item-renderer, ytd-video-renderer, ytm-video-with-context-renderer, ytm-compact-video-renderer, ytm-rich-item-renderer';
}

function findAndHideContainer(element, selectors) {
  let item = element;
  while (item && !item.matches(selectors)) {
    item = item.parentElement;
  }
  if (item) item.style.display = 'none';
}

function resolveViewsFromSpans(spans) {
  let lowCandidate = null;
  let anchorSpan = null;

  for (const span of spans) {
    const text = (span.textContent || '').trim();
    const result = extractViewCount(text);
    if (result && typeof result === 'object') {
      if (result.confidence === 'high') {
        return { views: result.views, span };
      }
      if (!lowCandidate) {
        lowCandidate = result.views;
        anchorSpan = span;
      }
    }
  }

  if (lowCandidate !== null) {
    return { views: lowCandidate, span: anchorSpan };
  }
  return null;
}

function hideUnderVisuals() {
  const { viewsHideThreshold } = prefs;
  const selectors = getVideoContainerSelectors();

  document.querySelectorAll('#metadata-line').forEach(metaLine => {
    let spans = metaLine.querySelectorAll('span.inline-metadata-item');
    if (!spans.length) {
      spans = metaLine.querySelectorAll('span');
    }
    if (!spans.length) return;

    const result = resolveViewsFromSpans(spans);
    if (!result || result.views >= viewsHideThreshold) return;

    findAndHideContainer(result.span, selectors);
  });

  document
    .querySelectorAll('.YtmBadgeAndBylineRendererItemByline')
    .forEach(span => {
      const text = (span.textContent || '').trim();
      const result = extractViewCount(text);
      if (!result || typeof result !== 'object') return;
      if (result.views >= viewsHideThreshold) return;

      const container = span.closest(
        'ytm-video-with-context-renderer, ytm-rich-item-renderer, ytm-compact-video-renderer',
      );

      if (container) {
        container.style.display = 'none';
        const wrapper = container.closest('ytm-rich-item-renderer');
        if (wrapper) wrapper.style.display = 'none';
      }
    });

  hideNewFormatVideos();
}

function hideNewFormatVideos() {
  const { viewsHideThreshold } = prefs;
  const selectors = getVideoContainerSelectors();

  document
    .querySelectorAll('yt-content-metadata-view-model, yt-lockup-view-model')
    .forEach(metadataContainer => {
      const metadataRows = metadataContainer.querySelectorAll(
        '.yt-content-metadata-view-model-wiz__metadata-row, .yt-content-metadata-view-model__metadata-row',
      );
      if (!metadataRows.length) return;

      const allSpans = [];
      metadataRows.forEach(row => {
        const span = row.querySelector('span.yt-core-attributed-string');
        if (span) allSpans.push(span);
      });

      const result = resolveViewsFromSpans(allSpans);

      try {
        logger.log('views-check', {
          views: result ? result.views : NaN,
          threshold: viewsHideThreshold,
          pathname: window.location.pathname,
        });
      } catch (e) {}

      if (!result || result.views >= viewsHideThreshold) return;

      findAndHideContainer(result.span, selectors);
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
    hideUnderVisuals();
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

    cleanupTour();
    removeTutorialOverlay();

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
    const tutorialPending = !prefs.tutorialCompleted && !isWatchPage();
    if (!isWatchPage()) {
      createFloatingButton(tutorialPending);
    }
    if (tutorialPending && floatingButtonHost) {
      setTimeout(() => showTutorialWelcomeCard(), 1500);
    }
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
