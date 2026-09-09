const { chromium } = require('playwright');

async function testPaper() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.goto('http://localhost:8000/index.html?lab&boot=skip');
  await page.waitForFunction('window.__lab && window.__lab.state && window.__lab.state.ready');
  await page.waitForTimeout(500);
  await page.evaluate(() => window.__lab.focusSector('RS2'));
  await page.waitForFunction('window.__lab && window.__lab.state && window.__lab.state.focusE >= 0.99');
  await page.waitForTimeout(400);

  // Trigger print and step forward in time
  const report = await page.evaluate(() => {
    const lab = window.__lab;
    lab.triggerPrint();

    const paper = lab.paperMesh;
    const cam = lab.camera;

    // Force an update at t = 0.7s (mid print)
    paper.visible = true;
    paper.scale.set(1, 0.5, 1);
    paper.position.set(0, 0.0125, 0.185);
    paper.updateMatrixWorld(true);

    // Compute bounding box
    const box = new window.THREE.Box3().setFromObject(paper);
    
    // Project all 8 corners of the box to screen coordinates
    const corners = [
      new window.THREE.Vector3(box.min.x, box.min.y, box.min.z),
      new window.THREE.Vector3(box.max.x, box.min.y, box.min.z),
      new window.THREE.Vector3(box.min.x, box.max.y, box.min.z),
      new window.THREE.Vector3(box.max.x, box.max.y, box.min.z),
      new window.THREE.Vector3(box.min.x, box.min.y, box.max.z),
      new window.THREE.Vector3(box.max.x, box.min.y, box.max.z),
      new window.THREE.Vector3(box.min.x, box.max.y, box.max.z),
      new window.THREE.Vector3(box.max.x, box.max.y, box.max.z),
    ];

    const screenCorners = corners.map(c => {
      const proj = c.clone().project(cam);
      return {
        x: (proj.x * 0.5 + 0.5) * 1280,
        y: (-proj.y * 0.5 + 0.5) * 720,
        z: proj.z
      };
    });

    return {
      paperPos: paper.position,
      paperRot: { x: paper.rotation.x, y: paper.rotation.y, z: paper.rotation.z },
      boxMin: box.min,
      boxMax: box.max,
      screenCorners,
      material: {
        type: paper.material.type,
        color: paper.material.color,
        map: !!paper.material.map,
        side: paper.material.side,
        visible: paper.material.visible,
        transparent: paper.material.transparent,
        opacity: paper.material.opacity
      }
    };
  });

  console.log('Paper Report:', JSON.stringify(report, null, 2));
  await browser.close();
}

testPaper();
