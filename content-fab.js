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
    host.style.top =
      Math.max(MARGIN, Math.min(offset, vh - hostH - MARGIN)) + 'px';
  } else if (pos.edge === 'right') {
    host.style.right = rightMargin + 'px';
    host.style.top =
      Math.max(MARGIN, Math.min(offset, vh - hostH - MARGIN)) + 'px';
  } else if (pos.edge === 'top') {
    host.style.top = MARGIN + 'px';
    host.style.left =
      Math.max(MARGIN, Math.min(offset, vw - hostW - scrollbarW - MARGIN)) +
      'px';
  } else {
    host.style.bottom = MARGIN + 'px';
    host.style.left =
      Math.max(MARGIN, Math.min(offset, vw - hostW - scrollbarW - MARGIN)) +
      'px';
  }

  let buttonTopPx;
  if (pos.edge === 'bottom') {
    buttonTopPx = vh - MARGIN - hostH;
  } else if (pos.edge === 'top') {
    buttonTopPx = MARGIN;
  } else {
    buttonTopPx = Math.min(offset, vh - hostH);
  }

  const isLeftHalf =
    pos.edge === 'left' ||
    ((pos.edge === 'top' || pos.edge === 'bottom') &&
      offset + hostW / 2 < vw / 2);
  const isBottomHalf = buttonTopPx + hostH / 2 > vh / 2;

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
      const current = prefs.floatingButtonPosition || {
        edge: 'bottom',
        offset: 20,
      };
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
    if (
      miniPanelOpen &&
      floatingButtonHost &&
      !floatingButtonHost.contains(e.target)
    ) {
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

const miniDateSteps = [0, 1, 3, 7, 14, 30, 60, 90, 180, 365, 730, 1825, 3650];
const miniDateLabels = [
  'Off',
  '1d',
  '3d',
  '1w',
  '2w',
  '1 mo',
  '2 mo',
  '3 mo',
  '6 mo',
  '1 yr',
  '2 yr',
  '5 yr',
  '10 yr',
];

const miniDateNewerSteps = [
  0,
  1 / 24,
  0.25,
  0.5,
  1,
  3,
  7,
  14,
  30,
  60,
  90,
  180,
  365,
  730,
  1825,
  3650,
];
const miniDateNewerLabels = [
  'Off',
  '1h',
  '6h',
  '12h',
  '1d',
  '3d',
  '1w',
  '2w',
  '1 mo',
  '2 mo',
  '3 mo',
  '6 mo',
  '1 yr',
  '2 yr',
  '5 yr',
  '10 yr',
];

function findClosestMiniDateNewerIndex(value) {
  let closestIndex = 0;
  let minDiff = Math.abs(miniDateNewerSteps[0] - value);
  for (let i = 1; i < miniDateNewerSteps.length; i++) {
    const diff = Math.abs(miniDateNewerSteps[i] - value);
    if (diff < minDiff) {
      minDiff = diff;
      closestIndex = i;
    }
  }
  return closestIndex;
}

function findClosestMiniDateIndex(value) {
  let closestIndex = 0;
  let minDiff = Math.abs(miniDateSteps[0] - value);
  for (let i = 1; i < miniDateSteps.length; i++) {
    const diff = Math.abs(miniDateSteps[i] - value);
    if (diff < minDiff) {
      minDiff = diff;
      closestIndex = i;
    }
  }
  return closestIndex;
}

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
  const hideShortsToggle = shadow.querySelector('#yh-p-hide-shorts');
  const thresholdSlider = shadow.querySelector('#yh-p-threshold');
  const thresholdValue = shadow.querySelector('#yh-p-threshold-val');
  const viewsSlider = shadow.querySelector('#yh-p-views');
  const viewsValue = shadow.querySelector('#yh-p-views-val');

  if (hideShortsToggle) hideShortsToggle.checked = prefs.hideShortsEnabled;
  if (thresholdSlider) {
    thresholdSlider.value = prefs.hideThreshold;
    if (thresholdValue) {
      thresholdValue.textContent =
        prefs.hideThreshold === 0 ? 'Off' : prefs.hideThreshold + '%';
    }
    updateMiniSliderBg(thresholdSlider);
    updateMiniSliderOffState(thresholdSlider, prefs.hideThreshold === 0);
  }
  if (viewsSlider) {
    const idx = findClosestMiniViewsIndex(prefs.viewsHideThreshold);
    viewsSlider.value = idx;
    if (viewsValue) {
      viewsValue.textContent =
        idx === 0 ? 'Off' : formatMiniViews(miniViewsSteps[idx]);
    }
    updateMiniSliderBg(viewsSlider);
    updateMiniSliderOffState(viewsSlider, idx === 0);
  }

  // Date filter
  const dateNewerSlider = shadow.querySelector('#yh-p-date-newer');
  const dateNewerVal = shadow.querySelector('#yh-p-date-newer-val');
  const dateOlderSlider = shadow.querySelector('#yh-p-date-older');
  const dateOlderVal = shadow.querySelector('#yh-p-date-older-val');

  if (dateNewerSlider) {
    const idx = findClosestMiniDateNewerIndex(prefs.dateFilterNewerThreshold);
    dateNewerSlider.value = idx;
    if (dateNewerVal) dateNewerVal.textContent = miniDateNewerLabels[idx];
    updateMiniSliderBg(dateNewerSlider);
    updateMiniSliderOffState(dateNewerSlider, idx === 0);
  }
  if (dateOlderSlider) {
    const idx = findClosestMiniDateIndex(prefs.dateFilterOlderThreshold);
    dateOlderSlider.value = idx;
    if (dateOlderVal) dateOlderVal.textContent = miniDateLabels[idx];
    updateMiniSliderBg(dateOlderSlider);
    updateMiniSliderOffState(dateOlderSlider, idx === 0);
  }

  checkMiniDateOverlap(shadow);
}

