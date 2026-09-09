const { chromium } = require('playwright');

async function testLS3() {
  console.log('=== [TEST LS3 HOLO-GLOBE INTERACTION] ===');
  const browser = await chromium.launch({
    headless: true,
    args: ['--use-gl=angle', '--use-angle=gl', '--enable-webgl', '--ignore-gpu-blocklist'],
  });

  const page = await browser.newPage({
    viewport: { width: 1024, height: 768 },
    deviceScaleFactor: 1,
  });

  const errors = [];
  page.on('console', msg => {
    const text = msg.text();
    const type = msg.type();
    console.log(`[BROWSER ${type}]: ${text}`);
    if (type === 'error' || (type === 'warning' && text.toLowerCase().includes('webgl'))) {
      errors.push(`[${type}] ${text}`);
    }
  });
  page.on('pageerror', err => {
    errors.push(`[pageerror] ${err.message}`);
  });

  try {
    await page.goto('http://localhost:3000/index.html?lab&boot=skip', { waitUntil: 'load', timeout: 30000 });
    console.log('Waiting for engine ready...');
    await page.waitForFunction(() => window.__lab?.state?.ready, { timeout: 20000 });

    console.log('Focusing LS3 sector...');
    await page.evaluate(() => {
      window.__lab.focusSector('LS3');
    });
    await page.waitForTimeout(1500);

    // Fast-forward or interact with lab
    const state = await page.evaluate(async () => {
      const api = window.__lab_backend;
      if (!api || !api.globe) return { error: 'api2.globe not found' };

      const globeState = api.globe.getState();
      return {
        hasGlobe: !!globeState,
        autoSpin: globeState.autoSpin,
        geoFetched: globeState.geoFetched,
        geo: globeState.geo
      };
    });
    console.log('Globe backend state:', state);

    if (state.error) {
      throw new Error(state.error);
    }

    // Test triggering album honesty state
    console.log('Testing album honesty notice...');
    await page.evaluate(() => {
      window.__lab_backend.globe.triggerAlbum();
    });

    const albumState = await page.evaluate(() => {
      const st = window.__lab_backend.globe.getState();
      return {
        noticeActive: st.albumNoticeUntil > performance.now()
      };
    });
    console.log('Album notice active:', albumState.noticeActive);

    // Test dragging the globe
    console.log('Testing simulated pointer drag on globe...');
    const rotBefore = await page.evaluate(() => {
      // Find globe rotation
      const st = window.__lab_backend.globe.getState();
      return st;
    });

    // Send pointer events in center of screen
    await page.mouse.move(512, 384);
    await page.mouse.down();
    await page.mouse.move(600, 350, { steps: 5 });
    await page.mouse.up();

    console.log('Drag completed.');

    // Test placing beacon with coordinates
    console.log('Testing beacon placement with simulated coordinates...');
    await page.evaluate(() => {
      window.__lab_backend.globe.setGeo({
        lat: 37.7749,
        lon: -122.4194,
        city: 'SAN FRANCISCO',
        country: 'US',
        timezone: 'America/Los_Angeles'
      });
    });
    // Wait for album notice to clear so we see the telemetry readout and beacon clearly
    await page.waitForTimeout(3600);

    // Desktop capture (1280x720)
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.waitForTimeout(800);
    const desktopPath = 'public/screenshots/ls3-globe-desktop.png';
    await page.screenshot({ path: desktopPath });
    console.log(`Saved desktop screenshot to ${desktopPath}`);

    // Portrait / mobile capture (576x1024)
    await page.setViewportSize({ width: 576, height: 1024 });
    await page.waitForTimeout(800);
    const portraitPath = 'public/screenshots/ls3-globe-portrait.png';
    await page.screenshot({ path: portraitPath });
    console.log(`Saved portrait screenshot to ${portraitPath}`);

    // Copy to ls3-globe-beacon.png as standard reference
    const stdPath = 'public/screenshots/ls3-globe-beacon.png';
    await page.screenshot({ path: stdPath });

    // Check errors
    console.log('Console errors/warnings caught:', errors.length);
    if (errors.length > 0) {
      console.log('Errors:', errors);
    } else {
      console.log('Zero WebGL warnings/errors detected!');
    }

  } finally {
    await browser.close();
  }
}

testLS3().catch(err => {
  console.error('LS3 test failed:', err);
  process.exit(1);
});
