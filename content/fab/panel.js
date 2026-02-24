const miniViewsSteps = [
  0, 100, 500, 1000, 2500, 5000, 7500, 10000, 15000, 25000, 50000, 75000,
  100000, 150000, 250000, 500000, 1000000, 10000000,
];

const miniDateSteps = [0, 1, 3, 7, 14, 30, 60, 90, 180, 365, 730, 1825, 3650];
const miniDateLabels = [
  'Off',
  '1d',
  '3d',
  '1w',
  '2w',
  '1 mo',
  '2 mo',
  '3 mo',
  '6 mo',
  '1 yr',
  '2 yr',
  '5 yr',
  '10 yr',
];

const miniDateNewerSteps = [
  0,
  1 / 24,
  0.25,
  0.5,
  1,
  3,
  7,
  14,
  30,
  60,
  90,
  180,
  365,
  730,
  1825,
  3650,
];
const miniDateNewerLabels = [
  'Off',
  '1h',
  '6h',
  '12h',
  '1d',
  '3d',
  '1w',
  '2w',
  '1 mo',
  '2 mo',
  '3 mo',
  '6 mo',
  '1 yr',
  '2 yr',
  '5 yr',
  '10 yr',
];

function findClosestMiniDateNewerIndex(value) {
  let closestIndex = 0;
  let minDiff = Math.abs(miniDateNewerSteps[0] - value);
  for (let i = 1; i < miniDateNewerSteps.length; i++) {
    const diff = Math.abs(miniDateNewerSteps[i] - value);
    if (diff < minDiff) {
      minDiff = diff;
      closestIndex = i;
    }
  }
  return closestIndex;
}

function findClosestMiniDateIndex(value) {
  let closestIndex = 0;
  let minDiff = Math.abs(miniDateSteps[0] - value);
  for (let i = 1; i < miniDateSteps.length; i++) {
    const diff = Math.abs(miniDateSteps[i] - value);
    if (diff < minDiff) {
      minDiff = diff;
      closestIndex = i;
    }
  }
  return closestIndex;
}

function formatMiniViews(views) {
  if (views >= 1000000) {
    return (views / 1000000).toFixed(views % 1000000 === 0 ? 0 : 1) + 'M';
  } else if (views >= 1000) {
    return (views / 1000).toFixed(views % 1000 === 0 ? 0 : 1) + 'K';
  }
  return views.toString();
}

function findClosestMiniViewsIndex(value) {
  let closestIndex = 0;
  let minDiff = Math.abs(miniViewsSteps[0] - value);
  for (let i = 1; i < miniViewsSteps.length; i++) {
    const diff = Math.abs(miniViewsSteps[i] - value);
    if (diff < minDiff) {
      minDiff = diff;
      closestIndex = i;
    }
  }
  return closestIndex;
}

