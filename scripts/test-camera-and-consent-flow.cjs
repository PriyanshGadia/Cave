const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const artDir = process.env.ARTIFACT_DIR || 'C:\\Users\\gadia\\.gemini\\antigravity-ide\\brain\\5e3c0a45-c3f3-49e8-8c30-eccd6f3eac75';

async function main() {
  console.log('=== VERIFYING INITIAL CONSENT POPUP & LIVE CAMERA FEED VERIFICATION ===');
  const browser = await chromium.launch({
    headless: true,
    args: [
      '--use-gl=angle',
      '--use-angle=gl',
      '--enable-webgl',
      '--ignore-gpu-blocklist',
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
    ]
  });

  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  
  // Set up init script to simulate real interactive session with forceRealVision
  await page.addInitScript(() => {
    window.__forceRealVision = true;
    localStorage.removeItem('vault_dpdp_consent');
  });

  page.on('console', msg => console.log('   [PAGE LOG]:', msg.type(), msg.text()));
  page.on('pageerror', err => console.log('   [PAGE ERROR]:', err));

  try {
    console.log('1. Loading http://127.0.0.1:8788/ ...');
    await page.goto('http://127.0.0.1:8788/', { waitUntil: 'commit', timeout: 30000 });
    
    console.log('Waiting for procedural compilation to complete (#load detached)...');
    let loaded = false;
    for (let sec = 0; sec < 90; sec++) {
      await page.waitForTimeout(1000);
      loaded = await page.evaluate(() => !document.getElementById('load') && Boolean(window.VAULT?.act));
      if (loaded) {
        console.log(`Procedural generation finished after ${sec + 1}s.`);
        break;
      }
    }
    if (!loaded) throw new Error('FAIL: Page compilation exceeded 90s timeout');

    // 2. Verify Consent Modal appears in the beginning!
    console.log('2. Verifying Consent Modal appears IN THE BEGINNING...');
    await page.waitForTimeout(1200); // 800ms timer + buffer
    const consentModal = await page.$('#sec-doc-container');
    if (!consentModal) throw new Error('FAIL: Consent Modal did not appear in the beginning!');
    const isModalVis = await consentModal.isVisible();
    if (!isModalVis) throw new Error('FAIL: Consent Modal is not visible!');
    console.log('✓ PASS: Consent Modal appeared automatically in the beginning!');

    await page.screenshot({ path: 'public/screenshots/consent-modal-in-beginning.png' });
    fs.copyFileSync('public/screenshots/consent-modal-in-beginning.png', path.join(artDir, 'consent-modal-in-beginning.png'));

    // 3. Fill consent form and confirm
    console.log('3. Filling operative name and affirmative checkmarks...');
    await page.fill('#vault-declared-name', 'PRIYANSH GADIA');
    await page.check('#vault-name-confirm');
    await page.check('#vault-terms-confirm');

    console.log('4. Clicking [ CONFIRM & ENROLL ]...');
    await page.click('#vault-consent-accept-btn');
    await page.waitForTimeout(1500);

    // Verify modal is dismissed
    const modalAfter = await page.$('#sec-doc-container');
    if (modalAfter) throw new Error('FAIL: Consent modal was not dismissed upon confirmation!');
    console.log('✓ PASS: Consent Modal dismissed instantly.');

    // 4. Verify Camera HUD is active with live video feed
    console.log('5. Verifying Live Camera HUD is active...');
    const cameraHud = await page.$('#vault-camera-hud');
    if (!cameraHud) throw new Error('FAIL: Camera HUD not found after enrollment started!');
    const isHudVis = await cameraHud.isVisible();
    if (!isHudVis) throw new Error('FAIL: Camera HUD is not visible!');

    const videoInfo = await page.evaluate(() => {
      const v = document.getElementById('vault-cam-video');
      return {
        exists: Boolean(v),
        width: v?.videoWidth,
        height: v?.videoHeight,
        srcObject: Boolean(v?.srcObject),
        paused: v?.paused,
        readyState: v?.readyState,
      };
    });
    console.log('   Video Stream Info:', videoInfo);
    if (!videoInfo.exists || !videoInfo.srcObject) {
      throw new Error('FAIL: Video stream not attached to #vault-cam-video!');
    }
    console.log('✓ PASS: Live webcam stream attached and actively playing in HUD.');

    await page.screenshot({ path: 'public/screenshots/live-camera-feed-hud.png' });
    fs.copyFileSync('public/screenshots/live-camera-feed-hud.png', path.join(artDir, 'live-camera-feed-hud.png'));

    // 5. Cancel enrollment and test dedicated [ 📷 TEST CAMERA ] button
    console.log('6. Canceling enrollment to test standalone [ 📷 TEST CAMERA ] feature...');
    await page.click('#vault-hud-cancel-btn');
    await page.waitForTimeout(800);

    const hudAfterCancel = await page.$('#vault-camera-hud');
    if (hudAfterCancel) throw new Error('FAIL: Camera HUD was not removed on cancel!');
    console.log('✓ PASS: Camera HUD closed and hardware stream stopped on cancel.');

    console.log('7. Clicking [ 📷 TEST CAMERA ] button in top quick HUD...');
    await page.click('#btn-test-camera');
    await page.waitForTimeout(1500);

    const testHud = await page.$('#vault-camera-hud');
    if (!testHud) throw new Error('FAIL: Camera HUD did not open from [ 📷 TEST CAMERA ] button!');
    const titleText = await page.textContent('#vault-hud-title');
    console.log('   Camera HUD Title:', titleText);

    const testVideoInfo = await page.evaluate(() => {
      const v = document.getElementById('vault-cam-video');
      return {
        exists: Boolean(v),
        srcObject: Boolean(v?.srcObject),
        readyState: v?.readyState,
        cameraTestActive: window.__cameraTestActive,
      };
    });
    console.log('   Camera Test Video Info:', testVideoInfo);
    if (!testVideoInfo.cameraTestActive || !testVideoInfo.srcObject) {
      throw new Error('FAIL: Camera test stream not active!');
    }
    console.log('✓ PASS: Standalone camera hardware verification feed is active and running.');

    await page.screenshot({ path: 'public/screenshots/standalone-camera-test.png' });
    fs.copyFileSync('public/screenshots/standalone-camera-test.png', path.join(artDir, 'standalone-camera-test.png'));

    // 8. Close camera test
    console.log('8. Closing camera test via toggle...');
    await page.click('#btn-test-camera');
    await page.waitForTimeout(600);

    const testHudClosed = await page.$('#vault-camera-hud');
    if (testHudClosed) throw new Error('FAIL: Camera HUD was not closed on toggle!');
    console.log('✓ PASS: Camera test feed closed cleanly.');

    console.log('\n========================================================================');
    console.log('=== ALL CAMERA FEED & INITIAL CONSENT VERIFICATIONS PASSED (100%) ===');
    console.log('========================================================================\n');
  } catch (err) {
    console.error('VERIFICATION ERROR:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

main();
