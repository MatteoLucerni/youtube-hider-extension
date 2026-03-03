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
