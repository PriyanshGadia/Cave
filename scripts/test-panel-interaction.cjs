const { chromium } = require('playwright');

async function testPhysicalClick() {
  const browser = await chromium.launch({
    headless: true,
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream']
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  
  page.on('console', msg => console.log('LOG:', msg.type(), msg.text()));
  page.on('pageerror', err => console.error('ERR:', err));

  await page.goto('http://127.0.0.1:8788/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !document.getElementById('load'), { timeout: 60000 });

  // Walk to 1
  await page.evaluate(() => {
    window.VAULT.walk.target = 1;
    window.VAULT.walk.t = 1;
    window.VAULT.setMode('ready');
  });
  await page.waitForTimeout(1000);

  // Take screenshot of panel at walk=1
  await page.screenshot({ path: 'public/screenshots/panel-walk1-ready.png' });

  // Find 2D screen coordinates of the 3D buttons
  const buttonCoords = await page.evaluate(() => {
    const coords = [];
    const buttons = window.VAULT.scene.children.filter(c => c.name === 'button' || c.userData?.action);
    // Let's inspect buttons array from index.html if accessible or raycast from camera
    return {
      interactablesCount: window.VAULT.scene.children.length,
      mode: window.VAULT.state.mode,
      cameraPos: window.VAULT.camera.position,
      cameraRot: window.VAULT.camera.rotation,
    };
  });
  console.log('Button details:', buttonCoords);

  await browser.close();
}

testPhysicalClick().catch(console.error);
