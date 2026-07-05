const INLINE_BLACKLIST_BTN_ID = 'yt-hider-inline-blacklist-btn';

function injectInlineBlacklistStyles() {
  if (document.getElementById('yt-hider-inline-blacklist-styles')) return;
  const style = document.createElement('style');
  style.id = 'yt-hider-inline-blacklist-styles';
  style.textContent = `
    .yt-hider-inline-blacklist-btn {
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
    .yt-hider-inline-blacklist-btn--channel {
      flex: 1;
      flex-basis: 0.000000001px;
    }
    .yt-hider-inline-blacklist-btn--watch {
      margin-left: 8px;
    }
    .yt-hider-inline-blacklist-btn:hover {
      background: #e5e5e5;
    }
    .yt-hider-inline-blacklist-btn:focus-visible {
      outline: 2px solid #8ab4f8;
      outline-offset: 2px;
    }
    .yt-hider-inline-blacklist-btn .yt-hider-inline-blacklist-icon {
      display: inline-flex;
      align-items: center;
      flex-shrink: 0;
    }
    .yt-hider-inline-blacklist-btn.yt-hider-dark {
      background: #272727;
      color: #f1f1f1;
    }
    .yt-hider-inline-blacklist-btn.yt-hider-dark:hover {
      background: #3f3f3f;
    }
    .yt-hider-inline-blacklist-btn.is-blacklisted {
      background: #fce8e6;
      color: #c5221f;
    }
    .yt-hider-inline-blacklist-btn.is-blacklisted:hover {
      background: #fad2ce;
    }
    .yt-hider-inline-blacklist-btn.yt-hider-dark.is-blacklisted {
      background: #5c1a1a;
      color: #f6aea9;
    }
    .yt-hider-inline-blacklist-btn.yt-hider-dark.is-blacklisted:hover {
      background: #732121;
    }
    .yt-hider-inline-blacklist-tooltip {
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
    .yt-hider-inline-blacklist-btn:hover .yt-hider-inline-blacklist-tooltip {
      visibility: visible;
      opacity: 1;
    }
    [data-yt-hider-hover-anchor] {
      position: relative !important;
    }
    .yt-hider-blacklist-hover-wrapper {
      position: absolute;
      top: 6px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 15;
      pointer-events: none;
      width: max-content;
      max-width: calc(100% - 12px);
    }
    .yt-hider-blacklist-hover-wrapper .yt-hider-blacklist-btn {
      max-width: 100%;
    }
  `;
  document.head.appendChild(style);
}

function findInlineBlacklistTooltipText(channel, isBlacklisted) {
  const isMulti = Array.isArray(channel) && channel.length > 1;
  const channelWord = isMulti ? 'these channels' : 'this channel';
  const possessive = isMulti ? 'their' : 'its';

  if (isBlacklisted) {
    return `Removes ${channelWord} from your YouTube Hider blacklist. ${ON_PAGE_CONTROLS_TIP}`;
  }
  return `Adds ${channelWord} to your YouTube Hider blacklist: ${possessive} videos will always be hidden (Shorts are always filtered). ${ON_PAGE_CONTROLS_TIP}`;
}

function createInlineBlacklistButton(channel, isFlexibleActionsRow) {
  const btn = document.createElement('button');
  btn.id = INLINE_BLACKLIST_BTN_ID;
  btn.className = 'yt-hider-inline-blacklist-btn ' + (isFlexibleActionsRow ? 'yt-hider-inline-blacklist-btn--channel' : 'yt-hider-inline-blacklist-btn--watch');
  btn.ytHiderChannelValue = channel;

  btn.innerHTML =
    '<span class="yt-hider-inline-blacklist-label"></span><span class="yt-hider-inline-blacklist-icon"></span><span class="yt-hider-inline-blacklist-tooltip"></span>';

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
  btn.ytHiderChannelValue = channel;
  const isBlacklisted = isChannelBlacklisted(channel);
  const isDark = isYouTubeDarkTheme();

  btn.classList.toggle('is-blacklisted', isBlacklisted);
  btn.classList.toggle('yt-hider-dark', isDark);
  btn.setAttribute('aria-pressed', isBlacklisted ? 'true' : 'false');

  const tooltip = btn.querySelector('.yt-hider-inline-blacklist-tooltip');
  if (tooltip) {
    tooltip.textContent = findInlineBlacklistTooltipText(channel, isBlacklisted);
  }

  const icon = btn.querySelector('.yt-hider-inline-blacklist-icon');
  if (icon) {
    icon.innerHTML = isBlacklisted ? INLINE_WHITELIST_CHECK_ICON : '';
    icon.style.display = isBlacklisted ? 'inline-flex' : 'none';
  }

  const label = btn.querySelector('.yt-hider-inline-blacklist-label');
  if (label) label.textContent = isBlacklisted ? 'Blacklisted' : 'Blacklist';
}

