const { chromium } = require('playwright-core');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { buildManagerSample } = require('./screenshot-utils');

const EXTENSION_PATH = path.resolve(__dirname, '..');
const OUTPUT_DIR = path.join(EXTENSION_PATH, 'store-listing', 'screenshots');
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
  titleWhitelist: [],
  titleBlacklist: [],
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
  await page.waitForSelector('ytd-rich-grid-renderer ytd-rich-item-renderer', { timeout: 30000 });
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

async function renderSlide(context, slide) {
  const page = await context.newPage();
  try {
    await page.setViewportSize(VIEWPORT);
    await page.setContent(buildSlideHtml(slide), { waitUntil: 'load' });
    await page.waitForSelector('body[data-ready="1"]', { timeout: 15000 });
    await page.waitForTimeout(200);
    await saveScreenshot(page, slide.file);
  } finally {
    await page.close();
  }
}

async function saveScreenshot(page, fileName) {
  const filePath = path.join(OUTPUT_DIR, fileName);
  await page.screenshot({ path: filePath });
  const header = fs.readFileSync(filePath).subarray(0, 26);
  const width = header.readUInt32BE(16);
  const height = header.readUInt32BE(20);
  const colorType = header[25];
  if (width !== VIEWPORT.width || height !== VIEWPORT.height || colorType !== 2) {
    throw new Error(
      `${fileName} is ${width}x${height} with PNG color type ${colorType}, the Web Store needs ${VIEWPORT.width}x${VIEWPORT.height} without alpha`
    );
  }
  console.log(`Saved ${filePath}`);
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

const HOVER_WATCHED_BUTTON = '.yt-hider-blacklist-hover-wrapper .yt-hider-watched-btn';

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
  const ring = padRect(map(gear), 4);
  const dropdownBox = map(dropdown);
  const labelCenter = (dropdownBox.x + dropdownBox.width + panel.x + panel.width) / 2;
  const labelDx = labelCenter - (ring.x + ring.width / 2);
  return {
    file: '3-settings.png',
    title: 'All settings, <em>right inside YouTube</em>',
    subtitle: "Open the menu from YouTube's header and tune every filter without leaving the page.",
    panels: [panel],
    rings: [ring],
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

async function captureChannelsSlide(page, serviceWorker, extensionId, ladders, homeCards) {
  const video =
    homeCards.find(card => card.videoId && !card.dimmed && card.views !== null) ||
    homeCards.find(card => card.videoId);
  if (!video) {
    throw new Error('No video on the Home page to open for the watch page screenshot');
  }

  await applySettings(
    serviceWorker,
    { ...DIMMING_RESET_SETTINGS, extensionEnabled: true, dimMode: true },
    { markedWatched: [] }
  );
  await page.goto(`https://www.youtube.com/watch?v=${video.videoId}&hl=en`, {
    waitUntil: 'domcontentloaded',
  });
  await ensureSignedIn(page);
  await page.addStyleTag({ content: YOUTUBE_CLEANUP_CSS });
  await waitForVideoPlayback(page);
  await page.waitForSelector('#secondary yt-lockup-view-model, #secondary ytd-compact-video-renderer', {
    timeout: 30000,
  });
  await page.waitForSelector('#yt-hider-inline-blacklist-btn', { timeout: 20000 });
  await page.waitForTimeout(2500);
  await waitForVisibleImages(page);

  await applyDimmingPlan(page, serviceWorker, extensionId, ladders, 'Watch sidebar');

  const clientWidth = await getClientWidth(page);
  const region = regionForArea(STAGE, { x: 0, y: 0, width: clientWidth, height: VIEWPORT.height });
  let whitelist = await getElementRect(page, '#yt-hider-inline-whitelist-btn');
  const overflow = whitelist.y + whitelist.height + 28 - region.height;
  if (overflow > 0) {
    await page.evaluate(delta => window.scrollBy(0, delta), overflow);
    await page.waitForTimeout(800);
    whitelist = await getElementRect(page, '#yt-hider-inline-whitelist-btn');
  }
  const blacklist = await getElementRect(page, '#yt-hider-inline-blacklist-btn');

  await parkMouse(page);
  await page
    .waitForSelector('#movie_player.ytp-autohide', { timeout: 8000 })
    .catch(() => console.warn('The player controls did not hide'));
  const capture = await captureRegion(page, region);
  const { panel, map } = fitCapture(capture, STAGE);
  const whitelistRing = padRect(map(whitelist), 5);
  const blacklistRing = padRect(map(blacklist), 5);

  return {
    file: '4-channels.png',
    title: 'Your channels, <em>your rules</em>',
    subtitle: 'Whitelist a channel to never filter it, or blacklist it to hide it everywhere.',
    panels: [panel],
    rings: [whitelistRing, blacklistRing],
    callouts: [
      callout('Never filter this channel', whitelistRing, -180, -120),
      callout('Hide this channel everywhere', blacklistRing, 240, -95),
    ],
  };
}

async function captureMarkWatchedSlide(context, serviceWorker, extensionId, hover) {
  await applySettings(serviceWorker, null, await buildManagerSample());
  const managerPage = await context.newPage();
  let manager;
  try {
    await managerPage.setViewportSize(VIEWPORT);
    await managerPage.goto(`chrome-extension://${extensionId}/popup/watched.html`);
    await managerPage.waitForSelector('.watched-item');
    await managerPage.waitForFunction(() =>
      Array.from(document.images).every(img => img.complete && img.naturalWidth > 0)
    );
    await managerPage.waitForTimeout(300);
    const main = await getElementRect(managerPage, '.watched-main');
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

    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    fs.readdirSync(OUTPUT_DIR)
      .filter(name => name.endsWith('.png'))
      .forEach(name => fs.rmSync(path.join(OUTPUT_DIR, name)));
    await applyBaseSettings(serviceWorker);
    await forceYouTubeLanguage(context);
    const ladders = await loadLadders(context, extensionId);
    const page = context.pages()[0] ?? (await context.newPage());
    await page.bringToFront();

    await waitForYouTubeHome(page);
    const homeCards = await applyDimmingPlan(page, serviceWorker, extensionId, ladders, 'Home');
    const homeSlide = await captureHomeSlide(page, extensionId, homeCards);
    const hover = await captureMarkWatchedCard(page, extensionId, homeCards);
    const settingsSlide = await captureSettingsSlide(page);
    const beforeAfterSlide = await captureBeforeAfterSlide(page, serviceWorker);
    const channelsSlide = await captureChannelsSlide(page, serviceWorker, extensionId, ladders, homeCards);
    const markWatchedSlide = await captureMarkWatchedSlide(context, serviceWorker, extensionId, hover);

    for (const slide of [homeSlide, beforeAfterSlide, settingsSlide, channelsSlide, markWatchedSlide]) {
      await renderSlide(context, slide);
    }

    console.log(`Store screenshots written to ${OUTPUT_DIR}`);
  } finally {
    await context.close().catch(() => {});
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
