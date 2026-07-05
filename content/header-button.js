let headerButtonHost = null;
let headerButtonElement = null;
let headerButtonIconElement = null;
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
      cursor: pointer;
      outline: none;
      transition: background 0.15s ease, box-shadow 0.15s ease;
    }
    .yh-header-btn:hover {
      background: rgba(0, 0, 0, 0.06);
    }
    .yh-header-btn.yh-dark:hover {
      background: rgba(255, 255, 255, 0.1);
    }
    .yh-header-btn.active {
      box-shadow: 0 0 0 2px #8ab4f8;
    }
    .yh-header-btn-icon {
      width: 22px;
      height: 22px;
      object-fit: contain;
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
  if (headerButtonIconElement) {
    headerButtonIconElement.src = chrome.runtime.getURL(
      isDark
        ? 'assets/icons/youtube-hider-logo.png'
        : 'assets/icons/youtube-hider-logo-light.png',
    );
  }
}

function createHeaderButton(forceForTutorial = false) {
  if (window.location.hostname !== 'www.youtube.com') return;
  if (prefs.hideInterfaceElements) return;
  if (headerButtonHost && headerButtonHost.isConnected) return;
  if (!forceForTutorial && !prefs.headerButtonEnabled) return;

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

  const img = document.createElement('img');
  img.className = 'yh-header-btn-icon';
  img.alt = '';
  button.appendChild(img);

  button.addEventListener('click', e => {
    e.stopPropagation();
    toggleHeaderDropdown();
  });

  shadow.appendChild(button);
  anchor.insertBefore(headerButtonHost, anchor.firstChild);

  headerButtonElement = button;
  headerButtonIconElement = img;
  applyHeaderButtonTheme();
}

function removeHeaderButton() {
  closeHeaderDropdown();
  if (headerButtonHost) {
    headerButtonHost.remove();
  }
  headerButtonHost = null;
  headerButtonElement = null;
  headerButtonIconElement = null;
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
