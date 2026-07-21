const INLINE_BLACKLIST_BTN_ID = 'yt-hider-inline-blacklist-btn';

function injectInlineBlacklistStyles() {
  injectInlineChannelActionStyles(
    'yt-hider-inline-blacklist-styles',
    'yt-hider-inline-blacklist',
    {
      focusOutline: '#8ab4f8',
      activeClass: 'is-blacklisted',
      activeBg: '#fce8e6',
      activeColor: '#c5221f',
      activeHoverBg: '#fad2ce',
      activeDarkBg: '#5c1a1a',
      activeDarkColor: '#f6aea9',
      activeDarkHoverBg: '#732121',
    },
  );

  if (document.getElementById('yt-hider-blacklist-hover-styles')) return;
  const style = document.createElement('style');
  style.id = 'yt-hider-blacklist-hover-styles';
  style.textContent = `
    .yt-hider-blacklist-hover-wrapper {
      position: fixed;
      transform: translateX(-50%);
      z-index: 2000;
      pointer-events: none;
      width: max-content;
      animation: yt-hider-blacklist-pill-in 180ms ease-out;
      transition: opacity 90ms ease-out;
    }
    .yt-hider-blacklist-hover-wrapper .yt-hider-blacklist-btn {
      max-width: 100%;
    }
    .yt-hider-blacklist-hover-wrapper.yt-hider-blacklist-pill-quick {
      animation: yt-hider-blacklist-pill-quick-in 90ms ease-out;
    }
    .yt-hider-blacklist-hover-wrapper.yt-hider-blacklist-pill-hidden {
      opacity: 0;
      visibility: hidden;
      transition: none;
    }
    @keyframes yt-hider-blacklist-pill-in {
      from { opacity: 0; transform: translateX(-50%) translateY(-10px); }
      to { opacity: 1; transform: translateX(-50%) translateY(0); }
    }
    @keyframes yt-hider-blacklist-pill-quick-in {
      from { opacity: 0; transform: translateX(-50%) scale(0.96); }
      to { opacity: 1; transform: translateX(-50%) scale(1); }
    }
    @media (prefers-reduced-motion: reduce) {
      .yt-hider-blacklist-hover-wrapper,
      .yt-hider-blacklist-hover-wrapper.yt-hider-blacklist-pill-quick {
        animation: none;
        transition: none;
      }
    }
  `;
  document.head.appendChild(style);
}

function findInlineBlacklistTooltipText(channel, isBlacklisted) {
  const { channelWord, possessive } = pluralizeChannelWord(channel);

  if (isBlacklisted) {
    return `Removes ${channelWord} from your YouTube Hider blacklist. ${ON_PAGE_CONTROLS_TIP}`;
  }
  return `Adds ${channelWord} to your YouTube Hider blacklist: ${possessive} videos will always be hidden (Shorts are always filtered). ${ON_PAGE_CONTROLS_TIP}`;
}

function createInlineBlacklistButton(channel, isFlexibleActionsRow) {
  const btn = createInlineChannelActionButton(
    INLINE_BLACKLIST_BTN_ID,
    'yt-hider-inline-blacklist',
    channel,
    isFlexibleActionsRow,
  );

  btn.addEventListener('click', e => {
    e.preventDefault();
    e.stopPropagation();
    const ch = btn.ytHiderChannelValue;
    if (!ch) return;
    setChannelBlacklisted(ch, !isChannelBlacklisted(ch));
    updateInlineBlacklistButtonState(btn, ch);
  });

  return btn;
}

function updateInlineBlacklistButtonState(btn, channel) {
  const isBlacklisted = isChannelBlacklisted(channel);

  updateInlineChannelActionButtonState(btn, 'yt-hider-inline-blacklist', channel, {
    isActive: isBlacklisted,
    activeClass: 'is-blacklisted',
    tooltipText: findInlineBlacklistTooltipText(channel, isBlacklisted),
    iconMarkup: INLINE_WHITELIST_CHECK_ICON,
    label: isBlacklisted ? 'Blacklisted' : 'Blacklist',
  });
}

let cancelInlineBlacklistPoll = null;

function syncInlineBlacklistButton(pathname, timeout = 3000) {
  syncInlineChannelActionButton(pathname, {
    timeout,
    buttonId: INLINE_BLACKLIST_BTN_ID,
    isEnabled: () => !prefs.hideInterfaceElements && prefs.channelBlacklistEnabled,
    createButton: createInlineBlacklistButton,
    updateButtonState: updateInlineBlacklistButtonState,
    getCancelPoll: () => cancelInlineBlacklistPoll,
    setCancelPoll: fn => {
      cancelInlineBlacklistPoll = fn;
    },
  });
}

