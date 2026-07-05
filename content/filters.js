let hoverPreviewBlockerAttached = false;

function preventHoverPreviewOnDimmedItems() {
  if (hoverPreviewBlockerAttached) return;
  hoverPreviewBlockerAttached = true;

  const blockHoverPreview = e => {
    if (!prefs.dimMode) return;
    if (
      e.target &&
      e.target.closest &&
      e.target.closest('[data-yt-hider-dimmed]')
    ) {
      e.stopPropagation();
    }
  };

  document.addEventListener('mouseover', blockHoverPreview, true);
  document.addEventListener('mouseenter', blockHoverPreview, true);
}

function injectDimStyles() {
  if (document.getElementById('yt-hider-dim-styles')) return;
  const style = document.createElement('style');
  style.id = 'yt-hider-dim-styles';
  style.textContent = `
    [data-yt-hider-badge-target] {
      position: relative !important;
    }
    .yt-hider-badge {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 5px;
      background: rgba(0, 0, 0, 0.72);
      border-radius: inherit;
      pointer-events: none;
      z-index: 10;
      animation: yt-hider-badge-in 140ms ease-out;
    }
    .yt-hider-badge.yt-hider-badge-leaving {
      animation: yt-hider-badge-out 120ms ease-in forwards;
    }
    @keyframes yt-hider-badge-in {
      from { opacity: 0; transform: scale(0.96); }
      to { opacity: 1; transform: scale(1); }
    }
    @keyframes yt-hider-badge-out {
      from { opacity: 1; transform: scale(1); }
      to { opacity: 0; transform: scale(0.96); }
    }
    @media (prefers-reduced-motion: reduce) {
      .yt-hider-badge, .yt-hider-badge.yt-hider-badge-leaving {
        animation: none;
      }
    }
    .yt-hider-badge-reason {
      font-size: 11px;
      font-weight: 500;
      color: rgba(255, 255, 255, 0.85);
      font-family: 'Roboto', Arial, sans-serif;
      letter-spacing: 0.2px;
      text-align: center;
      padding: 0 6px;
      line-height: 1.2;
    }
    .yt-hider-badge-buttons {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      justify-content: center;
      gap: 6px;
      margin-top: 8px;
      width: 100%;
      box-sizing: border-box;
      padding: 0 6px;
    }
    .yt-hider-whitelist-btn,
    .yt-hider-blacklist-btn {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      height: 24px;
      padding: 0 10px;
      font-size: 11px;
      font-weight: 500;
      font-family: 'Roboto', Arial, sans-serif;
      color: rgba(255, 255, 255, 0.75);
      background: rgba(255, 255, 255, 0.1);
      border: none;
      border-radius: 12px;
      cursor: pointer;
      pointer-events: auto;
      transition: background 0.15s ease, color 0.15s ease;
      line-height: 1;
      white-space: nowrap;
      max-width: 100%;
    }
    .yt-hider-whitelist-label {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      min-width: 0;
    }
    .yt-hider-whitelist-btn svg,
    .yt-hider-blacklist-btn svg {
      flex-shrink: 0;
    }
    .yt-hider-whitelist-btn:hover,
    .yt-hider-blacklist-btn:hover {
      background: rgba(255, 255, 255, 0.2);
      color: rgba(255, 255, 255, 0.95);
    }
    .yt-hider-whitelist-btn:focus-visible,
    .yt-hider-blacklist-btn:focus-visible {
      outline: 2px solid #8ab4f8;
      outline-offset: 2px;
    }
    .yt-hider-blacklist-btn.yt-hider-blacklist-btn--solid {
      background: rgba(0, 0, 0, 0.8);
      color: #fff;
    }
    .yt-hider-blacklist-btn.yt-hider-blacklist-btn--solid:hover {
      background: rgba(0, 0, 0, 0.92);
    }
    .yt-hider-whitelist-btn.yt-hider-whitelist-btn-pending {
      background: #1b3a63;
      color: #bcd6ff;
    }
    .yt-hider-whitelist-btn.yt-hider-whitelist-btn-pending:hover {
      background: #234a7d;
    }
    .yt-hider-blacklist-btn.yt-hider-blacklist-btn-pending {
      background: #5c1a1a;
      color: #f6aea9;
    }
    .yt-hider-blacklist-btn.yt-hider-blacklist-btn-pending:hover {
      background: #732121;
    }
    .yt-hider-undo-countdown {
      flex-shrink: 0;
    }
    .yt-hider-undo-countdown-ring {
      stroke-linecap: round;
      transform-origin: center;
    }
    .yt-hider-undo-countdown-number {
      fill: currentColor;
      font-size: 9px;
      font-weight: 600;
      font-family: 'Roboto', Arial, sans-serif;
    }
    @keyframes yt-hider-undo-countdown {
      from { stroke-dashoffset: 0; }
      to { stroke-dashoffset: var(--yt-hider-countdown-circumference); }
    }
  `;
  document.head.appendChild(style);
}

