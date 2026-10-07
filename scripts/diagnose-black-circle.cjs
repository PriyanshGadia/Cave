// scripts/diagnose-black-circle.cjs
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const OUT_DIR = 'C:\\Users\\gadia\\.gemini\\antigravity-ide\\brain\\475c253f-9db4-4c62-97b4-6d98a1bf3915';

async function run() {
  console.log('=== [DIAGNOSING BLACK CIRCLE CANDIDATE OBJECTS] ===\n');

  const browser = await chromium.launch({
    headless: true,
    args: ['--use-gl=angle', '--use-angle=d3d11', '--enable-webgl', '--no-sandbox']
  });

  const page = await browser.newPage({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1
  });

  console.log('1. Loading lab with boot=skip...');
  await page.goto('http://localhost:3000/index.html?lab&boot=skip', { waitUntil: 'load', timeout: 30000 });
  await page.waitForFunction(() => typeof window.__lab !== 'undefined', { timeout: 25000 });
  await page.waitForTimeout(1500);

  console.log('2. Focusing Sector LS1...');
  await page.evaluate(() => {
    window.__lab.focusSector('LS1', true);
    const btn = document.getElementById('btn-skip-anim');
    if (btn) btn.style.display = 'none';
  });
  await page.waitForTimeout(500);

  console.log('3. Fast-forwarding LS1 to ready state and activating portal...');
  await page.evaluate(() => {
    const lab = window.__lab;
    lab.wakeLS1();
    lab.setBirthTimer(25.0);
    lab.update(0.1);
  });
  await page.waitForTimeout(1000);

  await page.evaluate(() => {
    const lab = window.__lab;
    const ghNode = lab.ls1Crystals.find(c => c.userData?.dest?.id === 'GITHUB') || lab.ls1Crystals[0];
    lab.activatePortal(ghNode);
    if (lab.ls1ActivePortal) {
      lab.ls1ActivePortal.seqTime = 4.5;
    }
  });
  await page.waitForTimeout(500);

  const hierarchy = await page.evaluate(() => {
    const lab = window.__lab;
    const pm = lab.ls1PortalMesh;
    function inspect(obj, depth = 0) {
      const info = {
        name: obj.name || obj.type,
        type: obj.type,
        visible: obj.visible,
        renderOrder: obj.renderOrder,
        pos: obj.position.toArray().map(v => +v.toFixed(3)),
        scale: obj.scale.toArray().map(v => +v.toFixed(3)),
        childrenCount: obj.children.length
      };
      if (obj.geometry) {
        info.geometryType = obj.geometry.type;
        if (obj.geometry.parameters) info.geoParams = obj.geometry.parameters;
      }
      if (obj.material) {
        const m = obj.material;
        info.matType = m.type;
        info.transparent = m.transparent;
        info.depthWrite = m.depthWrite;
        info.blending = m.blending;
        if (m.color && typeof m.color.getHexString === 'function') info.color = m.color.getHexString();
      }
      info.children = obj.children.map(c => inspect(c, depth + 1));
      return info;
    }
    return inspect(pm);
  });
  console.log('Hierarchy of ls1PortalMesh:\n', JSON.stringify(hierarchy, null, 2));

  console.log('Capturing diag_0_baseline.png...');
  fs.writeFileSync(path.join(OUT_DIR, 'diag_0_baseline.png'), await page.screenshot());

  console.log('Test 1: Hide cap mesh...');
  await page.evaluate(() => {
    const abyssGroup = window.__lab.ls1AbyssGroup;
    if (abyssGroup && abyssGroup.children[1]) {
      abyssGroup.children[1].visible = false;
    }
  });
  fs.writeFileSync(path.join(OUT_DIR, 'diag_1_no_cap.png'), await page.screenshot());

  console.log('Test 2: Hide abyss tunnel mesh...');
  await page.evaluate(() => {
    const tunnel = window.__lab.ls1AbyssTunnelMesh;
    if (tunnel) tunnel.visible = false;
  });
  fs.writeFileSync(path.join(OUT_DIR, 'diag_2_no_tunnel.png'), await page.screenshot());

  console.log('Test 3: Hide throat mesh...');
  await page.evaluate(() => {
    const abyssGroup = window.__lab.ls1AbyssGroup;
    if (abyssGroup && abyssGroup.children[1]) abyssGroup.children[1].visible = true;
    if (window.__lab.ls1AbyssTunnelMesh) window.__lab.ls1AbyssTunnelMesh.visible = true;
    const throat = window.__lab.ls1PortalMesh.children.find(c => c.geometry?.type === 'PlaneGeometry' && c.userData?.isPortal);
    if (throat) throat.visible = false;
  });
  fs.writeFileSync(path.join(OUT_DIR, 'diag_3_no_throat.png'), await page.screenshot());

  console.log('Test 4: Hide ls1AbyssGroup...');
  await page.evaluate(() => {
    const throat = window.__lab.ls1PortalMesh.children.find(c => c.geometry?.type === 'PlaneGeometry' && c.userData?.isPortal);
    if (throat) throat.visible = true;
    if (window.__lab.ls1AbyssGroup) window.__lab.ls1AbyssGroup.visible = false;
  });
  fs.writeFileSync(path.join(OUT_DIR, 'diag_4_no_abyss_group.png'), await page.screenshot());

  console.log('Test 5: Hide smoke mesh...');
  await page.evaluate(() => {
    if (window.__lab.ls1AbyssGroup) window.__lab.ls1AbyssGroup.visible = true;
    if (window.__lab.ls1SmokeMesh) window.__lab.ls1SmokeMesh.visible = false;
  });
  fs.writeFileSync(path.join(OUT_DIR, 'diag_5_no_smoke.png'), await page.screenshot());

  const transforms = await page.evaluate(() => {
    const lab = window.__lab;
    const pm = lab.ls1PortalMesh;
    const dest = lab.ls1Destination3DGroup;
    const throat = pm.children.find(c => c.geometry?.type === 'PlaneGeometry' && c.userData?.isPortal);

    const pmWorld = new THREE.Vector3();
    pm.getWorldPosition(pmWorld);
    const destWorld = new THREE.Vector3();
    if (dest) dest.getWorldPosition(destWorld);

    return {
      pmLocalPos: pm.position.toArray(),
      pmWorldPos: pmWorld.toArray(),
      destLocalPos: dest ? dest.position.toArray() : null,
      destWorldPos: destWorld ? destWorld.toArray() : null,
      throatLocalPos: throat ? throat.position.toArray() : null
    };
  });
  console.log('\nTransforms comparison:', JSON.stringify(transforms, null, 2));

  await browser.close();
  console.log('=== DIAGNOSTICS COMPLETE ===');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
