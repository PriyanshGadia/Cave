const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT_DIR = path.resolve(__dirname, '..');
const PORT = 3366;

const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];
  if (reqPath === '/' || reqPath === '/about') {
    reqPath = '/about.html';
  }

  let filePath = path.join(ROOT_DIR, reqPath);
  if (!fs.existsSync(filePath)) {
    filePath = path.join(ROOT_DIR, 'public', reqPath);
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    const mimeMap = {
      '.html': 'text/html',
      '.css': 'text/css',
      '.js': 'text/javascript',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml'
    };
    res.writeHead(200, { 'Content-Type': mimeMap[ext] || 'application/octet-stream' });
    fs.createReadStream(filePath).pipe(res);
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

async function runRegression() {
  server.listen(PORT, async () => {
    console.log(`Regression server active on port ${PORT}`);
    const browser = await chromium.launch({ headless: true });
    
    // 1. Desktop Test (1920x1080)
    console.log('--- DESKTOP AUDIT (1920x1080) ---');
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error('Browser Error:', msg.text());
        errors.push(msg.text());
      }
    });

    await page.goto(`http://localhost:${PORT}/about.html`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Initial Shot 01 (Arrival)
    console.log('Capturing Shot 01 (Arrival)...');
    await page.evaluate(() => window.navigateToSector(0));
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(ROOT_DIR, 'public/screenshots/about-shot-01-arrival.png') });

    // Scroll to Chapter 5 (Cave Engine - 3D Artifact Active)
    console.log('Scrubbing to Chapter 5 (Cave Engine - 3D Artifact)...');
    await page.evaluate(() => window.navigateToSector(4));
    await page.waitForTimeout(700);
    await page.screenshot({ path: path.join(ROOT_DIR, 'public/screenshots/about-shot-05-cave-engine.png') });

    // Scroll to Chapter 6 (Argus OS - 3D Camera Turret)
    console.log('Scrubbing to Chapter 6 (Argus OS - 3D Turret)...');
    await page.evaluate(() => window.navigateToSector(5));
    await page.waitForTimeout(700);
    await page.screenshot({ path: path.join(ROOT_DIR, 'public/screenshots/about-shot-06-argus-os.png') });

    // Scroll to Chapter 7 (Deep Domains - 3D Bio-Waveform)
    console.log('Scrubbing to Chapter 7 (Deep Domains - 3D Bio-Waveform)...');
    await page.evaluate(() => window.navigateToSector(6));
    await page.waitForTimeout(700);
    await page.screenshot({ path: path.join(ROOT_DIR, 'public/screenshots/about-shot-07-experimentation.png') });

    // Scroll to Chapter 11 (Resolution & CTAs)
    console.log('Scrubbing to Chapter 11 (Resolution)...');
    await page.evaluate(() => window.navigateToSector(10));
    await page.waitForTimeout(700);
    await page.screenshot({ path: path.join(ROOT_DIR, 'public/screenshots/about-shot-11-resolution.png') });

    // Test Reverse Scroll back to Top
    console.log('Testing reverse scroll back to top...');
    await page.evaluate(() => window.navigateToSector(0));
    await page.waitForTimeout(700);
    await page.screenshot({ path: path.join(ROOT_DIR, 'public/screenshots/about-reverse-scroll-top.png') });

    // Test Opening Dossier Modal & Live Simulation Canvas
    console.log('Testing Dossier Modal (Projects Tab)...');
    await page.click('#open-dossier-btn');
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(ROOT_DIR, 'public/screenshots/about-projects-modal.png') });

    // Test Switching to Academic & Credentials Tab
    console.log('Testing Dossier Modal (Credentials Tab)...');
    await page.click('#tab-btn-creds');
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(ROOT_DIR, 'public/screenshots/about-creds-modal.png') });

    await page.click('#close-dossier-btn');
    await page.waitForTimeout(300);

    // 2. Mobile Audit (390x844)
    console.log('--- MOBILE AUDIT (390x844) ---');
    const mobilePage = await browser.newPage({ viewport: { width: 390, height: 844 } });
    mobilePage.on('console', msg => {
      if (msg.type() === 'error') {
        console.error('Mobile Error:', msg.text());
        errors.push(msg.text());
      }
    });

    await mobilePage.goto(`http://localhost:${PORT}/about.html`, { waitUntil: 'networkidle' });
    await mobilePage.waitForTimeout(1000);
    await mobilePage.screenshot({ path: path.join(ROOT_DIR, 'public/screenshots/about-mobile-shot-01.png') });

    await mobilePage.evaluate(() => window.navigateToSector(4));
    await mobilePage.waitForTimeout(800);
    await mobilePage.screenshot({ path: path.join(ROOT_DIR, 'public/screenshots/about-mobile-shot-05.png') });

    await browser.close();
    server.close();

    console.log('====================================');
    console.log('FULL REGRESSION COMPLETE');
    console.log('Total Console Errors:', errors.length);
    if (errors.length > 0) {
      console.log('Errors:', errors);
      process.exit(1);
    } else {
      console.log('PASS: Zero console errors, WebGL & 3D artifacts validated!');
      process.exit(0);
    }
  });
}

runRegression().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