const UNDO_WINDOW_MS = 3000;
const UNDO_WINDOW_SECONDS = Math.round(UNDO_WINDOW_MS / 1000);
const UNDO_COUNTDOWN_RADIUS = 8;
const UNDO_COUNTDOWN_CIRCUMFERENCE = 2 * Math.PI * UNDO_COUNTDOWN_RADIUS;

function buildUndoCountdownMarkup(seconds) {
  return `<svg class="yt-hider-undo-countdown" width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
    <circle cx="10" cy="10" r="${UNDO_COUNTDOWN_RADIUS}" fill="none" stroke="currentColor" stroke-opacity="0.3" stroke-width="2"></circle>
    <circle class="yt-hider-undo-countdown-ring" cx="10" cy="10" r="${UNDO_COUNTDOWN_RADIUS}" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="${UNDO_COUNTDOWN_CIRCUMFERENCE}" transform="rotate(-90 10 10)"></circle>
    <text class="yt-hider-undo-countdown-number" x="10" y="10" text-anchor="middle" dominant-baseline="central">${seconds}</text>
  </svg>`;
}

const ON_PAGE_CONTROLS_TIP =
  'You can hide this button from the extension settings, under "Hide on-page controls".';

const BLACKLIST_REASON = 'Blacklisted channel';

function buildWhitelistTooltipText(channel, { isWhitelisted = false } = {}) {
  const isMulti = Array.isArray(channel) && channel.length > 1;
  const channelWord = isMulti ? 'these channels' : 'this channel';
  const possessive = isMulti ? 'their' : 'its';

  if (isWhitelisted) {
    return `Removes ${channelWord} from your YouTube Hider whitelist. ${ON_PAGE_CONTROLS_TIP}`;
  }
  if (isChannelPaused(channel)) {
    return `This whitelist entry exists, but Channel Whitelist is currently turned off. Click to turn it back on. ${ON_PAGE_CONTROLS_TIP}`;
  }
  return `Adds ${channelWord} to your YouTube Hider whitelist: ${possessive} videos won't be filtered (Shorts are always filtered). ${ON_PAGE_CONTROLS_TIP}`;
}

function removeBadgeAnimated(badge) {
  if (!badge || !badge.isConnected) return;
  badge.classList.add('yt-hider-badge-leaving');
  const onAnimationEnd = e => {
    if (e.target !== badge) return;
    badge.removeEventListener('animationend', onAnimationEnd);
    badge.remove();
  };
  badge.addEventListener('animationend', onAnimationEnd);
  setTimeout(() => badge.remove(), 200);
}

function clearDimmedElement(element) {
  if (!element || !element.dataset.ytHiderDimmed) return;
  delete element.dataset.ytHiderDimmed;
  element.querySelectorAll('.yt-hider-badge').forEach(removeBadgeAnimated);
  element
    .querySelectorAll('[data-yt-hider-badge-target]')
    .forEach(t => delete t.dataset.ytHiderBadgeTarget);
}

function createWhitelistButton(channel) {
  const btn = document.createElement('button');
  btn.className = 'yt-hider-whitelist-btn';

  let countdownTimer = null;
  let pendingContainer = null;
  let pendingResult = null;

  const renderIdle = () => {
    const paused = isChannelPaused(channel);
    btn.classList.remove('yt-hider-whitelist-btn-pending');
    const label = paused ? 'Resume Whitelist' : 'Whitelist';
    btn.innerHTML = `<span class="yt-hider-whitelist-label">${label}</span>`;
  };
  renderIdle();

  const cancelPending = () => {
    if (countdownTimer) {
      clearInterval(countdownTimer);
      countdownTimer = null;
    }
    if (pendingContainer) {
      delete pendingContainer.dataset.ytHiderPendingAction;
      pendingContainer = null;
    }
  };

  btn.addEventListener('click', e => {
    e.preventDefault();
    e.stopPropagation();

    if (btn.classList.contains('yt-hider-whitelist-btn-pending')) {
      if (pendingResult) {
        if (pendingResult.enabledChanged) {
          prefs.channelWhitelistEnabled = false;
          safeStorageSet('sync', { channelWhitelistEnabled: false });
        }
        if (pendingResult.changedChannels.length) {
          setChannelWhitelisted(pendingResult.changedChannels, false);
        }
      }
      pendingResult = null;
      cancelPending();
      renderIdle();
      return;
    }

    if (isChannelExempt(channel)) return;

    pendingResult = setChannelWhitelisted(channel, true);
    if (!pendingResult) return;

    pendingContainer = btn.closest('[data-yt-hider-dimmed]');
    if (pendingContainer)
      pendingContainer.dataset.ytHiderPendingAction = '1';

    btn.innerHTML = `<span class="yt-hider-whitelist-label">Cancel</span>${buildUndoCountdownMarkup(UNDO_WINDOW_SECONDS)}`;
    btn.classList.add('yt-hider-whitelist-btn-pending');

    const ring = btn.querySelector('.yt-hider-undo-countdown-ring');
    if (ring) {
      ring.style.setProperty(
        '--yt-hider-countdown-circumference',
        UNDO_COUNTDOWN_CIRCUMFERENCE,
      );
      ring.style.animation = `yt-hider-undo-countdown ${UNDO_WINDOW_MS}ms linear forwards`;
    }

    const deadline = Date.now() + UNDO_WINDOW_MS;
    countdownTimer = setInterval(() => {
      const remainingMs = deadline - Date.now();
      const numberEl = btn.querySelector(
        '.yt-hider-undo-countdown-number',
      );
      if (numberEl)
        numberEl.textContent = Math.max(0, Math.ceil(remainingMs / 1000));

      if (remainingMs <= 0) {
        clearInterval(countdownTimer);
        countdownTimer = null;
        if (pendingContainer) {
          delete pendingContainer.dataset.ytHiderPendingAction;
          clearDimmedElement(pendingContainer);
          pendingContainer = null;
        }
      }
    }, 250);
  });

  return btn;
}

