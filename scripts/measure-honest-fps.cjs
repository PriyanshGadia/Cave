// scripts/measure-honest-fps.cjs
const { chromium } = require('playwright');

async function run() {
  console.log('=== [INDEPENDENT STEADY-STATE FPS BENCHMARK] ===');

  const browser = await chromium.launch({
    headless: true,
    args: ['--use-gl=angle', '--use-angle=gl', '--enable-webgl', '--ignore-gpu-blocklist']
  });

  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });

  await page.goto('http://localhost:3000/index.html?lab&boot=skip', { waitUntil: 'load', timeout: 30000 });
  await page.waitForFunction(() => window.__lab?.state?.ready, { timeout: 25000 });

  await page.evaluate(() => {
    if (window.__lab?.skipToFinal) window.__lab.skipToFinal('LS1');
    const btn = document.getElementById('btn-skip-anim');
    if (btn) btn.style.display = 'none';
  });
  
  // Warm up for 3 seconds without taking screenshots
  console.log('Warming up render loop for 3.0 seconds...');
  await page.waitForTimeout(3000);

  // Pure 120-frame rAF benchmark without screenshot calls
  console.log('Sampling 120 consecutive rAF frames (zero screenshot calls during sample)...');
  const result = await page.evaluate(async () => {
    return new Promise(resolve => {
      let count = 0, start = performance.now(), last = start, deltas = [];
      function sample(now) {
        deltas.push(now - last);
        last = now;
        count++;
        if (count < 120) requestAnimationFrame(sample);
        else {
          const total = now - start;
          const sorted = [...deltas.slice(1)].sort((a, b) => a - b);
          const stats = window.__lab.stats();
          resolve({
            sampleCount: count,
            totalDurationMs: +total.toFixed(2),
            avgFps: +(count / (total / 1000)).toFixed(2),
            minFrameTimeMs: +sorted[0].toFixed(2),
            p50FrameTimeMs: +sorted[Math.floor(sorted.length * 0.5)].toFixed(2),
            p95FrameTimeMs: +sorted[Math.floor(sorted.length * 0.95)].toFixed(2),
            maxFrameTimeMs: +sorted[sorted.length - 1].toFixed(2),
            dpr: window.devicePixelRatio,
            sceneDrawCalls: stats.calls,
            sceneTriangles: stats.triangles
          });
        }
      }
      requestAnimationFrame(sample);
    });
  });

  console.log('\n--- Benchmark Result ---');
  console.log(JSON.stringify(result, null, 2));
  console.log('------------------------\n');

  await browser.close();
}

run().catch(console.error);
