import { chromium } from 'playwright';

async function measure() {
  const browser = await chromium.launch({
    headless: true,
    args: ['--use-gl=angle', '--use-angle=gl', '--enable-webgl', '--ignore-gpu-blocklist'],
  });

  const page = await browser.newPage({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1,
  });

  await page.goto('http://localhost:8000/index.html?lab&boot=skip', { waitUntil: 'load', timeout: 30000 });
  await page.waitForFunction(() => (window as any).__lab?.state?.ready, { timeout: 15000 });
  await page.waitForTimeout(1000);

  const profile = async (label: string) => {
    return await page.evaluate(async (lbl) => {
      let frames = 0;
      const t0 = performance.now();
      for (let i = 0; i < 50; i++) {
        await new Promise(r => requestAnimationFrame(r));
        frames++;
      }
      const elapsed = (performance.now() - t0) / 1000;
      return { label: lbl, fps: +(frames / elapsed).toFixed(1) };
    }, label);
  };

  const r1 = await profile('Baseline (with mirror & 3 pendants)');
  console.log('1. Baseline in 16:9:', r1.fps, 'FPS');

  // Measure with mirror hidden
  await page.evaluate(() => {
    const lab = (window as any).__lab;
    lab.scene.traverse((o: any) => {
      if (o.scale && o.scale.y === -1) o.visible = false;
    });
  });
  await page.waitForTimeout(500);
  const r2 = await profile('Without mirror reflection');
  console.log('2. Without mirror in 16:9:', r2.fps, 'FPS');

  // Measure with pendants distance reduced to 7.5
  await page.evaluate(() => {
    const lab = (window as any).__lab;
    lab.scene.traverse((o: any) => {
      if (o.scale && o.scale.y === -1) o.visible = true; // restore mirror
      if (o.isPointLight && o.color.getHex() === 0xffb070) {
        o.distance = 7.0;
      }
    });
  });
  await page.waitForTimeout(500);
  const r3 = await profile('Pendants distance 7.0 (with mirror)');
  console.log('3. Pendants distance 7.0 in 16:9:', r3.fps, 'FPS');

  await browser.close();
}

measure().catch(console.error);
