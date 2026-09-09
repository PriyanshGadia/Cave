import { chromium } from 'playwright';

async function run() {
  console.log('=== [TESTING DIRECT SECTOR CLICKING & UNFOCUSING] ===');
  const browser = await chromium.launch({
    headless: true,
    args: ['--use-gl=angle', '--use-angle=gl', '--enable-webgl', '--ignore-gpu-blocklist'],
  });
  const page = await browser.newPage({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1,
  });

  await page.goto('http://localhost:3000/index.html', { waitUntil: 'load', timeout: 30000 });

  // Click skip immediately
  console.log('1. Clicking #btn-skip-anim immediately...');
  await page.click('#btn-skip-anim');

  // Wait for lab to become ready
  console.log('2. Waiting for window.__lab.state.ready...');
  await page.waitForFunction('window.__lab && window.__lab.state && window.__lab.state.ready', { timeout: 15000 });
  console.log('   Lab is ready and active!');

  await page.waitForTimeout(500);

  // 1. Focus RS3
  console.log('3. Calling focusSector("RS3")...');
  await page.evaluate(() => (window as any).__lab.focusSector('RS3'));
  await page.waitForTimeout(1000);
  const f1 = await page.evaluate(() => (window as any).__lab.state.focus);
  console.log('   Focus:', f1);
  if (f1 !== 'RS3') throw new Error('Failed to focus RS3');

  // 2. Unfocus with Escape
  console.log('4. Pressing Escape...');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(800);
  const f2 = await page.evaluate(() => (window as any).__lab.state.focus);
  console.log('   Focus after Escape:', f2);
  if (f2 !== null) throw new Error('Failed to unfocus after Escape');

  // 3. Focus RS1
  console.log('5. Calling focusSector("RS1")...');
  await page.evaluate(() => (window as any).__lab.focusSector('RS1'));
  await page.waitForTimeout(1000);
  const f3 = await page.evaluate(() => (window as any).__lab.state.focus);
  console.log('   Focus:', f3);
  if (f3 !== 'RS1') throw new Error('Failed to focus RS1');

  // 4. Unfocus with Escape
  console.log('6. Pressing Escape...');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(800);
  const f4 = await page.evaluate(() => (window as any).__lab.state.focus);
  console.log('   Focus after Escape:', f4);
  if (f4 !== null) throw new Error('Failed to unfocus after Escape');

  await browser.close();
  console.log('=== [DIRECT SECTOR CLICKING SUCCESSFUL] ===');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
