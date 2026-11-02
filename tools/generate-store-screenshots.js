const { chromium } = require('playwright-core');
const http = require('http');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { buildManagerSample } = require('./screenshot-utils');

const EXTENSION_PATH = path.resolve(__dirname, '..');
const OUTPUT_DIR = path.join(EXTENSION_PATH, 'store-listing', 'screenshots');
const SITE_DIR = path.join(EXTENSION_PATH, 'docs');
const PROFILE_DIR = path.join(process.env.LOCALAPPDATA || os.homedir(), 'yt-hider-screenshot-profile');
const VIEWPORT = { width: 1280, height: 800 };
const UI_LOCALE = 'en-US';
const YOUTUBE_HOME_URL = 'https://www.youtube.com/?hl=en';

const BASE_SETTINGS = {
  tutorialCompleted: true,
  dimMode: true,
  hideThreshold: 100,
  viewsHideThreshold: 0,
  viewsHideMaxThreshold: 0,
  dateFilterNewerThreshold: 0,
  dateFilterOlderThreshold: 0,
  dateFilterHomeEnabled: true,
  titleWhitelist: [],
  titleBlacklist: [],
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
  ytd-rich-section-renderer,
  ytd-statement-banner-renderer,
  ytd-banner-promo-renderer,
  ytd-popup-container {
    display: none !important;
  }
`;

const SITE_CSS = `
  .fb-widget { display: none !important; }
  .hero { padding-right: 464px; }
`;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain',
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

function planDimming(cards, ladders) {
  const target = Math.ceil(cards.length / 2);
  const taken = new Set(cards.filter(card => card.dimmed).map(card => card.videoId));
  const plan = { sync: {}, marked: [] };

  const applyRule = (candidates, matches, budget, onMatch) => {
    const remaining = target - taken.size;
    if (remaining <= 0) return false;
    for (const value of candidates) {
      const hits = cards.filter(card => matches(card, value));
      if (!hits.length) continue;
      if (hits.length > Math.min(budget, remaining) || hits.some(card => taken.has(card.videoId))) {
        return false;
      }
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
    ladders.dateNewerSteps.filter(value => value > 0),
    (card, value) => card.ageDays !== null && card.ageDays < value,
    1,
    value => {
      plan.sync.dateFilterNewerThreshold = value;
    }
  );

  applyRule(
    ladders.viewsSteps.filter(value => value > 0),
    (card, value) => card.views !== null && card.views < value,
    1,
    value => {
      plan.sync.viewsHideThreshold = value;
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

async function waitForYouTubeHome(page) {
  await page.goto(YOUTUBE_HOME_URL, { waitUntil: 'domcontentloaded' });
  const account = await page
    .waitForSelector('#avatar-btn, ytd-masthead a[href*="ServiceLogin"]', { timeout: 30000 })
    .catch(() => null);
  if (!account || (await account.getAttribute('id')) !== 'avatar-btn') {
    throw new Error('Not signed in to YouTube. Run "npm run screenshots:store:login" first.');
  }
  await page.waitForSelector('ytd-rich-grid-renderer ytd-rich-item-renderer', { timeout: 30000 });
  await page.addStyleTag({ content: YOUTUBE_CLEANUP_CSS });
  await page.waitForTimeout(2500);
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

async function parkMouse(page) {
  await page.mouse.move(260, 28);
  await page.waitForTimeout(300);
}

async function captureHome(page, serviceWorker, extensionId, ladders) {
  await waitForYouTubeHome(page);

  const cards = await evaluateInExtensionWorld(page, extensionId, inspectVisibleCards);
  if (!cards.length) {
    throw new Error('No video cards found on the YouTube Home page');
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

  console.log('Home cards:');
  result.forEach(card => {
    console.log(`  ${card.dimmed ? `[${card.reason}]` : '[visible]'} ${card.title || card.videoId}`);
  });
  console.log('Settings used:', JSON.stringify(plan.sync));

  await page.bringToFront();
  await parkMouse(page);
  await saveScreenshot(page, '1-home.png');
}

async function captureWelcome(page, serviceWorker) {
  await applySettings(serviceWorker, { tutorialCompleted: false });
  await waitForYouTubeHome(page);
  await page.waitForSelector('#yh-tutorial-host', { state: 'attached', timeout: 15000 });
  await page.waitForTimeout(5500);
  await page.bringToFront();
  await parkMouse(page);
  await saveScreenshot(page, '2-welcome.png');
  await applySettings(serviceWorker, { tutorialCompleted: true });
}

function startStaticServer(rootDir) {
  const server = http.createServer((request, response) => {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const filePath = path.join(rootDir, pathname === '/' ? 'index.html' : pathname);
    if (!filePath.startsWith(rootDir)) {
      response.writeHead(403);
      response.end();
      return;
    }
    fs.readFile(filePath, (error, data) => {
      if (error) {
        response.writeHead(404);
        response.end();
        return;
      }
      response.writeHead(200, {
        'Content-Type': MIME_TYPES[path.extname(filePath)] || 'application/octet-stream',
      });
      response.end(data);
    });
  });
  return new Promise(resolve => {
    server.listen(0, '127.0.0.1', () => {
      resolve({
        url: `http://127.0.0.1:${server.address().port}`,
        close: () => server.close(),
      });
    });
  });
}

