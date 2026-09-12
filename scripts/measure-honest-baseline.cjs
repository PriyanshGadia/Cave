// scripts/measure-honest-baseline.cjs
const { chromium } = require('playwright');

async function run() {
  console.log('=== [ACCURATE BASELINE & TELEMETRY AUDIT] ===\n');

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
      if (!text.includes('favicon')) consoleWarnings.push(text);
    }
  });

  console.log('1. Navigating to http://localhost:3000/index.html?lab&boot=skip ...');
  await page.goto('http://localhost:3000/index.html?lab&boot=skip', { waitUntil: 'load', timeout: 30000 });
  await page.waitForFunction(() => window.__lab?.state?.ready, { timeout: 25000 });

  await page.evaluate(() => {
    if (window.__lab?.skipToFinal) window.__lab.skipToFinal();
    const btn = document.getElementById('btn-skip-anim');
    if (btn) btn.style.display = 'none';
  });

  // Allow 3 seconds for initial boot transients and dynamic resolution scaler to fully stabilize at scale 1.00
  await page.waitForTimeout(3000);

  // Measure scene geometry & draw calls accurately
  const sceneTelemetry = await page.evaluate(() => {
    const composer = window.__lab?.composer || window.VAULT?.composer;
    const renderer = composer?.renderer || window.VAULT?.renderer;
    const scene = window.__lab?.scene || window.VAULT?.scene;
    const camera = window.__lab?.camera || window.VAULT?.camera;

    // Count objects & geometries in scene
    let totalMeshes = 0;
    let totalTrianglesInGeometries = 0;
    scene.traverse(o => {
      if (o.isMesh && o.geometry) {
        totalMeshes++;
        const g = o.geometry;
        if (g.index) {
          totalTrianglesInGeometries += g.index.count / 3;
        } else if (g.attributes.position) {
          totalTrianglesInGeometries += g.attributes.position.count / 3;
        }
      }
    });

    // Capture render pass calls by overriding autoReset for one frame
    renderer.info.autoReset = false;
    renderer.info.reset();
    
    // Render one full frame through composer
    if (window.__lab?.composer) {
      window.__lab.composer.render();
    }

    const liveCalls = renderer.info.render.calls;
    const liveTriangles = renderer.info.render.triangles;
    const livePoints = renderer.info.render.points;
    const liveLines = renderer.info.render.lines;

    renderer.info.autoReset = true; // restore default

    return {
      totalMeshesInScene: totalMeshes,
      totalTrianglesInGeometries: Math.round(totalTrianglesInGeometries),
      composerPassesCount: window.__lab?.composer?.passes?.length || 0,
      liveRenderCallsAccumulated: liveCalls,
      liveRenderTrianglesAccumulated: liveTriangles,
      liveRenderPoints: livePoints,
      liveRenderLines: liveLines,
      dpr: window.devicePixelRatio,
      perfScale: window.VAULT?.perf?.scale || 1.0
    };
  });

  console.log('Scene Geometry & Draw Calls Telemetry:', JSON.stringify(sceneTelemetry, null, 2));

  // Focus on LS1
  await page.evaluate(() => {
    window.__lab.focusSector('LS1', true);
  });
  await page.waitForTimeout(2000);

  // 120-frame rAF benchmark during steady state
  console.log('\n2. Running 120-frame steady-state rAF benchmark at focus...');
  const steadyBench = await page.evaluate(async () => {
    return new Promise(resolve => {
      let count = 0, start = performance.now(), last = start, deltas = [];
      function sample(now) {
        const dt = now - last;
        deltas.push(+dt.toFixed(2));
        last = now;
        count++;
        if (count < 120) {
          requestAnimationFrame(sample);
        } else {
          const total = now - start;
          resolve({
            sampleCount: count,
            totalDurationMs: +total.toFixed(2),
            avgFps: +(count / (total / 1000)).toFixed(2),
            minFrameTimeMs: +Math.min(...deltas.slice(1)).toFixed(2),
            maxFrameTimeMs: +Math.max(...deltas.slice(1)).toFixed(2),
            p50FrameTimeMs: +deltas.slice().sort((a,b)=>a-b)[Math.floor(deltas.length*0.5)].toFixed(2),
            p95FrameTimeMs: +deltas.slice().sort((a,b)=>a-b)[Math.floor(deltas.length*0.95)].toFixed(2),
            rawFrameDeltasSample: deltas.slice(0, 15)
          });
        }
      }
      requestAnimationFrame(sample);
    });
  });

  console.log('Steady-State Benchmark Results (120 frames):', JSON.stringify(steadyBench, null, 2));
  console.log('Console WebGL Warnings Count:', consoleWarnings.length);

  await browser.close();
  console.log('\n=== [BASELINE AUDIT COMPLETE] ===');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
