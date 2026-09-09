const { chromium } = require('playwright');
const fs = require('fs');

async function test() {
  const browser = await chromium.launch({
    headless: true,
    args: ['--use-gl=angle', '--use-angle=gl', '--enable-webgl', '--ignore-gpu-blocklist'],
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.goto('http://localhost:8000/index.html?lab&boot=skip');
  await page.waitForFunction('window.__lab && window.__lab.state && window.__lab.state.ready');
  await page.waitForTimeout(500);

  await page.evaluate(() => window.__lab.focusSector('RS2'));
  await page.waitForFunction('window.__lab && window.__lab.state && window.__lab.state.focusE >= 0.99');
  await page.waitForTimeout(400);

  // Take screenshot BEFORE print
  await page.screenshot({ path: 'public/screenshots/test-before-print.png' });

  // Now trigger print WITHOUT paperMesh visible
  await page.evaluate(() => {
    window.__lab.paperMesh.visible = false;
    window.__lab.triggerPrint();
    // Force paperMesh to stay hidden
    window.__lab.paperMesh.visible = false;
  });
  await page.waitForTimeout(400);

  // Take screenshot with paperMesh HIDDEN
  await page.screenshot({ path: 'public/screenshots/test-paper-hidden.png' });

  // Now set paperMesh visible
  await page.evaluate(() => {
    window.__lab.paperMesh.visible = true;
  });
  await page.waitForTimeout(100);
  await page.screenshot({ path: 'public/screenshots/test-paper-visible.png' });

  await browser.close();
  console.log('Screenshots captured!');
}

test();
