const { chromium } = require('playwright');

async function listPasses() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('http://localhost:8000/index.html?lab&boot=skip');
  await page.waitForFunction('window.__lab && window.__lab.state && window.__lab.state.ready');
  await page.waitForTimeout(500);

  const passes = await page.evaluate(() => {
    const comp = window.__lab.composer;
    return comp.passes.map(p => ({
      name: p.constructor.name,
      enabled: p.enabled,
      needsSwap: p.needsSwap,
      renderToScreen: p.renderToScreen
    }));
  });

  console.log('Composer Passes:', JSON.stringify(passes, null, 2));
  await browser.close();
}

listPasses();
