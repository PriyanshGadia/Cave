const { chromium } = require('playwright');

async function testVerts() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.goto('http://localhost:8000/index.html?lab&boot=skip');
  await page.waitForFunction('window.__lab && window.__lab.state && window.__lab.state.ready');
  await page.waitForTimeout(500);

  await page.evaluate(() => window.__lab.focusSector('RS2'));
  await page.waitForFunction('window.__lab && window.__lab.state && window.__lab.state.focusE >= 0.99');
  await page.waitForTimeout(400);

  const report = await page.evaluate(() => {
    const lab = window.__lab;
    const paper = lab.paperMesh;
    const cam = lab.camera;
    paper.updateMatrixWorld(true);

    const posAttr = paper.geometry.attributes.position;
    const verts = [];
    for (let i = 0; i < posAttr.count; i++) {
      const v = new window.THREE.Vector3(posAttr.getX(i), posAttr.getY(i), posAttr.getZ(i));
      v.applyMatrix4(paper.matrixWorld);
      const proj = v.clone().project(cam);
      verts.push({
        local: { x: posAttr.getX(i), y: posAttr.getY(i), z: posAttr.getZ(i) },
        world: { x: v.x, y: v.y, z: v.z },
        screen: { x: (proj.x * 0.5 + 0.5) * 1280, y: (-proj.y * 0.5 + 0.5) * 720, z: proj.z }
      });
    }

    return {
      paperVisible: paper.visible,
      paperPos: paper.position,
      paperScale: paper.scale,
      paperRot: { x: paper.rotation.x, y: paper.rotation.y, z: paper.rotation.z },
      parentName: paper.parent.name || paper.parent.type,
      verts
    };
  });

  console.log('Paper Vertices Report:', JSON.stringify(report, null, 2));
  await browser.close();
}

testVerts();
