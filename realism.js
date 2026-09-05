// realism.js — drop-in realism layer for VAULT-01 index.html (v2). Zero image files.
import * as THREE from 'three';

export async function applyRealism({ scene, renderer, camera, composer, LOW, METAL, rockMats, metalMats, door }) {
  const hash = n => { const s = Math.sin(n * 12.9898) * 43758.5453; return s - Math.floor(s); };
  const report = {};

  /* ── 1. WEATHERING: rust drips + bare-metal chips painted into the compiled metal maps ── */
  {
    const N = METAL.map.image.width;
    const ga = METAL.map.image.getContext('2d'), gr = METAL.roughnessMap.image.getContext('2d');
    ga.globalCompositeOperation = 'multiply'; gr.globalCompositeOperation = 'lighten';
    for (let i = 0; i < 64; i++) {
      const x = hash(i * 1.3) * N, y0 = hash(i * 2.9) * N * .9, len = N * (.08 + hash(i * 5.1) * .45), w = 1 + hash(i * 7.7) * 4;
      const g1 = ga.createLinearGradient(0, y0, 0, y0 + len);
      g1.addColorStop(0, 'rgba(150,85,45,.95)'); g1.addColorStop(.3, 'rgba(120,70,40,.7)'); g1.addColorStop(1, 'rgba(120,70,40,0)');
      ga.fillStyle = g1; ga.fillRect(x - w / 2, y0, w, len);                                  // drip (albedo)
      const g2 = gr.createLinearGradient(0, y0, 0, y0 + len);
      g2.addColorStop(0, 'rgba(255,255,255,.55)'); g2.addColorStop(1, 'rgba(255,255,255,0)');
      gr.fillStyle = g2; gr.fillRect(x - w, y0, w * 2, len);                                  // drip is rougher
      const r = 2 + hash(i * 3.3) * 6, rg = ga.createRadialGradient(x, y0, 0, x, y0, r);
      rg.addColorStop(0, 'rgba(140,70,30,1)'); rg.addColorStop(1, 'rgba(140,70,30,0)');
      ga.fillStyle = rg; ga.fillRect(x - r, y0 - r, r * 2, r * 2);                            // rust bloom at the source
    }
    ga.globalCompositeOperation = 'source-over'; gr.globalCompositeOperation = 'multiply';
    for (let i = 0; i < 90; i++) {                                                             // paint chips → bare, smoother metal
      const x = hash(i * 11.1 + 3) * N, y = hash(i * 13.7 + 3) * N, r = 1.5 + hash(i * 17) * 4;
      const poly = g => { g.beginPath(); for (let k = 0; k < 6; k++) { const a = k / 6 * 6.283, rr = r * (.6 + hash(i * 19 + k) * .8);
        k ? g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr) : g.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.closePath(); g.fill(); };
      ga.fillStyle = 'rgba(178,184,192,.9)'; poly(ga); gr.fillStyle = 'rgb(70,70,70)'; poly(gr);
    }
    const imgs = [METAL.map.image, METAL.roughnessMap.image];
    door.traverse(o => { if (!o.isMesh) return; for (const m of [].concat(o.material)) for (const k of ['map', 'roughnessMap']) if (m[k] && imgs.includes(m[k].image)) m[k].needsUpdate = true; });
    report.weathering = 'rust drips + chips';
  }

  /* ── 2. EDGE WEAR: brighten + polish chamfers/bolt edges from screen-space curvature (no extra geometry) ── */
  const [gun, gunD, tit] = metalMats;
  gun.color.setHex(0x474b52); gunD.color.setHex(0x1f2226); tit.color.setHex(0x8b9198);      // 4. colder, darker alloy
  for (const m of metalMats) {
    m.onBeforeCompile = sh => {
      sh.uniforms.uWear = { value: LOW ? 6 : 9 };
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nuniform float uWear;')
        .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        { float curv = clamp(length(fwidth(normalize(vNormal))) * uWear, 0., 1.);
          normal = normalize(mix(normal, normalize(normal + vNormal * .5), curv * .55)); }`)
        .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        { float curv = clamp(length(fwidth(normalize(vNormal))) * uWear, 0., 1.) * smoothstep(9., 2.5, length(vViewPosition));
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.70,.73,.78), curv * .6);
          roughnessFactor = mix(roughnessFactor, .25, curv * .7); }`);
    };
    m.customProgramCacheKey = () => 'wear2'; m.needsUpdate = true;
  }
  report.edgeWear = true;

  /* ── 3. TRIPLANAR ROCK: world-space projection, whiteout-blended normals — kills UV stretch on boulders/wall ── */
  for (const m of rockMats) {
    m.onBeforeCompile = sh => {
      sh.uniforms.uTri = { value: .55 };
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vWp; varying vec3 vWn;')
        .replace('#include <project_vertex>', `#include <project_vertex>
          { mat4 mm = modelMatrix;
            #ifdef USE_INSTANCING
              mm = mm * instanceMatrix;
            #endif
            vWp = (mm * vec4(transformed, 1.)).xyz;
            vWn = normalize(mat3(mm) * objectNormal);
            #ifdef FLIP_SIDED
              vWn = -vWn;
            #endif
          }`);
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', `#include <common>
          uniform float uTri; varying vec3 vWp; varying vec3 vWn;`)
        .replace('#include <map_fragment>', `
          vec3 bw = pow(abs(vWn), vec3(4.)); bw /= (bw.x + bw.y + bw.z);
          vec2 uvx = vWp.zy * uTri, uvy = vWp.xz * uTri, uvz = vWp.xy * uTri;
          diffuseColor *= texture2D(map, uvx) * bw.x + texture2D(map, uvy) * bw.y + texture2D(map, uvz) * bw.z;`)
        .replace('#include <roughnessmap_fragment>', `
          float roughnessFactor = roughness;
          roughnessFactor *= texture2D(roughnessMap, uvx).g * bw.x + texture2D(roughnessMap, uvy).g * bw.y + texture2D(roughnessMap, uvz).g * bw.z;`)
        .replace('#include <normal_fragment_maps>', `
          { vec3 wn = normalize(vWn);
            vec3 tnx = texture2D(normalMap, uvx).xyz * 2. - 1.;
            vec3 tny = texture2D(normalMap, uvy).xyz * 2. - 1.;
            vec3 tnz = texture2D(normalMap, uvz).xyz * 2. - 1.;
            tnx.xy *= normalScale; tny.xy *= normalScale; tnz.xy *= normalScale;
            tnx = vec3(tnx.xy + wn.zy, abs(tnx.z) * wn.x);
            tny = vec3(tny.xy + wn.xz, abs(tny.z) * wn.y);
            tnz = vec3(tnz.xy + wn.xy, abs(tnz.z) * wn.z);
            vec3 wN = normalize(tnx.zyx * bw.x + tny.xzy * bw.y + tnz.xyz * bw.z);
            normal = normalize((viewMatrix * vec4(wN, 0.)).xyz); }`);
    };
    m.customProgramCacheKey = () => 'tri'; m.needsUpdate = true;
  }
  report.triplanar = true;

  /* ── bounce light: warm from the ember side, cold from the dark side ── */
  scene.add(new THREE.HemisphereLight(0x3a2416, 0x0c1218, .45));

  /* ── 4. GTAO contact shadows (HIGH tier only, self-disables if it costs the frame rate) ── */
  const hud = document.createElement('div');
  hud.style.cssText = 'position:fixed;top:10px;right:10px;color:#6f9;font:11px ui-monospace,monospace;background:#000a;padding:6px 8px;white-space:pre;display:none;line-height:1.5';
  document.body.appendChild(hud);
  addEventListener('keydown', e => { if (e.key === 'd') hud.style.display = hud.style.display === 'block' ? 'none' : 'block'; });
  const show = () => hud.textContent = 'realism.js\n' + Object.entries(report).map(([k, v]) => `${k}: ${v}`).join('\n');

  if (!LOW) {
    const { GTAOPass } = await import('three/addons/postprocessing/GTAOPass.js');
    const size = renderer.getDrawingBufferSize(new THREE.Vector2());
    const gtao = new GTAOPass(scene, camera, size.x, size.y);
    gtao.output = GTAOPass.OUTPUT.Default; gtao.blendIntensity = .9;
    gtao.updateGtaoMaterial({ radius: .22, distanceExponent: 1, thickness: 1, scale: 1.2, samples: 12, distanceFallOff: 1, screenSpaceRadius: false });
    gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 4, radiusExponent: 1, rings: 2, samples: 12 });
    composer.insertPass(gtao, 1);
    report.gtao = 'on';
    let acc = 0, n = 0, last = performance.now();
    const probe = () => { const now = performance.now(); acc += now - last; last = now; n++;
      if (acc > 4000) { const fps = n / (acc / 1000); if (fps < 24) { gtao.enabled = false; report.gtao = `off (fps ${fps.toFixed(0)})`; show(); return; } acc = 0; n = 0; }
      requestAnimationFrame(probe); };
    requestAnimationFrame(probe);
  } else report.gtao = 'skipped (LOW tier)';

  show();
  return report;
}
