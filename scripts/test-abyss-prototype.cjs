// scripts/test-abyss-prototype.cjs
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const OUT_DIR = 'C:\\Users\\gadia\\.gemini\\antigravity-ide\\brain\\475c253f-9db4-4c62-97b4-6d98a1bf3915';

async function run() {
  console.log('=== [TESTING SURGICAL ABYSS PROTOTYPE] ===\n');

  const browser = await chromium.launch({
    headless: true,
    args: ['--use-gl=angle', '--use-angle=d3d11', '--enable-webgl', '--no-sandbox']
  });

  const page = await browser.newPage({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1
  });

  await page.goto('http://localhost:3000/index.html?lab&boot=skip', { waitUntil: 'load', timeout: 30000 });
  await page.waitForFunction(() => typeof window.__lab !== 'undefined', { timeout: 25000 });
  await page.waitForTimeout(1500);

  // Focus LS1
  await page.evaluate(() => {
    window.__lab.focusSector('LS1', true);
    const btn = document.getElementById('btn-skip-anim');
    if (btn) btn.style.display = 'none';
  });
  await page.waitForTimeout(500);

  // Fast-forward to ready
  await page.evaluate(() => {
    const lab = window.__lab;
    lab.wakeLS1();
    lab.setBirthTimer(25.0);
    lab.update(0.1);
  });
  await page.waitForTimeout(1000);

  // Activate portal
  await page.evaluate(() => {
    const lab = window.__lab;
    const ghNode = lab.ls1Crystals.find(c => c.userData?.dest?.id === 'GITHUB') || lab.ls1Crystals[0];
    lab.activatePortal(ghNode);
    if (lab.ls1ActivePortal) {
      lab.ls1ActivePortal.seqTime = 4.5;
    }
  });
  await page.waitForTimeout(500);

  // Apply surgical prototype adjustments in runtime
  const alignmentResult = await page.evaluate(() => {
    const lab = window.__lab;
    const THREE = window.THREE || lab.scene.constructor;
    const pm = lab.ls1PortalMesh;
    const abyssGroup = lab.ls1AbyssGroup;
    const tunnel = lab.ls1AbyssTunnelMesh;
    const dest = lab.ls1Destination3DGroup;
    const cam = lab.camera;

    // 1. Remove artificial tilt so portal faces camera strictly on line-of-sight
    pm.rotateY = () => {};
    pm.rotateX = () => {};
    pm.lookAt(cam.position);

    // 2. Replace tunnel geometry with tight conical throat contained inside smoke footprint:
    // Front: R = 0.19 at Z = 0
    // Back: R = 0.26 at Z = -2.20
    if (tunnel) {
      tunnel.geometry.dispose();
      const newGeo = new THREE.CylinderGeometry(0.19, 0.26, 2.20, 32, 16, true);
      newGeo.rotateX(Math.PI / 2);
      newGeo.translate(0, 0, -1.10);
      tunnel.geometry = newGeo;

      if (tunnel.material) {
        tunnel.material.fragmentShader = `
          precision highp float;
          varying vec2 vUv;
          varying vec3 vPos;
          uniform float uTime;
          uniform vec3 uStoneColor;
          uniform float uOpen;

          void main() {
            if (uOpen <= 0.002) discard;
            vec3 voidCol = vec3(0.0002, 0.0004, 0.0008);

            // Sparse twinkling stars along throat depth
            vec2 starGrid = floor(vUv * vec2(24.0, 48.0));
            float starHash = fract(sin(dot(starGrid, vec2(12.9898, 78.233))) * 43758.5453);
            if (starHash > 0.940) {
              vec2 starFrac = fract(vUv * vec2(24.0, 48.0)) - vec2(0.5);
              float starDist = length(starFrac);
              float starGlow = smoothstep(0.18, 0.0, starDist);
              float twinkle = 0.60 + 0.40 * sin(starHash * 40.0 + uTime * 2.5);
              vec3 sCol = mix(vec3(0.85, 0.95, 1.0), uStoneColor, 0.25);
              voidCol += sCol * starGlow * twinkle * 0.65;
            }

            // Inward receding streamlines
            float spiral = fract(vUv.x * 4.0 - uTime * 0.12);
            float stream = smoothstep(0.02, 0.0, abs(spiral - 0.5)) * (1.0 - smoothstep(-0.3, -2.0, vPos.z));
            voidCol += uStoneColor * stream * 0.04;

            // Zero front rim: smoothstep(0.0, -0.15, vPos.z)
            float depthFade = smoothstep(0.0, -0.15, vPos.z) * (1.0 - smoothstep(-2.10, -2.20, vPos.z));
            gl_FragColor = vec4(voidCol, depthFade * uOpen);
          }
        `;
        tunnel.material.needsUpdate = true;
      }
    }

    // 3. Update Cap geometry: R = 0.26 at Z = -2.20
    const cap = abyssGroup.children[1];
    if (cap && cap.geometry) {
      cap.geometry.dispose();
      const newCapGeo = new THREE.CircleGeometry(0.26, 32);
      newCapGeo.translate(0, 0, -2.20);
      cap.geometry = newCapGeo;
    }

    // 4. Center Destination on the authoritative portal-local axis:
    // destination.position = (0, 0, -1.35)
    // Scale: 0.52 (small, deep, framed with void space around it)
    if (dest) {
      dest.position.set(0, 0, -1.35);
      dest.scale.setScalar(0.52);
      dest.rotation.set(0, 0, 0);
    }

    // 5. Measure screen-space projection of portal center vs destination center
    const pCenterWorld = new THREE.Vector3();
    pm.getWorldPosition(pCenterWorld);
    const pCenterScreen = pCenterWorld.clone().project(cam);

    const destWorld = new THREE.Vector3();
    dest.getWorldPosition(destWorld);
    const destScreen = destWorld.clone().project(cam);

    const screenDist = Math.hypot(pCenterScreen.x - destScreen.x, pCenterScreen.y - destScreen.y);

    return {
      portalScreen: [pCenterScreen.x.toFixed(4), pCenterScreen.y.toFixed(4)],
      destScreen: [destScreen.x.toFixed(4), destScreen.y.toFixed(4)],
      screenDist: screenDist.toFixed(5),
      isCentered: screenDist < 0.005
    };
  });

  console.log('Alignment result:', alignmentResult);
  await page.waitForTimeout(300);

  console.log('Capturing proto_surgical_abyss.png...');
  fs.writeFileSync(path.join(OUT_DIR, 'proto_surgical_abyss.png'), await page.screenshot());

  await browser.close();
  console.log('=== PROTOTYPE COMPLETE ===');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
