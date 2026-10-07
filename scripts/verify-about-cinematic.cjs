const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function testAboutPage() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  page.on('pageerror', err => {
    consoleErrors.push(err.message);
  });

  const brainDir = 'C:\\Users\\gadia\\.gemini\\antigravity-ide\\brain\\5e3c0a45-c3f3-49e8-8c30-eccd6f3eac75';

  console.log('Navigating to http://localhost:3000/about.html ...');
  const response = await page.goto('http://localhost:3000/about.html', { waitUntil: 'networkidle' });
  console.log('Page response status:', response.status());

  if (response.status() !== 200) {
    throw new Error(`Failed to load about.html, status: ${response.status()}`);
  }

  // Ensure output directory exists
  const outDir = path.join(__dirname, '..', 'screenshots');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const chapters = [
    { id: 'cave', name: 'accum_01_cave.png' },
    { id: 'workbench', name: 'accum_02_workbench.png' },
    { id: 'core', name: 'accum_03_core.png' },
    { id: 'schematic', name: 'accum_04_blueprint.png' },
    { id: 'sector-ls1', name: 'accum_05_sector_ls1.png' },
    { id: 'sector-rs1', name: 'accum_06_sector_rs1.png' },
    { id: 'sectors-mid', name: 'accum_07_sectors_mid.png' },
    { id: 'sector-rs3', name: 'accum_08_sector_rs3.png' },
    { id: 'integration', name: 'accum_09_integration.png' },
    { id: 'completed-vault', name: 'accum_10_completed_vault.png' }
  ];

  for (let i = 0; i < chapters.length; i++) {
    const ch = chapters[i];
    await page.evaluate(({ targetId }) => {
      const el = document.getElementById(targetId);
      if (el) {
        if (window.lenis) {
          window.lenis.scrollTo(el, { offset: -70, immediate: true });
        } else {
          el.scrollIntoView();
        }
      }
    }, { targetId: ch.id });

    await page.waitForTimeout(600);
    const savePath = path.join(outDir, ch.name);
    await page.screenshot({ path: savePath });
    console.log(`Saved screenshot ${i + 1}/10: ${ch.name}`);

    try {
      fs.copyFileSync(savePath, path.join(brainDir, ch.name));
    } catch {}
  }

  console.log('Console errors count:', consoleErrors.length);
  if (consoleErrors.length > 0) {
    console.error('Console errors found:', consoleErrors);
  } else {
    console.log('SUCCESS: Zero console errors across all 10 physical accumulation chapters!');
  }

  await browser.close();
}

testAboutPage().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
