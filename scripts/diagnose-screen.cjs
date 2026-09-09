const { chromium } = require('playwright');

async function check() {
  const browser = await chromium.launch({
    headless: true,
    args: ['--use-gl=angle', '--use-angle=gl', '--enable-webgl', '--ignore-gpu-blocklist'],
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.goto('http://localhost:8000/index.html?lab&boot=skip');
  await page.waitForFunction('window.__lab && window.__lab.state && window.__lab.state.ready');
  await page.waitForTimeout(500);

  await page.evaluate(() => window.__lab.focusSector('RS2'));
  await page.waitForFunction('window.__lab && window.__lab.state && window.__lab.state.focusE >= 0.99');
  await page.waitForTimeout(400);

  // Check 3D positions of scrMesh, paperMesh, camera
  const info = await page.evaluate(() => {
    const lab = window.__lab;
    const g = lab.sectorGroups['RS2'];
    const cam = lab.camera;
    const paper = lab.paperMesh;
    
    // Find all meshes in RS2
    const meshes = [];
    g.traverse(c => {
      if (c.isMesh) {
        const wp = new window.THREE.Vector3();
        c.getWorldPosition(wp);
        const proj = wp.clone().project(cam);
        const sx = (proj.x * 0.5 + 0.5) * 1280;
        const sy = (-proj.y * 0.5 + 0.5) * 720;
        meshes.push({
          name: c.name || c.geometry.type,
          geom: c.geometry.type,
          visible: c.visible,
          pos: { x: c.position.x, y: c.position.y, z: c.position.z },
          worldPos: { x: wp.x, y: wp.y, z: wp.z },
          screenPos: { x: sx, y: sy },
          material: c.material.type,
        });
      }
    });

    return {
      camPos: { x: cam.position.x, y: cam.position.y, z: cam.position.z },
      camRot: { x: cam.rotation.x, y: cam.rotation.y, z: cam.rotation.z },
      paper: paper ? {
        visible: paper.visible,
        pos: paper.position,
        scale: paper.scale,
        rot: { x: paper.rotation.x, y: paper.rotation.y, z: paper.rotation.z }
      } : null,
      meshes
    };
  });

  console.log('Camera and Meshes info:', JSON.stringify(info, null, 2));
  await browser.close();
}

check();
