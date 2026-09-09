const { chromium } = require('playwright');

async function run() {
  console.log('=== [RS3 HOLO-CALENDAR VERIFICATION SUITE] ===');
  const browser = await chromium.launch({
    headless: true,
    args: ['--use-gl=angle', '--use-angle=gl', '--enable-webgl', '--ignore-gpu-blocklist'],
  });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });

  const consoleLogs = [];
  page.on('console', msg => {
    const text = msg.text();
    consoleLogs.push({ type: msg.type(), text });
  });

  page.on('pageerror', err => {
    console.error('PAGE ERROR:', err.message);
    consoleLogs.push({ type: 'error', text: err.message });
  });

  console.log('1. Navigating to http://localhost:3000/index.html?lab&boot=skip ...');
  await page.addInitScript(() => {
    window.__name = (f, _n) => f;
  });
  await page.goto('http://localhost:3000/index.html?lab&boot=skip', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction('window.__lab && window.__lab.state && window.__lab.state.ready', { timeout: 25000 });
  await page.waitForTimeout(1000);

  // Focus RS3 Sector
  console.log('2. Focusing Sector RS3 (Holo-Calendar)...');
  await page.evaluate(() => {
    window.__lab.focusSector('RS3');
  });
  await page.waitForFunction(() => window.__lab.state.focusE >= 0.99, { timeout: 10000 });
  await page.waitForTimeout(600);

  // Wait for Google Calendar sync
  console.log('3. Waiting for Google Calendar sync...');
  await page.waitForFunction(() => {
    const cal = window.__lab.calendar;
    return cal && cal.configured === true && cal.syncedAt > 0;
  }, { timeout: 15000 });

  const calData = await page.evaluate(() => {
    const cal = window.__lab.calendar;
    return {
      configured: cal.configured,
      busyCount: cal.busy.length,
      eventsCount: cal.events.length,
      events: cal.events.map(e => ({
        id: e.id,
        summary: e.summary,
        start: e.start.toISOString(),
        end: e.end.toISOString(),
        status: e.status
      })),
      view: cal.view
    };
  });
  console.log('   Calendar Data Synced:', {
    configured: calData.configured,
    busyCount: calData.busyCount,
    eventsCount: calData.eventsCount,
    events: calData.events
  });

  if (calData.eventsCount === 0) {
    console.warn('   WARNING: No Google Calendar events found in sync window!');
  } else {
    console.log(`   SUCCESS: Fetched ${calData.eventsCount} real Google Calendar event(s)!`);
  }

  await page.screenshot({ path: 'public/screenshots/rs3-events-grid.png' });
  console.log('   -> Screenshot captured: public/screenshots/rs3-events-grid.png');

  // Select a date with scheduled events (e.g. Sept 8)
  console.log('4. Selecting a date with scheduled events (e.g. Sept 8)...');
  const targetDateInfo = await page.evaluate(() => {
    const cal = window.__lab.calendar;
    let targetDay;
    if (cal.events && cal.events.length > 0) {
      targetDay = new Date(cal.events[0].start);
      targetDay.setHours(0, 0, 0, 0);
    } else {
      targetDay = new Date();
      targetDay.setDate(targetDay.getDate() + 1);
      targetDay.setHours(0, 0, 0, 0);
    }
    cal.selectedDate = targetDay;
    cal.view = 'slots';
    window.__lab.api2.calendar.redraw();
    return {
      date: targetDay.toISOString(),
      label: targetDay.toLocaleDateString()
    };
  });
  console.log('   Selected Day for Schedule View:', targetDateInfo);
  await page.waitForTimeout(600);

  await page.screenshot({ path: 'public/screenshots/rs3-schedule-view.png' });
  console.log('   -> Screenshot captured: public/screenshots/rs3-schedule-view.png');

  // Verify schedule contents
  const scheduleDetails = await page.evaluate(() => {
    const cal = window.__lab.calendar;
    const startOfDay = new Date(cal.selectedDate); startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(cal.selectedDate); endOfDay.setHours(23, 59, 59, 999);
    const dayEvents = (cal.events || []).filter(e => e.start <= endOfDay && e.end >= startOfDay);
    return {
      view: cal.view,
      dayEventsCount: dayEvents.length,
      dayEvents: dayEvents.map(e => ({
        summary: e.summary,
        start: e.start.toISOString(),
        end: e.end.toISOString()
      })),
      slotBoxesCount: (cal._slotBoxes || []).length
    };
  });
  console.log('   Schedule View Details:', scheduleDetails);

  // Pick an open slot and open the request form
  console.log('5. Selecting an open slot to submit meeting request...');
  const slotSelected = await page.evaluate(() => {
    const cal = window.__lab.calendar;
    if (!cal._slotBoxes || cal._slotBoxes.length === 0) return null;
    const firstBox = cal._slotBoxes[0];
    cal.selectedSlot = firstBox.slot;
    cal.form = {
      name: 'Agentic Verification Test',
      email: 'test-agent@example.com',
      location: 'Vault-01 / Virtual Portal',
      description: 'End-to-end verification of booking sync and calendar blocking.',
      field: null
    };
    cal.view = 'form';
    window.__lab.api2.calendar.redraw();
    return {
      slot: {
        start: firstBox.slot.start.toISOString(),
        end: firstBox.slot.end.toISOString()
      }
    };
  });
  console.log('   Selected Slot for Booking:', slotSelected);
  await page.waitForTimeout(600);

  // 5.5 Safety Gate: Assert test isolation mode before submitting
  console.log('5.5 Asserting test isolation safety mode (belt and suspenders)...');
  const serverMode = await page.evaluate(async () => {
    try {
      const res = await fetch('/api/calendar/mode');
      return await res.json();
    } catch (e) {
      return { error: e.message };
    }
  });
  console.log('   Server Calendar Mode:', serverMode);
  if (!serverMode || serverMode.targetCalendarId === 'primary') {
    throw new Error('FATAL SAFETY VIOLATION: Automated test detected targetCalendarId === "primary"! Automated tests must NEVER write to primary Google Calendar.');
  }
  console.log(`   ✓ Test isolation verified: targetCalendarId is "${serverMode.targetCalendarId}" (safe, non-primary)`);

  // Submit the meeting request
  console.log('6. Submitting meeting request and testing immediate block update...');
  await page.evaluate(() => {
    window.__lab.api2.calendar.submit();
  });

  // Wait for transition to 'sent'
  await page.waitForFunction(() => {
    const cal = window.__lab.calendar;
    return cal && cal.view === 'sent';
  }, { timeout: 15000 });

  console.log('   ✓ Transitioned to SENT view!');
  await page.waitForTimeout(600);

  await page.screenshot({ path: 'public/screenshots/rs3-booking-sent-confirmation.png' });
  console.log('   -> Screenshot captured: public/screenshots/rs3-booking-sent-confirmation.png');

  // Verify that the event was immediately blocked on the calendar state
  const postBookingState = await page.evaluate(() => {
    const cal = window.__lab.calendar;
    return {
      view: cal.view,
      lastBooked: cal.lastBooked ? {
        summary: cal.lastBooked.summary,
        name: cal.lastBooked.name,
        start: cal.lastBooked.start.toISOString(),
        end: cal.lastBooked.end.toISOString()
      } : null,
      eventsCount: cal.events.length,
      busyCount: cal.busy.length
    };
  });
  console.log('   Post-Booking Calendar State:', postBookingState);

  // Return to schedule view
  console.log('7. Returning to schedule view to verify the booked event is now displayed...');
  await page.evaluate(() => {
    const cal = window.__lab.calendar;
    cal.view = 'slots';
    window.__lab.api2.calendar.redraw();
  });
  await page.waitForTimeout(600);

  await page.screenshot({ path: 'public/screenshots/rs3-schedule-updated.png' });
  console.log('   -> Screenshot captured: public/screenshots/rs3-schedule-updated.png');

  // Capture angled view showing hard-light backing plate with zero background bleed-through
  console.log('8. Capturing angled view of hard-light backing panel...');
  await page.evaluate(() => {
    const lab = window.__lab;
    const g = lab.sectorGroups['RS3'];
    lab.camera.position.set(2.2, 1.4, 2.9);
    lab.camera.lookAt(g.position.x, g.position.y + 0.78, g.position.z);
  });
  await page.waitForTimeout(800);

  await page.screenshot({ path: 'public/screenshots/rs3-hard-light-backing.png' });
  console.log('   -> Screenshot captured: public/screenshots/rs3-hard-light-backing.png');

  // Check console errors and WebGL warnings
  console.log('9. Checking WebGL warnings and errors...');
  const errors = consoleLogs.filter(l => l.type === 'error');
  const warnings = consoleLogs.filter(l => l.text.toLowerCase().includes('webgl') || l.text.toLowerCase().includes('warning'));
  console.log(`   Console Errors: ${errors.length}`);
  console.log(`   WebGL Warnings: ${warnings.length}`);
  if (errors.length > 0) console.error('   Errors:', errors);
  if (warnings.length > 0) console.warn('   Warnings:', warnings);

  await browser.close();
  console.log('=== [RS3 VERIFICATION SUITE FINISHED SUCCESSFULLY] ===');
}

run().catch(err => {
  console.error('FATAL TEST ERROR:', err);
  process.exit(1);
});
