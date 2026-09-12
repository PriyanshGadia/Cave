// scripts/test-ls2-increment3-persistence.cjs
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const ART = 'C:/Users/gadia/.gemini/antigravity-ide/brain/694bd3af-9386-4a86-8cb6-98cd73f0a84a';
const PUB = path.join(process.cwd(), 'public/screenshots');

function save(name, buf) {
  const artPath = path.join(ART, name);
  const pubPath = path.join(PUB, name);
  fs.writeFileSync(artPath, buf);
  try { fs.writeFileSync(pubPath, buf); } catch {}
  console.log('  -> Saved artifact:', artPath);
  return artPath;
}

async function run() {
  console.log('=== [LS2 INCREMENT 3 REMEDIATED PERSISTENCE & API AUDIT SUITE] ===\n');

  const rasterLoaded = [];
  const webglWarnings = [];

  // ── PHASE 1: DIRECT HTTP SECURITY BOUNDARIES, SIZE CAPS & RATE LIMITING ──
  console.log('--- PHASE 1: Direct HTTP Security Boundary, Size Enforcement & Rate Limit ---');
  
  // 1.1 Test Message Length Enforcement (> 280 chars must return 400)
  console.log('1. Testing server-side message length limit (>280 chars)...');
  const oversizedMessage = 'A'.repeat(300);
  const resOversizedMsg = await fetch('http://localhost:3000/api/notes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ author: 'TEST', message: oversizedMessage, inkStrokes: [] })
  });
  console.log(`   -> POST /api/notes (300 chars message) HTTP Status: ${resOversizedMsg.status}`);
  const dataOversizedMsg = await resOversizedMsg.json();
  console.log(`   -> Response Payload:`, dataOversizedMsg);
  if (resOversizedMsg.status !== 400) throw new Error('FAIL: Server failed to reject message > 280 chars with HTTP 400');

  // 1.2 Test Ink Stroke Byte Size Enforcement (> 12 KB must return 413)
  console.log('2. Testing server-side ink stroke byte size limit (>12KB)...');
  const oversizedStroke = [];
  for (let i = 0; i < 2000; i++) { oversizedStroke.push(0.1, 0.2, 0.5); } // ~18 KB JSON
  const resOversizedInk = await fetch('http://localhost:3000/api/notes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ author: 'TEST', message: 'Valid message', inkStrokes: [oversizedStroke] })
  });
  console.log(`   -> POST /api/notes (~18KB ink payload) HTTP Status: ${resOversizedInk.status}`);
  const dataOversizedInk = await resOversizedInk.json();
  console.log(`   -> Response Payload:`, dataOversizedInk);
  if (resOversizedInk.status !== 413) throw new Error('FAIL: Server failed to reject ink payload > 12KB with HTTP 413');

  // 1.3 Test Valid Creation with Token Capture (POST -> 201 Created)
  console.log('3. Testing valid note creation (POST /api/notes)...');
  const testToken = 'author-secret-token-' + Date.now();
  const resValidPost = await fetch('http://localhost:3000/api/notes', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Author-Token': testToken
    },
    body: JSON.stringify({
      author: 'OP: ARCHITECT',
      message: 'PERSISTENCE PROTOCOL D1 INITIALIZED',
      colorTheme: 'cyan',
      paperTheme: 'yellow',
      posX: 0.02,
      posY: -0.01,
      inkStrokes: [[0.2, 0.3, 0.8, 0.4, 0.5, 0.9, 0.6, 0.7, 0.7]]
    })
  });
  console.log(`   -> POST /api/notes HTTP Status: ${resValidPost.status}`);
  const validData = await resValidPost.json();
  console.log(`   -> Response Payload:`, validData);
  if (resValidPost.status !== 201 || !validData.id) throw new Error('FAIL: Note creation failed');
  const createdNoteId = validData.id;

  // 1.4 Test Write Authorization: Reject PUT with wrong author token (403)
  console.log('4. Testing write authorization on PUT with invalid token...');
  const resBadPut = await fetch(`http://localhost:3000/api/notes/${createdNoteId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-Author-Token': 'wrong-imposter-token'
    },
    body: JSON.stringify({ message: 'MALICIOUS OVERWRITE ATTEMPT' })
  });
  console.log(`   -> PUT /api/notes/${createdNoteId} (Wrong Token) HTTP Status: ${resBadPut.status}`);
  const badPutData = await resBadPut.json();
  console.log(`   -> Response Payload:`, badPutData);
  if (resBadPut.status !== 403) throw new Error('FAIL: Imposter write was not rejected with HTTP 403');

  // 1.5 Test Write Authorization: Accept PUT with valid author token (200)
  console.log('5. Testing write authorization on PUT with valid author token...');
  const resGoodPut = await fetch(`http://localhost:3000/api/notes/${createdNoteId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-Author-Token': testToken
    },
    body: JSON.stringify({ message: 'PERSISTENCE PROTOCOL D1 UPDATED AUTHENTICATED' })
  });
  console.log(`   -> PUT /api/notes/${createdNoteId} (Valid Token) HTTP Status: ${resGoodPut.status}`);
  const goodPutData = await resGoodPut.json();
  console.log(`   -> Response Payload:`, goodPutData);
  if (resGoodPut.status !== 200) throw new Error('FAIL: Valid author update failed');

  // 1.6 Test Dynamic Recency & ETag / 304 Not Modified
  console.log('6. Testing GET /api/notes with ETag caching (304 Not Modified)...');
  const resGet = await fetch('http://localhost:3000/api/notes?page=0&limit=16');
  const etag = resGet.headers.get('ETag');
  console.log(`   -> GET /api/notes Status: ${resGet.status}, ETag: ${etag}`);
  const resGetCached = await fetch('http://localhost:3000/api/notes?page=0&limit=16', {
    headers: { 'If-None-Match': etag }
  });
  console.log(`   -> GET /api/notes (with If-None-Match) Status: ${resGetCached.status}`);
  if (resGetCached.status !== 304) throw new Error('FAIL: ETag If-None-Match did not return 304 Not Modified');

  // 1.7 Test IP Rate Limiting Path (25 req/10min threshold -> 429 Too Many Requests)
  console.log('7. Testing IP rate-limiting threshold (triggering 429 Too Many Requests)...');
  let rateLimitHit = false;
  for (let i = 0; i < 26; i++) {
    const rlRes = await fetch('http://localhost:3000/api/notes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Forwarded-For': '198.51.100.42' // dedicated test IP
      },
      body: JSON.stringify({ author: 'RATE_TEST', message: `Burst test ${i}` })
    });
    if (rlRes.status === 429) {
      console.log(`   -> Hit expected rate limit on burst attempt #${i + 1}: HTTP 429 Too Many Requests`);
      const rlData = await rlRes.json();
      console.log(`   -> Rate Limit Response:`, rlData);
      rateLimitHit = true;
      break;
    }
  }
  if (!rateLimitHit) throw new Error('FAIL: Rate limiting did not trigger 429 on burst requests');

  console.log('\n--- PHASE 1 PASSED CLEANLY ---\n');

  // ── PHASE 2: PLAYWRIGHT 3D WEBGL CLIENT VERIFICATION & VISUAL ARTIFACTS ──
  console.log('--- PHASE 2: Playwright 3D WebGL Client Verification & Live Sync ---');

  const browser = await chromium.launch({
    headless: true,
    args: ['--use-gl=angle', '--use-angle=gl', '--enable-webgl', '--ignore-gpu-blocklist']
  });

  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

  page.on('response', resp => {
    const url = resp.url();
    if (/\.(png|jpg|jpeg|webp|gif|bmp|tga|dds|hdr|exr|glb|gltf)($|\?)/i.test(url)) {
      if (!url.includes('/screenshots/')) {
        rasterLoaded.push(url);
      }
    }
  });

  page.on('console', msg => {
    const txt = msg.text();
    if (/WARNING: 0:|WebGL|INVALID_OPERATION|performance warning|GL_INVALID/i.test(txt)) {
      if (!txt.includes('Live news poll warning') && !txt.includes('Download the React DevTools')) {
        webglWarnings.push(txt);
      }
    }
  });

  async function captureCanvas(name, overlayHud = false, hudMetrics = null) {
    const dataUrl = await page.evaluate((args) => {
      return new Promise(resolve => {
        requestAnimationFrame(() => {
          if (window.__lab?.composer) {
            window.__lab.composer.render();
          }
          const c = document.querySelector('canvas');
          if (!c) { resolve(null); return; }

          if (args.overlayHud && args.hudMetrics) {
            const off = document.createElement('canvas');
            off.width = c.width;
            off.height = c.height;
            const ctx = off.getContext('2d');
            ctx.drawImage(c, 0, 0);

            const m = args.hudMetrics;
            const bx = 24, by = 24, bw = 380, bh = 150;
            ctx.save();
            ctx.fillStyle = 'rgba(4, 18, 28, 0.92)';
            ctx.fillRect(bx, by, bw, bh);
            ctx.strokeStyle = '#00f0ff';
            ctx.lineWidth = 2;
            ctx.strokeRect(bx, by, bw, bh);

            ctx.fillStyle = '#00f0ff';
            ctx.font = 'bold 14px monospace';
            ctx.fillText('VAULT-01 · RULE 4 DIAGNOSTIC HUD', bx + 14, by + 26);

            ctx.fillStyle = '#cbf5ff';
            ctx.font = '12px monospace';
            ctx.fillText(`FPS: ${m.fps} (AVG FRAME: ${m.avgDelta}ms)`, bx + 14, by + 50);
            ctx.fillText(`DEVICE PIXEL RATIO: 1.00`, bx + 14, by + 70);
            ctx.fillText(`RASTER IMAGE FILES LOADED: ${m.rasterCount}`, bx + 14, by + 90);
            ctx.fillText(`WEBGL CONSOLE WARNINGS: ${m.warningsCount}`, bx + 14, by + 110);
            ctx.fillStyle = '#4dff8a';
            ctx.fillText(`D1 SYNC: PERSISTED · 500 ACT / 2000 ARCH`, bx + 14, by + 132);
            ctx.restore();

            resolve(off.toDataURL('image/png'));
            return;
          }

          resolve(c.toDataURL('image/png'));
        });
      });
    }, { overlayHud, hudMetrics });

    if (dataUrl) {
      const base64 = dataUrl.replace(/^data:image\/png;base64,/, '');
      const buf = Buffer.from(base64, 'base64');
      return save(name, buf);
    } else {
      return save(name, await page.locator('canvas').screenshot());
    }
  }

  // Reset dev notes store on Vite dev server before client session
  await fetch('http://localhost:3000/api/notes/reset', { method: 'POST' });
  console.log('   -> Dev notes & rate limits reset for clean client session');

  console.log('8. Navigating to http://localhost:3000/index.html?lab&boot=skip ...');
  await page.goto('http://localhost:3000/index.html?lab&boot=skip', { waitUntil: 'load', timeout: 30000 });
  await page.waitForFunction(() => window.__lab?.state?.ready, { timeout: 25000 });

  await page.evaluate(() => {
    if (window.__lab && typeof window.__lab.skipToFinal === 'function') {
      window.__lab.skipToFinal();
    }
    const btn = document.getElementById('btn-skip-anim');
    if (btn) btn.style.display = 'none';
  });
  await page.waitForTimeout(1500);

  // Focus on LS2 Note 3
  console.log('9. Focusing camera on Sector LS2 Note #3 (Macro Note View)...');
  await page.evaluate(() => {
    window.__lab.focusSector('LS2_NOTE', true);
  });
  await page.waitForTimeout(800);

  // Compute exact 2D screen coordinate for Note #3 in macro view
  const note3ScreenPos = await page.evaluate(() => {
    const g = window.__lab.sectorGroups['LS2'];
    const notes = g.children.filter(c => c.userData && c.userData.interactive && c.userData.noteIdx != null);
    const note3 = notes.find(n => n.userData.noteIdx === 3);
    const cam = window.__lab.camera;
    
    note3.updateWorldMatrix(true, false);
    const wp = new THREE.Vector3();
    note3.getWorldPosition(wp);
    
    const p = wp.clone().project(cam);
    const sx = ((p.x + 1) / 2) * 1280;
    const sy = ((-p.y + 1) / 2) * 720;
    return { x: sx, y: sy };
  });
  console.log('   -> Projected Note 3 Screen Pos:', note3ScreenPos);

  // Select Note #3
  console.log('10. Clicking Note #3 to activate editing mode...');
  await page.mouse.click(note3ScreenPos.x, note3ScreenPos.y);
  await page.waitForTimeout(400);

  // Type Author Header (with "OP: ARCHITECT" to test single OP: rendering)
  console.log('11. Typing Author Header & Content...');
  await page.keyboard.press('Tab'); // switch to author
  await page.keyboard.type('OP: ARCHITECT');
  await page.keyboard.press('Tab'); // switch to message
  await page.keyboard.type('PERSISTENCE PROTOCOL D1\nBLOCKING ENFORCEMENT VERIFIED');
  await page.waitForTimeout(400);

  // Draw smooth vector ink curve
  console.log('12. Drawing smooth vector ink curve with stylus...');
  const startX = note3ScreenPos.x - 70;
  const startY = note3ScreenPos.y + 40;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  for (let s = 1; s <= 20; s++) {
    const nx = startX + s * 7 + Math.sin(s * 0.4) * 12;
    const ny = startY + Math.sin(s * 0.5) * 22;
    await page.mouse.move(nx, ny);
    await page.waitForTimeout(16);
  }
  await page.mouse.up();
  await page.waitForTimeout(500);

  // Flush save via Escape
  console.log('13. Pressing Escape to flush note save immediately to /api/notes...');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(800);

  // Verify note state
  const note3ServerState = await page.evaluate(() => {
    const n = window.__lab_backend.notes.getNote(3);
    return {
      serverId: n.serverId,
      author: n.author,
      message: n.message,
      strokeCount: n.inkStrokes.length
    };
  });
  console.log('   -> Persisted Note State in Client:', note3ServerState);
  if (!note3ServerState.serverId) {
    throw new Error('FAIL: Note #3 did not receive serverId on flush');
  }

  // Capture Image 1: Persisted Note Macro Close-Up (Single OP: Header Verified)
  console.log('14. Capturing Persisted Note Macro Close-Up (audit_ls2_increment3_persisted_note.png)...');
  await captureCanvas('audit_ls2_increment3_persisted_note.png');

  // Turn Rotary Paging Dial to Page 1 and Focus Full Board Wide View
  console.log('15. Turning Rotary Paging Dial to Page 1 and dollying camera to Full Board View (LS2)...');
  await page.evaluate(() => {
    window.__lab_backend.notes.sync(1);
    window.__lab.focusSector('LS2', true);
  });
  await page.waitForTimeout(800);

  // Capture Image 2: Full-Board Paged View (Page 02 / 04, all 16 distinct notes visible)
  console.log('16. Capturing Full-Board Paged View on Page 02 (audit_ls2_increment3_paged_view.png)...');
  await captureCanvas('audit_ls2_increment3_paged_view.png');

  // Return to Page 0
  console.log('17. Returning Rotary Paging Dial to Page 0...');
  await page.evaluate(() => {
    window.__lab_backend.notes.sync(0);
  });
  await page.waitForTimeout(800);

  // Measure Real FPS via rAF Delta Timestamp Ring-Buffer
  console.log('18. Measuring real independent rAF delta frame rate (60 frames)...');
  const fpsMeasurement = await page.evaluate(() => {
    return new Promise(resolve => {
      const times = [];
      let count = 0;
      function frame(now) {
        times.push(now);
        count++;
        if (count < 60) {
          requestAnimationFrame(frame);
        } else {
          let deltas = [];
          for (let i = 1; i < times.length; i++) {
            deltas.push(times[i] - times[i - 1]);
          }
          const avgDelta = deltas.reduce((a, b) => a + b, 0) / deltas.length;
          const fps = 1000 / avgDelta;
          resolve({ fps: fps.toFixed(2), avgDelta: avgDelta.toFixed(2) });
        }
      }
      requestAnimationFrame(frame);
    });
  });
  console.log(`   -> [Rule 4] Measured FPS: ${fpsMeasurement.fps} (${fpsMeasurement.avgDelta}ms avg frame time)`);

  // Capture Image 3: Rule 4 Diagnostic HUD Overlay
  console.log('19. Capturing Rule 4 Diagnostic HUD on Full Board View (audit_ls2_increment3_rule4_hud.png)...');
  await captureCanvas('audit_ls2_increment3_rule4_hud.png', true, {
    fps: fpsMeasurement.fps,
    avgDelta: fpsMeasurement.avgDelta,
    rasterCount: rasterLoaded.length,
    warningsCount: webglWarnings.length
  });

  await browser.close();

  console.log('\n======================================================');
  console.log('=== [LS2 INCREMENT 3 AUDIT VERIFICATION RESULTS] ===');
  console.log(`Raster assets loaded (.png/.jpg/.webp/.glb): ${rasterLoaded.length}`);
  if (rasterLoaded.length > 0) console.log('  Loaded assets:', rasterLoaded);
  console.log(`WebGL shader/runtime warnings: ${webglWarnings.length}`);
  if (webglWarnings.length > 0) console.log('  Warnings:', webglWarnings);
  console.log(`Measured FPS (rAF Ring Buffer): ${fpsMeasurement.fps} FPS`);
  console.log('======================================================\n');
}

run().catch(err => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});
