import { chromium } from 'playwright';

async function run() {
  console.log('=== [LAB CHECKPOINTS VERIFICATION] ===');
  const browser = await chromium.launch({
    headless: true,
    args: ['--use-gl=angle', '--use-angle=gl', '--enable-webgl', '--ignore-gpu-blocklist'],
  });

  const page = await browser.newPage({
    viewport: { width: 576, height: 1024 },
    deviceScaleFactor: 1,
  });

  const consoleMessages: { type: string; text: string }[] = [];
  const warnings: string[] = [];

  page.on('console', (msg) => {
    const text = msg.text();
    const type = msg.type();
    consoleMessages.push({ type, text });
    if (type === 'error' || type === 'warning' || text.toLowerCase().includes('webgl') || text.toLowerCase().includes('warn')) {
      warnings.push(`[${type}] ${text}`);
    }
  });

  page.on('pageerror', (err) => {
    warnings.push(`[PAGE ERROR] ${err.message}`);
  });

  const checkpoints = [
    { boot: '0.5', name: 'lab-0.5s' },
    { boot: '2.6', name: 'lab-2.6s' },
    { boot: '4.9', name: 'lab-4.9s' },
    { boot: '7.5', name: 'lab-7.5s' },
    { boot: '13.9', name: 'lab-13.9s' },
    { boot: '17', name: 'lab-17.0s' },
    { boot: '22.5', name: 'lab-22.5s' },
  ];

  for (const cp of checkpoints) {
    const url = `http://localhost:8000/index.html?lab&boot=${cp.boot}`;
    console.log(`Checking ${url}...`);
    await page.goto(url, { waitUntil: 'load', timeout: 30000 });
    await page.waitForFunction(() => (window as any).__lab?.state?.active, { timeout: 15000 });
    await page.waitForTimeout(300);

    const stats = await page.evaluate(() => (window as any).__lab.stats());
    console.log(`   -> t=${stats.t}s, calls=${stats.calls}, tris=${stats.triangles}, sector=${stats.sector}`);
    await page.screenshot({ path: `public/screenshots/${cp.name}.png` });
  }

  // Check ?lab&boot=skip
  console.log('Checking ?lab&boot=skip...');
  await page.goto('http://localhost:8000/index.html?lab&boot=skip', { waitUntil: 'load', timeout: 30000 });
  await page.waitForFunction(() => (window as any).__lab?.state?.ready, { timeout: 15000 });
  await page.waitForTimeout(400);

  const skipStats = await page.evaluate(() => (window as any).__lab.stats());
  console.log(`   -> Ready: ${skipStats.ready}, sector: ${skipStats.sector}, theta: ${skipStats.theta}`);
  await page.screenshot({ path: 'public/screenshots/lab-boot-skip.png' });
  if (skipStats.sector !== 'S0') {
    throw new Error(`Expected sector S0 at boot=skip, got ${skipStats.sector}`);
  }

  // Wheel traversal forward
  console.log('Testing wheel traversal (forward x3)...');
  for (let i = 0; i < 3; i++) {
    await page.mouse.wheel(0, 600);
    await page.waitForTimeout(100);
  }
  console.log('Waiting 2s for magnet snap...');
  await page.waitForTimeout(2000);
  const fwdStats = await page.evaluate(() => (window as any).__lab.stats());
  console.log(`   -> Forward stats: sector=${fwdStats.sector}, theta=${fwdStats.theta}`);
  await page.screenshot({ path: 'public/screenshots/lab-wheel-fwd.png' });

  // Wheel traversal reverse x6
  console.log('Testing wheel traversal (reverse x6)...');
  for (let i = 0; i < 6; i++) {
    await page.mouse.wheel(0, -600);
    await page.waitForTimeout(100);
  }
  console.log('Waiting 2s for magnet snap...');
  await page.waitForTimeout(2000);
  const revStats = await page.evaluate(() => (window as any).__lab.stats());
  console.log(`   -> Reverse stats: sector=${revStats.sector}, theta=${revStats.theta}`);
  await page.screenshot({ path: 'public/screenshots/lab-wheel-rev.png' });

  // Console audit
  console.log('Console audit:');
  const filteredWarnings = warnings.filter(w => !w.includes('favicon'));
  if (filteredWarnings.length > 0) {
    console.error('Warnings detected:', filteredWarnings);
    throw new Error(`Console warnings found: ${filteredWarnings.join('; ')}`);
  }
  console.log(`PASS: Zero console warnings, all checkpoints captured.`);

  await browser.close();
}

run().catch(e => {
  console.error('FAILED:', e);
  process.exit(1);
});
