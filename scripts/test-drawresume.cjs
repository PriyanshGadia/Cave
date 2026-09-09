const { chromium } = require('playwright');

async function testDrawResume() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.goto('http://localhost:8000/index.html?lab&boot=skip');
  await page.waitForFunction('window.__lab && window.__lab.state && window.__lab.state.ready');
  await page.waitForTimeout(500);
  await page.evaluate(() => window.__lab.focusSector('RS2'));
  await page.waitForFunction('window.__lab && window.__lab.state && window.__lab.state.focusE >= 0.99');
  await page.waitForTimeout(400);

  // In this test: remove paperMesh completely from scene, but keep PRINT.active and run drawResume every frame!
  await page.evaluate(() => {
    const lab = window.__lab;
    if (lab.paperMesh) {
      lab.paperMesh.parent.remove(lab.paperMesh);
      // But don't set lab.paperMesh to null so update still runs, OR hook update!
    }
  });

  // Trigger print via evaluate
  await page.evaluate(() => {
    window.__lab.triggerPrint();
  });
  await page.waitForTimeout(400); // mid-print

  await page.screenshot({ path: 'public/screenshots/test-drawresume-only.png' });
  console.log('Captured test-drawresume-only.png');
  await browser.close();
}

testDrawResume();