function removeInlineBlacklistButton() {
  removeInlineChannelActionButton(
    INLINE_BLACKLIST_BTN_ID,
    () => cancelInlineBlacklistPoll,
    fn => {
      cancelInlineBlacklistPoll = fn;
    },
  );
}

let hoverPillEl = null;
let hoverPillContainer = null;
let hoverPillAnchor = null;
let hoverPillBtn = null;
let hoverPillPending = false;
let lastMouseClientX = 0;
let lastMouseClientY = 0;
let hoverPillWatchdog = null;
let hoverPillFrame = null;
let hoverPillScrolling = false;
let hoverPillScrollIdleTimer = null;

const HOVER_PILL_TOP_OFFSET = 14;
const HOVER_PILL_SCROLL_IDLE_MS = 100;

function trackMouseForHoverPillWatchdog(e) {
  lastMouseClientX = e.clientX;
  lastMouseClientY = e.clientY;
}

function getHoverPillViewportTop() {
  const bar = document.querySelector('ytd-masthead, ytm-mobile-topbar-renderer');
  if (!bar) return 0;
  const rect = bar.getBoundingClientRect();
  if (rect.top > 0 || rect.bottom <= 0) return 0;
  return rect.bottom;
}

function setHoverPillHidden(hidden) {
  if (!hoverPillEl) return;
  hoverPillEl.classList.toggle('yt-hider-blacklist-pill-hidden', hidden);
}

function positionHoverPill() {
  if (!hoverPillEl || !hoverPillAnchor) return;
  if (!hoverPillAnchor.isConnected) {
    removeBlacklistHoverButton();
    return;
  }
  const rect = hoverPillAnchor.getBoundingClientRect();
  const top = rect.top + HOVER_PILL_TOP_OFFSET;

  if (top < getHoverPillViewportTop() || top > window.innerHeight) {
    setHoverPillHidden(true);
    return;
  }

  setHoverPillHidden(false);
  hoverPillEl.style.left = rect.left + rect.width / 2 + 'px';
  hoverPillEl.style.top = top + 'px';
  hoverPillEl.style.maxWidth = Math.max(24, rect.width - 12) + 'px';
}

function schedulePositionHoverPill() {
  if (hoverPillFrame) return;
  hoverPillFrame = requestAnimationFrame(() => {
    hoverPillFrame = null;
    positionHoverPill();
  });
}

function onHoverPillScroll() {
  hoverPillScrolling = true;
  if (hoverPillScrollIdleTimer) clearTimeout(hoverPillScrollIdleTimer);
  hoverPillScrollIdleTimer = setTimeout(onHoverPillScrollIdle, HOVER_PILL_SCROLL_IDLE_MS);
  if (!hoverPillEl) return;
  if (hoverPillPending) {
    setHoverPillHidden(true);
    return;
  }
  clearBlacklistHoverButton();
}

function onHoverPillScrollIdle() {
  hoverPillScrollIdleTimer = null;
  hoverPillScrolling = false;
  if (hoverPillPending) {
    positionHoverPill();
    return;
  }
  if (hoverPillEl) return;

  const stack = document.elementsFromPoint(lastMouseClientX, lastMouseClientY);
  for (const el of stack) {
    tryShowBlacklistHoverPill(el, true);
    if (hoverPillEl) return;
  }
}

function startHoverPillWatchdog() {
  if (hoverPillWatchdog) return;
  hoverPillWatchdog = setInterval(() => {
    positionHoverPill();
    if (!hoverPillContainer || hoverPillPending) return;
    const rect = hoverPillContainer.getBoundingClientRect();
    const stillInside =
      lastMouseClientX >= rect.left &&
      lastMouseClientX <= rect.right &&
      lastMouseClientY >= rect.top &&
      lastMouseClientY <= rect.bottom;
    if (!stillInside) clearBlacklistHoverButton();
  }, 400);
}

function stopHoverPillWatchdog() {
  if (hoverPillWatchdog) {
    clearInterval(hoverPillWatchdog);
    hoverPillWatchdog = null;
  }
}

function isBlacklistHoverEligible(pathname) {
  return (
    prefs.extensionEnabled &&
    prefs.channelBlacklistEnabled &&
    !prefs.hideInterfaceElements &&
    isCoreFilterPath(pathname)
  );
}

