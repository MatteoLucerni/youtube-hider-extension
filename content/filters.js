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
    }
    .yt-hider-badge-logo {
      width: 36px;
      height: 36px;
      object-fit: contain;
      display: block;
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
  `;
  document.head.appendChild(style);
}

function createDimBadge(reason) {
  const badge = document.createElement('div');
  badge.className = 'yt-hider-badge';
  badge.innerHTML = `<img class="yt-hider-badge-logo" src="${chrome.runtime.getURL('assets/icons/youtube-hider-logo.png')}" />${reason ? `<span class="yt-hider-badge-reason">${reason}</span>` : ''}`;
  return badge;
}

function applyFilter(element, reason) {
  if (!element) return;
  if (prefs.dimMode) {
    if (element.dataset.ytHiderDimmed) return;
    element.dataset.ytHiderDimmed = '1';
    const target =
      element.querySelector('ytd-thumbnail') ||
      element.querySelector('yt-thumbnail-view-model') ||
      element.querySelector('ytm-thumbnail-cover-view-model') ||
      element;
    target.dataset.ytHiderBadgeTarget = '1';
    target.appendChild(createDimBadge(reason));
  } else {
    if (element.dataset.ytHiderHidden) return;
    element.dataset.ytHiderHidden = '1';
    element.style.display = 'none';
  }
}

function resetAppliedFilters() {
  document.querySelectorAll('[data-yt-hider-hidden]').forEach(el => {
    el.style.display = '';
    delete el.dataset.ytHiderHidden;
  });
  document.querySelectorAll('[data-yt-hider-dimmed]').forEach(el => {
    delete el.dataset.ytHiderDimmed;
  });
  document.querySelectorAll('.yt-hider-badge').forEach(el => el.remove());
  document.querySelectorAll('[data-yt-hider-badge-target]').forEach(el => {
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
      const pct = parseFloat(bar.style.width) || 0;
      if (pct <= hideThreshold) return;

      let item = bar;

      const isChannelPage = pathname && pathname.startsWith('/@');

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
    (pathname && pathname.startsWith('/@') && dateFilterChannelEnabled) ||
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
    metadataContainer.querySelectorAll('span.ytContentMetadataViewModelMetadataText'),
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
      // Mobile format concatenates: "1.2M views · 2 days ago"
      const parts = text.split(/[·•]/);
      let ageDays = NaN;
      for (const part of parts) {
        ageDays = extractUploadAgeDays(part.trim());
        if (!isNaN(ageDays)) break;
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

    findAndHideContainer(result.span, selectors, 'Views too low');
  });

  document
    .querySelectorAll('.YtmBadgeAndBylineRendererItemByline')
    .forEach(span => {
      const text = (span.textContent || '').trim();
      const result = extractViewCount(text);
      if (!result || typeof result !== 'object') return;
      if (result.views >= viewsHideThreshold) return;

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
        logger.log('views-check', {
          views: result ? result.views : NaN,
          threshold: viewsHideThreshold,
          pathname: window.location.pathname,
        });
      } catch (e) {}

      if (!result || result.views >= viewsHideThreshold) return;

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
    (pathname && pathname.startsWith('/@') && hideChannelEnabled) ||
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
    (pathname && pathname.startsWith('/@') && viewsHideChannelEnabled) ||
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

function shouldHideMixes() {
  return prefs.hideMixesEnabled;
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

function shouldHidePlaylists() {
  return prefs.hidePlaylistsEnabled;
}

function hideLives() {
  document.querySelectorAll('badge-shape.yt-badge-shape--thumbnail-live, badge-shape.yt-badge-shape--live').forEach(el => {
    const item =
      el.closest('ytd-rich-item-renderer, ytm-rich-item-renderer, ytd-video-renderer, ytd-compact-video-renderer') ||
      el.closest('yt-lockup-view-model');
    if (item) applyFilter(item, 'Live stream');
  });

  document.querySelectorAll('yt-lockup-view-model').forEach(el => {
    if (
      el.querySelector('.yt-spec-avatar-shape--live-ring') ||
      el.querySelector('.yt-spec-avatar-shape__live-badge')
    ) {
      const item = el.closest('ytd-rich-item-renderer, ytm-rich-item-renderer') || el;
      applyFilter(item, 'Live stream');
    }
  });
}

function shouldHideLives() {
  return prefs.hideLivesEnabled;
}