function createBlacklistButton(channel, onCommit) {
  const btn = document.createElement('button');
  btn.className = 'yt-hider-blacklist-btn';

  let countdownTimer = null;
  let pendingContainer = null;

  const renderIdle = () => {
    btn.classList.remove('yt-hider-blacklist-btn-pending');
    btn.innerHTML = `<span class="yt-hider-whitelist-label">Blacklist</span>`;
  };
  renderIdle();

  const cancelPending = () => {
    if (countdownTimer) {
      clearInterval(countdownTimer);
      countdownTimer = null;
    }
    if (pendingContainer) {
      delete pendingContainer.dataset.ytHiderPendingAction;
      pendingContainer = null;
    }
  };

  btn.addEventListener('click', e => {
    e.preventDefault();
    e.stopPropagation();

    if (btn.classList.contains('yt-hider-blacklist-btn-pending')) {
      cancelPending();
      renderIdle();
      return;
    }

    if (isChannelBlacklisted(channel)) return;

    pendingContainer = btn.closest('[data-yt-hider-dimmed]');
    if (pendingContainer) pendingContainer.dataset.ytHiderPendingAction = '1';

    btn.innerHTML = `<span class="yt-hider-whitelist-label">Cancel</span>${buildUndoCountdownMarkup(UNDO_WINDOW_SECONDS)}`;
    btn.classList.add('yt-hider-blacklist-btn-pending');

    const ring = btn.querySelector('.yt-hider-undo-countdown-ring');
    if (ring) {
      ring.style.setProperty(
        '--yt-hider-countdown-circumference',
        UNDO_COUNTDOWN_CIRCUMFERENCE,
      );
      ring.style.animation = `yt-hider-undo-countdown ${UNDO_WINDOW_MS}ms linear forwards`;
    }

    const deadline = Date.now() + UNDO_WINDOW_MS;
    countdownTimer = setInterval(() => {
      const remainingMs = deadline - Date.now();
      const numberEl = btn.querySelector(
        '.yt-hider-undo-countdown-number',
      );
      if (numberEl)
        numberEl.textContent = Math.max(0, Math.ceil(remainingMs / 1000));

      if (remainingMs <= 0) {
        clearInterval(countdownTimer);
        countdownTimer = null;
        if (pendingContainer) delete pendingContainer.dataset.ytHiderPendingAction;
        pendingContainer = null;
        setChannelBlacklisted(channel, true);
        if (onCommit) onCommit();
      }
    }, 250);
  });

  return btn;
}

function createUnblacklistButton(channel) {
  const btn = document.createElement('button');
  btn.className = 'yt-hider-blacklist-btn';
  btn.innerHTML = `<span class="yt-hider-whitelist-label">Unblacklist</span>`;

  btn.addEventListener('click', e => {
    e.preventDefault();
    e.stopPropagation();
    setChannelBlacklisted(channel, false);
  });

  return btn;
}

function getOrCreateBadgeButtonRow(badge) {
  let row = badge.querySelector('.yt-hider-badge-buttons');
  if (!row) {
    row = document.createElement('div');
    row.className = 'yt-hider-badge-buttons';
    badge.appendChild(row);
  }
  return row;
}

function createDimBadge(reason, channel) {
  const badge = document.createElement('div');
  badge.className = 'yt-hider-badge';
  badge.innerHTML = reason ? `<span class="yt-hider-badge-reason">${reason}</span>` : '';

  if (reason === BLACKLIST_REASON) {
    badge.dataset.ytHiderBadgeKind = 'blacklist';
    if (!prefs.hideInterfaceElements) {
      getOrCreateBadgeButtonRow(badge).appendChild(createUnblacklistButton(channel));
    }
    return badge;
  }

  if (channelIsPresent(channel) && !prefs.hideInterfaceElements) {
    getOrCreateBadgeButtonRow(badge).appendChild(createWhitelistButton(channel));
  }
  return badge;
}

