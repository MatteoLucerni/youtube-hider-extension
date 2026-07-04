const INLINE_WHITELIST_BTN_ID = 'yt-hider-inline-whitelist-btn';

const INLINE_WHITELIST_CHECK_ICON =
  '<svg width="12" height="10" viewBox="0 0 12 10" fill="none" aria-hidden="true"><path d="M1 5l3.5 3.5L11 1" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>';

function getInlineWhitelistLogoUrl(isDark) {
  try {
    return chrome.runtime.getURL(
      isDark
        ? 'assets/icons/youtube-hider-logo.png'
        : 'assets/icons/youtube-hider-logo-light.png',
    );
  } catch (_) {
    return '';
  }
}

function isInlineWhitelistPath(pathname) {
  return pathname === '/watch' || (pathname && (pathname.startsWith('/@') || pathname.startsWith('/channel/')));
}

function isYouTubeDarkTheme() {
  return document.documentElement.hasAttribute('dark');
}

function watchYouTubeTheme() {
  const observer = new MutationObserver(() => {
    const btn = document.getElementById(INLINE_WHITELIST_BTN_ID);
    if (btn) updateInlineWhitelistButtonState(btn, btn.ytHiderChannelValue);
  });
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['dark'],
  });
}

function injectInlineWhitelistStyles() {
  if (document.getElementById('yt-hider-inline-whitelist-styles')) return;
  const style = document.createElement('style');
  style.id = 'yt-hider-inline-whitelist-styles';
  style.textContent = `
    .yt-hider-inline-whitelist-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      height: 36px;
      padding: 0 16px;
      margin-left: 8px;
      border: none;
      border-radius: 18px;
      font-size: 14px;
      font-weight: 500;
      font-family: 'Roboto', Arial, sans-serif;
      cursor: pointer;
      white-space: nowrap;
      background: #f1f1f1;
      color: #0f0f0f;
      transition: background 0.15s ease, color 0.15s ease;
    }
    .yt-hider-inline-whitelist-btn:hover {
      background: #e5e5e5;
    }
    .yt-hider-inline-whitelist-btn:focus-visible {
      outline: 2px solid #065fd4;
      outline-offset: 2px;
    }
    .yt-hider-inline-whitelist-btn img {
      width: 18px;
      height: 18px;
      border-radius: 50%;
      display: block;
      flex-shrink: 0;
    }
    .yt-hider-inline-whitelist-btn .yt-hider-inline-whitelist-icon {
      display: inline-flex;
      align-items: center;
      flex-shrink: 0;
    }
    .yt-hider-inline-whitelist-btn.yt-hider-dark {
      background: #272727;
      color: #f1f1f1;
    }
    .yt-hider-inline-whitelist-btn.yt-hider-dark:hover {
      background: #3f3f3f;
    }
    .yt-hider-inline-whitelist-btn.is-whitelisted {
      background: #e8f0fe;
      color: #065fd4;
    }
    .yt-hider-inline-whitelist-btn.is-whitelisted:hover {
      background: #d7e6fd;
    }
    .yt-hider-inline-whitelist-btn.yt-hider-dark.is-whitelisted {
      background: #1b3a63;
      color: #bcd6ff;
    }
    .yt-hider-inline-whitelist-btn.yt-hider-dark.is-whitelisted:hover {
      background: #234a7d;
    }
  `;
  document.head.appendChild(style);
}

function findInlineWhitelistAnchor(pathname) {
  if (pathname === '/watch') {
    const sub =
      document.querySelector('#owner #subscribe-button') ||
      document.querySelector('#subscribe-button');
    if (sub && sub.parentElement) return sub.parentElement;

    const owner =
      document.querySelector('ytd-video-owner-renderer#owner') ||
      document.querySelector('ytd-video-owner-renderer');
    if (owner) return owner;

    const subMobile = document.querySelector(
      'ytm-video-owner-renderer #subscribe-button',
    );
    if (subMobile && subMobile.parentElement) return subMobile.parentElement;

    const ownerMobile = document.querySelector('ytm-video-owner-renderer');
    if (ownerMobile) return ownerMobile;

    return null;
  }

  if (pathname && (pathname.startsWith('/@') || pathname.startsWith('/channel/'))) {
    const actionsRow = document.querySelector(
      '#page-header yt-flexible-actions-view-model',
    );
    if (actionsRow) return actionsRow;

    const sub = document.querySelector(
      'ytd-channel-header-renderer #subscribe-button, ytd-c4-tabbed-header-renderer #subscribe-button',
    );
    if (sub && sub.parentElement) return sub.parentElement;

    const subMobile = document.querySelector(
      'ytm-channel-header-renderer #subscribe-button, ytm-channel-header-renderer [id^="subscribe-button"]',
    );
    if (subMobile && subMobile.parentElement) return subMobile.parentElement;

    const headerMobile = document.querySelector('ytm-channel-header-renderer');
    if (headerMobile) return headerMobile;

    return null;
  }

  return null;
}

