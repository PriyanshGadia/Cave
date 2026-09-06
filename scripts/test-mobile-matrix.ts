import { chromium } from 'playwright';

async function testDevice(name: string, width: number, height: number, dpr: number, spoofLow: boolean) {
  console.log(`\n--- Testing ${name} (${width}x${height}, deviceDPR: ${dpr}, spoofLow: ${spoofLow}) ---`);
  const browser = await chromium.launch({
    headless: true,
    args: ['--use-gl=angle', '--use-angle=gl', '--enable-webgl', '--ignore-gpu-blocklist'],
  });

  const page = await browser.newPage({
    viewport: { width, height },
    deviceScaleFactor: dpr,
  });

  if (spoofLow) {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 2 });
    });
  }

  const warnings: string[] = [];
  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    if (type === 'error' || type === 'warning' || text.toLowerCase().includes('webgl') || text.toLowerCase().includes('warn')) {
      if (!text.includes('favicon') && !text.includes('Devtools')) {
        warnings.push(`[${type}] ${text}`);
      }
    }
  });

  await page.goto('http://localhost:8000/index.html', { waitUntil: 'load', timeout: 30000 });
  await page.waitForSelector('#load', { state: 'detached', timeout: 30000 });
  await page.waitForTimeout(2500);

  // Walk to door
  await page.evaluate(() => {
    (window as any).VAULT.walk.target = 1;
  });
  await page.waitForTimeout(3500);

  // Inspect raycast alignment on door buttons
  const raycastResult = await page.evaluate(() => {
    const vault = (window as any).VAULT;
    const camera = vault.camera;
    const scene = vault.scene;
    const THREE = (window as any).THREE;

    // Test raycast dead center (iris scanner / panel)
    const ray = new THREE.Raycaster();
    const ndc = new THREE.Vector2(0, 0); // screen center in CSS NDC
    ray.setFromCamera(ndc, camera);
    const hits = ray.intersectObjects(scene.children, true);
    const hitNames = hits.slice(0, 5).map((h: any) => h.object.name || h.object.userData?.role || h.object.geometry?.type);

    // Measure effective pixel ratio used by renderer
    const effectiveDPR = vault.renderer ? vault.renderer.getPixelRatio() : 1;
    const fps = vault.fps || 30;

    return {
      hitCount: hits.length,
      topHits: hitNames,
      effectiveDPR,
      fps,
      fov: camera.fov,
      aspect: camera.aspect,
      camY: camera.position.y,
    };
  });

  console.log(`   -> Effective DPR: ${raycastResult.effectiveDPR} (capped from ${dpr})`);
  console.log(`   -> Camera FOV: ${raycastResult.fov.toFixed(1)}° (portrait embraced), camY: ${raycastResult.camY.toFixed(3)}`);
  console.log(`   -> Center raycast hit count: ${raycastResult.hitCount}, top hits:`, raycastResult.topHits);
  console.log(`   -> Warnings count: ${warnings.length}`);

  if (warnings.length > 0) {
    throw new Error(`Warnings found on ${name}: ${warnings.join('; ')}`);
  }
  if (raycastResult.hitCount === 0) {
    throw new Error(`Raycast completely missed the door on ${name}`);
  }

  await browser.close();
  console.log(`   -> ${name} PASSED.`);
}

async function main() {
  console.log('=== [MOBILE & LOW-END TEST MATRIX] ===');
  try {
    // 1. Android 1080x2400 (20:9) with DPR 2.625
    await testDevice('Android-20:9', 412, 915, 2.625, false);

    // 2. iPhone 1170x2532 (19.5:9) with DPR 3.0
    await testDevice('iPhone-19.5:9', 390, 844, 3.0, false);

    // 3. Spoofed LOW hardwareConcurrency <= 2
    await testDevice('Spoofed-LOW-Tier', 412, 915, 2.625, true);

    console.log('\n=== [ALL MOBILE & LOW-END TESTS PASSED] ===');
    process.exit(0);
  } catch (err) {
    console.error('Mobile matrix failed:', err);
    process.exit(1);
  }
}

main();