function syncPanelToPrefs(shadow) {
  const hideShortsToggle = shadow.querySelector('#yh-p-hide-shorts');
  const thresholdSlider = shadow.querySelector('#yh-p-threshold');
  const thresholdValue = shadow.querySelector('#yh-p-threshold-val');
  const viewsSlider = shadow.querySelector('#yh-p-views');
  const viewsValue = shadow.querySelector('#yh-p-views-val');

  const hideMixesToggle = shadow.querySelector('#yh-p-hide-mixes');
  const hidePlaylistsToggle = shadow.querySelector('#yh-p-hide-playlists');
  const hideLivesToggle = shadow.querySelector('#yh-p-hide-lives');

  if (hideShortsToggle) hideShortsToggle.checked = prefs.hideShortsEnabled;
  if (hideMixesToggle) hideMixesToggle.checked = prefs.hideMixesEnabled;
  if (hidePlaylistsToggle) hidePlaylistsToggle.checked = prefs.hidePlaylistsEnabled;
  if (hideLivesToggle) hideLivesToggle.checked = prefs.hideLivesEnabled;
  if (thresholdSlider) {
    thresholdSlider.value = prefs.hideThreshold;
    if (thresholdValue) {
      thresholdValue.textContent =
        prefs.hideThreshold === 0 ? 'Off' : prefs.hideThreshold + '%';
    }
    updateMiniSliderBg(thresholdSlider);
    updateMiniSliderOffState(thresholdSlider, prefs.hideThreshold === 0);
  }
  if (viewsSlider) {
    const idx = findClosestMiniViewsIndex(prefs.viewsHideThreshold);
    viewsSlider.value = idx;
    if (viewsValue) {
      viewsValue.textContent =
        idx === 0 ? 'Off' : formatMiniViews(miniViewsSteps[idx]);
    }
    updateMiniSliderBg(viewsSlider);
    updateMiniSliderOffState(viewsSlider, idx === 0);
  }

  // Date filter
  const dateNewerSlider = shadow.querySelector('#yh-p-date-newer');
  const dateNewerVal = shadow.querySelector('#yh-p-date-newer-val');
  const dateOlderSlider = shadow.querySelector('#yh-p-date-older');
  const dateOlderVal = shadow.querySelector('#yh-p-date-older-val');

  if (dateNewerSlider) {
    const idx = findClosestMiniDateNewerIndex(prefs.dateFilterNewerThreshold);
    dateNewerSlider.value = idx;
    if (dateNewerVal) dateNewerVal.textContent = miniDateNewerLabels[idx];
    updateMiniSliderBg(dateNewerSlider);
    updateMiniSliderOffState(dateNewerSlider, idx === 0);
  }
  if (dateOlderSlider) {
    const idx = findClosestMiniDateIndex(prefs.dateFilterOlderThreshold);
    dateOlderSlider.value = idx;
    if (dateOlderVal) dateOlderVal.textContent = miniDateLabels[idx];
    updateMiniSliderBg(dateOlderSlider);
    updateMiniSliderOffState(dateOlderSlider, idx === 0);
  }

  checkMiniDateOverlap(shadow);
}

function updateMiniSliderBg(slider) {
  const pct = ((slider.value - slider.min) / (slider.max - slider.min)) * 100;
  slider.style.background = `linear-gradient(to right, #ebebeb ${pct}%, #4a4a4a ${pct}%)`;
}

function updateMiniSliderOffState(slider, isOff) {
  const row = slider.closest('.yh-panel-slider-row');
  if (row) {
    const wrap = row.querySelector('.yh-panel-slider-wrap');
    if (wrap) {
      wrap.style.opacity = isOff ? '0.35' : '1';
    }
  }
}

function checkMiniDateOverlap(shadow) {
  const dateNewerSlider = shadow.querySelector('#yh-p-date-newer');
  const dateOlderSlider = shadow.querySelector('#yh-p-date-older');
  const warning = shadow.querySelector('#yh-p-date-overlap-warning');

  if (!dateNewerSlider || !dateOlderSlider) return;

  const newerIdx = parseInt(dateNewerSlider.value, 10);
  const olderIdx = parseInt(dateOlderSlider.value, 10);
  const newerThreshold = miniDateNewerSteps[newerIdx];
  const olderThreshold = miniDateSteps[olderIdx];

  // Both must be active (not Off) and overlapping
  const isOverlap =
    newerIdx > 0 && olderIdx > 0 && newerThreshold >= olderThreshold;

  if (warning) warning.style.visibility = isOverlap ? 'visible' : 'hidden';

  shadow.querySelectorAll('.yh-date-slider-row').forEach(row => {
    row.classList.toggle('yh-date-overlap', isOverlap);
  });
}

