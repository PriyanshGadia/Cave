import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch({
    headless: true,
    args: ['--use-gl=angle', '--use-angle=gl', '--enable-webgl', '--ignore-gpu-blocklist'],
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.goto('http://localhost:8000/index.html?lab&boot=skip', { waitUntil: 'load' });
  await page.waitForFunction(() => (window as any).__lab?.state?.ready);
  await page.waitForTimeout(600);

  const report = await page.evaluate(async () => {
    const lab = (window as any).__lab;
    lab.focusSector('RS2');

    // Fast-forward FOCUS interpolation to 1.0
    lab.camera.position.copy((window as any).__lab.sectorGroups['RS2'].localToWorld(new (window as any).THREE.Vector3(0, .45, .36)));
    lab.camera.lookAt((window as any).__lab.sectorGroups['RS2'].localToWorld(new (window as any).THREE.Vector3(0, .025, .03)));
    
    const cam = lab.camera;
    const scene = lab.scene;
    const THREE = (window as any).THREE;

    const scrMesh = lab.sectorGroups['RS2'].children.find((c: any) => c.geometry?.parameters?.width === 0.58);
    const scrWorld = new THREE.Vector3();
    scrMesh.getWorldPosition(scrWorld);

    // Cast multiple rays from camera across the screen (grid of 5x5 rays across the screen surface)
    const hitsList: any[] = [];
    
    // Check all meshes in the scene and calculate distance to camera
    const allMeshes: any[] = [];
    scene.traverse((obj: any) => {
      if (obj.isMesh && obj.visible) {
        const wp = new THREE.Vector3();
        obj.getWorldPosition(wp);
        const dist = cam.position.distanceTo(wp);
        if (dist < 1.5) {
          allMeshes.push({
            type: obj.type,
            name: obj.name || obj.parent?.name || 'unnamed',
            geom: obj.geometry?.type,
            geomParams: obj.geometry?.parameters,
            matType: obj.material?.type,
            matColor: obj.material?.color?.getHexString?.(),
            matRoughness: obj.material?.roughness,
            matMetalness: obj.material?.metalness,
            matOpacity: obj.material?.opacity,
            matTransparent: obj.material?.transparent,
            renderOrder: obj.renderOrder,
            worldPos: { x: +wp.x.toFixed(3), y: +wp.y.toFixed(3), z: +wp.z.toFixed(3) },
            dist: +dist.toFixed(3),
            isScr: obj === scrMesh
          });
        }
      }
    });

    return {
      camPos: { x: +cam.position.x.toFixed(3), y: +cam.position.y.toFixed(3), z: +cam.position.z.toFixed(3) },
      scrPos: { x: +scrWorld.x.toFixed(3), y: +scrWorld.y.toFixed(3), z: +scrWorld.z.toFixed(3) },
      nearbyMeshes: allMeshes
    };
  });

  console.log('CAMERA & SCREEN POS:', report.camPos, report.scrPos);
  console.log('NEARBY MESHES (<1.5m to camera):', JSON.stringify(report.nearbyMeshes, null, 2));

  await browser.close();
}

main().catch(console.error);
