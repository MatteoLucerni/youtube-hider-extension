const { chromium } = require('playwright-core');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { buildManagerSample, buildListsSample, LIST_SAMPLE_PASTE } = require('./screenshot-utils');

const EXTENSION_PATH = path.resolve(__dirname, '..');
const OUTPUT_DIR = path.join(EXTENSION_PATH, 'store-listing', 'screenshots');
const PROMO_DIR = path.join(EXTENSION_PATH, 'store-listing', 'promo');
const LOGO_PATH = path.join(EXTENSION_PATH, 'assets', 'icons', 'youtube-hider-logo.png');
const SMALL_TILE = { width: 440, height: 280 };
const MARQUEE = { width: 1400, height: 560 };
const POPUP_PANEL_VIEWPORT = { width: 400, height: 720 };
const PROFILE_DIR = path.join(process.env.LOCALAPPDATA || os.homedir(), 'yt-hider-screenshot-profile');
const VIEWPORT = { width: 1280, height: 800 };
const BEFORE_AFTER_VIEWPORT = { width: 840, height: 800 };
const UI_LOCALE = 'en-US';
const YOUTUBE_HOME_URL = 'https://www.youtube.com/?hl=en';

const STAGE = { x: 48, y: 150, width: 1184, height: 630 };
const TAG_SPACE = 40;
const SPLIT_GAP = 32;

const BASE_SETTINGS = {
  extensionEnabled: true,
  tutorialCompleted: true,
  dimMode: true,
  hideThreshold: 100,
  viewsHideThreshold: 0,
  viewsHideMaxThreshold: 0,
  dateFilterNewerThreshold: 0,
  dateFilterOlderThreshold: 0,
  dateFilterHomeEnabled: true,
  dateFilterCorrEnabled: true,
};
const DIMMING_RESET_SETTINGS = {
  hideThreshold: BASE_SETTINGS.hideThreshold,
  viewsHideThreshold: BASE_SETTINGS.viewsHideThreshold,
  dateFilterNewerThreshold: BASE_SETTINGS.dateFilterNewerThreshold,
};
const BEFORE_AFTER_SETTINGS = {
  extensionEnabled: false,
  dimMode: false,
  hideThreshold: 20,
  viewsHideThreshold: 1000,
  dateFilterNewerThreshold: 0,
};
const BASE_LOCAL_SETTINGS = {
  channelWhitelist: [],
  channelBlacklist: [],
  titleWhitelist: [],
  titleBlacklist: [],
  markedWatched: [],
  markedWatchedMeta: {},
};

const WATCHED_THRESHOLD_CANDIDATES = [90, 80, 70, 60, 50, 40, 30, 20, 10];
const WATCHED_SAFE_THRESHOLDS = [20, 50, 80, 100];

const YOUTUBE_CLEANUP_CSS = `
  ytd-rich-item-renderer:has(ytd-ad-slot-renderer),
  ytd-ad-slot-renderer,
  #masthead-ad,
  #player-ads,
  ytd-statement-banner-renderer,
  ytd-banner-promo-renderer,
  ytd-popup-container,
  ytd-video-preview,
  #video-preview,
  .ytp-caption-window-container {
    display: none !important;
  }
`;

