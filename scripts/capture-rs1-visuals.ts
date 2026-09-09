import { chromium } from 'playwright';
import * as path from 'path';

async function main() {
  const artifactDir = 'C:\\Users\\gadia\\.gemini\\antigravity-ide\\brain\\083cf90c-eec5-4055-8991-b6f7b0b443d4';
  const browser = await chromium.launch({
    headless: true,
    args: ['--use-gl=angle', '--use-angle=gl', '--enable-webgl', '--ignore-gpu-blocklist'],
  });

  const page = await browser.newPage({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1,
  });

  console.log('Loading page...');
  await page.goto('http://localhost:8000/index.html?lab&boot=skip', { waitUntil: 'load', timeout: 30000 });
  await page.waitForFunction(() => (window as any).__lab?.state?.ready, { timeout: 15000 });
  await page.waitForTimeout(600);

  console.log('Focusing RS1...');
  await page.evaluate(() => {
    (window as any).__lab.focusSector('RS1');
  });
  await page.waitForFunction(() => (window as any).__lab?.state?.focusE >= 0.99, { timeout: 10000 });
  await page.waitForTimeout(600);

  const deskScreenshotPath = path.join(artifactDir, 'rs1_blueprints_desk.png');
  await page.screenshot({ path: deskScreenshotPath });
  console.log(`Saved desk screenshot to: ${deskScreenshotPath}`);

  // Find cave blueprint sheet position
  const sheetPos = await page.evaluate(() => {
    const g = (window as any).__lab.sectorGroups['RS1'];
    let target: any = null;
    g.traverse((o: any) => {
      if (o.isMesh && o.userData?.projectId?.toLowerCase() === 'gh:priyanshgadia/cave') target = o;
    });
    if (!target) return null;
    target.updateWorldMatrix(true, true);
    const pos = new (window as any).THREE.Vector3();
    target.getWorldPosition(pos);
    const cam = (window as any).__lab.camera;
    pos.project(cam);
    return {
      x: Math.round((pos.x * 0.5 + 0.5) * window.innerWidth),
      y: Math.round((-pos.y * 0.5 + 0.5) * window.innerHeight),
    };
  });

  console.log(`Clicking sheet at (${sheetPos?.x}, ${sheetPos?.y}) ...`);
  if (sheetPos) {
    await page.mouse.move(sheetPos.x, sheetPos.y);
    await page.mouse.down();
    await page.waitForTimeout(80);
    await page.mouse.up();
    await page.waitForTimeout(700);

    const readScreenshotPath = path.join(artifactDir, 'rs1_blueprint_read_mode.png');
    await page.screenshot({ path: readScreenshotPath });
    console.log(`Saved read mode screenshot to: ${readScreenshotPath}`);
  }

  await browser.close();
  console.log('Done!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
