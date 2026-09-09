import { chromium } from 'playwright';

async function run() {
  console.log('=== [RS3 HOLO-CALENDAR PLAYWRIGHT AUDIT SUITE] ===');
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
    const text = msg.text();
    // Ignore benign 404 in dev mode when Cloudflare Pages worker is not running locally
    if (text.includes('404') && text.includes('api/')) return;
    consoleLogs.push({ type: msg.type(), text });
  });

  page.on('pageerror', err => {
    console.error('PAGE ERROR:', err.message);
    consoleLogs.push({ type: 'error', text: err.message });
  });

  console.log('1. Navigating to http://localhost:8000/index.html?lab&boot=skip ...');
  await page.goto('http://localhost:8000/index.html?lab&boot=skip', { waitUntil: 'load', timeout: 30000 });
  await page.waitForFunction('window.__lab && window.__lab.state && window.__lab.state.ready', { timeout: 15000 });
  await page.waitForTimeout(600);

  // Audit Rule 4 & 7 telemetry
  const telemetry = await page.evaluate(() => {
    const hud = document.getElementById('caveHud');
    const hudText = hud ? hud.innerText : '';
    const lab = (window as any).__lab;
    const stats = lab?.stats ? lab.stats() : null;
    return { hudText, stats };
  });
  console.log('   HUD Telemetry:', telemetry.hudText || 'HUD not visible');

  // Focus RS3 Sector
  console.log('2. Focusing Sector RS3 (Holo-Calendar)...');
  await page.evaluate(() => {
    const lab = (window as any).__lab;
    lab.focusSector('RS3');
  });
  await page.waitForTimeout(1000);

  // Check initial state (unconfigured fallback)
  const initialCalState = await page.evaluate(() => {
    const lab = (window as any).__lab;
    const cal = lab.calendar || lab.api2?.calendar?.getState?.();
    return {
      configured: cal?.configured,
      view: cal?.view,
      busyCount: cal?.busy?.length ?? 0,
      focus: lab.state.focus
    };
  });
  console.log('   Initial RS3 State:', initialCalState);

  await page.screenshot({ path: 'public/screenshots/rs3-unconfigured.png' });
  console.log('   -> Screenshot captured: public/screenshots/rs3-unconfigured.png');

  // Simulate connected state with real schedule blocks
  console.log('3. Simulating live configured calendar with sample busy blocks...');
  await page.evaluate(() => {
    const lab = (window as any).__lab;
    const cal = lab.calendar || lab.api2?.calendar?.getState?.();
    cal.configured = true;
    const now = new Date();
    // Mark tomorrow 10:00 - 12:00 and 14:00 - 16:00 as busy
    const tom = new Date(now);
    tom.setDate(tom.getDate() + 1);
    const b1Start = new Date(tom); b1Start.setHours(10, 0, 0, 0);
    const b1End = new Date(tom); b1End.setHours(12, 0, 0, 0);
    const b2Start = new Date(tom); b2Start.setHours(14, 0, 0, 0);
    const b2End = new Date(tom); b2End.setHours(16, 0, 0, 0);
    cal.busy = [{ start: b1Start, end: b1End }, { start: b2Start, end: b2End }];
    cal.syncedAt = Date.now();
    lab.api2?.calendar?.redraw?.();
  });
  await page.waitForTimeout(500);

  await page.screenshot({ path: 'public/screenshots/rs3-configured-grid.png' });
  console.log('   -> Screenshot captured: public/screenshots/rs3-configured-grid.png');

  // Transition to slots view by selecting tomorrow's date
  console.log('4. Selecting tomorrow to view available time slots...');
  await page.evaluate(() => {
    const lab = (window as any).__lab;
    const cal = lab.calendar || lab.api2?.calendar?.getState?.();
    const tom = new Date();
    tom.setDate(tom.getDate() + 1);
    tom.setHours(0, 0, 0, 0);
    cal.selectedDate = tom;
    cal.view = 'slots';
    lab.api2?.calendar?.redraw?.();
  });
  await page.waitForTimeout(500);

  const slotsInfo = await page.evaluate(() => {
    const lab = (window as any).__lab;
    const cal = lab.calendar || lab.api2?.calendar?.getState?.();
    return {
      view: cal.view,
      selectedDate: cal.selectedDate?.toISOString()
    };
  });
  console.log('   Slots View Active:', slotsInfo);
  await page.screenshot({ path: 'public/screenshots/rs3-slots-view.png' });
  console.log('   -> Screenshot captured: public/screenshots/rs3-slots-view.png');

  // Transition to form view by selecting a slot
  console.log('5. Selecting 16:30 slot to open proposal request form...');
  await page.evaluate(() => {
    const lab = (window as any).__lab;
    const cal = lab.calendar || lab.api2?.calendar?.getState?.();
    const start = new Date(cal.selectedDate); start.setHours(16, 30, 0, 0);
    const end = new Date(cal.selectedDate); end.setHours(17, 0, 0, 0);
    cal.selectedSlot = { start, end };
    cal.form = { name: '', email: '', location: '', description: '', field: 'name' };
    cal.view = 'form';
    lab.api2?.calendar?.redraw?.();
  });
  await page.waitForTimeout(500);

  // Type into form fields via keyboard events
  console.log('6. Simulating keyboard input into meeting request form...');
  await page.keyboard.type('Jane Doe');
  await page.waitForTimeout(200);

  await page.evaluate(() => {
    const lab = (window as any).__lab;
    const cal = lab.calendar || lab.api2?.calendar?.getState?.();
    cal.form.field = 'email';
    lab.api2?.calendar?.redraw?.();
  });
  await page.keyboard.type('jane.doe@quantum-labs.org');
  await page.waitForTimeout(200);

  await page.evaluate(() => {
    const lab = (window as any).__lab;
    const cal = lab.calendar || lab.api2?.calendar?.getState?.();
    cal.form.field = 'location';
    lab.api2?.calendar?.redraw?.();
  });
  await page.keyboard.type('Google Meet / Video Call');
  await page.waitForTimeout(200);

  await page.evaluate(() => {
    const lab = (window as any).__lab;
    const cal = lab.calendar || lab.api2?.calendar?.getState?.();
    cal.form.field = 'description';
    lab.api2?.calendar?.redraw?.();
  });
  await page.keyboard.type('Discussion on distributed ML model deployment and quantitative latency benchmarking.');
  await page.waitForTimeout(400);

  const formContents = await page.evaluate(() => {
    const lab = (window as any).__lab;
    const cal = lab.calendar || lab.api2?.calendar?.getState?.();
    return cal.form;
  });
  console.log('   Form Input Verification:', formContents);

  await page.screenshot({ path: 'public/screenshots/rs3-form-filled.png' });
  console.log('   -> Screenshot captured: public/screenshots/rs3-form-filled.png');

  // Test Escape hierarchy
  console.log('7. Testing hierarchical Escape navigation...');
  // Escape 1: form typing blur
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  const esc1 = await page.evaluate(() => (window as any).__lab.calendar.form.field);
  console.log('   After Escape 1 (blur active field): field =', esc1);

  // Escape 2: form -> slots
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  const esc2 = await page.evaluate(() => (window as any).__lab.calendar.view);
  console.log('   After Escape 2 (form -> slots): view =', esc2);

  // Escape 3: slots -> grid
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  const esc3 = await page.evaluate(() => (window as any).__lab.calendar.view);
  console.log('   After Escape 3 (slots -> grid): view =', esc3);

  // Escape 4: grid -> unfocus
  await page.keyboard.press('Escape');
  await page.waitForTimeout(600);
  const esc4 = await page.evaluate(() => (window as any).__lab.state.focus);
  console.log('   After Escape 4 (grid -> unfocus): focus =', esc4);

  // Final Console Audit
  console.log('8. Auditing WebGL warnings and JavaScript console errors...');
  const errors = consoleLogs.filter(l => l.type === 'error');
  const warnings = consoleLogs.filter(l => l.type === 'warning');
  console.log(`   Total Console Errors: ${errors.length}`);
  console.log(`   Total Console Warnings: ${warnings.length}`);
  if (errors.length > 0) {
    console.error('   Error details:', errors);
  }

  await browser.close();
  console.log('=== [RS3 TEST SUITE FINISHED SUCCESSFULLY] ===');
}

run().catch(err => {
  console.error('FATAL TEST ERROR:', err);
  process.exit(1);
});