function resolveChannelForElement(element) {
  return (
    extractChannelFromContainer(element) ||
    channelHandleFromPathname(window.location.pathname)
  );
}

function getCurrentPageChannel() {
  const pathname = window.location.pathname;
  const handle = channelHandleFromPathname(pathname);
  if (handle) return handle;
  if (pathname === '/watch') {
    const owner = document.querySelector('ytd-video-owner-renderer, ytm-video-owner-renderer');
    const ch = owner && extractChannelFromContainer(owner);
    if (ch) return ch;
    const videoId = new URLSearchParams(window.location.search).get('v');
    const cached = videoId && ytVideoChannelCache[videoId];
    if (cached) return resolveChannelIdentity(cached);
  }
  return null;
}

function channelIsPresent(ch) {
  return Array.isArray(ch) ? ch.length > 0 : !!ch;
}

function applyFilter(element, reason) {
  if (!element) return;
  const ch = resolveChannelForElement(element);
  if (isChannelExempt(ch)) {
    if (!element.dataset.ytHiderPendingAction) {
      clearDimmedElement(element);
    }
    if (element.dataset.ytHiderHidden) {
      element.style.display = '';
      delete element.dataset.ytHiderHidden;
    }
    return;
  }
  if (prefs.dimMode) {
    const badgeTarget = () =>
      element.querySelector('ytd-thumbnail') ||
      element.querySelector('yt-thumbnail-view-model') ||
      element.querySelector('ytm-thumbnail-cover-view-model') ||
      element;

    if (element.dataset.ytHiderDimmed) {
      const existingBadge = element.querySelector('.yt-hider-badge');
      if (!existingBadge) {
        const target = badgeTarget();
        target.dataset.ytHiderBadgeTarget = '1';
        target.appendChild(createDimBadge(reason, ch));
        return;
      }
      if (existingBadge.dataset.ytHiderBadgeKind === 'blacklist') return;
      if (
        channelIsPresent(ch) &&
        !prefs.hideInterfaceElements &&
        !existingBadge.querySelector('.yt-hider-whitelist-btn')
      ) {
        getOrCreateBadgeButtonRow(existingBadge).appendChild(createWhitelistButton(ch));
      }
      return;
    }
    element.dataset.ytHiderDimmed = '1';
    const target = badgeTarget();
    target.dataset.ytHiderBadgeTarget = '1';
    target.appendChild(createDimBadge(reason, ch));
  } else {
    if (element.dataset.ytHiderHidden || element.dataset.ytHiderDimmed) return;
    element.dataset.ytHiderHidden = '1';
    element.style.display = 'none';
  }
}

function resetAppliedFilters(force) {
  document.querySelectorAll('[data-yt-hider-hidden]').forEach(el => {
    if (!force && el.dataset.ytHiderPendingAction) return;
    el.style.display = '';
    delete el.dataset.ytHiderHidden;
  });
  document.querySelectorAll('[data-yt-hider-dimmed]').forEach(el => {
    if (!force && el.dataset.ytHiderPendingAction) return;
    delete el.dataset.ytHiderDimmed;
    delete el.dataset.ytHiderPendingAction;
  });
  document.querySelectorAll('.yt-hider-badge').forEach(el => {
    if (!force && el.closest('[data-yt-hider-pending-action]')) return;
    el.remove();
  });
  document.querySelectorAll('[data-yt-hider-badge-target]').forEach(el => {
    if (!force && el.closest('[data-yt-hider-pending-action]')) return;
    delete el.dataset.ytHiderBadgeTarget;
  });
}

function forceHide(element) {
  if (!element) return;
  if (element.dataset.ytHiderHidden) return;
  element.dataset.ytHiderHidden = '1';
  element.style.display = 'none';
}

function hideWatched(pathname) {
  const { hideThreshold } = prefs;

  // Slider at 0 = Off, don't hide anything
  if (hideThreshold === 0) return;

  document
    .querySelectorAll(
      'ytd-thumbnail-overlay-resume-playback-renderer #progress, .ytThumbnailOverlayProgressBarHostWatchedProgressBarSegment, ytm-thumbnail-overlay-resume-playback-renderer .thumbnail-overlay-resume-playback-progress',
    )
    .forEach(bar => {
      if (
        bar.classList.contains(
          'ytThumbnailOverlayProgressBarHostWatchedProgressBarSegment',
        )
      ) {
        const thumbnail = bar.closest('ytd-thumbnail');
        if (
          thumbnail &&
          thumbnail.querySelector(
            'ytd-thumbnail-overlay-now-playing-renderer[now-playing-badge]',
          )
        )
          return;
      }

      const pct = parseFloat(bar.style.width) || 0;
      if (pct <= hideThreshold) return;

      let item = bar;

      const isChannelPage = isChannelPagePath(pathname);

      const selectors =
        pathname === '/watch'
          ? 'ytd-compact-video-renderer, ytd-rich-item-renderer, ytd-video-renderer, yt-lockup-view-model, ytm-video-with-context-renderer, ytm-compact-video-renderer'
          : isChannelPage
            ? 'ytd-compact-video-renderer, ytd-rich-item-renderer, ytd-video-renderer, ytd-grid-video-renderer, ytm-video-with-context-renderer, ytm-compact-video-renderer'
            : 'ytd-compact-video-renderer, ytd-rich-item-renderer, ytd-video-renderer, ytm-video-with-context-renderer, ytm-compact-video-renderer, ytm-rich-item-renderer';

      while (item && !item.matches(selectors)) {
        item = item.parentElement;
      }
      if (!item) return;

      applyFilter(item, 'Already watched');
    });
}

