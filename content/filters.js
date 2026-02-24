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

      item.style.display = 'none';
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

function shouldHideDateVideo(ageDays) {
  const { dateFilterNewerThreshold, dateFilterOlderThreshold } = prefs;

  if (dateFilterNewerThreshold > 0 && ageDays < dateFilterNewerThreshold)
    return true;
  if (dateFilterOlderThreshold > 0 && ageDays > dateFilterOlderThreshold)
    return true;

  return false;
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
    if (!shouldHideDateVideo(result.ageDays)) return;

    findAndHideContainer(result.span, selectors);
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
      if (!shouldHideDateVideo(ageDays)) return;

      const container = span.closest(
        'ytm-video-with-context-renderer, ytm-rich-item-renderer, ytm-compact-video-renderer',
      );
      if (container) {
        container.style.display = 'none';
        const wrapper = container.closest('ytm-rich-item-renderer');
        if (wrapper) wrapper.style.display = 'none';
      }
    });

  // New format: yt-content-metadata-view-model
  document
    .querySelectorAll('yt-content-metadata-view-model, yt-lockup-view-model')
    .forEach(metadataContainer => {
      const metadataRows = metadataContainer.querySelectorAll(
        '.yt-content-metadata-view-model-wiz__metadata-row, .yt-content-metadata-view-model__metadata-row',
      );
      if (!metadataRows.length) return;

      const allSpans = [];
      metadataRows.forEach(row => {
        row.querySelectorAll('span.yt-core-attributed-string').forEach(span => {
          allSpans.push(span);
        });
      });

      const result = resolveUploadAgeFromSpans(allSpans);
      if (!result) return;
      if (!shouldHideDateVideo(result.ageDays)) return;

      findAndHideContainer(result.span, selectors);
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

    findAndHideContainer(result.span, selectors);
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
        container.style.display = 'none';
        const wrapper = container.closest('ytm-rich-item-renderer');
        if (wrapper) wrapper.style.display = 'none';
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
      const metadataRows = metadataContainer.querySelectorAll(
        '.yt-content-metadata-view-model-wiz__metadata-row, .yt-content-metadata-view-model__metadata-row',
      );
      if (!metadataRows.length) return;

      const allSpans = [];
      metadataRows.forEach(row => {
        row.querySelectorAll('span.yt-core-attributed-string').forEach(span => {
          allSpans.push(span);
        });
      });

      const result = resolveViewsFromSpans(allSpans);

      try {
        logger.log('views-check', {
          views: result ? result.views : NaN,
          threshold: viewsHideThreshold,
          pathname: window.location.pathname,
        });
      } catch (e) {}

      if (!result || result.views >= viewsHideThreshold) return;

      findAndHideContainer(result.span, selectors);
    });
}

