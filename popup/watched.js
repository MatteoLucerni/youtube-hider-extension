const WATCHED_PAGE_SIZE = 50;
const WATCHED_SYNC_STATE_KEY = 'markedWatchedSyncState';
const WATCHED_EXPORT_FORMAT = 'youtube-hider-marked-watched';
const WATCHED_EXPORT_VERSION = 1;
const WATCHED_STATUS_MS = 5000;
const WATCHED_UNDO_STATUS_MS = 10000;

document.addEventListener('DOMContentLoaded', () => {
  const countEl = document.getElementById('watched-count');
  const syncWarning = document.getElementById('watched-sync-warning');
  const searchInput = document.getElementById('watched-search');
  const exportBtn = document.getElementById('watched-export');
  const importBtn = document.getElementById('watched-import');
  const importFile = document.getElementById('watched-import-file');
  const clearBtn = document.getElementById('watched-clear');
  const statusEl = document.getElementById('watched-status');
  const statusText = document.getElementById('watched-status-text');
  const statusUndo = document.getElementById('watched-status-undo');
  const selectionBar = document.getElementById('watched-selection-bar');
  const selectAll = document.getElementById('watched-select-all');
  const removeSelectedBtn = document.getElementById('watched-remove-selected');
  const listEl = document.getElementById('watched-list');
  const emptyEl = document.getElementById('watched-empty');
  const emptyText = document.getElementById('watched-empty-text');
  const clearSearchBtn = document.getElementById('watched-clear-search');
  const loadMoreBtn = document.getElementById('watched-load-more');

  let entries = [];
  let meta = {};
  let shown = WATCHED_PAGE_SIZE;
  const selected = new Set();
  let statusTimer = null;
  let undoAction = null;

  function formatDate(seconds) {
    if (!seconds) return '';
    return new Date(seconds * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  function hideStatus() {
    clearTimeout(statusTimer);
    statusEl.hidden = true;
    statusUndo.hidden = true;
    undoAction = null;
  }

  function showStatus(message, { isError = false, undo = null } = {}) {
    clearTimeout(statusTimer);
    statusText.textContent = message;
    statusEl.classList.toggle('is-error', isError);
    undoAction = undo;
    statusUndo.hidden = !undo;
    statusEl.hidden = false;
    statusTimer = setTimeout(hideStatus, undo ? WATCHED_UNDO_STATUS_MS : WATCHED_STATUS_MS);
  }

  function getFilteredEntries() {
    const query = searchInput.value.replace(/\s+/g, ' ').trim().toLowerCase();
    const newestFirst = [...entries].reverse();
    if (!query) return newestFirst;
    return newestFirst.filter(([id]) => {
      const info = meta[id] || [];
      return (
        id.toLowerCase().includes(query) ||
        String(info[0] || '').toLowerCase().includes(query) ||
        String(info[1] || '').toLowerCase().includes(query)
      );
    });
  }

  function buildItem([id, markedAt]) {
    const info = meta[id] || [];
    const title = info[0] || '';
    const channel = info[1] || '';
    const url = 'https://www.youtube.com/watch?v=' + id;

    const item = document.createElement('li');
    item.className = 'watched-item';
    item.dataset.videoId = id;

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.dataset.focusRole = 'select';
    checkbox.checked = selected.has(id);
    checkbox.setAttribute('aria-label', 'Select ' + (title || id));
    checkbox.addEventListener('change', () => {
      if (checkbox.checked) selected.add(id);
      else selected.delete(id);
      renderSelectionState();
    });

    const thumb = document.createElement('a');
    thumb.className = 'watched-thumb';
    thumb.href = url;
    thumb.target = '_blank';
    thumb.rel = 'noopener noreferrer';
    thumb.tabIndex = -1;
    const img = document.createElement('img');
    img.src = 'https://i.ytimg.com/vi/' + id + '/mqdefault.jpg';
    img.alt = '';
    img.loading = 'lazy';
    thumb.appendChild(img);

    const infoEl = document.createElement('div');
    infoEl.className = 'watched-info';
    const titleEl = document.createElement('a');
    titleEl.className = 'watched-item-title';
    titleEl.dataset.focusRole = 'title';
    titleEl.href = url;
    titleEl.target = '_blank';
    titleEl.rel = 'noopener noreferrer';
    if (title) {
      titleEl.textContent = title;
    } else {
      titleEl.textContent = 'Title not available on this device';
      titleEl.classList.add('is-missing');
    }
    const metaEl = document.createElement('span');
    metaEl.className = 'watched-item-meta';
    const markedOn = formatDate(markedAt);
    metaEl.textContent = [channel, markedOn && 'Marked ' + markedOn, id].filter(Boolean).join(' · ');
    infoEl.appendChild(titleEl);
    infoEl.appendChild(metaEl);

    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'watched-remove';
    remove.dataset.focusRole = 'remove';
    remove.textContent = 'Remove';
    remove.setAttribute('aria-label', 'Remove ' + (title || id));
    remove.addEventListener('click', () => {
      const rows = [...listEl.querySelectorAll('.watched-item')];
      const index = rows.indexOf(item);
      removeVideos([id]).then(() => focusRowAfterRemoval(index));
    });

    item.appendChild(checkbox);
    item.appendChild(thumb);
    item.appendChild(infoEl);
    item.appendChild(remove);
    return item;
  }

  function focusRowAfterRemoval(index) {
    const rows = listEl.querySelectorAll('.watched-item .watched-remove');
    const target = rows[Math.min(index, rows.length - 1)];
    if (target) target.focus();
    else searchInput.focus();
  }

  function renderSelectionState() {
    const visibleIds = [...listEl.querySelectorAll('.watched-item')].map(el => el.dataset.videoId);
    const selectedVisible = visibleIds.filter(id => selected.has(id));
    selectAll.disabled = visibleIds.length === 0;
    selectAll.checked = visibleIds.length > 0 && selectedVisible.length === visibleIds.length;
    selectAll.indeterminate = selectedVisible.length > 0 && selectedVisible.length < visibleIds.length;
    removeSelectedBtn.disabled = selected.size === 0;
    removeSelectedBtn.textContent = selected.size
      ? 'Remove selected (' + selected.size.toLocaleString('en-US') + ')'
      : 'Remove selected';
    selectionBar.hidden = visibleIds.length === 0 && selected.size === 0;
  }

  function render() {
    const total = entries.length;
    const { text, nearLimit } = describeMarkedWatchedCount(total);
    countEl.textContent = text;
    countEl.classList.toggle('is-near-limit', nearLimit);

    const present = new Set(entries.map(entry => entry[0]));
    [...selected].forEach(id => {
      if (!present.has(id)) selected.delete(id);
    });

    const active = document.activeElement;
    const activeRow = active && active.closest ? active.closest('.watched-item') : null;
    const focusTarget = activeRow ? { id: activeRow.dataset.videoId, role: active.dataset.focusRole } : null;

    const filtered = getFilteredEntries();
    const visible = filtered.slice(0, shown);
    listEl.replaceChildren(...visible.map(buildItem));

    if (focusTarget && focusTarget.role) {
      const row = listEl.querySelector('.watched-item[data-video-id="' + focusTarget.id + '"]');
      const el = row && row.querySelector('[data-focus-role="' + focusTarget.role + '"]');
      if (el) el.focus();
    }

    exportBtn.disabled = total === 0;
    clearBtn.disabled = total === 0;
    searchInput.disabled = total === 0 && !searchInput.value;
    loadMoreBtn.hidden = filtered.length <= shown;
    if (!loadMoreBtn.hidden) {
      loadMoreBtn.textContent = 'Load more (' + (filtered.length - shown).toLocaleString('en-US') + ' left)';
    }

    if (total === 0) {
      emptyText.textContent =
        'No videos marked yet. On YouTube, hover a video and click Watched to add it here.';
      clearSearchBtn.hidden = true;
      emptyEl.hidden = false;
    } else if (filtered.length === 0) {
      emptyText.textContent = 'No marked videos match "' + searchInput.value.trim() + '".';
      clearSearchBtn.hidden = false;
      emptyEl.hidden = false;
    } else {
      emptyEl.hidden = true;
    }

    renderSelectionState();
  }

  function renderSyncWarning(syncState) {
    syncWarning.hidden = !(syncState && syncState.status === 'paused');
  }

  function writeMarkedWatched(mutate) {
    return chrome.storage.local
      .get([MARKED_WATCHED_KEY, MARKED_WATCHED_META_KEY])
      .then(stored => {
        const currentList = normalizeMarkedWatched(stored[MARKED_WATCHED_KEY]);
        const currentMeta = pruneMarkedWatchedMeta(stored[MARKED_WATCHED_META_KEY], currentList);
        const result = mutate(currentList, currentMeta);
        const nextList = normalizeMarkedWatched(result.list);
        const nextMeta = pruneMarkedWatchedMeta(result.meta, nextList);
        return chrome.storage.local
          .set({ [MARKED_WATCHED_KEY]: nextList, [MARKED_WATCHED_META_KEY]: nextMeta })
          .then(() => {
            entries = nextList;
            meta = nextMeta;
            render();
            return { before: currentList, beforeMeta: currentMeta, after: nextList };
          });
      });
  }

  function restoreVideos(removedEntries, removedMeta) {
    return writeMarkedWatched((list, currentMeta) => ({
      list: [...list, ...removedEntries],
      meta: Object.assign({}, removedMeta, currentMeta),
    })).then(({ before, after }) => {
      const beforeIds = new Set(before.map(entry => entry[0]));
      const restored = after.filter(entry => !beforeIds.has(entry[0])).length;
      showStatus(restored === 1 ? 'Restored 1 video.' : 'Restored ' + restored + ' videos.');
    });
  }

  function removeVideos(ids) {
    const targets = new Set(ids);
    return writeMarkedWatched((list, currentMeta) => ({
      list: list.filter(entry => !targets.has(entry[0])),
      meta: currentMeta,
    })).then(({ before, beforeMeta, after }) => {
      ids.forEach(id => selected.delete(id));
      const afterIds = new Set(after.map(entry => entry[0]));
      const removedEntries = before.filter(entry => !afterIds.has(entry[0]));
      const removedMeta = {};
      removedEntries.forEach(([id]) => {
        if (beforeMeta[id]) removedMeta[id] = beforeMeta[id];
      });
      if (!removedEntries.length) return;
      const count = removedEntries.length;
      const message =
        count === 1
          ? 'Removed 1 video. It shows up on YouTube again.'
          : 'Removed ' + count.toLocaleString('en-US') + ' videos. They show up on YouTube again.';
      showStatus(message, { undo: () => restoreVideos(removedEntries, removedMeta) });
    });
  }

  function exportVideos() {
    const payload = {
      format: WATCHED_EXPORT_FORMAT,
      version: WATCHED_EXPORT_VERSION,
      exportedAt: new Date().toISOString(),
      videos: entries.map(([id, markedAt]) => {
        const info = meta[id] || [];
        return { id, markedAt, title: info[0] || '', channel: info[1] || '' };
      }),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'youtube-hider-marked-watched-' + new Date().toISOString().slice(0, 10) + '.json';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showStatus(
      'Exported ' + (entries.length === 1 ? '1 video' : entries.length.toLocaleString('en-US') + ' videos') + '.',
    );
  }

  function parseImport(text) {
    const data = JSON.parse(text);
    const videos = Array.isArray(data) ? data : data && Array.isArray(data.videos) ? data.videos : null;
    if (!videos) throw new Error('unrecognized');
    const now = Math.floor(Date.now() / 1000);
    const list = [];
    const importedMeta = {};
    videos.forEach(video => {
      const id = typeof video === 'string' ? video : video && video.id;
      if (!isValidVideoId(id)) return;
      const markedAt = video && Number.isFinite(video.markedAt) ? video.markedAt : now;
      list.push([id, markedAt]);
      if (video && (video.title || video.channel)) {
        importedMeta[id] = normalizeMarkedWatchedMetaEntry(video.title, video.channel);
      }
    });
    return { list, meta: importedMeta };
  }

  function importVideos(file) {
    file
      .text()
      .then(text => {
        const imported = parseImport(text);
        if (!imported.list.length) {
          showStatus('No valid videos found in that file.', { isError: true });
          return null;
        }
        return writeMarkedWatched((list, currentMeta) => {
          const nextMeta = Object.assign({}, imported.meta, currentMeta);
          Object.keys(imported.meta).forEach(id => {
            if (!nextMeta[id] || !nextMeta[id][0]) nextMeta[id] = imported.meta[id];
          });
          return { list: [...list, ...imported.list], meta: nextMeta };
        }).then(({ before, after }) => {
          const beforeIds = new Set(before.map(entry => entry[0]));
          const added = after.filter(entry => !beforeIds.has(entry[0])).length;
          let message = added === 1 ? 'Imported 1 new video.' : 'Imported ' + added + ' new videos.';
          if (before.length + imported.list.length > MARKED_WATCHED_LIMIT && after.length === MARKED_WATCHED_LIMIT) {
            message += ' The list is full, so the oldest marks were dropped.';
          }
          showStatus(message);
        });
      })
      .catch(() => {
        showStatus('That file could not be read as a YouTube Hider export.', { isError: true });
      })
      .finally(() => {
        importFile.value = '';
      });
  }

  searchInput.addEventListener('input', () => {
    shown = WATCHED_PAGE_SIZE;
    render();
  });

  clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    shown = WATCHED_PAGE_SIZE;
    render();
    searchInput.focus();
  });

  loadMoreBtn.addEventListener('click', () => {
    const firstNew = listEl.querySelectorAll('.watched-item').length;
    shown += WATCHED_PAGE_SIZE;
    render();
    const next = listEl.querySelectorAll('.watched-item .watched-item-title')[firstNew];
    if (next) next.focus();
  });

  selectAll.addEventListener('change', () => {
    listEl.querySelectorAll('.watched-item').forEach(item => {
      if (selectAll.checked) selected.add(item.dataset.videoId);
      else selected.delete(item.dataset.videoId);
    });
    render();
  });

  removeSelectedBtn.addEventListener('click', () => {
    if (!selected.size) return;
    removeVideos([...selected]);
  });

  clearBtn.addEventListener('click', () => {
    if (!entries.length) return;
    const confirmed = window.confirm(
      'Remove all ' + entries.length.toLocaleString('en-US') + ' marked videos? They will show up on YouTube again.',
    );
    if (!confirmed) return;
    removeVideos(entries.map(entry => entry[0]));
  });

  statusUndo.addEventListener('click', () => {
    const undo = undoAction;
    hideStatus();
    searchInput.focus();
    if (undo) undo();
  });

  exportBtn.addEventListener('click', exportVideos);

  importBtn.addEventListener('click', () => importFile.click());

  importFile.addEventListener('change', () => {
    const file = importFile.files && importFile.files[0];
    if (file) importVideos(file);
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    let changed = false;
    if (changes[MARKED_WATCHED_KEY]) {
      entries = normalizeMarkedWatched(changes[MARKED_WATCHED_KEY].newValue);
      changed = true;
    }
    if (changes[MARKED_WATCHED_META_KEY]) {
      meta = changes[MARKED_WATCHED_META_KEY].newValue || {};
      changed = true;
    }
    if (changes[WATCHED_SYNC_STATE_KEY]) {
      renderSyncWarning(changes[WATCHED_SYNC_STATE_KEY].newValue);
    }
    if (changed) render();
  });

  chrome.storage.local.get([MARKED_WATCHED_KEY, MARKED_WATCHED_META_KEY, WATCHED_SYNC_STATE_KEY], stored => {
    entries = normalizeMarkedWatched(stored[MARKED_WATCHED_KEY]);
    meta = stored[MARKED_WATCHED_META_KEY] || {};
    renderSyncWarning(stored[WATCHED_SYNC_STATE_KEY]);
    render();
  });
});
