import { chromium } from 'playwright';
import { spawn } from 'child_process';
import path from 'path';

async function main() {
  console.log('=== [STARTING VITE PREVIEW SERVER] ===');
  const server = spawn('npx', ['vite', 'preview', '--port', '4173'], {
    shell: true,
    stdio: 'pipe',
  });

  await new Promise((resolve) => setTimeout(resolve, 2500));

  console.log('=== [LAUNCHING CHROMIUM FOR 9:16 VERTICAL CAPTURE] ===');
  const browser = await chromium.launch({
    headless: true,
    args: ['--enable-webgl', '--ignore-gpu-blocklist'],
  });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
  });
  const page = await context.newPage();

  console.log('1. Navigating to http://localhost:4173 (SC00 Approach in 9:16)...');
  await page.goto('http://localhost:4173', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);

  console.log('2. Capturing SC00 Gunmetal Blast Door (9:16 Locked Portrait)...');
  await page.screenshot({
    path: path.join(process.cwd(), 'public/screenshots/workshop-sc00-approach.png'),
    timeout: 8000,
  });

  console.log('3. Navigating to SC06 Active Workshop (Table Hologram at Y=0.35m)...');
  await page.goto('http://localhost:4173?scene=SC06_ACTIVE', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  console.log('4. Capturing Scene 06 Active Workshop (Center View)...');
  await page.screenshot({
    path: path.join(process.cwd(), 'public/screenshots/workshop-sc01-panel.png'),
    timeout: 8000,
  });

  console.log('=== [ALL SCENES CAPTURED SUCCESSFULLY] ===');
  await browser.close();
  server.kill();
  process.exit(0);
}

main().catch((err) => {
  console.error('Error capturing workshop scenes:', err);
  process.exit(1);
});
