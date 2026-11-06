const MANAGE_PAGE_SIZE = 50;
const MANAGE_STATUS_MS = 5000;
const MANAGE_UNDO_MS = 10000;
const MANAGE_SEARCH_DELAY_MS = 120;
const MANAGE_PREVIEW_DELAY_MS = 120;
const MANAGE_SYNC_REFRESH_MS = 300;
const MANAGE_SYNC_WARN_RATIO = 0.8;
const MANAGE_CHANNEL_SYNC_STATE_KEY = 'channelListsSyncState';
const MANAGE_MARKED_SYNC_STATE_KEY = 'markedWatchedSyncState';
const MANAGE_STRING_LIST_KEYS = ['channelWhitelist', 'channelBlacklist', 'titleWhitelist', 'titleBlacklist'];

const MANAGE_LISTS = [
  {
    id: 'marked-watched',
    kind: 'marked',
    titleKey: 'markedWatchedLabel',
    descriptionKey: 'manageMarkedDescription',
    searchKey: 'manageSearchMarked',
    emptyKey: 'manageEmptyMarked',
  },
  {
    id: 'channel-whitelist',
    kind: 'channel',
    tone: 'blue',
    storageKey: 'channelWhitelist',
    enabledKey: 'channelWhitelistEnabled',
    otherId: 'channel-blacklist',
    titleKey: 'channelWhitelistTitle',
    descriptionKey: 'channelWhitelistDescription',
    searchKey: 'manageSearchChannels',
    emptyKey: 'manageEmptyChannelWhitelist',
  },
  {
    id: 'channel-blacklist',
    kind: 'channel',
    tone: 'red',
    storageKey: 'channelBlacklist',
    enabledKey: 'channelBlacklistEnabled',
    otherId: 'channel-whitelist',
    titleKey: 'channelBlacklistTitle',
    descriptionKey: 'channelBlacklistDescription',
    searchKey: 'manageSearchChannels',
    emptyKey: 'manageEmptyChannelBlacklist',
  },
  {
    id: 'title-whitelist',
    kind: 'title',
    tone: 'blue',
    storageKey: 'titleWhitelist',
    enabledKey: 'titleWhitelistEnabled',
    otherId: 'title-blacklist',
    titleKey: 'titleWhitelistTitle',
    descriptionKey: 'titleWhitelistDescription',
    searchKey: 'manageSearchWords',
    emptyKey: 'manageEmptyTitleWhitelist',
  },
  {
    id: 'title-blacklist',
    kind: 'title',
    tone: 'red',
    storageKey: 'titleBlacklist',
    enabledKey: 'titleBlacklistEnabled',
    otherId: 'title-whitelist',
    titleKey: 'titleBlacklistTitle',
    descriptionKey: 'titleBlacklistDescription',
    searchKey: 'manageSearchWords',
    emptyKey: 'manageEmptyTitleBlacklist',
  },
];

