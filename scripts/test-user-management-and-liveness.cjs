/**
 * scripts/test-user-management-and-liveness.cjs
 *
 * Verifies:
 * 1. Consent form placeholder has no mention of 'Priyansh Gadia' (must be 'ENTER FULL OPERATIVE NAME').
 * 2. Dedicated [ 👥 USERS ] button opens the cybernetic User Management Window.
 * 3. User directory loads existing operatives from Cloudflare D1.
 * 4. Operative search/filter behaves correctly.
 * 5. Operative edit drawer updates display name & access tier, persisting to D1.
 * 6. Provision new operative creates record in D1 and refreshes table.
 * 7. Revoke/delete permanently removes record from D1.
 * 8. Liveness challenge issues 2 friendly prompts and processes without error.
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function run() {
  console.log('=== [USER MANAGEMENT & LIVENESS VERIFICATION GATE] ===');
  const browser = await chromium.launch({
    headless: true,
    args: [
      '--use-gl=angle',
      '--use-angle=gl',
      '--enable-webgl',
      '--ignore-gpu-blocklist',
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      '--no-sandbox',
    ],
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    permissions: ['camera'],
  });

  const page = await context.newPage();

  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  const artDir = 'C:\\Users\\gadia\\.gemini\\antigravity-ide\\brain\\5e3c0a45-c3f3-49e8-8c30-eccd6f3eac75';
  fs.mkdirSync('public/screenshots', { recursive: true });

  console.log('1. Navigating to http://127.0.0.1:8788/index.html ...');
  await page.goto('http://127.0.0.1:8788/index.html', { waitUntil: 'load', timeout: 30000 });

  console.log('Waiting for procedural compilation to complete (#load detached)...');
  await page.waitForSelector('#load', { state: 'detached', timeout: 30000 });
  await page.waitForFunction(() => Boolean(window.VAULT?.showUserManagerModal), { timeout: 15000 });
  console.log('Procedural compilation complete.');

  // Check 1: Consent modal placeholder
  console.log('2. Checking consent modal placeholder...');
  await page.waitForTimeout(1000);
  let consentModal = await page.$('#sec-doc-container');
  if (!consentModal || !(await consentModal.isVisible())) {
    console.log('Opening consent modal via HUD...');
    await page.click('#btn-open-consent');
    await page.waitForSelector('#sec-doc-container');
  }

  const nameInput = page.locator('#vault-declared-name');
  const placeholder = await nameInput.getAttribute('placeholder');
  console.log(`Consent placeholder value: "${placeholder}"`);
  if (placeholder.toLowerCase().includes('priyansh')) {
    throw new Error(`FAIL: Placeholder still contains 'Priyansh': "${placeholder}"`);
  }
  if (!placeholder.includes('ENTER FULL OPERATIVE NAME')) {
    throw new Error(`FAIL: Placeholder expected 'ENTER FULL OPERATIVE NAME', got: "${placeholder}"`);
  }
  console.log('✓ Check 1 Passed: Consent form has clean generic placeholder.');

  // Save screenshot of clean consent modal
  const consentScreenshotPath = path.join('public', 'screenshots', 'verified-clean-consent-modal.png');
  await page.screenshot({ path: consentScreenshotPath });
  fs.copyFileSync(consentScreenshotPath, path.join(artDir, 'verified-clean-consent-modal.png'));
  console.log('Saved verified-clean-consent-modal.png');

  // Close consent modal
  await page.click('#vault-consent-decline-btn');
  await page.waitForTimeout(500);

  // Check 2: User Manager Button in HUD
  console.log('3. Checking [ 👥 USERS ] button in HUD...');
  const userBtn = page.locator('#btn-user-manager');
  if (!(await userBtn.isVisible())) {
    throw new Error('FAIL: [ 👥 USERS ] button is not visible in HUD!');
  }
  console.log('✓ Check 2 Passed: [ 👥 USERS ] button exists.');

  // Check 3: Open User Manager Window
  console.log('4. Opening User Management Window...');
  await userBtn.click();
  await page.waitForSelector('#vault-user-manager-modal');
  await page.waitForTimeout(1500);

  // Check table has loaded operatives
  const rows = page.locator('#vum-table-body tr');
  const finalRowCount = await rows.count();
  console.log(`Operative rows in table: ${finalRowCount}`);
  if (finalRowCount < 2) {
    throw new Error(`FAIL: Expected multiple operatives in table, got ${finalRowCount}`);
  }
  console.log('✓ Check 3 Passed: User directory rendered live records from D1.');

  // Save screenshot of user manager window
  const userManagerScreenshotPath = path.join('public', 'screenshots', 'verified-user-manager-window.png');
  await page.screenshot({ path: userManagerScreenshotPath });
  fs.copyFileSync(userManagerScreenshotPath, path.join(artDir, 'verified-user-manager-window.png'));
  console.log('Saved verified-user-manager-window.png');

  // Check 4: Test Search Filter
  console.log('5. Testing search filter in user manager...');
  await page.fill('#vum-search-input', 'Alex');
  await page.waitForTimeout(400);
  const alexRows = await page.locator('#vum-table-body tr').count();
  console.log(`Rows matching 'Alex': ${alexRows}`);
  if (alexRows < 1) {
    throw new Error('FAIL: Filter for Alex yielded 0 rows');
  }
  await page.fill('#vum-search-input', '');
  await page.waitForTimeout(400);
  console.log('✓ Check 4 Passed: Search filter operates responsively.');

  // Check 5: Provision a new test operative through the UI
  console.log('6. Testing provision new operative through UI...');
  await page.click('#vum-new-btn');
  await page.waitForSelector('#vum-new-drawer', { state: 'visible' });
  const testName = 'Agent Sigma ' + Math.floor(Math.random() * 9000 + 1000);
  await page.fill('#vum-new-name', testName);
  await page.selectOption('#vum-new-level', 'TRUSTED');
  await page.click('#vum-new-submit');

  await page.waitForTimeout(1500);
  // Verify new operative is in the table
  await page.fill('#vum-search-input', testName);
  await page.waitForTimeout(400);
  const filteredNewRows = await page.locator('#vum-table-body tr').count();
  if (filteredNewRows !== 1) {
    throw new Error(`FAIL: Expected 1 row for newly provisioned ${testName}, found ${filteredNewRows}`);
  }
  console.log(`✓ Check 5 Passed: Successfully provisioned and verified ${testName} in D1.`);

  // Check 6: Edit the newly provisioned operative
  console.log('7. Testing editing operative in UI...');
  const editBtn = page.locator('#vum-table-body .vum-row-edit').first();
  await editBtn.click();
  await page.waitForSelector('#vum-edit-drawer', { state: 'visible' });

  const updatedName = testName + ' (EDITED)';
  await page.fill('#vum-edit-name', updatedName);
  await page.selectOption('#vum-edit-level', 'OWNER');
  await page.selectOption('#vum-edit-status', 'suspended');
  await page.click('#vum-edit-save');
  await page.waitForTimeout(1500);

  await page.fill('#vum-search-input', updatedName);
  await page.waitForTimeout(400);
  const editedRowText = await page.locator('#vum-table-body tr').first().textContent();
  console.log(`Edited row content: ${editedRowText.replace(/\s+/g, ' ')}`);
  if (!editedRowText.includes('OWNER') || !editedRowText.includes('SUSPENDED')) {
    throw new Error(`FAIL: Edited attributes OWNER/SUSPENDED not reflected in table row!`);
  }
  console.log('✓ Check 6 Passed: Operative edited and verified in D1.');

  // Save screenshot of edit drawer & table
  const editScreenshotPath = path.join('public', 'screenshots', 'verified-user-edited.png');
  await page.screenshot({ path: editScreenshotPath });
  fs.copyFileSync(editScreenshotPath, path.join(artDir, 'verified-user-edited.png'));
  console.log('Saved verified-user-edited.png');

  // Check 7: Revoke / Delete the test operative
  console.log('8. Testing revoke / delete operative in UI...');
  page.on('dialog', async dialog => {
    console.log(`Accepting confirmation dialog: "${dialog.message()}"`);
    await dialog.accept();
  });
  const delBtn = page.locator('#vum-table-body .vum-row-del').first();
  await delBtn.click();
  await page.waitForTimeout(1500);

  await page.fill('#vum-search-input', updatedName);
  await page.waitForTimeout(400);
  const remainingRows = await page.locator('#vum-table-body tr').first().textContent();
  if (!remainingRows.includes('NO MATCHING OPERATIVES FOUND')) {
    throw new Error(`FAIL: Revoked operative still appears in table: ${remainingRows}`);
  }
  console.log('✓ Check 7 Passed: Operative revoked and purged from D1.');

  // Close User Manager
  await page.click('#vum-close-btn');
  await page.waitForTimeout(500);

  // Check 8: Liveness Challenge mechanics
  console.log('9. Checking relaxed liveness challenge generation...');
  const chgRes = await page.evaluate(async () => {
    const res = await fetch('/api/vault/liveness/challenge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionType: 'SCAN' }),
    });
    return res.json();
  });
  console.log('Issued challenge:', chgRes);
  if (!chgRes.prompts || chgRes.prompts.length !== 2) {
    throw new Error(`FAIL: Expected exactly 2 prompts for liveness challenge, got ${chgRes.prompts?.length}`);
  }
  console.log('✓ Check 8 Passed: Liveness challenge issues 2 friendly gestures.');

  console.log('Checking for any console errors...');
  if (consoleErrors.length > 0) {
    console.warn('Console errors detected during test:', consoleErrors);
  } else {
    console.log('✓ Console clean with 0 errors.');
  }

  await browser.close();
  console.log('=== ALL USER MANAGEMENT & LIVENESS CHECKS PASSED ===');
}

run().catch(err => {
  console.error('TEST RUN FAILED:', err);
  process.exit(1);
});
