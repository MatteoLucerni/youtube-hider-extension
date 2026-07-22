let headerButtonHost = null;
let headerButtonElement = null;
let headerDropdownHost = null;
let headerDropdownShadow = null;
let headerDropdownOpen = false;
let headerDropdownResizeHandler = null;
let headerDropdownReadyPromise = null;

function getHeaderButtonCSS() {
  return `
    .yh-header-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      margin-right: 8px;
      padding: 0;
      border: none;
      border-radius: 50%;
      background: transparent;
      color: #909090;
      cursor: pointer;
      outline: none;
      transition: background 0.15s ease, box-shadow 0.15s ease, color 0.15s ease;
    }
    .yh-header-btn:hover {
      background: rgba(0, 0, 0, 0.06);
      color: #606060;
    }
    .yh-header-btn.yh-dark {
      color: #808080;
    }
    .yh-header-btn.yh-dark:hover {
      background: rgba(255, 255, 255, 0.1);
      color: #aaaaaa;
    }
    .yh-header-btn.active {
      box-shadow: 0 0 0 2px #8ab4f8;
    }
    .yh-header-btn-icon {
      width: 22px;
      height: 22px;
      display: block;
      fill: currentColor;
      pointer-events: none;
    }
  `;
}

function getHeaderDropdownCSS() {
  return `
    .yh-dropdown-card {
      position: fixed;
      display: flex;
      background: #222222;
      border: 1px solid #3a3a3a;
      border-radius: 10px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
      overflow: hidden;
      z-index: 2147483640;
    }
    .yh-dropdown-iframe {
      width: 100%;
      height: 100%;
      border: none;
      display: block;
    }
  `;
}

function applyHeaderButtonTheme() {
  const isDark = isYouTubeDarkTheme();
  if (headerButtonElement) {
    headerButtonElement.classList.toggle('yh-dark', isDark);
  }
}

function getHeaderButtonIconMarkup() {
  return `
    <svg class="yh-header-btn-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M19.14 12.94c.04-.3.06-.61.06-.94s-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.484.484 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.47.47 0 0 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32a.49.49 0 0 0-.12-.61l-2.01-1.58ZM12 15.6A3.61 3.61 0 0 1 8.4 12c0-1.98 1.62-3.6 3.6-3.6s3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6Z"/>
    </svg>
  `;
}

function createHeaderButton() {
  if (window.location.hostname !== 'www.youtube.com') return;
  if (prefs.hideInterfaceElements) return;
  if (headerButtonHost && headerButtonHost.isConnected) return;

  const anchor = document.querySelector('ytd-masthead #end #buttons');
  if (!anchor) return;

  headerButtonHost = document.createElement('span');
  headerButtonHost.id = 'yh-header-button-host';

  const shadow = headerButtonHost.attachShadow({ mode: 'closed' });

  const style = document.createElement('style');
  style.textContent = getHeaderButtonCSS();
  shadow.appendChild(style);

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'yh-header-btn';
  button.setAttribute('aria-label', 'Youtube Hider Settings');
  button.title = 'Youtube Hider Settings';

  button.innerHTML = getHeaderButtonIconMarkup();

  button.addEventListener('click', e => {
    e.stopPropagation();
    toggleHeaderDropdown();
  });

  shadow.appendChild(button);
  anchor.insertBefore(headerButtonHost, anchor.firstChild);

  headerButtonElement = button;
  applyHeaderButtonTheme();
}

function ensureHeaderButton() {
  if (!prefs.extensionEnabled || !isYouTube()) return;
  createHeaderButton();
}

function removeHeaderButton() {
  closeHeaderDropdown();
  if (headerButtonHost) {
    headerButtonHost.remove();
  }
  headerButtonHost = null;
  headerButtonElement = null;
}

function toggleHeaderDropdown() {
  if (headerDropdownOpen) {
    closeHeaderDropdown();
  } else {
    openHeaderDropdown();
  }
}

function positionHeaderDropdown(card) {
  if (!headerButtonElement) return;
  const GAP = 8;
  const EDGE_PAD = 8;
  const WIDTH = 400;
  const MAX_HEIGHT = 640;

  const rect = headerButtonElement.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  let left = rect.right - WIDTH;
  left = Math.max(EDGE_PAD, Math.min(left, vw - WIDTH - EDGE_PAD));

  const top = rect.bottom + GAP;
  const spaceBelow = vh - top - EDGE_PAD;
  const height = Math.max(1, Math.min(MAX_HEIGHT, spaceBelow));

  Object.assign(card.style, {
    left: left + 'px',
    top: top + 'px',
    width: WIDTH + 'px',
    height: height + 'px',
  });
}

