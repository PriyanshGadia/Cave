const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ['--use-gl=angle', '--use-angle=gl', '--enable-webgl', '--ignore-gpu-blocklist']
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  
  await page.goto('http://localhost:3000/index.html?lab&boot=skip');
  await page.waitForFunction(() => window.__lab?.state?.ready);

  await page.evaluate(async () => {
    const THREE = window.THREE;
    const { createIdentityVolumeGeometry } = await import('./ls1_identity_mesh.js?t=' + Date.now());

    // Create a brand new isolated scene
    const diagScene = new THREE.Scene();
    diagScene.background = new THREE.Color(0x22252a);

    const geom = createIdentityVolumeGeometry(THREE);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x9ba2ad,
      roughness: 0.55,
      metalness: 0.05
    });
    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.set(0, 0.08, 0);

    const testG = new THREE.Group();
    testG.position.set(-2.539011, 0.962, 3.025876);
    testG.rotation.y = 5.585054;
    testG.add(mesh);
    diagScene.add(testG);

    const targetObj = new THREE.Object3D();
    targetObj.position.set(0, 0.95, 0);
    testG.add(targetObj);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.0);
    keyLight.position.set(1.5, 2.2, 2.5);
    keyLight.target = targetObj;
    testG.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xd8e0ea, 1.4);
    fillLight.position.set(-1.5, 1.8, 2.2);
    fillLight.target = targetObj;
    testG.add(fillLight);

    const amb = new THREE.AmbientLight(0x808894, 1.2);
    testG.add(amb);

    const cam = new THREE.PerspectiveCamera(58, 1280 / 720, 0.1, 100);
    const targetWorld = testG.localToWorld(new THREE.Vector3(0, 0.95, 0));
    const camWorld = testG.localToWorld(new THREE.Vector3(0, 0.95, 1.68));
    cam.position.copy(camWorld);
    cam.lookAt(targetWorld);

    // Test rendering diagScene through composer vs direct renderer
    const composer = window.__lab.composer;
    composer.passes[0].scene = diagScene;
    composer.passes[0].camera = cam;
    
    // Check passes
    console.log('Composer passes count:', composer.passes.length);
    composer.passes.forEach((p, i) => {
      console.log(`Pass ${i}: ${p.constructor.name}, enabled=${p.enabled}`);
    });

    // Test: Disable everything except RenderPass (and render RenderPass to screen)
    composer.passes[0].renderToScreen = true;
    for (let i = 1; i < composer.passes.length; i++) {
      composer.passes[i].enabled = false;
    }

    window.__diagRender = () => {
      composer.render();
    };

    // Override the animation loop
    window.__lab.update = () => {};
    const renderLoop = () => {
      window.__diagRender();
      requestAnimationFrame(renderLoop);
    };
    renderLoop();
  });

  await page.waitForTimeout(500);
  const buf = await page.screenshot();
  fs.writeFileSync('C:/Users/gadia/.gemini/antigravity-ide/brain/694bd3af-9386-4a86-8cb6-98cd73f0a84a/test_isolated_render.png', buf);
  console.log('Saved test_isolated_render.png');
  await browser.close();
})();
