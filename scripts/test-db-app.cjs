/**
 * Verification test for Local Database App (port 8790) and localhost site (port 8788)
 */

const { chromium } = require('playwright');
const assert = require('assert');
const path = require('path');
const fs = require('fs');

async function waitPort(url, timeoutMs = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch (e) {}
    await new Promise(r => setTimeout(r, 800));
  }
  throw new Error(`Timeout waiting for ${url}`);
}

async function run() {
  console.log('--- Step 1: Verify Port 8790 (Local Database App) ---');
  await waitPort('http://127.0.0.1:8790/api/stats');
  const stats = await fetch('http://127.0.0.1:8790/api/stats').then(r => r.json());
  console.log('Stats:', stats);
  assert(stats.success, 'Stats endpoint should return success');
  assert(stats.stats.users.total > 0, 'Should have registered users in DB');
  assert(stats.stats.devices.total > 0, 'Should have bound devices in DB');

  const usersRes = await fetch('http://127.0.0.1:8790/api/users').then(r => r.json());
  console.log(`Users retrieved: ${usersRes.users.length}`);
  const sampleUser = usersRes.users.find(u => u.photoDataUrl && u.latestDevice?.signals);
  assert(sampleUser, 'Should find at least one user with photo and device signals');
  console.log(`Sample user verified: ${sampleUser.displayName} (${sampleUser.id})`);
  console.log(`Photo Data URL length: ${sampleUser.photoDataUrl.length} chars (starts with ${sampleUser.photoDataUrl.slice(0, 30)})`);
  console.log(`Device Signals Platform: ${sampleUser.latestDevice.signals.platform}`);
  console.log(`Device Signals CanvasHash: ${sampleUser.latestDevice.signals.canvasHash}`);

  console.log('\n--- Step 2: Verify Port 8788 (Main Localhost Site) ---');
  await waitPort('http://127.0.0.1:8788/');
  const siteRes = await fetch('http://127.0.0.1:8788/');
  assert(siteRes.ok, 'Site on port 8788 should return HTTP 200');
  console.log('Localhost site 8788 is responding with HTTP 200 OK!');

  console.log('\n--- Step 3: Browser UI Verification of Local Database App ---');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  await page.goto('http://127.0.0.1:8790/');
  await page.waitForSelector('.op-card', { timeout: 10000 });
  const cardCount = await page.locator('.op-card').count();
  console.log(`Operative cards rendered in UI: ${cardCount}`);
  assert(cardCount > 0, 'Should render operative cards');

  // Verify photos are visible
  const photoCount = await page.locator('.op-avatar-img').count();
  console.log(`Operative photo elements visible: ${photoCount}`);
  assert(photoCount > 0, 'Should have avatar photos');

  // Verify device fingerprint is visible on cards
  const devBoxCount = await page.locator('.device-telemetry-box').count();
  console.log(`Device telemetry boxes rendered: ${devBoxCount}`);
  assert(devBoxCount > 0, 'Should display device telemetry');

  const scrDir = path.resolve(__dirname, '../public/screenshots');
  if (!fs.existsSync(scrDir)) fs.mkdirSync(scrDir, { recursive: true });

  const shot1 = path.join(scrDir, 'verified-local-db-app-directory.png');
  await page.screenshot({ path: shot1 });
  console.log(`Saved screenshot: ${shot1}`);

  // Test Tab 2: Devices & Fingerprints
  console.log('\n--- Step 4: Verify Devices & Fingerprints Tab ---');
  await page.click('button:has-text("HARDWARE & DEVICE FINGERPRINTS")');
  await page.waitForSelector('#devices-table-body tr', { timeout: 5000 });
  const devRowCount = await page.locator('#devices-table-body tr').count();
  console.log(`Device table rows rendered: ${devRowCount}`);
  assert(devRowCount > 0, 'Should have rows in devices table');

  const shot2 = path.join(scrDir, 'verified-local-db-app-devices.png');
  await page.screenshot({ path: shot2 });
  console.log(`Saved screenshot: ${shot2}`);

  // Test SQL Workbench tab
  console.log('\n--- Step 5: Verify SQL Workbench ---');
  await page.click('button:has-text("SQL WORKBENCH")');
  await page.fill('#sql-query-input', 'SELECT id, display_name, handle, access_level, status FROM vault_users LIMIT 5;');
  await page.click('button:has-text("EXECUTE QUERY")');
  await page.waitForSelector('#sql-results-table tbody tr', { timeout: 5000 });
  const sqlRows = await page.locator('#sql-results-table tbody tr').count();
  console.log(`SQL Workbench returned rows: ${sqlRows}`);
  assert(sqlRows === 5, 'Should return exactly 5 rows');

  const shot3 = path.join(scrDir, 'verified-local-db-app-sql.png');
  await page.screenshot({ path: shot3 });
  console.log(`Saved screenshot: ${shot3}`);

  // Test editing an operative via the local app
  console.log('\n--- Step 6: Verify User Edit via Local App ---');
  await page.click('button:has-text("OPERATIVES DIRECTORY")');
  await page.waitForSelector('.op-card', { timeout: 5000 });
  await page.locator('.op-card').first().locator('button:has-text("EDIT")').click();
  await page.waitForSelector('#modal-edit.active', { timeout: 5000 });

  const currentName = await page.inputValue('#edit-name');
  console.log(`Editing operative: ${currentName}`);
  const updatedName = currentName.includes('[UPDATED]') ? currentName.replace(' [UPDATED]', '') : currentName + ' [UPDATED]';
  await page.fill('#edit-name', updatedName);
  await page.click('button:has-text("SAVE CHANGES")');

  await page.waitForFunction(() => !document.getElementById('modal-edit').classList.contains('active'));
  await page.waitForTimeout(1000);

  const editedCardText = await page.locator('.op-card').first().textContent();
  assert(editedCardText.includes(updatedName), 'Operative name should be updated in directory');
  console.log(`Operative successfully updated in direct SQLite database to: ${updatedName}`);

  // Also check main site 8788 HUD for the LOCAL DB APP button
  console.log('\n--- Step 7: Verify Main 3D Site HUD button for Local DB App ---');
  await page.goto('http://127.0.0.1:8788/');
  await page.waitForSelector('#btn-open-db-app', { timeout: 15000 });
  const dbBtn = page.locator('#btn-open-db-app');
  const btnHref = await dbBtn.getAttribute('href');
  console.log(`Main 3D site has Local DB App button pointing to: ${btnHref}`);
  assert(btnHref === 'http://127.0.0.1:8790', 'HUD button should point to http://127.0.0.1:8790');

  const shot4 = path.join(scrDir, 'verified-main-site-with-db-button.png');
  await page.screenshot({ path: shot4 });
  console.log(`Saved screenshot: ${shot4}`);

  await browser.close();
  console.log('\n✅ ALL VERIFICATION CHECKS PASSED PERFECTLY!');
}

run().catch(e => {
  console.error('❌ Verification failed:', e);
  process.exit(1);
});
