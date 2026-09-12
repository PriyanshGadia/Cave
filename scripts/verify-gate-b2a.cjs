// scripts/verify-gate-b2a.cjs
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const ART = 'C:/Users/gadia/.gemini/antigravity-ide/brain/694bd3af-9386-4a86-8cb6-98cd73f0a84a';
const PUB = path.join(process.cwd(), 'public/screenshots');

function save(name, buf) {
  const artPath = path.join(ART, name);
  const pubPath = path.join(PUB, name);
  fs.writeFileSync(artPath, buf);
  try { fs.writeFileSync(pubPath, buf); } catch {}
  console.log('  -> Saved:', artPath);
  return artPath;
}

async function run() {
  console.log('=== [GATE B-2A: 3D IDENTITY VOLUME DIAGNOSTIC SUITE] ===\n');

  const browser = await chromium.launch({
    headless: true,
    args: ['--use-gl=angle', '--use-angle=gl', '--enable-webgl', '--ignore-gpu-blocklist']
  });

  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });

  const consoleLogs = [];
  const consoleWarnings = [];
  page.on('console', msg => {
    const text = msg.text();
    consoleLogs.push(`[${msg.type()}] ${text}`);
    if (msg.type() === 'warning' || text.toLowerCase().includes('webgl') || text.toLowerCase().includes('warn')) {
      if (!text.includes('favicon') && !text.includes('downloadable font')) consoleWarnings.push(text);
    }
  });

  console.log('1. Navigating to http://localhost:3000/index.html?lab&boot=skip ...');
  await page.goto('http://localhost:3000/index.html?lab&boot=skip', { waitUntil: 'load', timeout: 30000 });
  await page.waitForFunction(() => window.__lab?.state?.ready, { timeout: 25000 });
  await page.evaluate(async () => {
    try { await document.fonts?.ready; } catch {}
  });

  console.log('2. Setting up diagnostic neutral gray 3D volume on LS1 pedestal...');
  await page.evaluate(async () => {
    if (window.__lab?.skipToFinal) window.__lab.skipToFinal();
    const btn = document.getElementById('btn-skip-anim');
    if (btn) btn.style.display = 'none';

    const THREE = window.THREE || (await import('three'));
    const { createIdentityVolumeGeometry } = await import('./ls1_identity_mesh.js?t=' + Date.now());

    const g = window.__lab.sectorGroups['LS1'];
    g.updateWorldMatrix(true, true);

    // Remove all old children from g (lights, previous meshes, previous rigs)
    for (let i = g.children.length - 1; i >= 0; i--) {
      const c = g.children[i];
      if (c.type === 'Group' || c.isGroup || c.isLight || c.type.includes('Light') || c.name === 'LS1_B2_VOLUME') {
        g.remove(c);
      }
    }

    // Turn off cyan emitter lights on pedestal
    g.children.forEach(c => {
      if (c.isMesh && c.material) {
        c.material = new THREE.MeshStandardMaterial({ color: 0x1a1c20, roughness: 0.85 });
      }
    });

    const geom = createIdentityVolumeGeometry(THREE);
    const volumeMesh = new THREE.Mesh(geom, new THREE.MeshStandardMaterial({
      color: 0x9ba2ad,
      roughness: 0.55,
      metalness: 0.05
    }));
    volumeMesh.name = 'LS1_B2_VOLUME';
    volumeMesh.position.set(0, 0.08, 0);
    g.add(volumeMesh);
    window.__b2VolumeMesh = volumeMesh;

    // Dedicated Studio 3-Point Clay Lighting attached to g
    const targetObj = new THREE.Object3D();
    targetObj.position.set(0, 0.95, 0);
    g.add(targetObj);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.0);
    keyLight.position.set(1.5, 2.2, 2.5);
    keyLight.target = targetObj;
    g.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xd8e0ea, 1.4);
    fillLight.position.set(-1.5, 1.8, 2.2);
    fillLight.target = targetObj;
    g.add(fillLight);

    const backLight = new THREE.DirectionalLight(0xc0c8d4, 1.2);
    backLight.position.set(0, 2.0, -2.5);
    backLight.target = targetObj;
    g.add(backLight);

    const ambLight = new THREE.AmbientLight(0x808894, 1.2);
    g.add(ambLight);

    // Camera setup: FOV = 58 deg for pristine, unobstructed portrait framing inside the sector perimeter
    window.__lab.camera.fov = 58;
    window.__lab.camera.updateProjectionMatrix();

    // Camera lock hooks
    window.__targetCameraPos = null;
    window.__targetCameraLook = null;
    const origUpdate = window.__lab.update;
    window.__lab.update = function(dt) {
      origUpdate.call(this, dt);
      if (window.__targetCameraPos && window.__targetCameraLook) {
        window.__lab.camera.position.copy(window.__targetCameraPos);
        window.__lab.camera.lookAt(window.__targetCameraLook);
      }
    };
  });

  // Target center of volume: y = 0.95m
  // The 6 canonical diagnostic angles requested by user:
  // FRONT, RIGHT 3/4, RIGHT, LEFT 3/4, LEFT, BACK
  const angles = [
    { name: 'FRONT', file: 'ls1_b2a_front.png', phi: 0, dist: 1.68, camY: 0.95, lookY: 0.95 },
    { name: 'RIGHT 3/4', file: 'ls1_b2a_right_three_quarter.png', phi: Math.PI / 4, dist: 1.68, camY: 0.95, lookY: 0.95 },
    { name: 'RIGHT', file: 'ls1_b2a_right.png', phi: Math.PI / 2, dist: 1.68, camY: 0.95, lookY: 0.95 },
    { name: 'LEFT 3/4', file: 'ls1_b2a_left_three_quarter.png', phi: -Math.PI / 4, dist: 1.68, camY: 0.95, lookY: 0.95 },
    { name: 'LEFT', file: 'ls1_b2a_left.png', phi: -Math.PI / 2, dist: 1.68, camY: 0.95, lookY: 0.95 },
    { name: 'BACK', file: 'ls1_b2a_back.png', phi: Math.PI, dist: 1.68, camY: 0.95, lookY: 0.95 },
  ];

  console.log('3. Capturing 6 diagnostic neutral clay angles of LS1_B2_VOLUME...');
  for (const a of angles) {
    console.log(`   -> Orbiting to ${a.name} (phi=${(a.phi * 180 / Math.PI).toFixed(0)} deg)...`);
    await page.evaluate(({ phi, dist, camY, lookY }) => {
      const THREE = window.THREE;
      const g = window.__lab.sectorGroups['LS1'];
      const targetWorld = new THREE.Vector3(0, lookY, 0);
      g.localToWorld(targetWorld);

      const offsetLocal = new THREE.Vector3(
        dist * Math.sin(phi),
        camY,
        dist * Math.cos(phi)
      );
      const camWorld = g.localToWorld(offsetLocal);

      window.__targetCameraPos = camWorld;
      window.__targetCameraLook = targetWorld;
    }, a);

    await page.waitForTimeout(500);
    const buf = await page.screenshot({ timeout: 15000 });
    save(a.file, buf);
  }

  // 4. Capture 6-angle silhouette comparison against pure white backdrop
  console.log('4. Capturing 6-angle silhouette comparison against white backdrop...');
  await page.evaluate(() => {
    const THREE = window.THREE;
    const g = window.__lab.sectorGroups['LS1'];

    // Cylinder backdrop around the pedestal at radius 2.6m
    const backdropGeo = new THREE.CylinderGeometry(2.6, 2.6, 3.6, 48, 1, true, 0, Math.PI * 2);
    const backdropMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.BackSide, depthWrite: true });
    const backdrop = new THREE.Mesh(backdropGeo, backdropMat);
    backdrop.name = '__white_backdrop';
    backdrop.position.set(0, 1.2, 0);
    g.add(backdrop);

    window.__b2VolumeMesh.material = new THREE.MeshBasicMaterial({ color: 0x000000 });

    g.children.forEach(c => {
      if (c !== window.__b2VolumeMesh && c !== backdrop) {
        c.__prevVis = c.visible;
        c.visible = false;
      }
    });
  });

  for (const a of angles) {
    const silFile = a.file.replace('ls1_b2a_', 'ls1_b2a_sil_');
    await page.evaluate(({ phi, dist, camY, lookY }) => {
      const THREE = window.THREE;
      const g = window.__lab.sectorGroups['LS1'];
      const targetWorld = new THREE.Vector3(0, lookY, 0);
      g.localToWorld(targetWorld);

      const offsetLocal = new THREE.Vector3(
        dist * Math.sin(phi),
        camY,
        dist * Math.cos(phi)
      );
      const camWorld = g.localToWorld(offsetLocal);

      window.__targetCameraPos = camWorld;
      window.__targetCameraLook = targetWorld;
    }, a);

    await page.waitForTimeout(400);
    const buf = await page.screenshot({ timeout: 15000 });
    save(silFile, buf);
  }

  console.log('\n=== WEBGL AUDIT ===');
  console.log(`WebGL warnings count: ${consoleWarnings.length}`);
  if (consoleWarnings.length > 0) {
    console.log('Warnings:', consoleWarnings);
  } else {
    console.log('PASS: 0 WebGL warnings.');
  }

  await browser.close();
  console.log('=== GATE B-2A DIAGNOSTIC COMPLETE ===');
}

run().catch(err => {
  console.error('FAILED:', err);
  process.exit(1);
});
