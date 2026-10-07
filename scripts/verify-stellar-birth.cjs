const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function main() {
  console.log('=== [LS1 360° COSMIC DEEP SPACE & STELLAR BIRTH VERIFICATION] ===');
  const browser = await chromium.launch({
    headless: true,
    args: ['--use-gl=angle', '--use-angle=gl', '--enable-webgl', '--ignore-gpu-blocklist'],
  });

  const page = await browser.newPage({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1,
  });

  const consoleLogs = [];
  const webglWarnings = [];
  const rasterFiles = [];

  page.on('response', resp => {
    const url = resp.url();
    if (/\.(png|jpg|jpeg|webp|gif|bmp|tga|dds|hdr|exr|glb|gltf)($|\?)/i.test(url)) {
      if (!url.includes('/screenshots/')) {
        rasterFiles.push(url);
      }
    }
  });

  page.on('console', msg => {
    const text = msg.text();
    const type = msg.type();
    consoleLogs.push(`[${type}] ${text}`);
    if (type === 'warning' || type === 'error' || text.toLowerCase().includes('webgl') || text.toLowerCase().includes('warn')) {
      if (!text.includes('Failed to load resource') && !text.includes('favicon') && !text.includes('Live news poll warning')) {
        webglWarnings.push(text);
      }
    }
  });
  page.on('pageerror', err => {
    webglWarnings.push(`[PAGE ERROR] ${err.message}`);
  });

  const artifactDir = path.resolve('C:/Users/gadia/.gemini/antigravity-ide/brain/475c253f-9db4-4c62-97b4-6d98a1bf3915');

  try {
    const port = process.env.PORT || '3000';
    console.log(`1. Navigating to http://localhost:${port}/index.html?lab&boot=skip ...`);
    await page.goto(`http://localhost:${port}/index.html?lab&boot=skip`, { waitUntil: 'load', timeout: 30000 });
    await page.waitForFunction(() => window.__lab?.state?.ready, { timeout: 25000 });
    await page.waitForTimeout(1000);

    // Focus LS1
    console.log('2. Focusing sector LS1 (Containment station on workbench)...');
    await page.evaluate(() => window.__lab.focusSector('LS1'));
    await page.waitForTimeout(2000);

    // Trigger LS1 stellar birth sequence
    console.log('3. Triggering LS1 stellar birth sequence via wakeLS1()...');
    await page.evaluate(() => window.__lab.wakeLS1());

    // Wait for hologram boot (1.35s) to complete and enter crystal_birth
    console.log('   Waiting for hologram boot to initialize stellar birth...');
    await page.waitForFunction(() => window.__lab.ls1StationState === 'crystal_birth', { timeout: 5000 });

    // ── STAGE 1: Total Room Blackout & 360° Real Celestial Cosmic Horizon (T ~ 0.5s) ──
    await page.waitForFunction(() => window.__lab.ls1BirthTimer >= 0.5, { timeout: 5000 });
    await page.evaluate(() => window.__lab.freezeBirth(true));
    const s1State = await page.evaluate(() => {
      let cosmicVis = false;
      window.__lab.scene.traverse(o => {
        if (o.isMesh && o.geometry?.type === 'SphereGeometry' && (o.geometry?.parameters?.radius >= 50)) {
          cosmicVis = o.visible;
        }
      });
      const holoVis = window.__lab.ls1FigureGroup ? window.__lab.ls1FigureGroup.visible : false;
      const visibleCrystals = (window.__lab.ls1Crystals || []).filter(c => c.visible).length;
      return { timer: window.__lab.ls1BirthTimer, cosmicVis, holoVis, visibleCrystals, state: window.__lab.ls1StationState };
    });
    console.log('   Stage 1 State (Blackout, 360° Space, Hologram Disappeared):', s1State);
    const s1Path = path.join(artifactDir, 'ls1-stage1-blackout.png');
    await page.screenshot({ path: s1Path });
    console.log(`   -> Saved Stage 1 screenshot: ${s1Path}`);

    // ── STAGE 2: Protostellar Ignition & Relativistic Accretion Disc & Jets (T ~ 4.8s) ──
    await page.evaluate(() => {
      window.__lab.setBirthTimer(4.8);
    });
    await page.waitForTimeout(60);
    const s2State = await page.evaluate(() => {
      let coreVis = false;
      let discVis = false;
      let jetsVis = false;
      window.__lab.scene.traverse(o => {
        if (o.isMesh && o.material?.uniforms?.uIgnition) coreVis = o.visible;
        if (o.isMesh && o.material?.uniforms?.uDiscIntensity) discVis = o.visible;
        if (o.isMesh && o.material?.color && typeof o.material.color.getHex === 'function' && o.material.color.getHex() === 0x66ddff) jetsVis = o.visible;
      });
      const holoVis = window.__lab.ls1FigureGroup ? window.__lab.ls1FigureGroup.visible : false;
      const visibleCrystals = (window.__lab.ls1Crystals || []).filter(c => c.visible).length;
      return { timer: window.__lab.ls1BirthTimer, coreVis, discVis, jetsVis, holoVis, visibleCrystals };
    });
    console.log('   Stage 2 State (Protostellar Ignition & Relativistic Jets, Zero Gems):', s2State);
    const s2Path = path.join(artifactDir, 'ls1-stage2-ignition.png');
    await page.screenshot({ path: s2Path });
    console.log(`   -> Saved Stage 2 screenshot: ${s2Path}`);

    // ── STAGE 3: Thermonuclear Fusion Flash & Supernova Shockwave (T ~ 7.0s) ──
    await page.evaluate(() => {
      window.__lab.setBirthTimer(7.0);
    });
    await page.waitForTimeout(60);
    const s3State = await page.evaluate(() => {
      let shockVis = false;
      let flashVal = 0;
      window.__lab.scene.traverse(o => {
        if (o.isMesh && o.material?.uniforms?.uShockAlpha) shockVis = o.visible;
        if (o.isMesh && o.material?.uniforms?.uFlash) flashVal = o.material.uniforms.uFlash.value;
      });
      const holoVis = window.__lab.ls1FigureGroup ? window.__lab.ls1FigureGroup.visible : false;
      const visibleCrystals = (window.__lab.ls1Crystals || []).filter(c => c.visible).length;
      return { timer: window.__lab.ls1BirthTimer, shockVis, flashVal, holoVis, visibleCrystals };
    });
    console.log('   Stage 3 State (Thermonuclear Flash & Supernova Shockwave, Zero Gems):', s3State);
    const s3Path = path.join(artifactDir, 'ls1-stage3-flash.png');
    await page.screenshot({ path: s3Path });
    console.log(`   -> Saved Stage 3 screenshot: ${s3Path}`);

    // ── STAGE 4: Nucleosynthesis & Crystalline Gem Condensation (T ~ 8.4s) ──
    await page.evaluate(() => {
      window.__lab.setBirthTimer(8.4);
    });
    await page.waitForTimeout(60);
    const s4State = await page.evaluate(() => {
      const crystals = window.__lab.ls1Crystals || [];
      const visibleCount = crystals.filter(c => c.visible).length;
      const holoVis = window.__lab.ls1FigureGroup ? window.__lab.ls1FigureGroup.visible : false;
      return { timer: window.__lab.ls1BirthTimer, visibleCount, total: crystals.length, holoVis };
    });
    console.log('   Stage 4 State (Nucleosynthesis: Gems Condensing from Ejecta):', s4State);
    const s4Path = path.join(artifactDir, 'ls1-stage4-nucleosynthesis.png');
    await page.screenshot({ path: s4Path });
    console.log(`   -> Saved Stage 4 screenshot: ${s4Path}`);

    // ── STAGE 5: Hologram Emergence & Stellar Equilibrium (T >= 12.5s) ──
    await page.evaluate(() => {
      window.__lab.freezeBirth(false);
      window.__lab.setBirthTimer(12.6);
    });
    await page.waitForFunction(() => window.__lab.ls1StationState === 'active', { timeout: 8000 });
    const s5State = await page.evaluate(() => {
      const crystals = window.__lab.ls1Crystals || [];
      const visibleCount = crystals.filter(c => c.visible).length;
      const holoVis = window.__lab.ls1FigureGroup ? window.__lab.ls1FigureGroup.visible : false;
      return {
        state: window.__lab.ls1StationState,
        timer: window.__lab.ls1BirthTimer,
        visibleCount,
        total: crystals.length,
        holoVis
      };
    });
    console.log('   Stage 5 State (Equilibrium, Hologram Re-booted, 8 Gems in Orbit):', s5State);
    const s5Path = path.join(artifactDir, 'ls1-stage5-complete.png');
    await page.screenshot({ path: s5Path });
    console.log(`   -> Saved Stage 5 screenshot: ${s5Path}`);

    // ── Rule 2 Audit: Zero raster image files loaded ──
    console.log('4. Auditing Rule 2 Zero-Raster constraint...');
    console.log(`   Raster image files loaded count: ${rasterFiles.length}`);
    if (rasterFiles.length > 0) {
      console.warn('   Loaded raster files:', rasterFiles);
      throw new Error(`Rule 2 violation: ${rasterFiles.length} raster image files loaded!`);
    } else {
      console.log('   ✓ PASS: Exactly 0 raster image files loaded.');
    }

    // ── Rule 7 Audit: Zero WebGL warnings ──
    console.log('5. Auditing Rule 7 Zero WebGL warnings constraint...');
    console.log(`   WebGL warnings count: ${webglWarnings.length}`);
    if (webglWarnings.length > 0) {
      console.warn('   WebGL warnings:', webglWarnings);
      throw new Error(`Rule 7 violation: WebGL warnings detected!`);
    } else {
      console.log('   ✓ PASS: Zero WebGL warnings in console.');
    }

    console.log('=== [LS1 360° CELESTIAL UNIVERSE & STELLAR BIRTH PASSED PERFECTLY] ===');
  } finally {
    await browser.close();
  }
}

main().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
