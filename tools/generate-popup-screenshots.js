const { chromium } = require('playwright-core');
const path = require('path');
const fs = require('fs');
const os = require('os');

const EXTENSION_PATH = path.resolve(__dirname, '..');
const OUTPUT_DIR = path.join(EXTENSION_PATH, 'docs', 'assets', 'images');
const PROFILE_DIR = path.join(os.tmpdir(), `yt-hider-screenshot-${Date.now()}`);

const MANAGER_SAMPLE_VIDEO_IDS = [
  'dQw4w9WgXcQ',
  'jNQXAC9IVRw',
  '9bZkp7q19f0',
  'kJQP7kiw5Fk',
  'fJ9rUzIMcZQ',
  'hT_nvWreIhg',
  'OPf0YbXqDm0',
  'JGwWNGJdvx8',
];
const MANAGER_SAMPLE_SPACING_SECONDS = 26 * 60 * 60;

async function fetchVideoDetails(videoId) {
  const url = `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(
    `https://www.youtube.com/watch?v=${videoId}`
  )}`;
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const data = await response.json();
    const handle = new URL(data.author_url).pathname.toLowerCase();
    return { title: data.title, channel: handle };
  } catch {
    return null;
  }
}

async function buildManagerSample() {
  const details = await Promise.all(MANAGER_SAMPLE_VIDEO_IDS.map(fetchVideoDetails));
  const videos = MANAGER_SAMPLE_VIDEO_IDS.map((id, index) => ({ id, details: details[index] })).filter(
    video => video.details
  );
  if (!videos.length) {
    throw new Error('Could not load any sample video details from YouTube oEmbed');
  }
  const now = Math.floor(Date.now() / 1000);
  const markedWatched = videos.map((video, index) => [
    video.id,
    now - (videos.length - index) * MANAGER_SAMPLE_SPACING_SECONDS,
  ]);
  const markedWatchedMeta = Object.fromEntries(
    videos.map(video => [video.id, [video.details.title, video.details.channel]])
  );
  return { markedWatched, markedWatchedMeta };
}

async function main() {
  const context = await chromium.launchPersistentContext(PROFILE_DIR, {
    headless: false,
    channel: 'chromium',
    viewport: { width: 410, height: 800 },
    args: [
      `--disable-extensions-except=${EXTENSION_PATH}`,
      `--load-extension=${EXTENSION_PATH}`,
      '--no-first-run',
    ],
  });

  try {
    const serviceWorker =
      context.serviceWorkers()[0] ??
      (await context.waitForEvent('serviceworker'));
    const extensionId = new URL(serviceWorker.url()).hostname;

    const page = await context.newPage();
    await page.goto(
      `chrome-extension://${extensionId}/popup/popup.html?standalone=true`
    );
    await page.waitForSelector('.setting-card');
    await page.waitForTimeout(300);

    await page.locator('body').screenshot({
      path: path.join(OUTPUT_DIR, 'full-easy.png'),
    });

    await page.evaluate(() => {
      document.getElementById('advanced-mode-enabled').click();
    });
    await page.waitForTimeout(300);

    await page.locator('body').screenshot({
      path: path.join(OUTPUT_DIR, 'full-no-easy.png'),
    });

    const managerSample = await buildManagerSample();
    await serviceWorker.evaluate(data => chrome.storage.local.set(data), managerSample);

    const managerPage = await context.newPage();
    await managerPage.setViewportSize({ width: 900, height: 600 });
    await managerPage.goto(`chrome-extension://${extensionId}/popup/watched.html`);
    await managerPage.waitForSelector('.watched-item');
    await managerPage.waitForFunction(() =>
      Array.from(document.images).every(img => img.complete && img.naturalWidth > 0)
    );
    await managerPage.waitForTimeout(300);

    await managerPage.screenshot({
      path: path.join(OUTPUT_DIR, 'watched-manager.png'),
      fullPage: true,
    });

    console.log(`Screenshots written to ${OUTPUT_DIR}`);
  } finally {
    await context.close();
    fs.rmSync(PROFILE_DIR, { recursive: true, force: true });
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
