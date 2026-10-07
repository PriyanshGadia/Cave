const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  page.on('console', msg => console.log('BROWSER:', msg.text()));
  
  await page.goto('http://localhost:3001/about.html?armorDebug=1', { timeout: 120000, waitUntil: 'domcontentloaded' });
  
  console.log("Waiting for window.__ARMOR_DEBUG_READY === true...");
  
  // Wait until our debug mode explicitly flags that rendering is complete
  await page.waitForFunction(() => window.__ARMOR_DEBUG_READY === true, { timeout: 60000 });
  
  console.log("Capturing debug_static_armor.png");
  await page.screenshot({ path: 'debug_static_armor.png' });
  
  await browser.close();
})();