function bindPanelEvents(shadow) {
  const hideShortsToggle = shadow.querySelector('#yh-p-hide-shorts');
  const thresholdSlider = shadow.querySelector('#yh-p-threshold');
  const thresholdValue = shadow.querySelector('#yh-p-threshold-val');
  const viewsSlider = shadow.querySelector('#yh-p-views');
  const viewsValue = shadow.querySelector('#yh-p-views-val');
  const openFullBtn = shadow.querySelector('#yh-p-open-full');
  const hideButtonLink = shadow.querySelector('#yh-p-hide-btn');
  const closeBtn = shadow.querySelector('#yh-p-close');

  // Auto-enable per-page flags when slider leaves Off (floating menu = Easy Mode)
  function autoEnablePerPageMini(flagKeys, val) {
    if (val) {
      // Check if all flags are currently false
      const allOff = flagKeys.every(key => !prefs[key]);
      if (allOff) {
        const updates = {};
        flagKeys.forEach(key => {
          updates[key] = val;
        });
        safeStorageSet('sync', updates);
      }
    }
  }

  const hideMixesToggle = shadow.querySelector('#yh-p-hide-mixes');
  const hidePlaylistsToggle = shadow.querySelector('#yh-p-hide-playlists');
  const hideLivesToggle = shadow.querySelector('#yh-p-hide-lives');

  if (hideShortsToggle) {
    hideShortsToggle.addEventListener('change', () => {
      safeStorageSet('sync', {
        hideShortsEnabled: hideShortsToggle.checked,
        hideShortsSearchEnabled: hideShortsToggle.checked,
      });
    });
  }

  if (hideMixesToggle) {
    hideMixesToggle.addEventListener('change', () => {
      safeStorageSet('sync', { hideMixesEnabled: hideMixesToggle.checked });
    });
  }

  if (hidePlaylistsToggle) {
    hidePlaylistsToggle.addEventListener('change', () => {
      safeStorageSet('sync', {
        hidePlaylistsEnabled: hidePlaylistsToggle.checked,
      });
    });
  }

  if (hideLivesToggle) {
    hideLivesToggle.addEventListener('change', () => {
      safeStorageSet('sync', { hideLivesEnabled: hideLivesToggle.checked });
    });
  }

  if (thresholdSlider) {
    thresholdSlider.addEventListener('input', () => {
      const val = parseInt(thresholdSlider.value, 10);
      if (thresholdValue)
        thresholdValue.textContent = val === 0 ? 'Off' : val + '%';
      updateMiniSliderBg(thresholdSlider);
      updateMiniSliderOffState(thresholdSlider, val === 0);
    });
    thresholdSlider.addEventListener('change', () => {
      const val = parseInt(thresholdSlider.value, 10);
      safeStorageSet('sync', { hideThreshold: val });
      if (val > 0) {
        autoEnablePerPageMini(
          [
            'hideHomeEnabled',
            'hideChannelEnabled',
            'hideSearchEnabled',
            'hideSubsEnabled',
            'hideCorrEnabled',
          ],
          true,
        );
      }
    });
  }

  if (viewsSlider) {
    viewsSlider.addEventListener('input', () => {
      const idx = parseInt(viewsSlider.value, 10);
      if (viewsValue)
        viewsValue.textContent =
          idx === 0 ? 'Off' : formatMiniViews(miniViewsSteps[idx]);
      updateMiniSliderBg(viewsSlider);
      updateMiniSliderOffState(viewsSlider, idx === 0);
    });
    viewsSlider.addEventListener('change', () => {
      const idx = parseInt(viewsSlider.value, 10);
      safeStorageSet('sync', { viewsHideThreshold: miniViewsSteps[idx] });
      if (idx > 0) {
        autoEnablePerPageMini(
          [
            'viewsHideHomeEnabled',
            'viewsHideChannelEnabled',
            'viewsHideSearchEnabled',
            'viewsHideSubsEnabled',
            'viewsHideCorrEnabled',
          ],
          true,
        );
      }
    });
  }

  // Date filter handlers
  const dateNewerSlider = shadow.querySelector('#yh-p-date-newer');
  const dateNewerVal = shadow.querySelector('#yh-p-date-newer-val');
  const dateOlderSlider = shadow.querySelector('#yh-p-date-older');
  const dateOlderVal = shadow.querySelector('#yh-p-date-older-val');

  if (dateNewerSlider) {
    dateNewerSlider.addEventListener('input', () => {
      const idx = parseInt(dateNewerSlider.value, 10);
      if (dateNewerVal) dateNewerVal.textContent = miniDateNewerLabels[idx];
      updateMiniSliderBg(dateNewerSlider);
      updateMiniSliderOffState(dateNewerSlider, idx === 0);
      checkMiniDateOverlap(shadow);
    });
    dateNewerSlider.addEventListener('change', () => {
      const idx = parseInt(dateNewerSlider.value, 10);
      safeStorageSet('sync', {
        dateFilterNewerThreshold: miniDateNewerSteps[idx],
      });
      if (idx > 0) {
        autoEnablePerPageMini(
          [
            'dateFilterHomeEnabled',
            'dateFilterChannelEnabled',
            'dateFilterSearchEnabled',
            'dateFilterSubsEnabled',
            'dateFilterCorrEnabled',
          ],
          true,
        );
      }
    });
  }

  if (dateOlderSlider) {
    dateOlderSlider.addEventListener('input', () => {
      const idx = parseInt(dateOlderSlider.value, 10);
      if (dateOlderVal) dateOlderVal.textContent = miniDateLabels[idx];
      updateMiniSliderBg(dateOlderSlider);
      updateMiniSliderOffState(dateOlderSlider, idx === 0);
      checkMiniDateOverlap(shadow);
    });
    dateOlderSlider.addEventListener('change', () => {
      const idx = parseInt(dateOlderSlider.value, 10);
      safeStorageSet('sync', { dateFilterOlderThreshold: miniDateSteps[idx] });
      if (idx > 0) {
        autoEnablePerPageMini(
          [
            'dateFilterHomeEnabled',
            'dateFilterChannelEnabled',
            'dateFilterSearchEnabled',
            'dateFilterSubsEnabled',
            'dateFilterCorrEnabled',
          ],
          true,
        );
      }
    });
  }

  if (openFullBtn) {
    openFullBtn.addEventListener('click', e => {
      e.preventDefault();
      safeSendMessage({ action: 'openSettings' });
    });
  }

  if (hideButtonLink) {
    hideButtonLink.addEventListener('click', e => {
      e.preventDefault();
      safeStorageSet('sync', { floatingButtonEnabled: false });
      prefs.floatingButtonEnabled = false;
      removeFloatingButton();
    });
  }

  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      miniPanelOpen = false;
      shadow.querySelector('.yh-panel').classList.remove('open');
      shadow.querySelector('.yh-fab').classList.remove('active');
    });
  }
}

