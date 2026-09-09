import { chromium } from 'playwright';

async function run() {
  console.log('=== [RS3 LIVE GOOGLE CALENDAR PLAYWRIGHT VERIFICATION] ===');
  const browser = await chromium.launch({
    headless: true,
    args: ['--use-gl=angle', '--use-angle=gl', '--enable-webgl', '--ignore-gpu-blocklist'],
  });
  const page = await browser.newPage({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1,
  });

  const consoleLogs: { type: string; text: string }[] = [];
  page.on('console', msg => {
    consoleLogs.push({ type: msg.type(), text: msg.text() });
  });

  page.on('pageerror', err => {
    console.error('PAGE ERROR:', err.message);
    consoleLogs.push({ type: 'error', text: err.message });
  });

  console.log('1. Navigating to http://localhost:3000/index.html?lab&boot=skip ...');
  await page.goto('http://localhost:3000/index.html?lab&boot=skip', { waitUntil: 'load', timeout: 30000 });
  await page.waitForFunction('window.__lab && window.__lab.state && window.__lab.state.ready', { timeout: 15000 });
  await page.waitForTimeout(1000);

  // Focus RS3 Sector
  console.log('2. Focusing Sector RS3 (Holo-Calendar)...');
  await page.evaluate(() => {
    const lab = (window as any).__lab;
    lab.focusSector('RS3');
  });
  await page.waitForTimeout(2000);

  // Check live calendar state
  const liveCalState = await page.evaluate(() => {
    const lab = (window as any).__lab;
    const cal = lab.calendar || lab.api2?.calendar?.getState?.();
    return {
      configured: cal?.configured,
      view: cal?.view,
      busyCount: cal?.busy?.length ?? 0,
      syncedAt: cal?.syncedAt,
      syncFailed: cal?.syncFailed,
      focus: lab.state.focus
    };
  });
  console.log('   Live RS3 State:', liveCalState);

  // Capture screenshot of live connected calendar
  await page.screenshot({ path: 'public/screenshots/rs3-live-connected.png' });
  console.log('   -> Screenshot captured: public/screenshots/rs3-live-connected.png');

  // Also capture close-up of Holo-Calendar screen
  const hudInfo = await page.evaluate(() => {
    const hud = document.getElementById('caveHud');
    return hud ? hud.innerText : 'NO_HUD';
  });
  console.log('   HUD Telemetry:\n' + hudInfo);

  // Verify WebGL and Console warnings
  const errors = consoleLogs.filter(l => l.type === 'error');
  const warnings = consoleLogs.filter(l => l.type === 'warning');
  console.log(`   Console Errors: ${errors.length}, Console Warnings: ${warnings.length}`);
  if (errors.length > 0) {
    console.log('   Errors:', errors);
  }

  await browser.close();
  console.log('=== [RS3 LIVE VERIFICATION COMPLETE] ===');
}

run().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
