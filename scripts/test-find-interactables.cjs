const { chromium } = require('playwright');

async function testClick() {
  const browser = await chromium.launch({
    headless: true,
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream']
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

  await page.goto('http://127.0.0.1:8788/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !document.getElementById('load'), { timeout: 60000 });

  // Walk to 1
  await page.evaluate(() => {
    window.VAULT.walk.target = 1;
    window.VAULT.walk.t = 1;
    window.VAULT.setMode('ready');
  });
  await page.waitForTimeout(1000);

  // Get screen coordinate of the ENROLL button
  const coords = await page.evaluate(() => {
    const enrollBtn = window.VAULT.scene.getObjectByName('ENROLL') || 
      window.VAULT.scene.children.flatMap(c => c.children || []).find(c => c.userData?.action === 'ENROLL');
    
    // Find all meshes with userData.action
    const interactables = [];
    window.VAULT.scene.traverse(obj => {
      if (obj.userData?.action) {
        interactables.push({ name: obj.name, action: obj.userData.action, pos: obj.position });
      }
    });
    return interactables;
  });
  console.log('Interactables found:', coords);

  await browser.close();
}

testClick().catch(console.error);
