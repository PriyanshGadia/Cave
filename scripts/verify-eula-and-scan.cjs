const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function run() {
  console.log('=== [EULA & BIOMETRIC SCAN VERIFICATION] ===');
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
    args: ['--use-gl=angle', '--use-angle=gl', '--enable-webgl', '--ignore-gpu-blocklist'],
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  const consoleLogs = [];
  const warnings = [];
  page.on('console', msg => {
    const text = msg.text();
    const type = msg.type();
    consoleLogs.push(`[${type}] ${text}`);
    if (type === 'error' || text.toLowerCase().includes('webgl warning')) {
      warnings.push(`[${type}] ${text}`);
      console.warn(`[BROWSER ${type}] ${text}`);
    }
  });
  page.on('pageerror', err => {
    console.error('[BROWSER EXCEPTION]', err);
  });

  try {
    await page.addInitScript(() => {
      window.__testConsentModal = true;
    });

    console.log('1. Navigating to fresh session http://localhost:8788 ...');
    await page.goto('http://localhost:8788', { waitUntil: 'load' });
    console.log('Waiting for #sec-doc-container to appear after compilation...');
    await page.waitForSelector('#sec-doc-container', { state: 'visible', timeout: 12000 });

    // Step A: Verify EULA Modal is displayed on fresh visit
    const modal = page.locator('#sec-doc-container');
    const isModalVisible = await modal.isVisible();
    console.log('Is EULA / Consent modal visible on fresh visit?:', isModalVisible);
    if (!isModalVisible) throw new Error('EULA modal did not appear on fresh visit!');

    // Screenshot initial consent modal
    await page.screenshot({ path: path.join(__dirname, '../screenshots/01_eula_initial_modal.png') });
    console.log('Captured: 01_eula_initial_modal.png');

    // Fill in Operative Name and check boxes
    console.log('2. Filling operative declaration...');
    await page.fill('#vault-declared-name', 'Priyansh Gadia');
    await page.check('#vault-name-confirm');
    await page.check('#vault-terms-confirm');

    // Click confirm & enroll
    console.log('3. Clicking [ CONFIRM & ENROLL ]...');
    await page.click('#vault-consent-accept-btn');
    await page.waitForTimeout(1000);

    // Verify localStorage has consent record
    const storedConsent = await page.evaluate(() => localStorage.getItem('vault_dpdp_consent'));
    console.log('Stored consent in localStorage:', storedConsent);
    if (!storedConsent || !storedConsent.includes('Priyansh Gadia')) {
      throw new Error('Consent was not properly recorded in localStorage!');
    }

    // Step B: Reload page to verify modal does NOT automatically appear again
    console.log('4. Reloading page to test persistence and ensure modal does NOT re-appear...');
    await page.reload({ waitUntil: 'load' });
    console.log('Waiting for compilation to finish (#load detached)...');
    await page.waitForSelector('#load', { state: 'detached', timeout: 20000 });
    await page.waitForTimeout(1000);

    const isModalVisibleAfterReload = await page.locator('#sec-doc-container').isVisible();
    console.log('Is EULA modal visible after reload?:', isModalVisibleAfterReload);
    if (isModalVisibleAfterReload) {
      throw new Error('EULA modal incorrectly re-appeared after consent was already accepted!');
    }

    // Verify corner dock buttons are visible
    const infoBtn = page.locator('#btn-corner-info');
    const contactBtn = page.locator('#btn-corner-contact');
    console.log('Is corner info button visible?:', await infoBtn.isVisible());
    console.log('Is corner contact button visible?:', await contactBtn.isVisible());

    // Step C: Click corner info button to test Read-Only Review Mode
    console.log('5. Clicking corner Info (ℹ) button to inspect Read-Only Review Mode...');
    await infoBtn.click();
    await page.waitForSelector('#sec-doc-container', { state: 'visible', timeout: 6000 });

    const isReviewModalVisible = await page.locator('#sec-doc-container').isVisible();
    console.log('Is Review modal visible?:', isReviewModalVisible);
    if (!isReviewModalVisible) throw new Error('Review modal did not open on clicking Info button!');

    // Verify it is in read-only mode (no inputs, no enroll button)
    const hasNameInput = await page.locator('#vault-declared-name').isVisible();
    const hasAcceptBtn = await page.locator('#vault-consent-accept-btn').isVisible();
    const hasCloseBtn = await page.locator('#vault-consent-close-btn').isVisible();
    const hasDeleteBtn = await page.locator('a:has-text("REQUEST DATA DELETION")').first().isVisible();

    console.log('Review Mode Audit:');
    console.log('  - Has Name Input?:', hasNameInput, '(Expected: false)');
    console.log('  - Has Accept & Enroll Button?:', hasAcceptBtn, '(Expected: false)');
    console.log('  - Has Close Button?:', hasCloseBtn, '(Expected: true)');
    console.log('  - Has Request Data Deletion link?:', hasDeleteBtn, '(Expected: true)');

    if (hasNameInput || hasAcceptBtn || !hasCloseBtn || !hasDeleteBtn) {
      throw new Error('Review mode failed criteria: must be strictly read-only with deletion request link and close button!');
    }

    await page.screenshot({ path: path.join(__dirname, '../screenshots/02_eula_readonly_review_modal.png') });
    console.log('Captured: 02_eula_readonly_review_modal.png');

    // Close review modal
    await page.click('#vault-consent-close-btn');
    await page.waitForTimeout(500);
    console.log('Review modal closed cleanly.');

    // Step D: Rule 4 baseline checks (walk=0)
    console.log('6. Evaluating Rule 4 baseline at walk=0...');
    // Toggle debug HUD
    await page.keyboard.press('d');
    await page.waitForTimeout(500);

    const walk0Text = await page.locator('#dbg').innerText();
    console.log('HUD text at walk=0:\n', walk0Text);
    await page.screenshot({ path: path.join(__dirname, '../screenshots/03_gate_walk0_hud.png') });

    // Step E: Approach door console (walk=1) and test Biometric Terminal
    console.log('7. Approaching door terminal (walk=1)...');
    await page.evaluate(() => { window.VAULT.walk.target = 1; });
    await page.waitForTimeout(2000);

    const walk1Text = await page.locator('#dbg').innerText();
    console.log('HUD text at walk=1:\n', walk1Text);
    await page.screenshot({ path: path.join(__dirname, '../screenshots/04_gate_walk1_hud.png') });

    // Step F: Test Biometric ENROLL
    console.log('8. Testing Biometric ENROLL...');
    await page.evaluate(async () => {
      window.VAULT.walk.target = 1;
      await window.VAULT.act('ENROLL');
    });
    const enrollMode = await page.evaluate(() => window.VAULT.state.mode);
    console.log('Mode after enroll:', enrollMode);
    if (enrollMode !== 'ready') throw new Error(`Biometric enrollment failed! Expected mode 'ready', got '${enrollMode}'`);

    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(__dirname, '../screenshots/05_after_enrollment_ready.png') });

    // Step G: Test Biometric SCAN
    console.log('9. Testing Biometric SCAN authentication...');
    await page.evaluate(async () => {
      window.VAULT.walk.target = 1;
      await window.VAULT.act('SCAN');
    });

    await page.waitForTimeout(1000);
    const mode = await page.evaluate(() => window.VAULT.state.mode);
    console.log('Terminal state mode after SCAN:', mode);
    if (mode !== 'granted') {
      throw new Error(`Expected mode 'granted' but got '${mode}'`);
    }

    await page.screenshot({ path: path.join(__dirname, '../screenshots/06_access_granted_terminal.png') });
    console.log('Captured: 06_access_granted_terminal.png');

    console.log('WebGL Warnings / Errors count:', warnings.length);
    if (warnings.length > 0) {
      console.warn('Warnings found:', warnings);
    }

    console.log('=== ALL TESTS PASSED SUCCESSFULLY! ===');
  } catch (err) {
    console.error('\n--- BROWSER CONSOLE DUMP ---');
    consoleLogs.slice(-25).forEach(l => console.error(l));
    console.error('--- END CONSOLE DUMP ---\n');
    throw err;
  } finally {
    await browser.close();
  }
}

run().catch(err => {
  console.error('[TEST ERROR]:', err);
  process.exit(1);
});
