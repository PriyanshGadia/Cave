// holotable.js — circular holo-workbench hero scene. Reuses cave materials; zero new textures compiled.
import * as THREE from 'three';

const hash = n => { const s = Math.sin(n * 12.9898) * 43758.5453; return s - Math.floor(s); };
const tex = c => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; };
function plaque(title, sub, hue) {
  const c = document.createElement('canvas'); c.width = 320; c.height = 160; const g = c.getContext('2d');
  g.fillStyle = '#04141a'; g.fillRect(0, 0, 320, 160);
  g.strokeStyle = hue; g.lineWidth = 3; g.strokeRect(4, 4, 312, 152);
  g.fillStyle = hue; g.font = 'bold 13px monospace'; g.textAlign = 'center';
  g.fillText(title, 160, 70); g.font = '11px monospace'; g.fillStyle = '#9fd6e6'; g.fillText(sub, 160, 96);
  return tex(c);
}
const box = (w, h, d, m) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
function ring(shape2, hole2, depth, seg, mat) {
  const s = new THREE.Shape();
  for (let i = 0; i <= seg; i++) { const a = i / seg * Math.PI * 2; s[i ? 'lineTo' : 'moveTo'](Math.cos(a) * shape2, Math.sin(a) * shape2); }
  const h = new THREE.Path();
  for (let i = 0; i <= seg; i++) { const a = i / seg * Math.PI * 2; h[i ? 'lineTo' : 'moveTo'](Math.cos(a) * hole2, Math.sin(a) * hole2); }
  s.holes.push(h);
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: .02, bevelSize: .02, bevelSegments: 2, curveSegments: Math.max(8, seg / 4) });
  g.rotateX(Math.PI / 2);
  return new THREE.Mesh(g, mat);
}

function buildBench(group, M, LOW) {
  const outerR = 5.2, innerR = 4.15, bodyH = .95, topH = .12, seg = LOW ? 56 : 88;
  const body = ring(outerR, innerR, bodyH, seg, M.gunD); body.position.y = bodyH; body.castShadow = body.receiveShadow = true; group.add(body);
  const top = ring(outerR + .05, innerR - .05, topH, seg, M.gun); top.position.y = bodyH + topH; top.castShadow = top.receiveShadow = true; group.add(top);
  const seam = new THREE.Mesh(new THREE.TorusGeometry((outerR + innerR) / 2, .01, 6, seg), M.tit);
  seam.rotation.x = Math.PI / 2; seam.position.y = bodyH + topH + .001; group.add(seam);
  return { outerR, innerR, benchTop: bodyH + topH, seg };
}

function buildEntry(group, M, bench) {
  const arc = Math.PI * 2 / 9, w = (bench.innerR) * Math.tan(arc * .42) * 2;
  [-1, 1].forEach(s => {
    const panel = box(w / 2 - .01, bench.benchTop - .1, .1, M.tit);
    panel.position.set(s * (w / 4), bench.benchTop / 2, bench.innerR - .01);
    panel.castShadow = panel.receiveShadow = true; group.add(panel);
    const hinge = new THREE.Mesh(new THREE.CylinderGeometry(.02, .02, bench.benchTop - .1, 8), M.gunD);
    hinge.rotation.x = Math.PI / 2; hinge.position.set(s * w * .48, bench.benchTop / 2, bench.innerR + .01); group.add(hinge);
  });
  const seam = new THREE.Mesh(new THREE.PlaneGeometry(.02, bench.benchTop - .12), M.ledCyan);
  seam.position.set(0, bench.benchTop / 2, bench.innerR - .04); group.add(seam);
}

const STATION_DEF = [
  { name: 'RS1', label: 'PROJECT ARCHIVE', sub: 'live repository feed', hue: '#3ee6ff' },
  { name: 'RS2', label: 'RESUME FORGE', sub: 'tailored export', hue: '#ffd166' },
  { name: 'RS3', label: 'HOLO-CALENDAR', sub: 'schedule mirror', hue: '#4dff8a' },
  { name: 'RS4', label: 'WORKSTATION', sub: 'sealed — offline', hue: '#8892a0' },
  { name: 'LS4', label: 'WORKSTATION', sub: 'sealed — offline', hue: '#8892a0' },
  { name: 'LS3', label: 'HOLO-GLOBE', sub: 'field log & atlas', hue: '#5fe0ff' },
  { name: 'LS2', label: 'SCRATCHPAD WALL', sub: 'leave a note', hue: '#ffb347' },
  { name: 'LS1', label: 'DOSSIER', sub: 'public profile', hue: '#ff7a59' },
];