function hideShorts() {
  document.querySelectorAll('ytm-rich-section-renderer').forEach(section => {
    if (section.querySelector('ytm-shorts-lockup-view-model')) {
      section.style.display = 'none';
    }
  });

  document.querySelectorAll('ytm-pivot-bar-item-renderer').forEach(item => {
    if (item.querySelector('.pivot-shorts')) {
      item.style.display = 'none';
    }
  });

  document
    .querySelectorAll(
      'ytd-guide-section-renderer, tp-yt-paper-item, ytd-video-renderer, ytd-reel-shelf-renderer, ytm-reel-shelf-renderer',
    )
    .forEach(node => {
      if (node.querySelector('ytm-shorts-lockup-view-model')) {
        node.style.display = 'none';
      }
      if (
        node.querySelector('badge-shape[aria-label="Shorts"]') ||
        node.querySelector(
          'ytd-thumbnail-overlay-time-status-renderer[overlay-style="SHORTS"]',
        )
      ) {
        node.style.display = 'none';
      }
    });

  document.querySelectorAll('a[href^="/shorts/"]').forEach(link => {
    const shelf = link.closest(
      'ytd-rich-shelf-renderer, ytm-reel-shelf-renderer',
    );
    if (shelf) {
      shelf.style.display = 'none';
      return;
    }
    const item = link.closest(
      'ytd-rich-item-renderer, ytm-video-with-context-renderer',
    );
    if (item) item.style.display = 'none';
  });

  document.querySelectorAll('a[title="Shorts"]').forEach(link => {
    const entry =
      link.closest('ytd-guide-entry-renderer') ||
      link.closest('ytd-mini-guide-entry-renderer') ||
      link.closest('ytm-pivot-bar-item-renderer');
    if (entry) entry.style.display = 'none';
  });

  document.querySelectorAll('a[title="Shorts"]').forEach(link => {
    const entry = link.closest('ytd-guide-entry-renderer');
    if (entry) entry.style.display = 'none';
  });

  document
    .querySelectorAll('yt-formatted-string[title="Shorts"]')
    .forEach(link => {
      const entry = link.closest('yt-chip-cloud-chip-renderer');
      if (entry) entry.style.display = 'none';
    });

  document.querySelectorAll('ytm-chip-cloud-chip-renderer').forEach(chip => {
    if (chip.textContent.trim() === 'Shorts') {
      chip.style.display = 'none';
    }
  });

  document
    .querySelectorAll('yt-tab-shape[tab-title="Shorts"]')
    .forEach(link => {
      link.style.display = 'none';
    });

  document.querySelectorAll('grid-shelf-view-model').forEach(node => {
    if (
      node.querySelector(
        'ytm-shorts-lockup-view-model-v2, ytm-shorts-lockup-view-model',
      )
    ) {
      node.style.display = 'none';
    }
  });

  document
    .querySelectorAll(
      'grid-shelf-view-model:has(ytm-shorts-lockup-view-model-v2), grid-shelf-view-model:has(ytm-shorts-lockup-view-model)',
    )
    .forEach(node => {
      node.style.display = 'none';
    });

  document.querySelectorAll('yt-chip-cloud-chip-renderer').forEach(node => {
    const label = node.querySelector('.ytChipShapeChip');
    if (label && label.textContent.trim() === 'Shorts') {
      node.style.display = 'none';
    }
  });

  document.querySelectorAll('ytd-rich-section-renderer').forEach(section => {
    const allChildren = section.querySelectorAll('*');
    for (const child of allChildren) {
      if (child.style.display === 'none') {
        section.style.display = 'none';
        break;
      }
    }
  });

  document
    .querySelectorAll('ytd-mini-guide-entry-renderer a[href^="/shorts"]')
    .forEach(link => {
      const entry = link.closest('ytd-mini-guide-entry-renderer');
      if (entry) entry.style.display = 'none';
    });

  document
    .querySelectorAll('a[aria-label="Shorts"][href^="/shorts"]')
    .forEach(link => {
      const mini = link.closest('ytd-mini-guide-entry-renderer');
      const guide = link.closest('ytd-guide-entry-renderer');
      const pivot = link.closest('ytm-pivot-bar-item-renderer');
      if (mini) mini.style.display = 'none';
      if (guide) guide.style.display = 'none';
      if (pivot) pivot.style.display = 'none';
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
    if (item) item.style.display = 'none';
  });

  document.querySelectorAll('a[href*="start_radio=1"]').forEach(link => {
    const item =
      link.closest(
        'ytd-rich-item-renderer, ytd-compact-radio-renderer, ytd-radio-renderer, ytm-rich-item-renderer, ytm-video-with-context-renderer',
      ) || link.closest('yt-lockup-view-model');
    if (item) item.style.display = 'none';
  });

  document
    .querySelectorAll('ytd-radio-renderer, ytd-compact-radio-renderer')
    .forEach(node => {
      node.style.display = 'none';
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
    if (item) item.style.display = 'none';
  });

  document
    .querySelectorAll('ytd-playlist-renderer, ytd-compact-playlist-renderer')
    .forEach(node => {
      node.style.display = 'none';
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
    if (item) item.style.display = 'none';
  });

  document.querySelectorAll('yt-lockup-view-model').forEach(el => {
    if (
      el.querySelector('.yt-spec-avatar-shape--live-ring') ||
      el.querySelector('.yt-spec-avatar-shape__live-badge')
    ) {
      const item = el.closest('ytd-rich-item-renderer, ytm-rich-item-renderer') || el;
      item.style.display = 'none';
    }
  });
}

function shouldHideLives() {
  return prefs.hideLivesEnabled;
}
