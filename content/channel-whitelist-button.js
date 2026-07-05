const INLINE_WHITELIST_BTN_ID = 'yt-hider-inline-whitelist-btn';

const INLINE_WHITELIST_CHECK_ICON =
  '<svg width="12" height="10" viewBox="0 0 12 10" fill="none" aria-hidden="true"><path d="M1 5l3.5 3.5L11 1" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>';

function isInlineWhitelistPath(pathname) {
  return pathname === '/watch' || isChannelPagePath(pathname);
}

function isYouTubeDarkTheme() {
  return document.documentElement.hasAttribute('dark');
}

function watchYouTubeTheme() {
  const observer = new MutationObserver(() => {
    const btn = document.getElementById(INLINE_WHITELIST_BTN_ID);
    if (btn) updateInlineWhitelistButtonState(btn, btn.ytHiderChannelValue);
    const blacklistBtn = document.getElementById(INLINE_BLACKLIST_BTN_ID);
    if (blacklistBtn) updateInlineBlacklistButtonState(blacklistBtn, blacklistBtn.ytHiderChannelValue);
    applyHeaderButtonTheme();
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
      position: relative;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      height: 40px;
      line-height: 40px;
      padding: 0 16px;
      border: none;
      border-radius: 20px;
      font-size: 14px;
      font-weight: 500;
      font-family: 'Roboto', Arial, sans-serif;
      cursor: pointer;
      white-space: nowrap;
      background: #f1f1f1;
      color: #0f0f0f;
      transition: background 0.15s ease, color 0.15s ease;
    }
    .yt-hider-inline-whitelist-btn--channel {
      flex: 1;
      flex-basis: 0.000000001px;
    }
    .yt-hider-inline-whitelist-btn--watch {
      margin-left: 8px;
    }
    .yt-hider-inline-whitelist-btn:hover {
      background: #e5e5e5;
    }
    .yt-hider-inline-whitelist-btn:focus-visible {
      outline: 2px solid #065fd4;
      outline-offset: 2px;
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
    .yt-hider-inline-whitelist-tooltip {
      visibility: hidden;
      opacity: 0;
      position: absolute;
      bottom: 125%;
      left: 50%;
      transform: translateX(-50%);
      width: 200px;
      background: #222222;
      color: #ebebeb;
      border: 1px solid #3a3a3a;
      border-radius: 6px;
      padding: 8px;
      font-size: 11px;
      font-weight: 400;
      line-height: 1.4;
      text-align: center;
      white-space: normal;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      transition: opacity 0.15s ease;
      pointer-events: none;
      z-index: 20;
    }
    .yt-hider-inline-whitelist-btn:hover .yt-hider-inline-whitelist-tooltip {
      visibility: visible;
      opacity: 1;
    }
  `;
  document.head.appendChild(style);
}

function findInlineChannelActionAnchor(pathname) {
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

  if (isChannelPagePath(pathname)) {
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

function createInlineWhitelistButton(channel, isFlexibleActionsRow) {
  const btn = document.createElement('button');
  btn.id = INLINE_WHITELIST_BTN_ID;
  btn.className = 'yt-hider-inline-whitelist-btn ' + (isFlexibleActionsRow ? 'yt-hider-inline-whitelist-btn--channel' : 'yt-hider-inline-whitelist-btn--watch');
  btn.ytHiderChannelValue = channel;

  btn.innerHTML =
    '<span class="yt-hider-inline-whitelist-label"></span><span class="yt-hider-inline-whitelist-icon"></span><span class="yt-hider-inline-whitelist-tooltip"></span>';

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

  btn.classList.toggle('is-whitelisted', isWhitelisted);
  btn.classList.toggle('yt-hider-dark', isDark);
  btn.setAttribute('aria-pressed', isWhitelisted ? 'true' : 'false');

  const tooltip = btn.querySelector('.yt-hider-inline-whitelist-tooltip');
  if (tooltip) {
    tooltip.textContent = buildWhitelistTooltipText(channel, { isWhitelisted });
  }

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
      const container = findInlineChannelActionAnchor(pathname);
      if (!container) return false;
      const isFlexibleActionsRow = container.tagName && container.tagName.toLowerCase() === 'yt-flexible-actions-view-model';
      btn = createInlineWhitelistButton(channel, isFlexibleActionsRow);
      if (isFlexibleActionsRow) {
        const wrapper = document.createElement('div');
        wrapper.className = 'ytFlexibleActionsViewModelAction';
        wrapper.appendChild(btn);
        container.appendChild(wrapper);
      } else {
        container.appendChild(btn);
      }
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
  if (!btn) return;
  const wrapper = btn.parentElement;
  if (wrapper && wrapper.classList.contains('ytFlexibleActionsViewModelAction')) {
    wrapper.remove();
  } else {
    btn.remove();
  }
}