function buildStations(group, M, bench, LOW) {
  const arc = Math.PI * 2 / 9, out = [];
  STATION_DEF.forEach((def, i) => {
    const angle = arc * (i + 1);                      // sector 0 = entry at angle 0
    const g = new THREE.Group(); g.rotation.y = -angle; g.position.set(Math.sin(angle) * bench.innerR, 0, Math.cos(angle) * bench.innerR);
    let hero;
    if (def.name === 'RS4' || def.name === 'LS4') { hero = box(.7, .5, .5, M.gunD); hero.position.y = bench.benchTop + .28;
      const tarp = new THREE.Mesh(new THREE.SphereGeometry(.5, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), M.comp);
      tarp.position.y = bench.benchTop + .5; tarp.scale.set(.85, .5, .85); g.add(tarp);
    } else if (def.name === 'LS3') { hero = new THREE.Mesh(new THREE.IcosahedronGeometry(.32, LOW ? 1 : 2), M.tit); hero.position.y = bench.benchTop + .55;
    } else if (def.name === 'RS3') { hero = new THREE.Mesh(new THREE.TorusGeometry(.28, .015, 8, 24), M.ledCyan); hero.position.y = bench.benchTop + .6; hero.rotation.x = Math.PI / 2.4;
    } else if (def.name === 'LS2') { hero = box(.62, .48, .04, M.gunD); hero.position.y = bench.benchTop + .35;
    } else { hero = box(.5, .3, .38, M.gun); hero.position.y = bench.benchTop + .2; }
    hero.castShadow = hero.receiveShadow = true; g.add(hero);
    const pedestal = box(.36, bench.benchTop, .36, M.gunD); pedestal.position.y = bench.benchTop / 2; pedestal.castShadow = pedestal.receiveShadow = true; g.add(pedestal);
    const pl = new THREE.PlaneGeometry(.42, .21);
    const plate = new THREE.Mesh(pl, new THREE.MeshBasicMaterial({ map: plaque(def.label, def.sub, def.hue), transparent: true, toneMapped: false }));
    plate.userData.noMerge = true; plate.position.set(0, bench.benchTop + .95, .01); g.add(plate);
    const spot = new THREE.PointLight(new THREE.Color(def.hue), 1.6, 2.4, 2); spot.position.set(0, bench.benchTop + .8, .3); g.add(spot);
    group.add(g);
    out.push({ ...def, angle, group: g, hero, plate, spot });
  });
  return out;
}

function buildFloor(group, M, bench) {
  const disc = new THREE.Mesh(new THREE.CircleGeometry(bench.innerR - .06, bench.seg), M.gunD);
  disc.rotation.x = -Math.PI / 2; disc.receiveShadow = true; group.add(disc);
  const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d');
  g.fillStyle = '#000'; g.fillRect(0, 0, 512, 512); g.strokeStyle = '#123a44'; g.lineWidth = 1;
  for (let r = 40; r < 256; r += 40) { g.beginPath(); g.arc(256, 256, r, 0, Math.PI * 2); g.stroke(); }
  for (let a = 0; a < 16; a++) { const th = a / 16 * Math.PI * 2; g.beginPath(); g.moveTo(256, 256); g.lineTo(256 + Math.cos(th) * 256, 256 + Math.sin(th) * 256); g.stroke(); }
  const grid = new THREE.Mesh(new THREE.CircleGeometry(bench.innerR - .08, bench.seg),
    new THREE.MeshBasicMaterial({ map: tex(c), transparent: true, opacity: .35, blending: THREE.AdditiveBlending, toneMapped: false }));
  grid.rotation.x = -Math.PI / 2; grid.position.y = .002; group.add(grid);
}