// ── Upload Date Filter: hiding logic ──

function shouldHideDateFilter(pathname) {
  const {
    dateFilterNewerThreshold,
    dateFilterOlderThreshold,
    dateFilterHomeEnabled,
    dateFilterChannelEnabled,
    dateFilterSearchEnabled,
    dateFilterSubsEnabled,
    dateFilterCorrEnabled,
  } = prefs;

  // Both sliders at Off (threshold 0) means feature is disabled
  if (dateFilterNewerThreshold === 0 && dateFilterOlderThreshold === 0)
    return false;

  return (
    (pathname === '/' && dateFilterHomeEnabled) ||
    (isChannelPagePath(pathname) && dateFilterChannelEnabled) ||
    (pathname === '/results' && dateFilterSearchEnabled) ||
    (pathname === '/watch' && dateFilterCorrEnabled) ||
    (pathname === '/feed/subscriptions' && dateFilterSubsEnabled)
  );
}

function getDateFilterReason(ageDays) {
  const { dateFilterNewerThreshold, dateFilterOlderThreshold } = prefs;

  if (dateFilterNewerThreshold > 0 && ageDays < dateFilterNewerThreshold)
    return 'Video too new';
  if (dateFilterOlderThreshold > 0 && ageDays > dateFilterOlderThreshold)
    return 'Video too old';

  return null;
}

function getMetadataSpansFromContainer(metadataContainer) {
  const rowSelectors =
    '.yt-content-metadata-view-model-wiz__metadata-row, .yt-content-metadata-view-model__metadata-row, .ytContentMetadataViewModelMetadataRow';
  const textSelectors =
    'span.yt-core-attributed-string, span.ytContentMetadataViewModelMetadataText';

  const metadataRows = metadataContainer.querySelectorAll(rowSelectors);
  if (metadataRows.length) {
    const spans = [];
    metadataRows.forEach(row => {
      row.querySelectorAll(textSelectors).forEach(span => {
        spans.push(span);
      });
    });
    return spans;
  }

  return Array.from(
    metadataContainer.querySelectorAll(
      'span.ytContentMetadataViewModelMetadataText',
    ),
  );
}

function hideDateFilter() {
  const selectors = getVideoContainerSelectors();

  // Classic format: #metadata-line
  document.querySelectorAll('#metadata-line').forEach(metaLine => {
    let spans = metaLine.querySelectorAll('span.inline-metadata-item');
    if (!spans.length) {
      spans = metaLine.querySelectorAll('span');
    }
    if (!spans.length) return;

    const result = resolveUploadAgeFromSpans(spans);
    if (!result) return;
    const dateReason = getDateFilterReason(result.ageDays);
    if (!dateReason) return;

    findAndHideContainer(result.span, selectors, dateReason);
  });

  // Mobile format
  document
    .querySelectorAll('.YtmBadgeAndBylineRendererItemByline')
    .forEach(span => {
      const text = (span.textContent || '').trim();
      // Mobile format concatenates: "Channel · 1.2M views · 2 days ago".
      // Keep the LAST valid part: the date is the final item, so an earlier
      // channel name (e.g. "5-Minute Crafts") can't be mistaken for the age.
      const parts = text.split(/[·•]/);
      let ageDays = NaN;
      for (const part of parts) {
        const v = extractUploadAgeDays(part.trim());
        if (!isNaN(v)) ageDays = v;
      }
      if (isNaN(ageDays)) return;
      const dateReason = getDateFilterReason(ageDays);
      if (!dateReason) return;

      const container = span.closest(
        'ytm-video-with-context-renderer, ytm-rich-item-renderer, ytm-compact-video-renderer',
      );
      if (container) {
        applyFilter(container, dateReason);
        const wrapper = container.closest('ytm-rich-item-renderer');
        if (wrapper) applyFilter(wrapper, dateReason);
      }
    });

  // New format: yt-content-metadata-view-model
  document
    .querySelectorAll('yt-content-metadata-view-model, yt-lockup-view-model')
    .forEach(metadataContainer => {
      const allSpans = getMetadataSpansFromContainer(metadataContainer);
      if (!allSpans.length) return;

      const result = resolveUploadAgeFromSpans(allSpans);
      if (!result) return;
      const dateReason = getDateFilterReason(result.ageDays);
      if (!dateReason) return;

      findAndHideContainer(result.span, selectors, dateReason);
    });
}