function isContainerAlreadyFiltered(container) {
  return !!(container.dataset.ytHiderHidden || container.dataset.ytHiderDimmed);
}

function getHoverThumbnailAnchor(container) {
  return (
    container.querySelector('ytd-thumbnail') ||
    container.querySelector('yt-thumbnail-view-model') ||
    container.querySelector('ytm-thumbnail-cover-view-model') ||
    container
  );
}

function clearBlacklistHoverButton() {
  stopHoverPillWatchdog();
  if (hoverPillEl) hoverPillEl.remove();
  hoverPillEl = null;
  hoverPillContainer = null;
  hoverPillAnchor = null;
  hoverPillBtn = null;
}

function removeBlacklistHoverButton() {
  if (hoverPillBtn && hoverPillBtn.ytHiderCancelPending) hoverPillBtn.ytHiderCancelPending();
  hoverPillPending = false;
  clearBlacklistHoverButton();
}

function showBlacklistHoverButton(container, channel, quick) {
  if (hoverPillPending) return;
  if (hoverPillContainer === container && hoverPillEl) return;

  clearBlacklistHoverButton();
  document
    .querySelectorAll('.yt-hider-blacklist-hover-wrapper')
    .forEach(stray => stray.remove());

  const anchor = getHoverThumbnailAnchor(container);

  const wrapper = document.createElement('div');
  wrapper.className = 'yt-hider-blacklist-hover-wrapper';
  if (quick) wrapper.classList.add('yt-hider-blacklist-pill-quick');

  const btn = createBlacklistButton(channel, () => {
    hoverPillPending = false;
    clearBlacklistHoverButton();
  });
  if (!isContainerAlreadyFiltered(container)) {
    btn.classList.add('yt-hider-blacklist-btn--solid');
  }
  btn.addEventListener('click', () => {
    hoverPillPending = btn.classList.contains('yt-hider-blacklist-btn-pending');
  });

  wrapper.appendChild(btn);
  document.body.appendChild(wrapper);

  hoverPillEl = wrapper;
  hoverPillContainer = container;
  hoverPillAnchor = anchor;
  hoverPillBtn = btn;
  positionHoverPill();
  startHoverPillWatchdog();
}

function tryShowBlacklistHoverPill(target, quick) {
  if (hoverPillPending) {
    if (hoverPillContainer && !hoverPillContainer.isConnected) {
      if (hoverPillBtn && hoverPillBtn.ytHiderCancelPending) hoverPillBtn.ytHiderCancelPending();
      hoverPillPending = false;
      clearBlacklistHoverButton();
    } else {
      return;
    }
  }
  if (!isBlacklistHoverEligible(window.location.pathname)) return;
  if (!target || !target.closest) return;
  if (hoverPillEl && hoverPillContainer && hoverPillContainer.contains(target)) {
    return;
  }

  const container = findOutermostMatch(target, getVideoContainerSelectors());
  if (!container) return;
  if (hoverPillContainer === container && hoverPillEl) return;

  const ch = resolveChannelForElement(container);
  if (!channelIsPresent(ch) || isChannelBlacklisted(ch)) return;

  showBlacklistHoverButton(container, ch, quick);
}

function handleBlacklistHoverOver(e) {
  if (hoverPillScrolling) return;
  tryShowBlacklistHoverPill(e.target);
}

function handleBlacklistHoverOut(e) {
  if (hoverPillPending) return;
  if (!hoverPillContainer) return;
  if (!e.target || !hoverPillContainer.contains(e.target)) return;

  const related = e.relatedTarget;
  if (related && hoverPillContainer.contains(related)) return;

  const rect = hoverPillContainer.getBoundingClientRect();
  if (
    e.clientX >= rect.left &&
    e.clientX <= rect.right &&
    e.clientY >= rect.top &&
    e.clientY <= rect.bottom
  ) {
    return;
  }

  clearBlacklistHoverButton();
}

let blacklistHoverListenerAttached = false;

function attachBlacklistHoverListener() {
  if (blacklistHoverListenerAttached) return;
  blacklistHoverListenerAttached = true;

  document.addEventListener('mouseover', handleBlacklistHoverOver, true);
  document.addEventListener('mouseout', handleBlacklistHoverOut, true);
  document.addEventListener('mousemove', trackMouseForHoverPillWatchdog, true);
  document.addEventListener('scroll', onHoverPillScroll, true);
  window.addEventListener('resize', schedulePositionHoverPill);
}
