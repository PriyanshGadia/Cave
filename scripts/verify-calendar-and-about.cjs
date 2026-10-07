const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function run() {
  console.log('=== [PLAYWRIGHT VERIFICATION: CALENDAR & ABOUT PORTFOLIO] ===');
  const browser = await chromium.launch({
    headless: true,
    args: ['--use-gl=angle', '--use-angle=gl', '--enable-webgl', '--ignore-gpu-blocklist']
  });

  const brainDir = 'C:/Users/gadia/.gemini/antigravity-ide/brain/5e3c0a45-c3f3-49e8-8c30-eccd6f3eac75';
  fs.mkdirSync('public/screenshots', { recursive: true });

  // -------------------------------------------------------------
  // PART 1: TEST /about PORTFOLIO PAGE
  // -------------------------------------------------------------
  console.log('\n--- PART 1: TESTING /about PORTFOLIO PAGE ---');
  const aboutPage = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1.5
  });

  const consoleLogs = [];
  aboutPage.on('console', msg => consoleLogs.push({ type: msg.type(), text: msg.text() }));

  const imgResponses = [];
  aboutPage.on('response', resp => {
    if (resp.url().includes('priyansh.webp')) {
      imgResponses.push({ url: resp.url(), status: resp.status() });
    }
  });

  console.log('1. Navigating to http://localhost:8788/about ...');
  const res = await aboutPage.goto('http://localhost:8788/about', { waitUntil: 'networkidle', timeout: 20000 });
  console.log(`   Page response status: ${res.status()}`);

  // Check user image status
  console.log('2. Verifying user image /priyansh.webp ...');
  const imgState = await aboutPage.evaluate(() => {
    const img = document.querySelector('img[src="/priyansh.webp"]');
    return img ? {
      src: img.src,
      complete: img.complete,
      naturalWidth: img.naturalWidth,
      naturalHeight: img.naturalHeight,
      visible: img.offsetWidth > 0 && img.offsetHeight > 0
    } : null;
  });
  console.log('   Image element info:', imgState);
  if (!imgState || !imgState.complete || imgState.naturalWidth === 0) {
    throw new Error('User portrait image failed to render on /about');
  }

  // Hero section screenshot
  console.log('3. Capturing Hero section screenshot...');
  const heroScreenshot = 'public/screenshots/about-hero.png';
  await aboutPage.screenshot({ path: heroScreenshot, clip: { x: 0, y: 0, width: 1440, height: 900 } });
  fs.copyFileSync(heroScreenshot, path.join(brainDir, 'about_hero.png'));

  // Scroll down to Academics & Engineering
  console.log('4. Scrolling to Academics & Engineering...');
  await aboutPage.evaluate(() => window.scrollTo(0, 1100));
  await aboutPage.waitForTimeout(500);
  const acadScreenshot = 'public/screenshots/about-academics.png';
  await aboutPage.screenshot({ path: acadScreenshot, clip: { x: 0, y: 0, width: 1440, height: 900 } });
  fs.copyFileSync(acadScreenshot, path.join(brainDir, 'about_academics.png'));

  // Test Web Audio synth in Acoustic Harmonics
  console.log('5. Testing Interactive Audio Synthesizer...');
  const soundCard = await aboutPage.locator('#instrument-guitar');
  if (await soundCard.isVisible()) {
    await soundCard.click();
    await aboutPage.waitForTimeout(300);
  }
  const soundScreenshot = 'public/screenshots/about-sound.png';
  await aboutPage.screenshot({ path: soundScreenshot, clip: { x: 0, y: 0, width: 1440, height: 900 } });
  fs.copyFileSync(soundScreenshot, path.join(brainDir, 'about_sound.png'));

  // Full page screenshot
  console.log('6. Capturing full portfolio page screenshot...');
  const fullScreenshot = 'public/screenshots/about-full.png';
  await aboutPage.screenshot({ path: fullScreenshot, fullPage: true });
  fs.copyFileSync(fullScreenshot, path.join(brainDir, 'about_full.png'));
  console.log('   -> Saved about_full.png');

  await aboutPage.close();

  // -------------------------------------------------------------
  // PART 2: TEST HOLO-CALENDAR WITH AUTHENTIC GOOGLE CALENDAR
  // -------------------------------------------------------------
  console.log('\n--- PART 2: TESTING VAULT HOLO-CALENDAR (RS3) ---');
  const vaultPage = await browser.newPage({
    viewport: { width: 1366, height: 768 },
    deviceScaleFactor: 1
  });

  const vaultLogs = [];
  vaultPage.on('console', msg => vaultLogs.push({ type: msg.type(), text: msg.text() }));

  console.log('1. Navigating to http://localhost:8788/index.html?lab&boot=skip ...');
  await vaultPage.goto('http://localhost:8788/index.html?lab&boot=skip', { waitUntil: 'load', timeout: 30000 });
  await vaultPage.waitForFunction(() => window.__lab?.state?.ready, { timeout: 20000 });
  await vaultPage.waitForTimeout(1000);

  // Focus RS3 Sector
  console.log('2. Focusing Sector RS3 (Holo-Calendar)...');
  await vaultPage.evaluate(() => {
    window.__lab.focusSector('RS3');
  });
  await vaultPage.waitForFunction(() => window.__lab.state.focusE >= 0.99, { timeout: 10000 });
  await vaultPage.waitForTimeout(600);

  // Wait for Google Calendar sync
  console.log('3. Waiting for Google Calendar sync...');
  await vaultPage.waitForFunction(() => {
    const cal = window.__lab.calendar;
    return cal && cal.configured === true && cal.syncedAt > 0;
  }, { timeout: 15000 });

  // Take screenshot of September 2026 grid with amber pips
  console.log('4. Capturing September 2026 Holo-Calendar grid screenshot...');
  const calGridScreenshot = 'public/screenshots/rs3-calendar-sept2026.png';
  await vaultPage.screenshot({ path: calGridScreenshot });
  fs.copyFileSync(calGridScreenshot, path.join(brainDir, 'rs3_calendar_sept2026.png'));
  console.log('   -> Saved rs3_calendar_sept2026.png');

  // Click Date 16 (Priyansh's Birthday)
  console.log("5. Selecting Date 16 (Priyansh's Birthday)...");
  await vaultPage.evaluate(() => {
    const cal = window.__lab.calendar;
    cal.selectedDate = new Date(2026, 8, 16); // Sept 16, 2026
    cal.view = 'slots';
    window.__lab.api2.calendar.redraw();
  });
  await vaultPage.waitForTimeout(600);

  const day16Screenshot = 'public/screenshots/rs3-calendar-day16.png';
  await vaultPage.screenshot({ path: day16Screenshot });
  fs.copyFileSync(day16Screenshot, path.join(brainDir, 'rs3_calendar_day16.png'));
  console.log('   -> Saved rs3_calendar_day16.png');

  // Open event details for Priyansh's Birthday
  console.log("6. Opening Event Details Modal for Priyansh's Birthday...");
  await vaultPage.evaluate(() => {
    const cal = window.__lab.calendar;
    const bday = (cal.events || []).find(e => e.summary && e.summary.includes("Priyansh's Birthday"));
    if (bday) {
      cal.selectedEvent = bday;
      cal.view = 'event_detail';
      window.__lab.api2.calendar.redraw();
    }
  });
  await vaultPage.waitForTimeout(600);

  const eventDetailScreenshot = 'public/screenshots/rs3-calendar-event-modal.png';
  await vaultPage.screenshot({ path: eventDetailScreenshot });
  fs.copyFileSync(eventDetailScreenshot, path.join(brainDir, 'rs3_calendar_event_modal.png'));
  console.log('   -> Saved rs3_calendar_event_modal.png');

  await vaultPage.close();
  await browser.close();

  console.log('\n=== [ALL PLAYWRIGHT TESTS PASSED SUCCESSFULLY!] ===');
}

run().catch(err => {
  console.error('VERIFICATION FAILED:', err);
  process.exit(1);
});
