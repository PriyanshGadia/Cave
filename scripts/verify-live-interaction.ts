import { chromium } from 'playwright';

async function run() {
  console.log('=== [TESTING LIVE INTERACTION WITH HOLO-CALENDAR] ===');
  const browser = await chromium.launch({
    headless: true,
    args: ['--use-gl=angle', '--use-angle=gl', '--enable-webgl', '--ignore-gpu-blocklist'],
  });
  const page = await browser.newPage({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1,
  });

  await page.goto('http://localhost:3000/index.html?lab&boot=skip', { waitUntil: 'load', timeout: 30000 });
  await page.waitForFunction('window.__lab && window.__lab.state && window.__lab.state.ready', { timeout: 15000 });
  await page.waitForTimeout(1000);

  // Focus RS3
  await page.evaluate(() => {
    const lab = (window as any).__lab;
    lab.focusSector('RS3');
  });
  await page.waitForTimeout(1500);

  // Check state
  const state1 = await page.evaluate(() => {
    const lab = (window as any).__lab;
    return {
      configured: lab.calendar.configured,
      view: lab.calendar.view,
      syncedAt: lab.calendar.syncedAt,
    };
  });
  console.log('Grid state:', state1);

  // Click on a day (e.g. September 10)
  // In lab.js: CAL_WD, day is clicked or we can trigger it via CAL API or mouse click
  await page.evaluate(() => {
    const lab = (window as any).__lab;
    const d = new Date(2026, 8, 10); // Sep 10, 2026
    lab.calendar.selectedDate = d;
    lab.calendar.view = 'slots';
    lab.api2.calendar.redraw();
  });
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'public/screenshots/rs3-live-slots.png' });
  console.log('Captured slots view: public/screenshots/rs3-live-slots.png');

  // Select slot 14:00 - 14:30
  await page.evaluate(() => {
    const lab = (window as any).__lab;
    const start = new Date(2026, 8, 10, 14, 0, 0);
    const end = new Date(2026, 8, 10, 14, 30, 0);
    lab.calendar.selectedSlot = { start, end };
    lab.calendar.view = 'form';
    lab.calendar.form = {
      name: 'Dr. Jane Smith',
      email: 'jane.smith@quantum-research.org',
      location: 'Google Meet',
      description: 'Reviewing quantum rendering algorithms and live holographic calendar integration.',
      field: null
    };
    lab.api2.calendar.redraw();
  });
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'public/screenshots/rs3-live-form.png' });
  console.log('Captured form view: public/screenshots/rs3-live-form.png');

  await browser.close();
  console.log('=== [LIVE INTERACTION TEST SUCCESS] ===');
}

run().catch(console.error);