function updateMiniSliderBg(slider) {
  const pct = ((slider.value - slider.min) / (slider.max - slider.min)) * 100;
  slider.style.background = `linear-gradient(to right, #ebebeb ${pct}%, #4a4a4a ${pct}%)`;
}

function updateMiniSliderOffState(slider, isOff) {
  const row = slider.closest('.yh-panel-slider-row');
  if (row) {
    const wrap = row.querySelector('.yh-panel-slider-wrap');
    if (wrap) {
      wrap.style.opacity = isOff ? '0.35' : '1';
    }
  }
}

function checkMiniDateOverlap(shadow) {
  const dateNewerSlider = shadow.querySelector('#yh-p-date-newer');
  const dateOlderSlider = shadow.querySelector('#yh-p-date-older');
  const warning = shadow.querySelector('#yh-p-date-overlap-warning');

  if (!dateNewerSlider || !dateOlderSlider) return;

  const newerIdx = parseInt(dateNewerSlider.value, 10);
  const olderIdx = parseInt(dateOlderSlider.value, 10);
  const newerThreshold = miniDateNewerSteps[newerIdx];
  const olderThreshold = miniDateSteps[olderIdx];

  // Both must be active (not Off) and overlapping
  const isOverlap =
    newerIdx > 0 && olderIdx > 0 && newerThreshold >= olderThreshold;

  if (warning) warning.style.visibility = isOverlap ? 'visible' : 'hidden';

  shadow.querySelectorAll('.yh-date-slider-row').forEach(row => {
    row.classList.toggle('yh-date-overlap', isOverlap);
  });
}

