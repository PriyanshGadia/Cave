const { chromium } = require('playwright');

async function testRotation() {
  const browser = await chromium.launch({
    headless: true,
    args: ['--use-gl=angle', '--use-angle=gl', '--enable-webgl', '--ignore-gpu-blocklist'],
  });

  const page = await browser.newPage({
    viewport: { width: 1280, height: 720 },
  });

  try {
    await page.goto('http://localhost:3000/index.html?lab&boot=skip', { waitUntil: 'load' });
    await page.waitForFunction(() => window.__lab?.state?.ready);
    await page.evaluate(() => window.__lab.focusSector('LS3'));
    await page.waitForTimeout(1600);

    await page.evaluate(() => {
      window.__lab_backend.globe.setGeo({
        lat: 37.7749,
        lon: -122.4194,
        city: 'SAN FRANCISCO',
        country: 'US',
        timezone: 'America/Los_Angeles'
      });
    });

    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      await page.evaluate((a) => {
        const group = window.__lab_backend.globe.getGroup();
        window.__lab_backend.globe.getState().autoSpin = false;
        group.rotation.y = a;
      }, angle);
      await page.waitForTimeout(300);
      const filename = `public/screenshots/beacon-rot-${i}.png`;
      await page.screenshot({ path: filename });
      console.log(`Saved ${filename} at angle ${(angle * 180 / Math.PI).toFixed(0)} deg`);
    }
  } finally {
    await browser.close();
  }
}

testRotation().catch(err => {
  console.error(err);
  process.exit(1);
});
