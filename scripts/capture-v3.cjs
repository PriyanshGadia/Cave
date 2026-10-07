const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function run() {
  console.log('=== [CAPTURING V3 REDESIGNED PORTFOLIO] ===');
  const browser = await chromium.launch({
    headless: true,
    args: ['--use-gl=angle', '--use-angle=gl', '--enable-webgl', '--ignore-gpu-blocklist']
  });

  const brainDir = 'C:/Users/gadia/.gemini/antigravity-ide/brain/5e3c0a45-c3f3-49e8-8c30-eccd6f3eac75';

  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2
  });

  console.log('Navigating to http://localhost:8788/about ...');
  await page.goto('http://localhost:8788/about', { waitUntil: 'networkidle', timeout: 20000 });
  await page.waitForTimeout(600);

  // 1. Capture Hero Section with mouse position over the portrait stage to test lighting
  await page.mouse.move(1050, 420);
  await page.waitForTimeout(300);
  const heroPath = path.join(brainDir, 'about_hero_v3.png');
  await page.screenshot({ path: heroPath, clip: { x: 0, y: 0, width: 1440, height: 900 } });
  console.log('Saved:', heroPath);

  // 2. Scroll to Duality & Systems
  await page.evaluate(() => window.scrollTo(0, 850));
  await page.waitForTimeout(400);
  const dualityPath = path.join(brainDir, 'about_duality_v3.png');
  await page.screenshot({ path: dualityPath, clip: { x: 0, y: 0, width: 1440, height: 900 } });
  console.log('Saved:', dualityPath);

  // 3. Scroll to Systems Deck with interactive drawer open
  await page.evaluate(() => window.scrollTo(0, 1600));
  await page.waitForTimeout(400);
  const systemsPath = path.join(brainDir, 'about_systems_v3.png');
  await page.screenshot({ path: systemsPath, clip: { x: 0, y: 0, width: 1440, height: 900 } });
  console.log('Saved:', systemsPath);

  // 4. Scroll to Sound & Atmosphere
  await page.evaluate(() => window.scrollTo(0, 2400));
  await page.waitForTimeout(300);
  // Trigger bansuri
  const btnBansuri = page.locator('#btnBansuri');
  if (await btnBansuri.isVisible()) {
    await btnBansuri.click();
    await page.waitForTimeout(400);
  }
  const soundPath = path.join(brainDir, 'about_sound_v3.png');
  await page.screenshot({ path: soundPath, clip: { x: 0, y: 0, width: 1440, height: 900 } });
  console.log('Saved:', soundPath);

  // 5. Full Page
  const fullPath = path.join(brainDir, 'about_full_v3.png');
  await page.screenshot({ path: fullPath, fullPage: true });
  console.log('Saved:', fullPath);

  await browser.close();
  console.log('=== [CAPTURE COMPLETE] ===');
}

run().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
