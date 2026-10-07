const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function testTransitions() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  page.on('pageerror', err => {
    consoleErrors.push(err.message);
  });

  const brainDir = 'C:\\Users\\gadia\\.gemini\\antigravity-ide\\brain\\5e3c0a45-c3f3-49e8-8c30-eccd6f3eac75';
  const outDir = path.join(__dirname, '..', 'screenshots');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  console.log('Navigating to http://localhost:3000/about.html ...');
  const response = await page.goto('http://localhost:3000/about.html', { waitUntil: 'networkidle' });
  console.log('Page response status:', response.status());

  if (response.status() !== 200) {
    throw new Error(`Failed to load about.html, status: ${response.status()}`);
  }

  // Test transitions at specific scroll progress points
  const bridgePoints = [
    { p: 0.10, name: 'bridge_01_02_light_expansion.png', label: 'Bridge 01->02: Torch Light Expansion' },
    { p: 0.20, name: 'bridge_02_03_camera_plunge.png', label: 'Bridge 02->03: Camera Plunge into Hollow' },
    { p: 0.30, name: 'bridge_03_04_chalk_blueprint.png', label: 'Bridge 03->04: Chalk Ring to Titanium AI Holotable' },
    { p: 0.40, name: 'bridge_04_05_cable_track.png', label: 'Bridge 04->05: Umbilical Cable Track to LS1' },
    { p: 0.50, name: 'bridge_05_06_fiber_whip.png', label: 'Bridge 05->06: Fiber Optic Whip to RS1' },
    { p: 0.60, name: 'bridge_06_07_formula_stream.png', label: 'Bridge 06->07: Neural Formula Data-Stream' },
    { p: 0.70, name: 'bridge_07_08_radar_sweep.png', label: 'Bridge 07->08: Chronos Tactical Radar Sweep' },
    { p: 0.80, name: 'bridge_08_09_power_cascade.png', label: 'Bridge 08->09: Radial Power Bus Cascade' },
    { p: 0.90, name: 'bridge_09_10_camera_pullback.png', label: 'Bridge 09->10: Master Camera Pullback' }
  ];

  for (let i = 0; i < bridgePoints.length; i++) {
    const pt = bridgePoints[i];
    await page.evaluate(({ prog }) => {
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      window.scrollTo(0, scrollHeight * prog);
      if (window.ScrollTrigger) window.ScrollTrigger.update();
    }, { prog: pt.p });

    await page.waitForTimeout(400);
    const savePath = path.join(outDir, pt.name);
    await page.screenshot({ path: savePath });
    console.log(`Captured [${i + 1}/${bridgePoints.length}] ${pt.label} -> ${pt.name}`);

    try {
      fs.copyFileSync(savePath, path.join(brainDir, pt.name));
    } catch {}
  }

  console.log('Console errors count during transitions:', consoleErrors.length);
  if (consoleErrors.length > 0) {
    console.error('Console errors:', consoleErrors);
  } else {
    console.log('SUCCESS: Zero console errors across all Phase 6 physical match transitions!');
  }

  await browser.close();
}

testTransitions().catch(err => {
  console.error('Fatal transition test error:', err);
  process.exit(1);
});