// Live streams show concurrent-viewer text ("5 spettatori", "5 watching") that
// must not be treated as a view count. Detect the live badge / avatar live ring
// on the surrounding container so the views filter can skip live videos.
const LIVE_INDICATOR_SELECTORS =
  'badge-shape.yt-badge-shape--thumbnail-live, badge-shape.yt-badge-shape--live, ' +
  'badge-shape.ytBadgeShapeThumbnailLive, badge-shape.ytBadgeShapeLive, ' +
  '.yt-spec-avatar-shape--live-ring, .yt-spec-avatar-shape__live-badge, ' +
  '.ytSpecAvatarShapeLiveRing, .ytSpecAvatarShapeLiveBadge, ' +
  'ytd-thumbnail-overlay-time-status-renderer[overlay-style="LIVE"], ' +
  '.badge-style-type-live-now';

function isLiveVideo(element) {
  if (!element) return false;
  const container =
    element.closest(
      'yt-lockup-view-model, ytd-rich-item-renderer, ytd-video-renderer, ytd-compact-video-renderer, ytd-grid-video-renderer, ytm-rich-item-renderer, ytm-video-with-context-renderer, ytm-compact-video-renderer',
    ) || element;
  return !!container.querySelector(LIVE_INDICATOR_SELECTORS);
}

function hideUnderVisuals() {
  const { viewsHideThreshold } = prefs;
  const selectors = getVideoContainerSelectors();

  document.querySelectorAll('#metadata-line').forEach(metaLine => {
    let spans = metaLine.querySelectorAll('span.inline-metadata-item');
    if (!spans.length) {
      spans = metaLine.querySelectorAll('span');
    }
    if (!spans.length) return;

    const result = resolveViewsFromSpans(spans);
    if (!result || result.views >= viewsHideThreshold) return;
    if (isLiveVideo(result.span)) return;

    findAndHideContainer(result.span, selectors, 'Views too low');
  });

  document
    .querySelectorAll('.YtmBadgeAndBylineRendererItemByline')
    .forEach(span => {
      const text = (span.textContent || '').trim();
      const result = extractViewCount(text);
      if (!result || typeof result !== 'object') return;
      if (result.views >= viewsHideThreshold) return;
      if (isLiveVideo(span)) return;

      const container = span.closest(
        'ytm-video-with-context-renderer, ytm-rich-item-renderer, ytm-compact-video-renderer',
      );

      if (container) {
        applyFilter(container, 'Views too low');
        const wrapper = container.closest('ytm-rich-item-renderer');
        if (wrapper) applyFilter(wrapper, 'Views too low');
      }
    });

  hideNewFormatVideos();
}

function hideNewFormatVideos() {
  const { viewsHideThreshold } = prefs;
  const selectors = getVideoContainerSelectors();

  document
    .querySelectorAll('yt-content-metadata-view-model, yt-lockup-view-model')
    .forEach(metadataContainer => {
      const allSpans = getMetadataSpansFromContainer(metadataContainer);
      if (!allSpans.length) return;

      const result = resolveViewsFromSpans(allSpans);

      try {
        // logger.log('views-check', {
        //   views: result ? result.views : NaN,
        //   threshold: viewsHideThreshold,
        //   pathname: window.location.pathname,
        // });
      } catch (e) {}

      if (!result || result.views >= viewsHideThreshold) return;
      if (isLiveVideo(result.span)) return;

      findAndHideContainer(result.span, selectors, 'Views too low');
    });
}

