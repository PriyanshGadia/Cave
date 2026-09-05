// mist.js — soft volumetric mist wisps. No image files: alpha falloff is computed in-shader.
import * as THREE from 'three';

export function buildMist({ scene, LOW, bounds, warmSource }) {
  const COUNT = LOW ? 30 : 80;
  const base = new THREE.PlaneGeometry(1, 1);
  const geo = new THREE.InstancedBufferGeometry();
  geo.setAttribute('position', base.getAttribute('position'));
  geo.setAttribute('uv', base.getAttribute('uv'));
  geo.setIndex(base.getIndex());

  const off = new Float32Array(COUNT * 3), sc = new Float32Array(COUNT),
        sd = new Float32Array(COUNT), wm = new Float32Array(COUNT), sp = new Float32Array(COUNT);
  const hash = n => { const s = Math.sin(n * 12.9898) * 43758.5453; return s - Math.floor(s); };
  for (let i = 0; i < COUNT; i++) {
    const x = (hash(i * 1.7) - .5) * bounds.x, y = bounds.y0 + hash(i * 2.3) * bounds.yH, z = bounds.z0 + hash(i * 3.1) * bounds.zL;
    off.set([x, y, z], i * 3);
    sc[i] = bounds.sizeMin + hash(i * 5.3) * (bounds.sizeMax - bounds.sizeMin);
    sd[i] = hash(i * 7.1) * 100;
    wm[i] = 1 - THREE.MathUtils.clamp(Math.hypot(x - warmSource.x, z - warmSource.z) / 3.2, 0, 1);
    sp[i] = .04 + hash(i * 9.7) * .07;
  }
  geo.setAttribute('iOffset', new THREE.InstancedBufferAttribute(off, 3));
  geo.setAttribute('iScale', new THREE.InstancedBufferAttribute(sc, 1));
  geo.setAttribute('iSeed', new THREE.InstancedBufferAttribute(sd, 1));
  geo.setAttribute('iWarm', new THREE.InstancedBufferAttribute(wm, 1));
  geo.setAttribute('iSpeed', new THREE.InstancedBufferAttribute(sp, 1));
  geo.instanceCount = COUNT;

  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    uniforms: { uT: { value: 0 }, uWarm: { value: new THREE.Color(0xffa561) }, uCool: { value: new THREE.Color(0x6f7a86) }, uOpacity: { value: LOW ? .14 : .2 } },
    vertexShader: `
      attribute vec3 iOffset; attribute float iScale, iSeed, iWarm, iSpeed;
      uniform float uT; varying vec2 vUv; varying float vWarm, vFade;
      void main(){
        vUv = uv; vWarm = iWarm;
        float rise = mod(uT * iSpeed + iSeed, 1.0);
        vFade = sin(rise * 3.14159265);
        vec3 p = iOffset + vec3(sin(uT*.15+iSeed)*.25, rise*1.6, cos(uT*.12+iSeed)*.2);
        vec3 camR = normalize(vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]));
        vec3 camU = normalize(vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]));
        vec3 wp = p + (camR*position.x + camU*position.y) * iScale;
        gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
      }`,
    fragmentShader: `
      uniform vec3 uWarm, uCool; uniform float uOpacity, uT;
      varying vec2 vUv; varying float vWarm, vFade;
      float hash21(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
      float noise(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f);
        float a=hash21(i),b=hash21(i+vec2(1,0)),c=hash21(i+vec2(0,1)),d=hash21(i+vec2(1,1));
        return mix(mix(a,b,f.x),mix(c,d,f.x),f.y); }
      void main(){
        vec2 d = vUv - .5; float r = length(d)*2.0;
        float soft = smoothstep(1.0, 0.0, r);
        float wob = noise(vUv*3.0+uT*.05)*.5 + noise(vUv*7.0-uT*.03)*.3;
        float a = soft*soft*clamp(wob+.35,0.0,1.0)*vFade*uOpacity;
        if (a < 0.01) discard;
        gl_FragColor = vec4(mix(uCool, uWarm, vWarm), a);
      }`
  });
  const mesh = new THREE.Mesh(geo, mat); mesh.frustumCulled = false; scene.add(mesh);
  return { update: t => { mat.uniforms.uT.value = t; }, mesh };
}
