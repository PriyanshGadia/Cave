import { chromium } from 'playwright';

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

  const consoleLogs: { type: string; text: string }[] = [];
  page.on('console', msg => {
    const text = msg.text();
    consoleLogs.push({ type: msg.type(), text });
  });

  page.on('pageerror', err => {
    console.error('PAGE ERROR:', err.message);
    consoleLogs.push({ type: 'error', text: err.message });
  });

  console.log('1. Navigating to http://127.0.0.1:3000/index.html?lab&boot=skip ...');
  await page.addInitScript(() => {
    (window as any).__name = (f: any, _n: any) => f;
  });
  await page.goto('http://127.0.0.1:3000/index.html?lab&boot=skip', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction('window.__lab && window.__lab.state && window.__lab.state.ready', { timeout: 25000 });
  await page.waitForTimeout(1000);

  // Focus RS3 Sector
  console.log('2. Focusing Sector RS3 (Holo-Calendar)...');
  await page.evaluate(() => {
    const lab = (window as any).__lab;
    lab.focusSector('RS3');
  });
  await page.waitForTimeout(1500);

  // Wait for Google Calendar sync
  console.log('3. Waiting for Google Calendar sync...');
  await page.waitForFunction(() => {
    const cal = (window as any).__lab.calendar;
    return cal && cal.configured === true && cal.syncedAt > 0;
  }, { timeout: 15000 });

  const calData = await page.evaluate(() => {
    const cal = (window as any).__lab.calendar;
    return {
      configured: cal.configured,
      busyCount: cal.busy.length,
      eventsCount: cal.events.length,
      events: cal.events.map((e: any) => ({
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

  // Find date with existing events or fallback
  console.log('4. Selecting a date with scheduled events (e.g. Sept 8)...');
  const targetDateInfo = await page.evaluate(() => {
    const cal = (window as any).__lab.calendar;
    let targetDay: Date;
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
    (window as any).__lab.api2.calendar.redraw();
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
    const cal = (window as any).__lab.calendar;
    const startOfDay = new Date(cal.selectedDate); startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(cal.selectedDate); endOfDay.setHours(23, 59, 59, 999);
    const dayEvents = (cal.events || []).filter((e: any) => e.start <= endOfDay && e.end >= startOfDay);
    return {
      view: cal.view,
      dayEventsCount: dayEvents.length,
      dayEvents: dayEvents.map((e: any) => ({
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
    const cal = (window as any).__lab.calendar;
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
    (window as any).__lab.api2.calendar.redraw();
    return {
      slot: {
        start: firstBox.slot.start.toISOString(),
        end: firstBox.slot.end.toISOString()
      }
    };
  });
  console.log('   Selected Slot for Booking:', slotSelected);
  await page.waitForTimeout(600);

  await page.screenshot({ path: 'public/screenshots/rs3-booking-form.png' });
  console.log('   -> Screenshot captured: public/screenshots/rs3-booking-form.png');

  // Submit the meeting request
  console.log('6. Submitting meeting request and testing immediate block update...');
  await page.evaluate(() => {
    (window as any).__lab.api2.calendar.submit();
  });

  // Wait for transition to 'sent'
  await page.waitForFunction(() => {
    const cal = (window as any).__lab.calendar;
    return cal && cal.view === 'sent';
  }, { timeout: 15000 });

  console.log('   ✓ Transitioned to SENT view!');
  await page.waitForTimeout(600);

  await page.screenshot({ path: 'public/screenshots/rs3-booking-sent-confirmation.png' });
  console.log('   -> Screenshot captured: public/screenshots/rs3-booking-sent-confirmation.png');

  // Verify that the event was immediately blocked on the calendar state
  const postBookingState = await page.evaluate(() => {
    const cal = (window as any).__lab.calendar;
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
    const cal = (window as any).__lab.calendar;
    cal.view = 'slots';
    (window as any).__lab.api2.calendar.redraw();
  });
  await page.waitForTimeout(600);

  await page.screenshot({ path: 'public/screenshots/rs3-schedule-updated.png' });
  console.log('   -> Screenshot captured: public/screenshots/rs3-schedule-updated.png');

  // Check console errors and WebGL warnings
  console.log('8. Checking WebGL warnings and errors...');
  const errors = consoleLogs.filter(l => l.type === 'error');
  const warnings = consoleLogs.filter(l => l.text.toLowerCase().includes('webgl') || l.text.toLowerCase().includes('warning'));
  console.log(`   Console Errors: ${errors.length}`);
  console.log(`   WebGL Warnings: ${warnings.length}`);
  if (errors.length > 0) console.error('   Errors:', errors);
  if (warnings.length > 0) console.warn('   Warnings:', warnings);

  await browser.close();
  console.log('=== [RS3 VERIFICATION SUITE FINISHED] ===');
}

run().catch(err => {
  console.error('FATAL TEST ERROR:', err);
  process.exit(1);
});