function bindPanelEvents(shadow) {
  const hideShortsToggle = shadow.querySelector('#yh-p-hide-shorts');
  const thresholdSlider = shadow.querySelector('#yh-p-threshold');
  const thresholdValue = shadow.querySelector('#yh-p-threshold-val');
  const viewsSlider = shadow.querySelector('#yh-p-views');
  const viewsValue = shadow.querySelector('#yh-p-views-val');
  const openFullBtn = shadow.querySelector('#yh-p-open-full');
  const hideButtonLink = shadow.querySelector('#yh-p-hide-btn');
  const closeBtn = shadow.querySelector('#yh-p-close');

  // Auto-enable per-page flags when slider leaves Off (floating menu = Easy Mode)
  function autoEnablePerPageMini(flagKeys, val) {
    if (val) {
      // Check if all flags are currently false
      const allOff = flagKeys.every(key => !prefs[key]);
      if (allOff) {
        const updates = {};
        flagKeys.forEach(key => {
          updates[key] = val;
        });
        safeStorageSet('sync', updates);
      }
    }
  }

  if (hideShortsToggle) {
    hideShortsToggle.addEventListener('change', () => {
      safeStorageSet('sync', {
        hideShortsEnabled: hideShortsToggle.checked,
        hideShortsSearchEnabled: hideShortsToggle.checked,
      });
    });
  }

  if (thresholdSlider) {
    thresholdSlider.addEventListener('input', () => {
      const val = parseInt(thresholdSlider.value, 10);
      if (thresholdValue)
        thresholdValue.textContent = val === 0 ? 'Off' : val + '%';
      updateMiniSliderBg(thresholdSlider);
      updateMiniSliderOffState(thresholdSlider, val === 0);
    });
    thresholdSlider.addEventListener('change', () => {
      const val = parseInt(thresholdSlider.value, 10);
      safeStorageSet('sync', { hideThreshold: val });
      if (val > 0) {
        autoEnablePerPageMini(
          [
            'hideHomeEnabled',
            'hideChannelEnabled',
            'hideSearchEnabled',
            'hideSubsEnabled',
            'hideCorrEnabled',
          ],
          true,
        );
      }
    });
  }

  if (viewsSlider) {
    viewsSlider.addEventListener('input', () => {
      const idx = parseInt(viewsSlider.value, 10);
      if (viewsValue)
        viewsValue.textContent =
          idx === 0 ? 'Off' : formatMiniViews(miniViewsSteps[idx]);
      updateMiniSliderBg(viewsSlider);
      updateMiniSliderOffState(viewsSlider, idx === 0);
    });
    viewsSlider.addEventListener('change', () => {
      const idx = parseInt(viewsSlider.value, 10);
      safeStorageSet('sync', { viewsHideThreshold: miniViewsSteps[idx] });
      if (idx > 0) {
        autoEnablePerPageMini(
          [
            'viewsHideHomeEnabled',
            'viewsHideChannelEnabled',
            'viewsHideSearchEnabled',
            'viewsHideSubsEnabled',
            'viewsHideCorrEnabled',
          ],
          true,
        );
      }
    });
  }

  // Date filter handlers
  const dateNewerSlider = shadow.querySelector('#yh-p-date-newer');
  const dateNewerVal = shadow.querySelector('#yh-p-date-newer-val');
  const dateOlderSlider = shadow.querySelector('#yh-p-date-older');
  const dateOlderVal = shadow.querySelector('#yh-p-date-older-val');

  if (dateNewerSlider) {
    dateNewerSlider.addEventListener('input', () => {
      const idx = parseInt(dateNewerSlider.value, 10);
      if (dateNewerVal) dateNewerVal.textContent = miniDateNewerLabels[idx];
      updateMiniSliderBg(dateNewerSlider);
      updateMiniSliderOffState(dateNewerSlider, idx === 0);
      checkMiniDateOverlap(shadow);
    });
    dateNewerSlider.addEventListener('change', () => {
      const idx = parseInt(dateNewerSlider.value, 10);
      safeStorageSet('sync', {
        dateFilterNewerThreshold: miniDateNewerSteps[idx],
      });
      if (idx > 0) {
        autoEnablePerPageMini(
          [
            'dateFilterHomeEnabled',
            'dateFilterChannelEnabled',
            'dateFilterSearchEnabled',
            'dateFilterSubsEnabled',
            'dateFilterCorrEnabled',
          ],
          true,
        );
      }
    });
  }

  if (dateOlderSlider) {
    dateOlderSlider.addEventListener('input', () => {
      const idx = parseInt(dateOlderSlider.value, 10);
      if (dateOlderVal) dateOlderVal.textContent = miniDateLabels[idx];
      updateMiniSliderBg(dateOlderSlider);
      updateMiniSliderOffState(dateOlderSlider, idx === 0);
      checkMiniDateOverlap(shadow);
    });
    dateOlderSlider.addEventListener('change', () => {
      const idx = parseInt(dateOlderSlider.value, 10);
      safeStorageSet('sync', { dateFilterOlderThreshold: miniDateSteps[idx] });
      if (idx > 0) {
        autoEnablePerPageMini(
          [
            'dateFilterHomeEnabled',
            'dateFilterChannelEnabled',
            'dateFilterSearchEnabled',
            'dateFilterSubsEnabled',
            'dateFilterCorrEnabled',
          ],
          true,
        );
      }
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
      window.removeEventListener(
        'resize',
        floatingButtonHost._onViewportResize,
      );
    }
    if (floatingButtonHost._onDocumentClick) {
      document.removeEventListener(
        'click',
        floatingButtonHost._onDocumentClick,
      );
    }
    if (floatingButtonHost._onDocumentKeydown) {
      document.removeEventListener(
        'keydown',
        floatingButtonHost._onDocumentKeydown,
      );
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
        <div class="yh-panel-row">
          <div class="yh-panel-label-wrap">
            <span class="yh-panel-label">Hide Watched Videos</span>
            <span class="yh-info-wrap">${infoSvg}<span class="yh-tooltip">Hides videos you've already watched beyond the set threshold</span></span>
          </div>
        </div>
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
        <div class="yh-panel-row">
          <div class="yh-panel-label-wrap">
            <span class="yh-panel-label">Minimum Views Filter</span>
            <span class="yh-info-wrap">${infoSvg}<span class="yh-tooltip">Hides videos with fewer views than the set minimum</span></span>
          </div>
        </div>
        <div class="yh-panel-slider-row">
          <span class="yh-panel-sublabel">Minimum views</span>
          <div class="yh-panel-slider-wrap">
            <input type="range" id="yh-p-views" min="0" max="17" step="1" value="3" class="yh-panel-slider" />
            <span class="yh-panel-slider-val" id="yh-p-views-val">1K</span>
          </div>
        </div>
      </div>
      <div class="yh-panel-group">
        <div class="yh-panel-row">
          <div class="yh-panel-label-wrap">
            <span class="yh-panel-label">Upload Date Filter</span>
            <span class="yh-info-wrap">${infoSvg}<span class="yh-tooltip">Hides videos by their upload date</span></span>
          </div>
        </div>
        <div class="yh-panel-slider-row yh-date-slider-row">
          <span class="yh-panel-sublabel">Hide newer than</span>
          <div class="yh-panel-slider-wrap">
            <input type="range" id="yh-p-date-newer" min="0" max="15" step="1" value="0" class="yh-panel-slider" />
            <span class="yh-panel-slider-val" id="yh-p-date-newer-val">Off</span>
          </div>
        </div>
        <div class="yh-panel-slider-row yh-date-slider-row">
          <span class="yh-panel-sublabel">Hide older than</span>
          <div class="yh-panel-slider-wrap">
            <input type="range" id="yh-p-date-older" min="0" max="12" step="1" value="0" class="yh-panel-slider" />
            <span class="yh-panel-slider-val" id="yh-p-date-older-val">Off</span>
          </div>
        </div>
        <div class="yh-date-overlap-warning" id="yh-p-date-overlap-warning" style="visibility: hidden;">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="12" height="12">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
          <span>Filter not active: ranges overlap</span>
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
      position: relative;
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
      position: static;
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
      bottom: calc(100% + 4px);
      left: 10px;
      right: 10px;
      width: auto;
      background: #333;
      color: #ddd;
      font-size: 11px;
      font-weight: 400;
      line-height: 1.4;
      padding: 6px 10px;
      border-radius: 4px;
      white-space: normal;
      box-shadow: 0 2px 8px rgba(0,0,0,0.4);
      pointer-events: none;
      transition: opacity 0.15s, visibility 0.15s;
      z-index: 10;
    }
    .yh-tooltip::after {
      content: '';
      position: absolute;
      top: 100%;
      right: 20px;
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

    .yh-date-slider-row .yh-panel-slider-wrap {
      border: 1px solid transparent;
      border-radius: 6px;
      padding: 4px 6px;
    }
    .yh-date-slider-row.yh-date-overlap .yh-panel-slider-wrap {
      border-color: rgba(239, 68, 68, 0.5);
    }
    .yh-date-overlap-warning {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 5px;
      padding: 4px 10px;
      margin: 0 10px 4px;
      border-radius: 4px;
      background-color: rgba(239, 68, 68, 0.12);
      border: 1px solid rgba(239, 68, 68, 0.35);
    }
    .yh-date-overlap-warning svg {
      color: #ef4444;
      flex-shrink: 0;
    }
    .yh-date-overlap-warning span {
      font-size: 10px;
      font-weight: 500;
      color: #ef4444;
      line-height: 1.2;
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
