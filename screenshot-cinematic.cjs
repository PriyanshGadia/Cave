const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }});
  page.on('console', msg => console.log('BROWSER: ' + msg.text()));
  
  await page.goto('http://localhost:3000/about.html', { timeout: 120000, waitUntil: 'domcontentloaded' });
  
  console.log("Waiting for cinematic to load...");
  
  // Wait for armor to be ready
  await page.waitForFunction(() => window.__ARMOR_READY === true, { timeout: 60000 });
  
  // Wait at least 2 rAF cycles
  await page.evaluate(() => new Promise(resolve => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  }));
  
  await page.waitForTimeout(2000); // extra wait for shaders/animations to stabilize
  
  const captures = [0, 10, 20, 30, 45, 60, 75, 85, 95, 100];
  
  for (const percent of captures) {
    console.log(`Capturing scroll ${percent}%`);
    await page.evaluate((p) => {
      window.scrollTo(0, document.body.scrollHeight * (p / 100));
    }, percent);
    await page.waitForTimeout(1000); // wait for scroll animation
    await page.screenshot({ path: `cinematic_${percent}.png` });
  }

  await browser.close();
  console.log('Screenshots saved');
})();
