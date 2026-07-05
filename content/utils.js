const DEV_MODE = window.DEV_MODE ?? false;

function debounce(fn, delay) {
  let t;
  return () => {
    clearTimeout(t);
    t = setTimeout(fn, delay);
  };
}

function isYouTube() {
  return (
    window.location.hostname === 'www.youtube.com' ||
    window.location.hostname === 'm.youtube.com'
  );
}

const logger = {
  log: (...args) => {
    if (DEV_MODE) console.log(...args);
  },
  warn: (...args) => {
    if (DEV_MODE) console.warn(...args);
  },
  error: (...args) => {
    if (DEV_MODE) console.error(...args);
  },
  info: (...args) => {
    if (DEV_MODE) console.info(...args);
  },
};

function safeStorageSet(area, data) {
  try {
    chrome.storage[area].set(data, () => {
      if (chrome.runtime.lastError) {
        logger.warn('Storage set failed:', chrome.runtime.lastError.message);
      }
    });
  } catch (e) {
    logger.warn('Storage unavailable:', e);
  }
}

function safeSendMessage(msg) {
  try {
    chrome.runtime.sendMessage(msg).catch(err => {
      logger.warn('sendMessage failed:', err);
    });
  } catch (e) {
    logger.warn('sendMessage unavailable:', e);
  }
}

function pollUntil(predicate, { timeout = 3000, interval = TIMING.ELEMENT_POLL_INTERVAL } = {}) {
  let timer = null;

  const cancel = () => {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  };

  const promise = new Promise(resolve => {
    if (predicate()) {
      resolve(true);
      return;
    }

    const startTime = Date.now();
    timer = setInterval(() => {
      if (predicate()) {
        cancel();
        resolve(true);
      } else if (Date.now() - startTime > timeout) {
        cancel();
        resolve(false);
      }
    }, interval);
  });

  return { promise, cancel };
}
