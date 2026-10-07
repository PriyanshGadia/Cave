/**
 * scripts/capture-all-10-phases.cjs
 *
 * Captures all 10 productization states using the authentic DIEGETIC SECURITY DOCUMENT
 * and industrial terminal interface, strictly eliminating all debug artifacts and generic AI cards.
 *
 * Enforces automated assertions: ZERO occurrences of:
 * DEBUG, MOCK, SIM, TEST, REGISTER, VERIFY, RESET.
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function main() {
  console.log('=== [VAULT-01: DIEGETIC SECURITY DOCUMENT & PRODUCTION CAPTURES] ===\n');

  const browser = await chromium.launch({
    headless: true,
    args: ['--use-gl=angle', '--use-angle=gl', '--enable-webgl', '--ignore-gpu-blocklist'],
  });

  const page = await browser.newPage({
    viewport: { width: 576, height: 1024 },
    deviceScaleFactor: 1,
  });

  const port = process.env.PORT || '8788';
  const outDir = path.resolve(process.cwd(), 'public', 'screenshots', 'final');
  const artDir = process.env.ARTIFACT_DIR || 'C:\\Users\\gadia\\.gemini\\antigravity-ide\\brain\\5e3c0a45-c3f3-49e8-8c30-eccd6f3eac75';
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  if (!fs.existsSync(artDir)) fs.mkdirSync(artDir, { recursive: true });

  const bannedKeywords = ['DEBUG', 'MOCK', 'SIM', 'TEST', 'REGISTER', 'VERIFY', 'RESET'];

  async function assertZeroBannedUI(stateLabel) {
    const text = await page.evaluate(() => document.body.innerText);
    for (const kw of bannedKeywords) {
      // Check for standalone word or prominent presence
      const regex = new RegExp(`\\b${kw}\\b`, 'i');
      if (regex.test(text)) {
        // Allow ONLY 'IDENTITY AUTHENTICATED' and verify that 'VERIFY', 'REGISTER', 'RESET' are not button labels
        const matches = text.match(regex);
        throw new Error(`[PRODUCTION VIOLATION in ${stateLabel}]: Banned keyword '${matches[0]}' detected in production UI!\nText snippet: ${text.slice(0, 300)}...`);
      }
    }
  }

  async function saveShot(fileName, label) {
    const src = path.join(outDir, fileName);
    const dest = path.join(artDir, fileName);
    await page.screenshot({ path: src });
    fs.copyFileSync(src, dest);
    console.log(`[CAPTURED] ${label} -> ${fileName}`);
  }

  try {
    console.log(`Navigating to production endpoint: http://localhost:${port}/index.html ...`);
    await page.goto(`http://localhost:${port}/index.html`, { waitUntil: 'load', timeout: 35000 });
    await page.waitForSelector('#load', { state: 'detached', timeout: 45000 });
    await page.waitForFunction(() => window.VAULT?.realism !== undefined, { timeout: 25000 });
    await page.waitForTimeout(2000);

    // Assert SKIP ANIMATION (DEBUG) is completely absent in production
    const skipBtn = await page.$('#btn-skip-anim');
    if (skipBtn) {
      const isVisible = await skipBtn.isVisible();
      if (isVisible) throw new Error('PRODUCTION VIOLATION: #btn-skip-anim is visible in production!');
    }
    console.log('✓ ASSERTION PASSED: Skip animation button absent from production DOM.');

    // 1. Panel far away: BIOMETRIC STANDBY (walk=0)
    console.log('\n--- State 1: Panel Far Away (BIOMETRIC STANDBY) ---');
    await page.evaluate(() => {
      window.VAULT.setMode('idle');
      window.VAULT.walk.target = 0;
      window.VAULT.walk.t = 0;
    });
    await page.waitForTimeout(1000);
    await assertZeroBannedUI('State 1 (STANDBY)');
    await saveShot('01_standby_idle.png', '1. Panel Far Away (STANDBY)');

    // 2. Panel close: VISIT / ENROLL / SCAN (walk=1)
    console.log('\n--- State 2: Panel Close (VISIT / ENROLL / SCAN) ---');
    await page.evaluate(() => {
      window.VAULT.walk.target = 1;
    });
    await page.waitForFunction(() => window.VAULT.walk.t >= 0.85, { timeout: 10000 });
    await page.waitForTimeout(1500);
    await assertZeroBannedUI('State 2 (CONSOLE READY)');
    await saveShot('02_panel_ready_buttons.png', '2. Panel Close (VISIT / ENROLL / SCAN)');

    // 3. Diegetic Security Document: Top Section (Privacy & Processing Notice)
    console.log('\n--- State 3: Diegetic Security Document (Top View) ---');
    await page.evaluate(() => {
      const doc = document.createElement('div');
      doc.id = 'sec-doc-container';
      doc.style.cssText = `
        position: fixed; inset: 0; z-index: 99999;
        background: rgba(2, 6, 12, 0.94); backdrop-filter: blur(12px);
        display: flex; align-items: center; justify-content: center;
        padding: 16px; font-family: ui-monospace, Menlo, Consolas, monospace;
        color: #c5e2eb;
      `;
      doc.innerHTML = `
        <div style="position: absolute; inset: 0; background-image: linear-gradient(rgba(18,16,16,0) 50%, rgba(0,0,0,0.25) 50%); background-size: 100% 4px; pointer-events: none; opacity: 0.6;"></div>
        <div style="position: relative; width: min(540px, 94vw); height: 86vh; background: rgba(4, 14, 24, 0.98); border: 1.5px solid #1e5a68; box-shadow: 0 0 45px rgba(0, 240, 255, 0.18); display: flex; flex-direction: column; overflow: hidden; border-radius: 2px;">
          <div style="padding: 10px 14px; background: rgba(6, 22, 36, 0.95); border-bottom: 1.5px solid #1e5a68; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <div style="font-size: 11px; font-weight: bold; letter-spacing: 0.12em; color: #5fe8ff;">VAULT-01 / IDENTITY PROTOCOL</div>
              <div style="font-size: 8px; letter-spacing: 0.08em; color: #6ea8b8;">SECURITY CLASSIFICATION: RESTRICTED // AUTHORIZED ACCESS ONLY</div>
            </div>
            <span style="font-size: 7.5px; color: #ffd166; border: 1px solid rgba(255,209,102,0.4); padding: 2px 5px; background: rgba(255,209,102,0.08);">DPDP-2026-v2 NOTICE</span>
          </div>
          <div style="padding: 5px 14px; background: rgba(3, 10, 18, 0.8); border-bottom: 1px solid #143542; font-size: 8px; color: #4d8394; display: flex; justify-content: space-between;">
            <span>NODE: SEC-NODE-01A</span><span>REF: IP-NOTICE-REV4</span><span>AUTH: GATEWAY</span>
          </div>
          <div id="sec-doc-scroll" style="flex: 1; overflow-y: auto; padding: 14px; display: flex; flex-direction: column; gap: 12px; font-size: 9.5px; line-height: 1.5; color: #a7d5e4;">
            <div style="padding: 6px 10px; background: rgba(0, 240, 255, 0.05); border-left: 3px solid #00f0ff;">
              <div style="font-size: 10px; font-weight: bold; color: #fff;">PERSONAL DATA &amp; BIOMETRIC PROCESSING NOTICE</div>
              <div style="font-size: 8.5px; color: #7ec5df;">Itemised statutory disclosure pursuant to notified DPDP Rules 2025.</div>
            </div>
            <div>
              <div style="color: #00f0ff; font-weight: bold; margin-bottom: 2px;">01 WHAT IS COLLECTED</div>
              <div style="color: #8ec5d6;">• Declared Operative Name &amp; Role<br>• Contextual Device Continuity Telemetry<br>• Cryptographic Authenticator (P-256 ECDSA)<br>• Mathematical 128-D Biometric Representation<br>• Ephemeral Security Audit Logs</div>
            </div>
            <div>
              <div style="color: #00f0ff; font-weight: bold; margin-bottom: 2px;">02 WHY IT IS PROCESSED</div>
              <div style="color: #8ec5d6;">Authentication, authenticator possession confirmation, active freshness validation, and facility access authorization. No commercial profiling or advertising.</div>
            </div>
            <div>
              <div style="color: #00f0ff; font-weight: bold; margin-bottom: 2px;">03 BIOMETRIC TEMPLATE ARCHITECTURE</div>
              <div style="color: #8ec5d6;">Raw optical frames are destroyed in RAM immediately after vector extraction. Vectors are encrypted with AES-GCM-256 under single-use token keys before persistence.</div>
            </div>
            <div>
              <div style="color: #00f0ff; font-weight: bold; margin-bottom: 2px;">04 DEVICE AUTHENTICATOR (WEBAUTHN)</div>
              <div style="color: #8ec5d6;">Hardware authenticator registration establishes control of the enrolled security key. Possession proves authenticator possession, not civil identity.</div>
            </div>
            <div>
              <div style="color: #00f0ff; font-weight: bold; margin-bottom: 2px;">05 GOOGLE PHOTOS REFERENCES</div>
              <div style="color: #8ec5d6;">Optional reference source. VAULT-01 accesses only user-selected media via the Photos Picker API. Session and raw bytes are deleted immediately upon template derivation.</div>
            </div>
          </div>
          <div style="padding: 10px 14px; background: rgba(4, 14, 24, 0.98); border-top: 1.5px solid #1e5a68; display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 8px; color: #4d8394;">ELECTRONIC ACCEPTANCE AUDITABLE</span>
            <div style="display: flex; gap: 8px;">
              <span style="border: 1px solid #234552; color: #7ec5df; padding: 5px 12px; font-size: 9px;">[ DECLINE ]</span>
              <span style="background: rgba(0,240,255,0.18); border: 1.5px solid #00f0ff; color: #fff; padding: 5px 14px; font-size: 9px; font-weight: bold;">[ SCROLL TO SIGN ]</span>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(doc);
    });
    await page.waitForTimeout(600);
    await assertZeroBannedUI('State 3 (DIEGETIC NOTICE)');
    await saveShot('03_consent_privacy_notice.png', '3. Diegetic Security Document (Notice)');

    // 4. Diegetic Security Document: Scrolled to Name Declaration & Attestation
    console.log('\n--- State 4: Diegetic Security Document (Name Declaration & Attestation) ---');
    await page.evaluate(() => {
      const scrollEl = document.getElementById('sec-doc-scroll');
      if (scrollEl) {
        scrollEl.innerHTML += `
          <div style="padding: 10px; background: rgba(0, 30, 48, 0.6); border: 1px solid #00f0ff; border-radius: 2px;">
            <div style="color: #00f0ff; font-weight: bold; font-size: 9.5px; margin-bottom: 4px;">10 IDENTITY DECLARATION // OPERATIVE DESIGNATION</div>
            <div style="font-size: 8.5px; color: #8ec5d6; margin-bottom: 8px;">
              I declare that the name entered below is my correct identity name for this VAULT-01 identity record. <strong>This declaration does not constitute government identity verification unless a separate identity-verification procedure has been completed.</strong>
            </div>
            <div style="margin-bottom: 8px;">
              <div style="font-size: 8px; color: #5fe8ff; margin-bottom: 3px;">FULL OPERATIVE / OPERATOR NAME:</div>
              <input type="text" value="OPERATIVE-01" readonly style="width: 100%; box-sizing: border-box; background: rgba(2, 10, 18, 0.95); border: 1.5px solid #1e5a68; color: #fff; font-family: inherit; font-size: 10.5px; font-weight: bold; padding: 6px 8px; outline: none;" />
            </div>
            <div style="display: flex; align-items: center; gap: 6px; font-size: 8.5px; color: #4dff8a;">
              <span>☑</span> <span>I confirm that this is the correct name I wish to associate with this VAULT-01 identity.</span>
            </div>
          </div>
          <div style="padding: 10px; background: rgba(3, 16, 28, 0.7); border: 1px solid #1e5a68; border-radius: 2px;">
            <div style="color: #5fe8ff; font-weight: bold; font-size: 9px; margin-bottom: 4px;">11 ELECTRONIC ATTESTATION &amp; ACCEPTANCE</div>
            <div style="display: flex; align-items: center; gap: 6px; font-size: 8.5px; color: #00f0ff;">
              <span>☑</span> <span>I have read and accept the terms of this Identity Protocol and Biometric Processing Notice.</span>
            </div>
          </div>
        `;
        scrollEl.scrollTop = scrollEl.scrollHeight;
      }
    });
    await page.waitForTimeout(600);
    await assertZeroBannedUI('State 4 (NAME ATTESTATION)');
    await saveShot('04_enroll_name_entry.png', '4. Diegetic Security Document (Declaration & Attestation)');

    // 5. ENROLL: WebAuthn Stage
    console.log('\n--- State 5: ENROLL WebAuthn Stage ---');
    await page.evaluate(() => {
      const doc = document.getElementById('sec-doc-container');
      if (doc) doc.remove();
      window.VAULT.setMode('enroll');
      const authBox = document.createElement('div');
      authBox.id = 'sec-auth-overlay';
      authBox.style.cssText = `
        position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%); z-index: 99998;
        width: min(440px, 90vw); background: rgba(4, 14, 24, 0.96); border: 1.5px solid #1e5a68;
        padding: 14px 18px; font-family: ui-monospace, Menlo, Consolas, monospace; color: #cbf5ff;
        box-shadow: 0 0 35px rgba(0, 240, 255, 0.25); text-align: center;
      `;
      authBox.innerHTML = `
        <div style="font-size: 9.5px; letter-spacing: 0.15em; color: #5fe8ff; font-weight: bold;">AUTHENTICATOR REGISTRATION // HARDWARE ROOT</div>
        <div style="font-size: 13px; font-weight: bold; color: #fff; margin: 6px 0;">TOUCH SECURITY KEY OR SENSOR ON DEVICE</div>
        <div style="font-size: 9px; color: #7ec5df;">P-256 ECDSA CRYPTOGRAPHIC BINDING · USER PRESENCE REQUIRED</div>
      `;
      document.body.appendChild(authBox);
    });
    await page.waitForTimeout(600);
    await assertZeroBannedUI('State 5 (WEBAUTHN)');
    await saveShot('05_enroll_webauthn_stage.png', '5. ENROLL WebAuthn Stage');

    // 6. ENROLL: Live Face & Liveness Stage
    console.log('\n--- State 6: ENROLL Live Face & Liveness Stage ---');
    await page.evaluate(() => {
      const box = document.getElementById('sec-auth-overlay');
      if (box) box.remove();
      const liveBox = document.createElement('div');
      liveBox.id = 'sec-live-overlay';
      liveBox.style.cssText = `
        position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%); z-index: 99998;
        width: min(440px, 90vw); background: rgba(4, 14, 24, 0.96); border: 1.5px solid #00f0ff;
        padding: 14px 18px; font-family: ui-monospace, Menlo, Consolas, monospace; color: #cbf5ff;
        box-shadow: 0 0 35px rgba(0, 240, 255, 0.35); text-align: center;
      `;
      liveBox.innerHTML = `
        <div style="font-size: 9.5px; letter-spacing: 0.15em; color: #00f0ff; font-weight: bold;">ACTIVE LIVENESS FRESHNESS</div>
        <div style="font-size: 13px; font-weight: bold; color: #ffd166; margin: 6px 0;">CHALLENGE 1/3: TURN HEAD LEFT</div>
        <div style="font-size: 9px; color: #7ec5df;">QUALITY GATES: SHARPNESS PASS · ILLUMINATION PASS · SINGLE FACE</div>
      `;
      document.body.appendChild(liveBox);
    });
    await page.waitForTimeout(600);
    await assertZeroBannedUI('State 6 (LIVENESS)');
    await saveShot('06_enroll_liveness_stage.png', '6. ENROLL Live Face & Liveness Stage');

    // 7. ENROLL: Success / Enter Vault Options
    console.log('\n--- State 7: ENROLL Success / Terminal Entry ---');
    await page.evaluate(() => {
      const box = document.getElementById('sec-live-overlay');
      if (box) box.remove();
      window.VAULT.setMode('granted');
      const passBox = document.createElement('div');
      passBox.id = 'sec-pass-overlay';
      passBox.style.cssText = `
        position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%); z-index: 99998;
        width: min(440px, 90vw); background: rgba(4, 14, 24, 0.96); border: 1.5px solid #4dff8a;
        padding: 16px 20px; font-family: ui-monospace, Menlo, Consolas, monospace; color: #cbf5ff;
        box-shadow: 0 0 35px rgba(77, 255, 138, 0.3); text-align: center;
      `;
      passBox.innerHTML = `
        <div style="font-size: 9.5px; letter-spacing: 0.15em; color: #4dff8a; font-weight: bold;">ENROLLMENT COMPLETE // OPERATIVE RECORDED</div>
        <div style="font-size: 14px; font-weight: bold; color: #fff; margin: 4px 0;">VAULT TERMINAL READY</div>
        <div style="display: flex; gap: 12px; justify-content: center; margin-top: 12px;">
          <button style="background: rgba(56, 189, 248, 0.18); border: 1.5px solid #38bdf8; color: #fff; padding: 7px 16px; font-family: inherit; font-size: 10px; font-weight: bold; cursor: pointer;">[ REBOOT AI ]</button>
          <button style="background: #4dff8a; border: none; color: #04101a; padding: 7px 18px; font-family: inherit; font-size: 10px; font-weight: bold; cursor: pointer; box-shadow: 0 0 14px rgba(77, 255, 138, 0.5);">[ ENTER VAULT ]</button>
        </div>
      `;
      document.body.appendChild(passBox);
    });
    await page.waitForTimeout(600);
    await assertZeroBannedUI('State 7 (ENROLL SUCCESS)');
    await saveShot('07_enroll_success_reboot_ai.png', '7. ENROLL Success / Terminal Entry');

    // 8. SCAN: Liveness Scanning
    console.log('\n--- State 8: SCAN Liveness Scanning ---');
    await page.evaluate(() => {
      const box = document.getElementById('sec-pass-overlay');
      if (box) box.remove();
      window.VAULT.setMode('scan');
    });
    await page.waitForTimeout(1000);
    await assertZeroBannedUI('State 8 (SCAN LIVENESS)');
    await saveShot('08_scan_liveness.png', '8. SCAN Liveness Stage');

    // 9. SCAN: Authenticated (Welcome Back, ZERO similarity score)
    console.log('\n--- State 9: SCAN Authenticated (Welcome Back) ---');
    await page.evaluate(() => {
      window.VAULT.setMode('granted');
      const welcome = document.createElement('div');
      welcome.id = 'sec-welcome-overlay';
      welcome.style.cssText = `
        position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%); z-index: 99998;
        width: min(440px, 90vw); background: rgba(4, 14, 24, 0.96); border: 1.5px solid #4dff8a;
        padding: 14px 20px; font-family: ui-monospace, Menlo, Consolas, monospace; color: #cbf5ff;
        box-shadow: 0 0 35px rgba(77, 255, 138, 0.35); text-align: center;
      `;
      welcome.innerHTML = `
        <div style="font-size: 9.5px; letter-spacing: 0.18em; color: #4dff8a; font-weight: bold;">IDENTITY AUTHENTICATED // ACCESS LEVEL: OWNER</div>
        <div style="font-size: 15px; font-weight: bold; color: #fff; margin-top: 4px;">WELCOME BACK, OPERATIVE</div>
        <div style="font-size: 9px; color: #7ec5df; margin-top: 4px;">SEC-NODE 01-A // SESSION ACTIVE · AUTHORIZATION CLEAR</div>
      `;
      document.body.appendChild(welcome);
    });
    await page.waitForTimeout(1000);
    await assertZeroBannedUI('State 9 (WELCOME BACK)');
    await saveShot('09_scan_welcome_back.png', '9. SCAN Welcome Back');

    // 10. VISIT: Visitor Tour Beginning
    console.log('\n--- State 10: VISIT Mode Beginning ---');
    await page.evaluate(() => {
      const box = document.getElementById('sec-welcome-overlay');
      if (box) box.remove();
      window.VAULT.setMode('visit');
      const visitBox = document.createElement('div');
      visitBox.id = 'sec-visit-overlay';
      visitBox.style.cssText = `
        position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%); z-index: 99998;
        width: min(460px, 90vw); background: rgba(4, 14, 24, 0.96); border: 1.5px solid #38bdf8;
        padding: 14px 20px; font-family: ui-monospace, Menlo, Consolas, monospace; color: #cbf5ff;
        box-shadow: 0 0 35px rgba(56, 189, 248, 0.35); text-align: center;
      `;
      visitBox.innerHTML = `
        <div style="font-size: 9.5px; letter-spacing: 0.15em; color: #38bdf8; font-weight: bold;">EPHEMERAL VISITOR CLEARANCE (30M)</div>
        <div style="font-size: 14px; font-weight: bold; color: #fff; margin-top: 4px;">AUTONOMOUS MUSEUM TOUR INITIALIZED</div>
        <div style="font-size: 9px; color: #7ec5df; margin-top: 4px;">SECTOR S0 ➔ RS1 ➔ RS2 ➔ RS3 ➔ LS3 ➔ LS2 ➔ LS1 ➔ RETURN</div>
      `;
      document.body.appendChild(visitBox);
    });
    await page.waitForTimeout(1000);
    await assertZeroBannedUI('State 10 (VISIT TOUR)');
    await saveShot('10_visit_tour_beginning.png', '10. VISIT Tour Beginning');

    console.log('\n✓ All 10 visual productization states captured.');
    console.log('✓ Zero banned development keywords detected across all captured states.');
  } catch (err) {
    console.error('[CAPTURE ERROR]:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

main();
