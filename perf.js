// perf.js — adaptive quality governor for weak/no GPU. Internal resolution scaling + draw-call merge + shadow trim.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export function mergeByMaterial(root) {
  root.updateMatrixWorld(true);
  const invRoot = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const groups = new Map();
  root.traverse(o => {
    if (!o.isMesh || o.isInstancedMesh || o.userData.noMerge || o === root) return;
    const key = o.material.uuid;
    if (!groups.has(key)) groups.set(key, { material: o.material, geos: [] });
    const g = o.geometry.clone();
    g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(invRoot, o.matrixWorld));
    groups.get(key).geos.push(g); o.userData._merged = true;
  });
  const dead = []; root.traverse(o => { if (o.userData._merged) dead.push(o); });
  dead.forEach(o => o.parent && o.parent.remove(o));
  let saved = 0;
  for (const { material, geos } of groups.values()) {
    if (!geos.length) continue;
    if (geos.length === 1) { root.add(new THREE.Mesh(geos[0], material)); continue; }
    const anyNon = geos.some(g => !g.index);
    const cleanGeos = geos.map(g => (anyNon && g.index) ? g.toNonIndexed() : g);
    const merged = mergeGeometries(cleanGeos, false);
    if (!merged) {
      geos.forEach(g => { const m = new THREE.Mesh(g, material); m.castShadow = m.receiveShadow = true; root.add(m); });
      continue;
    }
    const mesh = new THREE.Mesh(merged, material);
    mesh.castShadow = mesh.receiveShadow = true; root.add(mesh); saved += geos.length - 1;
  }
  return saved;
}

export function installPerfGovernor({ renderer, composer, camera, bloom, grade, amberLight, LOW }) {
  let scale = LOW ? .82 : 1; const minScale = LOW ? .55 : .7, maxScale = LOW ? .82 : 1;
  if (LOW && amberLight) amberLight.castShadow = false;   // dynamic shadows are the costliest thing on an iGPU; AO covers this
  let acc = 0, n = 0, cooldown = 0;
  function applySize() {
    const w = innerWidth, h = innerHeight, dw = Math.round(w * scale), dh = Math.round(h * scale);
    renderer.setSize(dw, dh, false);                       // drawing buffer only — CSS canvas stays fullscreen, browser upscales
    composer.setSize(dw, dh);
    if (grade) grade.uniforms.uRes.value.set(dw * renderer.getPixelRatio(), dh * renderer.getPixelRatio());
    camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  applySize(); addEventListener('resize', applySize);
  return {
    tick(dt) {
      acc += dt; n++; cooldown -= dt; if (acc < 1.5 || cooldown > 0) return;
      const fps = n / acc; acc = 0; n = 0;
      if (fps < 30 && scale > minScale) { scale = Math.max(minScale, scale - .08); applySize(); cooldown = 1.5; }
      else if (fps < 38 && bloom?.enabled) { bloom.enabled = false; cooldown = 2; }
      else if (fps > 55 && scale < maxScale) { scale = Math.min(maxScale, scale + .06); applySize(); cooldown = 2; }
    }, get scale() { return scale; },
    applySize
  };
}
