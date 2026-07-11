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
      z-index: 2147483647;
      pointer-events: none;
      width: max-content;
      animation: yt-hider-blacklist-pill-in 180ms ease-out;
    }
    .yt-hider-blacklist-hover-wrapper .yt-hider-blacklist-btn {
      max-width: 100%;
    }
    .yt-hider-blacklist-hover-wrapper.yt-hider-blacklist-pill-leaving {
      animation: yt-hider-blacklist-pill-out 150ms ease-in forwards;
    }
    @keyframes yt-hider-blacklist-pill-in {
      from { opacity: 0; transform: translateX(-50%) translateY(-10px); }
      to { opacity: 1; transform: translateX(-50%) translateY(0); }
    }
    @keyframes yt-hider-blacklist-pill-out {
      from { opacity: 1; transform: translateX(-50%) translateY(0); }
      to { opacity: 0; transform: translateX(-50%) translateY(-10px); }
    }
    @media (prefers-reduced-motion: reduce) {
      .yt-hider-blacklist-hover-wrapper,
      .yt-hider-blacklist-hover-wrapper.yt-hider-blacklist-pill-leaving {
        animation: none;
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

// ── Hover blacklist pill on video cards, filtered or not ──

let hoverPillEl = null;
let hoverPillContainer = null;
let hoverPillAnchor = null;
let hoverPillBtn = null;
let hoverPillPending = false;
let lastMouseClientX = 0;
let lastMouseClientY = 0;
let hoverPillWatchdog = null;

function trackMouseForHoverPillWatchdog(e) {
  lastMouseClientX = e.clientX;
  lastMouseClientY = e.clientY;
}

function positionHoverPill() {
  if (!hoverPillEl || !hoverPillAnchor) return;
  if (!hoverPillAnchor.isConnected) {
    removeBlacklistHoverButton();
    return;
  }
  const rect = hoverPillAnchor.getBoundingClientRect();
  hoverPillEl.style.left = rect.left + rect.width / 2 + 'px';
  hoverPillEl.style.top = rect.top + 14 + 'px';
  hoverPillEl.style.maxWidth = Math.max(24, rect.width - 12) + 'px';
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

function removeHoverPillAnimated(wrapper) {
  if (!wrapper || !wrapper.isConnected) return;
  wrapper.classList.add('yt-hider-blacklist-pill-leaving');
  const onAnimationEnd = e => {
    if (e.target !== wrapper) return;
    wrapper.removeEventListener('animationend', onAnimationEnd);
    wrapper.remove();
  };
  wrapper.addEventListener('animationend', onAnimationEnd);
  setTimeout(() => wrapper.remove(), 200);
}

function clearBlacklistHoverButton() {
  stopHoverPillWatchdog();
  removeHoverPillAnimated(hoverPillEl);
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

function showBlacklistHoverButton(container, channel) {
  if (hoverPillPending) return;
  if (hoverPillContainer === container && hoverPillEl) return;

  clearBlacklistHoverButton();

  const anchor = getHoverThumbnailAnchor(container);

  const wrapper = document.createElement('div');
  wrapper.className = 'yt-hider-blacklist-hover-wrapper';

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

function handleBlacklistHoverOver(e) {
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
  if (!e.target || !e.target.closest) return;

  const container = findOutermostMatch(e.target, getVideoContainerSelectors());
  if (!container) return;
  if (hoverPillContainer === container && hoverPillEl) return;

  const ch = resolveChannelForElement(container);
  if (!channelIsPresent(ch) || isChannelBlacklisted(ch)) return;

  showBlacklistHoverButton(container, ch);
}

function handleBlacklistHoverOut(e) {
  if (hoverPillPending) return;
  if (!hoverPillContainer) return;
  if (!e.target || !hoverPillContainer.contains(e.target)) return;

  const related = e.relatedTarget;
  if (related && hoverPillContainer.contains(related)) return;

  // YouTube's own hover-preview player can render outside hoverPillContainer's
  // DOM subtree (e.g. as a portaled overlay) while still visually sitting on
  // top of the same thumbnail, so relatedTarget containment alone reports a
  // false "pointer left" as soon as the preview takes over. Fall back to the
  // pointer's actual coordinates against the container's own box before
  // deciding it really left.
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
  document.addEventListener('scroll', positionHoverPill, true);
  window.addEventListener('resize', positionHoverPill);
}
