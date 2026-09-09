const { chromium } = require('playwright');

async function test() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.goto('http://localhost:8000/index.html?lab&boot=skip');
  await page.waitForFunction('window.__lab && window.__lab.state && window.__lab.state.ready');
  await page.waitForTimeout(500);

  await page.evaluate(() => window.__lab.focusSector('RS2'));
  await page.waitForFunction('window.__lab && window.__lab.state && window.__lab.state.focusE >= 0.99');
  await page.waitForTimeout(400);

  // Remove paperMesh BEFORE print, don't trigger print!
  await page.evaluate(() => {
    const lab = window.__lab;
    if (lab.paperMesh) {
      lab.paperMesh.parent.remove(lab.paperMesh);
    }
  });
  await page.waitForTimeout(100);

  await page.screenshot({ path: 'public/screenshots/test-clean-before-print.png' });
  console.log('Saved test-clean-before-print.png');
  await browser.close();
}

test();