function hideShorts() {
  document.querySelectorAll('ytm-rich-section-renderer').forEach(section => {
    if (section.querySelector('ytm-shorts-lockup-view-model')) {
      forceHide(section);
    }
  });

  document.querySelectorAll('ytm-pivot-bar-item-renderer').forEach(item => {
    if (item.querySelector('.pivot-shorts')) {
      forceHide(item);
    }
  });

  document
    .querySelectorAll(
      'ytd-guide-section-renderer, tp-yt-paper-item, ytd-video-renderer, ytd-reel-shelf-renderer, ytm-reel-shelf-renderer',
    )
    .forEach(node => {
      if (node.querySelector('ytm-shorts-lockup-view-model')) {
        forceHide(node);
      }
      if (
        node.querySelector('badge-shape[aria-label="Shorts"]') ||
        node.querySelector(
          'ytd-thumbnail-overlay-time-status-renderer[overlay-style="SHORTS"]',
        )
      ) {
        forceHide(node);
      }
    });

  document.querySelectorAll('a[href^="/shorts/"]').forEach(link => {
    const shelf = link.closest(
      'ytd-rich-shelf-renderer, ytm-reel-shelf-renderer',
    );
    if (shelf) {
      forceHide(shelf);
      return;
    }
    const item = link.closest(
      'ytd-rich-item-renderer, ytm-video-with-context-renderer',
    );
    if (item) forceHide(item);
  });

  document.querySelectorAll('a[title="Shorts"]').forEach(link => {
    const entry =
      link.closest('ytd-guide-entry-renderer') ||
      link.closest('ytd-mini-guide-entry-renderer') ||
      link.closest('ytm-pivot-bar-item-renderer');
    if (entry) forceHide(entry);
  });

  document.querySelectorAll('a[title="Shorts"]').forEach(link => {
    const entry = link.closest('ytd-guide-entry-renderer');
    if (entry) forceHide(entry);
  });

  document
    .querySelectorAll('yt-formatted-string[title="Shorts"]')
    .forEach(link => {
      const entry = link.closest('yt-chip-cloud-chip-renderer');
      if (entry) forceHide(entry);
    });

  document.querySelectorAll('ytm-chip-cloud-chip-renderer').forEach(chip => {
    if (chip.textContent.trim() === 'Shorts') {
      forceHide(chip);
    }
  });

  document
    .querySelectorAll('yt-tab-shape[tab-title="Shorts"]')
    .forEach(link => {
      forceHide(link);
    });

  document.querySelectorAll('grid-shelf-view-model').forEach(node => {
    if (
      node.querySelector(
        'ytm-shorts-lockup-view-model-v2, ytm-shorts-lockup-view-model',
      )
    ) {
      forceHide(node);
    }
  });

  document
    .querySelectorAll(
      'grid-shelf-view-model:has(ytm-shorts-lockup-view-model-v2), grid-shelf-view-model:has(ytm-shorts-lockup-view-model)',
    )
    .forEach(node => {
      forceHide(node);
    });

  document.querySelectorAll('yt-chip-cloud-chip-renderer').forEach(node => {
    const label = node.querySelector('.ytChipShapeChip');
    if (label && label.textContent.trim() === 'Shorts') {
      forceHide(node);
    }
  });

  document.querySelectorAll('ytd-rich-section-renderer').forEach(section => {
    const allChildren = section.querySelectorAll('*');
    for (const child of allChildren) {
      if (child.style.display === 'none' || child.dataset.ytHiderDimmed) {
        forceHide(section);
        break;
      }
    }
  });

  document
    .querySelectorAll('ytd-mini-guide-entry-renderer a[href^="/shorts"]')
    .forEach(link => {
      const entry = link.closest('ytd-mini-guide-entry-renderer');
      if (entry) forceHide(entry);
    });

  document
    .querySelectorAll('a[aria-label="Shorts"][href^="/shorts"]')
    .forEach(link => {
      const mini = link.closest('ytd-mini-guide-entry-renderer');
      const guide = link.closest('ytd-guide-entry-renderer');
      const pivot = link.closest('ytm-pivot-bar-item-renderer');
      if (mini) forceHide(mini);
      if (guide) forceHide(guide);
      if (pivot) forceHide(pivot);
    });
}

function shouldHideWatched(pathname) {
  const {
    hideHomeEnabled,
    hideChannelEnabled,
    hideSearchEnabled,
    hideSubsEnabled,
    hideCorrEnabled,
  } = prefs;

  return (
    (pathname === '/' && hideHomeEnabled) ||
    (isChannelPagePath(pathname) && hideChannelEnabled) ||
    (pathname === '/results' && hideSearchEnabled) ||
    (pathname === '/watch' && hideCorrEnabled) ||
    (pathname === '/feed/subscriptions' && hideSubsEnabled)
  );
}

function shouldHideViews(pathname) {
  const {
    viewsHideHomeEnabled,
    viewsHideChannelEnabled,
    viewsHideSearchEnabled,
    viewsHideSubsEnabled,
    viewsHideCorrEnabled,
  } = prefs;

  return (
    (pathname === '/' && viewsHideHomeEnabled) ||
    (isChannelPagePath(pathname) && viewsHideChannelEnabled) ||
    (pathname === '/results' && viewsHideSearchEnabled) ||
    (pathname === '/watch' && viewsHideCorrEnabled) ||
    (pathname === '/feed/subscriptions' && viewsHideSubsEnabled)
  );
}

function shouldHideShorts(pathname) {
  const { hideShortsEnabled, hideShortsSearchEnabled } = prefs;

  return (
    hideShortsEnabled &&
    pathname !== '/feed/history' &&
    (hideShortsSearchEnabled || pathname !== '/results')
  );
}

function isCoreFilterPath(pathname) {
  if (!pathname) return false;

  if (
    pathname === '/feed/playlists' ||
    pathname === '/playlist' ||
    pathname === '/feed/library' ||
    pathname === '/feed/history'
  ) {
    return false;
  }

  return (
    pathname === '/' ||
    pathname === '/results' ||
    pathname === '/watch' ||
    pathname === '/feed/subscriptions' ||
    isChannelPagePath(pathname)
  );
}

