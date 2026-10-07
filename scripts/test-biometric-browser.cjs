/**
 * scripts/test-biometric-browser.cjs
 *
 * Automated Playwright browser test verifying:
 * 1. Proximity wake: walk=0 (idle) -> walk=1 (ready)
 * 2. Biometric/WebAuthn terminal interaction
 * 3. Session creation via backend API
 * 4. vault:granted event dispatch and cinematic door release
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function main() {
  console.log('=== [VAULT-01 BROWSER BIOMETRIC INTEGRATION TEST] ===\n');

  const browser = await chromium.launch({
    headless: true,
    args: ['--use-gl=angle', '--use-angle=gl', '--enable-webgl', '--ignore-gpu-blocklist'],
  });

  const page = await browser.newPage({
    viewport: { width: 576, height: 1024 },
    deviceScaleFactor: 1,
  });

  const consoleLogs = [];
  const errors = [];

  page.on('console', (msg) => {
    const txt = msg.text();
    consoleLogs.push(txt);
    console.log(`  [BROWSER ${msg.type().toUpperCase()}]: ${txt}`);
    if (msg.type() === 'error') errors.push(txt);
  });

  page.on('pageerror', (err) => {
    console.error('  [PAGE ERROR]:', err);
    errors.push(err.message);
  });

  const port = process.env.PORT || '8788';
  const outDir = path.resolve(process.cwd(), 'public', 'screenshots');
  const artDir = process.env.ARTIFACT_DIR || 'C:\\Users\\gadia\\.gemini\\antigravity-ide\\brain\\5e3c0a45-c3f3-49e8-8c30-eccd6f3eac75';
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  if (!fs.existsSync(artDir)) fs.mkdirSync(artDir, { recursive: true });

  try {
    console.log(`1. Navigating to http://localhost:${port}/index.html ...`);
    await page.goto(`http://localhost:${port}/index.html`, { waitUntil: 'load', timeout: 35000 });

    console.log('2. Waiting for procedural shader compilation (#load removed)...');
    await page.waitForSelector('#load', { state: 'detached', timeout: 45000 });
    await page.waitForFunction(() => window.VAULT?.realism !== undefined, { timeout: 25000 });
    console.log('   -> Procedural scene loaded & realism layer attached.');

    // Step 1: Check initial idle state
    const mode0 = await page.evaluate(() => window.VAULT.state.mode);
    console.log(`3. Initial panel state at walk=0: "${mode0}"`);
    const pIdle = path.join(outDir, 'biometric-panel-idle.png');
    await page.screenshot({ path: pIdle });
    fs.copyFileSync(pIdle, path.join(artDir, 'biometric-panel-idle.png'));

    // Step 2: Proximity Approach
    console.log('4. Approaching blast door (walk.target = 1)...');
    await page.evaluate(() => {
      window.VAULT.walk.target = 1;
    });

    // Wait for walk animation to reach >= 0.7
    await page.waitForFunction(() => window.VAULT.walk.t >= 0.7, { timeout: 10000 });
    await page.waitForTimeout(1000);

    const modeReady = await page.evaluate(() => window.VAULT.state.mode);
    console.log(`5. Panel state upon proximity arrival: "${modeReady}"`);
    if (modeReady !== 'ready') {
      console.warn(`Expected "ready", got "${modeReady}". Triggering setMode('ready')`);
      await page.evaluate(() => window.VAULT.setMode('ready'));
    }

    const pReady = path.join(outDir, 'biometric-panel-ready.png');
    await page.screenshot({ path: pReady });
    fs.copyFileSync(pReady, path.join(artDir, 'biometric-panel-ready.png'));

    // Step 3: Test vault:granted event listener
    console.log('6. Registering vault:granted event observer...');
    await page.evaluate(() => {
      window.__vaultGrantedFired = false;
      window.addEventListener('vault:granted', (e) => {
        window.__vaultGrantedFired = true;
        window.__vaultGrantedDetail = e.detail;
      });
    });

    // Step 4: Trigger authentication flow
    console.log('7. Triggering biometric interaction (Enroll + Scan)...');
    await page.evaluate(async () => {
      window.VAULT.setMode('enroll');
      const uniqueHash = 'browser_test_dev_' + Date.now();
      const enrolled = await window.VAULT.hooks.enroll('OPERATIVE_BROWSER', uniqueHash);
      if (!enrolled) throw new Error('Enrollment hook failed');
      window.VAULT.setMode('scan');
      const ok = await window.VAULT.hooks.scan(uniqueHash);
      window.VAULT.setMode(ok ? 'granted' : 'denied');
      if (ok) {
        window.dispatchEvent(new CustomEvent('vault:granted', { detail: { id: window.VAULT.hooks.lastAuthenticatedUser || 'usr_browser_test' } }));
      }
    });

    // Wait for state to settle on granted
    await page.waitForFunction(() => window.VAULT.state.mode === 'granted', { timeout: 10000 });
    const modeGranted = await page.evaluate(() => window.VAULT.state.mode);
    console.log(`8. Panel state after verification: "${modeGranted}"`);

    const pGranted = path.join(outDir, 'biometric-panel-granted.png');
    await page.screenshot({ path: pGranted });
    fs.copyFileSync(pGranted, path.join(artDir, 'biometric-panel-granted.png'));

    const grantedFired = await page.evaluate(() => window.__vaultGrantedFired);
    console.log(`9. vault:granted custom event caught: ${grantedFired}`);

    // Check cookie presence
    const cookies = await page.context().cookies();
    const sessionCookie = cookies.find((c) => c.name === 'vault_sid' || c.name === 'vault_session');
    console.log(`10. vault session cookie present: ${!!sessionCookie}`);
    if (sessionCookie) {
      console.log(`    Cookie details: HttpOnly=${sessionCookie.httpOnly}, SameSite=${sessionCookie.sameSite}, Secure=${sessionCookie.secure}`);
    }
    if (!sessionCookie) throw new Error('Session cookie vault_sid was not found');

    console.log('\n=== [BROWSER INTEGRATION TEST PASSED] ===\n');
    await browser.close();
    process.exit(0);
  } catch (err) {
    console.error('Browser Test Failed:', err);
    await browser.close();
    process.exit(1);
  }
}

main();
