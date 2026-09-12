const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const ARTIFACTS_DIR = 'C:\\Users\\gadia\\.gemini\\antigravity-ide\\brain\\694bd3af-9386-4a86-8cb6-98cd73f0a84a';
const SCRATCH = path.join(ARTIFACTS_DIR, 'scratch');

const VIEWS = [
  { id: 'front', file: 'clay_1_front.png', label: '1. FRONT' },
  { id: 'right_3q', file: 'clay_2_right_3q.png', label: '2. RIGHT 3/4' },
  { id: 'right', file: 'clay_3_right.png', label: '3. RIGHT' },
  { id: 'left_3q', file: 'clay_4_left_3q.png', label: '4. LEFT 3/4' },
  { id: 'left', file: 'clay_5_left.png', label: '5. LEFT' },
  { id: 'back', file: 'clay_6_back.png', label: '6. BACK' },
  { id: 'head_front', file: 'clay_7_head_front.png', label: '7. HEAD CLOSE-UP FRONT' },
  { id: 'head_right_3q', file: 'clay_8_head_right_3q.png', label: '8. HEAD CLOSE-UP RIGHT 3/4' },
];

(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ['--use-gl=angle', '--use-angle=gl', '--enable-webgl', '--ignore-gpu-blocklist']
  });

  const page = await browser.newPage();
  page.on('console', m => {
    if (m.type() === 'error') console.error('[PAGE ERROR]', m.text());
    else console.log('[page]', m.text());
  });
  page.on('pageerror', e => console.error('[PAGEERR]', e.message));

  await page.goto('http://localhost:3000/test-isolated.html', { waitUntil: 'networkidle', timeout: 30000 });

  // Wait for __ready
  const ready = await page.waitForFunction(() => window.__ready === true, { timeout: 15000 })
    .then(() => true)
    .catch(() => false);

  if (!ready) {
    console.error('Page did not become ready in time');
    const state = await page.evaluate(() => ({ ready: window.__ready, err: window.__err }));
    console.error('State:', state);
  }

  // Log mesh stats
  const stats = await page.evaluate(() => JSON.stringify(window.__stats));
  console.log('=== GATE B-2B MESH STATS ===', stats);

  // Capture each of the 8 required views
  for (const v of VIEWS) {
    const dataUrl = await page.evaluate((viewId) => window.__capture(viewId), v.id);
    if (!dataUrl) {
      console.error(`No data URL for view: ${v.id}`);
      continue;
    }
    const base64 = dataUrl.replace('data:image/png;base64,', '');
    const buf = Buffer.from(base64, 'base64');
    
    // Save to scratch
    const scratchPath = path.join(SCRATCH, v.file);
    fs.writeFileSync(scratchPath, buf);

    // Also save directly into artifacts directory for embedding
    const artifactPath = path.join(ARTIFACTS_DIR, v.file);
    fs.writeFileSync(artifactPath, buf);

    console.log(`Saved [${v.label}] -> ${scratchPath} (${buf.length} bytes)`);
  }

  await browser.close();
  console.log('=== GATE B-2B EIGHT-VIEW CLAY RENDER COMPLETE ===');
})();