function onHeaderDropdownResize() {
  if (!headerDropdownOpen || !headerDropdownShadow) return;
  const card = headerDropdownShadow.querySelector('.yh-dropdown-card');
  if (card) positionHeaderDropdown(card);
}

function sendMessageToHeaderDropdown(message) {
  if (!headerDropdownShadow) return;
  const iframe = headerDropdownShadow.querySelector('.yh-dropdown-iframe');
  if (!iframe || !iframe.contentWindow) return;
  const targetOrigin = new URL(chrome.runtime.getURL('popup/popup.html')).origin;
  iframe.contentWindow.postMessage(message, targetOrigin);
}

function getHeaderDropdownRect() {
  if (!headerDropdownShadow) return null;
  const card = headerDropdownShadow.querySelector('.yh-dropdown-card');
  return card ? card.getBoundingClientRect() : null;
}

function setHeaderButtonInteractive(interactive) {
  if (headerButtonElement) {
    headerButtonElement.style.pointerEvents = interactive ? '' : 'none';
  }
}

function setHeaderDropdownInteractive(interactive) {
  if (!headerDropdownShadow) return;
  const card = headerDropdownShadow.querySelector('.yh-dropdown-card');
  if (card) {
    card.style.zIndex = interactive ? '' : '2147483646';
    card.style.pointerEvents = interactive ? '' : 'none';
  }
}

function onHeaderDocumentClick(e) {
  if (tutorialActive) return;
  if (
    headerDropdownOpen &&
    !(headerButtonHost && headerButtonHost.contains(e.target)) &&
    !(headerDropdownHost && headerDropdownHost.contains(e.target))
  ) {
    closeHeaderDropdown();
  }
}

function onHeaderDocumentKeydown(e) {
  if (tutorialActive) return;
  if (e.key === 'Escape' && headerDropdownOpen) {
    closeHeaderDropdown();
  }
}

function openHeaderDropdown() {
  if (headerDropdownOpen || !headerButtonElement) return;
  headerDropdownOpen = true;

  headerDropdownHost = document.createElement('div');
  headerDropdownHost.id = 'yh-header-dropdown-host';

  headerDropdownShadow = headerDropdownHost.attachShadow({ mode: 'closed' });

  const style = document.createElement('style');
  style.textContent = getHeaderDropdownCSS();
  headerDropdownShadow.appendChild(style);

  const card = document.createElement('div');
  card.className = 'yh-dropdown-card';

  const iframe = document.createElement('iframe');
  iframe.className = 'yh-dropdown-iframe';
  card.appendChild(iframe);

  headerDropdownShadow.appendChild(card);
  document.body.appendChild(headerDropdownHost);

  positionHeaderDropdown(card);
  headerButtonElement.classList.add('active');

  headerDropdownReadyPromise = new Promise(resolve => {
    iframe.addEventListener(
      'load',
      () => requestAnimationFrame(() => resolve()),
      { once: true },
    );
  });
  iframe.src = chrome.runtime.getURL('popup/popup.html');

  document.addEventListener('click', onHeaderDocumentClick);
  document.addEventListener('keydown', onHeaderDocumentKeydown);
  headerDropdownResizeHandler = onHeaderDropdownResize;
  window.addEventListener('resize', headerDropdownResizeHandler);
}

function waitForHeaderDropdownReady() {
  return headerDropdownReadyPromise || Promise.resolve();
}

function closeHeaderDropdown() {
  if (!headerDropdownOpen) return;
  headerDropdownOpen = false;

  document.removeEventListener('click', onHeaderDocumentClick);
  document.removeEventListener('keydown', onHeaderDocumentKeydown);
  if (headerDropdownResizeHandler) {
    window.removeEventListener('resize', headerDropdownResizeHandler);
    headerDropdownResizeHandler = null;
  }

  if (headerDropdownHost) {
    headerDropdownHost.remove();
    headerDropdownHost = null;
  }
  headerDropdownShadow = null;
  headerDropdownReadyPromise = null;
  if (headerButtonElement) {
    headerButtonElement.classList.remove('active');
  }
}
