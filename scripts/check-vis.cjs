const { chromium } = require('playwright');

async function checkVis() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('http://localhost:8000/index.html?lab&boot=skip');
  await page.waitForFunction('window.__lab && window.__lab.state && window.__lab.state.ready');
  await page.waitForTimeout(500);

  const vis1 = await page.evaluate(() => window.__lab.paperMesh ? window.__lab.paperMesh.visible : 'no-mesh');
  console.log('Visibility after load:', vis1);

  await page.evaluate(() => window.__lab.focusSector('RS2'));
  await page.waitForFunction('window.__lab && window.__lab.state && window.__lab.state.focusE >= 0.99');
  await page.waitForTimeout(400);

  const vis2 = await page.evaluate(() => window.__lab.paperMesh ? window.__lab.paperMesh.visible : 'no-mesh');
  console.log('Visibility after RS2 focus:', vis2);

  await browser.close();
}

checkVis();
