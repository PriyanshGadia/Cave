const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT_DIR = path.resolve(__dirname, '..');
const PORT = 3344;

// Simple static server that resolves root and public/ assets
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

async function main() {
  server.listen(PORT, async () => {
    console.log(`Server listening on http://localhost:${PORT}`);
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    console.log('Navigating to http://localhost:' + PORT + '/about.html');
    await page.goto(`http://localhost:${PORT}/about.html`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // 1. Capture Shot 01: Arrival (top of page)
    console.log('Capturing Shot 01: Arrival...');
    await page.screenshot({ path: path.join(ROOT_DIR, 'public/screenshots/about-shot-01-arrival.png') });

    // 2. Scroll to Shot 02: Identity
    console.log('Scrolling to Shot 02: Identity...');
    const shot02 = await page.$('#shot-02');
    if (shot02) {
      await shot02.scrollIntoViewIfNeeded();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(ROOT_DIR, 'public/screenshots/about-shot-02-identity.png') });
    }

    // 3. Scroll to Shot 03: Mindset
    console.log('Scrolling to Shot 03: Mindset...');
    const shot03 = await page.$('#shot-03');
    if (shot03) {
      await shot03.scrollIntoViewIfNeeded();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(ROOT_DIR, 'public/screenshots/about-shot-03-mindset.png') });
    }

    // 4. Test Projects Drawer
    console.log('Opening Projects Drawer...');
    await page.click('#openProjectsBtn');
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(ROOT_DIR, 'public/screenshots/about-projects-modal.png') });

    await browser.close();
    server.close();

    console.log('Finished capturing all 3 initial scenes.');
    console.log('Browser errors:', errors.length);
  });
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
