const { chromium } = require('playwright');

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.type(), msg.text()));
  page.on('pageerror', err => console.error('BROWSER ERROR:', err));

  console.log('Loading page...');
  await page.goto('http://127.0.0.1:8788/', { waitUntil: 'domcontentloaded' });
  
  // Wait for loading screen to disappear
  await page.waitForFunction(() => !document.getElementById('load'), { timeout: 60000 });
  console.log('Page loaded (#load removed)!');

  // Take screenshot at walk = 0
  await page.screenshot({ path: 'public/screenshots/user-experience-walk0.png' });

  const info = await page.evaluate(() => {
    return {
      walk: window.VAULT?.walk?.t,
      mode: window.VAULT?.state?.mode,
      consentModalExists: Boolean(document.getElementById('sec-doc-container')),
      cameraHudExists: Boolean(document.getElementById('vault-camera-hud')),
      hintText: document.getElementById('hint')?.textContent,
      hintVisible: document.getElementById('hint')?.style?.opacity,
    };
  });
  console.log('Page Info at start:', info);

  await browser.close();
}

main().catch(console.error);
