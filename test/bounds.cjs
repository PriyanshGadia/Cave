const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  // Expose a function to get files
  await page.exposeFunction('readGLB', async (filename) => {
    return fs.readFileSync(filename).toString('base64');
  });

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <script type="importmap">
          {
            "imports": {
              "three": "../node_modules/three/build/three.module.js",
              "three/addons/": "../node_modules/three/examples/jsm/"
            }
          }
        </script>
      </head>
      <body>
        <script type="module">
          import * as THREE from 'three';
          import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

          window.processGLBs = async (paths) => {
            const loader = new GLTFLoader();
            const results = [];
            
            for (const p of paths) {
              const base64 = await window.readGLB(p);
              const dataUrl = "data:model/gltf-binary;base64," + base64;
              
              const gltf = await loader.loadAsync(dataUrl);
              const box = new THREE.Box3().setFromObject(gltf.scene);
              
              results.push({
                path: p,
                min: [box.min.x, box.min.y, box.min.z],
                max: [box.max.x, box.max.y, box.max.z]
              });
            }
            return results;
          };
        </script>
      </body>
    </html>
  `;

  const testHtml = path.resolve(__dirname, 'bounds.html');
  fs.writeFileSync(testHtml, html);
  
  await page.goto('file://' + testHtml);
  
  const paths = [
    '../public/assets/armor/vault-mk1/final/boots.glb',
    '../public/assets/armor/vault-mk1/final/legs.glb',
    '../public/assets/armor/vault-mk1/final/torso.glb',
    '../public/assets/armor/vault-mk1/final/arms.glb',
    '../public/assets/armor/vault-mk1/final/gauntlets.glb',
    '../public/assets/armor/vault-mk1/final/helmet.glb'
  ].map(p => path.resolve(__dirname, p));

  await page.waitForFunction(() => typeof window.processGLBs === 'function');
  const results = await page.evaluate(async (paths) => {
    return await window.processGLBs(paths);
  }, paths);
  
  let globalMin = [Infinity, Infinity, Infinity];
  let globalMax = [-Infinity, -Infinity, -Infinity];
  
  for (const r of results) {
    const p = path.basename(r.path);
    console.log(p);
    console.log("Min: [" + r.min[0].toFixed(3) + ", " + r.min[1].toFixed(3) + ", " + r.min[2].toFixed(3) + "]");
    console.log("Max: [" + r.max[0].toFixed(3) + ", " + r.max[1].toFixed(3) + ", " + r.max[2].toFixed(3) + "]");
    
    globalMin = [
      Math.min(globalMin[0], r.min[0]),
      Math.min(globalMin[1], r.min[1]),
      Math.min(globalMin[2], r.min[2])
    ];
    globalMax = [
      Math.max(globalMax[0], r.max[0]),
      Math.max(globalMax[1], r.max[1]),
      Math.max(globalMax[2], r.max[2])
    ];
  }
  
  console.log("--- UNION BOX3 ---");
  console.log("Min: [" + globalMin[0].toFixed(3) + ", " + globalMin[1].toFixed(3) + ", " + globalMin[2].toFixed(3) + "]");
  console.log("Max: [" + globalMax[0].toFixed(3) + ", " + globalMax[1].toFixed(3) + ", " + globalMax[2].toFixed(3) + "]");
  console.log("Size: [" + (globalMax[0] - globalMin[0]).toFixed(3) + ", " + (globalMax[1] - globalMin[1]).toFixed(3) + ", " + (globalMax[2] - globalMin[2]).toFixed(3) + "]");
  
  await browser.close();
  fs.unlinkSync(testHtml);
})();