function hideMixes() {
  document.querySelectorAll('[class*="content-id-RD"]').forEach(el => {
    const item =
      el.closest('ytd-rich-item-renderer, ytm-rich-item-renderer') ||
      el.closest('yt-lockup-view-model');
    if (item) applyFilter(item, 'Mix playlist');
  });

  document.querySelectorAll('a[href*="start_radio=1"]').forEach(link => {
    const item =
      link.closest(
        'ytd-rich-item-renderer, ytd-compact-radio-renderer, ytd-radio-renderer, ytm-rich-item-renderer, ytm-video-with-context-renderer',
      ) || link.closest('yt-lockup-view-model');
    if (item) applyFilter(item, 'Mix playlist');
  });

  document
    .querySelectorAll('ytd-radio-renderer, ytd-compact-radio-renderer')
    .forEach(node => {
      applyFilter(node, 'Mix playlist');
    });
}

function shouldHideMixes(pathname) {
  return prefs.hideMixesEnabled && isCoreFilterPath(pathname);
}

function hidePlaylists() {
  document.querySelectorAll('[class*="content-id-PL"]').forEach(el => {
    const item =
      el.closest('ytd-rich-item-renderer, ytm-rich-item-renderer') ||
      el.closest('yt-lockup-view-model');
    if (item) applyFilter(item, 'Playlist');
  });

  document
    .querySelectorAll('ytd-playlist-renderer, ytd-compact-playlist-renderer')
    .forEach(node => {
      applyFilter(node, 'Playlist');
    });
}

function shouldHidePlaylists(pathname) {
  return prefs.hidePlaylistsEnabled && isCoreFilterPath(pathname);
}

function hideLives() {
  document
    .querySelectorAll(
      'badge-shape.yt-badge-shape--thumbnail-live, badge-shape.yt-badge-shape--live, badge-shape.ytBadgeShapeThumbnailLive, badge-shape.ytBadgeShapeLive',
    )
    .forEach(el => {
      const item =
        el.closest(
          'ytd-rich-item-renderer, ytm-rich-item-renderer, ytd-video-renderer, ytd-compact-video-renderer',
        ) || el.closest('yt-lockup-view-model');
      if (item) applyFilter(item, 'Live stream');
    });

  document.querySelectorAll('yt-lockup-view-model').forEach(el => {
    if (
      el.querySelector('.yt-spec-avatar-shape--live-ring') ||
      el.querySelector('.yt-spec-avatar-shape__live-badge')
    ) {
      const item =
        el.closest('ytd-rich-item-renderer, ytm-rich-item-renderer') || el;
      applyFilter(item, 'Live stream');
    }
  });
}

function shouldHideLives(pathname) {
  return prefs.hideLivesEnabled && isCoreFilterPath(pathname);
}

// Extra standalone container shapes that getVideoContainerSelectors doesn't
// already cover, needed so a blacklisted channel's Mixes/Playlists are hidden
// even when the Mixes/Playlists filters themselves are turned off.
const BLACKLIST_EXTRA_SELECTORS =
  'ytd-playlist-renderer, ytd-compact-playlist-renderer, ytd-radio-renderer, ytd-compact-radio-renderer';

function shouldHideBlacklisted(pathname) {
  return (
    prefs.channelBlacklistEnabled &&
    Array.isArray(prefs.channelBlacklist) &&
    prefs.channelBlacklist.length > 0 &&
    isCoreFilterPath(pathname)
  );
}

function hideBlacklistedVideos() {
  const selectors = getVideoContainerSelectors() + ', ' + BLACKLIST_EXTRA_SELECTORS;
  const seen = new Set();

  document.querySelectorAll(selectors).forEach(node => {
    const container = findOutermostMatch(node, selectors);
    if (!container || seen.has(container)) return;
    seen.add(container);

    const ch = resolveChannelForElement(container);
    if (isChannelBlacklisted(ch)) {
      applyFilter(container, BLACKLIST_REASON);
    }
  });
}

// Shorts always hard-hide (never dimmed), matching hideShorts()'s own
// convention. A shorts shelf can mix several channels, so only the
// individual shorts item is force-hidden, not the whole shelf.
function hideBlacklistedShorts() {
  document
    .querySelectorAll('ytm-shorts-lockup-view-model, a[href^="/shorts/"]')
    .forEach(node => {
      const container =
        node.closest('ytm-shorts-lockup-view-model') ||
        node.closest('ytd-rich-item-renderer, ytm-video-with-context-renderer') ||
        node;
      const ch = resolveChannelForElement(container);
      if (isChannelBlacklisted(ch)) {
        forceHide(container);
      }
    });
}

function hideBlacklisted() {
  hideBlacklistedVideos();
  hideBlacklistedShorts();
}
