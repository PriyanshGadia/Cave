// scripts/capture-ls2-audit.cjs
// Captures required Playwright screenshots for LS2 audit gate:
// 1. Unfocused wide shot showing LS2 in context with neighboring sectors
// 2. Focused dolly shot at FOCUS_CFG.LS2
// 3. Console log audit (raster file count, WebGL warnings)

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
  console.log('=== [LS2 AUDIT CAPTURE SUITE] ===\n');

  const browser = await chromium.launch({
    headless: true,
    args: ['--use-gl=angle', '--use-angle=gl', '--enable-webgl', '--ignore-gpu-blocklist']
  });

  const rasterLoaded = [];
  const webglWarnings = [];

  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

  page.on('response', resp => {
    const url = resp.url();
    if (/\.(png|jpg|jpeg|webp|gif|bmp|tga|dds|hdr|exr|glb|gltf)($|\?)/i.test(url)) {
      if (!url.includes('/screenshots/')) {
        rasterLoaded.push(url);
      }
    }
  });

  page.on('console', msg => {
    const txt = msg.text();
    if (/WARNING: 0:|WebGL|INVALID_OPERATION|performance warning|GL_INVALID/i.test(txt)) {
      if (!txt.includes('Live news poll warning') && !txt.includes('Download the React DevTools')) {
        webglWarnings.push(txt);
      }
    }
  });

  console.log('1. Navigating to http://localhost:3000/index.html?lab&boot=skip ...');
  await page.goto('http://localhost:3000/index.html?lab&boot=skip', { waitUntil: 'load', timeout: 30000 });
  await page.waitForFunction(() => window.__lab?.state?.ready, { timeout: 25000 });
  await page.waitForTimeout(1000);

  // ── CAPTURE 1: LS2 Unfocused Wide Shot ──
  console.log('2. Capturing LS2 unfocused wide shot...');
  const wideCam = await page.evaluate(() => {
    const cam = window.__lab?.camera;
    return cam ? { x: +cam.position.x.toFixed(3), y: +cam.position.y.toFixed(3), z: +cam.position.z.toFixed(3) } : null;
  });
  console.log('   -> Wide shot camera pos:', wideCam);
  await save('audit_ls2_wide.png', await page.screenshot({ animations: 'disabled' }));

  // ── CAPTURE 2: LS2 Focused Dolly Shot ──
  console.log('3. Focusing Sector LS2 (calling focusSector("LS2"))...');
  await page.evaluate(() => window.__lab.focusSector('LS2'));
  await page.waitForTimeout(2000);

  const focusCam = await page.evaluate(() => {
    const cam = window.__lab?.camera;
    const stats = window.__lab?.stats ? window.__lab.stats() : null;
    return {
      pos: cam ? { x: +cam.position.x.toFixed(3), y: +cam.position.y.toFixed(3), z: +cam.position.z.toFixed(3) } : null,
      focusId: stats ? stats.focus : null
    };
  });
  console.log('   -> Focused shot camera pos:', focusCam);
  await save('audit_ls2_focused.png', await page.screenshot({ animations: 'disabled' }));

  // Inspect LS2 notes mesh in scene
  const ls2MeshDetails = await page.evaluate(() => {
    let ls2Group = null;
    window.__lab.scene.traverse(o => {
      if (o.userData && o.userData.tag === 'LS2') {
        ls2Group = o;
      }
    });
    if (!ls2Group) return null;

    let notesCount = 0;
    const noteColors = [];
    ls2Group.traverse(c => {
      if (c.userData && c.userData.interactive && c.userData.noteIdx != null) {
        notesCount++;
        if (c.material && c.material.color) {
          noteColors.push('#' + c.material.color.getHexString());
        }
      }
    });

    return {
      groupFound: true,
      childrenCount: ls2Group.children.length,
      notesCount,
      noteColors
    };
  });

  console.log('   -> LS2 Mesh Inspection:', ls2MeshDetails);
  console.log('   -> Raster image files loaded count:', rasterLoaded.length, rasterLoaded);
  console.log('   -> WebGL console warnings count:', webglWarnings.length, webglWarnings);

  await browser.close();
  console.log('\n=== [LS2 AUDIT CAPTURES COMPLETED] ===');
}

run().catch(err => {
  console.error('LS2 Audit Capture Failed:', err);
  process.exit(1);
});
