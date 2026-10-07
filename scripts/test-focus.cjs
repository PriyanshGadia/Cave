const { chromium } = require('playwright');

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  
  await page.goto('http://localhost:3000/?lab&boot=skip', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !document.querySelector('#load'), { timeout: 30000 });
  await page.waitForFunction(() => window.__lab && window.__lab.state && window.__lab.state.ready, { timeout: 30000 });

  const sectors = ['RS1', 'RS2', 'RS3', 'LS3', 'LS2', 'LS1'];
  for (const s of sectors) {
    await page.evaluate((sec) => {
      window.__lab.focusSector(sec, true);
    }, s);
    await page.waitForTimeout(600);
    const info = await page.evaluate(() => {
      const c = window.__lab.camera;
      const fwd = new THREE.Vector3();
      c.getWorldDirection(fwd);
      return {
        pos: c.position.toArray().map(v => +v.toFixed(2)),
        dir: fwd.toArray().map(v => +v.toFixed(2))
      };
    });
    console.log(`Sector ${s} Focus Camera:`, info);
    await page.screenshot({ path: `public/screenshots/focus-test-${s}.png` });
  }

  await browser.close();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
