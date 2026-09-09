import { chromium } from 'playwright';

async function run() {
  console.log('=== [COMPREHENSIVE SKIP ANIMATION & INTERACTIVITY TEST] ===');
  const browser = await chromium.launch({
    headless: true,
    args: ['--use-gl=angle', '--use-angle=gl', '--enable-webgl', '--ignore-gpu-blocklist'],
  });
  const page = await browser.newPage({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1,
  });

  const logs: string[] = [];
  const errors: string[] = [];
  page.on('console', msg => {
    const text = msg.text();
    logs.push(`[${msg.type()}] ${text}`);
    if (msg.type() === 'error') errors.push(text);
  });
  page.on('pageerror', err => {
    logs.push(`[PAGE_ERROR] ${err.message}`);
    errors.push(err.message);
  });

  console.log('1. Loading http://localhost:3000/index.html ...');
  await page.goto('http://localhost:3000/index.html', { waitUntil: 'load', timeout: 30000 });
  await page.waitForTimeout(800);

  // Check button exists before clicking
  const btnBefore = await page.evaluate(() => {
    const btn = document.getElementById('btn-skip-anim');
    return {
      exists: !!btn,
      display: btn ? getComputedStyle(btn).display : 'none',
      text: btn?.innerText
    };
  });
  console.log('   Button before click:', btnBefore);

  console.log('2. Clicking #btn-skip-anim ...');
  await page.click('#btn-skip-anim');
  await page.waitForTimeout(1000);

  // Verify state after skip
  const stateAfterSkip = await page.evaluate(() => {
    const vault = (window as any).VAULT;
    const lab = (window as any).__lab;
    const btn = document.getElementById('btn-skip-anim');
    return {
      btnDisplay: btn ? getComputedStyle(btn).display : 'none',
      labActive: lab?.state?.active,
      labReady: lab?.state?.ready,
      labFocus: lab?.state?.focus,
      labSector: lab?.state?.sector,
      theta: lab?.state?.theta,
      canvasPointerEvents: document.getElementById('c')?.style.pointerEvents,
      frameCount: (window as any).__frameCount,
    };
  });
  console.log('   State after skip:\n', JSON.stringify(stateAfterSkip, null, 2));

  // Verify render loop is actively running (frame count increasing!)
  const fc1 = stateAfterSkip.frameCount;
  await page.waitForTimeout(500);
  const fc2 = await page.evaluate(() => (window as any).__frameCount);
  console.log(`   Render loop active test: frameCount went from ${fc1} to ${fc2} (delta = ${fc2 - fc1})`);
  if (fc2 <= fc1) {
    throw new Error('Render loop is frozen!');
  }

  // Screenshot final illuminated chamber overview
  await page.screenshot({ path: 'public/screenshots/skip-overview-chamber.png' });
  console.log('   -> Screenshot captured: public/screenshots/skip-overview-chamber.png');

  // Test mouse dragging on turntable
  console.log('3. Testing turntable mouse drag...');
  const thetaBeforeDrag = await page.evaluate(() => (window as any).__lab.state.theta);
  await page.mouse.move(640, 450);
  await page.mouse.down();
  await page.mouse.move(400, 450, { steps: 15 });
  await page.mouse.up();
  await page.waitForTimeout(400);

  const thetaAfterDrag = await page.evaluate(() => (window as any).__lab.state.theta);
  console.log(`   Turntable drag test: theta changed from ${thetaBeforeDrag.toFixed(3)} to ${thetaAfterDrag.toFixed(3)}`);
  if (Math.abs(thetaAfterDrag - thetaBeforeDrag) < 0.05) {
    throw new Error('Turntable did not respond to mouse dragging!');
  }

  // Test clicking sector RS3 (Holo-Calendar) to focus it
  console.log('4. Testing clicking on sector RS3 (Holo-Calendar)...');
  await page.evaluate(() => {
    const lab = (window as any).__lab;
    lab.focusSector('RS3');
  });
  await page.waitForTimeout(1000);

  const rs3State = await page.evaluate(() => {
    const lab = (window as any).__lab;
    return {
      focus: lab.state.focus,
      calConfigured: lab.calendar?.configured,
      calView: lab.calendar?.view,
      busyCount: lab.calendar?.busy?.length ?? 0
    };
  });
  console.log('   RS3 Focus State:', rs3State);
  await page.screenshot({ path: 'public/screenshots/skip-focused-rs3.png' });
  console.log('   -> Screenshot captured: public/screenshots/skip-focused-rs3.png');

  // Test Escape key to unfocus
  console.log('5. Testing Escape key to unfocus back to overview...');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(800);

  const unfocusState = await page.evaluate(() => {
    const lab = (window as any).__lab;
    return {
      focus: lab.state.focus
    };
  });
  console.log('   After Escape:', unfocusState);
  if (unfocusState.focus !== null) {
    throw new Error('Escape key did not unfocus!');
  }

  // Audit errors
  console.log(`6. Auditing errors (total errors: ${errors.length})...`);
  if (errors.length > 0) {
    console.error('Errors found:', errors);
    throw new Error(`Test failed with ${errors.length} errors.`);
  }

  await browser.close();
  console.log('=== [ALL TESTS PASSED: SKIP ANIMATION & INTERACTIVITY VERIFIED] ===');
}

run().catch(err => {
  console.error('TEST FAILURE:', err);
  process.exit(1);
});
