const { chromium } = require('playwright');
const fs = require('fs');

async function check() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('http://localhost:8000/index.html?lab&boot=skip');
  await page.waitForFunction('window.__lab && window.__lab.state && window.__lab.state.ready');
  await page.waitForTimeout(500);

  await page.evaluate(() => window.__lab.focusSector('RS2'));
  await page.waitForFunction('window.__lab && window.__lab.state && window.__lab.state.focusE >= 0.99');
  await page.waitForTimeout(400);

  // Capture resumeCanvas directly as image BEFORE print
  const dataUrl = await page.evaluate(() => {
    const lab = window.__lab;
    const g = lab.sectorGroups['RS2'];
    const scrMesh = g.children.find(c => c.geometry && c.geometry.parameters && c.geometry.parameters.width === 0.58);
    return scrMesh.material.map.image.toDataURL('image/png');
  });

  const base64 = dataUrl.replace(/^data:image\/png;base64,/, '');
  fs.writeFileSync('public/screenshots/canvas-before-print.png', Buffer.from(base64, 'base64'));
  console.log('Saved canvas-before-print.png');
  await browser.close();
}

check();
