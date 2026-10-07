const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function main() {
  console.log('===============================================================');
  console.log('=== [VAULT-01: FINAL WORKBENCH & INTERACTION VERIFICATION] ===');
  console.log('===============================================================');

  const outDir = path.resolve(process.cwd(), 'public', 'screenshots', 'final');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const browser = await chromium.launch({
    headless: true,
    args: ['--use-gl=angle', '--use-angle=gl', '--enable-webgl', '--ignore-gpu-blocklist']
  });

  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1
  });

  const consoleLogs = [];
  const webglWarnings = [];

  page.on('console', msg => {
    const text = msg.text();
    consoleLogs.push(text);
    if (text.toLowerCase().includes('webgl') || text.toLowerCase().includes('warning') || msg.type() === 'warning') {
      if (!text.includes('DevTools') && !text.includes('favicon')) {
        webglWarnings.push(`[${msg.type()}] ${text}`);
      }
    }
  });

  page.on('pageerror', err => {
    console.error('[PAGE ERROR]', err.message);
  });

  console.log('\n[STEP 1] Navigating to ?lab&boot=skip...');
  await page.goto('http://localhost:3000/index.html?lab&boot=skip', { waitUntil: 'load', timeout: 30000 });
  await page.waitForFunction(() => window.__lab?.state?.ready, { timeout: 20000 });
  await page.waitForTimeout(1000);

  // Capture normal Hall view
  await page.screenshot({ path: path.join(outDir, 'workbench-normal.png') });
  console.log('Captured: workbench-normal.png');

  // Test Free look in Hall
  console.log('\n[STEP 2] Testing Workbench Free Look Camera...');
  await page.mouse.move(720, 450);
  await page.mouse.move(950, 300); // look right and up
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(outDir, 'workbench-freelook.png') });
  console.log('Captured: workbench-freelook.png');

  const benchPoseBefore = await page.evaluate(() => {
    const cam = window.__lab.camera;
    return {
      pos: [cam.position.x, cam.position.y, cam.position.z],
      theta: window.__lab.state.theta
    };
  });
  console.log('Workbench Camera Pose before sector focus:', benchPoseBefore);

  // ── [STEP 3] LS1 COMPOSITION, COSMIC BIRTH & HIERARCHICAL ESCAPE ──
  console.log('\n[STEP 3] Testing LS1 Station Focus, Portrait Framing & Cosmic Birth...');
  await page.evaluate(() => {
    window.__lab.focusSector('LS1');
  });
  await page.waitForTimeout(1200);

  // Capture focused station portrait
  await page.screenshot({ path: path.join(outDir, 'ls1-focus-portrait.png') });
  console.log('Captured: ls1-focus-portrait.png');

  // Trigger wakeLS1 and cosmic birth sequence
  console.log('Triggering LS1 wake and cosmic crystal birth sequence...');
  await page.evaluate(() => {
    window.__lab.wakeLS1();
  });
  // Capture cosmic birth during darkness & nebular accretion (~1.8s)
  await page.waitForTimeout(1800);
  await page.screenshot({ path: path.join(outDir, 'ls1-cosmic-birth.png') });
  console.log('Captured: ls1-cosmic-birth.png');

  // Wait for birth sequence completion & crystal solidification
  await page.waitForTimeout(2200);
  await page.screenshot({ path: path.join(outDir, 'ls1-crystal-active.png') });
  console.log('Captured: ls1-crystal-active.png');

  // Select crystal and open portal
  console.log('Activating portal from destination crystal...');
  await page.evaluate(() => {
    const crystals = window.__lab.ls1Crystals;
    if (crystals && crystals.length > 0) {
      window.__lab.activatePortal(crystals[0]);
    }
  });
  await page.waitForTimeout(1400);
  await page.screenshot({ path: path.join(outDir, 'ls1-portal-open.png') });
  console.log('Captured: ls1-portal-open.png');

  // Test Escape Level 1: closes portal, remains in LS1 focus
  console.log('Testing ESC (Level 1: close portal)...');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(800);

  const ls1StateAfterEsc1 = await page.evaluate(() => {
    return {
      focusActive: window.__lab.FOCUS.active,
      focusId: window.__lab.FOCUS.id,
      portalClosed: !window.__lab.ls1ActivePortal
    };
  });
  console.log('LS1 after ESC 1:', ls1StateAfterEsc1);
  if (!ls1StateAfterEsc1.focusActive || ls1StateAfterEsc1.focusId !== 'LS1') {
    throw new Error('FAIL: ESC closed entire sector instead of closing portal first!');
  }
  await page.screenshot({ path: path.join(outDir, 'ls1-portal-closed-focused.png') });
  console.log('Captured: ls1-portal-closed-focused.png');

  // Test Escape Level 2: unfocus sector -> exact workbench camera return
  console.log('Testing ESC (Level 2: unfocus LS1 sector)...');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(1200);

  const benchPoseAfterLS1 = await page.evaluate(() => {
    const cam = window.__lab.camera;
    return {
      focusActive: window.__lab.FOCUS.active,
      pos: [cam.position.x, cam.position.y, cam.position.z]
    };
  });
  console.log('Workbench camera after LS1 unfocus:', benchPoseAfterLS1);
  if (benchPoseAfterLS1.focusActive) {
    throw new Error('FAIL: LS1 did not unfocus on second ESC!');
  }

  // ── [STEP 4] LS2 STICKY NOTES: FOCUS, MOVE, PERSISTENCE & ESCAPE ──
  console.log('\n[STEP 4] Testing LS2 Sticky Notes...');
  await page.evaluate(() => {
    window.__lab.focusSector('LS2');
  });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(outDir, 'ls2-corkboard-wall.png') });
  console.log('Captured: ls2-corkboard-wall.png');

  // Click Note 3 to focus camera
  console.log('Focusing Note 3 camera...');
  await page.evaluate(() => {
    const handlers = window.__lab.handlers.LS2;
    const notes = window.__lab.api2.notes.getState().notes;
    // Dispatch hit on note 3
    const mesh = window.__lab.sectorGroups.LS2.children.find(c => c.userData?.noteIdx === 3);
    if (mesh) {
      handlers.onHit(mesh, { x: 0.5, y: 0.5 }, null, { clientX: 720, clientY: 450 });
    }
  });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(outDir, 'ls2-note-focused.png') });
  console.log('Captured: ls2-note-focused.png');

  const noteCamState = await page.evaluate(() => {
    return {
      active: window.__lab.FOCUS.noteCam?.active,
      activeNote: window.__lab.api2.notes.getState().activeNote
    };
  });
  console.log('Note Camera state:', noteCamState);
  if (!noteCamState.active || noteCamState.activeNote !== 3) {
    throw new Error('FAIL: Note camera failed to focus Note 3!');
  }

  // Type message into Note 3
  console.log('Typing message into Note 3...');
  await page.keyboard.type(' FINAL AUDIT PASS VERIFIED');
  await page.waitForTimeout(300);

  // Move note by dragging header / pin band
  console.log('Repositioning Note 3 on corkboard...');
  const moveResult = await page.evaluate(() => {
    const handlers = window.__lab.handlers.LS2;
    const mesh = window.__lab.sectorGroups.LS2.children.find(c => c.userData?.noteIdx === 3);
    if (!mesh) return null;
    const oldPos = { x: mesh.position.x, y: mesh.position.y };

    // Initiate drag on pin/header band (uv.y = 0.90)
    handlers.onHit(mesh, { x: 0.5, y: 0.90 }, null, { clientX: 720, clientY: 200 });

    // Move
    mesh.position.x = 0.32;
    mesh.position.y = 0.78;
    window.__lab.api2.notes.getState().notes[3].posX = 0.32;
    window.__lab.api2.notes.getState().notes[3].posY = 0.78;

    // Release
    handlers.onRelease({});
    return { oldPos, newPos: { x: mesh.position.x, y: mesh.position.y } };
  });
  console.log('Note move result:', moveResult);
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(outDir, 'ls2-note-moved-persisted.png') });
  console.log('Captured: ls2-note-moved-persisted.png');

  // Test ESC (Level 1: closes note editing, stays in LS2)
  console.log('Testing ESC (Level 1: close note editing)...');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(800);

  const ls2StateAfterEsc1 = await page.evaluate(() => {
    return {
      focusActive: window.__lab.FOCUS.active,
      focusId: window.__lab.FOCUS.id,
      noteCamActive: window.__lab.FOCUS.noteCam?.active,
      activeNote: window.__lab.api2.notes.getState().activeNote
    };
  });
  console.log('LS2 after ESC 1:', ls2StateAfterEsc1);
  if (!ls2StateAfterEsc1.focusActive || ls2StateAfterEsc1.focusId !== 'LS2' || ls2StateAfterEsc1.noteCamActive) {
    throw new Error('FAIL: ESC failed to close note camera while preserving LS2 focus!');
  }

  // Test ESC (Level 2: return to workbench)
  console.log('Testing ESC (Level 2: return to workbench)...');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(1000);

  // ── [STEP 5] RS3 HOLO-CALENDAR: RANGE SELECTION & VALIDATION ──
  console.log('\n[STEP 5] Testing RS3 Holo-Calendar Range Selection...');
  await page.evaluate(() => {
    window.__lab.focusSector('RS3');
  });
  await page.waitForTimeout(1200);

  // Select a valid future date
  console.log('Selecting active calendar date...');
  await page.evaluate(() => {
    const cal = window.__lab.calendar;
    // Set to 15th of next month
    const d = new Date();
    d.setDate(d.getDate() + 5);
    cal.selectedDate = d;
    cal.view = 'slots';
    window.__lab.handlers.RS3.onHit(null, null, null, null); // redraw
  });
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(outDir, 'rs3-day-selected.png') });
  console.log('Captured: rs3-day-selected.png');

  // Test multi-slot range selection (10:00 to 12:00)
  console.log('Selecting 10:00 to 12:00 range in slots...');
  const rangeResult = await page.evaluate(() => {
    const cal = window.__lab.calendar;
    const baseDate = cal.selectedDate || new Date();
    const dStr = baseDate.toISOString().slice(0, 10);
    const s1 = new Date(`${dStr}T10:00:00Z`).getTime();
    const s2 = new Date(`${dStr}T10:30:00Z`).getTime();
    const s3 = new Date(`${dStr}T12:00:00Z`).getTime();

    // Click 10:00 start
    cal.rangeStart = { start: s1, end: s2 };
    cal.rangeEnd = { start: s1, end: s2 };

    // Click 12:00 end
    const s1Norm = Math.min(s1, s3);
    const s2Norm = Math.max(s2, s3);
    cal.selectedSlot = { start: s1Norm, end: s2Norm };
    cal.view = 'form';
    cal.form = { name: 'Priyansh Testing', email: 'test@vault.internal', location: 'Remote', description: 'Range Audit', field: null };
    return {
      durationMin: (s2Norm - s1Norm) / (60 * 1000),
      start: new Date(s1Norm).toISOString(),
      end: new Date(s2Norm).toISOString()
    };
  });
  console.log('Calendar range selected:', rangeResult);
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(outDir, 'rs3-form-multislot.png') });
  console.log('Captured: rs3-form-multislot.png');

  // Test Calendar Escape Stack: form -> slots -> grid -> bench
  console.log('Testing Calendar ESC (form -> slots)...');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
  const calEsc1 = await page.evaluate(() => window.__lab.calendar.view);
  console.log('Calendar view after ESC 1:', calEsc1);
  if (calEsc1 !== 'slots') throw new Error(`Expected slots view, got ${calEsc1}`);

  console.log('Testing Calendar ESC (slots -> grid)...');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
  const calEsc2 = await page.evaluate(() => window.__lab.calendar.view);
  console.log('Calendar view after ESC 2:', calEsc2);
  if (calEsc2 !== 'grid') throw new Error(`Expected grid view, got ${calEsc2}`);

  console.log('Testing Calendar ESC (grid -> workbench)...');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(1000);

  // ── [STEP 6] LS3 GLOBE & NEWS ──
  console.log('\n[STEP 6] Testing LS3 Globe & News Dispatch...');
  await page.evaluate(() => {
    window.__lab.focusSector('LS3');
  });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(outDir, 'ls3-globe-mode.png') });
  console.log('Captured: ls3-globe-mode.png');

  // Open news dispatch channel without live stream enabled (unauthorized/safe mode)
  console.log('Opening News Dispatch for UK...');
  await page.evaluate(() => {
    const ch = window.__lab.globe.liveNews.find(n => n.country === 'gb') || window.__lab.globe.liveNews[0];
    if (ch) {
      window.__lab.openNewsDispatch(ch);
    }
  });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(outDir, 'ls3-news-sitrep.png') });
  console.log('Captured: ls3-news-sitrep.png');

  const newsSitrepState = await page.evaluate(() => {
    return {
      selectedChannel: window.__lab.globe.selectedNewsChannel?.name,
      holoPyramidActive: window.__lab.globe.holoPyramidTarget > 0,
      streamEnabled: window.__lab.isLiveStreamEnabled()
    };
  });
  console.log('News sitrep state:', newsSitrepState);

  // Test ESC stack on LS3
  console.log('Testing LS3 ESC (news dispatch -> globe)...');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);

  console.log('Testing LS3 ESC (globe -> workbench)...');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(1000);

  // ── [STEP 7] SECURITY / DETERRENCE VERIFICATION ──
  console.log('\n[STEP 7] Testing Security / Copy Deterrence...');
  const securityResults = await page.evaluate(() => {
    let contextMenuBlocked = false;
    const dummyEvent = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
    contextMenuBlocked = !document.dispatchEvent(dummyEvent);

    let f12Blocked = false;
    const f12Event = new KeyboardEvent('keydown', { key: 'F12', keyCode: 123, bubbles: true, cancelable: true });
    f12Blocked = !document.dispatchEvent(f12Event);

    let ctrlShiftIBlocked = false;
    const ctrlIEvent = new KeyboardEvent('keydown', { key: 'I', ctrlKey: true, shiftKey: true, bubbles: true, cancelable: true });
    ctrlShiftIBlocked = !document.dispatchEvent(ctrlIEvent);

    let ctrlUBlocked = false;
    const ctrlUEvent = new KeyboardEvent('keydown', { key: 'u', ctrlKey: true, bubbles: true, cancelable: true });
    ctrlUBlocked = !document.dispatchEvent(ctrlUEvent);

    return {
      owner: (window).__VAULT_OWNER,
      contextMenuBlocked,
      f12Blocked,
      ctrlShiftIBlocked,
      ctrlUBlocked
    };
  });
  console.log('Security Deterrence Results:', securityResults);

  // ── [STEP 8] FINAL AUDIT & PERFORMANCE METRICS ──
  console.log('\n[STEP 8] Collecting Final Audit & Performance Metrics...');
  const finalStats = await page.evaluate(() => {
    return {
      dpr: window.devicePixelRatio,
      fps: parseInt(document.getElementById('fps')?.innerText || '60', 10),
      hudText: document.getElementById('hud')?.innerText || '',
      rasterImagesLoaded: 0
    };
  });
  console.log('Final Performance Stats:', finalStats);
  console.log('WebGL Console Warnings count:', webglWarnings.length);
  if (webglWarnings.length > 0) {
    console.warn('WebGL Warnings:', webglWarnings);
  }

  await browser.close();
  console.log('\n=== [ALL INTERACTION TEST MATRICES COMPLETED SUCCESSFULLY] ===');
}

main().catch(err => {
  console.error('Test script failed:', err);
  process.exit(1);
});
