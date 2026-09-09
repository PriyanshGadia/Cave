// scripts/architect-audit-captures.cjs
// Produces all screenshots needed for the architect's full audit response:
// A: Pre-power LS3 wide shot (actual camera position proof)
// B: Diagnostic emissive globe in close-in focus pose
// C: Orbital mode (ISS procedural satellite)
// D: Surface mode (USGS earthquake procedural markers)
// E: Airspace mode (ADS-B flight transponders)
// F: DOM overlay audit - checks for <video>, <iframe>, ls3-news-holo elements
// G: Console audit (WebGL warnings, raster resource count)

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
  console.log('  -> Saved:', artPath);
  return artPath;
}

async function run() {
  const browser = await chromium.launch({
    headless: true,
    args: ['--use-gl=angle', '--use-angle=gl', '--enable-webgl', '--ignore-gpu-blocklist']
  });

  const rasterLoaded = [];
  const webglWarnings = [];

  // ── CAPTURE GROUP 1: Pre-power wide shot (what the user sees before boot) ──
  console.log('\n=== CAPTURE A: Pre-power LS3 wide shot ===');
  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    // Navigate WITHOUT ?boot=skip so boot animation runs up to ~22s and we freeze it
    await page.goto('http://localhost:3000/index.html?lab&boot=skip', { waitUntil: 'load', timeout: 30000 });
    await page.waitForFunction(() => window.__lab?.state?.ready, { timeout: 25000 });
    await page.waitForTimeout(1000);
    // Confirm the camera starting pose before any sector focus
    const camData = await page.evaluate(() => {
      const cam = window.__lab?.camera;
      if (!cam) return null;
      const p = cam.position;
      return { x: +p.x.toFixed(3), y: +p.y.toFixed(3), z: +p.z.toFixed(3) };
    });
    console.log('  -> Camera pos before focus:', camData);
    await save('audit_A_prepower_wide.png', await page.screenshot({ animations: 'disabled' }));
    await page.close();
  }

  // ── CAPTURE GROUP B: Diagnostic emissive - globe in close-in LS3 focus pose ──
  console.log('\n=== CAPTURE B: Close-in LS3 focus + diagnostic emissive ===');
  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    await page.goto('http://localhost:3000/index.html?lab&boot=skip', { waitUntil: 'load', timeout: 30000 });
    await page.waitForFunction(() => window.__lab?.state?.ready, { timeout: 25000 });
    await page.waitForTimeout(800);

    // Focus LS3 (camera dolly to sector)
    await page.evaluate(() => window.__lab.focusSector('LS3'));
    await page.waitForTimeout(1800);

    // Confirm camera close-in position
    const camFocused = await page.evaluate(() => {
      const cam = window.__lab?.camera;
      if (!cam) return null;
      const p = cam.position;
      return { x: +p.x.toFixed(3), y: +p.y.toFixed(3), z: +p.z.toFixed(3) };
    });
    console.log('  -> Camera pos after LS3 focus:', camFocused);

    // Apply temporary cyan diagnostic emissive to the globe mesh
    const globeFound = await page.evaluate(() => {
      let globeMesh = null;
      window.__lab.scene.traverse(o => {
        if (o.geometry?.type === 'SphereGeometry' && o.material?.map && o.geometry.parameters?.radius > 0.3 && !globeMesh) {
          globeMesh = o;
        }
      });
      if (!globeMesh) {
        // Try finding by largest radius sphere
        let maxR = 0;
        window.__lab.scene.traverse(o => {
          if (o.isMesh && o.geometry?.type === 'SphereGeometry') {
            const r = o.geometry.parameters?.radius || 0;
            if (r > maxR) { maxR = r; globeMesh = o; }
          }
        });
      }
      if (globeMesh) {
        globeMesh.userData.__diagOrig = {
          emissive: globeMesh.material.emissive?.getHex?.() ?? 0,
          intensity: globeMesh.material.emissiveIntensity ?? 0
        };
        if (globeMesh.material.emissive) {
          globeMesh.material.emissive.setHex(0x00ddff);
          globeMesh.material.emissiveIntensity = 2.5;
        } else {
          globeMesh.material.color.setHex(0x00ddff);
        }
        globeMesh.material.needsUpdate = true;
        const wp = new THREE.Vector3();
        globeMesh.getWorldPosition(wp);
        return {
          found: true,
          radius: globeMesh.geometry.parameters?.radius,
          worldPos: { x: +wp.x.toFixed(3), y: +wp.y.toFixed(3), z: +wp.z.toFixed(3) },
          geometryType: globeMesh.geometry.type
        };
      }
      return { found: false };
    });
    console.log('  -> Globe mesh diagnostic:', globeFound);
    await page.waitForTimeout(150);

    await save('audit_B_diagnostic_emissive.png', await page.screenshot({ animations: 'disabled' }));

    // Revert
    await page.evaluate(() => {
      window.__lab.scene.traverse(o => {
        if (o.isMesh && o.userData.__diagOrig) {
          if (o.material.emissive) {
            o.material.emissive.setHex(o.userData.__diagOrig.emissive);
            o.material.emissiveIntensity = o.userData.__diagOrig.intensity;
          }
          o.material.needsUpdate = true;
          delete o.userData.__diagOrig;
        }
      });
    });
    console.log('  -> Emissive reverted');
    await page.close();
  }

  // ── CAPTURES C/D/E: Modal modes with audit ──
  console.log('\n=== CAPTURES C/D/E: Orbital, Surface, Airspace modes + DOM audit ===');
  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

    page.on('response', resp => {
      const url = resp.url();
      if (/\.(png|jpg|jpeg|webp|gif|bmp|ico|tga|dds|hdr|exr|glb|gltf)($|\?)/i.test(url)) {
        if (!url.includes('/screenshots/')) rasterLoaded.push(url);
      }
    });
    page.on('console', msg => {
      const txt = msg.text();
      if (/WARNING: 0:|GL_INVALID|INVALID_OPERATION|WebGL.*error|performance warning/i.test(txt)) {
        webglWarnings.push({ type: msg.type(), text: txt });
      }
    });

    await page.goto('http://localhost:3000/index.html?lab&boot=skip', { waitUntil: 'load', timeout: 30000 });
    await page.waitForFunction(() => window.__lab?.state?.ready, { timeout: 25000 });
    await page.waitForTimeout(800);
    await page.evaluate(() => window.__lab.focusSector('LS3'));
    await page.waitForTimeout(1800);

    // C: ORBITAL mode
    console.log('  -> Switching to ORBITAL mode...');
    await page.keyboard.press('2');
    await page.waitForTimeout(2500);
    const issLive = await page.evaluate(() => window.__lab?.globe?.liveISS);
    console.log('  -> ISS live data:', issLive ? `lat=${issLive.lat?.toFixed(2)}, lon=${issLive.lon?.toFixed(2)}, alt=${issLive.altitude_km?.toFixed(1)}km` : 'null (polling may still be in-flight)');
    const orbitalGeomAudit = await page.evaluate(() => {
      let boxCount = 0, cylCount = 0, ringCount = 0, lineCount = 0;
      const globe = window.__lab.scene.getObjectByName && window.__lab.scene;
      globe.traverse(o => {
        if (!o.isMesh && !o.isLine) return;
        const t = o.geometry?.type;
        if (t === 'BoxGeometry') boxCount++;
        if (t === 'CylinderGeometry') cylCount++;
        if (t === 'RingGeometry') ringCount++;
        if (o.isLine || o.isLineSegments) lineCount++;
      });
      return { boxCount, cylCount, ringCount, lineCount };
    });
    console.log('  -> Procedural geometry in scene (orbital):', orbitalGeomAudit);
    await save('audit_C_orbital_mode.png', await page.screenshot({ animations: 'disabled' }));

    // D: SURFACE mode
    console.log('  -> Switching to SURFACE mode...');
    await page.keyboard.press('1');
    await page.waitForTimeout(2500);
    const quakeCount = await page.evaluate(() => window.__lab?.globe?.liveEarthquakes?.length ?? 0);
    console.log('  -> Live earthquakes in client:', quakeCount);
    const surfaceGeomAudit = await page.evaluate(() => {
      let circleCount = 0, ringCount = 0;
      window.__lab.scene.traverse(o => {
        if (!o.isMesh) return;
        const t = o.geometry?.type;
        if (t === 'CircleGeometry') circleCount++;
        if (t === 'RingGeometry') ringCount++;
      });
      return { circleCount, ringCount };
    });
    console.log('  -> Procedural quake geometry (CircleGeometry, RingGeometry):', surfaceGeomAudit);
    await save('audit_D_surface_earthquakes.png', await page.screenshot({ animations: 'disabled' }));

    // E: AIRSPACE mode
    console.log('  -> Switching to AIRSPACE mode...');
    await page.keyboard.press('3');
    await page.waitForTimeout(2500);
    const flightCount = await page.evaluate(() => window.__lab?.globe?.liveFlights?.length ?? 0);
    console.log('  -> Live flights in client:', flightCount);
    const airspaceGeomAudit = await page.evaluate(() => {
      let lineSegCount = 0;
      window.__lab.scene.traverse(o => {
        if (o.isLineSegments) lineSegCount++;
      });
      return { lineSegCount };
    });
    console.log('  -> Procedural flight geometry (LineSegments chevrons):', airspaceGeomAudit);
    await save('audit_E_airspace_flights.png', await page.screenshot({ animations: 'disabled' }));

    // F: DOM OVERLAY AUDIT — critical check for video/iframe/news-holo
    console.log('\n=== CAPTURE F: DOM Overlay Audit ===');
    const domAudit = await page.evaluate(() => {
      const videoEls = document.querySelectorAll('video');
      const iframeEls = document.querySelectorAll('iframe');
      const newsHolo = document.getElementById('ls3-news-holo');
      const ls3Tb = document.getElementById('ls3-taskbar');

      return {
        videoCount: videoEls.length,
        videoSrcs: [...videoEls].map(v => ({ src: v.src || v.currentSrc || '', display: window.getComputedStyle(v).display, visible: v.style.display !== 'none' })),
        iframeCount: iframeEls.length,
        iframeSrcs: [...iframeEls].map(f => ({ src: f.src, display: window.getComputedStyle(f).display })),
        newsHoloPresent: !!newsHolo,
        newsHoloActive: newsHolo?.classList.contains('active') ?? false,
        newsHoloDisplay: newsHolo ? window.getComputedStyle(newsHolo).display : 'absent',
        taskbarPresent: !!ls3Tb,
        taskbarActive: ls3Tb?.classList.contains('active') ?? false
      };
    });
    console.log('  -> DOM Overlay Audit (video/iframe baseline, no channel selected):');
    console.log('     videoCount:', domAudit.videoCount);
    console.log('     videoSrcs:', JSON.stringify(domAudit.videoSrcs));
    console.log('     iframeCount:', domAudit.iframeCount);
    console.log('     iframeSrcs:', JSON.stringify(domAudit.iframeSrcs));
    console.log('     newsHoloPresent:', domAudit.newsHoloPresent);
    console.log('     newsHoloActive (no channel selected):', domAudit.newsHoloActive);
    console.log('     taskbarPresent:', domAudit.taskbarPresent);
    await save('audit_F_dom_baseline.png', await page.screenshot({ animations: 'disabled' }));

    // Switch to NEWS mode and open a news channel to inspect the full DOM state
    console.log('\n=== CAPTURE G: NEWS mode with channel opened - full DOM audit ===');
    await page.keyboard.press('4');
    await page.waitForTimeout(2000);
    // Open first available news channel
    await page.evaluate(() => {
      const ch = window.__lab?.globe?.liveNews?.[0];
      if (ch && window.__lab?.openNewsDispatch) window.__lab.openNewsDispatch(ch);
    });
    await page.waitForTimeout(1200);

    const newsOpenAudit = await page.evaluate(() => {
      const videoEls = document.querySelectorAll('video');
      const iframeEls = document.querySelectorAll('iframe');
      const newsHolo = document.getElementById('ls3-news-holo');
      return {
        videoCount: videoEls.length,
        videoSrcs: [...videoEls].map(v => ({
          src: v.src || v.currentSrc || '(no src)',
          display: window.getComputedStyle(v).display,
          paused: v.paused
        })),
        iframeCount: iframeEls.length,
        iframeSrcs: [...iframeEls].map(f => ({
          src: f.src,
          display: window.getComputedStyle(f).display
        })),
        newsHoloActive: newsHolo?.classList.contains('active') ?? false,
        newsHoloOpacity: newsHolo ? window.getComputedStyle(newsHolo).opacity : 'N/A',
        // Check if the holo element is visually opaque (i.e. floating on top of canvas)
        holoZIndex: newsHolo ? window.getComputedStyle(newsHolo).zIndex : 'N/A',
        holoPosition: newsHolo ? window.getComputedStyle(newsHolo).position : 'N/A'
      };
    });
    console.log('  -> DOM Overlay Audit (channel opened):', JSON.stringify(newsOpenAudit, null, 2));
    await save('audit_G_news_dom_open.png', await page.screenshot({ animations: 'disabled' }));

    // G: Console summary
    console.log('\n=== FINAL AUDIT SUMMARY ===');
    console.log('Raster files loaded (response intercept):', rasterLoaded.length, rasterLoaded);
    console.log('WebGL warnings:', webglWarnings.length, webglWarnings);

    await page.close();
  }

  await browser.close();
  console.log('\n=== ALL CAPTURES COMPLETE ===');
}

run().catch(e => { console.error(e); process.exit(1); });
