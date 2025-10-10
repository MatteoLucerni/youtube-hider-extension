let ENVIRONMENT = 'production';
let envLoaded = false;
const envWaiters = [];

async function loadEnvironment() {
  if (envLoaded) return Promise.resolve(ENVIRONMENT);
  const r = await fetch(chrome.runtime.getURL('.env.dev'));
  const text = await r.text();
  const match = text.match(/^ENVIRONMENT=(.*)$/m);
  if (match) ENVIRONMENT = match[1].trim();
  envLoaded = true;
  envWaiters.forEach(fn => fn(ENVIRONMENT));
  return ENVIRONMENT;
}

function onEnvLoaded(cb) {
  if (envLoaded) {
    cb(ENVIRONMENT);
  } else {
    envWaiters.push(cb);
  }
}

function devLog(...args) {
  if (ENVIRONMENT === 'development') {
    console.log(...args);
  }
}

function debounce(fn, delay) {
  let t;
  return () => {
    clearTimeout(t);
    t = setTimeout(fn, delay);
  };
}

export { loadEnvironment, onEnvLoaded, devLog, debounce };
