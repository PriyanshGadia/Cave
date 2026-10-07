const fs = require('fs');
const path = require('path');
const http = require('http');
const { chromium } = require('playwright');

const videos = [
  { id: 'v1_curated', file: fs.readdirSync('.').find(f => f.includes('new portfolio curated list')) },
  { id: 'v2_ai', file: fs.readdirSync('.').find(f => f.includes('Comment') && f.includes('AI')) },
  { id: 'v3_how', file: fs.readdirSync('.').find(f => f.includes('Comment') && f.includes('HOW')) },
  { id: 'v4_website', file: fs.readdirSync('.').find(f => f.includes('Comment') && f.includes('WEBSITE')) },
  { id: 'v5_opus3d', file: fs.readdirSync('.').find(f => f.includes('Somebody built this entire 3D motion')) }
];

console.log('Videos found:', videos);

const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent(req.url.replace(/^\//, ''));
  const filePath = path.resolve(urlPath);
  if (fs.existsSync(filePath)) {
    const ext = path.extname(filePath).toLowerCase();
    const mime = ext === '.mp4' ? 'video/mp4' : ext === '.html' ? 'text/html' : 'application/octet-stream';
    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = (end - start) + 1;
      const file = fs.createReadStream(filePath, { start, end });
      const head = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': mime,
      };
      res.writeHead(206, head);
      file.pipe(res);
    } else {
      const head = {
        'Content-Length': fileSize,
        'Content-Type': mime,
        'Accept-Ranges': 'bytes'
      };
      res.writeHead(200, head);
      fs.createReadStream(filePath).pipe(res);
    }
  } else {
    res.writeHead(404);
    res.end();
  }
});

server.listen(4455, async () => {
  console.log('Server listening on http://localhost:4455');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 720, height: 1280 } });

  for (const v of videos) {
    if (!v.file) {
      console.log('Video file not found for', v.id);
      continue;
    }
    const outDir = path.join('public', 'video-analysis', v.id);
    fs.mkdirSync(outDir, { recursive: true });

    console.log(`\nProcessing ${v.id} (${v.file})...`);
    const encodedFile = encodeURIComponent(v.file);
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <body style="margin:0; background:#000; display:flex; justify-content:center; align-items:center; height:100vh;">
        <video id="v" src="http://localhost:4455/${encodedFile}" muted playsinline style="max-width:100%; max-height:100vh;"></video>
      </body>
      </html>
    `);

    // Wait for video metadata
    const duration = await page.evaluate(async () => {
      const vid = document.getElementById('v');
      return new Promise((resolve, reject) => {
        vid.onloadedmetadata = () => resolve(vid.duration);
        vid.onerror = (e) => reject(new Error('Video load error'));
        setTimeout(() => resolve(vid.duration || 10), 10000);
      });
    });

    console.log(`Video ${v.id} duration: ${duration}s`);
    // Sample 6-10 frames across the video
    const step = Math.max(1.5, duration / 8);
    let sampleTime = 0.5;
    let frameIdx = 0;
    while (sampleTime < duration) {
      await page.evaluate(async (t) => {
        const vid = document.getElementById('v');
        vid.currentTime = t;
        return new Promise(r => {
          vid.onseeked = () => setTimeout(r, 150);
          setTimeout(r, 800);
        });
      }, sampleTime);

      const framePath = path.join(outDir, `frame_${String(frameIdx).padStart(2, '0')}_${sampleTime.toFixed(1)}s.jpg`);
      await page.screenshot({ path: framePath, quality: 85, type: 'jpeg' });
      console.log(`Captured ${framePath}`);

      sampleTime += step;
      frameIdx++;
    }
  }

  await browser.close();
  server.close();
  console.log('\nAll video frames extracted successfully!');
  process.exit(0);
});
