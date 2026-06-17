(function () {
  const ATTR = 'data-yt-hider-channel-cache';
  const cache = {};

  function browseToHandle(browse) {
    if (!browse) return null;
    if (browse.canonicalBaseUrl) return String(browse.canonicalBaseUrl).toLowerCase();
    if (browse.browseId) return ('/channel/' + browse.browseId).toLowerCase();
    return null;
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

  function walk(node, depth) {
    if (!node || depth > 14 || typeof node !== 'object') return;

    try {
      if (node.lockupViewModel && node.lockupViewModel.contentId) {
        const handle = handleFromLockup(node.lockupViewModel);
        if (handle) cache[node.lockupViewModel.contentId] = handle;
      }
    } catch (_) {}
    try {
      if (node.compactVideoRenderer && node.compactVideoRenderer.videoId) {
        const handle = handleFromByline(node.compactVideoRenderer);
        if (handle) cache[node.compactVideoRenderer.videoId] = handle;
      }
    } catch (_) {}
    try {
      if (node.videoRenderer && node.videoRenderer.videoId) {
        const handle = handleFromByline(node.videoRenderer);
        if (handle) cache[node.videoRenderer.videoId] = handle;
      }
    } catch (_) {}
    try {
      if (node.gridVideoRenderer && node.gridVideoRenderer.videoId) {
        const handle = handleFromByline(node.gridVideoRenderer);
        if (handle) cache[node.gridVideoRenderer.videoId] = handle;
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
    if (flushScheduled) return;
    flushScheduled = true;
    Promise.resolve().then(() => {
      flushScheduled = false;
      try {
        const root = document.documentElement;
        if (!root) return;
        root.setAttribute(ATTR, JSON.stringify(cache));
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
