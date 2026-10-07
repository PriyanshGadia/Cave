/**
 * VAULT-01 // ABOUT CINEMATIC
 * A single-scene, single-camera cinematic installation.
 *
 * Design contract:
 *  - authored coordinates, never automatic camera fitting
 *  - deterministic progress, never Math.random() for scene choreography
 *  - six real armor assemblies loaded once
 *  - gunmetal black + blood red with restrained cyan instrumentation
 *  - no HTML action button at the floor
 *  - the floor itself becomes the discovery
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { initializeArmorEffects, updateArmorEffects } from './public/js/armor-effects.js';

gsap.registerPlugin(ScrollTrigger);

// -----------------------------------------------------------------------------
// 01 // GLOBAL CONSTANTS
// -----------------------------------------------------------------------------
const VERSION = 'ABOUT-CINEMATIC-MASTER-01';
const DPR = 1;
const TAU = Math.PI * 2;
const PI = Math.PI;

const COLORS = Object.freeze({
  void: 0x000000,
  gun0: 0x050607,
  gun1: 0x0d0f11,
  gun2: 0x171a1d,
  gun3: 0x252a2e,
  gun4: 0x3a4248,
  steel: 0x69747b,
  blood0: 0x160000,
  blood1: 0x350000,
  blood2: 0x680000,
  blood3: 0xb60000,
  bloodHot: 0xff2b20,
  cyan: 0x7deaf0,
  cyanHot: 0xe1ffff,
  white: 0xf2f4f5,
  amber: 0x9a5b1a,
  graphite: 0x030405
});

const WORLD = Object.freeze({
  floorY: -7.2,
  workshopZ: -42,
  doorZ: 8,
  padZ: -104,
  pitZ: -104,
  tunnelDepth: 180,
  suitScale: 24.5,
  showcaseScale: 58,
  cameraNear: 0.08,
  cameraFar: 1800
});

const PART_ORDER = Object.freeze([
  'boots',
  'legs',
  'torso',
  'arms',
  'gauntlets',
  'helmet'
]);

const PART_META = Object.freeze({
  boots: {
    index: '01 / MOBILITY',
    title: 'BOOT SYSTEM',
    copy: 'Propulsion, stabilization and articulation begin at the smallest mechanical layer. Every millimetre has a job.',
    camera: [5.9, 1.5, 8.4],
    target: [-1.3, 0.15, -7.0],
    focus: [-2.2, -0.6, -9.2],
    yaw: -0.24
  },
  legs: {
    index: '02 / STRUCTURE',
    title: 'LOAD FRAME',
    copy: 'Load-bearing kinematics built around controlled movement, joint protection and brutal mechanical honesty.',
    camera: [5.5, 2.0, 8.0],
    target: [-1.5, 0.0, -7.0],
    focus: [-2.0, 0.3, -8.5],
    yaw: -0.15
  },
  torso: {
    index: '03 / CORE',
    title: 'CENTRAL ARCHITECTURE',
    copy: 'The torso is where power, thermal management, structure and control become one machine.',
    camera: [5.3, 2.5, 8.2],
    target: [-1.6, 0.1, -7.4],
    focus: [-1.7, 0.3, -8.5],
    yaw: -0.10
  },
  arms: {
    index: '04 / CONTROL',
    title: 'ACTUATION CHAIN',
    copy: 'Intent becomes motion through nested bearings, actuators, articulated armour and controlled force.',
    camera: [5.8, 2.5, 8.6],
    target: [-1.6, 0.2, -7.5],
    focus: [-1.8, 0.2, -8.8],
    yaw: -0.18
  },
  gauntlets: {
    index: '05 / OUTPUT',
    title: 'ENERGY DELIVERY',
    copy: 'A compact interface for turning a control decision into a precise physical output.',
    camera: [5.2, 1.8, 7.5],
    target: [-1.8, 0.0, -7.5],
    focus: [-2.0, 0.0, -8.5],
    yaw: -0.26
  },
  helmet: {
    index: '06 / PERCEPTION',
    title: 'THE SENSORIUM',
    copy: 'Perception is infrastructure. Optics, protection and information converge into one forward-facing system.',
    camera: [5.4, 2.8, 7.8],
    target: [-1.5, 0.6, -7.2],
    focus: [-1.7, 0.7, -8.2],
    yaw: -0.14
  }
});

const GLB_PATH = part => `/assets/armor/vault-mk1/final/${part}.glb`;

// -----------------------------------------------------------------------------
// 02 // DOM CONTRACT
// -----------------------------------------------------------------------------
const canvas = document.querySelector('#webgl-canvas');
const identity = document.querySelector('#identity-layer');
const hud = document.querySelector('#hud');
const hudReadout = document.querySelector('#hud-readout');
const hudDepth = document.querySelector('#hud-depth');
const hudChapter = document.querySelector('#hud-chapter');
const hudCoordinate = document.querySelector('#hud-coordinate');
const railProgress = document.querySelector('#scroll-rail-progress');
const cursor = document.querySelector('#interaction-cursor');
const endFade = document.querySelector('#cinematic-end');

const copyNodes = Object.fromEntries(
  [...document.querySelectorAll('.chapter-copy')].map(node => [node.dataset.chapter, node])
);

// -----------------------------------------------------------------------------
// 03 // RENDERER / SCENE / CAMERA
// -----------------------------------------------------------------------------
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: false,
  powerPreference: 'high-performance',
  preserveDrawingBuffer: false
});

renderer.setPixelRatio(DPR);
renderer.setSize(window.innerWidth, window.innerHeight, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.86;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(COLORS.void);
scene.fog = new THREE.FogExp2(0x020303, 0.0105);

const camera = new THREE.PerspectiveCamera(
  48,
  window.innerWidth / window.innerHeight,
  WORLD.cameraNear,
  WORLD.cameraFar
);

camera.position.set(0, 1.4, 34);
camera.rotation.order = 'YXZ';

const clock = new THREE.Clock();
let elapsed = 0;
let delta = 0;

const sceneRoot = new THREE.Group();
sceneRoot.name = 'ABOUT_SCENE_ROOT';
scene.add(sceneRoot);

const environmentRoot = new THREE.Group();
environmentRoot.name = 'ENVIRONMENT_ROOT';
sceneRoot.add(environmentRoot);

const armorRoot = new THREE.Group();
armorRoot.name = 'ARMOR_ROOT';
sceneRoot.add(armorRoot);

const effectRoot = new THREE.Group();
effectRoot.name = 'EFFECT_ROOT';
sceneRoot.add(effectRoot);

const interactionRoot = new THREE.Group();
interactionRoot.name = 'INTERACTION_ROOT';
sceneRoot.add(interactionRoot);

// -----------------------------------------------------------------------------
// 04 // MATERIAL LIBRARY
// -----------------------------------------------------------------------------
function standardMaterial(color, metalness, roughness, options = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    metalness,
    roughness,
    side: options.side ?? THREE.FrontSide,
    emissive: options.emissive ?? 0x000000,
    emissiveIntensity: options.emissiveIntensity ?? 0,
    transparent: options.transparent ?? false,
    opacity: options.opacity ?? 1,
    depthWrite: options.depthWrite ?? true
  });
}

const MAT = {
  gun0: standardMaterial(COLORS.gun0, 0.92, 0.29),
  gun1: standardMaterial(COLORS.gun1, 0.94, 0.24),
  gun2: standardMaterial(COLORS.gun2, 0.95, 0.20),
  gun3: standardMaterial(COLORS.gun3, 0.91, 0.26),
  steel: standardMaterial(COLORS.steel, 0.98, 0.18),
  graphite: standardMaterial(COLORS.graphite, 0.78, 0.58),
  blood: standardMaterial(COLORS.blood1, 0.72, 0.34, {
    emissive: COLORS.blood0,
    emissiveIntensity: 0.12
  }),
  bloodHot: standardMaterial(COLORS.blood2, 0.65, 0.26, {
    emissive: COLORS.blood3,
    emissiveIntensity: 0.8
  }),
  cyan: standardMaterial(COLORS.cyan, 0.38, 0.18, {
    emissive: COLORS.cyan,
    emissiveIntensity: 2.2,
    transparent: true,
    opacity: 0.92
  }),
  cyanDim: standardMaterial(COLORS.cyan, 0.30, 0.24, {
    emissive: COLORS.cyan,
    emissiveIntensity: 0.45,
    transparent: true,
    opacity: 0.5
  }),
  blackGlass: standardMaterial(0x020303, 0.5, 0.08, {
    emissive: 0x050607,
    emissiveIntensity: 0.25
  }),
  amber: standardMaterial(COLORS.amber, 0.7, 0.28, {
    emissive: 0x5a2700,
    emissiveIntensity: 0.3
  })
};

// -----------------------------------------------------------------------------
// 05 // PROCEDURAL SHADER LIBRARY
// -----------------------------------------------------------------------------
const SHADERS = {
  brushedMetalVertex: `
    varying vec3 vWorldPosition;
    varying vec3 vNormalWorld;
    void main() {
      vec4 world = modelMatrix * vec4(position, 1.0);
      vWorldPosition = world.xyz;
      vNormalWorld = normalize(mat3(modelMatrix) * normal);
      gl_Position = projectionMatrix * viewMatrix * world;
    }
  `,

  brushedMetalFragment: `
    uniform vec3 uBase;
    uniform vec3 uEdge;
    uniform float uTime;
    uniform float uWear;
    varying vec3 vWorldPosition;
    varying vec3 vNormalWorld;

    float hash21(vec2 p) {
      p = fract(p * vec2(123.34, 456.21));
      p += dot(p, p + 45.32);
      return fract(p.x * p.y);
    }

    float noise21(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      f = f*f*(3.0-2.0*f);
      float a = hash21(i);
      float b = hash21(i + vec2(1.0,0.0));
      float c = hash21(i + vec2(0.0,1.0));
      float d = hash21(i + vec2(1.0,1.0));
      return mix(mix(a,b,f.x),mix(c,d,f.x),f.y);
    }

    void main() {
      vec3 n = normalize(vNormalWorld);
      vec3 viewDir = normalize(cameraPosition - vWorldPosition);
      float fresnel = pow(1.0 - max(dot(n, viewDir), 0.0), 4.0);
      float grainA = noise21(vWorldPosition.xz * 18.0 + vec2(uTime * 0.01));
      float grainB = noise21(vWorldPosition.xy * 52.0);
      float brushing = 0.5 + 0.5 * sin(vWorldPosition.y * 210.0 + grainA * 5.0);
      float scratches = smoothstep(0.56, 0.82, grainB) * uWear;
      vec3 metal = mix(uBase, uBase * (0.72 + brushing * 0.22), 0.52);
      metal *= 1.0 - scratches * 0.16;
      metal += uEdge * fresnel * 0.22;
      gl_FragColor = vec4(metal, 1.0);
    }
  `,

  bloodPulseVertex: `
    varying vec3 vWorldPosition;
    void main() {
      vec4 world = modelMatrix * vec4(position, 1.0);
      vWorldPosition = world.xyz;
      gl_Position = projectionMatrix * viewMatrix * world;
    }
  `,

  bloodPulseFragment: `
    uniform vec3 uBase;
    uniform vec3 uHot;
    uniform float uTime;
    uniform float uIntensity;
    varying vec3 vWorldPosition;
    void main() {
      float pulse = 0.72 + 0.28 * sin(uTime * 2.0 + vWorldPosition.y * 0.9);
      float radial = 0.55 + 0.45 * sin(length(vWorldPosition.xz) * 5.0 - uTime * 1.7);
      vec3 c = mix(uBase, uHot, pulse * radial * 0.35);
      gl_FragColor = vec4(c * (0.55 + uIntensity * pulse), 1.0);
    }
  `,

  scanlineVertex: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
    }
  `,

  scanlineFragment: `
    uniform float uTime;
    uniform vec3 uColor;
    uniform float uOpacity;
    varying vec2 vUv;
    void main() {
      float line = smoothstep(0.18, 0.0, abs(fract(vUv.y * 96.0 + uTime * 0.55) - 0.5));
      float edge = pow(1.0 - abs(vUv.x * 2.0 - 1.0), 3.0);
      float alpha = line * edge * uOpacity;
      gl_FragColor = vec4(uColor, alpha);
    }
  `,

  fogVertex: `
    varying vec3 vWorldPosition;
    void main() {
      vec4 world = modelMatrix * vec4(position,1.0);
      vWorldPosition = world.xyz;
      gl_Position = projectionMatrix * viewMatrix * world;
    }
  `,

  fogFragment: `
    uniform float uTime;
    uniform vec3 uColor;
    uniform float uDensity;
    varying vec3 vWorldPosition;
    float hash21(vec2 p) {
      p = fract(p * vec2(127.1,311.7));
      p += dot(p,p+34.5);
      return fract(p.x*p.y);
    }
    float noise(vec3 p) {
      vec3 i=floor(p), f=fract(p);
      f=f*f*(3.0-2.0*f);
      float n=dot(i,vec3(1.0,57.0,113.0));
      float a=hash21(vec2(n,n+1.0));
      float b=hash21(vec2(n+57.0,n+58.0));
      float c=hash21(vec2(n+113.0,n+114.0));
      float d=hash21(vec2(n+170.0,n+171.0));
      return mix(mix(a,b,f.x),mix(c,d,f.x),f.y);
    }
    void main() {
      float n = noise(vWorldPosition * 0.035 + vec3(uTime*0.008));
      float dist = length(vWorldPosition - cameraPosition);
      float alpha = smoothstep(5.0, 80.0, dist) * n * uDensity;
      gl_FragColor = vec4(uColor, alpha);
    }
  `,

  floorVertex: `
    varying vec3 vWorld;
    varying vec2 vUv;
    void main() {
      vUv = uv;
      vec4 world = modelMatrix * vec4(position,1.0);
      vWorld = world.xyz;
      gl_Position = projectionMatrix * viewMatrix * world;
    }
  `,

  floorFragment: `
    uniform float uTime;
    uniform vec3 uBase;
    uniform vec3 uGrid;
    uniform vec3 uPulse;
    uniform float uPulseStrength;
    uniform vec2 uPointer;
    varying vec3 vWorld;
    varying vec2 vUv;

    float hexGrid(vec2 p) {
      p *= 0.23;
      p.x *= 1.1547;
      p.y += mod(floor(p.x),2.0)*0.5;
      vec2 gv = fract(p)-0.5;
      float d = length(gv*vec2(1.0,1.1547));
      return smoothstep(0.44,0.40,d);
    }

    void main() {
      float grid = hexGrid(vWorld.xz);
      float radial = exp(-length(vWorld.xz-uPointer*vec2(1.0,0.7))*0.34);
      float wave = sin(length(vWorld.xz-uPointer)-uTime*1.6)*0.5+0.5;
      vec3 c = uBase + uGrid*grid;
      c += uPulse * radial * wave * uPulseStrength;
      gl_FragColor = vec4(c,1.0);
    }
  `,

  energyVertex: `
    varying vec2 vUv;
    void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}
  `,

  energyFragment: `
    uniform float uTime;
    uniform vec3 uColor;
    uniform float uStrength;
    varying vec2 vUv;
    void main(){
      float p=fract(vUv.x-uTime*0.12);
      float head=smoothstep(0.13,0.0,p)*smoothstep(0.0,0.22,p);
      float edge=pow(1.0-abs(vUv.y*2.0-1.0),2.0);
      gl_FragColor=vec4(uColor,head*edge*uStrength);
    }
  `,

  apertureVertex: `
    varying vec3 vNormalWorld;
    varying vec3 vWorld;
    void main(){
      vec4 world=modelMatrix*vec4(position,1.0);
      vWorld=world.xyz;
      vNormalWorld=normalize(mat3(modelMatrix)*normal);
      gl_Position=projectionMatrix*viewMatrix*world;
    }
  `,

  apertureFragment: `
    uniform float uOpen;
    uniform vec3 uBase;
    uniform vec3 uEdge;
    varying vec3 vNormalWorld;
    varying vec3 vWorld;
    void main(){
      vec3 v=normalize(cameraPosition-vWorld);
      float f=pow(1.0-max(dot(vNormalWorld,v),0.0),3.0);
      vec3 c=mix(uBase,uEdge,f);
      gl_FragColor=vec4(c*(0.55+uOpen*0.25),1.0);
    }
  `
};

// -----------------------------------------------------------------------------
// 06 // SHADER MATERIAL FACTORIES
// -----------------------------------------------------------------------------
function makeBrushedMetalMaterial(base = 0x101214, edge = 0x566068, wear = 0.32) {
  return new THREE.ShaderMaterial({
    vertexShader: SHADERS.brushedMetalVertex,
    fragmentShader: SHADERS.brushedMetalFragment,
    uniforms: {
      uBase: { value: new THREE.Color(base) },
      uEdge: { value: new THREE.Color(edge) },
      uTime: { value: 0 },
      uWear: { value: wear }
    },
    metalness: 0.95,
    roughness: 0.24
  });
}

function makeBloodPulseMaterial(intensity = 1) {
  return new THREE.ShaderMaterial({
    vertexShader: SHADERS.bloodPulseVertex,
    fragmentShader: SHADERS.bloodPulseFragment,
    uniforms: {
      uBase: { value: new THREE.Color(COLORS.blood1) },
      uHot: { value: new THREE.Color(COLORS.bloodHot) },
      uTime: { value: 0 },
      uIntensity: { value: intensity }
    },
    metalness: 0.55,
    roughness: 0.28
  });
}

function makeScanlineMaterial(color = COLORS.cyan) {
  return new THREE.ShaderMaterial({
    vertexShader: SHADERS.scanlineVertex,
    fragmentShader: SHADERS.scanlineFragment,
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(color) },
      uOpacity: { value: 0 }
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide
  });
}

function makeFloorMaterial() {
  return new THREE.ShaderMaterial({
    vertexShader: SHADERS.floorVertex,
    fragmentShader: SHADERS.floorFragment,
    uniforms: {
      uTime: { value: 0 },
      uBase: { value: new THREE.Color(0x07090a) },
      uGrid: { value: new THREE.Color(0x1b1f22) },
      uPulse: { value: new THREE.Color(COLORS.blood2) },
      uPulseStrength: { value: 0.0 },
      uPointer: { value: new THREE.Vector2(0,0) }
    }
  });
}

function makeApertureMaterial() {
  return new THREE.ShaderMaterial({
    vertexShader: SHADERS.apertureVertex,
    fragmentShader: SHADERS.apertureFragment,
    uniforms: {
      uOpen: { value: 0 },
      uBase: { value: new THREE.Color(COLORS.gun2) },
      uEdge: { value: new THREE.Color(COLORS.blood2) }
    },
    side: THREE.DoubleSide
  });
}

// -----------------------------------------------------------------------------
// 07 // PROCEDURAL TEXTURE FACTORY
// -----------------------------------------------------------------------------
function makeCanvasTexture(width, height, painter, options = {}) {
  const c = document.createElement('canvas');
  c.width = width;
  c.height = height;
  const ctx = c.getContext('2d', { alpha: true });
  painter(ctx, width, height);
  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = options.wrapS ?? THREE.RepeatWrapping;
  texture.wrapT = options.wrapT ?? THREE.RepeatWrapping;
  texture.repeat.set(options.repeatX ?? 1, options.repeatY ?? 1);
  texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  return texture;
}

function makeBrushedTexture(size = 512) {
  return makeCanvasTexture(size, size, (ctx,w,h) => {
    ctx.fillStyle = '#111315';
    ctx.fillRect(0,0,w,h);
    for (let y=0;y<h;y++) {
      const v = Math.floor(12 + 12 * Math.sin(y*0.31));
      ctx.fillStyle = `rgb(${v},${v+2},${v+3})`;
      ctx.fillRect(0,y,w,1);
    }
    for (let i=0;i<1800;i++) {
      const y = Math.floor(Math.random()*h);
      const a = Math.random()*0.08;
      ctx.fillStyle = `rgba(210,220,225,${a})`;
      ctx.fillRect(0,y,w,1);
    }
  });
}

function makeCarbonTexture(size = 256) {
  return makeCanvasTexture(size,size,(ctx,w,h)=>{
    ctx.fillStyle='#070809';
    ctx.fillRect(0,0,w,h);
    const s=12;
    for(let y=-w;y<w*2;y+=s){
      ctx.strokeStyle='rgba(48,55,60,.28)';
      ctx.lineWidth=5;
      ctx.beginPath();ctx.moveTo(y,0);ctx.lineTo(y+w,w);ctx.stroke();
      ctx.strokeStyle='rgba(0,0,0,.48)';
      ctx.lineWidth=3;
      ctx.beginPath();ctx.moveTo(y+5,0);ctx.lineTo(y+w+5,w);ctx.stroke();
    }
  });
}

function makeCircuitTexture(size = 512) {
  return makeCanvasTexture(size,size,(ctx,w,h)=>{
    ctx.fillStyle='#080a0b';ctx.fillRect(0,0,w,h);
    ctx.strokeStyle='rgba(110,120,128,.16)';ctx.lineWidth=2;
    for(let i=0;i<26;i++){
      const x=(i*71)%w;
      const y=(i*113)%h;
      ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+70,y);ctx.lineTo(x+70,y+35);ctx.stroke();
      ctx.fillStyle='rgba(194,10,10,.42)';
      ctx.beginPath();ctx.arc(x+70,y+35,3,0,TAU);ctx.fill();
    }
  });
}

const TEXTURES = {
  brushed: makeBrushedTexture(512),
  carbon: makeCarbonTexture(256),
  circuit: makeCircuitTexture(512)
};

// -----------------------------------------------------------------------------
// 08 // GEOMETRY FACTORY
// -----------------------------------------------------------------------------
function addMesh(parent, geometry, material, name, position = [0,0,0], rotation = [0,0,0], scale = [1,1,1]) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = name;
  mesh.position.set(...position);
  mesh.rotation.set(...rotation);
  mesh.scale.set(...scale);
  parent.add(mesh);
  return mesh;
}

function addBox(parent,name,size,material,position=[0,0,0],rotation=[0,0,0],bevel=0) {
  let geometry;
  if (bevel > 0) {
    geometry = new THREE.BoxGeometry(size[0],size[1],size[2],2,2,2);
  } else {
    geometry = new THREE.BoxGeometry(...size);
  }
  return addMesh(parent,geometry,material,name,position,rotation);
}

function addCylinder(parent,name,radius,height,material,position=[0,0,0],rotation=[0,0,0],segments=32) {
  return addMesh(parent,new THREE.CylinderGeometry(radius,radius,height,segments,1,false),material,name,position,rotation);
}

function addTorus(parent,name,major,minor,material,position=[0,0,0],rotation=[0,0,0],segments=64,tubeSegments=10) {
  return addMesh(parent,new THREE.TorusGeometry(major,minor, tubeSegments, segments),material,name,position,rotation);
}

function addSphere(parent,name,radius,material,position=[0,0,0],segments=24) {
  return addMesh(parent,new THREE.SphereGeometry(radius,segments,segments),material,name,position);
}

function addIBeam(parent,name,length,height,width,material,position=[0,0,0],rotation=[0,0,0]) {
  const g = new THREE.Group();
  g.name=name;
  g.position.set(...position);
  g.rotation.set(...rotation);
  const web=addBox(g,`${name}_WEB`,[width*0.26,height,length],material);
  web.position.z=0;
  addBox(g,`${name}_FLANGE_A`,[width,height*0.12,length],material,[0,height*0.44,0]);
  addBox(g,`${name}_FLANGE_B`,[width,height*0.12,length],material,[0,-height*0.44,0]);
  parent.add(g);
  return g;
}

function addBolt(parent,name,radius,depth,material,position=[0,0,0],rotation=[0,0,0]) {
  const bolt=addCylinder(parent,name,radius,depth,material,position,rotation,16);
  const head=addCylinder(parent,`${name}_HEAD`,radius*1.18,depth*0.32,material,[position[0],position[1]+depth*0.58,position[2]],rotation,16);
  head.userData.hardware=true;
  bolt.userData.hardware=true;
  return bolt;
}

function addPiston(parent,name,length,radius,materialA,materialB,position=[0,0,0],rotation=[0,0,0]) {
  const g=new THREE.Group();g.name=name;g.position.set(...position);g.rotation.set(...rotation);
  addCylinder(g,`${name}_HOUSING`,radius*1.35,length*0.62,materialA,[0,-length*0.16,0],[PI/2,0,0],20);
  addCylinder(g,`${name}_ROD`,radius*0.42,length*0.64,materialB,[0,length*0.34,0],[PI/2,0,0],16);
  addTorus(g,`${name}_COLLAR`,radius*1.2,radius*0.16,materialB,[0,length*0.08,0],[PI/2,0,0],32,8);
  parent.add(g);return g;
}

function addCable(parent,name,a,b,radius,material) {
  const va=new THREE.Vector3(...a), vb=new THREE.Vector3(...b);
  const mid=va.clone().add(vb).multiplyScalar(0.5);
  const len=va.distanceTo(vb);
  const dir=vb.clone().sub(va).normalize();
  const g=new THREE.Group();g.name=name;g.position.copy(mid);
  const tube=new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,len,10),material);
  tube.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),dir);
  g.add(tube);parent.add(g);return g;
}

function addPanel(parent,name,width,height,depth,material,position=[0,0,0],rotation=[0,0,0]) {
  const g=new THREE.Group();g.name=name;g.position.set(...position);g.rotation.set(...rotation);
  addBox(g,`${name}_PLATE`,[width,height,depth],material);
  const border=makeBloodPulseMaterial(0.55);
  addBox(g,`${name}_SEAM_TOP`,[width*0.78,0.012,0.008],border,[0,height*0.5+0.006,depth*0.5+0.004]);
  addBox(g,`${name}_SEAM_SIDE`,[0.012,height*0.78,0.008],border,[width*0.5+0.006,0,depth*0.5+0.004]);
  addBolt(g,`${name}_BOLT_A`,0.018,0.012,MAT.steel,[-width*.36,height*.34,depth*.55],[PI/2,0,0]);
  addBolt(g,`${name}_BOLT_B`,0.018,0.012,MAT.steel,[width*.36,height*.34,depth*.55],[PI/2,0,0]);
  addBolt(g,`${name}_BOLT_C`,0.018,0.012,MAT.steel,[-width*.36,-height*.34,depth*.55],[PI/2,0,0]);
  addBolt(g,`${name}_BOLT_D`,0.018,0.012,MAT.steel,[width*.36,-height*.34,depth*.55],[PI/2,0,0]);
  parent.add(g);return g;
}

function addVent(parent,name,width,height,depth,material,position=[0,0,0],rotation=[0,0,0],slots=6) {
  const g=new THREE.Group();g.name=name;g.position.set(...position);g.rotation.set(...rotation);
  addBox(g,`${name}_FRAME`,[width,height,depth],material);
  const slotMat=MAT.blackGlass;
  for(let i=0;i<slots;i++){
    const t=(i/(slots-1))-0.5;
    addBox(g,`${name}_SLOT_${i}`,[width*.09,height*.78,depth*1.06],slotMat,[t*width*.76,0,0]);
  }
  parent.add(g);return g;
}

function addRib(parent,name,width,height,depth,material,position=[0,0,0],rotation=[0,0,0]) {
  const g=new THREE.Group();g.name=name;g.position.set(...position);g.rotation.set(...rotation);
  addBox(g,`${name}_SPINE`,[width*.16,height,depth],material);
  addBox(g,`${name}_LEFT`,[width*.38,height*.16,depth],material,[-width*.28,0,0]);
  addBox(g,`${name}_RIGHT`,[width*.38,height*.16,depth],material,[width*.28,0,0]);
  parent.add(g);return g;
}

// -----------------------------------------------------------------------------
// 09 // DOOR ASSEMBLY
// -----------------------------------------------------------------------------
const doorRoot = new THREE.Group();
doorRoot.name='DOOR_ASSEMBLY';
doorRoot.position.set(0,0,WORLD.doorZ);
environmentRoot.add(doorRoot);

const leftDoor = new THREE.Group();
leftDoor.name='leftDoor';
const rightDoor = new THREE.Group();
rightDoor.name='rightDoor';
doorRoot.add(leftDoor,rightDoor);

function buildDoorLeaf(parent,side) {
  const sign=side==='L'?-1:1;
  addBox(parent,`DOOR_${side}_CORE`,[18,34,1.9],makeBrushedMetalMaterial(0x0e1113,0x485158,.48),[sign*9,0,0]);
  addBox(parent,`DOOR_${side}_INNER`,[17.4,32.6,.35],MAT.gun1,[sign*9,0,-1.03]);
  addBox(parent,`DOOR_${side}_BLOOD_RAIL`,[.18,31,.05],makeBloodPulseMaterial(.7),[sign*17.25,0,-1.23]);
  addBox(parent,`DOOR_${side}_CENTER_RAIL`,[.12,30,.06],MAT.steel,[0,0,-1.22]);
  for(let y=-13;y<=13;y+=4.33){
    addBolt(parent,`DOOR_${side}_BOLT_${y.toFixed(2)}`,.17,.14,MAT.steel,[sign*17.25,y,-1.22],[PI/2,0,0]);
  }
  for(let y=-12;y<=12;y+=6){
    addPiston(parent,`DOOR_${side}_PISTON_${y}`,4.8,.26,MAT.gun3,MAT.steel,[sign*14.8,y,-1.65],[0,sign*.08,0]);
  }
  addTorus(parent,`DOOR_${side}_LOCK`,2.1,.13,makeBloodPulseMaterial(.5),[sign*2.5,0,-1.24],[PI/2,0,0],48,10);
  addPanel(parent,`DOOR_${side}_SERVICE`,3.8,5.2,.22,MAT.gun2,[sign*12.6,-5,-1.2]);
  addVent(parent,`DOOR_${side}_VENT`,4.8,2.5,.22,MAT.blackGlass,[sign*10,9,-1.2],[0,0,0],8);
}
buildDoorLeaf(leftDoor,'L');
buildDoorLeaf(rightDoor,'R');
leftDoor.position.x=-9;
rightDoor.position.x=9;

// -----------------------------------------------------------------------------
// 10 // WORKSHOP ENVIRONMENT
// -----------------------------------------------------------------------------
const workshop = new THREE.Group();
workshop.name='WORKSHOP';
workshop.position.set(0,0,WORLD.workshopZ);
environmentRoot.add(workshop);

const floorMaterial = makeFloorMaterial();
const workshopFloor = addMesh(
  workshop,
  new THREE.PlaneGeometry(100,150,1,1),
  floorMaterial,
  'WORKSHOP_FLOOR',
  [0,WORLD.floorY,35],
  [-PI/2,0,0]
);

function buildWorkshopShell() {
  addBox(workshop,'BACK_WALL',[100,42,2],MAT.gun1,[0,14,-35]);
  addBox(workshop,'LEFT_WALL',[2,42,110],MAT.gun0,[-50,14,20]);
  addBox(workshop,'RIGHT_WALL',[2,42,110],MAT.gun0,[50,14,20]);
  addBox(workshop,'CEILING',[100,2,110],MAT.gun0,[0,35,20]);

  for(let x=-45;x<=45;x+=9){
    addIBeam(workshop,`CEILING_BEAM_${x}`,90,1.0,1.0,MAT.gun2,[x,33,20],[0,PI/2,0]);
  }
  for(let z=-25;z<=70;z+=11){
    addIBeam(workshop,`SIDE_BEAM_L_${z}`,34,1.0,1.0,MAT.gun2,[-46,15,z],[0,0,PI/2]);
    addIBeam(workshop,`SIDE_BEAM_R_${z}`,34,1.0,1.0,MAT.gun2,[46,15,z],[0,0,PI/2]);
  }

  for(let z=-20;z<=55;z+=9){
    addBox(workshop,`RED_STRIP_L_${z}`,[.12,.16,7],MAT.bloodHot,[-48.85,2.0,z]);
    addBox(workshop,`RED_STRIP_R_${z}`,[.12,.16,7],MAT.bloodHot,[48.85,2.0,z]);
  }
}
buildWorkshopShell();

// -----------------------------------------------------------------------------
// 11 // WORKBENCH
// -----------------------------------------------------------------------------
const bench = new THREE.Group();
bench.name='workbench';
bench.position.set(0,WORLD.floorY+3.2,WORLD.workshopZ-19);
workshop.add(bench);

addBox(bench,'BENCH_TOP',[16,1.1,7],makeBrushedMetalMaterial(0x111416,0x4b555b,.62),[0,0,0]);
addBox(bench,'BENCH_CORE',[14.8,1.2,5.8],MAT.graphite,[0,-1.15,0]);
for(const x of [-6.7,6.7]){
  for(const z of [-2.5,2.5]){
    addBox(bench,`BENCH_LEG_${x}_${z}`,[.7,4.5,.7],MAT.gun2,[x,-3.0,z]);
    addBolt(bench,`BENCH_FOOT_${x}_${z}`,.22,.14,MAT.steel,[x,-5.25,z],[PI/2,0,0]);
  }
}
addPanel(bench,'BENCH_CONTROL',3.8,1.2,.3,MAT.gun2,[0,.65,-3.65],[PI/2,0,0]);
addVent(bench,'BENCH_VENT_L',2.8,.7,.28,MAT.blackGlass,[-5.0,.65,-3.65],[PI/2,0,0],7);
addVent(bench,'BENCH_VENT_R',2.8,.7,.28,MAT.blackGlass,[5.0,.65,-3.65],[PI/2,0,0],7);

// Tool silhouettes and technical clutter, intentionally small.
for(let i=0;i<18;i++){
  const x=-7.0+(i%9)*1.75;
  const z=-1.8+Math.floor(i/9)*2.3;
  addBox(bench,`TOOL_${i}`,[.35,.35,.9+(i%3)*.25],i%4===0?MAT.steel:MAT.gun3,[x,.8,z],[0,(i%5)*.3,0]);
}

// -----------------------------------------------------------------------------
// 12 // LANDING PAD / DISCOVERY FLOOR
// -----------------------------------------------------------------------------
const padRoot = new THREE.Group();
padRoot.name='LANDING_PAD_SYSTEM';
padRoot.position.set(0,0,WORLD.padZ);
environmentRoot.add(padRoot);

const pad = new THREE.Group();
pad.name='LANDING_PAD';
padRoot.add(pad);

addCylinder(pad,'PAD_CORE',13.5,.7,MAT.gun1,[0,WORLD.floorY+0.35,0],[],96);
addTorus(pad,'PAD_RING_OUTER',13.0,.22,makeBloodPulseMaterial(.55),[0,WORLD.floorY+0.72,0],[],96,14);
addTorus(pad,'PAD_RING_MID',9.8,.10,MAT.steel,[0,WORLD.floorY+0.78,0],[],96,10);
addTorus(pad,'PAD_RING_INNER',5.8,.08,MAT.blood,[0,WORLD.floorY+0.82,0],[],96,10);

for(let i=0;i<24;i++){
  const a=i/24*TAU;
  const x=Math.cos(a)*11.4;
  const z=Math.sin(a)*11.4;
  addBox(pad,`PAD_SEGMENT_${i}`,[2.0,.16,.18],i%4===0?MAT.bloodHot:MAT.gun3,[x,WORLD.floorY+.82,z],[0,-a,0]);
}

const floorDiscovery = addMesh(
  interactionRoot,
  new THREE.CircleGeometry(25,128),
  floorMaterial,
  'DISCOVERY_FLOOR',
  [0,WORLD.floorY+.03,WORLD.padZ],
  [-PI/2,0,0]
);
floorDiscovery.userData.interactiveFloor=true;

const floorCollider = addMesh(
  interactionRoot,
  new THREE.CircleGeometry(25,96),
  new THREE.MeshBasicMaterial({color:0x000000,transparent:true,opacity:0}),
  'DISCOVERY_COLLIDER',
  [0,WORLD.floorY+.035,WORLD.padZ],
  [-PI/2,0,0]
);
floorCollider.userData.interactiveFloor=true;

// Physical red button. It is not HTML.
const physicalButton = new THREE.Group();
physicalButton.name='PHYSICAL_DISCOVERY_BUTTON';
physicalButton.position.set(9.6,WORLD.floorY+.78,WORLD.padZ-1.2);
interactionRoot.add(physicalButton);
addCylinder(physicalButton,'BUTTON_BASE',.82,.22,MAT.gun2);
addCylinder(physicalButton,'BUTTON_COLLAR',.68,.12,MAT.steel,[0,.16,0]);
const buttonCore=addCylinder(physicalButton,'BUTTON_CORE',.48,.16,makeBloodPulseMaterial(1.3),[0,.28,0]);
buttonCore.userData.interactiveButton=true;

// -----------------------------------------------------------------------------
// 13 // SIX-BLADE IRIS AND PIT
// -----------------------------------------------------------------------------
const irisRoot = new THREE.Group();
irisRoot.name='FLOOR_IRIS';
irisRoot.position.set(0,WORLD.floorY+.08,WORLD.padZ);
interactionRoot.add(irisRoot);

const pit = new THREE.Group();
pit.name='UNDERGROUND_PIT';
pit.position.y=-0.35;
irisRoot.add(pit);

const pitWall = addMesh(
  pit,
  new THREE.CylinderGeometry(15.8,12.0,34,96,1,true),
  MAT.gun0,
  'PIT_WALL',
  [0,-17,0],
  []
);
pitWall.material.side=THREE.BackSide;

const pitGlow = addCylinder(pit,'PIT_GLOW',10,.08,makeBloodPulseMaterial(1.4),[0,-32,0]);
const pitFloor = addCylinder(pit,'PIT_FLOOR',11.5,.35,MAT.graphite,[0,-33,0]);

for(let i=0;i<18;i++){
  const a=i/18*TAU;
  addBox(pit,`PIT_RIB_${i}`,[.42,29,.55],MAT.gun2,[Math.cos(a)*13.8,-17,Math.sin(a)*13.8],[0,-a,0]);
}

const irisBlades=[];
for(let i=0;i<6;i++){
  const blade=new THREE.Group();
  blade.name=`IRIS_BLADE_${i}`;
  const a=i/6*TAU;
  blade.position.set(Math.cos(a)*7.0,WORLD.floorY+.11+0.12*i,Math.sin(a)*7.0);
  blade.rotation.y=-a;
  const bladeMesh=addBox(blade,`IRIS_BLADE_${i}_PLATE`,[10.5,.24,3.6],makeApertureMaterial(),[3.6,0,0],[0,0,-.11]);
  bladeMesh.userData.irisBlade=true;
  blade.userData.closedRotation=0;
  blade.userData.openRotation=-(PI/2.8);
  irisRoot.add(blade);
  irisBlades.push(blade);
}
pit.visible=false;

// -----------------------------------------------------------------------------
// 14 // TUNNEL / VAULT SUGGESTION
// -----------------------------------------------------------------------------
const tunnelRoot = new THREE.Group();
tunnelRoot.name='VAULT_APPROACH';
tunnelRoot.position.set(0,-1.0,WORLD.padZ-65);
interactionRoot.add(tunnelRoot);

for(let i=0;i<22;i++){
  const z=-i*7;
  const radius=10.5+Math.sin(i*.7)*.35;
  const ring=addTorus(tunnelRoot,`TUNNEL_RING_${i}`,radius,.16,MAT.gun3,[0,-15,z],[PI/2,0,0],64,10);
  ring.scale.z=1.15;
  if(i%4===0){
    addTorus(tunnelRoot,`TUNNEL_RED_${i}`,radius-.35,.045,MAT.bloodHot,[0,-15,z],[PI/2,0,0],64,8);
  }
}
tunnelRoot.visible=false;

// -----------------------------------------------------------------------------
// 15 // ATMOSPHERE
// -----------------------------------------------------------------------------
const dustCount=2200;
const dustPositions=new Float32Array(dustCount*3);
const dustSizes=new Float32Array(dustCount);
const dustPhase=new Float32Array(dustCount);
for(let i=0;i<dustCount;i++){
  const r=85;
  dustPositions[i*3]=(Math.sin(i*12.9898)*43758.5453%1)*r;
  dustPositions[i*3+1]=((Math.sin(i*78.233)*43758.5453%1)*.5+.5)*42-6;
  dustPositions[i*3+2]=((Math.sin(i*37.719)*43758.5453%1)*.5+.5)*120-75;
  dustSizes[i]=0.5+(i%7)*.11;
  dustPhase[i]=(i%113)/113;
}
const dustGeo=new THREE.BufferGeometry();
dustGeo.setAttribute('position',new THREE.BufferAttribute(dustPositions,3));
dustGeo.setAttribute('aSize',new THREE.BufferAttribute(dustSizes,1));
const dustMat=new THREE.PointsMaterial({
  color:0x657078,
  size:.025,
  transparent:true,
  opacity:.22,
  depthWrite:false,
  blending:THREE.AdditiveBlending
});
const dust=new THREE.Points(dustGeo,dustMat);
dust.name='ATMOSPHERIC_DUST';
effectRoot.add(dust);

// -----------------------------------------------------------------------------
// 16 // RIM LIGHTS / PRACTICALS
// -----------------------------------------------------------------------------
const lights={
  ambient:new THREE.AmbientLight(0x111314,0.06),
  key:new THREE.DirectionalLight(0xb7c0c4,0.0),
  blood:new THREE.PointLight(COLORS.bloodHot,0,42,2),
  cyan:new THREE.PointLight(COLORS.cyan,0,26,2),
  pad:new THREE.PointLight(COLORS.blood3,0,22,2),
  fill:new THREE.PointLight(0x6b7378,0,30,2)
};
lights.key.position.set(8,16,14);
lights.blood.position.set(0,4,WORLD.workshopZ+4);
lights.cyan.position.set(-8,7,WORLD.workshopZ-8);
lights.pad.position.set(0,-1,WORLD.padZ);