const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1
  });

  const consoleLogs = [];
  page.on('console', msg => {
    if (msg.type() === 'warning' || msg.type() === 'error') {
      consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
    }
  });

  await page.goto('http://127.0.0.1:8788/about.html', { waitUntil: 'networkidle' });

  // wait for engine to initialize
  await page.waitForTimeout(2000);

  // set walk=0
  await page.evaluate(() => {
    if (window.engine && window.engine.sm) {
       window.setCinematicProgress(0.0);
    }
  });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(__dirname, 'screenshots', 'forge_walk_0.png') });
  console.log('Took screenshot at walk=0');

  // set walk=1
  await page.evaluate(() => {
    if (window.engine && window.engine.sm) {
       window.setCinematicProgress(1.0);
    }
  });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(__dirname, 'screenshots', 'forge_walk_1.png') });
  console.log('Took screenshot at walk=1');

  // Vault granted event
  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent('vault:granted'));
  });
  
  await page.waitForTimeout(2800);
  await page.screenshot({ path: path.join(__dirname, 'screenshots', 'forge_vault_2_8s.png') });
  console.log('Took screenshot at +2.8s');

  await page.waitForTimeout(2200); // 2.8 + 2.2 = 5.0
  await page.screenshot({ path: path.join(__dirname, 'screenshots', 'forge_vault_5_0s.png') });
  console.log('Took screenshot at +5.0s');

  await page.waitForTimeout(4000); // 5.0 + 4.0 = 9.0
  await page.screenshot({ path: path.join(__dirname, 'screenshots', 'forge_vault_9_0s.png') });
  console.log('Took screenshot at +9.0s');

  await page.waitForTimeout(3500); // 9.0 + 3.5 = 12.5
  await page.screenshot({ path: path.join(__dirname, 'screenshots', 'forge_vault_12_5s.png') });
  console.log('Took screenshot at +12.5s');

  if (consoleLogs.length > 0) {
    console.log('Console warnings/errors detected:');
    consoleLogs.forEach(l => console.log(l));
  } else {
    console.log('Zero WebGL warnings in the console.');
  }

  await browser.close();
})();
