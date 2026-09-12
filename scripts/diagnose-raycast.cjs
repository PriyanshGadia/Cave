const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('http://localhost:3000/index.html?lab&boot=skip');
  await page.waitForFunction(() => window.__lab?.state?.ready);
  
  const hits = await page.evaluate(() => {
    if (window.__lab?.skipToFinal) window.__lab.skipToFinal();
    const THREE = window.THREE;
    const g = window.__lab.sectorGroups['LS1'];
    const camWorld = g.localToWorld(new THREE.Vector3(0, 0.95, 1.68));
    const targetWorld = g.localToWorld(new THREE.Vector3(0, 0.95, 0));
    
    const dir = targetWorld.clone().sub(camWorld).normalize();
    const raycaster = new THREE.Raycaster(camWorld, dir, 0.01, 2.0);
    
    const scene = window.__lab.scene;
    const intersects = raycaster.intersectObjects(scene.children, true);
    
    return intersects.map(hit => ({
      name: hit.object.name || 'unnamed',
      type: hit.object.type,
      parentName: hit.object.parent?.name || 'unnamed',
      parentType: hit.object.parent?.type,
      distance: +hit.distance.toFixed(3),
      point: { x: +hit.point.x.toFixed(2), y: +hit.point.y.toFixed(2), z: +hit.point.z.toFixed(2) }
    }));
  });

  console.log('Raycast hits between cam and figure:');
  console.log(JSON.stringify(hits, null, 2));
  await browser.close();
})();
