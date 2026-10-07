const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function run() {
  console.log('=== [CAPTURING NEW AESTHETIC /about PORTFOLIO] ===');
  const browser = await chromium.launch({
    headless: true,
    args: ['--use-gl=angle', '--use-angle=gl', '--enable-webgl', '--ignore-gpu-blocklist']
  });

  const brainDir = 'C:/Users/gadia/.gemini/antigravity-ide/brain/5e3c0a45-c3f3-49e8-8c30-eccd6f3eac75';

  // 1. Desktop 1440x900 viewport
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2
  });

  console.log('Navigating to http://localhost:8788/about ...');
  await page.goto('http://localhost:8788/about', { waitUntil: 'networkidle', timeout: 20000 });
  await page.waitForTimeout(600);

  // Capture Hero Section
  console.log('Capturing Hero Section...');
  const heroPath = path.join(brainDir, 'about_hero_redesigned.png');
  await page.screenshot({ path: heroPath, clip: { x: 0, y: 0, width: 1440, height: 900 } });
  console.log('Saved:', heroPath);

  // Scroll to Systems
  console.log('Capturing Systems / Works Section...');
  await page.evaluate(() => window.scrollTo(0, 1100));
  await page.waitForTimeout(400);
  const systemsPath = path.join(brainDir, 'about_systems_redesigned.png');
  await page.screenshot({ path: systemsPath, clip: { x: 0, y: 0, width: 1440, height: 900 } });
  console.log('Saved:', systemsPath);

  // Scroll to Craft & Sound
  console.log('Capturing Craft & Sound Section...');
  await page.evaluate(() => window.scrollTo(0, 1900));
  await page.waitForTimeout(400);

  // Click Bansuri
  const btnBansuri = page.locator('#btnBansuri');
  if (await btnBansuri.isVisible()) {
    await btnBansuri.click();
    await page.waitForTimeout(400);
  }
  const craftPath = path.join(brainDir, 'about_craft_redesigned.png');
  await page.screenshot({ path: craftPath, clip: { x: 0, y: 0, width: 1440, height: 900 } });
  console.log('Saved:', craftPath);

  // Full Page
  console.log('Capturing Full Page...');
  const fullPath = path.join(brainDir, 'about_full_redesigned.png');
  await page.screenshot({ path: fullPath, fullPage: true });
  console.log('Saved:', fullPath);

  // Mobile View
  const mobilePage = await browser.newPage({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2
  });
  await mobilePage.goto('http://localhost:8788/about', { waitUntil: 'networkidle', timeout: 20000 });
  await mobilePage.waitForTimeout(500);
  const mobileHeroPath = path.join(brainDir, 'about_mobile_hero.png');
  await mobilePage.screenshot({ path: mobileHeroPath, clip: { x: 0, y: 0, width: 390, height: 844 } });
  console.log('Saved:', mobileHeroPath);

  await browser.close();
  console.log('=== [CAPTURE COMPLETE] ===');
}

run().catch(err => {
  console.error('Capture error:', err);
  process.exit(1);
});