document.addEventListener('DOMContentLoaded', () => {
  applyDocumentI18n(document);

  const listsById = Object.fromEntries(MANAGE_LISTS.map(def => [def.id, def]));
  const collator = new Intl.Collator(getUiLocale(), { sensitivity: 'base', numeric: true });
  const tabsEl = document.getElementById('manage-tabs');
  const panelsEl = document.getElementById('manage-panels');
  const panelTemplate = document.getElementById('list-panel-template');
  const snackbar = document.getElementById('manage-snackbar');
  const snackbarText = document.getElementById('manage-snackbar-text');
  const snackbarUndo = document.getElementById('manage-snackbar-undo');
  const snackbarClose = document.getElementById('manage-snackbar-close');
  const clearDialog = document.getElementById('clear-dialog');
  const clearDialogTitle = document.getElementById('clear-dialog-title');
  const clearDialogText = document.getElementById('clear-dialog-text');
  const clearDialogConfirm = document.getElementById('clear-dialog-confirm');
  const clearDialogCancel = document.getElementById('clear-dialog-cancel');
  const clearDialogExport = document.getElementById('clear-dialog-export');
  const importDialog = document.getElementById('import-dialog');
  const importSummary = document.getElementById('import-summary');
  const importConfirm = document.getElementById('import-dialog-confirm');
  const importCancel = document.getElementById('import-dialog-cancel');
  const importFile = document.getElementById('manage-import-file');

  const data = {
    'marked-watched': [],
    'channel-whitelist': [],
    'channel-blacklist': [],
    'title-whitelist': [],
    'title-blacklist': [],
  };
  const enabled = {};
  let markedMeta = {};
  let activeId = null;
  let snackbarTimer = null;
  let snackbarRemaining = 0;
  let snackbarStartedAt = 0;
  let snackbarUndoAction = null;
  let pendingClearId = null;
  let pendingImport = null;
  let loaded = false;

  const views = {};
  const tabs = {};

  function listName(def) {
    return getText(def.titleKey);
  }

  function countText(def, count) {
    const key = def.kind === 'channel' ? 'manageCountChannels' : def.kind === 'title' ? 'manageCountWords' : 'manageCountVideos';
    return getPluralText(key, count, formatLocaleNumber(count));
  }

  function formatBytes(bytes) {
    return formatLocaleNumber(bytes / 1024, {
      style: 'unit',
      unit: 'kilobyte',
      unitDisplay: 'short',
      maximumFractionDigits: bytes < 10240 ? 1 : 0,
    });
  }

  function hideSnackbar() {
    clearTimeout(snackbarTimer);
    snackbarTimer = null;
    snackbar.hidden = true;
    snackbarUndo.hidden = true;
    snackbarUndoAction = null;
  }

  function startSnackbarTimer(duration) {
    clearTimeout(snackbarTimer);
    snackbarRemaining = duration;
    snackbarStartedAt = Date.now();
    snackbarTimer = setTimeout(hideSnackbar, duration);
  }

  function pauseSnackbarTimer() {
    if (!snackbarTimer) return;
    clearTimeout(snackbarTimer);
    snackbarTimer = null;
    snackbarRemaining = Math.max(1500, snackbarRemaining - (Date.now() - snackbarStartedAt));
  }

  function resumeSnackbarTimer() {
    if (snackbar.hidden || snackbarTimer) return;
    if (snackbar.contains(document.activeElement) || snackbar.matches(':hover')) return;
    startSnackbarTimer(snackbarRemaining);
  }

  function showSnackbar(message, { undo = null, isError = false } = {}) {
    snackbarText.textContent = message;
    snackbar.classList.toggle('is-error', isError);
    snackbarUndoAction = undo;
    snackbarUndo.hidden = !undo;
    snackbar.hidden = false;
    startSnackbarTimer(undo ? MANAGE_UNDO_MS : MANAGE_STATUS_MS);
  }

  snackbar.addEventListener('mouseenter', pauseSnackbarTimer);
  snackbar.addEventListener('focusin', pauseSnackbarTimer);
  snackbar.addEventListener('mouseleave', resumeSnackbarTimer);
  snackbar.addEventListener('focusout', () => setTimeout(resumeSnackbarTimer, 0));
  snackbarClose.addEventListener('click', hideSnackbar);
  snackbarUndo.addEventListener('click', () => {
    const undo = snackbarUndoAction;
    hideSnackbar();
    focusActiveSearch();
    if (undo) undo();
  });

  function getItems(def) {
    if (def.kind === 'marked') {
      return data[def.id].map(([id, markedAt]) => {
        const info = markedMeta[id] || [];
        return { id, markedAt, title: info[0] || '', channel: info[1] || '', sortText: info[0] || id };
      });
    }
    return data[def.id].map(entry => {
      const label = def.kind === 'channel' ? formatChannelForDisplay(entry) : entry;
      return { id: entry, label, sortText: label };
    });
  }

  function searchTexts(def, item) {
    if (def.kind === 'marked') return [item.id, item.title, item.channel];
    return [item.label, item.id];
  }

  function getFilteredItems(def) {
    const view = views[def.id];
    const items = getItems(def);
    const ordered = view.sort === 'az' ? [...items].sort((a, b) => collator.compare(a.sortText, b.sortText)) : items.reverse();
    if (!view.query) return ordered;
    return ordered.filter(item => matchesListQuery(searchTexts(def, item), view.query));
  }

  function createChannelAvatar(def, item) {
    const avatar = document.createElement('span');
    avatar.className = 'item-avatar' + (def.tone === 'red' ? ' tone-red' : '');
    avatar.setAttribute('aria-hidden', 'true');
    const firstChar = item.label.replace(/^@/, '').replace(/^(channel|user)\//, '');
    avatar.textContent = firstChar ? String.fromCodePoint(firstChar.codePointAt(0)) : '?';
    return avatar;
  }

  function createWordAvatar(def) {
    const avatar = document.createElement('span');
    avatar.className = 'item-avatar' + (def.tone === 'red' ? ' tone-red' : '');
    avatar.setAttribute('aria-hidden', 'true');
    const svgNs = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNs, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    ['M4 7h16', 'M4 12h10', 'M4 17h13'].forEach(d => {
      const path = document.createElementNS(svgNs, 'path');
      path.setAttribute('d', d);
      svg.appendChild(path);
    });
    avatar.appendChild(svg);
    return avatar;
  }

  function createLink(className, href, text) {
    const link = document.createElement(href ? 'a' : 'span');
    link.className = className;
    if (href) {
      link.href = href;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
    }
    link.textContent = text;
    return link;
  }

  function buildRow(def, item) {
    const view = views[def.id];
    const row = document.createElement('li');
    row.className = 'item-row';
    row.dataset.id = item.id;
    const selected = view.selected.has(item.id);
    row.classList.toggle('is-selected', selected);

    const checkWrap = document.createElement('span');
    checkWrap.className = 'item-check-wrap';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'item-check';
    checkbox.dataset.focusRole = 'select';
    checkbox.checked = selected;
    checkWrap.appendChild(checkbox);
    row.appendChild(checkWrap);

    const main = document.createElement('div');
    main.className = 'item-main';
    let accessibleName;

    if (def.kind === 'marked') {
      const url = 'https://www.youtube.com/watch?v=' + item.id;
      const thumb = document.createElement('a');
      thumb.className = 'item-thumb';
      thumb.href = url;
      thumb.target = '_blank';
      thumb.rel = 'noopener noreferrer';
      thumb.tabIndex = -1;
      thumb.setAttribute('aria-hidden', 'true');
      const img = document.createElement('img');
      img.src = 'https://i.ytimg.com/vi/' + item.id + '/mqdefault.jpg';
      img.alt = '';
      img.loading = 'lazy';
      thumb.appendChild(img);
      row.appendChild(thumb);

      const title = createLink('item-label is-multiline', url, item.title || getText('manageTitleUnavailable'));
      title.dataset.focusRole = 'label';
      if (!item.title) title.classList.add('is-missing');
      main.appendChild(title);
      const sub = document.createElement('span');
      sub.className = 'item-sub';
      const markedOn = item.markedAt
        ? formatLocaleDate(new Date(item.markedAt * 1000), { year: 'numeric', month: 'short', day: 'numeric' })
        : '';
      sub.textContent = [item.channel, markedOn && getText('manageMarkedOn', markedOn)].filter(Boolean).join(' · ');
      main.appendChild(sub);
      accessibleName = item.title || item.id;
    } else if (def.kind === 'channel') {
      row.appendChild(createChannelAvatar(def, item));
      const url = getChannelPageUrl(item.id);
      const label = createLink('item-label', url, item.label);
      label.dataset.focusRole = 'label';
      label.title = item.label;
      main.appendChild(label);
      if (item.id.startsWith('/channel/')) {
        const sub = document.createElement('span');
        sub.className = 'item-sub';
        sub.textContent = getText('manageChannelIdLabel');
        main.appendChild(sub);
      }
      accessibleName = item.label;
    } else {
      row.appendChild(createWordAvatar(def));
      const label = createLink('item-label', null, item.label);
      label.title = item.label;
      main.appendChild(label);
      accessibleName = item.label;
    }
    row.appendChild(main);

    checkbox.setAttribute('aria-label', getText('manageSelectItem', accessibleName));

    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'manage-btn item-remove';
    remove.dataset.focusRole = 'remove';
    remove.textContent = getText('manageRemove');
    remove.setAttribute('aria-label', getText('manageRemoveItem', accessibleName));
    row.appendChild(remove);
    return row;
  }

  function setRowSelected(def, id, value) {
    const view = views[def.id];
    if (value) view.selected.add(id);
    else view.selected.delete(id);
  }

  function handleRowSelection(def, row, checked, shiftKey) {
    const view = views[def.id];
    const rows = [...view.refs.list.querySelectorAll('.item-row')];
    const index = rows.indexOf(row);
    if (shiftKey && view.anchor !== null && view.anchor < rows.length && index !== -1) {
      const [from, to] = view.anchor < index ? [view.anchor, index] : [index, view.anchor];
      rows.slice(from, to + 1).forEach(r => setRowSelected(def, r.dataset.id, checked));
    } else {
      setRowSelected(def, row.dataset.id, checked);
    }
    view.anchor = index;
    rows.forEach(r => {
      const isSelected = view.selected.has(r.dataset.id);
      r.classList.toggle('is-selected', isSelected);
      const box = r.querySelector('.item-check');
      if (box) box.checked = isSelected;
    });
    renderListHeader(def);
  }

  function renderListHeader(def) {
    const view = views[def.id];
    const refs = view.refs;
    const filtered = view.filtered || [];
    const shownIds = filtered.slice(0, view.shown).map(item => item.id);
    const selectedShown = shownIds.filter(id => view.selected.has(id)).length;
    const selectedCount = view.selected.size;
    const total = data[def.id].length;

    refs.listHeader.hidden = total === 0;
    refs.listHeader.classList.toggle('has-selection', selectedCount > 0);
    refs.selectPage.disabled = shownIds.length === 0;
    refs.selectPage.checked = shownIds.length > 0 && selectedShown === shownIds.length;
    refs.selectPage.indeterminate = selectedShown > 0 && selectedShown < shownIds.length;

    if (selectedCount > 0) {
      const allMatching = filtered.length > 0 && filtered.every(item => view.selected.has(item.id));
      refs.count.textContent = getPluralText('manageSelectedCount', selectedCount, formatLocaleNumber(selectedCount));
      const offerAll = !allMatching && selectedShown === shownIds.length && filtered.length > shownIds.length;
      refs.selectAllMatching.hidden = !offerAll;
      if (offerAll) {
        refs.selectAllMatching.textContent = getPluralText(
          'manageSelectAllMatching',
          filtered.length,
          formatLocaleNumber(filtered.length),
        );
      }
    } else {
      refs.selectAllMatching.hidden = true;
      refs.count.textContent = view.query
        ? getPluralText('manageCountMatches', filtered.length, formatLocaleNumber(filtered.length))
        : countText(def, total);
    }

    refs.selectionActions.hidden = selectedCount === 0;
    refs.removeSelected.textContent = getPluralText('manageRemoveSelected', selectedCount, formatLocaleNumber(selectedCount));
    if (def.otherId) {
      refs.moveSelected.hidden = false;
      refs.moveSelected.textContent = getText('manageMoveSelected', listName(listsById[def.otherId]));
    } else {
      refs.moveSelected.hidden = true;
    }
  }

  function captureFocus(def) {
    const active = document.activeElement;
    const row = active && active.closest ? active.closest('.item-row') : null;
    if (!row || !views[def.id].refs.list.contains(row)) return null;
    return { id: row.dataset.id, role: active.dataset.focusRole };
  }

  function restoreFocus(def, target) {
    if (!target || !target.role) return;
    const list = views[def.id].refs.list;
    const row = [...list.querySelectorAll('.item-row')].find(r => r.dataset.id === target.id);
    const el = row && row.querySelector('[data-focus-role="' + target.role + '"]');
    if (el) el.focus();
  }

  function renderPanel(def) {
    const view = views[def.id];
    const refs = view.refs;
    const total = data[def.id].length;

    const present = new Set(def.kind === 'marked' ? data[def.id].map(entry => entry[0]) : data[def.id]);
    [...view.selected].forEach(id => {
      if (!present.has(id)) view.selected.delete(id);
    });

    if (def.enabledKey) {
      const isOn = enabled[def.enabledKey] !== false;
      refs.switchInput.checked = isOn;
      refs.switchWrap.classList.toggle('is-on', isOn);
      refs.switchLabel.textContent = getText(isOn ? 'manageSwitchOn' : 'manageSwitchOff');
    }

    const focusTarget = captureFocus(def);
    view.filtered = getFilteredItems(def);
    const visible = view.filtered.slice(0, view.shown);
    refs.list.replaceChildren(...visible.map(item => buildRow(def, item)));
    restoreFocus(def, focusTarget);

    refs.toolbar.hidden = total === 0;
    refs.footer.hidden = total === 0;
    refs.clearAll.textContent = getText('manageClearAll');

    const remaining = view.filtered.length - view.shown;
    refs.loadMore.hidden = remaining <= 0;
    if (remaining > 0) {
      refs.loadMore.textContent = getPluralText('manageLoadMore', remaining, formatLocaleNumber(remaining));
    }

    if (!loaded) {
      refs.empty.hidden = true;
    } else if (total === 0) {
      refs.emptyTitle.textContent = getText('manageEmptyTitle');
      refs.emptyText.textContent = getText(def.emptyKey);
      refs.clearSearch.hidden = true;
      refs.empty.hidden = false;
    } else if (view.filtered.length === 0) {
      refs.emptyTitle.textContent = getText('manageNoMatchTitle', view.query);
      refs.emptyText.textContent = getText('manageNoMatchText');
      refs.clearSearch.hidden = false;
      refs.empty.hidden = false;
    } else {
      refs.empty.hidden = true;
    }

    renderListHeader(def);
  }

  function renderTab(def) {
    const tab = tabs[def.id];
    const count = data[def.id].length;
    tab.count.textContent = formatLocaleNumber(count);
    if (def.kind === 'marked') {
      const { text, nearLimit } = describeMarkedWatchedCount(count);
      tab.count.classList.toggle('is-near-limit', nearLimit);
      tab.button.title = text;
    } else {
      tab.button.title = countText(def, count);
    }
  }

  function renderAll() {
    MANAGE_LISTS.forEach(def => {
      renderTab(def);
      if (def.id === activeId) renderPanel(def);
    });
  }

  function focusActiveSearch() {
    const view = activeId && views[activeId];
    if (!view) return;
    const target = view.refs.toolbar.hidden ? view.refs.addInput || view.refs.panel : view.refs.search;
    if (target) target.focus();
  }

  function activate(id, { focusTab = false, updateHash = true } = {}) {
    const def = listsById[id] || MANAGE_LISTS[0];
    activeId = def.id;
    MANAGE_LISTS.forEach(other => {
      const selected = other.id === def.id;
      const tab = tabs[other.id];
      tab.button.setAttribute('aria-selected', String(selected));
      tab.button.tabIndex = selected ? 0 : -1;
      views[other.id].refs.panel.hidden = !selected;
    });
    if (focusTab) tabs[def.id].button.focus();
    if (updateHash && location.hash !== '#' + def.id) history.replaceState(null, '', '#' + def.id);
    document.title = getText('managePageTitleList', listName(def));
    renderPanel(def);
    tabs[def.id].button.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }

  function readHash() {
    const id = decodeURIComponent(location.hash.replace(/^#/, ''));
    return listsById[id] ? id : MANAGE_LISTS[0].id;
  }

  function buildTabs() {
    MANAGE_LISTS.forEach(def => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'manage-tab';
      button.id = 'tab-' + def.id;
      button.setAttribute('role', 'tab');
      button.setAttribute('aria-controls', 'panel-' + def.id);
      button.setAttribute('aria-selected', 'false');
      button.tabIndex = -1;
      const label = document.createElement('span');
      label.textContent = listName(def);
      const count = document.createElement('span');
      count.className = 'manage-tab-count';
      count.textContent = '0';
      button.appendChild(label);
      button.appendChild(count);
      button.addEventListener('click', () => activate(def.id));
      tabsEl.appendChild(button);
      tabs[def.id] = { button, count };
    });

    tabsEl.addEventListener('keydown', event => {
      const ids = MANAGE_LISTS.map(def => def.id);
      const index = ids.indexOf(activeId);
      let next = null;
      if (event.key === 'ArrowRight') next = ids[(index + 1) % ids.length];
      else if (event.key === 'ArrowLeft') next = ids[(index - 1 + ids.length) % ids.length];
      else if (event.key === 'Home') next = ids[0];
      else if (event.key === 'End') next = ids[ids.length - 1];
      if (!next) return;
      event.preventDefault();
      activate(next, { focusTab: true });
    });
  }

  function autoGrow(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight + 2, 160) + 'px';
  }

  function parseAddInput(def, text) {
    return def.kind === 'channel' ? parseChannelInput(text) : parseTitleInput(text);
  }

  function computeAddPlan(def) {
    const view = views[def.id];
    const parsed = parseAddInput(def, view.refs.addInput.value);
    const plan = planListAddition(def.kind, parsed.entries, data[def.id], def.kind === 'channel' ? data[def.otherId] : null);
    return { parsed, plan };
  }

  function renderAddPreview(def) {
    const view = views[def.id];
    const refs = view.refs;
    const { parsed, plan } = computeAddPlan(def);
    const addable = plan.add.length + plan.moved.length;
    const chips = [];
    if (plan.add.length) {
      chips.push(['is-new', getPluralText('manageAddNew', plan.add.length, formatLocaleNumber(plan.add.length))]);
    }
    if (plan.moved.length) {
      chips.push([
        'is-moving',
        getPluralText('manageAddMoving', plan.moved.length, [
          formatLocaleNumber(plan.moved.length),
          listName(listsById[def.otherId]),
        ]),
      ]);
    }
    if (plan.existing.length) {
      chips.push([
        'is-existing',
        getPluralText('manageAddExisting', plan.existing.length, formatLocaleNumber(plan.existing.length)),
      ]);
    }
    if (parsed.invalid.length) {
      chips.push([
        'is-invalid',
        getPluralText('manageAddInvalid', parsed.invalid.length, [
          formatLocaleNumber(parsed.invalid.length),
          parsed.invalid.slice(0, 3).join(', ') + (parsed.invalid.length > 3 ? ', …' : ''),
        ]),
      ]);
    }
    refs.addPreview.replaceChildren(
      ...chips.map(([className, text]) => {
        const li = document.createElement('li');
        li.className = className;
        li.textContent = text;
        li.title = text;
        return li;
      }),
    );
    refs.addInput.classList.toggle('is-invalid', parsed.invalid.length > 0 && addable === 0);
    refs.addSubmit.disabled = addable === 0;
    refs.addSubmit.textContent =
      addable > 0 ? getPluralText('manageAddButtonCount', addable, formatLocaleNumber(addable)) : getText('manageAddButton');
  }

  async function readStringLists() {
    const stored = await chrome.storage.local.get(MANAGE_STRING_LIST_KEYS);
    const lists = {};
    MANAGE_STRING_LIST_KEYS.forEach(key => {
      lists[key] = Array.isArray(stored[key]) ? stored[key].filter(entry => typeof entry === 'string') : [];
    });
    return lists;
  }

  async function writeStringLists(mutate) {
    const current = await readStringLists();
    const next = mutate({ ...current });
    const changes = {};
    Object.keys(next).forEach(key => {
      if (JSON.stringify(next[key]) !== JSON.stringify(current[key])) changes[key] = next[key];
    });
    if (Object.keys(changes).length) await chrome.storage.local.set(changes);
    MANAGE_LISTS.forEach(def => {
      if (def.storageKey && next[def.storageKey]) data[def.id] = next[def.storageKey];
    });
    renderAll();
    return { before: current, after: next };
  }

  function enableList(def) {
    if (!def.enabledKey || enabled[def.enabledKey] !== false) return;
    enabled[def.enabledKey] = true;
    chrome.storage.sync.set({ [def.enabledKey]: true });
  }

  async function addEntries(def) {
    const view = views[def.id];
    const { parsed, plan } = computeAddPlan(def);
    const entries = [...plan.add, ...plan.moved];
    if (!entries.length) return;
    const other = def.otherId && def.kind === 'channel' ? listsById[def.otherId] : null;
    let removedFromOther = [];
    await writeStringLists(lists => {
      const fresh = planListAddition(def.kind, entries, lists[def.storageKey], other ? lists[other.storageKey] : null);
      const toAdd = [...fresh.add, ...fresh.moved];
      lists[def.storageKey] = [...lists[def.storageKey], ...toAdd];
      if (other && fresh.moved.length) {
        const result = removeListEntries(def.kind, lists[other.storageKey], fresh.moved);
        lists[other.storageKey] = result.list;
        removedFromOther = result.removed;
      }
      return lists;
    });
    enableList(def);
    view.refs.addInput.value = parsed.invalid.join('\n');
    autoGrow(view.refs.addInput);
    renderAddPreview(def);
    view.refs.addInput.focus();
    showSnackbar(getPluralText('manageAdded', entries.length, [formatLocaleNumber(entries.length), listName(def)]), {
      undo: () =>
        writeStringLists(lists => {
          lists[def.storageKey] = removeListEntries(def.kind, lists[def.storageKey], entries).list;
          if (other && removedFromOther.length) {
            lists[other.storageKey] = restoreListEntries(def.kind, lists[other.storageKey], removedFromOther);
          }
          return lists;
        }).then(() => showSnackbar(getPluralText('manageRestored', entries.length, formatLocaleNumber(entries.length)))),
    });
  }

  function focusAfterRemoval(def, index) {
    const buttons = views[def.id].refs.list.querySelectorAll('.item-remove');
    const target = buttons[Math.min(index, buttons.length - 1)];
    if (target) target.focus();
    else focusActiveSearch();
  }

  async function removeStringEntries(def, ids) {
    let removed = [];
    await writeStringLists(lists => {
      const result = removeListEntries(def.kind, lists[def.storageKey], ids);
      lists[def.storageKey] = result.list;
      removed = result.removed;
      return lists;
    });
    ids.forEach(id => views[def.id].selected.delete(id));
    if (!removed.length) return;
    const count = removed.length;
    showSnackbar(getPluralText('manageRemoved', count, [formatLocaleNumber(count), listName(def)]), {
      undo: () =>
        writeStringLists(lists => {
          lists[def.storageKey] = restoreListEntries(def.kind, lists[def.storageKey], removed);
          const other = def.otherId && def.kind === 'channel' ? listsById[def.otherId] : null;
          if (other) {
            lists[other.storageKey] = removeListEntries(
              def.kind,
              lists[other.storageKey],
              removed.map(([entry]) => entry),
            ).list;
          }
          return lists;
        }).then(() => showSnackbar(getPluralText('manageRestored', count, formatLocaleNumber(count)))),
    });
    renderPanel(def);
  }

  async function moveStringEntries(def, ids) {
    const target = listsById[def.otherId];
    let removed = [];
    let added = [];
    await writeStringLists(lists => {
      const result = removeListEntries(def.kind, lists[def.storageKey], ids);
      lists[def.storageKey] = result.list;
      removed = result.removed;
      const moving = removed.map(([entry]) => entry);
      const plan = planListAddition(def.kind, moving, lists[target.storageKey], null);
      added = plan.add;
      lists[target.storageKey] = [...lists[target.storageKey], ...added];
      return lists;
    });
    ids.forEach(id => views[def.id].selected.delete(id));
    if (!removed.length) return;
    enableList(target);
    const count = removed.length;
    showSnackbar(getPluralText('manageMoved', count, [formatLocaleNumber(count), listName(target)]), {
      undo: () =>
        writeStringLists(lists => {
          lists[target.storageKey] = removeListEntries(def.kind, lists[target.storageKey], added).list;
          lists[def.storageKey] = restoreListEntries(def.kind, lists[def.storageKey], removed);
          return lists;
        }).then(() => showSnackbar(getPluralText('manageRestored', count, formatLocaleNumber(count)))),
    });
    renderPanel(def);
  }

  async function writeMarked(mutate) {
    const stored = await chrome.storage.local.get([MARKED_WATCHED_KEY, MARKED_WATCHED_META_KEY]);
    const currentList = normalizeMarkedWatched(stored[MARKED_WATCHED_KEY]);
    const currentMeta = pruneMarkedWatchedMeta(stored[MARKED_WATCHED_META_KEY], currentList);
    const result = mutate(currentList, currentMeta);
    const nextList = normalizeMarkedWatched(result.list);
    const nextMeta = pruneMarkedWatchedMeta(result.meta, nextList);
    await chrome.storage.local.set({ [MARKED_WATCHED_KEY]: nextList, [MARKED_WATCHED_META_KEY]: nextMeta });
    data['marked-watched'] = nextList;
    markedMeta = nextMeta;
    renderAll();
    return { before: currentList, beforeMeta: currentMeta, after: nextList };
  }

  async function removeMarked(def, ids) {
    const targets = new Set(ids);
    const { before, beforeMeta, after } = await writeMarked((list, meta) => ({
      list: list.filter(entry => !targets.has(entry[0])),
      meta,
    }));
    ids.forEach(id => views[def.id].selected.delete(id));
    const afterIds = new Set(after.map(entry => entry[0]));
    const removedEntries = before.filter(entry => !afterIds.has(entry[0]));
    if (!removedEntries.length) return;
    const removedMeta = {};
    removedEntries.forEach(([id]) => {
      if (beforeMeta[id]) removedMeta[id] = beforeMeta[id];
    });
    const count = removedEntries.length;
    showSnackbar(getPluralText('manageMarkedRemoved', count, formatLocaleNumber(count)), {
      undo: () =>
        writeMarked((list, meta) => ({
          list: [...list, ...removedEntries],
          meta: Object.assign({}, removedMeta, meta),
        })).then(() => showSnackbar(getPluralText('manageRestored', count, formatLocaleNumber(count)))),
    });
    renderPanel(def);
  }

  function removeItems(def, ids) {
    if (!ids.length) return Promise.resolve();
    return def.kind === 'marked' ? removeMarked(def, ids) : removeStringEntries(def, ids);
  }

  function buildPanel(def) {
    const fragment = panelTemplate.content.cloneNode(true);
    const panel = fragment.querySelector('.list-panel');
    applyDocumentI18n(panel);
    const q = role => panel.querySelector('[data-role="' + role + '"]');
    panel.id = 'panel-' + def.id;
    panel.setAttribute('aria-labelledby', 'tab-' + def.id);

    const refs = {
      panel,
      title: q('title'),
      description: q('description'),
      switchWrap: q('switch-wrap'),
      switchLabel: q('switch-label'),
      switchInput: q('switch'),
      note: q('note'),
      addForm: q('add-form'),
      addLabel: q('add-label'),
      addInput: q('add-input'),
      addSubmit: q('add-submit'),
      addHint: q('add-hint'),
      addPreview: q('add-preview'),
      toolbar: q('toolbar'),
      search: q('search'),
      sort: q('sort'),
      listHeader: q('list-header'),
      selectPage: q('select-page'),
      count: q('count'),
      selectAllMatching: q('select-all-matching'),
      selectionActions: q('selection-actions'),
      moveSelected: q('move-selected'),
      removeSelected: q('remove-selected'),
      clearSelection: q('clear-selection'),
      list: q('list'),
      empty: q('empty'),
      emptyTitle: q('empty-title'),
      emptyText: q('empty-text'),
      clearSearch: q('clear-search'),
      loadMore: q('load-more'),
      footer: q('footer'),
      clearAll: q('clear-all'),
    };
    const view = { refs, query: '', sort: 'recent', shown: MANAGE_PAGE_SIZE, selected: new Set(), anchor: null, filtered: [] };
    views[def.id] = view;

    refs.title.textContent = listName(def);
    refs.description.textContent = getText(def.descriptionKey);

    if (def.enabledKey) {
      refs.switchInput.setAttribute('aria-label', listName(def));
      refs.switchInput.addEventListener('change', () => {
        enabled[def.enabledKey] = refs.switchInput.checked;
        chrome.storage.sync.set({ [def.enabledKey]: refs.switchInput.checked });
        renderPanel(def);
      });
    } else {
      refs.switchWrap.hidden = true;
      refs.note.hidden = false;
      refs.note.textContent = getText('manageMarkedNote', getText('hideWatchedTitle'));
    }

    if (def.kind !== 'marked') {
      const inputId = 'add-input-' + def.id;
      const hintId = 'add-hint-' + def.id;
      refs.addForm.hidden = false;
      refs.addInput.id = inputId;
      refs.addLabel.htmlFor = inputId;
      refs.addHint.id = hintId;
      refs.addInput.setAttribute('aria-describedby', hintId);
      refs.addLabel.textContent = getText(def.kind === 'channel' ? 'manageAddChannelsLabel' : 'manageAddWordsLabel');
      refs.addInput.placeholder = getText(def.kind === 'channel' ? 'manageAddChannelsPlaceholder' : 'manageAddWordsPlaceholder');
      refs.addHint.textContent = getText(def.kind === 'channel' ? 'manageAddChannelsHint' : 'manageAddWordsHint');
      refs.addSubmit.textContent = getText('manageAddButton');
      let previewTimer = null;
      refs.addInput.addEventListener('input', () => {
        autoGrow(refs.addInput);
        clearTimeout(previewTimer);
        previewTimer = setTimeout(() => renderAddPreview(def), MANAGE_PREVIEW_DELAY_MS);
      });
      refs.addInput.addEventListener('keydown', event => {
        if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
          event.preventDefault();
          clearTimeout(previewTimer);
          renderAddPreview(def);
          if (!refs.addSubmit.disabled) addEntries(def);
        }
      });
      refs.addForm.addEventListener('submit', event => {
        event.preventDefault();
        addEntries(def);
      });
    }

    refs.search.placeholder = getText(def.searchKey);
    refs.search.setAttribute('aria-label', getText(def.searchKey));
    let searchTimer = null;
    refs.search.addEventListener('input', () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        view.query = refs.search.value;
        view.shown = MANAGE_PAGE_SIZE;
        view.anchor = null;
        renderPanel(def);
      }, MANAGE_SEARCH_DELAY_MS);
    });
    refs.search.addEventListener('keydown', event => {
      if (event.key === 'Escape' && refs.search.value) {
        event.preventDefault();
        refs.search.value = '';
        view.query = '';
        view.shown = MANAGE_PAGE_SIZE;
        renderPanel(def);
      }
    });

    refs.sort.addEventListener('change', () => {
      view.sort = refs.sort.value;
      view.shown = MANAGE_PAGE_SIZE;
      view.anchor = null;
      renderPanel(def);
    });

    refs.selectPage.addEventListener('change', () => {
      view.filtered.slice(0, view.shown).forEach(item => setRowSelected(def, item.id, refs.selectPage.checked));
      view.anchor = null;
      renderPanel(def);
    });

    refs.selectAllMatching.addEventListener('click', () => {
      view.filtered.forEach(item => view.selected.add(item.id));
      renderListHeader(def);
      refs.removeSelected.focus();
    });

    refs.clearSelection.addEventListener('click', () => {
      view.selected.clear();
      view.anchor = null;
      renderPanel(def);
      refs.selectPage.focus();
    });

    refs.removeSelected.addEventListener('click', () => {
      removeItems(def, [...view.selected]).then(() => refs.selectPage.focus());
    });

    refs.moveSelected.addEventListener('click', () => {
      if (!def.otherId) return;
      moveStringEntries(def, [...view.selected]).then(() => refs.selectPage.focus());
    });

    refs.list.addEventListener('click', event => {
      const row = event.target.closest('.item-row');
      if (!row) return;
      const removeBtn = event.target.closest('.item-remove');
      if (removeBtn) {
        const index = [...refs.list.querySelectorAll('.item-row')].indexOf(row);
        removeItems(def, [row.dataset.id]).then(() => focusAfterRemoval(def, index));
        return;
      }
      if (event.target.closest('a')) return;
      const checkbox = row.querySelector('.item-check');
      if (event.target === checkbox) {
        handleRowSelection(def, row, checkbox.checked, event.shiftKey);
        return;
      }
      if (window.getSelection && String(window.getSelection()).length) return;
      handleRowSelection(def, row, !checkbox.checked, event.shiftKey);
    });

    refs.clearSearch.addEventListener('click', () => {
      refs.search.value = '';
      view.query = '';
      view.shown = MANAGE_PAGE_SIZE;
      renderPanel(def);
      refs.search.focus();
    });

    refs.loadMore.addEventListener('click', () => {
      const firstNew = refs.list.querySelectorAll('.item-row').length;
      view.shown += MANAGE_PAGE_SIZE;
      renderPanel(def);
      const next = refs.list.querySelectorAll('.item-row .item-check')[firstNew];
      if (next) next.focus();
    });

    refs.clearAll.addEventListener('click', () => openClearDialog(def));

    panelsEl.appendChild(fragment);
  }

  function openClearDialog(def) {
    const count = data[def.id].length;
    if (!count) return;
    pendingClearId = def.id;
    clearDialogTitle.textContent = getText('manageClearTitle', listName(def));
    clearDialogText.textContent = getPluralText('manageClearText', count, [formatLocaleNumber(count), listName(def)]);
    clearDialogConfirm.textContent = getPluralText('manageClearConfirm', count, formatLocaleNumber(count));
    clearDialog.showModal();
    clearDialogCancel.focus();
  }

  clearDialogCancel.addEventListener('click', () => clearDialog.close());
  clearDialogExport.addEventListener('click', () => exportLists());
  clearDialogConfirm.addEventListener('click', () => {
    const def = listsById[pendingClearId];
    clearDialog.close();
    if (!def) return;
    const ids = def.kind === 'marked' ? data[def.id].map(entry => entry[0]) : [...data[def.id]];
    removeItems(def, ids).then(focusActiveSearch);
  });
  clearDialog.addEventListener('close', () => {
    pendingClearId = null;
  });

  function exportLists() {
    const payload = {
      format: LIST_EXPORT_FORMAT,
      version: 1,
      exportedAt: new Date().toISOString(),
      channelWhitelist: data['channel-whitelist'],
      channelBlacklist: data['channel-blacklist'],
      titleWhitelist: data['title-whitelist'],
      titleBlacklist: data['title-blacklist'],
      markedWatched: data['marked-watched'].map(([id, markedAt]) => {
        const info = markedMeta[id] || [];
        return { id, markedAt, title: info[0] || '', channel: info[1] || '' };
      }),
    };
    const total = MANAGE_LISTS.reduce((sum, def) => sum + data[def.id].length, 0);
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'youtube-hider-lists-' + new Date().toISOString().slice(0, 10) + '.json';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showSnackbar(getPluralText('manageExported', total, formatLocaleNumber(total)));
  }

  function buildImportPlan(imported) {
    const rows = [];
    MANAGE_LISTS.forEach(def => {
      if (def.kind === 'marked') {
        const present = new Set(data[def.id].map(entry => entry[0]));
        const incoming = imported.markedWatched.list;
        const fresh = incoming.filter(entry => !present.has(entry[0]));
        rows.push({ def, add: fresh.length, existing: incoming.length - fresh.length, other: 0 });
        return;
      }
      const incoming = imported[def.storageKey];
      const plan = planListAddition(def.kind, incoming, data[def.id], def.kind === 'channel' ? data[def.otherId] : null);
      rows.push({ def, add: plan.add.length, existing: plan.existing.length, other: plan.moved.length });
    });
    return rows;
  }

  function renderImportSummary(rows) {
    importSummary.replaceChildren(
      ...rows
        .filter(row => row.add || row.existing || row.other)
        .map(row => {
          const li = document.createElement('li');
          const name = document.createElement('span');
          name.className = 'import-summary-name';
          name.textContent = listName(row.def);
          const detail = document.createElement('span');
          detail.className = 'import-summary-detail';
          const strong = document.createElement('strong');
          strong.textContent = getPluralText('manageAddNew', row.add, formatLocaleNumber(row.add));
          detail.appendChild(strong);
          const extras = [];
          if (row.existing) extras.push(getPluralText('manageAddExisting', row.existing, formatLocaleNumber(row.existing)));
          if (row.other) {
            extras.push(
              getPluralText('manageImportSkippedOther', row.other, [
                formatLocaleNumber(row.other),
                listName(listsById[row.def.otherId]),
              ]),
            );
          }
          if (extras.length) detail.appendChild(document.createTextNode(' · ' + extras.join(' · ')));
          li.appendChild(name);
          li.appendChild(detail);
          return li;
        }),
    );
  }

  async function applyImport(imported) {
    let added = 0;
    await writeStringLists(lists => {
      MANAGE_LISTS.forEach(def => {
        if (def.kind === 'marked') return;
        const other = def.kind === 'channel' ? listsById[def.otherId] : null;
        const plan = planListAddition(def.kind, imported[def.storageKey], lists[def.storageKey], other ? lists[other.storageKey] : null);
        lists[def.storageKey] = [...lists[def.storageKey], ...plan.add];
        added += plan.add.length;
      });
      return lists;
    });
    let markedFull = false;
    if (imported.markedWatched.list.length) {
      const { before, after } = await writeMarked((list, meta) => {
        const nextMeta = Object.assign({}, imported.markedWatched.meta, meta);
        Object.keys(imported.markedWatched.meta).forEach(id => {
          if (!nextMeta[id] || !nextMeta[id][0]) nextMeta[id] = imported.markedWatched.meta[id];
        });
        return { list: [...list, ...imported.markedWatched.list], meta: nextMeta };
      });
      const beforeIds = new Set(before.map(entry => entry[0]));
      added += after.filter(entry => !beforeIds.has(entry[0])).length;
      markedFull =
        before.length + imported.markedWatched.list.length > MARKED_WATCHED_LIMIT && after.length === MARKED_WATCHED_LIMIT;
    }
    let message = getPluralText('manageImported', added, formatLocaleNumber(added));
    if (markedFull) message += ' ' + getText('manageImportListFull');
    showSnackbar(message);
  }

  function startImport(file) {
    file
      .text()
      .then(text => {
        const imported = parseListsImport(JSON.parse(text));
        const rows = buildImportPlan(imported);
        const total = rows.reduce((sum, row) => sum + row.add, 0);
        if (!total) {
          showSnackbar(getText('manageImportNothing'));
          return;
        }
        pendingImport = imported;
        renderImportSummary(rows);
        importConfirm.textContent = getPluralText('manageImportConfirm', total, formatLocaleNumber(total));
        importDialog.showModal();
        importConfirm.focus();
      })
      .catch(() => showSnackbar(getText('manageImportError'), { isError: true }))
      .finally(() => {
        importFile.value = '';
      });
  }

  importCancel.addEventListener('click', () => importDialog.close());
  importConfirm.addEventListener('click', () => {
    const imported = pendingImport;
    importDialog.close();
    if (imported) applyImport(imported);
  });
  importDialog.addEventListener('close', () => {
    pendingImport = null;
  });

  document.getElementById('manage-export').addEventListener('click', exportLists);
  document.getElementById('manage-import').addEventListener('click', () => importFile.click());
  importFile.addEventListener('change', () => {
    const file = importFile.files && importFile.files[0];
    if (file) startImport(file);
  });

  const syncPanel = document.getElementById('sync-panel');
  const syncHeadline = document.getElementById('sync-headline');
  const syncRoom = document.getElementById('sync-room');
  const syncMeter = document.getElementById('sync-meter');
  const syncMeterFill = document.getElementById('sync-meter-fill');
  const syncMessage = document.getElementById('sync-message');
  let syncRefreshTimer = null;

  function countListEntries() {
    return MANAGE_LISTS.filter(def => def.storageKey).reduce((sum, def) => sum + data[def.id].length, 0);
  }

  function describeSyncState(listState, markedState, ratio) {
    if (listState.status === 'outdated' || markedState.status === 'outdated') {
      return { tone: 'is-error', headline: 'manageSyncHeadlineOutdated', message: 'manageSyncMessageOutdated' };
    }
    if (listState.status === 'paused') {
      return { tone: 'is-warning', headline: 'manageSyncHeadlinePaused', message: 'manageSyncMessageListsPaused' };
    }
    if (markedState.status === 'paused') {
      return { tone: 'is-warning', headline: 'manageSyncHeadlineMarkedPaused', message: 'manageSyncMessageMarkedPaused' };
    }
    if (listState.status === 'error' || markedState.status === 'error') {
      return { tone: '', headline: 'manageSyncHeadlineRetrying', message: null };
    }
    if (ratio >= MANAGE_SYNC_WARN_RATIO) {
      return { tone: 'is-warning', headline: 'manageSyncHeadlineAlmostFull', message: 'manageSyncMessageNearFull', meter: true };
    }
    if (listState.status === 'pending' || markedState.status === 'pending') {
      return { tone: '', headline: 'manageSyncHeadlineSyncing', message: null };
    }
    return { tone: '', headline: 'manageSyncHeadlineOk', message: null };
  }

  async function refreshSyncPanel() {
    const [items, local] = await Promise.all([
      chrome.storage.sync.get(null),
      chrome.storage.local.get([MANAGE_CHANNEL_SYNC_STATE_KEY, MANAGE_MARKED_SYNC_STATE_KEY]),
    ]);
    let listBytes = 0;
    let settingsBytes = 0;
    Object.entries(items || {}).forEach(([key, value]) => {
      if (isChannelListSyncKey(key)) listBytes += getSyncItemBytes(key, value);
      else if (!isMarkedWatchedSyncKey(key)) settingsBytes += getSyncItemBytes(key, value);
    });
    const budget = Math.max(1, SYNC_QUOTA_BYTES - SYNC_RESERVED_BYTES - settingsBytes);
    const ratio = Math.min(1, listBytes / budget);
    const listState = (local && local[MANAGE_CHANNEL_SYNC_STATE_KEY]) || {};
    const markedState = (local && local[MANAGE_MARKED_SYNC_STATE_KEY]) || {};
    const state = describeSyncState(listState, markedState, ratio);

    syncPanel.classList.toggle('is-warning', state.tone === 'is-warning');
    syncPanel.classList.toggle('is-error', state.tone === 'is-error');
    syncHeadline.textContent = getText(state.headline);
    syncMessage.hidden = !state.message;
    if (state.message) syncMessage.textContent = getText(state.message);

    syncMeter.hidden = !state.meter;
    const entries = countListEntries();
    const room = state.meter && entries > 0 ? Math.max(0, Math.floor(((budget - listBytes) / listBytes) * entries)) : 0;
    syncRoom.hidden = !state.meter || entries === 0;
    if (state.meter) {
      const percent = Math.round(ratio * 100);
      syncMeterFill.style.width = percent + '%';
      syncMeter.setAttribute('aria-valuenow', String(percent));
      syncMeter.setAttribute('aria-valuetext', getText('manageSyncMeterText', String(percent)));
      if (entries > 0) {
        const rounded = room >= 1000 ? Math.floor(room / 100) * 100 : room >= 100 ? Math.floor(room / 10) * 10 : room;
        syncRoom.textContent = getPluralText('manageSyncRoomLeft', rounded, formatLocaleNumber(rounded));
      }
    }
  }

  function scheduleSyncRefresh() {
    clearTimeout(syncRefreshTimer);
    syncRefreshTimer = setTimeout(() => {
      refreshSyncPanel().catch(() => {});
    }, MANAGE_SYNC_REFRESH_MS);
  }

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync') {
      let enabledChanged = false;
      MANAGE_LISTS.forEach(def => {
        if (def.enabledKey && changes[def.enabledKey]) {
          enabled[def.enabledKey] = changes[def.enabledKey].newValue !== false;
          enabledChanged = true;
        }
      });
      if (enabledChanged && activeId) renderPanel(listsById[activeId]);
      scheduleSyncRefresh();
      return;
    }
    if (area !== 'local') return;
    let changed = false;
    MANAGE_LISTS.forEach(def => {
      if (def.storageKey && changes[def.storageKey]) {
        const value = changes[def.storageKey].newValue;
        data[def.id] = Array.isArray(value) ? value.filter(entry => typeof entry === 'string') : [];
        changed = true;
      }
    });
    if (changes[MARKED_WATCHED_KEY]) {
      data['marked-watched'] = normalizeMarkedWatched(changes[MARKED_WATCHED_KEY].newValue);
      changed = true;
    }
    if (changes[MARKED_WATCHED_META_KEY]) {
      markedMeta = changes[MARKED_WATCHED_META_KEY].newValue || {};
      changed = true;
    }
    if (changes[MANAGE_CHANNEL_SYNC_STATE_KEY] || changes[MANAGE_MARKED_SYNC_STATE_KEY]) scheduleSyncRefresh();
    if (changed) {
      renderAll();
      if (activeId && views[activeId].refs.addInput && views[activeId].refs.addInput.value) {
        renderAddPreview(listsById[activeId]);
      }
    }
  });

  window.addEventListener('hashchange', () => activate(readHash(), { updateHash: false }));

  buildTabs();
  MANAGE_LISTS.forEach(buildPanel);
  activate(readHash());

  Promise.all([
    chrome.storage.local.get([...MANAGE_STRING_LIST_KEYS, MARKED_WATCHED_KEY, MARKED_WATCHED_META_KEY]),
    chrome.storage.sync.get(MANAGE_LISTS.filter(def => def.enabledKey).map(def => def.enabledKey)),
  ]).then(([local, sync]) => {
    MANAGE_LISTS.forEach(def => {
      if (def.storageKey) {
        const value = local[def.storageKey];
        data[def.id] = Array.isArray(value) ? value.filter(entry => typeof entry === 'string') : [];
      }
      if (def.enabledKey) enabled[def.enabledKey] = sync[def.enabledKey] !== false;
    });
    data['marked-watched'] = normalizeMarkedWatched(local[MARKED_WATCHED_KEY]);
    markedMeta = local[MARKED_WATCHED_META_KEY] || {};
    loaded = true;
    renderAll();
    scheduleSyncRefresh();
  });

  refreshSyncPanel().catch(() => {});
});