const SLIDE_CSS = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { width: 1280px; height: 800px; overflow: hidden; background: #131313; }
  .slide {
    position: relative;
    width: 1280px;
    height: 800px;
    overflow: hidden;
    font-family: 'Poppins', 'Segoe UI', sans-serif;
    color: #ebebeb;
    background:
      radial-gradient(900px 480px at 50% -18%, rgba(138, 180, 248, 0.2), transparent 70%),
      radial-gradient(720px 420px at 104% 106%, rgba(16, 185, 129, 0.1), transparent 70%),
      linear-gradient(180deg, #1c1c1c 0%, #161616 55%, #121212 100%);
  }
  .slide::before {
    content: '';
    position: absolute;
    inset: 0;
    background-image: radial-gradient(rgba(255, 255, 255, 0.06) 1px, transparent 1px);
    background-size: 26px 26px;
    -webkit-mask-image: radial-gradient(760px 300px at 50% 0%, #000 0%, transparent 75%);
    mask-image: radial-gradient(760px 300px at 50% 0%, #000 0%, transparent 75%);
  }
  h1 {
    position: absolute;
    top: 28px;
    left: 40px;
    right: 40px;
    text-align: center;
    font-size: 46px;
    font-weight: 700;
    letter-spacing: -0.5px;
    line-height: 1.15;
  }
  h1 em { font-style: normal; color: #8ab4f8; }
  .subtitle {
    position: absolute;
    top: 92px;
    left: 80px;
    right: 80px;
    text-align: center;
    font-size: 21px;
    line-height: 1.4;
    color: #b4b4b4;
  }
  .shot {
    position: absolute;
    overflow: hidden;
    border: 1px solid #3a3a3a;
    border-radius: 8px;
    background: #0f0f0f;
    box-shadow: 0 24px 60px rgba(0, 0, 0, 0.55);
  }
  .shot img { display: block; width: 100%; height: 100%; }
  .tag {
    position: absolute;
    text-align: center;
    font-size: 19px;
    font-weight: 600;
    color: #9a9a9a;
  }
  .tag.accent { color: #8ab4f8; }
  .ring {
    position: absolute;
    border: 3px solid #8ab4f8;
    border-radius: 8px;
    box-shadow: 0 0 0 5px rgba(138, 180, 248, 0.25), 0 0 24px rgba(138, 180, 248, 0.35);
  }
  .links { position: absolute; inset: 0; }
  .links line { stroke: #8ab4f8; stroke-width: 3; }
  .links circle { fill: #8ab4f8; }
  .callout {
    position: absolute;
    white-space: nowrap;
    padding: 9px 16px;
    border-radius: 8px;
    background: #8ab4f8;
    color: #111111;
    font-size: 19px;
    font-weight: 600;
    box-shadow: 0 10px 28px rgba(0, 0, 0, 0.5);
  }
`;

const TILE_CSS = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { overflow: hidden; background: #131313; }
  .tile {
    position: relative;
    overflow: hidden;
    font-family: 'Poppins', 'Segoe UI', sans-serif;
    color: #ebebeb;
    background:
      radial-gradient(60% 95% at 16% 0%, rgba(138, 180, 248, 0.32), transparent 70%),
      radial-gradient(50% 85% at 100% 100%, rgba(16, 185, 129, 0.16), transparent 70%),
      linear-gradient(160deg, #1f2533 0%, #171717 55%, #111111 100%);
  }
  .tile::before {
    content: '';
    position: absolute;
    inset: 0;
    background-image: radial-gradient(rgba(255, 255, 255, 0.07) 1px, transparent 1px);
    background-size: 22px 22px;
    -webkit-mask-image: radial-gradient(70% 90% at 20% 30%, #000 0%, transparent 75%);
    mask-image: radial-gradient(70% 90% at 20% 30%, #000 0%, transparent 75%);
  }
  .brand {
    position: absolute;
    top: 0;
    bottom: 0;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }
  .brand img { display: block; }
  .wordmark { font-weight: 700; letter-spacing: -0.02em; line-height: 1.05; }
  .wordmark span { display: inline-block; -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
  .wordmark .yt { background-image: linear-gradient(135deg, #8ab4f8 0%, #6ba3ff 100%); }
  .wordmark .hd { position: relative; background-image: linear-gradient(135deg, #ffffff 0%, #9dc4f0 100%); }
  .wordmark .hd::after {
    content: '';
    position: absolute;
    left: 0;
    bottom: -0.04em;
    width: 100%;
    height: 0.07em;
    border-radius: 2px;
    background: linear-gradient(90deg, #8ab4f8, transparent);
  }
  .tagline { color: #b4b4b4; }
  .panel {
    position: absolute;
    overflow: hidden;
    border: 1px solid #3a3a3a;
    border-radius: 8px;
    background: #1a1a1a;
    box-shadow: 0 24px 60px rgba(0, 0, 0, 0.6);
    z-index: 2;
  }
  .panel img { display: block; width: 100%; }
  .yt-card {
    position: absolute;
    z-index: 1;
    padding: 12px 12px 16px;
    border: 1px solid #3a3a3a;
    border-radius: 8px;
    background: #0f0f0f;
    box-shadow: 0 24px 60px rgba(0, 0, 0, 0.6);
    font-family: 'Roboto', Arial, sans-serif;
  }
  .yt-thumb { position: relative; aspect-ratio: 16 / 9; border-radius: 12px; overflow: hidden; }
  .yt-thumb svg { display: block; width: 100%; height: 100%; }
  .yt-duration {
    position: absolute;
    right: 8px;
    bottom: 10px;
    padding: 1px 4px;
    border-radius: 4px;
    background: rgba(0, 0, 0, 0.8);
    color: #ffffff;
    font-size: 12px;
    font-weight: 500;
  }
  .yt-progress { position: absolute; left: 0; right: 0; bottom: 0; height: 4px; background: rgba(255, 255, 255, 0.35); }
  .yt-progress div { height: 100%; background: #ff0033; }
  .yt-meta { display: flex; gap: 12px; margin-top: 12px; }
  .yt-avatar {
    flex: none;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #ffd38a 0%, #ff8f6b 100%);
    color: #2a1d3d;
    font-size: 14px;
    font-weight: 700;
  }
  .yt-title { color: #f1f1f1; font-size: 16px; font-weight: 500; line-height: 22px; }
  .yt-sub { color: #aaaaaa; font-size: 14px; line-height: 20px; }
  .yt-sub:first-of-type { margin-top: 4px; }
  .yt-hider-badge { animation: none !important; }
`;

const FIXTURE_THUMBNAIL_SVG = `<svg viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
<defs><linearGradient id="fixture-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a63ff"/><stop offset="0.55" stop-color="#ff7eb3"/><stop offset="1" stop-color="#ffc46b"/></linearGradient></defs>
<rect width="320" height="180" fill="url(#fixture-sky)"/>
<circle cx="238" cy="98" r="30" fill="#fff3c4"/>
<path d="M0 132 L58 80 L96 112 L150 56 L206 120 L250 90 L320 140 V180 H0 Z" fill="#5b3f8c"/>
<path d="M150 56 L135 71 L145 69 L151 77 L159 67 L167 71 Z" fill="#ffffff" opacity="0.9"/>
<path d="M0 152 L70 112 L130 146 L196 106 L260 150 L320 126 V180 H0 Z" fill="#2f2560"/>
<path d="M0 168 Q80 150 160 166 T320 160 V180 H0 Z" fill="#1b1638"/>
</svg>`;

const FIXTURE_VIDEO = {
  title: 'Five Days Hiking the Alps Alone, No Phone',
  channel: 'Trail &amp; Tea',
  initials: 'TT',
  stats: '248K views &bull; 2 weeks ago',
  duration: '18:42',
  progress: 86,
};

function launchBrowser() {
  return chromium.launchPersistentContext(PROFILE_DIR, {
    headless: false,
    channel: 'chromium',
    viewport: VIEWPORT,
    locale: UI_LOCALE,
    ignoreDefaultArgs: ['--enable-automation'],
    args: [
      `--disable-extensions-except=${EXTENSION_PATH}`,
      `--load-extension=${EXTENSION_PATH}`,
      `--lang=${UI_LOCALE}`,
      '--mute-audio',
      '--no-first-run',
      '--disable-blink-features=AutomationControlled',
    ],
  });
}

async function getServiceWorker(context) {
  return context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker'));
}

function applySettings(serviceWorker, syncSettings, localSettings) {
  return serviceWorker.evaluate(
    async ({ sync, local }) => {
      if (sync) await chrome.storage.sync.set(sync);
      if (local) await chrome.storage.local.set(local);
    },
    { sync: syncSettings || null, local: localSettings || null }
  );
}

function applyBaseSettings(serviceWorker) {
  return serviceWorker.evaluate(
    async ({ sync, local }) => {
      await chrome.storage.sync.set({ ...defaultSettings, ...sync });
      await chrome.storage.local.set(local);
    },
    { sync: BASE_SETTINGS, local: BASE_LOCAL_SETTINGS }
  );
}

async function evaluateInExtensionWorld(page, extensionId, fn, arg) {
  const session = await page.context().newCDPSession(page);
  try {
    const contexts = [];
    session.on('Runtime.executionContextCreated', event => contexts.push(event.context));
    await session.send('Runtime.enable');
    const { frameTree } = await session.send('Page.getFrameTree');
    const isolatedWorlds = contexts.filter(
      context =>
        context.auxData &&
        context.auxData.type === 'isolated' &&
        context.auxData.frameId === frameTree.frame.id &&
        !context.name.startsWith('__playwright')
    );
    const extensionWorld =
      isolatedWorlds.find(context => context.origin === `chrome-extension://${extensionId}`) ||
      isolatedWorlds[0];
    if (!extensionWorld) {
      throw new Error('The extension content scripts are not running on this page');
    }
    const { result, exceptionDetails } = await session.send('Runtime.evaluate', {
      expression: `(${fn})(${JSON.stringify(arg ?? null)})`,
      contextId: extensionWorld.id,
      returnByValue: true,
      awaitPromise: true,
    });
    if (exceptionDetails) {
      throw new Error(exceptionDetails.exception?.description || exceptionDetails.text);
    }
    return result.value;
  } finally {
    await session.detach().catch(() => {});
  }
}

function inspectVisibleCards() {
  const selectors = getVideoContainerSelectors();
  const progressSelectors =
    'ytd-thumbnail-overlay-resume-playback-renderer #progress, .ytThumbnailOverlayProgressBarHostWatchedProgressBarSegment, .ytwThumbnailOverlayResumePlaybackRendererThumbnailOverlayResumePlaybackProgress';
  const seen = new Set();
  const cards = [];
  document.querySelectorAll(selectors).forEach(node => {
    const container = findOutermostMatch(node, selectors);
    if (!container || seen.has(container)) return;
    seen.add(container);
    const thumbnail = container.querySelector('ytd-thumbnail, yt-thumbnail-view-model') || container;
    const rect = thumbnail.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    if (rect.top < 0 || rect.top + rect.height / 2 > window.innerHeight) return;

    const metadata = container.querySelector('yt-content-metadata-view-model, yt-lockup-view-model');
    let spans = metadata ? getMetadataSpansFromContainer(metadata) : [];
    if (!spans.length) {
      spans = Array.from(container.querySelectorAll('#metadata-line span.inline-metadata-item'));
    }
    const age = resolveUploadAgeFromSpans(spans);
    const views = isLiveVideo(container) ? null : resolveViewsFromSpans(spans);
    const bar = container.querySelector(progressSelectors);
    const reason = container.querySelector('.yt-hider-badge-reason');

    cards.push({
      videoId: extractVideoIdFromContainer(container),
      title: extractTitleFromContainer(container),
      dimmed: !!container.dataset.ytHiderDimmed,
      reason: reason ? reason.textContent : null,
      ageDays: age ? age.ageDays : null,
      views: views ? views.views : null,
      progress: bar ? parseFloat(bar.style.width) || 0 : 0,
    });
  });
  return cards;
}

function locateCard(videoId) {
  const selectors = getVideoContainerSelectors();
  const toRect = element => {
    const box = element.getBoundingClientRect();
    return { x: box.x, y: box.y, width: box.width, height: box.height };
  };
  for (const node of document.querySelectorAll(selectors)) {
    const container = findOutermostMatch(node, selectors);
    if (!container || extractVideoIdFromContainer(container) !== videoId) continue;
    const thumbnail = container.querySelector('ytd-thumbnail, yt-thumbnail-view-model') || container;
    const reason = container.querySelector('.yt-hider-badge-reason');
    return {
      card: toRect(container),
      thumbnail: toRect(thumbnail),
      reason: reason ? toRect(reason) : null,
    };
  }
  return null;
}

function planDimming(cards, ladders) {
  const target = Math.ceil(cards.length / 2);
  const taken = new Set(cards.filter(card => card.dimmed).map(card => card.videoId));
  const plan = { sync: {}, marked: [] };

  const applyRule = (candidates, matches, budget, onMatch) => {
    const remaining = target - taken.size;
    if (remaining <= 0) return false;
    for (const value of candidates) {
      const hits = cards.filter(card => matches(card, value) && !taken.has(card.videoId));
      if (!hits.length) continue;
      if (hits.length > Math.min(budget, remaining)) return false;
      hits.forEach(card => taken.add(card.videoId));
      onMatch(value);
      return true;
    }
    return false;
  };

  const watchedApplied = applyRule(
    WATCHED_THRESHOLD_CANDIDATES,
    (card, value) => card.progress > value,
    2,
    value => {
      plan.sync.hideThreshold = value;
    }
  );
  if (!watchedApplied) {
    plan.sync.hideThreshold = WATCHED_SAFE_THRESHOLDS.find(value =>
      cards.every(card => card.progress <= value)
    );
  }

  applyRule(
    ladders.viewsSteps.filter(value => value > 0),
    (card, value) => card.views !== null && card.views < value,
    1,
    value => {
      plan.sync.viewsHideThreshold = value;
    }
  );

  applyRule(
    ladders.dateNewerSteps.filter(value => value > 0),
    (card, value) => card.ageDays !== null && card.ageDays < value,
    1,
    value => {
      plan.sync.dateFilterNewerThreshold = value;
    }
  );

  const free = cards.filter(card => card.videoId && !taken.has(card.videoId));
  const missing = Math.min(target - taken.size, free.length);
  for (let i = 0; i < missing; i++) {
    const card = free[Math.floor((i * free.length) / missing)];
    taken.add(card.videoId);
    plan.marked.push(card.videoId);
  }

  return { plan, expected: [...taken] };
}

async function applyDimmingPlan(page, serviceWorker, extensionId, ladders, label) {
  const cards = await evaluateInExtensionWorld(page, extensionId, inspectVisibleCards);
  if (!cards.length) {
    throw new Error(`No video cards found on the ${label} page`);
  }
  const { plan, expected } = planDimming(cards, ladders);
  const now = Math.floor(Date.now() / 1000);
  await applySettings(serviceWorker, plan.sync, {
    markedWatched: plan.marked.map(videoId => [videoId, now]),
  });

  const deadline = Date.now() + 10000;
  let result = cards;
  while (Date.now() < deadline) {
    await page.waitForTimeout(500);
    result = await evaluateInExtensionWorld(page, extensionId, inspectVisibleCards);
    const dimmed = new Set(result.filter(card => card.dimmed).map(card => card.videoId));
    if (expected.every(videoId => dimmed.has(videoId))) break;
  }

  console.log(`${label} cards:`);
  result.forEach(card => {
    console.log(`  ${card.dimmed ? `[${card.reason}]` : '[visible]'} ${card.title || card.videoId}`);
  });
  console.log('Settings used:', JSON.stringify(plan.sync));
  return result;
}

async function waitForVisibleImages(page) {
  await page
    .waitForFunction(
      () =>
        Array.from(document.images)
          .filter(img => {
            const rect = img.getBoundingClientRect();
            return rect.width > 0 && rect.bottom > 0 && rect.top < window.innerHeight;
          })
          .every(img => img.complete && img.naturalWidth > 0),
      null,
      { timeout: 15000 }
    )
    .catch(() => console.warn('Some thumbnails did not finish loading'));
}

async function ensureSignedIn(page) {
  const account = await page
    .waitForSelector('#avatar-btn, ytd-masthead a[href*="ServiceLogin"]', { timeout: 30000 })
    .catch(() => null);
  if (!account || (await account.getAttribute('id')) !== 'avatar-btn') {
    throw new Error('Not signed in to YouTube. Run "npm run screenshots:store:login" first.');
  }
}

async function waitForYouTubeHome(page) {
  await page.goto(YOUTUBE_HOME_URL, { waitUntil: 'domcontentloaded' });
  await ensureSignedIn(page);
  await page.waitForSelector('ytd-rich-grid-renderer ytd-rich-item-renderer', {
    state: 'attached',
    timeout: 30000,
  });
  await page.addStyleTag({ content: YOUTUBE_CLEANUP_CSS });
  await page.waitForTimeout(2500);
  await waitForVisibleImages(page);
}

async function waitForVideoPlayback(page) {
  await page.waitForSelector('#movie_player video', { timeout: 30000 });
  const skipButton = page
    .locator('.ytp-skip-ad-button, .ytp-ad-skip-button-modern, .ytp-ad-skip-button')
    .first();
  const deadline = Date.now() + 120000;
  while (Date.now() < deadline) {
    const playing = await page.evaluate(() => {
      const player = document.getElementById('movie_player');
      const video = player && player.querySelector('video');
      return !!video && !player.classList.contains('ad-showing') && video.currentTime > 1;
    });
    if (playing) return;
    if (await skipButton.isVisible().catch(() => false)) {
      await skipButton.click({ timeout: 2000 }).catch(() => {});
    }
    await page.waitForTimeout(1000);
  }
  throw new Error('The video did not start playing within two minutes, an ad may still be running');
}

async function parkMouse(page) {
  const viewport = page.viewportSize();
  await page.mouse.move(viewport.width - 4, viewport.height / 2);
  await page.waitForTimeout(400);
}

function getClientWidth(page) {
  return page.evaluate(() => document.documentElement.clientWidth);
}

function getElementRect(page, selector) {
  return page.evaluate(sel => {
    const element = document.querySelector(sel);
    if (!element) return null;
    const box = element.getBoundingClientRect();
    if (!box.width || !box.height) return null;
    return { x: box.x, y: box.y, width: box.width, height: box.height };
  }, selector);
}

async function captureRegion(page, region, scale = 1) {
  const scroll = await page.evaluate(() => ({ x: window.scrollX, y: window.scrollY }));
  const session = await page.context().newCDPSession(page);
  try {
    const { data } = await session.send('Page.captureScreenshot', {
      format: 'png',
      clip: {
        x: region.x + scroll.x,
        y: region.y + scroll.y,
        width: region.width,
        height: region.height,
        scale,
      },
    });
    return { src: `data:image/png;base64,${data}`, region };
  } finally {
    await session.detach().catch(() => {});
  }
}

function regionForArea(area, bounds, anchor = {}) {
  const aspect = area.width / area.height;
  let width = bounds.width;
  let height = width / aspect;
  if (height > bounds.height) {
    height = bounds.height;
    width = height * aspect;
  }
  const x = anchor.right !== undefined ? anchor.right - width : anchor.x ?? bounds.x;
  let y = anchor.bottom !== undefined ? anchor.bottom - height : anchor.y ?? bounds.y;
  y = Math.max(bounds.y, Math.min(y, bounds.y + bounds.height - height));
  return {
    x: Math.round(Math.max(bounds.x, x)),
    y: Math.round(y),
    width: Math.round(width),
    height: Math.round(height),
  };
}

function fitCapture(capture, area, tag) {
  const scale = Math.min(area.width / capture.region.width, area.height / capture.region.height);
  const width = Math.round(capture.region.width * scale);
  const height = Math.round(capture.region.height * scale);
  const x = Math.round(area.x + (area.width - width) / 2);
  const y = Math.round(area.y + (area.height - height) / 2);
  return {
    panel: { src: capture.src, x, y, width, height, tag },
    map: rect => ({
      x: x + (rect.x - capture.region.x) * scale,
      y: y + (rect.y - capture.region.y) * scale,
      width: rect.width * scale,
      height: rect.height * scale,
    }),
  };
}

function padRect(rect, amount) {
  return {
    x: rect.x - amount,
    y: rect.y - amount,
    width: rect.width + amount * 2,
    height: rect.height + amount * 2,
  };
}

function callout(text, ring, dx, dy) {
  const center = { x: ring.x + ring.width / 2, y: ring.y + ring.height / 2 };
  let anchor = center;
  if (Math.abs(dy) >= Math.abs(dx)) {
    anchor = { x: center.x, y: dy < 0 ? ring.y : ring.y + ring.height };
  } else {
    anchor = { x: dx < 0 ? ring.x : ring.x + ring.width, y: center.y };
  }
  return { text, anchor, dx, dy };
}

function layoutCallouts(callouts) {
  const slide = document.querySelector('.slide');
  const svg = document.querySelector('.links');
  const ns = 'http://www.w3.org/2000/svg';
  document.fonts.ready.then(() => {
    callouts.forEach(item => {
      const chip = document.createElement('div');
      chip.className = 'callout';
      chip.textContent = item.text;
      slide.appendChild(chip);
      const width = chip.offsetWidth;
      const height = chip.offsetHeight;
      const cx = Math.min(Math.max(item.anchor.x + item.dx, width / 2 + 16), 1280 - width / 2 - 16);
      const cy = Math.min(Math.max(item.anchor.y + item.dy, height / 2 + 16), 800 - height / 2 - 16);
      chip.style.left = `${cx - width / 2}px`;
      chip.style.top = `${cy - height / 2}px`;
      const line = document.createElementNS(ns, 'line');
      line.setAttribute('x1', cx);
      line.setAttribute('y1', cy);
      line.setAttribute('x2', item.anchor.x);
      line.setAttribute('y2', item.anchor.y);
      svg.appendChild(line);
      const dot = document.createElementNS(ns, 'circle');
      dot.setAttribute('cx', item.anchor.x);
      dot.setAttribute('cy', item.anchor.y);
      dot.setAttribute('r', 5);
      svg.appendChild(dot);
    });
    document.body.dataset.ready = '1';
  });
}

function buildSlideHtml(slide) {
  const box = rect =>
    `left:${Math.round(rect.x)}px;top:${Math.round(rect.y)}px;width:${Math.round(rect.width)}px;height:${Math.round(rect.height)}px`;
  const panels = slide.panels
    .map(panel => {
      const tag = panel.tag
        ? `<div class="tag${panel.tag.accent ? ' accent' : ''}" style="left:${panel.x}px;top:${panel.y - TAG_SPACE + 4}px;width:${panel.width}px">${panel.tag.text}</div>`
        : '';
      return `${tag}<figure class="shot" style="${box(panel)}"><img src="${panel.src}"></figure>`;
    })
    .join('');
  const rings = (slide.rings || []).map(ring => `<div class="ring" style="${box(ring)}"></div>`).join('');
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap" rel="stylesheet">
<style>${SLIDE_CSS}</style>
</head>
<body>
<div class="slide">
<h1>${slide.title}</h1>
<p class="subtitle">${slide.subtitle}</p>
${panels}
${rings}
<svg class="links" width="1280" height="800"></svg>
</div>
<script>(${layoutCallouts})(${JSON.stringify(slide.callouts || [])});</script>
</body>
</html>`;
}

async function renderImage(context, html, size, filePath) {
  const page = await context.newPage();
  try {
    await page.setViewportSize(size);
    await page.setContent(html, { waitUntil: 'load' });
    await page.waitForSelector('body[data-ready="1"]', { timeout: 15000 });
    await page.waitForTimeout(200);
    await saveImage(page, filePath, size);
  } finally {
    await page.close();
  }
}

function renderSlide(context, slide) {
  return renderImage(context, buildSlideHtml(slide), VIEWPORT, path.join(OUTPUT_DIR, slide.file));
}

async function saveImage(page, filePath, size) {
  await page.screenshot({ path: filePath });
  const header = fs.readFileSync(filePath).subarray(0, 26);
  const width = header.readUInt32BE(16);
  const height = header.readUInt32BE(20);
  const colorType = header[25];
  if (width !== size.width || height !== size.height || colorType !== 2) {
    throw new Error(
      `${path.basename(filePath)} is ${width}x${height} with PNG color type ${colorType}, the Web Store needs ${size.width}x${size.height} without alpha`
    );
  }
  console.log(`Saved ${filePath}`);
}

function buildTileHtml(size, content, extraCss = '') {
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&family=Roboto:wght@400;500;700&display=swap" rel="stylesheet">
<style>${extraCss}</style>
<style>${TILE_CSS}</style>
</head>
<body>
<div class="tile" style="width:${size.width}px;height:${size.height}px">${content}</div>
<script>Promise.all([document.fonts.ready, ...Array.from(document.images).map(img => img.decode())]).then(() => { document.body.dataset.ready = '1'; });</script>
</body>
</html>`;
}

function logoDataUrl() {
  return `data:image/png;base64,${fs.readFileSync(LOGO_PATH).toString('base64')}`;
}

function buildSmallTileHtml(popupPanel) {
  return buildTileHtml(
    SMALL_TILE,
    `<div class="brand" style="left:28px;gap:12px">
<img src="${logoDataUrl()}" style="width:84px;height:84px">
<div class="wordmark" style="font-size:38px"><span class="yt">YouTube</span><br><span class="hd">Hider</span></div>
</div>
<div class="panel" style="left:248px;top:30px;width:172px;height:270px"><img src="${popupPanel.src}"></div>`
  );
}

function buildFixtureCard(badge, style) {
  const video = FIXTURE_VIDEO;
  return `<div class="yt-card" style="${style}">
<div class="yt-thumb" data-yt-hider-badge-target="1">
${FIXTURE_THUMBNAIL_SVG}
<div class="yt-duration">${video.duration}</div>
<div class="yt-progress"><div style="width:${video.progress}%"></div></div>
${badge.html}
</div>
<div class="yt-meta">
<div class="yt-avatar">${video.initials}</div>
<div>
<div class="yt-title">${video.title}</div>
<div class="yt-sub">${video.channel}</div>
<div class="yt-sub">${video.stats}</div>
</div>
</div>
</div>`;
}

function buildMarqueeHtml(popupPanel, badge) {
  const card = badge ? buildFixtureCard(badge, 'left:688px;top:128px;width:340px') : '';
  return buildTileHtml(
    MARQUEE,
    `<div class="brand" style="left:104px;gap:20px">
<img src="${logoDataUrl()}" style="width:120px;height:120px">
<div class="wordmark" style="font-size:64px"><span class="yt">YouTube</span> <span class="hd">Hider</span></div>
<div class="tagline" style="font-size:26px">Your YouTube feed, without the clutter</div>
</div>
${card}
<div class="panel" style="left:1016px;top:56px;width:330px;height:540px"><img src="${popupPanel.src}"></div>`,
    badge ? badge.css : ''
  );
}

async function extractBadgeTemplate(page) {
  const template = await page.evaluate(() => {
    const badges = Array.from(document.querySelectorAll('.yt-hider-badge'));
    const badge =
      badges.find(item => item.querySelector('.yt-hider-whitelist-btn')) ||
      badges.find(item => !item.dataset.ytHiderBadgeKind) ||
      badges[0];
    if (!badge) return null;
    return {
      css: Array.from(document.querySelectorAll('style[id^="yt-hider"]'))
        .map(style => style.textContent)
        .join('\n'),
      html: badge.outerHTML,
      hasWhitelist: !!badge.querySelector('.yt-hider-whitelist-btn'),
    };
  });
  if (!template) {
    console.warn('No dim badge on the Home page to reuse in the marquee tile');
    return null;
  }
  if (template.hasWhitelist) {
    const messages = JSON.parse(fs.readFileSync(path.join(EXTENSION_PATH, '_locales', 'en', 'messages.json'), 'utf8'));
    template.html = template.html.replace(
      /(<span class="yt-hider-badge-reason">)[\s\S]*?(<\/span>)/,
      `$1${messages.reasonAlreadyWatched.message}$2`
    );
  }
  return template;
}

async function capturePopupPanel(context, serviceWorker, extensionId) {
  await applySettings(serviceWorker, { hideThreshold: 20, dimMode: true });
  const page = await context.newPage();
  try {
    await page.setViewportSize(POPUP_PANEL_VIEWPORT);
    await page.goto(`chrome-extension://${extensionId}/popup/popup.html?standalone=true`);
    await page.waitForSelector('.setting-card');
    await page.addStyleTag({ content: '* { scrollbar-width: none !important; }' });
    await page.waitForTimeout(500);
    return await withDeviceScale(page, 2, () =>
      captureRegion(page, { x: 0, y: 0, ...POPUP_PANEL_VIEWPORT })
    );
  } finally {
    await page.close();
  }
}

async function captureHomeSlide(page, extensionId, cards) {
  await parkMouse(page);
  const clientWidth = await getClientWidth(page);
  const capture = await captureRegion(
    page,
    regionForArea(STAGE, { x: 0, y: 0, width: clientWidth, height: VIEWPORT.height })
  );
  const { panel, map } = fitCapture(capture, STAGE);

  const slide = {
    file: '1-home.png',
    title: 'Skip the videos you have <em>already seen</em>',
    subtitle: 'Watched, low-view and unwanted videos are hidden or dimmed, and each one says why.',
    panels: [panel],
    rings: [],
    callouts: [],
  };

  const dimmedIds = cards.filter(card => card.dimmed && card.videoId).map(card => card.videoId);
  for (const videoId of dimmedIds) {
    const located = await evaluateInExtensionWorld(page, extensionId, locateCard, videoId);
    if (!located || !located.reason) continue;
    const ring = padRect(map(located.reason), 8);
    slide.rings.push(ring);
    slide.callouts.push(callout('Every filtered video says why', ring, 0, -125));
    break;
  }
  return slide;
}

async function withDeviceScale(page, scale, fn) {
  const viewport = page.viewportSize();
  const session = await page.context().newCDPSession(page);
  try {
    await session.send('Emulation.setDeviceMetricsOverride', {
      width: viewport.width,
      height: viewport.height,
      deviceScaleFactor: scale,
      mobile: false,
    });
    await page.waitForTimeout(1500);
    return await fn();
  } finally {
    await session.send('Emulation.clearDeviceMetricsOverride').catch(() => {});
    await session.detach().catch(() => {});
    await page.setViewportSize(viewport);
    await page.waitForTimeout(800);
  }
}

const HEADER_BUTTON_MARGIN = 8;
const HOVER_WATCHED_BUTTON ='.yt-hider-blacklist-hover-wrapper .yt-hider-watched-btn';

async function captureHoverPill(page, extensionId, card) {
  const located = await evaluateInExtensionWorld(page, extensionId, locateCard, card.videoId);
  if (!located) return null;
  const { thumbnail } = located;
  const hoverPoints = [
    { x: thumbnail.x + thumbnail.width / 2, y: thumbnail.y + thumbnail.height + 30 },
    { x: thumbnail.x + thumbnail.width / 2, y: thumbnail.y + thumbnail.height * 0.75 },
    { x: thumbnail.x + thumbnail.width / 2, y: thumbnail.y + thumbnail.height / 2 },
  ];
  for (const point of hoverPoints) {
    for (let attempt = 0; attempt < 3; attempt++) {
      await parkMouse(page);
      await page.mouse.move(point.x, point.y, { steps: 8 });
      const shown = await page
        .waitForSelector(HOVER_WATCHED_BUTTON, { state: 'visible', timeout: 4000 })
        .then(() => true)
        .catch(() => false);
      if (!shown) {
        const state = await page.evaluate(({ x, y }) => {
          const wrapper = document.querySelector('.yt-hider-blacklist-hover-wrapper');
          const target = document.elementFromPoint(x, y);
          return {
            target: target ? `${target.tagName.toLowerCase()}.${String(target.className).slice(0, 60)}` : null,
            wrapper: wrapper
              ? `${wrapper.className} ${getComputedStyle(wrapper).visibility} ${getComputedStyle(wrapper).opacity}`
              : null,
          };
        }, point);
        console.warn(`Hover pill not shown at ${Math.round(point.x)},${Math.round(point.y)}: ${JSON.stringify(state)}`);
        continue;
      }
      await page.waitForTimeout(400);
      const button = await page.evaluate(selector => {
        const watched = document.querySelector(selector);
        const original = watched && watched.closest('.yt-hider-blacklist-hover-wrapper');
        if (!original) return null;
        const clone = original.cloneNode(true);
        const sources = [original, ...original.querySelectorAll('*')];
        const targets = [clone, ...clone.querySelectorAll('*')];
        sources.forEach((source, index) => {
          const computed = getComputedStyle(source);
          const target = targets[index];
          for (const property of computed) {
            target.style.setProperty(property, computed.getPropertyValue(property));
          }
          target.removeAttribute('class');
          target.removeAttribute('id');
        });
        const box = original.getBoundingClientRect();
        Object.assign(clone.style, {
          position: 'fixed',
          left: `${box.left}px`,
          top: `${box.top}px`,
          margin: '0',
          transform: 'none',
          transition: 'none',
          animation: 'none',
          zIndex: '2147483647',
        });
        clone.dataset.ytHiderShotClone = '1';
        document.body.appendChild(clone);
        const rect = watched.getBoundingClientRect();
        return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
      }, HOVER_WATCHED_BUTTON);
      if (!button) continue;
      const capture = await captureRegion(page, padRect(located.card, 16));
      await page.evaluate(() =>
        document.querySelectorAll('[data-yt-hider-shot-clone]').forEach(clone => clone.remove())
      );
      return { capture, button };
    }
  }
  return null;
}

async function captureMarkWatchedCard(page, extensionId, cards) {
  const candidates = cards.filter(card => card.videoId && !card.dimmed);
  const result = await withDeviceScale(page, 2, async () => {
    for (const card of candidates) {
      const hover = await captureHoverPill(page, extensionId, card);
      if (hover) return hover;
    }
    return null;
  });
  await parkMouse(page);
  if (!result) console.warn('The hover Watched button did not appear on any Home card');
  return result;
}

async function captureSettingsSlide(page) {
  await parkMouse(page);
  const gear = await getElementRect(page, '#yh-header-button-host');
  if (!gear) {
    throw new Error('The YouTube Hider header button is not on the page');
  }
  await page.mouse.click(gear.x + gear.width / 2, gear.y + gear.height / 2);

  const deadline = Date.now() + 15000;
  let frame = null;
  while (!frame && Date.now() < deadline) {
    frame = page.frames().find(item => item.url().includes('/popup/popup.html'));
    if (!frame) await page.waitForTimeout(250);
  }
  if (!frame) {
    throw new Error('The settings dropdown did not open');
  }
  await frame.waitForSelector('.setting-card', { timeout: 15000 });
  await page.waitForTimeout(1000);
  await parkMouse(page);
  const dropdown = await (await frame.frameElement()).boundingBox();

  const clientWidth = await getClientWidth(page);
  const center = dropdown.x + dropdown.width / 2;
  const halfWidth = Math.floor(Math.min(center, clientWidth - center));
  const region = {
    x: Math.round(center - halfWidth),
    y: 0,
    width: halfWidth * 2,
    height: Math.round(Math.min(VIEWPORT.height, dropdown.y + dropdown.height + 24)),
  };
  const capture = await captureRegion(page, region);
  await page.keyboard.press('Escape');

  const { panel, map } = fitCapture(capture, STAGE);
  const gearSize = gear.width - HEADER_BUTTON_MARGIN;
  const gearButton = {
    x: gear.x,
    y: gear.y + (gear.height - gearSize) / 2,
    width: gearSize,
    height: gearSize,
  };
  const ring = padRect(map(gearButton), 2);
  const dropdownBox = map(dropdown);
  const labelCenter = (dropdownBox.x + dropdownBox.width + panel.x + panel.width) / 2;
  const labelDx = labelCenter - (ring.x + ring.width / 2);
  return {
    file: '3-settings.png',
    title: 'All settings, <em>right inside YouTube</em>',
    subtitle: "Open the menu from YouTube's header and tune every filter without leaving the page.",
    panels: [panel],
    callouts: [callout('Open settings', ring, labelDx, Math.max(130, Math.abs(labelDx)))],
  };
}

async function captureBeforeAfterSlide(page, serviceWorker) {
  await applySettings(serviceWorker, BEFORE_AFTER_SETTINGS, { markedWatched: [] });
  await page.setViewportSize(BEFORE_AFTER_VIEWPORT);
  try {
    await waitForYouTubeHome(page);

    const findShortsShelf = () =>
      page.evaluate(() => {
        const link = document.querySelector(
          'ytd-rich-section-renderer a[href^="/shorts/"], ytd-rich-shelf-renderer a[href^="/shorts/"]'
        );
        const shelf =
          link && (link.closest('ytd-rich-section-renderer') || link.closest('ytd-rich-shelf-renderer'));
        return shelf ? shelf.getBoundingClientRect().top + window.scrollY : null;
      });
    let shelfTop = await findShortsShelf();
    if (shelfTop === null) {
      await page.evaluate(() => window.scrollBy(0, 1600));
      await page.waitForTimeout(2500);
      shelfTop = await findShortsShelf();
    }
    if (shelfTop === null) {
      console.warn('No Shorts shelf found on the Home page, the before/after shows the top of the feed');
      await page.evaluate(() => window.scrollTo(0, 0));
    } else {
      await page.evaluate(top => window.scrollTo(0, Math.max(0, top - 330)), shelfTop);
    }
    await page.waitForTimeout(2000);
    await waitForVisibleImages(page);
    await parkMouse(page);

    const clientWidth = await getClientWidth(page);
    const half = (STAGE.width - SPLIT_GAP) / 2;
    const leftArea = { x: STAGE.x, y: STAGE.y + TAG_SPACE, width: half, height: STAGE.height - TAG_SPACE };
    const rightArea = { ...leftArea, x: STAGE.x + half + SPLIT_GAP };
    const region = regionForArea(leftArea, {
      x: 0,
      y: 0,
      width: clientWidth,
      height: BEFORE_AFTER_VIEWPORT.height,
    });
    const before = await captureRegion(page, region);

    await applySettings(serviceWorker, { extensionEnabled: true });
    await page.waitForTimeout(3000);
    await waitForVisibleImages(page);
    await parkMouse(page);
    const after = await captureRegion(page, region);

    return {
      file: '2-before-after.png',
      title: 'Shorts gone, <em>feed cleaned up</em>',
      subtitle: 'The same YouTube Home page, before and after turning YouTube Hider on.',
      panels: [
        fitCapture(before, leftArea, { text: 'Before' }).panel,
        fitCapture(after, rightArea, { text: 'With YouTube Hider', accent: true }).panel,
      ],
    };
  } finally {
    await page.setViewportSize(VIEWPORT);
  }
}

const MANAGE_LIST_ID = 'channel-whitelist';
const INSET_MARGIN = 24;

async function captureInlineButtons(page, homeCards) {
  const video =
    homeCards.find(card => card.videoId && !card.dimmed && card.views !== null) ||
    homeCards.find(card => card.videoId);
  if (!video) {
    throw new Error('No video on the Home page to open for the watch page screenshot');
  }
  await page.goto(`https://www.youtube.com/watch?v=${video.videoId}&hl=en`, {
    waitUntil: 'domcontentloaded',
  });
  await ensureSignedIn(page);
  await page.addStyleTag({ content: YOUTUBE_CLEANUP_CSS });
  await waitForVideoPlayback(page);
  await page.waitForSelector('#yt-hider-inline-blacklist-btn', { timeout: 20000 });
  await page.waitForTimeout(2500);
  await page.evaluate(() =>
    document.querySelector('#yt-hider-inline-blacklist-btn').scrollIntoView({ block: 'center' })
  );
  await parkMouse(page);

  return withDeviceScale(page, 2, async () => {
    const rects = await Promise.all(
      ['ytd-watch-metadata #owner', '#yt-hider-inline-whitelist-btn', '#yt-hider-inline-blacklist-btn'].map(selector =>
        getElementRect(page, selector)
      )
    );
    const [owner, whitelist, blacklist] = rects;
    if (!whitelist || !blacklist) throw new Error('The inline Whitelist and Blacklist buttons are not visible');
    const parts = [owner, whitelist, blacklist].filter(Boolean);
    const left = Math.min(...parts.map(rect => rect.x)) - 14;
    const top = Math.min(...parts.map(rect => rect.y)) - 12;
    const right = Math.max(...parts.map(rect => rect.x + rect.width)) + 14;
    const bottom = Math.max(...parts.map(rect => rect.y + rect.height)) + 12;
    const capture = await captureRegion(page, {
      x: Math.round(left),
      y: Math.round(top),
      width: Math.round(right - left),
      height: Math.round(bottom - top),
    });
    return { capture, whitelist, blacklist };
  });
}

async function captureManagePage(context, serviceWorker, extensionId) {
  await applySettings(
    serviceWorker,
    { channelWhitelistEnabled: true, channelBlacklistEnabled: true, titleWhitelistEnabled: true, titleBlacklistEnabled: true },
    buildListsSample()
  );
  const managerPage = await context.newPage();
  try {
    await managerPage.setViewportSize({ width: STAGE.width, height: STAGE.height });
    await managerPage.goto(`chrome-extension://${extensionId}/popup/manage.html#${MANAGE_LIST_ID}`);
    await managerPage.waitForSelector(`#panel-${MANAGE_LIST_ID} .item-row`);
    await managerPage.fill(`#add-input-${MANAGE_LIST_ID}`, LIST_SAMPLE_PASTE);
    await managerPage.waitForSelector(`#panel-${MANAGE_LIST_ID} .add-preview li`);
    await managerPage.evaluate(() => {
      document.activeElement.blur();
      window.scrollTo(0, document.querySelector('.manage-tabs-bar').offsetTop);
    });
    await managerPage.waitForTimeout(500);
    const preview = await getElementRect(managerPage, `#panel-${MANAGE_LIST_ID} .add-preview`);
    const capture = await captureRegion(managerPage, { x: 0, y: 0, width: STAGE.width, height: STAGE.height });
    return { capture, preview };
  } finally {
    await managerPage.close();
    await applySettings(serviceWorker, null, BASE_LOCAL_SETTINGS);
  }
}

async function captureChannelsSlide(context, page, serviceWorker, extensionId, homeCards) {
  await applySettings(
    serviceWorker,
    { ...DIMMING_RESET_SETTINGS, extensionEnabled: true, dimMode: true },
    { markedWatched: [] }
  );
  const inline = await captureInlineButtons(page, homeCards);
  const manage = await captureManagePage(context, serviceWorker, extensionId);

  const managed = fitCapture(manage.capture, STAGE);
  const insetArea = {
    x: STAGE.x + STAGE.width - inline.capture.region.width - INSET_MARGIN,
    y: STAGE.y + STAGE.height - inline.capture.region.height - INSET_MARGIN,
    width: inline.capture.region.width,
    height: inline.capture.region.height,
  };
  const inset = fitCapture(inline.capture, insetArea);
  const buttons = {
    x: inline.whitelist.x,
    y: Math.min(inline.whitelist.y, inline.blacklist.y),
    width: inline.blacklist.x + inline.blacklist.width - inline.whitelist.x,
    height: Math.max(inline.whitelist.height, inline.blacklist.height),
  };
  const rings = [padRect(managed.map(manage.preview), 6), padRect(inset.map(buttons), 5)];
  const callouts = [
    callout('Paste many, see what changes first', rings[0], 330, 0),
    callout('Or add them from YouTube', rings[1], 0, -80),
  ];
  return {
    file: '4-channels.png',
    title: 'Your channels, <em>your rules</em>',
    subtitle: 'Whitelist or blacklist channels from YouTube, then manage thousands of them on one page.',
    panels: [managed.panel, inset.panel],
    rings,
    callouts,
  };
}

async function captureMarkWatchedSlide(context, serviceWorker, extensionId, hover) {
  await applySettings(serviceWorker, null, await buildManagerSample());
  const managerPage = await context.newPage();
  let manager;
  try {
    await managerPage.setViewportSize(VIEWPORT);
    await managerPage.goto(`chrome-extension://${extensionId}/popup/manage.html#marked-watched`);
    await managerPage.waitForSelector('#panel-marked-watched .item-row');
    await managerPage.waitForFunction(() =>
      Array.from(document.images).every(img => img.complete && img.naturalWidth > 0)
    );
    await managerPage.waitForTimeout(300);
    const main = await getElementRect(managerPage, '.manage-main');
    const rightArea = { x: 600, y: STAGE.y, width: STAGE.x + STAGE.width - 600, height: STAGE.height };
    const region = regionForArea(
      rightArea,
      { x: 0, y: 0, width: main.width + 48, height: VIEWPORT.height },
      { x: main.x - 24, y: 0 }
    );
    manager = await captureRegion(managerPage, region);
    manager.area = rightArea;
  } finally {
    await managerPage.close();
  }

  const slide = {
    file: '5-mark-watched.png',
    title: 'Mark any video <em>as watched</em>',
    subtitle: 'One click hides it, even without a progress bar. Your list syncs across your computers.',
    panels: [],
    rings: [],
    callouts: [],
  };

  if (hover) {
    const leftArea = { x: STAGE.x, y: STAGE.y + 90, width: 520, height: STAGE.height - 90 };
    const { panel, map } = fitCapture(hover.capture, leftArea);
    slide.panels.push(panel);
    const ring = padRect(map(hover.button), 5);
    slide.rings.push(ring);
    slide.callouts.push(callout('One click', ring, 0, -90));
    slide.panels.push(fitCapture(manager, manager.area).panel);
  } else {
    slide.panels.push(fitCapture(manager, STAGE).panel);
  }
  return slide;
}

async function forceYouTubeLanguage(context) {
  const cookies = await context.cookies('https://www.youtube.com');
  const pref = cookies.find(cookie => cookie.name === 'PREF');
  const params = new URLSearchParams(pref ? pref.value : '');
  params.set('hl', 'en');
  await context.addCookies([
    {
      name: 'PREF',
      value: params.toString(),
      domain: '.youtube.com',
      path: '/',
      expires: pref && pref.expires > 0 ? pref.expires : Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60,
      secure: true,
      sameSite: 'Lax',
    },
  ]);
}

async function loadLadders(context, extensionId) {
  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/popup/popup.html?standalone=true`);
  const ladders = await page.evaluate(() => ({ viewsSteps, dateNewerSteps }));
  await page.close();
  return ladders;
}

async function runLogin(context, serviceWorker) {
  await applySettings(serviceWorker, { tutorialCompleted: true });
  const page = context.pages()[0] ?? (await context.newPage());
  await page.goto(YOUTUBE_HOME_URL);
  console.log(`Sign in to YouTube in the browser window, then close it. Profile: ${PROFILE_DIR}`);
  await new Promise(resolve => context.on('close', resolve));
}

async function main() {
  const context = await launchBrowser();
  try {
    const serviceWorker = await getServiceWorker(context);
    const extensionId = new URL(serviceWorker.url()).hostname;

    if (process.argv.includes('--login')) {
      await runLogin(context, serviceWorker);
      return;
    }

    for (const dir of [OUTPUT_DIR, PROMO_DIR]) {
      fs.mkdirSync(dir, { recursive: true });
      fs.readdirSync(dir)
        .filter(name => name.endsWith('.png'))
        .forEach(name => fs.rmSync(path.join(dir, name)));
    }
    await applyBaseSettings(serviceWorker);
    await forceYouTubeLanguage(context);
    const ladders = await loadLadders(context, extensionId);
    const page = context.pages()[0] ?? (await context.newPage());
    await page.bringToFront();

    await waitForYouTubeHome(page);
    const homeCards = await applyDimmingPlan(page, serviceWorker, extensionId, ladders, 'Home');
    const homeSlide = await captureHomeSlide(page, extensionId, homeCards);
    const badgeTemplate = await extractBadgeTemplate(page);
    const hover = await captureMarkWatchedCard(page, extensionId, homeCards);
    const settingsSlide = await captureSettingsSlide(page);
    const beforeAfterSlide = await captureBeforeAfterSlide(page, serviceWorker);
    const channelsSlide = await captureChannelsSlide(context, page, serviceWorker, extensionId, homeCards);
    const markWatchedSlide = await captureMarkWatchedSlide(context, serviceWorker, extensionId, hover);

    for (const slide of [homeSlide, beforeAfterSlide, settingsSlide, channelsSlide, markWatchedSlide]) {
      await renderSlide(context, slide);
    }

    const popupPanel = await capturePopupPanel(context, serviceWorker, extensionId);
    await renderImage(context, buildSmallTileHtml(popupPanel), SMALL_TILE, path.join(PROMO_DIR, 'small-tile.png'));
    await renderImage(
      context,
      buildMarqueeHtml(popupPanel, badgeTemplate),
      MARQUEE,
      path.join(PROMO_DIR, 'marquee.png')
    );

    console.log(`Store screenshots written to ${OUTPUT_DIR}, promo tiles to ${PROMO_DIR}`);
  } finally {
    await context.close().catch(() => {});
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
