const { chromium } = require('playwright');

async function checkOverlap() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.goto('http://localhost:8000/index.html?lab&boot=skip');
  await page.waitForFunction('window.__lab && window.__lab.state && window.__lab.state.ready');
  await page.waitForTimeout(500);
  await page.evaluate(() => window.__lab.focusSector('RS2'));
  await page.waitForFunction('window.__lab && window.__lab.state && window.__lab.state.focusE >= 0.99');
  await page.waitForTimeout(400);

  const res = await page.evaluate(() => {
    const lab = window.__lab;
    const cam = lab.camera;
    const g = lab.sectorGroups['RS2'];
    const scrMesh = g.children.find(c => c.geometry && c.geometry.parameters && c.geometry.parameters.width === 0.58);
    const paper = lab.paperMesh;

    // Trigger print
    lab.triggerPrint();
    paper.visible = true;

    // Raycast at screen center (640, 350)
    const ndc = new window.THREE.Vector2(0, -(350 / 720) * 2 + 1);
    const raycaster = new window.THREE.Raycaster();
    raycaster.setFromCamera(ndc, cam);

    const hits = raycaster.intersectObjects([scrMesh, paper], false);
    return {
      hits: hits.map(h => ({
        obj: h.object === scrMesh ? 'scrMesh' : (h.object === paper ? 'paperMesh' : 'other'),
        distance: h.distance,
        point: h.point,
        uv: h.uv
      }))
    };
  });

  console.log('Hits at (640, 350):', JSON.stringify(res, null, 2));
  await browser.close();
}

checkOverlap();
