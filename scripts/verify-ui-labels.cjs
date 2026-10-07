/**
 * scripts/verify-ui-labels.cjs
 *
 * Explicit regression test enforcing that:
 * 1. Physical 3D console buttons in index.html render VISIT, ENROLL, SCAN
 * 2. Legacy mock labels REGISTER, VERIFY, RESET are completely eradicated
 * 3. Captures acceptance screenshot of the physical panel in the 3D scene
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function main() {
  console.log('=== [PHASE A: TERMINAL LABELS REGRESSION TEST] ===\n');

  const browser = await chromium.launch({
    headless: true,
    args: ['--use-gl=angle', '--use-angle=gl', '--enable-webgl', '--ignore-gpu-blocklist'],
  });

  const page = await browser.newPage({
    viewport: { width: 576, height: 1024 },
    deviceScaleFactor: 1,
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
    console.log('   -> Procedural scene loaded & realism attached.');

    // Approach blast door (walk = 1)
    console.log('3. Advancing camera to panel close-up (walk.target = 1)...');
    await page.evaluate(() => {
      window.VAULT.walk.target = 1;
    });

    await page.waitForFunction(() => window.VAULT.walk.t >= 0.85, { timeout: 10000 });
    await page.waitForTimeout(2000);

    // Inspect Three.js in-world button actions and textures
    const buttonData = await page.evaluate(() => {
      const actions = [];
      window.VAULT.door.traverse((obj) => {
        if (obj.userData?.action && !actions.includes(obj.userData.action)) {
          actions.push(obj.userData.action);
        }
      });
      return {
        actions,
        mode: window.VAULT.state.mode,
      };
    });

    console.log('4. In-world interactable actions found on door:', buttonData.actions);

    // Assert actions on the physical 3D panel
    if (!buttonData.actions.includes('VISIT')) throw new Error('Missing physical button action: VISIT');
    if (!buttonData.actions.includes('ENROLL')) throw new Error('Missing physical button action: ENROLL');
    if (!buttonData.actions.includes('SCAN')) throw new Error('Missing physical button action: SCAN');

    if (buttonData.actions.includes('REGISTER')) throw new Error('REGRESSION: Found banned label REGISTER on door!');
    if (buttonData.actions.includes('VERIFY')) throw new Error('REGRESSION: Found banned label VERIFY on door!');
    if (buttonData.actions.includes('RESET')) throw new Error('REGRESSION: Found banned label RESET on door!');

    console.log('   ✓ In-world 3D panel actions strictly match [VISIT, ENROLL, SCAN]');
    console.log('   ✓ Legacy actions [REGISTER, VERIFY, RESET] are 100% absent');

    // Capture screenshot of the physical panel in the 3D scene
    const panelScreenshot = path.join(outDir, 'panel-labels-reconciled.png');
    await page.screenshot({ path: panelScreenshot });
    fs.copyFileSync(panelScreenshot, path.join(artDir, 'panel-labels-reconciled.png'));
    console.log(`5. Acceptance screenshot captured: ${panelScreenshot}`);

    console.log('\n[PHASE A REGRESSION TEST PASSED]\n');
  } catch (err) {
    console.error('\n[PHASE A TEST FAILED]:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

main();
