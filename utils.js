const DEV_MODE = window.DEV_MODE ?? false;

function debounce(fn, delay) {
  let t;
  return () => {
    clearTimeout(t);
    t = setTimeout(fn, delay);
  };
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
