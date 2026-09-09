import { chromium } from 'playwright';

async function testClick() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err));

  await page.goto('http://localhost:8000/index.html?lab&boot=skip');
  await page.waitForFunction(() => (window as any).__lab?.state?.ready);
  await page.evaluate(() => (window as any).__lab.focusSector('RS2'));
  await page.waitForFunction(() => ((window as any).__lab?.state?.focusE || 0) >= 0.99);
  await page.waitForTimeout(500);

  // Take screenshot before click
  await page.screenshot({ path: 'public/screenshots/click-0-before.png' });

  // Get screen pos of button
  const clickPos = await page.evaluate(() => {
    const lab = (window as any).__lab;
    const THREE = (window as any).THREE;
    const cam = lab.camera;
    const scrMesh = lab.sectorGroups['RS2'].children.find((c: any) => c.geometry?.parameters?.width === 0.58);
    
    // UV coordinates of button center: px = 500, py = 373 -> uv.x = 500/640 = 0.781, uv.y = 1 - 373/400 = 0.0675
    const pLocal = new THREE.Vector3(0.163, -0.151, 0.005);
    scrMesh.localToWorld(pLocal);
    
    pLocal.project(cam);
    const screenX = (pLocal.x * 0.5 + 0.5) * window.innerWidth;
    const screenY = (-(pLocal.y * 0.5) + 0.5) * window.innerHeight;
    return { screenX, screenY };
  });

  console.log('Calculated button screen pos:', clickPos);
  
  // Click on that position
  await page.mouse.click(clickPos.screenX, clickPos.screenY);

  for (let step = 1; step <= 5; step++) {
    await page.waitForTimeout(300);
    const state = await page.evaluate(() => {
      const lab = (window as any).__lab;
      return {
        focusActive: lab.state.focus,
        paperVis: lab.paperMesh?.visible,
        paperZ: lab.paperMesh?.position.z,
        fadeOpacity: document.getElementById('labFade')?.style.opacity
      };
    });
    console.log(`Step ${step} state:`, state);
    await page.screenshot({ path: `public/screenshots/click-${step}.png` });
  }

  await browser.close();
}
testClick();
