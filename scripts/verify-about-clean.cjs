const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const consoleLogs = [];
  page.on('console', msg => consoleLogs.push(`[${msg.type()}] ${msg.text()}`));
  page.on('pageerror', err => consoleLogs.push(`[PAGE ERROR] ${err.message}`));

  console.log('Navigating to http://localhost:5173/about.html ...');
  await page.goto('http://localhost:5173/about.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);

  const outDir = 'C:\\Users\\gadia\\.gemini\\antigravity-ide\\brain\\5e3c0a45-c3f3-49e8-8c30-eccd6f3eac75\\.tempmediaStorage';

  // 1. Hero
  const heroPath = path.join(outDir, 'about_hero_clean.png');
  await page.screenshot({ path: heroPath, fullPage: false });
  console.log('Hero screenshot saved to:', heroPath);

  // 2. Duality
  await page.evaluate(() => document.getElementById('duality').scrollIntoView());
  await page.waitForTimeout(800);
  const dualityPath = path.join(outDir, 'about_duality_clean.png');
  await page.screenshot({ path: dualityPath, fullPage: false });
  console.log('Duality screenshot saved to:', dualityPath);

  // 3. Work
  await page.evaluate(() => document.getElementById('work').scrollIntoView());
  await page.waitForTimeout(800);
  const workPath = path.join(outDir, 'about_work_clean.png');
  await page.screenshot({ path: workPath, fullPage: false });
  console.log('Work screenshot saved to:', workPath);

  // 4. Philosophy
  await page.evaluate(() => document.getElementById('philosophy').scrollIntoView());
  await page.waitForTimeout(800);
  const philPath = path.join(outDir, 'about_philosophy_clean.png');
  await page.screenshot({ path: philPath, fullPage: false });
  console.log('Philosophy screenshot saved to:', philPath);

  // 5. Contact
  await page.evaluate(() => document.getElementById('contact').scrollIntoView());
  await page.waitForTimeout(800);
  const contactPath = path.join(outDir, 'about_contact_clean.png');
  await page.screenshot({ path: contactPath, fullPage: false });
  console.log('Contact screenshot saved to:', contactPath);

  console.log('\n--- Console Logs ---');
  consoleLogs.forEach(l => console.log(l));
  console.log('Total console entries:', consoleLogs.length);

  await browser.close();
})();
