(function () {
  const ATTR = 'data-yt-hider-channel-cache';
  const CHANNEL_ID_ATTR = 'data-yt-hider-channelid-cache';
  const cache = {};
  const channelIdCache = {};
  let cacheDirty = false;
  let channelIdCacheDirty = false;

  function extractHandleFromUrlish(value) {
    if (!value) return null;
    const match = String(value).match(/(\/@[^/?#]+)/);
    return match ? match[1].toLowerCase() : null;
  }

  function rememberChannelIdentity(id, handle) {
    if (!id || !handle) return;
    const key = ('/channel/' + id).toLowerCase();
    if (channelIdCache[key] !== handle) {
      channelIdCache[key] = handle;
      channelIdCacheDirty = true;
    }
  }

  function browseToHandle(browse) {
    if (!browse) return null;
    const handle = browse.canonicalBaseUrl ? String(browse.canonicalBaseUrl).toLowerCase() : null;
    if (handle && browse.browseId) rememberChannelIdentity(browse.browseId, handle);
    if (handle) return handle;
    if (browse.browseId) return ('/channel/' + browse.browseId).toLowerCase();
    return null;
  }

  function browseEndpointFromListItem(liv) {
    return (
      (liv.rendererContext &&
        liv.rendererContext.commandContext &&
        liv.rendererContext.commandContext.onTap &&
        liv.rendererContext.commandContext.onTap.innertubeCommand &&
        liv.rendererContext.commandContext.onTap.innertubeCommand.browseEndpoint) ||
      (liv.leadingAccessory &&
        liv.leadingAccessory.avatarViewModel &&
        liv.leadingAccessory.avatarViewModel.endpoint &&
        liv.leadingAccessory.avatarViewModel.endpoint.innertubeCommand &&
        liv.leadingAccessory.avatarViewModel.endpoint.innertubeCommand.browseEndpoint) ||
      (liv.title &&
        Array.isArray(liv.title.commandRuns) &&
        liv.title.commandRuns[0] &&
        liv.title.commandRuns[0].onTap &&
        liv.title.commandRuns[0].onTap.innertubeCommand &&
        liv.title.commandRuns[0].onTap.innertubeCommand.browseEndpoint) ||
      null
    );
  }

  function handlesFromCollaboratorListItems(listItems) {
    if (!Array.isArray(listItems)) return [];
    const handles = [];
    for (const item of listItems) {
      const liv = item && item.listItemViewModel;
      if (!liv) continue;
      const subtitleText = liv.subtitle && liv.subtitle.content;
      const subtitleMatch = typeof subtitleText === 'string' && subtitleText.match(/@([A-Za-z0-9._-]+)/);
      const handle = subtitleMatch ? ('/@' + subtitleMatch[1].toLowerCase()) : browseToHandle(browseEndpointFromListItem(liv));
      if (handle && !handles.includes(handle)) handles.push(handle);
    }
    return handles;
  }

  function handleFromLockup(lockup) {
    try {
      const mvm = lockup && lockup.metadata && lockup.metadata.lockupMetadataViewModel;
      if (!mvm) return null;

      const imageAvatar = mvm.image && mvm.image.decoratedAvatarViewModel;
      if (imageAvatar) {
        const browse =
          imageAvatar.rendererContext &&
          imageAvatar.rendererContext.commandContext &&
          imageAvatar.rendererContext.commandContext.onTap &&
          imageAvatar.rendererContext.commandContext.onTap.innertubeCommand &&
          imageAvatar.rendererContext.commandContext.onTap.innertubeCommand.browseEndpoint;
        const handle = browseToHandle(browse);
        if (handle) return handle;
      }

      const legacyAvatar =
        mvm.avatar &&
        mvm.avatar.decoratedAvatarViewModel &&
        mvm.avatar.decoratedAvatarViewModel.avatar &&
        mvm.avatar.decoratedAvatarViewModel.avatar.avatarViewModel;
      if (legacyAvatar) {
        const browse =
          legacyAvatar.onTap &&
          legacyAvatar.onTap.innertubeCommand &&
          legacyAvatar.onTap.innertubeCommand.browseEndpoint;
        const handle = browseToHandle(browse);
        if (handle) return handle;
      }

      const avatarStack = mvm.image && mvm.image.avatarStackViewModel;
      if (avatarStack) {
        const listItems =
          avatarStack.rendererContext &&
          avatarStack.rendererContext.commandContext &&
          avatarStack.rendererContext.commandContext.onTap &&
          avatarStack.rendererContext.commandContext.onTap.innertubeCommand &&
          avatarStack.rendererContext.commandContext.onTap.innertubeCommand.showDialogCommand &&
          avatarStack.rendererContext.commandContext.onTap.innertubeCommand.showDialogCommand.panelLoadingStrategy &&
          avatarStack.rendererContext.commandContext.onTap.innertubeCommand.showDialogCommand.panelLoadingStrategy.inlineContent &&
          avatarStack.rendererContext.commandContext.onTap.innertubeCommand.showDialogCommand.panelLoadingStrategy.inlineContent.dialogViewModel &&
          avatarStack.rendererContext.commandContext.onTap.innertubeCommand.showDialogCommand.panelLoadingStrategy.inlineContent.dialogViewModel.customContent &&
          avatarStack.rendererContext.commandContext.onTap.innertubeCommand.showDialogCommand.panelLoadingStrategy.inlineContent.dialogViewModel.customContent.listViewModel &&
          avatarStack.rendererContext.commandContext.onTap.innertubeCommand.showDialogCommand.panelLoadingStrategy.inlineContent.dialogViewModel.customContent.listViewModel.listItems;

        const handles = handlesFromCollaboratorListItems(listItems);
        if (handles.length) return handles;
      }

      const rows =
        mvm.metadata &&
        mvm.metadata.contentMetadataViewModel &&
        mvm.metadata.contentMetadataViewModel.metadataRows;
      if (Array.isArray(rows)) {
        for (const row of rows) {
          const parts = row && row.metadataParts;
          if (!Array.isArray(parts)) continue;
          for (const part of parts) {
            const runs = part && part.text && part.text.commandRuns;
            if (!Array.isArray(runs)) continue;
            for (const run of runs) {
              const handle = browseToHandle(
                run && run.onTap && run.onTap.innertubeCommand && run.onTap.innertubeCommand.browseEndpoint
              );
              if (handle) return handle;
            }
          }
        }
      }
    } catch (_) {}
    return null;
  }

  function handleFromByline(renderer) {
    try {
      const fields = ['longBylineText', 'shortBylineText'];
      for (const f of fields) {
        const runs = renderer && renderer[f] && renderer[f].runs;
        if (!Array.isArray(runs)) continue;
        for (const run of runs) {
          const handle = browseToHandle(
            run && run.navigationEndpoint && run.navigationEndpoint.browseEndpoint
          );
          if (handle) return handle;
        }
      }
    } catch (_) {}
    return null;
  }

  function handlesFromVideoOwnerRenderer(videoOwnerRenderer) {
    try {
      const listItems =
        videoOwnerRenderer.navigationEndpoint &&
        videoOwnerRenderer.navigationEndpoint.showDialogCommand &&
        videoOwnerRenderer.navigationEndpoint.showDialogCommand.panelLoadingStrategy &&
        videoOwnerRenderer.navigationEndpoint.showDialogCommand.panelLoadingStrategy.inlineContent &&
        videoOwnerRenderer.navigationEndpoint.showDialogCommand.panelLoadingStrategy.inlineContent.dialogViewModel &&
        videoOwnerRenderer.navigationEndpoint.showDialogCommand.panelLoadingStrategy.inlineContent.dialogViewModel.customContent &&
        videoOwnerRenderer.navigationEndpoint.showDialogCommand.panelLoadingStrategy.inlineContent.dialogViewModel.customContent.listViewModel &&
        videoOwnerRenderer.navigationEndpoint.showDialogCommand.panelLoadingStrategy.inlineContent.dialogViewModel.customContent.listViewModel.listItems;

      return handlesFromCollaboratorListItems(listItems);
    } catch (_) {
      return [];
    }
  }

  function walk(node, depth) {
    if (!node || depth > 14 || typeof node !== 'object') return;

    try {
      if (node.externalId && (node.vanityChannelUrl || node.canonicalBaseUrl)) {
        const handle = extractHandleFromUrlish(node.vanityChannelUrl) || extractHandleFromUrlish(node.canonicalBaseUrl);
        rememberChannelIdentity(node.externalId, handle);
      }
    } catch (_) {}
    try {
      const id = node.lockupViewModel && node.lockupViewModel.contentId;
      if (id && !cache[id]) {
        const handle = handleFromLockup(node.lockupViewModel);
        if (handle) { cache[id] = handle; cacheDirty = true; }
      }
    } catch (_) {}
    try {
      if (node.videoOwnerRenderer) {
        const id = new URLSearchParams(window.location.search).get('v');
        if (id && !cache[id]) {
          const handles = handlesFromVideoOwnerRenderer(node.videoOwnerRenderer);
          if (handles.length) { cache[id] = handles; cacheDirty = true; }
        }
      }
    } catch (_) {}
    try {
      const id = node.compactVideoRenderer && node.compactVideoRenderer.videoId;
      if (id && !cache[id]) {
        const handle = handleFromByline(node.compactVideoRenderer);
        if (handle) { cache[id] = handle; cacheDirty = true; }
      }
    } catch (_) {}
    try {
      const id = node.videoRenderer && node.videoRenderer.videoId;
      if (id && !cache[id]) {
        const handle = handleFromByline(node.videoRenderer);
        if (handle) { cache[id] = handle; cacheDirty = true; }
      }
    } catch (_) {}
    try {
      const id = node.gridVideoRenderer && node.gridVideoRenderer.videoId;
      if (id && !cache[id]) {
        const handle = handleFromByline(node.gridVideoRenderer);
        if (handle) { cache[id] = handle; cacheDirty = true; }
      }
    } catch (_) {}

    try {
      if (Array.isArray(node)) {
        for (let i = 0; i < node.length; i++) {
          try { walk(node[i], depth + 1); } catch (_) {}
        }
        return;
      }
    } catch (_) {
      return;
    }

    let keys;
    try {
      keys = Object.keys(node);
    } catch (_) {
      return;
    }
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      try {
        const value = node[key];
        if (value && typeof value === 'object') walk(value, depth + 1);
      } catch (_) {}
    }
  }

  let flushScheduled = false;
  function flush() {
    if (flushScheduled || (!cacheDirty && !channelIdCacheDirty)) return;
    flushScheduled = true;
    Promise.resolve().then(() => {
      flushScheduled = false;
      if (!cacheDirty && !channelIdCacheDirty) return;
      try {
        const root = document.documentElement;
        if (!root) return;
        if (cacheDirty) {
          cacheDirty = false;
          root.setAttribute(ATTR, JSON.stringify(cache));
        }
        if (channelIdCacheDirty) {
          channelIdCacheDirty = false;
          root.setAttribute(CHANNEL_ID_ATTR, JSON.stringify(channelIdCache));
        }
      } catch (_) {}
    });
  }

  function seedFromInitialData() {
    try {
      const data = window.ytInitialData;
      if (!data) return false;
      walk(data, 0);
      flush();
      return true;
    } catch (_) {
      return false;
    }
  }

  function trySeedRepeatedly() {
    if (seedFromInitialData()) return;
    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      if (seedFromInitialData() || attempts > 40) clearInterval(interval);
    }, 100);
  }

  if (document.documentElement) {
    trySeedRepeatedly();
  } else {
    document.addEventListener('readystatechange', trySeedRepeatedly, { once: true });
  }

  document.addEventListener('yt-page-data-updated', () => {
    seedFromInitialData();
  });

  document.addEventListener('yt-navigate-finish', () => {
    seedFromInitialData();
  });

  document.addEventListener('yt-action', (e) => {
    try {
      const args = e && e.detail && e.detail.args;
      if (Array.isArray(args)) {
        for (const arg of args) {
          if (!arg || typeof arg !== 'object') continue;
          if (arg.appendContinuationItemsAction && arg.appendContinuationItemsAction.continuationItems) {
            walk(arg.appendContinuationItemsAction.continuationItems, 0);
          }
          if (arg.reloadContinuationItemsCommand && arg.reloadContinuationItemsCommand.continuationItems) {
            walk(arg.reloadContinuationItemsCommand.continuationItems, 0);
          }
        }
        flush();
      }
    } catch (_) {}
  });

  try {
    const originalFetch = window.fetch;
    if (typeof originalFetch === 'function') {
      window.fetch = function (input) {
        let url = '';
        try {
          url = typeof input === 'string' ? input : (input && input.url) || '';
        } catch (_) {}
        const result = originalFetch.apply(this, arguments);
        if (typeof url === 'string' && /\/youtubei\/v1\//.test(url)) {
          return result.then((response) => {
            try {
              if (response && typeof response.clone === 'function') {
                response.clone().json().then((data) => {
                  try {
                    walk(data, 0);
                    flush();
                  } catch (_) {}
                }).catch(() => {});
              }
            } catch (_) {}
            return response;
          });
        }
        return result;
      };
    }
  } catch (_) {}

  try {
    const OriginalXHR = window.XMLHttpRequest;
    if (typeof OriginalXHR === 'function') {
      const open = OriginalXHR.prototype.open;
      OriginalXHR.prototype.open = function (method, url) {
        try {
          this.__ytHiderUrl = typeof url === 'string' ? url : '';
        } catch (_) {}
        return open.apply(this, arguments);
      };
      const send = OriginalXHR.prototype.send;
      OriginalXHR.prototype.send = function () {
        try {
          if (this.__ytHiderUrl && /\/youtubei\/v1\//.test(this.__ytHiderUrl)) {
            this.addEventListener('load', () => {
              try {
                let data = null;
                let rt = '';
                try { rt = this.responseType; } catch (_) {}
                if (rt === '' || rt === 'text') {
                  let text = '';
                  try { text = this.responseText; } catch (_) {}
                  if (text) {
                    try { data = JSON.parse(text); } catch (_) {}
                  }
                } else if (rt === 'json') {
                  try { data = this.response; } catch (_) {}
                }
                if (data) {
                  walk(data, 0);
                  flush();
                }
              } catch (_) {}
            });
          }
        } catch (_) {}
        return send.apply(this, arguments);
      };
    }
  } catch (_) {}
})();