let cancelInlineBlacklistPoll = null;

function cancelInlineBlacklistRetry() {
  if (cancelInlineBlacklistPoll) {
    cancelInlineBlacklistPoll();
    cancelInlineBlacklistPoll = null;
  }
}

function syncInlineBlacklistButton(pathname, timeout = 3000) {
  cancelInlineBlacklistRetry();

  if (prefs.hideInterfaceElements || !prefs.channelBlacklistEnabled) {
    removeInlineBlacklistButton();
    return;
  }

  const tryRender = () => {
    if (window.location.pathname !== pathname) return true;

    const channel = getCurrentPageChannel();
    if (!channel) return false;

    let btn = document.getElementById(INLINE_BLACKLIST_BTN_ID);
    if (btn && !btn.isConnected) btn = null;

    if (!btn) {
      const container = findInlineChannelActionAnchor(pathname);
      if (!container) return false;
      const isFlexibleActionsRow = container.tagName && container.tagName.toLowerCase() === 'yt-flexible-actions-view-model';
      btn = createInlineBlacklistButton(channel, isFlexibleActionsRow);
      if (isFlexibleActionsRow) {
        const wrapper = document.createElement('div');
        wrapper.className = 'ytFlexibleActionsViewModelAction';
        wrapper.appendChild(btn);
        container.appendChild(wrapper);
      } else {
        container.appendChild(btn);
      }
    }

    updateInlineBlacklistButtonState(btn, channel);
    return true;
  };

  const { promise, cancel } = pollUntil(tryRender, { timeout });
  cancelInlineBlacklistPoll = cancel;
  promise.then(found => {
    cancelInlineBlacklistPoll = null;
    if (!found) logger.warn('Inline blacklist button: no anchor found for', pathname);
  });
}

function removeInlineBlacklistButton() {
  cancelInlineBlacklistRetry();
  const btn = document.getElementById(INLINE_BLACKLIST_BTN_ID);
  if (!btn) return;
  const wrapper = btn.parentElement;
  if (wrapper && wrapper.classList.contains('ytFlexibleActionsViewModelAction')) {
    wrapper.remove();
  } else {
    btn.remove();
  }
}

// ── Hover blacklist pill on video cards, filtered or not ──

let hoverPillEl = null;
let hoverPillContainer = null;
let hoverPillPending = false;

function isBlacklistHoverEligible(pathname) {
  return (
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
  if (hoverPillEl && hoverPillEl.parentElement) hoverPillEl.remove();
  hoverPillEl = null;
  hoverPillContainer = null;
}

function removeBlacklistHoverButton() {
  hoverPillPending = false;
  clearBlacklistHoverButton();
}

function showBlacklistHoverButton(container, channel) {
  if (hoverPillPending) return;
  if (hoverPillContainer === container && hoverPillEl) return;

  clearBlacklistHoverButton();

  const anchor = getHoverThumbnailAnchor(container);
  anchor.dataset.ytHiderHoverAnchor = '1';

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
  anchor.appendChild(wrapper);

  hoverPillEl = wrapper;
  hoverPillContainer = container;
}

function handleBlacklistHoverOver(e) {
  if (hoverPillPending) return;
  if (!isBlacklistHoverEligible(window.location.pathname)) return;
  if (!e.target || !e.target.closest) return;

  const container = findOutermostMatch(e.target, getVideoContainerSelectors());
  if (!container) return;

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

  clearBlacklistHoverButton();
}

function attachBlacklistHoverListener() {
  document.addEventListener('mouseover', handleBlacklistHoverOver, true);
  document.addEventListener('mouseout', handleBlacklistHoverOut, true);
}
