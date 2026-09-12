const { chromium } = require('playwright');

async function check() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.goto('http://localhost:3000/index.html?lab&boot=skip');
  await page.waitForFunction(() => window.__lab?.state?.ready);
  
  const res = await page.evaluate(() => {
    if (window.__lab?.skipToFinal) window.__lab.skipToFinal();

    const all = Array.from(document.querySelectorAll('*'));
    const domEls = all.map(el => {
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      if (rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0') {
        return {
          tag: el.tagName,
          id: el.id,
          class: el.className,
          rect: { x: rect.x, y: rect.y, w: rect.width, h: rect.height },
          bg: style.backgroundColor,
          zIndex: style.zIndex,
        };
      }
      return null;
    }).filter(Boolean);

    // Also check 3D scene objects around LS1
    const g = window.__lab.sectorGroups['LS1'];
    const scene = window.__lab.scene;
    const meshesNearLS1 = [];
    scene.traverse(o => {
      if (o.isMesh && o.visible) {
        const wp = new window.THREE.Vector3();
        o.getWorldPosition(wp);
        // LS1 is around x=-2.54, z=3.03
        const dist = Math.hypot(wp.x - (-2.54), wp.z - 3.03);
        if (dist < 4.0) {
          meshesNearLS1.push({
            name: o.name,
            type: o.type,
            parentName: o.parent?.name,
            parentType: o.parent?.type,
            pos: { x: +wp.x.toFixed(2), y: +wp.y.toFixed(2), z: +wp.z.toFixed(2) },
            mat: o.material?.type,
            matColor: o.material?.color ? '#' + o.material.color.getHexString() : null,
            matOpacity: o.material?.opacity,
            matTransparent: o.material?.transparent,
          });
        }
      }
    });

    return { domEls, meshesNearLS1 };
  });

  console.log('DOM Elements over canvas:');
  console.log(JSON.stringify(res.domEls.filter(e => e.tag !== 'CANVAS' && e.tag !== 'HTML' && e.tag !== 'BODY'), null, 2));
  console.log('\nMeshes near LS1:');
  console.log(JSON.stringify(res.meshesNearLS1, null, 2));

  await browser.close();
}

check().catch(console.error);