function buildCore(group, M, LOW) {
  const g = new THREE.Group(); g.position.y = 0; group.add(g);
  const ped = new THREE.Mesh(new THREE.CylinderGeometry(.7, .8, .5, LOW ? 20 : 32), M.gunD); ped.position.y = .25; ped.castShadow = ped.receiveShadow = true; g.add(ped);
  const trim = new THREE.Mesh(new THREE.TorusGeometry(.72, .02, 8, 32), M.ledCyan); trim.rotation.x = Math.PI / 2; trim.position.y = .5; g.add(trim);
  const wire = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(.4, 1)), new THREE.LineBasicMaterial({ color: 0x5fe8ff, transparent: true, opacity: .8 }));
  wire.position.y = 1.35; g.add(wire);
  const rings = [.5, .62, .74].map((r, i) => { const t = new THREE.Mesh(new THREE.TorusGeometry(r, .006, 6, 40), M.ledCyan); t.position.y = 1.35; t.rotation.x = Math.PI / 3 * i + .3; t.rotation.y = i; g.add(t); return t; });
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(.22, LOW ? 2 : 3), new THREE.ShaderMaterial({
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
    uniforms: { uT: { value: 0 } },
    vertexShader: `varying vec3 vN; void main(){ vN = normalize(normalMatrix*normal); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `uniform float uT; varying vec3 vN; void main(){ float fres = pow(1.-abs(vN.z), 2.2);
      vec3 c = mix(vec3(.1,.7,.9), vec3(.6,.95,1.), fres) * (0.7+0.3*sin(uT*3.)); gl_FragColor = vec4(c, fres*.9+.1); }`
  }));
  core.position.y = 1.35; g.add(core);
  const beamMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { uT: { value: 0 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `uniform float uT; varying vec2 vUv; void main(){ float a = (1.-vUv.y)*.5*(.85+.15*sin(uT*6.+vUv.y*20.)); gl_FragColor = vec4(.4,.85,1., a*.4); }` });
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(.08, .3, 3.2, 20, 1, true), beamMat); beam.position.y = 1.9; g.add(beam);
  const light = new THREE.PointLight(0x4de0ff, 3, 6, 2); light.position.y = 1.4; g.add(light);
  return { animate: (t) => { wire.rotation.y = t * .3; core.material.uniforms.uT.value = t; beamMat.uniforms.uT.value = t;
    rings.forEach((r, i) => { r.rotation.z = t * (.2 + i * .1); }); light.intensity = 2.6 + Math.sin(t * 5) * .3 + (hash(Math.floor(t * 8)) < .03 ? 1.2 : 0); } };
}

function scatterTools(group, M, bench, LOW) {
  const count = LOW ? 18 : 36, wrench = new THREE.TorusGeometry(.05, .012, 6, 10, Math.PI * 1.4);
  const inst = new THREE.InstancedMesh(wrench, M.tit, count), d = new THREE.Object3D();
  const arc = Math.PI * 2 / 9;
  for (let i = 0; i < count; i++) {
    let a = hash(i * 3.7) * Math.PI * 2;
    if (Math.abs(((a + Math.PI) % (Math.PI * 2)) - Math.PI) < arc * .55) a += arc;   // keep clear of the entry seam
    const r = bench.innerR + .25 + hash(i * 5.1) * (bench.outerR - bench.innerR - .5);
    d.position.set(Math.sin(a) * r, bench.benchTop + .01, Math.cos(a) * r);
    d.rotation.set(Math.PI / 2 + hash(i) * .3, hash(i * 2) * 6, 0); d.updateMatrix(); inst.setMatrixAt(i, d.matrix);
  }
  inst.castShadow = inst.receiveShadow = true; group.add(inst); return inst;
}

export function installHoloTable({ scene, camera, materials: M, LOW }) {
  const group = new THREE.Group(); group.visible = false; scene.add(group);
  const bench = buildBench(group, M, LOW);
  buildEntry(group, M, bench);
  const stations = buildStations(group, M, bench, LOW);
  buildFloor(group, M, bench);
  const core = buildCore(group, M, LOW);
  scatterTools(group, M, bench, LOW);

  scene.add(new THREE.HemisphereLight(0x4a3826, 0x0c1218, .5));
  const pendant = new THREE.PointLight(0xffcf9a, 4, 9, 2); pendant.position.set(0, 4.5, 0); pendant.castShadow = !LOW; group.add(pendant);

  const camR = bench.innerR - .55;
  const orbit = { theta: 0, target: 0, yaw: 0, pitch: 0, ty: 0, tp: 0 };
  const ray = new THREE.Raycaster();

  function activate(fromAngle = 0) {
    group.visible = true;
    orbit.theta = orbit.target = fromAngle;
    if (scene.fog) { scene.fog.density = 0.015; scene.fog.color.set(0x040e16); }
  }
  function onWheel(e) { orbit.target += e.deltaY * .0016; }
  let down = null;
  function onPointerDown(e) { down = { x: e.clientX, y: e.clientY, theta: orbit.target, yaw: orbit.ty }; }
  function onPointerMove(e, mouseNdc) {
    if (down) { const dx = e.clientX - down.x, dy = e.clientY - down.y;
      if (e.pointerType !== 'mouse') { orbit.target = down.theta + dx * .004; orbit.ty = THREE.MathUtils.clamp(down.yaw - dy * .0015, -.5, .5); } }
    else if (e.pointerType === 'mouse') { orbit.ty = -mouseNdc.x * .4; orbit.tp = mouseNdc.y * .22; }
  }
  function onPointerUp(e, mouseNdc, moved) {
    if (!moved) { ray.setFromCamera(mouseNdc, camera);
      const hit = ray.intersectObjects(stations.map(s => s.plate), false)[0];
      if (hit) { const s = stations.find(s => s.plate === hit.object);
        const curMod = ((orbit.theta % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
        let diff = s.angle - curMod; diff = ((diff + Math.PI) % (Math.PI * 2)) - Math.PI;
        orbit.target = orbit.theta + diff;
        window.dispatchEvent(new CustomEvent('vault:sector', { detail: { name: s.name } })); } }
    down = null;
  }
  function update(dt, t) {
    if (!group.visible) return;
    orbit.theta += (orbit.target - orbit.theta) * (1 - Math.exp(-dt * 4));
    const th = orbit.theta;
    camera.position.set(Math.sin(th) * camR, 1.62, Math.cos(th) * camR);
    const kl = 1 - Math.exp(-dt * 4);
    orbit.yaw += (orbit.ty - orbit.yaw) * kl; orbit.pitch += (orbit.tp - orbit.pitch) * kl;
    camera.rotation.set(orbit.pitch - 0.05, th + orbit.yaw, 0);
    core.animate(t);
    stations.forEach(s => { s.spot.intensity = 1.4 + Math.sin(t * 2 + s.angle * 3) * .3; });
  }
  return { group, update, onWheel, onPointerDown, onPointerMove, onPointerUp, activate, stations, orbit, camR };
}
