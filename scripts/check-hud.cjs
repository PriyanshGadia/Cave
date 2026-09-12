const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ['--use-gl=angle', '--use-angle=d3d11', '--enable-webgl']
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  await page.goto('http://localhost:3000/index.html');
  await page.waitForTimeout(2000);

  // Press 'd' to show HUD
  await page.keyboard.press('d');
  await page.waitForTimeout(1000);

  const hudText = await page.$eval('#dbg', el => el.textContent);
  console.log('HUD text at walk=0:\n', hudText);
  await browser.close();
})();
