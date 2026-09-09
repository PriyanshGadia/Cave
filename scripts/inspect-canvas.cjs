const { chromium } = require('playwright');
const fs = require('fs');

async function inspect() {
  const browser = await chromium.launch({
    headless: true,
    args: ['--use-gl=angle', '--use-angle=gl', '--enable-webgl', '--ignore-gpu-blocklist'],
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.goto('http://localhost:8000/index.html?lab&boot=skip');
  await page.waitForFunction('window.__lab && window.__lab.state && window.__lab.state.ready');
  await page.waitForTimeout(500);

  await page.evaluate(() => window.__lab.focusSector('RS2'));
  await page.waitForFunction('window.__lab && window.__lab.state && window.__lab.state.focusE >= 0.99');
  await page.waitForTimeout(400);

  // Trigger print
  await page.evaluate(() => {
    window.__lab.triggerPrint();
  });
  await page.waitForTimeout(400); // mid-print

  // Extract resumeCanvas and paperCanvas data URLs
  const canvases = await page.evaluate(() => {
    const lab = window.__lab;
    const g = lab.sectorGroups['RS2'];
    const scrMesh = g.children.find(c => c.geometry && c.geometry.parameters && c.geometry.parameters.width === 0.58);
    const resumeCanvas = scrMesh.material.map.image;
    const paperCanvas = lab.paperMesh ? lab.paperMesh.material.map.image : null;

    return {
      resumeData: resumeCanvas ? resumeCanvas.toDataURL('image/png') : null,
      paperData: paperCanvas ? paperCanvas.toDataURL('image/png') : null,
      paperVisible: lab.paperMesh ? lab.paperMesh.visible : false,
      paperPos: lab.paperMesh ? lab.paperMesh.position : null,
      paperScale: lab.paperMesh ? lab.paperMesh.scale : null,
      paperRot: lab.paperMesh ? { x: lab.paperMesh.rotation.x, y: lab.paperMesh.rotation.y, z: lab.paperMesh.rotation.z } : null,
    };
  });

  if (canvases.resumeData) {
    const base64 = canvases.resumeData.replace(/^data:image\/png;base64,/, '');
    fs.writeFileSync('public/screenshots/debug-resume-canvas.png', Buffer.from(base64, 'base64'));
    console.log('Saved debug-resume-canvas.png');
  }

  if (canvases.paperData) {
    const base64 = canvases.paperData.replace(/^data:image\/png;base64,/, '');
    fs.writeFileSync('public/screenshots/debug-paper-canvas.png', Buffer.from(base64, 'base64'));
    console.log('Saved debug-paper-canvas.png');
  }

  console.log('Paper state:', {
    visible: canvases.paperVisible,
    pos: canvases.paperPos,
    scale: canvases.paperScale,
    rot: canvases.paperRot
  });

  await browser.close();
}

inspect();