function createInlineWhitelistButton(channel) {
  const btn = document.createElement('button');
  btn.id = INLINE_WHITELIST_BTN_ID;
  btn.className = 'yt-hider-inline-whitelist-btn';
  btn.ytHiderChannelValue = channel;

  btn.innerHTML =
    '<img alt="" /><span class="yt-hider-inline-whitelist-label"></span><span class="yt-hider-inline-whitelist-icon"></span>';

  btn.addEventListener('click', e => {
    e.preventDefault();
    e.stopPropagation();
    const ch = btn.ytHiderChannelValue;
    if (!ch) return;
    setChannelWhitelisted(ch, !isChannelExempt(ch));
    updateInlineWhitelistButtonState(btn, ch);
  });

  return btn;
}

function updateInlineWhitelistButtonState(btn, channel) {
  btn.ytHiderChannelValue = channel;
  const isWhitelisted = isChannelExempt(channel);
  const isPaused = isChannelPaused(channel);
  const isDark = isYouTubeDarkTheme();
  const isMulti = Array.isArray(channel) && channel.length > 1;

  btn.classList.toggle('is-whitelisted', isWhitelisted);
  btn.classList.toggle('yt-hider-dark', isDark);
  btn.setAttribute('aria-pressed', isWhitelisted ? 'true' : 'false');
  btn.title = isWhitelisted
    ? (isMulti ? 'Remove these channels from your YouTube Hider whitelist' : 'Remove this channel from your YouTube Hider whitelist')
    : isPaused
      ? (isMulti ? 'These channels are on your whitelist, but Channel Whitelist is currently turned off. Click to turn it back on.' : 'This channel is on your whitelist, but Channel Whitelist is currently turned off. Click to turn it back on.')
      : (isMulti ? 'Add these channels to your YouTube Hider whitelist: its videos won\'t be filtered (Shorts are always filtered)' : 'Add this channel to your YouTube Hider whitelist: its videos won\'t be filtered (Shorts are always filtered)');

  const logo = btn.querySelector('img');
  if (logo) logo.src = getInlineWhitelistLogoUrl(isDark);

  const icon = btn.querySelector('.yt-hider-inline-whitelist-icon');
  if (icon) {
    icon.innerHTML = isWhitelisted ? INLINE_WHITELIST_CHECK_ICON : '';
    icon.style.display = isWhitelisted ? 'inline-flex' : 'none';
  }

  const label = btn.querySelector('.yt-hider-inline-whitelist-label');
  if (label) label.textContent = isWhitelisted ? 'Whitelisted' : isPaused ? 'Resume Whitelist' : 'Whitelist';
}

let cancelInlineWhitelistPoll = null;

function cancelInlineWhitelistRetry() {
  if (cancelInlineWhitelistPoll) {
    cancelInlineWhitelistPoll();
    cancelInlineWhitelistPoll = null;
  }
}

function syncInlineWhitelistButton(pathname, timeout = 3000) {
  cancelInlineWhitelistRetry();

  if (prefs.hideInterfaceElements) {
    removeInlineWhitelistButton();
    return;
  }

  const tryRender = () => {
    if (window.location.pathname !== pathname) return true;

    const channel = getCurrentPageChannel();
    if (!channel) return false;

    let btn = document.getElementById(INLINE_WHITELIST_BTN_ID);
    if (btn && !btn.isConnected) btn = null;

    if (!btn) {
      const container = findInlineWhitelistAnchor(pathname);
      if (!container) return false;
      btn = createInlineWhitelistButton(channel);
      container.appendChild(btn);
    }

    updateInlineWhitelistButtonState(btn, channel);
    return true;
  };

  const { promise, cancel } = pollUntil(tryRender, { timeout });
  cancelInlineWhitelistPoll = cancel;
  promise.then(found => {
    cancelInlineWhitelistPoll = null;
    if (!found) logger.warn('Inline whitelist button: no anchor found for', pathname);
  });
}

function removeInlineWhitelistButton() {
  cancelInlineWhitelistRetry();
  const btn = document.getElementById(INLINE_WHITELIST_BTN_ID);
  if (btn) btn.remove();
}