function getMiniPanelHTML() {
  const infoSvg = `<svg class="yh-info-icon" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" stroke-width="1.2"/><text x="8" y="11.5" text-anchor="middle" font-size="9" font-weight="700" fill="currentColor">?</text></svg>`;
  return `
    <div class="yh-panel-header">
      <div class="yh-panel-branding">
        <img src="${chrome.runtime.getURL('assets/icons/youtube-hider-logo.png')}" class="yh-panel-logo" />
        <span class="yh-panel-title">Youtube Hider</span>
      </div>
      <div class="yh-panel-close" id="yh-p-close">✕</div>
    </div>
    <div class="yh-panel-body">
      <div class="yh-panel-group">
        <div class="yh-panel-row">
          <div class="yh-panel-label-wrap">
            <span class="yh-panel-label">Hide Watched Videos</span>
            <span class="yh-info-wrap">${infoSvg}<span class="yh-tooltip">Hides videos you've already watched beyond the set threshold</span></span>
          </div>
        </div>
        <div class="yh-panel-slider-row">
          <span class="yh-panel-sublabel">Watch threshold</span>
          <div class="yh-panel-slider-wrap">
            <input type="range" id="yh-p-threshold" min="0" max="100" step="5" value="20" class="yh-panel-slider" />
            <span class="yh-panel-slider-val" id="yh-p-threshold-val">20%</span>
          </div>
        </div>
      </div>
      <div class="yh-panel-group">
        <label class="yh-panel-row">
          <div class="yh-panel-label-wrap">
            <span class="yh-panel-label">Hide Shorts</span>
            <span class="yh-info-wrap">${infoSvg}<span class="yh-tooltip">Removes Shorts from your YouTube feed and search results</span></span>
          </div>
          <div class="yh-toggle"><input type="checkbox" id="yh-p-hide-shorts" /><span class="yh-toggle-slider"></span></div>
        </label>
      </div>
      <div class="yh-panel-group">
        <label class="yh-panel-row">
          <div class="yh-panel-label-wrap">
            <span class="yh-panel-label">Hide Mixes</span>
            <span class="yh-info-wrap">${infoSvg}<span class="yh-tooltip">Removes Mix playlists from your YouTube feed</span></span>
          </div>
          <div class="yh-toggle"><input type="checkbox" id="yh-p-hide-mixes" /><span class="yh-toggle-slider"></span></div>
        </label>
      </div>
      <div class="yh-panel-group">
        <label class="yh-panel-row">
          <div class="yh-panel-label-wrap">
            <span class="yh-panel-label">Hide Playlists</span>
            <span class="yh-info-wrap">${infoSvg}<span class="yh-tooltip">Removes Playlists from your YouTube feed</span></span>
          </div>
          <div class="yh-toggle"><input type="checkbox" id="yh-p-hide-playlists" /><span class="yh-toggle-slider"></span></div>
        </label>
      </div>
      <div class="yh-panel-group">
        <label class="yh-panel-row">
          <div class="yh-panel-label-wrap">
            <span class="yh-panel-label">Hide Lives</span>
            <span class="yh-info-wrap">${infoSvg}<span class="yh-tooltip">Removes live streams from your YouTube feed</span></span>
          </div>
          <div class="yh-toggle"><input type="checkbox" id="yh-p-hide-lives" /><span class="yh-toggle-slider"></span></div>
        </label>
      </div>
      <div class="yh-panel-group">
        <div class="yh-panel-row">
          <div class="yh-panel-label-wrap">
            <span class="yh-panel-label">Minimum Views Filter</span>
            <span class="yh-info-wrap">${infoSvg}<span class="yh-tooltip">Hides videos with fewer views than the set minimum</span></span>
          </div>
        </div>
        <div class="yh-panel-slider-row">
          <span class="yh-panel-sublabel">Minimum views</span>
          <div class="yh-panel-slider-wrap">
            <input type="range" id="yh-p-views" min="0" max="17" step="1" value="3" class="yh-panel-slider" />
            <span class="yh-panel-slider-val" id="yh-p-views-val">1K</span>
          </div>
        </div>
      </div>
      <div class="yh-panel-group">
        <div class="yh-panel-row">
          <div class="yh-panel-label-wrap">
            <span class="yh-panel-label">Upload Date Filter</span>
            <span class="yh-info-wrap">${infoSvg}<span class="yh-tooltip">Hides videos by their upload date</span></span>
          </div>
        </div>
        <div class="yh-panel-slider-row yh-date-slider-row">
          <span class="yh-panel-sublabel">Hide newer than</span>
          <div class="yh-panel-slider-wrap">
            <input type="range" id="yh-p-date-newer" min="0" max="15" step="1" value="0" class="yh-panel-slider" />
            <span class="yh-panel-slider-val" id="yh-p-date-newer-val">Off</span>
          </div>
        </div>
        <div class="yh-panel-slider-row yh-date-slider-row">
          <span class="yh-panel-sublabel">Hide older than</span>
          <div class="yh-panel-slider-wrap">
            <input type="range" id="yh-p-date-older" min="0" max="12" step="1" value="0" class="yh-panel-slider" />
            <span class="yh-panel-slider-val" id="yh-p-date-older-val">Off</span>
          </div>
        </div>
        <div class="yh-date-overlap-warning" id="yh-p-date-overlap-warning" style="visibility: hidden;">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="12" height="12">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
          <span>Filter not active: ranges overlap</span>
        </div>
      </div>
    </div>
    <div class="yh-panel-footer">
      <a href="#" class="yh-panel-link" id="yh-p-open-full">Open full settings <svg class="yh-external-icon" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><path d="M6 3h7v7m0-7L6 10" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></a>
      <a href="#" class="yh-panel-hide-btn" id="yh-p-hide-btn"><svg class="yh-hide-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg> Hide this button</a>
    </div>
  `;
}
