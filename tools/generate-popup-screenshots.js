const { chromium } = require('playwright-core');
const path = require('path');
const fs = require('fs');
const os = require('os');

const EXTENSION_PATH = path.resolve(__dirname, '..');
const OUTPUT_DIR = path.join(EXTENSION_PATH, 'docs', 'assets', 'images');
const PROFILE_DIR = path.join(os.tmpdir(), `yt-hider-screenshot-${Date.now()}`);

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
