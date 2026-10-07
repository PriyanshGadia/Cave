const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1
  });

  const errors = [];
  const warnings = [];
  page.on('console', msg => {
    const line = `${msg.type().toUpperCase()}: ${msg.text()}`;
    if (msg.type() === 'error') errors.push(line);
    if (msg.type() === 'warning') warnings.push(line);
    console.log(line);
  });
  page.on('pageerror', err => errors.push(`PAGEERROR: ${err.message}`));

  await page.goto('http://localhost:3000/about.html?cinematicTest=1', {
    waitUntil: 'domcontentloaded',
    timeout: 120000
  });
  await page.waitForFunction(() => window.__ABOUT_READY__ === true, { timeout: 120000 });
  await page.waitForFunction(() => window.__ARMOR_READY === true, { timeout: 120000 });

  const checkpoints = [
    ['00_void', 0.00],
    ['01_identity', 0.05],
    ['02_emergence', 0.10],
    ['03_door', 0.16],
    ['04_door_open', 0.22],
    ['05_workshop', 0.30],
    ['06_armor_wake', 0.38],
    ['07_boots', 0.43],
    ['08_legs', 0.49],
    ['09_torso', 0.55],
    ['10_arms', 0.61],
    ['11_gauntlets', 0.67],
    ['12_helmet', 0.72],
    ['13_formation', 0.78],
    ['14_flight', 0.83],
    ['15_convergence', 0.88],
    ['16_assembly', 0.91],
    ['17_landing', 0.94],
    ['18_observation', 0.97],
    ['19_floor', 0.985],
    ['20_end', 1.00]
  ];

  for (const [name, progress] of checkpoints) {
    await page.evaluate(p => window.setCinematicProgress(p), progress);
    await page.waitForTimeout(180);
    await page.screenshot({ path: `about-\${name}.png`, fullPage: false });
  }

  const audit = await page.evaluate(() => ({
    diagnostics: window.__ABOUT_DIAGNOSTICS__?.(),
    validation: window.__ABOUT_VALIDATE__?.(),
    armorTable: window.__ABOUT_ARMOR_TABLE__?.(),
    cameraAudit: window.__ABOUT_CAMERA_AUDIT__?.(),
    rasterImages: performance.getEntriesByType('resource')
      .filter(r => /\\.(png|jpe?g|webp|gif)(\\?|$)/i.test(r.name)).map(r => r.name)
  }));

  console.log(JSON.stringify({ audit, errors, warnings }, null, 2));

  if (errors.length) process.exitCode = 2;
  if (audit.rasterImages?.length) process.exitCode = 3;

  await browser.close();
})();
