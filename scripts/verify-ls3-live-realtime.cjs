const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const ARTIFACT_DIR = 'C:/Users/gadia/.gemini/antigravity-ide/brain/694bd3af-9386-4a86-8cb6-98cd73f0a84a';
if (!fs.existsSync(ARTIFACT_DIR)) {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
}

async function run() {
  console.log('=== VERIFYING LS3 REAL-TIME SPATIAL INTELLIGENCE & REMOVAL OF STREET OVERLAY ===');
  const browser = await chromium.launch({
    headless: true,
    args: ['--use-gl=angle', '--use-angle=gl', '--enable-webgl', '--ignore-gpu-blocklist']
  });

  const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  const page = await context.newPage();

  const consoleLogs = [];
  const webglWarnings = [];
  page.on('console', msg => {
    const text = msg.text();
    consoleLogs.push(text);
    if (text.toLowerCase().includes('webgl') && (msg.type() === 'warning' || msg.type() === 'error' || text.toLowerCase().includes('warning'))) {
      webglWarnings.push(text);
    }
  });

  await page.goto('http://localhost:3000/index.html?lab&boot=skip', { waitUntil: 'load' });
  await page.waitForFunction(() => window.__lab?.state?.ready, { timeout: 20000 });
  await page.waitForTimeout(3500);

  // 1. Focus sector LS3
  console.log('1. Focusing sector LS3...');
  await page.evaluate(() => {
    window.__lab.skipToFinal('LS3');
  });
  await page.waitForTimeout(1200);

  // Check raster image files loaded
  const rasterFilesLoaded = await page.evaluate(() => {
    const perfEntries = performance.getEntriesByType('resource');
    return perfEntries.filter(r => /\.(png|jpg|jpeg|webp|gif|bmp|ico|glb|gltf)($|\?)/i.test(r.name)).map(r => r.name);
  });
  console.log('Raster files loaded:', rasterFilesLoaded.length, rasterFilesLoaded);

  // Capture Surface mode (USGS Earthquakes & Visitor Beacon)
  const cap1 = path.join(ARTIFACT_DIR, 'ls3_live_surface.png');
  await page.screenshot({ path: cap1 });
  console.log('Saved Surface Mode screenshot:', cap1);

  // 2. Switch to ORBITAL mode (Real-Time ISS)
  console.log('2. Switching to ORBITAL mode (key 2)...');
  await page.keyboard.press('2');
  await page.waitForTimeout(1200);

  const issData = await page.evaluate(() => window.__lab?.globe?.liveISS);
  console.log('Live ISS Telemetry in client:', issData);

  const cap2 = path.join(ARTIFACT_DIR, 'ls3_live_orbital_iss.png');
  await page.screenshot({ path: cap2 });
  console.log('Saved Orbital Mode (ISS) screenshot:', cap2);

  // 3. Switch to AIRSPACE mode (Real-Time ADS-B Flights)
  console.log('3. Switching to AIRSPACE mode (key 3)...');
  await page.keyboard.press('3');
  await page.waitForTimeout(1200);

  const fltData = await page.evaluate(() => ({
    count: window.__lab?.globe?.liveFlights?.length || 0,
    sample: window.__lab?.globe?.liveFlights?.[0]
  }));
  console.log('Live Flight Telemetry in client:', fltData);

  const cap3 = path.join(ARTIFACT_DIR, 'ls3_live_airspace_flights.png');
  await page.screenshot({ path: cap3 });
  console.log('Saved Airspace Mode screenshot:', cap3);

  // 4. Test Slewing & Centering: Slew to Tokyo preset
  console.log('4. Slewing to Tokyo preset...');
  await page.evaluate(() => {
    // Call selectTargetPreset for TYO via keyboard or raycast on plaque
    const uv = { x: (12 + 4 * 42 + 19) / 384, y: 1 - (59 / 128) };
    const labelMesh = window.__lab.sectorGroups?.LS3?.children?.find(c => c.userData?.isLabel);
    window.__lab.handlers?.LS3?.onHit(labelMesh, uv);
  });
  await page.waitForTimeout(1800);
  const cap4 = path.join(ARTIFACT_DIR, 'ls3_slewing_tokyo.png');
  await page.screenshot({ path: cap4 });
  console.log('Saved Tokyo Slewing screenshot:', cap4);

  // 5. Test Zoom: Zoom in to 3.0x
  console.log('5. Testing Zoom In...');
  await page.keyboard.press('+');
  await page.keyboard.press('+');
  await page.waitForTimeout(1000);
  const cap5 = path.join(ARTIFACT_DIR, 'ls3_zoomed_in.png');
  await page.screenshot({ path: cap5 });
  console.log('Saved Zoomed-In screenshot:', cap5);

  // 6. Confirm no street meshes or CCTV exist in scene
  const streetAndCctvAudit = await page.evaluate(() => {
    let foundStreet = false;
    let foundCCTV = false;
    window.__lab.scene.traverse(obj => {
      if (obj.name?.toLowerCase().includes('street') || obj.userData?.isStreet || obj.userData?.isStreetRecon) foundStreet = true;
      if (obj.name?.toLowerCase().includes('cctv') || obj.userData?.isCCTV || obj.userData?.isCCTVMonitor) foundCCTV = true;
    });
    return { foundStreet, foundCCTV };
  });
  console.log('Street & CCTV scene audit:', streetAndCctvAudit);

  // 7. WebGL console check
  console.log('WebGL warnings count:', webglWarnings.length);
  if (webglWarnings.length > 0) {
    console.warn('WebGL warnings:', webglWarnings);
  }

  await browser.close();

  const success = (
    rasterFilesLoaded.length === 0 &&
    !streetAndCctvAudit.foundStreet &&
    !streetAndCctvAudit.foundCCTV &&
    webglWarnings.length === 0 &&
    issData != null &&
    fltData.count > 0
  );

  console.log('VERIFICATION RESULT:', success ? 'ALL CRITERIA PASSED' : 'SOME CHECKS FAILED');
  return success;
}

run().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
