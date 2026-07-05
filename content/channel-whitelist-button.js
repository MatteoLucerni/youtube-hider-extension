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

function injectInlineChannelActionStyles(styleId, prefix, tokens) {
  if (document.getElementById(styleId)) return;
  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    .${prefix}-btn {
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
    .${prefix}-btn--channel {
      flex: 1;
      flex-basis: 0.000000001px;
    }
    .${prefix}-btn--watch {
      margin-left: 8px;
    }
    .${prefix}-btn:hover {
      background: #e5e5e5;
    }
    .${prefix}-btn:focus-visible {
      outline: 2px solid ${tokens.focusOutline};
      outline-offset: 2px;
    }
    .${prefix}-btn .${prefix}-icon {
      display: inline-flex;
      align-items: center;
      flex-shrink: 0;
    }
    .${prefix}-btn.yt-hider-dark {
      background: #272727;
      color: #f1f1f1;
    }
    .${prefix}-btn.yt-hider-dark:hover {
      background: #3f3f3f;
    }
    .${prefix}-btn.${tokens.activeClass} {
      background: ${tokens.activeBg};
      color: ${tokens.activeColor};
    }
    .${prefix}-btn.${tokens.activeClass}:hover {
      background: ${tokens.activeHoverBg};
    }
    .${prefix}-btn.yt-hider-dark.${tokens.activeClass} {
      background: ${tokens.activeDarkBg};
      color: ${tokens.activeDarkColor};
    }
    .${prefix}-btn.yt-hider-dark.${tokens.activeClass}:hover {
      background: ${tokens.activeDarkHoverBg};
    }
    .${prefix}-tooltip {
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
    .${prefix}-btn:hover .${prefix}-tooltip {
      visibility: visible;
      opacity: 1;
    }
  `;
  document.head.appendChild(style);
}

function injectInlineWhitelistStyles() {
  injectInlineChannelActionStyles(
    'yt-hider-inline-whitelist-styles',
    'yt-hider-inline-whitelist',
    {
      focusOutline: '#065fd4',
      activeClass: 'is-whitelisted',
      activeBg: '#e8f0fe',
      activeColor: '#065fd4',
      activeHoverBg: '#d7e6fd',
      activeDarkBg: '#1b3a63',
      activeDarkColor: '#bcd6ff',
      activeDarkHoverBg: '#234a7d',
    },
  );
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

function createInlineChannelActionButton(id, prefix, channel, isFlexibleActionsRow) {
  const btn = document.createElement('button');
  btn.id = id;
  btn.className = `${prefix}-btn ` + (isFlexibleActionsRow ? `${prefix}-btn--channel` : `${prefix}-btn--watch`);
  btn.ytHiderChannelValue = channel;

  btn.innerHTML =
    `<span class="${prefix}-label"></span><span class="${prefix}-icon"></span><span class="${prefix}-tooltip"></span>`;

  return btn;
}

function updateInlineChannelActionButtonState(btn, prefix, channel, { isActive, activeClass, tooltipText, iconMarkup, label }) {
  btn.ytHiderChannelValue = channel;
  const isDark = isYouTubeDarkTheme();

  btn.classList.toggle(activeClass, isActive);
  btn.classList.toggle('yt-hider-dark', isDark);
  btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');

  const tooltip = btn.querySelector(`.${prefix}-tooltip`);
  if (tooltip) tooltip.textContent = tooltipText;

  const icon = btn.querySelector(`.${prefix}-icon`);
  if (icon) {
    icon.innerHTML = isActive ? iconMarkup : '';
    icon.style.display = isActive ? 'inline-flex' : 'none';
  }

  const labelEl = btn.querySelector(`.${prefix}-label`);
  if (labelEl) labelEl.textContent = label;
}

function createInlineWhitelistButton(channel, isFlexibleActionsRow) {
  const btn = createInlineChannelActionButton(
    INLINE_WHITELIST_BTN_ID,
    'yt-hider-inline-whitelist',
    channel,
    isFlexibleActionsRow,
  );

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
  const isWhitelisted = isChannelExempt(channel);
  const isPaused = isChannelPaused(channel);

  updateInlineChannelActionButtonState(btn, 'yt-hider-inline-whitelist', channel, {
    isActive: isWhitelisted,
    activeClass: 'is-whitelisted',
    tooltipText: buildWhitelistTooltipText(channel, { isWhitelisted }),
    iconMarkup: INLINE_WHITELIST_CHECK_ICON,
    label: isWhitelisted ? 'Whitelisted' : isPaused ? 'Resume Whitelist' : 'Whitelist',
  });
}

function syncInlineChannelActionButton(pathname, opts) {
  const { timeout = 3000, buttonId, isEnabled, createButton, updateButtonState, getCancelPoll, setCancelPoll } = opts;

  const existingCancel = getCancelPoll();
  if (existingCancel) {
    existingCancel();
    setCancelPoll(null);
  }

  if (!isEnabled()) {
    removeInlineChannelActionButton(buttonId, getCancelPoll, setCancelPoll);
    return;
  }

  const tryRender = () => {
    if (window.location.pathname !== pathname) return true;

    const channel = getCurrentPageChannel();
    if (!channel) return false;

    let btn = document.getElementById(buttonId);
    if (btn && !btn.isConnected) btn = null;

    if (!btn) {
      const container = findInlineChannelActionAnchor(pathname);
      if (!container) return false;
      const isFlexibleActionsRow = container.tagName && container.tagName.toLowerCase() === 'yt-flexible-actions-view-model';
      btn = createButton(channel, isFlexibleActionsRow);
      if (isFlexibleActionsRow) {
        const wrapper = document.createElement('div');
        wrapper.className = 'ytFlexibleActionsViewModelAction';
        wrapper.appendChild(btn);
        container.appendChild(wrapper);
      } else {
        container.appendChild(btn);
      }
    }

    updateButtonState(btn, channel);
    return true;
  };

  const { promise, cancel } = pollUntil(tryRender, { timeout });
  setCancelPoll(cancel);
  promise.then(found => {
    setCancelPoll(null);
    if (!found) logger.warn(`Inline button ${buttonId}: no anchor found for`, pathname);
  });
}

function removeInlineChannelActionButton(buttonId, getCancelPoll, setCancelPoll) {
  const cancel = getCancelPoll();
  if (cancel) {
    cancel();
    setCancelPoll(null);
  }
  const btn = document.getElementById(buttonId);
  if (!btn) return;
  const wrapper = btn.parentElement;
  if (wrapper && wrapper.classList.contains('ytFlexibleActionsViewModelAction')) {
    wrapper.remove();
  } else {
    btn.remove();
  }
}

let cancelInlineWhitelistPoll = null;

function syncInlineWhitelistButton(pathname, timeout = 3000) {
  syncInlineChannelActionButton(pathname, {
    timeout,
    buttonId: INLINE_WHITELIST_BTN_ID,
    isEnabled: () => !prefs.hideInterfaceElements,
    createButton: createInlineWhitelistButton,
    updateButtonState: updateInlineWhitelistButtonState,
    getCancelPoll: () => cancelInlineWhitelistPoll,
    setCancelPoll: fn => {
      cancelInlineWhitelistPoll = fn;
    },
  });
}

function removeInlineWhitelistButton() {
  removeInlineChannelActionButton(
    INLINE_WHITELIST_BTN_ID,
    () => cancelInlineWhitelistPoll,
    fn => {
      cancelInlineWhitelistPoll = fn;
    },
  );
}
