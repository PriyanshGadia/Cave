// scripts/test-videotexture-spike.cjs
// Minimal standalone feasibility spike requested by the expert architect:
// Tests candidate HLS/MP4 live stream URLs in a real WebGL context with THREE.VideoTexture,
// determining whether the stream can be sampled into a WebGL texture or if it throws a
// CORS / SecurityError (tainted canvas), along with checking Access-Control-Allow-Origin headers.

const { chromium } = require('playwright');

const CANDIDATES = [
  {
    name: 'ABC News Live (Akamai)',
    url: 'https://abcnews-streams.akamaized.net/hls/live/2023560/abcnewshudson1/master.m3u8'
  },
  {
    name: 'CBS News 24/7 (Google DAI)',
    url: 'https://dai.google.com/linear/hls/event/Sid4xiTQTkCT1SLu6rjUSQ/master.m3u8'
  },
  {
    name: 'France 24 English (Official HLS)',
    url: 'https://stream.france24.com/hls/live/2037234/F24_EN_HI_HLS/master.m3u8'
  },
  {
    name: 'Open Test HLS Stream (Tears of Steel)',
    url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8'
  }
];

async function runSpike() {
  console.log('=== [FEASIBILITY SPIKE: WebGL VideoTexture Sampling & CORS Taint Test] ===\n');

  const browser = await chromium.launch({
    headless: true,
    args: ['--use-gl=angle', '--use-angle=gl', '--enable-webgl', '--ignore-gpu-blocklist']
  });

  const page = await browser.newPage();

  // Track network response headers for candidate streams
  const headersMap = {};
  page.on('response', resp => {
    const url = resp.url();
    for (const c of CANDIDATES) {
      if (url.includes(c.url) || url.includes('.m3u8') || url.includes('.ts')) {
        headersMap[url] = {
          status: resp.status(),
          cors: resp.headers()['access-control-allow-origin'] || 'NONE'
        };
      }
    }
  });

  // Load an HTML page that has Three.js and Hls.js
  await page.goto('http://localhost:3000/index.html?lab&boot=skip', { waitUntil: 'load', timeout: 30000 });
  await page.waitForFunction(() => window.THREE != null, { timeout: 15000 });

  console.log('Page loaded with Three.js ready. Testing candidates sequentially:\n');

  for (const candidate of CANDIDATES) {
    console.log(`--- Testing: ${candidate.name} ---`);
    console.log(`    URL: ${candidate.url}`);

    const result = await page.evaluate(async (stream) => {
      return new Promise((resolve) => {
        const video = document.createElement('video');
        video.crossOrigin = 'anonymous';
        video.autoplay = true;
        video.muted = true;
        video.playsInline = true;

        // Hidden from DOM
        video.style.position = 'fixed';
        video.style.top = '-9999px';
        video.style.width = '320px';
        video.style.height = '180px';
        document.body.appendChild(video);

        let cleanup = () => {
          try { video.pause(); video.remove(); } catch {}
        };

        let texture = null;
        let renderer = null;

        // Try WebGL test
        try {
          const canvas = document.createElement('canvas');
          canvas.width = 64;
          canvas.height = 64;
          renderer = new window.THREE.WebGLRenderer({ canvas });
          const scene = new window.THREE.Scene();
          const camera = new window.THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
          const geom = new window.THREE.PlaneGeometry(2, 2);

          texture = new window.THREE.VideoTexture(video);
          const mat = new window.THREE.MeshBasicMaterial({ map: texture });
          const mesh = new window.THREE.Mesh(geom, mat);
          scene.add(mesh);

          let hls = null;
          let timeoutId = setTimeout(() => {
            if (hls) { hls.destroy(); }
            cleanup();
            resolve({
              success: false,
              error: 'Timeout waiting for video metadata / frame playback (6s)',
              tainted: false
            });
          }, 6000);

          function testTextureSampling() {
            try {
              // Attempt to render - this triggers gl.texImage2D on the video element
              renderer.render(scene, camera);
              clearTimeout(timeoutId);
              if (hls) hls.destroy();
              cleanup();
              resolve({
                success: true,
                error: null,
                tainted: false,
                videoWidth: video.videoWidth,
                videoHeight: video.videoHeight
              });
            } catch (err) {
              clearTimeout(timeoutId);
              if (hls) hls.destroy();
              cleanup();
              const isTaint = /taint|security|insecure|cross-origin/i.test(err.message);
              resolve({
                success: false,
                error: err.name + ': ' + err.message,
                tainted: isTaint
              });
            }
          }

          if (window.Hls && window.Hls.isSupported() && stream.url.includes('.m3u8')) {
            hls = new window.Hls({ enableWorker: false, lowLatencyMode: true });
            hls.loadSource(stream.url);
            hls.attachMedia(video);
            hls.on(window.Hls.Events.MANIFEST_PARSED, () => {
              video.play().catch(() => {});
            });
            hls.on(window.Hls.Events.ERROR, (event, data) => {
              if (data.fatal) {
                clearTimeout(timeoutId);
                hls.destroy();
                cleanup();
                resolve({
                  success: false,
                  error: 'Hls fatal error: ' + data.details,
                  tainted: false
                });
              }
            });
            video.addEventListener('timeupdate', () => {
              if (video.currentTime > 0.1) {
                testTextureSampling();
              }
            }, { once: true });
          } else {
            video.src = stream.url;
            video.addEventListener('loadeddata', () => {
              testTextureSampling();
            });
            video.addEventListener('error', () => {
              clearTimeout(timeoutId);
              cleanup();
              resolve({
                success: false,
                error: 'HTMLVideoElement error code ' + (video.error ? video.error.code : 'unknown'),
                tainted: false
              });
            });
          }
        } catch (setupErr) {
          cleanup();
          resolve({
            success: false,
            error: 'Setup exception: ' + setupErr.message,
            tainted: false
          });
        }
      });
    }, candidate);

    console.log(`    Result: ${result.success ? 'SUCCESS (Sampled into WebGL)' : 'FAILED'}`);
    if (result.success) {
      console.log(`    Dimensions: ${result.videoWidth}x${result.videoHeight}`);
      console.log(`    CORS Taint / SecurityError: NONE`);
    } else {
      console.log(`    Error: ${result.error}`);
      console.log(`    CORS Taint / SecurityError: ${result.tainted ? 'YES (Canvas Tainted)' : 'NO (Network/Manifest/Timeout failure)'}`);
    }

    // Check captured CORS headers for this candidate
    const matchedUrls = Object.keys(headersMap).filter(u => u.includes(candidate.url.split('/')[2]));
    if (matchedUrls.length > 0) {
      const sample = headersMap[matchedUrls[0]];
      console.log(`    HTTP Status: ${sample.status}`);
      console.log(`    Access-Control-Allow-Origin: ${sample.cors}`);
    } else {
      console.log(`    HTTP Headers: No direct match captured`);
    }
    console.log('');
  }

  await browser.close();
  console.log('=== [SPIKE COMPLETED] ===');
}

runSpike().catch(err => {
  console.error('Spike runner failed:', err);
  process.exit(1);
});