async function capturePopupOverSite(context, extensionId) {
  const server = await startStaticServer(SITE_DIR);
  try {
    const sitePage = await context.newPage();
    await sitePage.goto(`${server.url}/index.html`, { waitUntil: 'load' });
    await sitePage.addStyleTag({ content: SITE_CSS });
    await sitePage.evaluate(() => document.fonts.ready.then(() => true));
    await sitePage.waitForTimeout(2500);

    const navBottom = await sitePage.evaluate(() =>
      Math.ceil(document.querySelector('nav').getBoundingClientRect().bottom)
    );
    const panelTop = navBottom + 16;
    const panelHeight = VIEWPORT.height - panelTop - 24;

    const popupPage = await context.newPage();
    await popupPage.setViewportSize({ width: 400, height: panelHeight });
    await popupPage.goto(`chrome-extension://${extensionId}/popup/popup.html?standalone=true`);
    await popupPage.waitForSelector('.setting-card');
    await popupPage.waitForTimeout(500);
    const popupImage = await popupPage.screenshot();
    await popupPage.close();

    await sitePage.evaluate(
      ({ src, top }) => {
        const panel = document.createElement('img');
        panel.src = src;
        Object.assign(panel.style, {
          position: 'fixed',
          top: `${top}px`,
          right: '24px',
          width: '400px',
          border: '1px solid #3a3a3a',
          borderRadius: '8px',
          boxShadow: '0 24px 64px rgba(0, 0, 0, 0.6)',
          zIndex: '2147483647',
        });
        document.body.appendChild(panel);
        return panel.decode();
      },
      { src: `data:image/png;base64,${popupImage.toString('base64')}`, top: panelTop }
    );

    await sitePage.bringToFront();
    await saveScreenshot(sitePage, '3-popup.png');
    await sitePage.close();
  } finally {
    server.close();
  }
}

async function captureManager(context, serviceWorker, extensionId) {
  await applySettings(serviceWorker, null, await buildManagerSample());
  const managerPage = await context.newPage();
  await managerPage.goto(`chrome-extension://${extensionId}/popup/watched.html`);
  await managerPage.waitForSelector('.watched-item');
  await managerPage.waitForFunction(() =>
    Array.from(document.images).every(img => img.complete && img.naturalWidth > 0)
  );
  await managerPage.waitForTimeout(300);
  await managerPage.bringToFront();
  await saveScreenshot(managerPage, '4-manage.png');
  await managerPage.close();
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
    await applyBaseSettings(serviceWorker);
    const ladders = await loadLadders(context, extensionId);
    const page = context.pages()[0] ?? (await context.newPage());

    await captureHome(page, serviceWorker, extensionId, ladders);
    await captureWelcome(page, serviceWorker);
    await capturePopupOverSite(context, extensionId);
    await captureManager(context, serviceWorker, extensionId);

    console.log(`Store screenshots written to ${OUTPUT_DIR}`);
  } finally {
    await context.close().catch(() => {});
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
