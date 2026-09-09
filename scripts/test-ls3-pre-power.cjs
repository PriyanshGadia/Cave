const { chromium } = require('playwright');

async function testPrePower() {
  const browser = await chromium.launch({
    headless: true,
    args: ['--use-gl=angle', '--use-angle=gl', '--enable-webgl', '--ignore-gpu-blocklist'],
  });

  const page = await browser.newPage({
    viewport: { width: 1280, height: 720 },
  });

  try {
    // Boot at t = 22.2 (exact start of T.power[0], well before T.power[0] + 3.5)
    await page.goto('http://localhost:3000/index.html?lab&boot=22.2', { waitUntil: 'load' });
    await page.waitForTimeout(1500);

    // Wait for window.__lab to exist
    await page.waitForFunction(() => !!window.__lab);
    await page.evaluate(() => {
      window.__lab.focusSector('LS3');
    });
    await page.waitForTimeout(1500);

    const filename = 'public/screenshots/ls3-globe-pre-power.png';
    await page.screenshot({ path: filename });
    console.log(`Saved ${filename} at t = 22.2 (pre-power)`);

    // Also get material state
    const matState = await page.evaluate(() => {
      let mat = null;
      window.__lab.scene.traverse(o => {
        if (o.geometry?.type === 'SphereGeometry' && o.material?.map) mat = o.material;
      });
      return {
        emissiveIntensity: mat?.emissiveIntensity,
        colorHex: mat?.color?.getHexString(),
        emissiveHex: mat?.emissive?.getHexString(),
        opacity: mat?.opacity
      };
    });
    console.log('Pre-power material state:', matState);

  } finally {
    await browser.close();
  }
}

testPrePower().catch(err => {
  console.error(err);
  process.exit(1);
});
