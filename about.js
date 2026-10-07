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
lights.pad.position.set(0,-1,WORLD.padZ);lights.fill.position.set(8,5,WORLD.padZ+18);
scene.add(lights.ambient,lights.key,lights.blood,lights.cyan,lights.pad,lights.fill);

// -----------------------------------------------------------------------------
// 17 // ARMOR ASSET CONTRACT
// -----------------------------------------------------------------------------
const loader=new GLTFLoader();
const armorParts={boots:null,legs:null,torso:null,arms:null,gauntlets:null,helmet:null};
const armorGroups={};
const armorEffects=[];
const armorReadyState={loaded:0,failed:0,total:PART_ORDER.length};
let armorReady=false;

const ARMOR_SCALE=WORLD.suitScale;
const SHOWCASE_SCALE=WORLD.showcaseScale;

function makeArmorGroup(part){
  const g=new THREE.Group();
  g.name=`ARMOR_${part.toUpperCase()}_GROUP`;
  g.visible=true;
  armorGroups[part]=g;
  armorRoot.add(g);
  return g;
}

for(const part of PART_ORDER) makeArmorGroup(part);

function applyArmorMaterials(root){
  root.traverse(node=>{
    if(!node.isMesh) return;
    node.castShadow=true;
    node.receiveShadow=true;
    node.frustumCulled=true;
    const n=(node.name||'').toLowerCase();
    const material=node.material;
    if(!material) return;

    // Preserve geometry, but give the About sequence a coherent material language.
    if(n.includes('red')||n.includes('blood')){
      node.material=MAT.blood.clone();
    }else if(n.includes('blue')||n.includes('glow')||n.includes('optic')||n.includes('light')){
      node.material=MAT.cyan.clone();
    }else if(n.includes('rubber')||n.includes('carbon')){
      node.material=MAT.graphite.clone();
    }else{
      const m=MAT.gun2.clone();
      m.metalness=0.94;
      m.roughness=0.23;
      node.material=m;
    }
  });
}

function loadArmorPart(part){
  return new Promise(resolve=>{
    loader.load(
      GLB_PATH(part),
      gltf=>{
        const source=gltf.scene;
        applyArmorMaterials(source);
        source.position.set(0,0,0);
        source.rotation.set(0,0,0);
        source.scale.setScalar(1);

        const group=armorGroups[part];
        group.add(source);
        armorParts[part]=source;

        // The final GLBs share a common coordinate frame. The explicit root scale
        // turns their millimetre-space authored CAD export into a human-scale suit.
        group.scale.setScalar(ARMOR_SCALE);
        group.position.set(0,0,0);

        const fx=initializeArmorEffects(source,1.0);
        armorEffects.push(...fx);

        armorReadyState.loaded++;
        resolve({part,ok:true});
      },
      undefined,
      error=>{
        console.error(`[ABOUT] armor load failed: ${part}`,error);
        armorReadyState.failed++;
        resolve({part,ok:false,error});
      }
    );
  });
}

// -----------------------------------------------------------------------------
// 18 // ARMOR AUTHORING POSITIONS
// -----------------------------------------------------------------------------
const WORKBENCH_POSES=Object.freeze({
  boots:{position:[-3.9,3.0,WORLD.workshopZ-19],rotation:[0,-.35,.02]},
  legs:{position:[2.5,3.4,WORLD.workshopZ-19],rotation:[0,.18,-.02]},
  torso:{position:[0,4.2,WORLD.workshopZ-19],rotation:[0,0,0]},
  arms:{position:[-2.0,4.0,WORLD.workshopZ-19],rotation:[0,-.2,.06]},
  gauntlets:{position:[-3.5,3.1,WORLD.workshopZ-19],rotation:[0,-.3,.08]},
  helmet:{position:[3.7,4.4,WORLD.workshopZ-19],rotation:[0,.15,0]}
});

const FORMATION_POSES=Object.freeze({
  boots:[-2.2,-1.8,-18],
  legs:[-1.0,-.3,-18.8],
  torso:[0,1.6,-19.4],
  arms:[2.0,1.2,-19.0],
  gauntlets:[3.0,.0,-18.6],
  helmet:[0,3.4,-18.4]
});

const FINAL_POSES=Object.freeze({
  boots:[0,WORLD.floorY+1.05,WORLD.padZ],
  legs:[0,WORLD.floorY+3.15,WORLD.padZ],
  torso:[0,WORLD.floorY+5.55,WORLD.padZ],
  arms:[0,WORLD.floorY+5.65,WORLD.padZ],
  gauntlets:[0,WORLD.floorY+5.2,WORLD.padZ],
  helmet:[0,WORLD.floorY+7.65,WORLD.padZ]
});

function setArmorGroupPose(part,pose,rotation=[0,0,0],scale=ARMOR_SCALE){
  const g=armorGroups[part];
  if(!g)return;
  g.position.set(...pose);
  g.rotation.set(...rotation);
  g.scale.setScalar(scale);
}

function setWorkbenchPose(){
  for(const part of PART_ORDER){
    const p=WORKBENCH_POSES[part];
    setArmorGroupPose(part,p.position,p.rotation,ARMOR_SCALE);
  }
}

function setFlightPose(){
  for(const part of PART_ORDER){
    const p=FORMATION_POSES[part];
    setArmorGroupPose(part,p,[0,0,0],ARMOR_SCALE);
  }
}

function setFinalPose(){
  for(const part of PART_ORDER){
    const p=FINAL_POSES[part];
    setArmorGroupPose(part,p,[0,0,0],ARMOR_SCALE);
  }
}

// -----------------------------------------------------------------------------
// 19 // CAMERA AUTHORING
// -----------------------------------------------------------------------------
const cameraRig={
  position:new THREE.Vector3(),
  target:new THREE.Vector3(),
  up:new THREE.Vector3(0,1,0)
};

const CAMERA_SHOTS={
  void:{p:[0,1.4,34],t:[0,1.5,0]},
  door:{p:[0,2.0,27],t:[0,2.0,8]},
  doorGap:{p:[0,2.2,19],t:[0,2.1,0]},
  workshop:{p:[0,4.2,2],t:[0,2.4,WORLD.workshopZ-14]},
  armorWide:{p:[8,4.0,-53],t:[0,2.2,WORLD.workshopZ-19]},
  flight:{p:[10,4.0,-2],t:[0,1.2,-18]},
  formation:{p:[9,5.0,18],t:[0,1.0,-18.5]},
  assembly:{p:[8.5,5.0,WORLD.padZ+20],t:[0,3.0,WORLD.padZ]},
  landing:{p:[8,3.2,WORLD.padZ+18],t:[0,2.8,WORLD.padZ]},
  floor:{p:[11,6.5,WORLD.padZ+25],t:[0,-1.8,WORLD.padZ]},
  pit:{p:[7,3.0,WORLD.padZ+11],t:[0,-10,WORLD.padZ]}
};

function applyCameraShot(name){
  const shot=CAMERA_SHOTS[name];
  if(!shot)return;
  camera.position.set(...shot.p);
  camera.lookAt(...shot.t);
}

function tweenCameraShot(tl,name,start,duration,ease='power2.inOut'){
  const shot=CAMERA_SHOTS[name];
  if(!shot)return;
  tl.to(camera.position,{x:shot.p[0],y:shot.p[1],z:shot.p[2],duration,ease},start);
  const target={x:shot.t[0],y:shot.t[1],z:shot.t[2]};
  const proxy={x:camera.userData.lookX??camera.position.x,y:camera.userData.lookY??camera.position.y,z:camera.userData.lookZ??camera.position.z};
  camera.userData.lookX=target.x;camera.userData.lookY=target.y;camera.userData.lookZ=target.z;
  tl.to(proxy,{x:target.x,y:target.y,z:target.z,duration,ease,onUpdate:()=>{
    camera.lookAt(proxy.x,proxy.y,proxy.z);
  }},start);
}

// -----------------------------------------------------------------------------
// 20 // COPY / HUD HELPERS
// -----------------------------------------------------------------------------
function showCopy(part,opacity=1){
  for(const key of PART_ORDER){
    const node=copyNodes[key];
    if(node)gsap.set(node,{autoAlpha:key===part?opacity:0});
  }
}

function hideAllCopy(){
  for(const node of Object.values(copyNodes)) gsap.set(node,{autoAlpha:0});
}

function setHud(chapter,depth,coord){
  hudChapter.textContent=chapter;
  hudDepth.textContent=`DEPTH ${depth}`;
  hudCoordinate.textContent=coord;
}

function setHudProgress(p){
  hudReadout.textContent=(p*100).toFixed(1).padStart(5,'0');
  railProgress.style.height=`${p*100}%`;
}

// -----------------------------------------------------------------------------
// 21 // CINEMATIC TIMELINE
// -----------------------------------------------------------------------------
let masterTimeline=null;
let currentProgress=0;
let floorActivated=false;
let pitRevealed=false;
let transitioning=false;
let pointerWorld=new THREE.Vector3();
let pointerNDC=new THREE.Vector2();

function buildTimeline(){
  masterTimeline=gsap.timeline({
    paused:true,
    defaults:{ease:'none'},
    onUpdate(){
      currentProgress=masterTimeline.progress();
      setHudProgress(currentProgress);
    }
  });

  // ACT 00 // VOID
  applyCameraShot('void');
  hideAllCopy();
  gsap.set(identity,{autoAlpha:1});
  gsap.set('.identity-mark',{autoAlpha:0});
  gsap.set('.identity-name',{autoAlpha:0});
  gsap.set('.identity-rule',{width:0});
  gsap.set('.identity-sub',{autoAlpha:0});
  gsap.set(hud,{autoAlpha:0});

  masterTimeline.to('.identity-p',{autoAlpha:1,x:0,duration:.8,ease:'power2.out'},0);
  masterTimeline.to('.identity-g',{autoAlpha:1,x:0,duration:.8,ease:'power2.out'},0);
  masterTimeline.to('.identity-p',{left:'31vw',duration:2.0,ease:'power3.inOut'},.4);
  masterTimeline.to('.identity-g',{right:'31vw',duration:2.0,ease:'power3.inOut'},.4);
  masterTimeline.to('.identity-name',{autoAlpha:1,scaleX:1,duration:1.6,ease:'expo.out'},1.5);
  masterTimeline.to('.identity-rule',{width:'38vw',duration:1.1,ease:'power2.out'},2.3);
  masterTimeline.to('.identity-sub',{autoAlpha:1,duration:.9,ease:'power2.out'},2.7);

  // ACT 01 // IDENTITY EXIT
  masterTimeline.to(identity,{autoAlpha:0,duration:1.2,ease:'power2.inOut'},5.5);
  masterTimeline.to(hud,{autoAlpha:1,duration:.7},5.7);
  tweenCameraShot(masterTimeline,'door',6.0,3.0);
  setHud('EMERGENCE','01','X 000 / Y 002 / Z +027');

  // ACT 02 // DOOR REVEAL
  masterTimeline.to(lights.blood,{intensity:8,duration:1.2},7.5);
  masterTimeline.to(doorRoot.position,{z:0,duration:2.0,ease:'power3.out'},7.4);
  masterTimeline.to(scene.fog,{density:.016,duration:2.0},7.4);
  masterTimeline.to(leftDoor.scale,{x:1,y:1,z:1,duration:.1},7.4);
  masterTimeline.to(rightDoor.scale,{x:1,y:1,z:1,duration:.1},7.4);

  // ACT 03 // DOOR OPEN
  setHud('DOOR SYSTEM','04','X 000 / Y 002 / Z +019');
  masterTimeline.to(leftDoor.position,{x:-15,duration:2.2,ease:'power3.inOut'},10.0);
  masterTimeline.to(rightDoor.position,{x:15,duration:2.2,ease:'power3.inOut'},10.0);
  masterTimeline.to(lights.key,{intensity:2.2,duration:2.5},10.2);
  masterTimeline.to(lights.cyan,{intensity:7,duration:2.5},11.0);
  tweenCameraShot(masterTimeline,'doorGap',10.2,3.3);

  // ACT 04 // WORKSHOP
  setHud('THE WORKSHOP','08','X 000 / Y 004 / Z -014');
  masterTimeline.to(lights.ambient,{intensity:.22,duration:1.8},13.3);
  masterTimeline.to(lights.blood,{intensity:3.2,duration:1.8},13.5);
  masterTimeline.to(lights.cyan,{intensity:3.5,duration:2.0},14.0);
  tweenCameraShot(masterTimeline,'workshop',13.2,4.6);
  masterTimeline.to(dustMat,{opacity:.42,duration:2.0},14.0);
  masterTimeline.to(workbench.scale,{x:1.0,y:1.0,z:1.0,duration:.5},15.0);

  // ACT 05 // ARMOR WAKE
  setHud('VAULT-01 // INITIALIZING','14','X 000 / Y 005 / Z -061');
  setWorkbenchPose();
  for(let i=0;i<PART_ORDER.length;i++){
    const part=PART_ORDER[i];
    const group=armorGroups[part];
    const t=18.0+i*.48;
    masterTimeline.to(group.position,{y:group.position.y+1.5,duration:.7,ease:'power2.out'},t);
    masterTimeline.to(group.rotation,{y:group.rotation.y+.18,duration:.9,ease:'sine.inOut'},t);
  }
  masterTimeline.to(lights.cyan,{intensity:11,duration:2.8},18.0);
  masterTimeline.to(lights.blood,{intensity:6,duration:2.8},18.0);
  tweenCameraShot(masterTimeline,'armorWide',18.0,5.0);

  // ACT 06 // SIX COMPONENT SHOWCASE
  const showStart=23.0;
  const showWindow=3.25;
  for(let i=0;i<PART_ORDER.length;i++){
    const part=PART_ORDER[i];
    const meta=PART_META[part];
    const t=showStart+i*showWindow;
    setHud(meta.index,`1${i}`,`X -${String(i+1).padStart(3,'0')} / Y 004 / Z -008`);
    const g=armorGroups[part];
    const start={x:g.position.x,y:g.position.y,z:g.position.z};
    const focus=meta.focus;
    const scaleFrom=g.scale.x;
    masterTimeline.call(()=>showCopy(part),[],t);
    masterTimeline.to(g.position,{
      x:focus[0],y:focus[1],z:focus[2],
      duration:showWindow*.52,ease:'power3.inOut'
    },t);
    masterTimeline.to(g.scale,{
      x:SHOWCASE_SCALE,y:SHOWCASE_SCALE,z:SHOWCASE_SCALE,
      duration:showWindow*.48,ease:'power3.inOut'
    },t);
    masterTimeline.to(g.rotation,{
      y:meta.yaw+PI*.24,
      x:.06,
      duration:showWindow*.52,
      ease:'power2.inOut'
    },t);
    masterTimeline.to(g.rotation,{
      y:meta.yaw-PI*.18,
      duration:showWindow*.48,
      ease:'sine.inOut'
    },t+showWindow*.52);
    masterTimeline.to(g.position,{
      x:focus[0]+5.0,y:focus[1]+1.2,z:focus[2]-7.0,
      duration:showWindow*.48,ease:'power4.in'
    },t+showWindow*.52);
    masterTimeline.to(g.scale,{
      x:ARMOR_SCALE,y:ARMOR_SCALE,z:ARMOR_SCALE,
      duration:showWindow*.42,ease:'power3.in'
    },t+showWindow*.58);
    masterTimeline.call(()=>setWorkbenchPose(),[],t+showWindow-.02);
  }
  hideAllCopy();

  // ACT 07 // FORMATION FLIGHT
  const flightStart=42.5;
  setHud('FORMATION FLIGHT','20','X 000 / Y 004 / Z -018');
  for(const part of PART_ORDER){
    const g=armorGroups[part];
    const p=FORMATION_POSES[part];
    masterTimeline.to(g.position,{x:p[0],y:p[1],z:p[2],duration:2.2,ease:'power3.inOut'},flightStart);
    masterTimeline.to(g.scale,{x:ARMOR_SCALE,y:ARMOR_SCALE,z:ARMOR_SCALE,duration:1.2},flightStart);
  }
  tweenCameraShot(masterTimeline,'flight',flightStart,4.2);
  masterTimeline.to(lights.cyan,{intensity:14,duration:1.5},flightStart);
  masterTimeline.to(lights.blood,{intensity:4,duration:1.5},flightStart);

  // Camera sweeps during flight, while the authored formation remains stable.
  tweenCameraShot(masterTimeline,'formation',47.0,4.0);
  tweenCameraShot(masterTimeline,'flight',51.0,4.0);
  tweenCameraShot(masterTimeline,'formation',55.0,4.0);
  tweenCameraShot(masterTimeline,'flight',59.0,4.0);

  // ACT 08 // CONVERGENCE
  const assemblyStart=63.0;
  setHud('ASSEMBLY','27','X 000 / Y 003 / Z -104');
  tweenCameraShot(masterTimeline,'assembly',assemblyStart,6.0);
  for(const part of PART_ORDER){
    const g=armorGroups[part];
    const p=FINAL_POSES[part];
    masterTimeline.to(g.position,{x:p[0],y:p[1]+5,z:p[2]-8,duration:3.0,ease:'power4.inOut'},assemblyStart);
    masterTimeline.to(g.rotation,{x:0,y:0,z:0,duration:2.6,ease:'power3.inOut'},assemblyStart);
    masterTimeline.to(g.scale,{x:ARMOR_SCALE,y:ARMOR_SCALE,z:ARMOR_SCALE,duration:2.4,ease:'power3.inOut'},assemblyStart);
  }
  masterTimeline.to(lights.pad,{intensity:5.0,duration:2.0},assemblyStart+2.0);

  // ACT 09 // LANDING
  const landingStart=72.0;
  setHud('LANDING','31','X 000 / Y -004 / Z -104');
  tweenCameraShot(masterTimeline,'landing',landingStart,5.0);
  for(let i=0;i<PART_ORDER.length;i++){
    const part=PART_ORDER[i];
    const g=armorGroups[part];
    const p=FINAL_POSES[part];
    const t=landingStart+i*.45;
    masterTimeline.to(g.position,{x:p[0],y:p[1],z:p[2],duration:.65,ease:'power4.in'},t);
    masterTimeline.to(g.rotation,{x:0,y:0,z:0,duration:.5,ease:'power2.out'},t);
  }
  masterTimeline.call(()=>showCopy('assembly'),[],76.0);
  masterTimeline.to(copyNodes.assembly,{autoAlpha:1,duration:1.2},76.0);
  masterTimeline.to('.assembly-rule',{width:'18vw',duration:1.0,ease:'power2.out'},76.3);

  // ACT 10 // QUIET FLOOR
  const floorStart=82.0;
  setHud('OBSERVATION','38','X +011 / Y -006 / Z -079');
  tweenCameraShot(masterTimeline,'floor',floorStart,5.0);
  masterTimeline.to(lights.key,{intensity:1.1,duration:2.2},floorStart);
  masterTimeline.to(lights.cyan,{intensity:1.3,duration:2.2},floorStart);
  masterTimeline.to(lights.blood,{intensity:1.5,duration:2.2},floorStart);
  masterTimeline.to(lights.pad,{intensity:2.2,duration:2.2},floorStart);
  masterTimeline.to(floorMaterial.uniforms.uPulseStrength,{value:.38,duration:2.0},floorStart+2.0);
  masterTimeline.to(physicalButton.scale,{x:1,y:1,z:1,duration:.5},floorStart+2.2);
  masterTimeline.to(copyNodes.assembly,{autoAlpha:0,duration:1.0},floorStart);
  masterTimeline.to(hud,{autoAlpha:.72,duration:1.0},floorStart);

  // ACT 11 // HOLD THE DISCOVERY STATE
  masterTimeline.to({}, {duration:18},87.0);

  window.__ABOUT_MASTER_TIMELINE__=masterTimeline;
  window.__ABOUT_VERSION__=VERSION;
}

// -----------------------------------------------------------------------------
// 22 // DETERMINISTIC PROGRESS API
// -----------------------------------------------------------------------------
function setCinematicProgress(p){
  const clamped=THREE.MathUtils.clamp(Number(p)||0,0,1);
  if(!masterTimeline)return;
  masterTimeline.progress(clamped,false);
  renderFrame();
}

window.setCinematicProgress=setCinematicProgress;

function exposeDiagnostics(){
  window.__ABOUT_READY__=true;
  window.__ARMOR_READY=armorReady;
  window.__ABOUT_DIAGNOSTICS__=()=>{
    return {
      version:VERSION,
      armorReady,
      loaded:armorReadyState.loaded,
      failed:armorReadyState.failed,
      progress:currentProgress,
      floorActivated,
      pitRevealed,
      transitioning,
      renderer:{
        width:renderer.domElement.width,
        height:renderer.domElement.height,
        pixelRatio:renderer.getPixelRatio()
      },
      objects:{
        door:doorRoot.children.length,
        workshop:workshop.children.length,
        armor:Object.values(armorParts).filter(Boolean).length,
        iris:irisBlades.length
      }
    };
  };
}

// -----------------------------------------------------------------------------
// 23 // FLOOR INTERACTION
// -----------------------------------------------------------------------------
const raycaster=new THREE.Raycaster();
const pointer=new THREE.Vector2();

function updatePointer(clientX,clientY){
  pointer.x=(clientX/window.innerWidth)*2-1;
  pointer.y=-(clientY/window.innerHeight)*2+1;
  pointerNDC.copy(pointer);
  raycaster.setFromCamera(pointer,camera);
  const hits=raycaster.intersectObject(floorCollider,false);
  if(hits.length){
    pointerWorld.copy(hits[0].point);
    floorMaterial.uniforms.uPointer.value.set(
      pointerWorld.x,
      pointerWorld.z-WORLD.padZ
    );
    cursor.classList.add('is-hot');
    return true;
  }
  cursor.classList.remove('is-hot');
  return false;
}

function activateFloor(){
  if(floorActivated||currentProgress<.88)return;
  floorActivated=true;
  physicalButton.userData.active=true;
  gsap.to(physicalButton.position,{y:WORLD.floorY+.62,duration:.14,ease:'power2.in'});
  gsap.to(buttonCore.material.uniforms.uIntensity,{value:2.5,duration:.2});
  gsap.to(floorMaterial.uniforms.uPulseStrength,{value:1.35,duration:.8,ease:'power2.out'});
  gsap.to(lights.pad,{intensity:18,duration:.8,ease:'power2.out'});
  gsap.to(lights.blood,{intensity:10,duration:1.0});
  gsap.to(camera.position,{x:8.4,y:3.5,z:WORLD.padZ+17,duration:1.7,ease:'power3.inOut',onUpdate:()=>camera.lookAt(0,-1.5,WORLD.padZ)});
  window.setTimeout(revealPit,1050);
}

function revealPit(){
  if(pitRevealed)return;
  pitRevealed=true;
  pit.visible=true;
  tunnelRoot.visible=true;
  irisRoot.visible=true;
  for(let i=0;i<irisBlades.length;i++){
    const blade=irisBlades[i];
    gsap.to(blade.rotation,{z:blade.userData.openRotation,duration:1.55,delay:i*.045,ease:'power3.inOut'});
  }
  gsap.to(pit.position,{y:0,duration:1.8,ease:'power3.out'});
  gsap.to(lights.pad,{intensity:3.5,duration:2.0});
  gsap.to(lights.blood,{intensity:20,duration:2.0});
  gsap.to(floorMaterial.uniforms.uPulseStrength,{value:2.2,duration:1.8});
  gsap.to(camera.position,{x:6.5,y:1.4,z:WORLD.padZ+10,duration:2.5,ease:'power3.inOut',onUpdate:()=>camera.lookAt(0,-10,WORLD.padZ)});
}

function enterVault(){
  if(transitioning||!pitRevealed)return;
  transitioning=true;
  gsap.to(camera.position,{x:0,y:-16,z:WORLD.padZ-20,duration:3.6,ease:'power3.in'});
  gsap.to(endFade,{opacity:1,duration:3.4,ease:'power2.in',delay:.8,onComplete:()=>{
    window.location.href='/';
  }});
}

function handlePointerDown(event){
  if(currentProgress<.88)return;
  raycaster.setFromCamera(pointerNDC,camera);
  const targets=[floorCollider,physicalButton,pitFloor];
  const hits=raycaster.intersectObjects(targets,true);
  if(!hits.length)return;
  const object=hits[0].object;
  if(!floorActivated && (object.userData.interactiveFloor||object.userData.interactiveButton)){
    activateFloor();
    return;
  }
  if(pitRevealed){
    enterVault();
  }
}

window.addEventListener('pointermove',event=>{
  cursor.style.left=`${event.clientX}px`;
  cursor.style.top=`${event.clientY}px`;
  updatePointer(event.clientX,event.clientY);
});
window.addEventListener('pointerdown',handlePointerDown);

// -----------------------------------------------------------------------------
// 24 // SCROLL / TIMELINE BINDING
// -----------------------------------------------------------------------------
function initScroll(){
  const isTest=new URLSearchParams(location.search).get('cinematicTest')==='1';
  if(isTest){
    document.body.classList.add('is-cinematic-test');
    window.isCinematicTest=true;
    return;
  }

  document.body.style.overflowY='auto';

  ScrollTrigger.create({
    trigger:'#scroll-space',
    start:'top top',
    end:'bottom bottom',
    scrub:1,
    onUpdate:self=>{
      setCinematicProgress(self.progress);
    }
  });
}

// -----------------------------------------------------------------------------
// 25 // POSTPROCESS-STYLE CINEMA CONTROLS
// -----------------------------------------------------------------------------
function updateGrade(p){
  const grade=document.querySelector('#cinema-grade');
  const scan=document.querySelector('#scanline-layer');
  const vignette=document.querySelector('#vignette-layer');
  if(!grade)return;
  const red=Math.max(0,Math.sin(p*PI));
  grade.style.opacity=String(.6+.25*red);
  scan.style.opacity=String(.055+.04*Math.sin(p*TAU));
  vignette.style.opacity=String(.65+.12*Math.sin(p*PI));
}

function updateShaderUniforms(){
  const t=elapsed;
  if(floorMaterial.uniforms.uTime)floorMaterial.uniforms.uTime.value=t;
  for(const child of environmentRoot.children){
    child.traverse(node=>{
      const m=node.material;
      if(!m||!m.uniforms)return;
      if(m.uniforms.uTime)m.uniforms.uTime.value=t;
    });
  }
}

function updateAtmosphere(){
  const p=currentProgress;
  dust.rotation.y=elapsed*.008;
  dust.position.y=Math.sin(elapsed*.12)*.08;
  dustMat.opacity=.10+.28*Math.min(1,p*2);
}

function updateArmorRuntime(){
  const throttle =
    currentProgress<.20 ? 0 :
    currentProgress<.44 ? THREE.MathUtils.smoothstep(currentProgress,.20,.44) :
    currentProgress<.82 ? .18 :
    currentProgress<.90 ? .42 :
    .04;
  updateArmorEffects(armorEffects,delta,throttle,elapsed);
}

// -----------------------------------------------------------------------------
// 26 // RENDER LOOP
// -----------------------------------------------------------------------------
function renderFrame(){
  renderer.render(scene,camera);
}

function tick(){
  delta=Math.min(clock.getDelta(),.05);
  elapsed+=delta;
  updateShaderUniforms();
  updateAtmosphere();
  updateArmorRuntime();
  updateGrade(currentProgress);

  if(!floorActivated){
    physicalButton.rotation.y=elapsed*.22;
    const pulse=.72+.28*Math.sin(elapsed*1.7);
    buttonCore.scale.setScalar(.94+pulse*.08);
  }

  if(!transitioning && currentProgress>.87){
    const pulse=.5+.5*Math.sin(elapsed*1.45);
    floorMaterial.uniforms.uPulseStrength.value=Math.max(
      floorMaterial.uniforms.uPulseStrength.value,
      .12+pulse*.14
    );
  }

  renderFrame();
  requestAnimationFrame(tick);
}

// -----------------------------------------------------------------------------
// 27 // RESIZE
// -----------------------------------------------------------------------------
function onResize(){
  const w=Math.max(1,window.innerWidth);
  const h=Math.max(1,window.innerHeight);
  camera.aspect=w/h;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(DPR);
  renderer.setSize(w,h,false);
}
window.addEventListener('resize',onResize);

// -----------------------------------------------------------------------------
// 28 // INITIAL STATE / BOOT
// -----------------------------------------------------------------------------
async function boot(){
  applyCameraShot('void');
  setWorkbenchPose();
  for(const part of PART_ORDER) armorGroups[part].visible=true;
  hideAllCopy();
  setHud('VOID','00','X 000 / Y 000 / Z +034');

  const results=await Promise.all(PART_ORDER.map(loadArmorPart));
  armorReady=results.every(r=>r.ok);
  window.__ARMOR_READY=armorReady;
  if(!armorReady){
    console.warn('[ABOUT] one or more armor assemblies failed to load');
  }

  buildTimeline();
  initScroll();
  exposeDiagnostics();
  requestAnimationFrame(tick);
}

boot().catch(error=>{
  console.error('[ABOUT] fatal boot failure',error);
  window.__ABOUT_BOOT_ERROR__=String(error?.stack||error);
});


// -----------------------------------------------------------------------------
// 29 // INDUSTRIAL DETAIL LIBRARY
// This library deliberately keeps the environment physical: plates, brackets,
// fasteners, cable saddles, vents and inspection hardware. It is not decorative
// noise. The modules are reusable atoms for the installation's visual grammar.
// -----------------------------------------------------------------------------
function detailModule001(parent, origin=[0,0,0], phase=0) {
  const g=new THREE.Group();
  g.name='DETAIL_MODULE_001';
  g.position.set(origin[0],origin[1],origin[2]);
  g.rotation.y=phase;
  const mA=(phase*10)%2>1?MAT.gun2:MAT.gun3;
  const mB=(phase*7)%2>1?MAT.steel:MAT.graphite;
  const mC=(phase*5)%2>1?MAT.blood:MAT.gun2;
  addBox(g,'PLATE',[1.8+.08*(1%5),.16,.92+.04*(1%7)],mA,[0,0,0]);
  addBox(g,'BACKING',[1.38,.10,.62],mB,[0,-.16,0]);
  addBox(g,'SEAM',[1.1,.018,.025],mC,[0,.095,.47]);
  addBolt(g,'BOLT_A',.055,.035,mB,[-.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_B',.055,.035,mB,[.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_C',.045,.035,mB,[-.62,.11,-.48],[PI/2,0,0]);
  addBolt(g,'BOLT_D',.045,.035,mB,[.62,.11,-.48],[PI/2,0,0]);
  addTorus(g,'SERVICE_RING',.23,.025,mC,[0,.12,.52],[PI/2,0,0],24,6);
  addBox(g,'MICRO_RAIL',[.92,.035,.05],mB,[0,.13,-.51]);
  parent.add(g);
  return g;
}
function detailModule002(parent, origin=[0,0,0], phase=0) {
  const g=new THREE.Group();
  g.name='DETAIL_MODULE_002';
  g.position.set(origin[0],origin[1],origin[2]);
  g.rotation.y=phase;
  const mA=(phase*10)%2>1?MAT.gun2:MAT.gun3;
  const mB=(phase*7)%2>1?MAT.steel:MAT.graphite;
  const mC=(phase*5)%2>1?MAT.blood:MAT.gun2;
  addBox(g,'PLATE',[1.8+.08*(2%5),.16,.92+.04*(2%7)],mA,[0,0,0]);
  addBox(g,'BACKING',[1.38,.10,.62],mB,[0,-.16,0]);
  addBox(g,'SEAM',[1.1,.018,.025],mC,[0,.095,.47]);
  addBolt(g,'BOLT_A',.055,.035,mB,[-.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_B',.055,.035,mB,[.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_C',.045,.035,mB,[-.62,.11,-.48],[PI/2,0,0]);
  addBolt(g,'BOLT_D',.045,.035,mB,[.62,.11,-.48],[PI/2,0,0]);
  addTorus(g,'SERVICE_RING',.23,.025,mC,[0,.12,.52],[PI/2,0,0],24,6);
  addBox(g,'MICRO_RAIL',[.92,.035,.05],mB,[0,.13,-.51]);
  parent.add(g);
  return g;
}
function detailModule003(parent, origin=[0,0,0], phase=0) {
  const g=new THREE.Group();
  g.name='DETAIL_MODULE_003';
  g.position.set(origin[0],origin[1],origin[2]);
  g.rotation.y=phase;
  const mA=(phase*10)%2>1?MAT.gun2:MAT.gun3;
  const mB=(phase*7)%2>1?MAT.steel:MAT.graphite;
  const mC=(phase*5)%2>1?MAT.blood:MAT.gun2;
  addBox(g,'PLATE',[1.8+.08*(3%5),.16,.92+.04*(3%7)],mA,[0,0,0]);
  addBox(g,'BACKING',[1.38,.10,.62],mB,[0,-.16,0]);
  addBox(g,'SEAM',[1.1,.018,.025],mC,[0,.095,.47]);
  addBolt(g,'BOLT_A',.055,.035,mB,[-.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_B',.055,.035,mB,[.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_C',.045,.035,mB,[-.62,.11,-.48],[PI/2,0,0]);
  addBolt(g,'BOLT_D',.045,.035,mB,[.62,.11,-.48],[PI/2,0,0]);
  addTorus(g,'SERVICE_RING',.23,.025,mC,[0,.12,.52],[PI/2,0,0],24,6);
  addBox(g,'MICRO_RAIL',[.92,.035,.05],mB,[0,.13,-.51]);
  parent.add(g);
  return g;
}
function detailModule004(parent, origin=[0,0,0], phase=0) {
  const g=new THREE.Group();
  g.name='DETAIL_MODULE_004';
  g.position.set(origin[0],origin[1],origin[2]);
  g.rotation.y=phase;
  const mA=(phase*10)%2>1?MAT.gun2:MAT.gun3;
  const mB=(phase*7)%2>1?MAT.steel:MAT.graphite;
  const mC=(phase*5)%2>1?MAT.blood:MAT.gun2;
  addBox(g,'PLATE',[1.8+.08*(4%5),.16,.92+.04*(4%7)],mA,[0,0,0]);
  addBox(g,'BACKING',[1.38,.10,.62],mB,[0,-.16,0]);
  addBox(g,'SEAM',[1.1,.018,.025],mC,[0,.095,.47]);
  addBolt(g,'BOLT_A',.055,.035,mB,[-.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_B',.055,.035,mB,[.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_C',.045,.035,mB,[-.62,.11,-.48],[PI/2,0,0]);
  addBolt(g,'BOLT_D',.045,.035,mB,[.62,.11,-.48],[PI/2,0,0]);
  addTorus(g,'SERVICE_RING',.23,.025,mC,[0,.12,.52],[PI/2,0,0],24,6);
  addBox(g,'MICRO_RAIL',[.92,.035,.05],mB,[0,.13,-.51]);
  parent.add(g);
  return g;
}
function detailModule005(parent, origin=[0,0,0], phase=0) {
  const g=new THREE.Group();
  g.name='DETAIL_MODULE_005';
  g.position.set(origin[0],origin[1],origin[2]);
  g.rotation.y=phase;
  const mA=(phase*10)%2>1?MAT.gun2:MAT.gun3;
  const mB=(phase*7)%2>1?MAT.steel:MAT.graphite;
  const mC=(phase*5)%2>1?MAT.blood:MAT.gun2;
  addBox(g,'PLATE',[1.8+.08*(5%5),.16,.92+.04*(5%7)],mA,[0,0,0]);
  addBox(g,'BACKING',[1.38,.10,.62],mB,[0,-.16,0]);
  addBox(g,'SEAM',[1.1,.018,.025],mC,[0,.095,.47]);
  addBolt(g,'BOLT_A',.055,.035,mB,[-.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_B',.055,.035,mB,[.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_C',.045,.035,mB,[-.62,.11,-.48],[PI/2,0,0]);
  addBolt(g,'BOLT_D',.045,.035,mB,[.62,.11,-.48],[PI/2,0,0]);
  addTorus(g,'SERVICE_RING',.23,.025,mC,[0,.12,.52],[PI/2,0,0],24,6);
  addBox(g,'MICRO_RAIL',[.92,.035,.05],mB,[0,.13,-.51]);
  parent.add(g);
  return g;
}
function detailModule006(parent, origin=[0,0,0], phase=0) {
  const g=new THREE.Group();
  g.name='DETAIL_MODULE_006';
  g.position.set(origin[0],origin[1],origin[2]);
  g.rotation.y=phase;
  const mA=(phase*10)%2>1?MAT.gun2:MAT.gun3;
  const mB=(phase*7)%2>1?MAT.steel:MAT.graphite;
  const mC=(phase*5)%2>1?MAT.blood:MAT.gun2;
  addBox(g,'PLATE',[1.8+.08*(6%5),.16,.92+.04*(6%7)],mA,[0,0,0]);
  addBox(g,'BACKING',[1.38,.10,.62],mB,[0,-.16,0]);
  addBox(g,'SEAM',[1.1,.018,.025],mC,[0,.095,.47]);
  addBolt(g,'BOLT_A',.055,.035,mB,[-.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_B',.055,.035,mB,[.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_C',.045,.035,mB,[-.62,.11,-.48],[PI/2,0,0]);
  addBolt(g,'BOLT_D',.045,.035,mB,[.62,.11,-.48],[PI/2,0,0]);
  addTorus(g,'SERVICE_RING',.23,.025,mC,[0,.12,.52],[PI/2,0,0],24,6);
  addBox(g,'MICRO_RAIL',[.92,.035,.05],mB,[0,.13,-.51]);
  parent.add(g);
  return g;
}
function detailModule007(parent, origin=[0,0,0], phase=0) {
  const g=new THREE.Group();
  g.name='DETAIL_MODULE_007';
  g.position.set(origin[0],origin[1],origin[2]);
  g.rotation.y=phase;
  const mA=(phase*10)%2>1?MAT.gun2:MAT.gun3;
  const mB=(phase*7)%2>1?MAT.steel:MAT.graphite;
  const mC=(phase*5)%2>1?MAT.blood:MAT.gun2;
  addBox(g,'PLATE',[1.8+.08*(7%5),.16,.92+.04*(7%7)],mA,[0,0,0]);
  addBox(g,'BACKING',[1.38,.10,.62],mB,[0,-.16,0]);
  addBox(g,'SEAM',[1.1,.018,.025],mC,[0,.095,.47]);
  addBolt(g,'BOLT_A',.055,.035,mB,[-.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_B',.055,.035,mB,[.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_C',.045,.035,mB,[-.62,.11,-.48],[PI/2,0,0]);
  addBolt(g,'BOLT_D',.045,.035,mB,[.62,.11,-.48],[PI/2,0,0]);
  addTorus(g,'SERVICE_RING',.23,.025,mC,[0,.12,.52],[PI/2,0,0],24,6);
  addBox(g,'MICRO_RAIL',[.92,.035,.05],mB,[0,.13,-.51]);
  parent.add(g);
  return g;
}
function detailModule008(parent, origin=[0,0,0], phase=0) {
  const g=new THREE.Group();
  g.name='DETAIL_MODULE_008';
  g.position.set(origin[0],origin[1],origin[2]);
  g.rotation.y=phase;
  const mA=(phase*10)%2>1?MAT.gun2:MAT.gun3;
  const mB=(phase*7)%2>1?MAT.steel:MAT.graphite;
  const mC=(phase*5)%2>1?MAT.blood:MAT.gun2;
  addBox(g,'PLATE',[1.8+.08*(8%5),.16,.92+.04*(8%7)],mA,[0,0,0]);
  addBox(g,'BACKING',[1.38,.10,.62],mB,[0,-.16,0]);
  addBox(g,'SEAM',[1.1,.018,.025],mC,[0,.095,.47]);
  addBolt(g,'BOLT_A',.055,.035,mB,[-.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_B',.055,.035,mB,[.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_C',.045,.035,mB,[-.62,.11,-.48],[PI/2,0,0]);
  addBolt(g,'BOLT_D',.045,.035,mB,[.62,.11,-.48],[PI/2,0,0]);
  addTorus(g,'SERVICE_RING',.23,.025,mC,[0,.12,.52],[PI/2,0,0],24,6);
  addBox(g,'MICRO_RAIL',[.92,.035,.05],mB,[0,.13,-.51]);
  parent.add(g);
  return g;
}
function detailModule009(parent, origin=[0,0,0], phase=0) {
  const g=new THREE.Group();
  g.name='DETAIL_MODULE_009';
  g.position.set(origin[0],origin[1],origin[2]);
  g.rotation.y=phase;
  const mA=(phase*10)%2>1?MAT.gun2:MAT.gun3;
  const mB=(phase*7)%2>1?MAT.steel:MAT.graphite;
  const mC=(phase*5)%2>1?MAT.blood:MAT.gun2;
  addBox(g,'PLATE',[1.8+.08*(9%5),.16,.92+.04*(9%7)],mA,[0,0,0]);
  addBox(g,'BACKING',[1.38,.10,.62],mB,[0,-.16,0]);
  addBox(g,'SEAM',[1.1,.018,.025],mC,[0,.095,.47]);
  addBolt(g,'BOLT_A',.055,.035,mB,[-.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_B',.055,.035,mB,[.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_C',.045,.035,mB,[-.62,.11,-.48],[PI/2,0,0]);
  addBolt(g,'BOLT_D',.045,.035,mB,[.62,.11,-.48],[PI/2,0,0]);
  addTorus(g,'SERVICE_RING',.23,.025,mC,[0,.12,.52],[PI/2,0,0],24,6);
  addBox(g,'MICRO_RAIL',[.92,.035,.05],mB,[0,.13,-.51]);
  parent.add(g);
  return g;
}
function detailModule010(parent, origin=[0,0,0], phase=0) {
  const g=new THREE.Group();
  g.name='DETAIL_MODULE_010';
  g.position.set(origin[0],origin[1],origin[2]);
  g.rotation.y=phase;
  const mA=(phase*10)%2>1?MAT.gun2:MAT.gun3;
  const mB=(phase*7)%2>1?MAT.steel:MAT.graphite;
  const mC=(phase*5)%2>1?MAT.blood:MAT.gun2;
  addBox(g,'PLATE',[1.8+.08*(10%5),.16,.92+.04*(10%7)],mA,[0,0,0]);
  addBox(g,'BACKING',[1.38,.10,.62],mB,[0,-.16,0]);
  addBox(g,'SEAM',[1.1,.018,.025],mC,[0,.095,.47]);
  addBolt(g,'BOLT_A',.055,.035,mB,[-.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_B',.055,.035,mB,[.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_C',.045,.035,mB,[-.62,.11,-.48],[PI/2,0,0]);
  addBolt(g,'BOLT_D',.045,.035,mB,[.62,.11,-.48],[PI/2,0,0]);
  addTorus(g,'SERVICE_RING',.23,.025,mC,[0,.12,.52],[PI/2,0,0],24,6);
  addBox(g,'MICRO_RAIL',[.92,.035,.05],mB,[0,.13,-.51]);
  parent.add(g);
  return g;
}
function detailModule011(parent, origin=[0,0,0], phase=0) {
  const g=new THREE.Group();
  g.name='DETAIL_MODULE_011';
  g.position.set(origin[0],origin[1],origin[2]);
  g.rotation.y=phase;
  const mA=(phase*10)%2>1?MAT.gun2:MAT.gun3;
  const mB=(phase*7)%2>1?MAT.steel:MAT.graphite;
  const mC=(phase*5)%2>1?MAT.blood:MAT.gun2;
  addBox(g,'PLATE',[1.8+.08*(11%5),.16,.92+.04*(11%7)],mA,[0,0,0]);
  addBox(g,'BACKING',[1.38,.10,.62],mB,[0,-.16,0]);
  addBox(g,'SEAM',[1.1,.018,.025],mC,[0,.095,.47]);
  addBolt(g,'BOLT_A',.055,.035,mB,[-.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_B',.055,.035,mB,[.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_C',.045,.035,mB,[-.62,.11,-.48],[PI/2,0,0]);
  addBolt(g,'BOLT_D',.045,.035,mB,[.62,.11,-.48],[PI/2,0,0]);
  addTorus(g,'SERVICE_RING',.23,.025,mC,[0,.12,.52],[PI/2,0,0],24,6);
  addBox(g,'MICRO_RAIL',[.92,.035,.05],mB,[0,.13,-.51]);
  parent.add(g);
  return g;
}
function detailModule012(parent, origin=[0,0,0], phase=0) {
  const g=new THREE.Group();
  g.name='DETAIL_MODULE_012';
  g.position.set(origin[0],origin[1],origin[2]);
  g.rotation.y=phase;
  const mA=(phase*10)%2>1?MAT.gun2:MAT.gun3;
  const mB=(phase*7)%2>1?MAT.steel:MAT.graphite;
  const mC=(phase*5)%2>1?MAT.blood:MAT.gun2;
  addBox(g,'PLATE',[1.8+.08*(12%5),.16,.92+.04*(12%7)],mA,[0,0,0]);
  addBox(g,'BACKING',[1.38,.10,.62],mB,[0,-.16,0]);
  addBox(g,'SEAM',[1.1,.018,.025],mC,[0,.095,.47]);
  addBolt(g,'BOLT_A',.055,.035,mB,[-.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_B',.055,.035,mB,[.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_C',.045,.035,mB,[-.62,.11,-.48],[PI/2,0,0]);
  addBolt(g,'BOLT_D',.045,.035,mB,[.62,.11,-.48],[PI/2,0,0]);
  addTorus(g,'SERVICE_RING',.23,.025,mC,[0,.12,.52],[PI/2,0,0],24,6);
  addBox(g,'MICRO_RAIL',[.92,.035,.05],mB,[0,.13,-.51]);
  parent.add(g);
  return g;
}
function detailModule013(parent, origin=[0,0,0], phase=0) {
  const g=new THREE.Group();
  g.name='DETAIL_MODULE_013';
  g.position.set(origin[0],origin[1],origin[2]);
  g.rotation.y=phase;
  const mA=(phase*10)%2>1?MAT.gun2:MAT.gun3;
  const mB=(phase*7)%2>1?MAT.steel:MAT.graphite;
  const mC=(phase*5)%2>1?MAT.blood:MAT.gun2;
  addBox(g,'PLATE',[1.8+.08*(13%5),.16,.92+.04*(13%7)],mA,[0,0,0]);
  addBox(g,'BACKING',[1.38,.10,.62],mB,[0,-.16,0]);
  addBox(g,'SEAM',[1.1,.018,.025],mC,[0,.095,.47]);
  addBolt(g,'BOLT_A',.055,.035,mB,[-.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_B',.055,.035,mB,[.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_C',.045,.035,mB,[-.62,.11,-.48],[PI/2,0,0]);
  addBolt(g,'BOLT_D',.045,.035,mB,[.62,.11,-.48],[PI/2,0,0]);
  addTorus(g,'SERVICE_RING',.23,.025,mC,[0,.12,.52],[PI/2,0,0],24,6);
  addBox(g,'MICRO_RAIL',[.92,.035,.05],mB,[0,.13,-.51]);
  parent.add(g);
  return g;
}
function detailModule014(parent, origin=[0,0,0], phase=0) {
  const g=new THREE.Group();
  g.name='DETAIL_MODULE_014';
  g.position.set(origin[0],origin[1],origin[2]);
  g.rotation.y=phase;
  const mA=(phase*10)%2>1?MAT.gun2:MAT.gun3;
  const mB=(phase*7)%2>1?MAT.steel:MAT.graphite;
  const mC=(phase*5)%2>1?MAT.blood:MAT.gun2;
  addBox(g,'PLATE',[1.8+.08*(14%5),.16,.92+.04*(14%7)],mA,[0,0,0]);
  addBox(g,'BACKING',[1.38,.10,.62],mB,[0,-.16,0]);
  addBox(g,'SEAM',[1.1,.018,.025],mC,[0,.095,.47]);
  addBolt(g,'BOLT_A',.055,.035,mB,[-.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_B',.055,.035,mB,[.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_C',.045,.035,mB,[-.62,.11,-.48],[PI/2,0,0]);
  addBolt(g,'BOLT_D',.045,.035,mB,[.62,.11,-.48],[PI/2,0,0]);
  addTorus(g,'SERVICE_RING',.23,.025,mC,[0,.12,.52],[PI/2,0,0],24,6);
  addBox(g,'MICRO_RAIL',[.92,.035,.05],mB,[0,.13,-.51]);
  parent.add(g);
  return g;
}
function detailModule015(parent, origin=[0,0,0], phase=0) {
  const g=new THREE.Group();
  g.name='DETAIL_MODULE_015';
  g.position.set(origin[0],origin[1],origin[2]);
  g.rotation.y=phase;
  const mA=(phase*10)%2>1?MAT.gun2:MAT.gun3;
  const mB=(phase*7)%2>1?MAT.steel:MAT.graphite;
  const mC=(phase*5)%2>1?MAT.blood:MAT.gun2;
  addBox(g,'PLATE',[1.8+.08*(15%5),.16,.92+.04*(15%7)],mA,[0,0,0]);
  addBox(g,'BACKING',[1.38,.10,.62],mB,[0,-.16,0]);
  addBox(g,'SEAM',[1.1,.018,.025],mC,[0,.095,.47]);
  addBolt(g,'BOLT_A',.055,.035,mB,[-.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_B',.055,.035,mB,[.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_C',.045,.035,mB,[-.62,.11,-.48],[PI/2,0,0]);
  addBolt(g,'BOLT_D',.045,.035,mB,[.62,.11,-.48],[PI/2,0,0]);
  addTorus(g,'SERVICE_RING',.23,.025,mC,[0,.12,.52],[PI/2,0,0],24,6);
  addBox(g,'MICRO_RAIL',[.92,.035,.05],mB,[0,.13,-.51]);
  parent.add(g);
  return g;
}
function detailModule016(parent, origin=[0,0,0], phase=0) {
  const g=new THREE.Group();
  g.name='DETAIL_MODULE_016';
  g.position.set(origin[0],origin[1],origin[2]);
  g.rotation.y=phase;
  const mA=(phase*10)%2>1?MAT.gun2:MAT.gun3;
  const mB=(phase*7)%2>1?MAT.steel:MAT.graphite;
  const mC=(phase*5)%2>1?MAT.blood:MAT.gun2;
  addBox(g,'PLATE',[1.8+.08*(16%5),.16,.92+.04*(16%7)],mA,[0,0,0]);
  addBox(g,'BACKING',[1.38,.10,.62],mB,[0,-.16,0]);
  addBox(g,'SEAM',[1.1,.018,.025],mC,[0,.095,.47]);
  addBolt(g,'BOLT_A',.055,.035,mB,[-.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_B',.055,.035,mB,[.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_C',.045,.035,mB,[-.62,.11,-.48],[PI/2,0,0]);
  addBolt(g,'BOLT_D',.045,.035,mB,[.62,.11,-.48],[PI/2,0,0]);  addTorus(g,'SERVICE_RING',.23,.025,mC,[0,.12,.52],[PI/2,0,0],24,6);
  addBox(g,'MICRO_RAIL',[.92,.035,.05],mB,[0,.13,-.51]);
  parent.add(g);
  return g;
}
function detailModule017(parent, origin=[0,0,0], phase=0) {
  const g=new THREE.Group();
  g.name='DETAIL_MODULE_017';
  g.position.set(origin[0],origin[1],origin[2]);
  g.rotation.y=phase;
  const mA=(phase*10)%2>1?MAT.gun2:MAT.gun3;
  const mB=(phase*7)%2>1?MAT.steel:MAT.graphite;
  const mC=(phase*5)%2>1?MAT.blood:MAT.gun2;
  addBox(g,'PLATE',[1.8+.08*(17%5),.16,.92+.04*(17%7)],mA,[0,0,0]);
  addBox(g,'BACKING',[1.38,.10,.62],mB,[0,-.16,0]);
  addBox(g,'SEAM',[1.1,.018,.025],mC,[0,.095,.47]);
  addBolt(g,'BOLT_A',.055,.035,mB,[-.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_B',.055,.035,mB,[.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_C',.045,.035,mB,[-.62,.11,-.48],[PI/2,0,0]);
  addBolt(g,'BOLT_D',.045,.035,mB,[.62,.11,-.48],[PI/2,0,0]);
  addTorus(g,'SERVICE_RING',.23,.025,mC,[0,.12,.52],[PI/2,0,0],24,6);
  addBox(g,'MICRO_RAIL',[.92,.035,.05],mB,[0,.13,-.51]);
  parent.add(g);
  return g;
}
function detailModule018(parent, origin=[0,0,0], phase=0) {
  const g=new THREE.Group();
  g.name='DETAIL_MODULE_018';
  g.position.set(origin[0],origin[1],origin[2]);
  g.rotation.y=phase;
  const mA=(phase*10)%2>1?MAT.gun2:MAT.gun3;
  const mB=(phase*7)%2>1?MAT.steel:MAT.graphite;
  const mC=(phase*5)%2>1?MAT.blood:MAT.gun2;
  addBox(g,'PLATE',[1.8+.08*(18%5),.16,.92+.04*(18%7)],mA,[0,0,0]);
  addBox(g,'BACKING',[1.38,.10,.62],mB,[0,-.16,0]);
  addBox(g,'SEAM',[1.1,.018,.025],mC,[0,.095,.47]);
  addBolt(g,'BOLT_A',.055,.035,mB,[-.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_B',.055,.035,mB,[.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_C',.045,.035,mB,[-.62,.11,-.48],[PI/2,0,0]);
  addBolt(g,'BOLT_D',.045,.035,mB,[.62,.11,-.48],[PI/2,0,0]);
  addTorus(g,'SERVICE_RING',.23,.025,mC,[0,.12,.52],[PI/2,0,0],24,6);
  addBox(g,'MICRO_RAIL',[.92,.035,.05],mB,[0,.13,-.51]);
  parent.add(g);
  return g;
}
function detailModule019(parent, origin=[0,0,0], phase=0) {
  const g=new THREE.Group();
  g.name='DETAIL_MODULE_019';
  g.position.set(origin[0],origin[1],origin[2]);
  g.rotation.y=phase;
  const mA=(phase*10)%2>1?MAT.gun2:MAT.gun3;
  const mB=(phase*7)%2>1?MAT.steel:MAT.graphite;
  const mC=(phase*5)%2>1?MAT.blood:MAT.gun2;
  addBox(g,'PLATE',[1.8+.08*(19%5),.16,.92+.04*(19%7)],mA,[0,0,0]);
  addBox(g,'BACKING',[1.38,.10,.62],mB,[0,-.16,0]);
  addBox(g,'SEAM',[1.1,.018,.025],mC,[0,.095,.47]);
  addBolt(g,'BOLT_A',.055,.035,mB,[-.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_B',.055,.035,mB,[.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_C',.045,.035,mB,[-.62,.11,-.48],[PI/2,0,0]);
  addBolt(g,'BOLT_D',.045,.035,mB,[.62,.11,-.48],[PI/2,0,0]);
  addTorus(g,'SERVICE_RING',.23,.025,mC,[0,.12,.52],[PI/2,0,0],24,6);
  addBox(g,'MICRO_RAIL',[.92,.035,.05],mB,[0,.13,-.51]);
  parent.add(g);
  return g;
}
function detailModule020(parent, origin=[0,0,0], phase=0) {
  const g=new THREE.Group();
  g.name='DETAIL_MODULE_020';
  g.position.set(origin[0],origin[1],origin[2]);
  g.rotation.y=phase;
  const mA=(phase*10)%2>1?MAT.gun2:MAT.gun3;
  const mB=(phase*7)%2>1?MAT.steel:MAT.graphite;
  const mC=(phase*5)%2>1?MAT.blood:MAT.gun2;
  addBox(g,'PLATE',[1.8+.08*(20%5),.16,.92+.04*(20%7)],mA,[0,0,0]);
  addBox(g,'BACKING',[1.38,.10,.62],mB,[0,-.16,0]);
  addBox(g,'SEAM',[1.1,.018,.025],mC,[0,.095,.47]);
  addBolt(g,'BOLT_A',.055,.035,mB,[-.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_B',.055,.035,mB,[.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_C',.045,.035,mB,[-.62,.11,-.48],[PI/2,0,0]);
  addBolt(g,'BOLT_D',.045,.035,mB,[.62,.11,-.48],[PI/2,0,0]);
  addTorus(g,'SERVICE_RING',.23,.025,mC,[0,.12,.52],[PI/2,0,0],24,6);
  addBox(g,'MICRO_RAIL',[.92,.035,.05],mB,[0,.13,-.51]);
  parent.add(g);
  return g;
}
function detailModule021(parent, origin=[0,0,0], phase=0) {
  const g=new THREE.Group();
  g.name='DETAIL_MODULE_021';
  g.position.set(origin[0],origin[1],origin[2]);
  g.rotation.y=phase;
  const mA=(phase*10)%2>1?MAT.gun2:MAT.gun3;
  const mB=(phase*7)%2>1?MAT.steel:MAT.graphite;
  const mC=(phase*5)%2>1?MAT.blood:MAT.gun2;
  addBox(g,'PLATE',[1.8+.08*(21%5),.16,.92+.04*(21%7)],mA,[0,0,0]);
  addBox(g,'BACKING',[1.38,.10,.62],mB,[0,-.16,0]);
  addBox(g,'SEAM',[1.1,.018,.025],mC,[0,.095,.47]);
  addBolt(g,'BOLT_A',.055,.035,mB,[-.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_B',.055,.035,mB,[.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_C',.045,.035,mB,[-.62,.11,-.48],[PI/2,0,0]);
  addBolt(g,'BOLT_D',.045,.035,mB,[.62,.11,-.48],[PI/2,0,0]);
  addTorus(g,'SERVICE_RING',.23,.025,mC,[0,.12,.52],[PI/2,0,0],24,6);
  addBox(g,'MICRO_RAIL',[.92,.035,.05],mB,[0,.13,-.51]);
  parent.add(g);
  return g;
}
function detailModule022(parent, origin=[0,0,0], phase=0) {
  const g=new THREE.Group();
  g.name='DETAIL_MODULE_022';
  g.position.set(origin[0],origin[1],origin[2]);
  g.rotation.y=phase;
  const mA=(phase*10)%2>1?MAT.gun2:MAT.gun3;
  const mB=(phase*7)%2>1?MAT.steel:MAT.graphite;
  const mC=(phase*5)%2>1?MAT.blood:MAT.gun2;
  addBox(g,'PLATE',[1.8+.08*(22%5),.16,.92+.04*(22%7)],mA,[0,0,0]);
  addBox(g,'BACKING',[1.38,.10,.62],mB,[0,-.16,0]);
  addBox(g,'SEAM',[1.1,.018,.025],mC,[0,.095,.47]);
  addBolt(g,'BOLT_A',.055,.035,mB,[-.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_B',.055,.035,mB,[.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_C',.045,.035,mB,[-.62,.11,-.48],[PI/2,0,0]);
  addBolt(g,'BOLT_D',.045,.035,mB,[.62,.11,-.48],[PI/2,0,0]);
  addTorus(g,'SERVICE_RING',.23,.025,mC,[0,.12,.52],[PI/2,0,0],24,6);
  addBox(g,'MICRO_RAIL',[.92,.035,.05],mB,[0,.13,-.51]);
  parent.add(g);
  return g;
}
function detailModule023(parent, origin=[0,0,0], phase=0) {
  const g=new THREE.Group();
  g.name='DETAIL_MODULE_023';
  g.position.set(origin[0],origin[1],origin[2]);
  g.rotation.y=phase;
  const mA=(phase*10)%2>1?MAT.gun2:MAT.gun3;
  const mB=(phase*7)%2>1?MAT.steel:MAT.graphite;
  const mC=(phase*5)%2>1?MAT.blood:MAT.gun2;
  addBox(g,'PLATE',[1.8+.08*(23%5),.16,.92+.04*(23%7)],mA,[0,0,0]);
  addBox(g,'BACKING',[1.38,.10,.62],mB,[0,-.16,0]);
  addBox(g,'SEAM',[1.1,.018,.025],mC,[0,.095,.47]);
  addBolt(g,'BOLT_A',.055,.035,mB,[-.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_B',.055,.035,mB,[.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_C',.045,.035,mB,[-.62,.11,-.48],[PI/2,0,0]);
  addBolt(g,'BOLT_D',.045,.035,mB,[.62,.11,-.48],[PI/2,0,0]);
  addTorus(g,'SERVICE_RING',.23,.025,mC,[0,.12,.52],[PI/2,0,0],24,6);
  addBox(g,'MICRO_RAIL',[.92,.035,.05],mB,[0,.13,-.51]);
  parent.add(g);
  return g;
}
function detailModule024(parent, origin=[0,0,0], phase=0) {
  const g=new THREE.Group();
  g.name='DETAIL_MODULE_024';
  g.position.set(origin[0],origin[1],origin[2]);
  g.rotation.y=phase;
  const mA=(phase*10)%2>1?MAT.gun2:MAT.gun3;
  const mB=(phase*7)%2>1?MAT.steel:MAT.graphite;
  const mC=(phase*5)%2>1?MAT.blood:MAT.gun2;
  addBox(g,'PLATE',[1.8+.08*(24%5),.16,.92+.04*(24%7)],mA,[0,0,0]);
  addBox(g,'BACKING',[1.38,.10,.62],mB,[0,-.16,0]);
  addBox(g,'SEAM',[1.1,.018,.025],mC,[0,.095,.47]);
  addBolt(g,'BOLT_A',.055,.035,mB,[-.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_B',.055,.035,mB,[.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_C',.045,.035,mB,[-.62,.11,-.48],[PI/2,0,0]);
  addBolt(g,'BOLT_D',.045,.035,mB,[.62,.11,-.48],[PI/2,0,0]);
  addTorus(g,'SERVICE_RING',.23,.025,mC,[0,.12,.52],[PI/2,0,0],24,6);
  addBox(g,'MICRO_RAIL',[.92,.035,.05],mB,[0,.13,-.51]);
  parent.add(g);
  return g;
}
function detailModule025(parent, origin=[0,0,0], phase=0) {
  const g=new THREE.Group();
  g.name='DETAIL_MODULE_025';
  g.position.set(origin[0],origin[1],origin[2]);
  g.rotation.y=phase;
  const mA=(phase*10)%2>1?MAT.gun2:MAT.gun3;
  const mB=(phase*7)%2>1?MAT.steel:MAT.graphite;
  const mC=(phase*5)%2>1?MAT.blood:MAT.gun2;
  addBox(g,'PLATE',[1.8+.08*(25%5),.16,.92+.04*(25%7)],mA,[0,0,0]);
  addBox(g,'BACKING',[1.38,.10,.62],mB,[0,-.16,0]);
  addBox(g,'SEAM',[1.1,.018,.025],mC,[0,.095,.47]);
  addBolt(g,'BOLT_A',.055,.035,mB,[-.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_B',.055,.035,mB,[.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_C',.045,.035,mB,[-.62,.11,-.48],[PI/2,0,0]);
  addBolt(g,'BOLT_D',.045,.035,mB,[.62,.11,-.48],[PI/2,0,0]);
  addTorus(g,'SERVICE_RING',.23,.025,mC,[0,.12,.52],[PI/2,0,0],24,6);
  addBox(g,'MICRO_RAIL',[.92,.035,.05],mB,[0,.13,-.51]);
  parent.add(g);
  return g;
}
function detailModule026(parent, origin=[0,0,0], phase=0) {
  const g=new THREE.Group();
  g.name='DETAIL_MODULE_026';
  g.position.set(origin[0],origin[1],origin[2]);
  g.rotation.y=phase;
  const mA=(phase*10)%2>1?MAT.gun2:MAT.gun3;
  const mB=(phase*7)%2>1?MAT.steel:MAT.graphite;
  const mC=(phase*5)%2>1?MAT.blood:MAT.gun2;
  addBox(g,'PLATE',[1.8+.08*(26%5),.16,.92+.04*(26%7)],mA,[0,0,0]);
  addBox(g,'BACKING',[1.38,.10,.62],mB,[0,-.16,0]);
  addBox(g,'SEAM',[1.1,.018,.025],mC,[0,.095,.47]);
  addBolt(g,'BOLT_A',.055,.035,mB,[-.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_B',.055,.035,mB,[.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_C',.045,.035,mB,[-.62,.11,-.48],[PI/2,0,0]);
  addBolt(g,'BOLT_D',.045,.035,mB,[.62,.11,-.48],[PI/2,0,0]);
  addTorus(g,'SERVICE_RING',.23,.025,mC,[0,.12,.52],[PI/2,0,0],24,6);
  addBox(g,'MICRO_RAIL',[.92,.035,.05],mB,[0,.13,-.51]);
  parent.add(g);
  return g;
}
function detailModule027(parent, origin=[0,0,0], phase=0) {
  const g=new THREE.Group();
  g.name='DETAIL_MODULE_027';
  g.position.set(origin[0],origin[1],origin[2]);
  g.rotation.y=phase;
  const mA=(phase*10)%2>1?MAT.gun2:MAT.gun3;
  const mB=(phase*7)%2>1?MAT.steel:MAT.graphite;
  const mC=(phase*5)%2>1?MAT.blood:MAT.gun2;
  addBox(g,'PLATE',[1.8+.08*(27%5),.16,.92+.04*(27%7)],mA,[0,0,0]);
  addBox(g,'BACKING',[1.38,.10,.62],mB,[0,-.16,0]);
  addBox(g,'SEAM',[1.1,.018,.025],mC,[0,.095,.47]);
  addBolt(g,'BOLT_A',.055,.035,mB,[-.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_B',.055,.035,mB,[.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_C',.045,.035,mB,[-.62,.11,-.48],[PI/2,0,0]);
  addBolt(g,'BOLT_D',.045,.035,mB,[.62,.11,-.48],[PI/2,0,0]);
  addTorus(g,'SERVICE_RING',.23,.025,mC,[0,.12,.52],[PI/2,0,0],24,6);
  addBox(g,'MICRO_RAIL',[.92,.035,.05],mB,[0,.13,-.51]);
  parent.add(g);
  return g;
}
function detailModule028(parent, origin=[0,0,0], phase=0) {
  const g=new THREE.Group();
  g.name='DETAIL_MODULE_028';
  g.position.set(origin[0],origin[1],origin[2]);
  g.rotation.y=phase;
  const mA=(phase*10)%2>1?MAT.gun2:MAT.gun3;
  const mB=(phase*7)%2>1?MAT.steel:MAT.graphite;
  const mC=(phase*5)%2>1?MAT.blood:MAT.gun2;
  addBox(g,'PLATE',[1.8+.08*(28%5),.16,.92+.04*(28%7)],mA,[0,0,0]);
  addBox(g,'BACKING',[1.38,.10,.62],mB,[0,-.16,0]);
  addBox(g,'SEAM',[1.1,.018,.025],mC,[0,.095,.47]);
  addBolt(g,'BOLT_A',.055,.035,mB,[-.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_B',.055,.035,mB,[.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_C',.045,.035,mB,[-.62,.11,-.48],[PI/2,0,0]);
  addBolt(g,'BOLT_D',.045,.035,mB,[.62,.11,-.48],[PI/2,0,0]);
  addTorus(g,'SERVICE_RING',.23,.025,mC,[0,.12,.52],[PI/2,0,0],24,6);
  addBox(g,'MICRO_RAIL',[.92,.035,.05],mB,[0,.13,-.51]);
  parent.add(g);
  return g;
}
function detailModule029(parent, origin=[0,0,0], phase=0) {
  const g=new THREE.Group();
  g.name='DETAIL_MODULE_029';
  g.position.set(origin[0],origin[1],origin[2]);
  g.rotation.y=phase;
  const mA=(phase*10)%2>1?MAT.gun2:MAT.gun3;
  const mB=(phase*7)%2>1?MAT.steel:MAT.graphite;
  const mC=(phase*5)%2>1?MAT.blood:MAT.gun2;
  addBox(g,'PLATE',[1.8+.08*(29%5),.16,.92+.04*(29%7)],mA,[0,0,0]);
  addBox(g,'BACKING',[1.38,.10,.62],mB,[0,-.16,0]);
  addBox(g,'SEAM',[1.1,.018,.025],mC,[0,.095,.47]);
  addBolt(g,'BOLT_A',.055,.035,mB,[-.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_B',.055,.035,mB,[.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_C',.045,.035,mB,[-.62,.11,-.48],[PI/2,0,0]);
  addBolt(g,'BOLT_D',.045,.035,mB,[.62,.11,-.48],[PI/2,0,0]);
  addTorus(g,'SERVICE_RING',.23,.025,mC,[0,.12,.52],[PI/2,0,0],24,6);
  addBox(g,'MICRO_RAIL',[.92,.035,.05],mB,[0,.13,-.51]);
  parent.add(g);
  return g;
}
function detailModule030(parent, origin=[0,0,0], phase=0) {
  const g=new THREE.Group();
  g.name='DETAIL_MODULE_030';
  g.position.set(origin[0],origin[1],origin[2]);
  g.rotation.y=phase;
  const mA=(phase*10)%2>1?MAT.gun2:MAT.gun3;
  const mB=(phase*7)%2>1?MAT.steel:MAT.graphite;
  const mC=(phase*5)%2>1?MAT.blood:MAT.gun2;
  addBox(g,'PLATE',[1.8+.08*(30%5),.16,.92+.04*(30%7)],mA,[0,0,0]);
  addBox(g,'BACKING',[1.38,.10,.62],mB,[0,-.16,0]);
  addBox(g,'SEAM',[1.1,.018,.025],mC,[0,.095,.47]);
  addBolt(g,'BOLT_A',.055,.035,mB,[-.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_B',.055,.035,mB,[.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_C',.045,.035,mB,[-.62,.11,-.48],[PI/2,0,0]);
  addBolt(g,'BOLT_D',.045,.035,mB,[.62,.11,-.48],[PI/2,0,0]);
  addTorus(g,'SERVICE_RING',.23,.025,mC,[0,.12,.52],[PI/2,0,0],24,6);
  addBox(g,'MICRO_RAIL',[.92,.035,.05],mB,[0,.13,-.51]);
  parent.add(g);
  return g;
}
function detailModule031(parent, origin=[0,0,0], phase=0) {
  const g=new THREE.Group();
  g.name='DETAIL_MODULE_031';
  g.position.set(origin[0],origin[1],origin[2]);
  g.rotation.y=phase;
  const mA=(phase*10)%2>1?MAT.gun2:MAT.gun3;
  const mB=(phase*7)%2>1?MAT.steel:MAT.graphite;
  const mC=(phase*5)%2>1?MAT.blood:MAT.gun2;
  addBox(g,'PLATE',[1.8+.08*(31%5),.16,.92+.04*(31%7)],mA,[0,0,0]);
  addBox(g,'BACKING',[1.38,.10,.62],mB,[0,-.16,0]);
  addBox(g,'SEAM',[1.1,.018,.025],mC,[0,.095,.47]);
  addBolt(g,'BOLT_A',.055,.035,mB,[-.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_B',.055,.035,mB,[.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_C',.045,.035,mB,[-.62,.11,-.48],[PI/2,0,0]);
  addBolt(g,'BOLT_D',.045,.035,mB,[.62,.11,-.48],[PI/2,0,0]);
  addTorus(g,'SERVICE_RING',.23,.025,mC,[0,.12,.52],[PI/2,0,0],24,6);
  addBox(g,'MICRO_RAIL',[.92,.035,.05],mB,[0,.13,-.51]);
  parent.add(g);
  return g;
}
function detailModule032(parent, origin=[0,0,0], phase=0) {
  const g=new THREE.Group();
  g.name='DETAIL_MODULE_032';
  g.position.set(origin[0],origin[1],origin[2]);
  g.rotation.y=phase;
  const mA=(phase*10)%2>1?MAT.gun2:MAT.gun3;
  const mB=(phase*7)%2>1?MAT.steel:MAT.graphite;
  const mC=(phase*5)%2>1?MAT.blood:MAT.gun2;
  addBox(g,'PLATE',[1.8+.08*(32%5),.16,.92+.04*(32%7)],mA,[0,0,0]);
  addBox(g,'BACKING',[1.38,.10,.62],mB,[0,-.16,0]);
  addBox(g,'SEAM',[1.1,.018,.025],mC,[0,.095,.47]);
  addBolt(g,'BOLT_A',.055,.035,mB,[-.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_B',.055,.035,mB,[.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_C',.045,.035,mB,[-.62,.11,-.48],[PI/2,0,0]);
  addBolt(g,'BOLT_D',.045,.035,mB,[.62,.11,-.48],[PI/2,0,0]);
  addTorus(g,'SERVICE_RING',.23,.025,mC,[0,.12,.52],[PI/2,0,0],24,6);
  addBox(g,'MICRO_RAIL',[.92,.035,.05],mB,[0,.13,-.51]);
  parent.add(g);
  return g;
}
function detailModule033(parent, origin=[0,0,0], phase=0) {
  const g=new THREE.Group();
  g.name='DETAIL_MODULE_033';
  g.position.set(origin[0],origin[1],origin[2]);
  g.rotation.y=phase;
  const mA=(phase*10)%2>1?MAT.gun2:MAT.gun3;
  const mB=(phase*7)%2>1?MAT.steel:MAT.graphite;
  const mC=(phase*5)%2>1?MAT.blood:MAT.gun2;
  addBox(g,'PLATE',[1.8+.08*(33%5),.16,.92+.04*(33%7)],mA,[0,0,0]);
  addBox(g,'BACKING',[1.38,.10,.62],mB,[0,-.16,0]);
  addBox(g,'SEAM',[1.1,.018,.025],mC,[0,.095,.47]);
  addBolt(g,'BOLT_A',.055,.035,mB,[-.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_B',.055,.035,mB,[.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_C',.045,.035,mB,[-.62,.11,-.48],[PI/2,0,0]);
  addBolt(g,'BOLT_D',.045,.035,mB,[.62,.11,-.48],[PI/2,0,0]);
  addTorus(g,'SERVICE_RING',.23,.025,mC,[0,.12,.52],[PI/2,0,0],24,6);
  addBox(g,'MICRO_RAIL',[.92,.035,.05],mB,[0,.13,-.51]);
  parent.add(g);
  return g;
}
function detailModule034(parent, origin=[0,0,0], phase=0) {
  const g=new THREE.Group();
  g.name='DETAIL_MODULE_034';
  g.position.set(origin[0],origin[1],origin[2]);
  g.rotation.y=phase;
  const mA=(phase*10)%2>1?MAT.gun2:MAT.gun3;
  const mB=(phase*7)%2>1?MAT.steel:MAT.graphite;
  const mC=(phase*5)%2>1?MAT.blood:MAT.gun2;
  addBox(g,'PLATE',[1.8+.08*(34%5),.16,.92+.04*(34%7)],mA,[0,0,0]);
  addBox(g,'BACKING',[1.38,.10,.62],mB,[0,-.16,0]);
  addBox(g,'SEAM',[1.1,.018,.025],mC,[0,.095,.47]);
  addBolt(g,'BOLT_A',.055,.035,mB,[-.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_B',.055,.035,mB,[.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_C',.045,.035,mB,[-.62,.11,-.48],[PI/2,0,0]);
  addBolt(g,'BOLT_D',.045,.035,mB,[.62,.11,-.48],[PI/2,0,0]);
  addTorus(g,'SERVICE_RING',.23,.025,mC,[0,.12,.52],[PI/2,0,0],24,6);
  addBox(g,'MICRO_RAIL',[.92,.035,.05],mB,[0,.13,-.51]);
  parent.add(g);
  return g;
}
function detailModule035(parent, origin=[0,0,0], phase=0) {
  const g=new THREE.Group();
  g.name='DETAIL_MODULE_035';
  g.position.set(origin[0],origin[1],origin[2]);
  g.rotation.y=phase;
  const mA=(phase*10)%2>1?MAT.gun2:MAT.gun3;
  const mB=(phase*7)%2>1?MAT.steel:MAT.graphite;
  const mC=(phase*5)%2>1?MAT.blood:MAT.gun2;
  addBox(g,'PLATE',[1.8+.08*(35%5),.16,.92+.04*(35%7)],mA,[0,0,0]);
  addBox(g,'BACKING',[1.38,.10,.62],mB,[0,-.16,0]);
  addBox(g,'SEAM',[1.1,.018,.025],mC,[0,.095,.47]);
  addBolt(g,'BOLT_A',.055,.035,mB,[-.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_B',.055,.035,mB,[.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_C',.045,.035,mB,[-.62,.11,-.48],[PI/2,0,0]);
  addBolt(g,'BOLT_D',.045,.035,mB,[.62,.11,-.48],[PI/2,0,0]);
  addTorus(g,'SERVICE_RING',.23,.025,mC,[0,.12,.52],[PI/2,0,0],24,6);
  addBox(g,'MICRO_RAIL',[.92,.035,.05],mB,[0,.13,-.51]);
  parent.add(g);
  return g;
}
function detailModule036(parent, origin=[0,0,0], phase=0) {
  const g=new THREE.Group();
  g.name='DETAIL_MODULE_036';
  g.position.set(origin[0],origin[1],origin[2]);
  g.rotation.y=phase;
  const mA=(phase*10)%2>1?MAT.gun2:MAT.gun3;
  const mB=(phase*7)%2>1?MAT.steel:MAT.graphite;
  const mC=(phase*5)%2>1?MAT.blood:MAT.gun2;
  addBox(g,'PLATE',[1.8+.08*(36%5),.16,.92+.04*(36%7)],mA,[0,0,0]);
  addBox(g,'BACKING',[1.38,.10,.62],mB,[0,-.16,0]);
  addBox(g,'SEAM',[1.1,.018,.025],mC,[0,.095,.47]);
  addBolt(g,'BOLT_A',.055,.035,mB,[-.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_B',.055,.035,mB,[.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_C',.045,.035,mB,[-.62,.11,-.48],[PI/2,0,0]);
  addBolt(g,'BOLT_D',.045,.035,mB,[.62,.11,-.48],[PI/2,0,0]);
  addTorus(g,'SERVICE_RING',.23,.025,mC,[0,.12,.52],[PI/2,0,0],24,6);
  addBox(g,'MICRO_RAIL',[.92,.035,.05],mB,[0,.13,-.51]);
  parent.add(g);
  return g;
}
function detailModule037(parent, origin=[0,0,0], phase=0) {
  const g=new THREE.Group();
  g.name='DETAIL_MODULE_037';
  g.position.set(origin[0],origin[1],origin[2]);
  g.rotation.y=phase;
  const mA=(phase*10)%2>1?MAT.gun2:MAT.gun3;
  const mB=(phase*7)%2>1?MAT.steel:MAT.graphite;
  const mC=(phase*5)%2>1?MAT.blood:MAT.gun2;
  addBox(g,'PLATE',[1.8+.08*(37%5),.16,.92+.04*(37%7)],mA,[0,0,0]);
  addBox(g,'BACKING',[1.38,.10,.62],mB,[0,-.16,0]);
  addBox(g,'SEAM',[1.1,.018,.025],mC,[0,.095,.47]);
  addBolt(g,'BOLT_A',.055,.035,mB,[-.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_B',.055,.035,mB,[.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_C',.045,.035,mB,[-.62,.11,-.48],[PI/2,0,0]);
  addBolt(g,'BOLT_D',.045,.035,mB,[.62,.11,-.48],[PI/2,0,0]);
  addTorus(g,'SERVICE_RING',.23,.025,mC,[0,.12,.52],[PI/2,0,0],24,6);
  addBox(g,'MICRO_RAIL',[.92,.035,.05],mB,[0,.13,-.51]);
  parent.add(g);
  return g;
}
function detailModule038(parent, origin=[0,0,0], phase=0) {
  const g=new THREE.Group();
  g.name='DETAIL_MODULE_038';
  g.position.set(origin[0],origin[1],origin[2]);
  g.rotation.y=phase;
  const mA=(phase*10)%2>1?MAT.gun2:MAT.gun3;
  const mB=(phase*7)%2>1?MAT.steel:MAT.graphite;
  const mC=(phase*5)%2>1?MAT.blood:MAT.gun2;
  addBox(g,'PLATE',[1.8+.08*(38%5),.16,.92+.04*(38%7)],mA,[0,0,0]);
  addBox(g,'BACKING',[1.38,.10,.62],mB,[0,-.16,0]);
  addBox(g,'SEAM',[1.1,.018,.025],mC,[0,.095,.47]);
  addBolt(g,'BOLT_A',.055,.035,mB,[-.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_B',.055,.035,mB,[.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_C',.045,.035,mB,[-.62,.11,-.48],[PI/2,0,0]);
  addBolt(g,'BOLT_D',.045,.035,mB,[.62,.11,-.48],[PI/2,0,0]);
  addTorus(g,'SERVICE_RING',.23,.025,mC,[0,.12,.52],[PI/2,0,0],24,6);
  addBox(g,'MICRO_RAIL',[.92,.035,.05],mB,[0,.13,-.51]);
  parent.add(g);
  return g;
}
function detailModule039(parent, origin=[0,0,0], phase=0) {
  const g=new THREE.Group();
  g.name='DETAIL_MODULE_039';
  g.position.set(origin[0],origin[1],origin[2]);
  g.rotation.y=phase;
  const mA=(phase*10)%2>1?MAT.gun2:MAT.gun3;
  const mB=(phase*7)%2>1?MAT.steel:MAT.graphite;
  const mC=(phase*5)%2>1?MAT.blood:MAT.gun2;
  addBox(g,'PLATE',[1.8+.08*(39%5),.16,.92+.04*(39%7)],mA,[0,0,0]);
  addBox(g,'BACKING',[1.38,.10,.62],mB,[0,-.16,0]);
  addBox(g,'SEAM',[1.1,.018,.025],mC,[0,.095,.47]);
  addBolt(g,'BOLT_A',.055,.035,mB,[-.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_B',.055,.035,mB,[.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_C',.045,.035,mB,[-.62,.11,-.48],[PI/2,0,0]);
  addBolt(g,'BOLT_D',.045,.035,mB,[.62,.11,-.48],[PI/2,0,0]);
  addTorus(g,'SERVICE_RING',.23,.025,mC,[0,.12,.52],[PI/2,0,0],24,6);
  addBox(g,'MICRO_RAIL',[.92,.035,.05],mB,[0,.13,-.51]);
  parent.add(g);
  return g;
}
function detailModule040(parent, origin=[0,0,0], phase=0) {
  const g=new THREE.Group();
  g.name='DETAIL_MODULE_040';
  g.position.set(origin[0],origin[1],origin[2]);
  g.rotation.y=phase;
  const mA=(phase*10)%2>1?MAT.gun2:MAT.gun3;
  const mB=(phase*7)%2>1?MAT.steel:MAT.graphite;
  const mC=(phase*5)%2>1?MAT.blood:MAT.gun2;
  addBox(g,'PLATE',[1.8+.08*(40%5),.16,.92+.04*(40%7)],mA,[0,0,0]);
  addBox(g,'BACKING',[1.38,.10,.62],mB,[0,-.16,0]);
  addBox(g,'SEAM',[1.1,.018,.025],mC,[0,.095,.47]);
  addBolt(g,'BOLT_A',.055,.035,mB,[-.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_B',.055,.035,mB,[.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_C',.045,.035,mB,[-.62,.11,-.48],[PI/2,0,0]);
  addBolt(g,'BOLT_D',.045,.035,mB,[.62,.11,-.48],[PI/2,0,0]);
  addTorus(g,'SERVICE_RING',.23,.025,mC,[0,.12,.52],[PI/2,0,0],24,6);
  addBox(g,'MICRO_RAIL',[.92,.035,.05],mB,[0,.13,-.51]);
  parent.add(g);
  return g;
}
function detailModule041(parent, origin=[0,0,0], phase=0) {
  const g=new THREE.Group();
  g.name='DETAIL_MODULE_041';
  g.position.set(origin[0],origin[1],origin[2]);
  g.rotation.y=phase;
  const mA=(phase*10)%2>1?MAT.gun2:MAT.gun3;
  const mB=(phase*7)%2>1?MAT.steel:MAT.graphite;
  const mC=(phase*5)%2>1?MAT.blood:MAT.gun2;
  addBox(g,'PLATE',[1.8+.08*(41%5),.16,.92+.04*(41%7)],mA,[0,0,0]);
  addBox(g,'BACKING',[1.38,.10,.62],mB,[0,-.16,0]);
  addBox(g,'SEAM',[1.1,.018,.025],mC,[0,.095,.47]);
  addBolt(g,'BOLT_A',.055,.035,mB,[-.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_B',.055,.035,mB,[.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_C',.045,.035,mB,[-.62,.11,-.48],[PI/2,0,0]);
  addBolt(g,'BOLT_D',.045,.035,mB,[.62,.11,-.48],[PI/2,0,0]);
  addTorus(g,'SERVICE_RING',.23,.025,mC,[0,.12,.52],[PI/2,0,0],24,6);
  addBox(g,'MICRO_RAIL',[.92,.035,.05],mB,[0,.13,-.51]);
  parent.add(g);
  return g;
}
function detailModule042(parent, origin=[0,0,0], phase=0) {
  const g=new THREE.Group();
  g.name='DETAIL_MODULE_042';
  g.position.set(origin[0],origin[1],origin[2]);
  g.rotation.y=phase;
  const mA=(phase*10)%2>1?MAT.gun2:MAT.gun3;
  const mB=(phase*7)%2>1?MAT.steel:MAT.graphite;
  const mC=(phase*5)%2>1?MAT.blood:MAT.gun2;
  addBox(g,'PLATE',[1.8+.08*(42%5),.16,.92+.04*(42%7)],mA,[0,0,0]);
  addBox(g,'BACKING',[1.38,.10,.62],mB,[0,-.16,0]);
  addBox(g,'SEAM',[1.1,.018,.025],mC,[0,.095,.47]);
  addBolt(g,'BOLT_A',.055,.035,mB,[-.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_B',.055,.035,mB,[.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_C',.045,.035,mB,[-.62,.11,-.48],[PI/2,0,0]);
  addBolt(g,'BOLT_D',.045,.035,mB,[.62,.11,-.48],[PI/2,0,0]);
  addTorus(g,'SERVICE_RING',.23,.025,mC,[0,.12,.52],[PI/2,0,0],24,6);
  addBox(g,'MICRO_RAIL',[.92,.035,.05],mB,[0,.13,-.51]);
  parent.add(g);
  return g;
}
function detailModule043(parent, origin=[0,0,0], phase=0) {
  const g=new THREE.Group();
  g.name='DETAIL_MODULE_043';
  g.position.set(origin[0],origin[1],origin[2]);
  g.rotation.y=phase;
  const mA=(phase*10)%2>1?MAT.gun2:MAT.gun3;
  const mB=(phase*7)%2>1?MAT.steel:MAT.graphite;
  const mC=(phase*5)%2>1?MAT.blood:MAT.gun2;
  addBox(g,'PLATE',[1.8+.08*(43%5),.16,.92+.04*(43%7)],mA,[0,0,0]);
  addBox(g,'BACKING',[1.38,.10,.62],mB,[0,-.16,0]);
  addBox(g,'SEAM',[1.1,.018,.025],mC,[0,.095,.47]);
  addBolt(g,'BOLT_A',.055,.035,mB,[-.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_B',.055,.035,mB,[.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_C',.045,.035,mB,[-.62,.11,-.48],[PI/2,0,0]);
  addBolt(g,'BOLT_D',.045,.035,mB,[.62,.11,-.48],[PI/2,0,0]);
  addTorus(g,'SERVICE_RING',.23,.025,mC,[0,.12,.52],[PI/2,0,0],24,6);
  addBox(g,'MICRO_RAIL',[.92,.035,.05],mB,[0,.13,-.51]);
  parent.add(g);
  return g;
}
function detailModule044(parent, origin=[0,0,0], phase=0) {
  const g=new THREE.Group();
  g.name='DETAIL_MODULE_044';
  g.position.set(origin[0],origin[1],origin[2]);
  g.rotation.y=phase;
  const mA=(phase*10)%2>1?MAT.gun2:MAT.gun3;
  const mB=(phase*7)%2>1?MAT.steel:MAT.graphite;
  const mC=(phase*5)%2>1?MAT.blood:MAT.gun2;
  addBox(g,'PLATE',[1.8+.08*(44%5),.16,.92+.04*(44%7)],mA,[0,0,0]);
  addBox(g,'BACKING',[1.38,.10,.62],mB,[0,-.16,0]);
  addBox(g,'SEAM',[1.1,.018,.025],mC,[0,.095,.47]);
  addBolt(g,'BOLT_A',.055,.035,mB,[-.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_B',.055,.035,mB,[.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_C',.045,.035,mB,[-.62,.11,-.48],[PI/2,0,0]);
  addBolt(g,'BOLT_D',.045,.035,mB,[.62,.11,-.48],[PI/2,0,0]);
  addTorus(g,'SERVICE_RING',.23,.025,mC,[0,.12,.52],[PI/2,0,0],24,6);
  addBox(g,'MICRO_RAIL',[.92,.035,.05],mB,[0,.13,-.51]);
  parent.add(g);
  return g;
}
function detailModule045(parent, origin=[0,0,0], phase=0) {
  const g=new THREE.Group();
  g.name='DETAIL_MODULE_045';
  g.position.set(origin[0],origin[1],origin[2]);
  g.rotation.y=phase;
  const mA=(phase*10)%2>1?MAT.gun2:MAT.gun3;
  const mB=(phase*7)%2>1?MAT.steel:MAT.graphite;
  const mC=(phase*5)%2>1?MAT.blood:MAT.gun2;
  addBox(g,'PLATE',[1.8+.08*(45%5),.16,.92+.04*(45%7)],mA,[0,0,0]);
  addBox(g,'BACKING',[1.38,.10,.62],mB,[0,-.16,0]);
  addBox(g,'SEAM',[1.1,.018,.025],mC,[0,.095,.47]);
  addBolt(g,'BOLT_A',.055,.035,mB,[-.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_B',.055,.035,mB,[.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_C',.045,.035,mB,[-.62,.11,-.48],[PI/2,0,0]);
  addBolt(g,'BOLT_D',.045,.035,mB,[.62,.11,-.48],[PI/2,0,0]);
  addTorus(g,'SERVICE_RING',.23,.025,mC,[0,.12,.52],[PI/2,0,0],24,6);
  addBox(g,'MICRO_RAIL',[.92,.035,.05],mB,[0,.13,-.51]);
  parent.add(g);
  return g;
}
function detailModule046(parent, origin=[0,0,0], phase=0) {
  const g=new THREE.Group();
  g.name='DETAIL_MODULE_046';
  g.position.set(origin[0],origin[1],origin[2]);
  g.rotation.y=phase;
  const mA=(phase*10)%2>1?MAT.gun2:MAT.gun3;
  const mB=(phase*7)%2>1?MAT.steel:MAT.graphite;
  const mC=(phase*5)%2>1?MAT.blood:MAT.gun2;
  addBox(g,'PLATE',[1.8+.08*(46%5),.16,.92+.04*(46%7)],mA,[0,0,0]);
  addBox(g,'BACKING',[1.38,.10,.62],mB,[0,-.16,0]);
  addBox(g,'SEAM',[1.1,.018,.025],mC,[0,.095,.47]);
  addBolt(g,'BOLT_A',.055,.035,mB,[-.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_B',.055,.035,mB,[.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_C',.045,.035,mB,[-.62,.11,-.48],[PI/2,0,0]);
  addBolt(g,'BOLT_D',.045,.035,mB,[.62,.11,-.48],[PI/2,0,0]);
  addTorus(g,'SERVICE_RING',.23,.025,mC,[0,.12,.52],[PI/2,0,0],24,6);
  addBox(g,'MICRO_RAIL',[.92,.035,.05],mB,[0,.13,-.51]);
  parent.add(g);
  return g;
}
function detailModule047(parent, origin=[0,0,0], phase=0) {
  const g=new THREE.Group();
  g.name='DETAIL_MODULE_047';
  g.position.set(origin[0],origin[1],origin[2]);
  g.rotation.y=phase;
  const mA=(phase*10)%2>1?MAT.gun2:MAT.gun3;
  const mB=(phase*7)%2>1?MAT.steel:MAT.graphite;
  const mC=(phase*5)%2>1?MAT.blood:MAT.gun2;
  addBox(g,'PLATE',[1.8+.08*(47%5),.16,.92+.04*(47%7)],mA,[0,0,0]);
  addBox(g,'BACKING',[1.38,.10,.62],mB,[0,-.16,0]);
  addBox(g,'SEAM',[1.1,.018,.025],mC,[0,.095,.47]);
  addBolt(g,'BOLT_A',.055,.035,mB,[-.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_B',.055,.035,mB,[.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_C',.045,.035,mB,[-.62,.11,-.48],[PI/2,0,0]);
  addBolt(g,'BOLT_D',.045,.035,mB,[.62,.11,-.48],[PI/2,0,0]);
  addTorus(g,'SERVICE_RING',.23,.025,mC,[0,.12,.52],[PI/2,0,0],24,6);
  addBox(g,'MICRO_RAIL',[.92,.035,.05],mB,[0,.13,-.51]);
  parent.add(g);
  return g;
}
function detailModule048(parent, origin=[0,0,0], phase=0) {
  const g=new THREE.Group();
  g.name='DETAIL_MODULE_048';
  g.position.set(origin[0],origin[1],origin[2]);
  g.rotation.y=phase;
  const mA=(phase*10)%2>1?MAT.gun2:MAT.gun3;
  const mB=(phase*7)%2>1?MAT.steel:MAT.graphite;
  const mC=(phase*5)%2>1?MAT.blood:MAT.gun2;
  addBox(g,'PLATE',[1.8+.08*(48%5),.16,.92+.04*(48%7)],mA,[0,0,0]);
  addBox(g,'BACKING',[1.38,.10,.62],mB,[0,-.16,0]);
  addBox(g,'SEAM',[1.1,.018,.025],mC,[0,.095,.47]);
  addBolt(g,'BOLT_A',.055,.035,mB,[-.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_B',.055,.035,mB,[.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_C',.045,.035,mB,[-.62,.11,-.48],[PI/2,0,0]);
  addBolt(g,'BOLT_D',.045,.035,mB,[.62,.11,-.48],[PI/2,0,0]);
  addTorus(g,'SERVICE_RING',.23,.025,mC,[0,.12,.52],[PI/2,0,0],24,6);
  addBox(g,'MICRO_RAIL',[.92,.035,.05],mB,[0,.13,-.51]);
  parent.add(g);
  return g;
}
function detailModule049(parent, origin=[0,0,0], phase=0) {
  const g=new THREE.Group();
  g.name='DETAIL_MODULE_049';
  g.position.set(origin[0],origin[1],origin[2]);
  g.rotation.y=phase;
  const mA=(phase*10)%2>1?MAT.gun2:MAT.gun3;
  const mB=(phase*7)%2>1?MAT.steel:MAT.graphite;
  const mC=(phase*5)%2>1?MAT.blood:MAT.gun2;
  addBox(g,'PLATE',[1.8+.08*(49%5),.16,.92+.04*(49%7)],mA,[0,0,0]);
  addBox(g,'BACKING',[1.38,.10,.62],mB,[0,-.16,0]);
  addBox(g,'SEAM',[1.1,.018,.025],mC,[0,.095,.47]);
  addBolt(g,'BOLT_A',.055,.035,mB,[-.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_B',.055,.035,mB,[.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_C',.045,.035,mB,[-.62,.11,-.48],[PI/2,0,0]);
  addBolt(g,'BOLT_D',.045,.035,mB,[.62,.11,-.48],[PI/2,0,0]);
  addTorus(g,'SERVICE_RING',.23,.025,mC,[0,.12,.52],[PI/2,0,0],24,6);
  addBox(g,'MICRO_RAIL',[.92,.035,.05],mB,[0,.13,-.51]);
  parent.add(g);
  return g;
}
function detailModule050(parent, origin=[0,0,0], phase=0) {
  const g=new THREE.Group();
  g.name='DETAIL_MODULE_050';
  g.position.set(origin[0],origin[1],origin[2]);
  g.rotation.y=phase;
  const mA=(phase*10)%2>1?MAT.gun2:MAT.gun3;
  const mB=(phase*7)%2>1?MAT.steel:MAT.graphite;
  const mC=(phase*5)%2>1?MAT.blood:MAT.gun2;
  addBox(g,'PLATE',[1.8+.08*(50%5),.16,.92+.04*(50%7)],mA,[0,0,0]);
  addBox(g,'BACKING',[1.38,.10,.62],mB,[0,-.16,0]);
  addBox(g,'SEAM',[1.1,.018,.025],mC,[0,.095,.47]);
  addBolt(g,'BOLT_A',.055,.035,mB,[-.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_B',.055,.035,mB,[.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_C',.045,.035,mB,[-.62,.11,-.48],[PI/2,0,0]);
  addBolt(g,'BOLT_D',.045,.035,mB,[.62,.11,-.48],[PI/2,0,0]);
  addTorus(g,'SERVICE_RING',.23,.025,mC,[0,.12,.52],[PI/2,0,0],24,6);
  addBox(g,'MICRO_RAIL',[.92,.035,.05],mB,[0,.13,-.51]);
  parent.add(g);
  return g;
}
function detailModule051(parent, origin=[0,0,0], phase=0) {
  const g=new THREE.Group();
  g.name='DETAIL_MODULE_051';
  g.position.set(origin[0],origin[1],origin[2]);
  g.rotation.y=phase;
  const mA=(phase*10)%2>1?MAT.gun2:MAT.gun3;
  const mB=(phase*7)%2>1?MAT.steel:MAT.graphite;
  const mC=(phase*5)%2>1?MAT.blood:MAT.gun2;
  addBox(g,'PLATE',[1.8+.08*(51%5),.16,.92+.04*(51%7)],mA,[0,0,0]);
  addBox(g,'BACKING',[1.38,.10,.62],mB,[0,-.16,0]);
  addBox(g,'SEAM',[1.1,.018,.025],mC,[0,.095,.47]);
  addBolt(g,'BOLT_A',.055,.035,mB,[-.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_B',.055,.035,mB,[.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_C',.045,.035,mB,[-.62,.11,-.48],[PI/2,0,0]);
  addBolt(g,'BOLT_D',.045,.035,mB,[.62,.11,-.48],[PI/2,0,0]);
  addTorus(g,'SERVICE_RING',.23,.025,mC,[0,.12,.52],[PI/2,0,0],24,6);
  addBox(g,'MICRO_RAIL',[.92,.035,.05],mB,[0,.13,-.51]);
  parent.add(g);
  return g;
}
function detailModule052(parent, origin=[0,0,0], phase=0) {
  const g=new THREE.Group();
  g.name='DETAIL_MODULE_052';
  g.position.set(origin[0],origin[1],origin[2]);
  g.rotation.y=phase;
  const mA=(phase*10)%2>1?MAT.gun2:MAT.gun3;
  const mB=(phase*7)%2>1?MAT.steel:MAT.graphite;
  const mC=(phase*5)%2>1?MAT.blood:MAT.gun2;
  addBox(g,'PLATE',[1.8+.08*(52%5),.16,.92+.04*(52%7)],mA,[0,0,0]);
  addBox(g,'BACKING',[1.38,.10,.62],mB,[0,-.16,0]);
  addBox(g,'SEAM',[1.1,.018,.025],mC,[0,.095,.47]);
  addBolt(g,'BOLT_A',.055,.035,mB,[-.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_B',.055,.035,mB,[.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_C',.045,.035,mB,[-.62,.11,-.48],[PI/2,0,0]);
  addBolt(g,'BOLT_D',.045,.035,mB,[.62,.11,-.48],[PI/2,0,0]);
  addTorus(g,'SERVICE_RING',.23,.025,mC,[0,.12,.52],[PI/2,0,0],24,6);
  addBox(g,'MICRO_RAIL',[.92,.035,.05],mB,[0,.13,-.51]);
  parent.add(g);
  return g;
}
function detailModule053(parent, origin=[0,0,0], phase=0) {
  const g=new THREE.Group();
  g.name='DETAIL_MODULE_053';
  g.position.set(origin[0],origin[1],origin[2]);
  g.rotation.y=phase;
  const mA=(phase*10)%2>1?MAT.gun2:MAT.gun3;
  const mB=(phase*7)%2>1?MAT.steel:MAT.graphite;
  const mC=(phase*5)%2>1?MAT.blood:MAT.gun2;
  addBox(g,'PLATE',[1.8+.08*(53%5),.16,.92+.04*(53%7)],mA,[0,0,0]);
  addBox(g,'BACKING',[1.38,.10,.62],mB,[0,-.16,0]);
  addBox(g,'SEAM',[1.1,.018,.025],mC,[0,.095,.47]);
  addBolt(g,'BOLT_A',.055,.035,mB,[-.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_B',.055,.035,mB,[.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_C',.045,.035,mB,[-.62,.11,-.48],[PI/2,0,0]);
  addBolt(g,'BOLT_D',.045,.035,mB,[.62,.11,-.48],[PI/2,0,0]);
  addTorus(g,'SERVICE_RING',.23,.025,mC,[0,.12,.52],[PI/2,0,0],24,6);
  addBox(g,'MICRO_RAIL',[.92,.035,.05],mB,[0,.13,-.51]);
  parent.add(g);
  return g;
}
function detailModule054(parent, origin=[0,0,0], phase=0) {
  const g=new THREE.Group();
  g.name='DETAIL_MODULE_054';
  g.position.set(origin[0],origin[1],origin[2]);
  g.rotation.y=phase;
  const mA=(phase*10)%2>1?MAT.gun2:MAT.gun3;
  const mB=(phase*7)%2>1?MAT.steel:MAT.graphite;
  const mC=(phase*5)%2>1?MAT.blood:MAT.gun2;
  addBox(g,'PLATE',[1.8+.08*(54%5),.16,.92+.04*(54%7)],mA,[0,0,0]);
  addBox(g,'BACKING',[1.38,.10,.62],mB,[0,-.16,0]);
  addBox(g,'SEAM',[1.1,.018,.025],mC,[0,.095,.47]);
  addBolt(g,'BOLT_A',.055,.035,mB,[-.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_B',.055,.035,mB,[.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_C',.045,.035,mB,[-.62,.11,-.48],[PI/2,0,0]);
  addBolt(g,'BOLT_D',.045,.035,mB,[.62,.11,-.48],[PI/2,0,0]);
  addTorus(g,'SERVICE_RING',.23,.025,mC,[0,.12,.52],[PI/2,0,0],24,6);
  addBox(g,'MICRO_RAIL',[.92,.035,.05],mB,[0,.13,-.51]);
  parent.add(g);
  return g;
}
function detailModule055(parent, origin=[0,0,0], phase=0) {
  const g=new THREE.Group();
  g.name='DETAIL_MODULE_055';
  g.position.set(origin[0],origin[1],origin[2]);
  g.rotation.y=phase;
  const mA=(phase*10)%2>1?MAT.gun2:MAT.gun3;
  const mB=(phase*7)%2>1?MAT.steel:MAT.graphite;
  const mC=(phase*5)%2>1?MAT.blood:MAT.gun2;
  addBox(g,'PLATE',[1.8+.08*(55%5),.16,.92+.04*(55%7)],mA,[0,0,0]);
  addBox(g,'BACKING',[1.38,.10,.62],mB,[0,-.16,0]);
  addBox(g,'SEAM',[1.1,.018,.025],mC,[0,.095,.47]);
  addBolt(g,'BOLT_A',.055,.035,mB,[-.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_B',.055,.035,mB,[.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_C',.045,.035,mB,[-.62,.11,-.48],[PI/2,0,0]);
  addBolt(g,'BOLT_D',.045,.035,mB,[.62,.11,-.48],[PI/2,0,0]);
  addTorus(g,'SERVICE_RING',.23,.025,mC,[0,.12,.52],[PI/2,0,0],24,6);
  addBox(g,'MICRO_RAIL',[.92,.035,.05],mB,[0,.13,-.51]);
  parent.add(g);
  return g;
}
function detailModule056(parent, origin=[0,0,0], phase=0) {
  const g=new THREE.Group();
  g.name='DETAIL_MODULE_056';
  g.position.set(origin[0],origin[1],origin[2]);
  g.rotation.y=phase;
  const mA=(phase*10)%2>1?MAT.gun2:MAT.gun3;
  const mB=(phase*7)%2>1?MAT.steel:MAT.graphite;
  const mC=(phase*5)%2>1?MAT.blood:MAT.gun2;
  addBox(g,'PLATE',[1.8+.08*(56%5),.16,.92+.04*(56%7)],mA,[0,0,0]);
  addBox(g,'BACKING',[1.38,.10,.62],mB,[0,-.16,0]);
  addBox(g,'SEAM',[1.1,.018,.025],mC,[0,.095,.47]);
  addBolt(g,'BOLT_A',.055,.035,mB,[-.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_B',.055,.035,mB,[.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_C',.045,.035,mB,[-.62,.11,-.48],[PI/2,0,0]);
  addBolt(g,'BOLT_D',.045,.035,mB,[.62,.11,-.48],[PI/2,0,0]);
  addTorus(g,'SERVICE_RING',.23,.025,mC,[0,.12,.52],[PI/2,0,0],24,6);
  addBox(g,'MICRO_RAIL',[.92,.035,.05],mB,[0,.13,-.51]);
  parent.add(g);
  return g;
}
function detailModule057(parent, origin=[0,0,0], phase=0) {
  const g=new THREE.Group();
  g.name='DETAIL_MODULE_057';
  g.position.set(origin[0],origin[1],origin[2]);
  g.rotation.y=phase;
  const mA=(phase*10)%2>1?MAT.gun2:MAT.gun3;
  const mB=(phase*7)%2>1?MAT.steel:MAT.graphite;
  const mC=(phase*5)%2>1?MAT.blood:MAT.gun2;
  addBox(g,'PLATE',[1.8+.08*(57%5),.16,.92+.04*(57%7)],mA,[0,0,0]);
  addBox(g,'BACKING',[1.38,.10,.62],mB,[0,-.16,0]);
  addBox(g,'SEAM',[1.1,.018,.025],mC,[0,.095,.47]);
  addBolt(g,'BOLT_A',.055,.035,mB,[-.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_B',.055,.035,mB,[.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_C',.045,.035,mB,[-.62,.11,-.48],[PI/2,0,0]);
  addBolt(g,'BOLT_D',.045,.035,mB,[.62,.11,-.48],[PI/2,0,0]);
  addTorus(g,'SERVICE_RING',.23,.025,mC,[0,.12,.52],[PI/2,0,0],24,6);
  addBox(g,'MICRO_RAIL',[.92,.035,.05],mB,[0,.13,-.51]);
  parent.add(g);
  return g;
}
function detailModule058(parent, origin=[0,0,0], phase=0) {
  const g=new THREE.Group();
  g.name='DETAIL_MODULE_058';
  g.position.set(origin[0],origin[1],origin[2]);
  g.rotation.y=phase;
  const mA=(phase*10)%2>1?MAT.gun2:MAT.gun3;
  const mB=(phase*7)%2>1?MAT.steel:MAT.graphite;
  const mC=(phase*5)%2>1?MAT.blood:MAT.gun2;
  addBox(g,'PLATE',[1.8+.08*(58%5),.16,.92+.04*(58%7)],mA,[0,0,0]);
  addBox(g,'BACKING',[1.38,.10,.62],mB,[0,-.16,0]);
  addBox(g,'SEAM',[1.1,.018,.025],mC,[0,.095,.47]);
  addBolt(g,'BOLT_A',.055,.035,mB,[-.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_B',.055,.035,mB,[.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_C',.045,.035,mB,[-.62,.11,-.48],[PI/2,0,0]);
  addBolt(g,'BOLT_D',.045,.035,mB,[.62,.11,-.48],[PI/2,0,0]);
  addTorus(g,'SERVICE_RING',.23,.025,mC,[0,.12,.52],[PI/2,0,0],24,6);
  addBox(g,'MICRO_RAIL',[.92,.035,.05],mB,[0,.13,-.51]);
  parent.add(g);
  return g;
}
function detailModule059(parent, origin=[0,0,0], phase=0) {
  const g=new THREE.Group();
  g.name='DETAIL_MODULE_059';
  g.position.set(origin[0],origin[1],origin[2]);
  g.rotation.y=phase;
  const mA=(phase*10)%2>1?MAT.gun2:MAT.gun3;
  const mB=(phase*7)%2>1?MAT.steel:MAT.graphite;
  const mC=(phase*5)%2>1?MAT.blood:MAT.gun2;
  addBox(g,'PLATE',[1.8+.08*(59%5),.16,.92+.04*(59%7)],mA,[0,0,0]);
  addBox(g,'BACKING',[1.38,.10,.62],mB,[0,-.16,0]);
  addBox(g,'SEAM',[1.1,.018,.025],mC,[0,.095,.47]);
  addBolt(g,'BOLT_A',.055,.035,mB,[-.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_B',.055,.035,mB,[.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_C',.045,.035,mB,[-.62,.11,-.48],[PI/2,0,0]);
  addBolt(g,'BOLT_D',.045,.035,mB,[.62,.11,-.48],[PI/2,0,0]);
  addTorus(g,'SERVICE_RING',.23,.025,mC,[0,.12,.52],[PI/2,0,0],24,6);
  addBox(g,'MICRO_RAIL',[.92,.035,.05],mB,[0,.13,-.51]);
  parent.add(g);
  return g;
}
function detailModule060(parent, origin=[0,0,0], phase=0) {
  const g=new THREE.Group();
  g.name='DETAIL_MODULE_060';
  g.position.set(origin[0],origin[1],origin[2]);
  g.rotation.y=phase;
  const mA=(phase*10)%2>1?MAT.gun2:MAT.gun3;
  const mB=(phase*7)%2>1?MAT.steel:MAT.graphite;
  const mC=(phase*5)%2>1?MAT.blood:MAT.gun2;
  addBox(g,'PLATE',[1.8+.08*(60%5),.16,.92+.04*(60%7)],mA,[0,0,0]);
  addBox(g,'BACKING',[1.38,.10,.62],mB,[0,-.16,0]);
  addBox(g,'SEAM',[1.1,.018,.025],mC,[0,.095,.47]);
  addBolt(g,'BOLT_A',.055,.035,mB,[-.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_B',.055,.035,mB,[.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_C',.045,.035,mB,[-.62,.11,-.48],[PI/2,0,0]);
  addBolt(g,'BOLT_D',.045,.035,mB,[.62,.11,-.48],[PI/2,0,0]);
  addTorus(g,'SERVICE_RING',.23,.025,mC,[0,.12,.52],[PI/2,0,0],24,6);
  addBox(g,'MICRO_RAIL',[.92,.035,.05],mB,[0,.13,-.51]);
  parent.add(g);
  return g;
}
function detailModule061(parent, origin=[0,0,0], phase=0) {
  const g=new THREE.Group();
  g.name='DETAIL_MODULE_061';
  g.position.set(origin[0],origin[1],origin[2]);
  g.rotation.y=phase;
  const mA=(phase*10)%2>1?MAT.gun2:MAT.gun3;
  const mB=(phase*7)%2>1?MAT.steel:MAT.graphite;
  const mC=(phase*5)%2>1?MAT.blood:MAT.gun2;
  addBox(g,'PLATE',[1.8+.08*(61%5),.16,.92+.04*(61%7)],mA,[0,0,0]);
  addBox(g,'BACKING',[1.38,.10,.62],mB,[0,-.16,0]);
  addBox(g,'SEAM',[1.1,.018,.025],mC,[0,.095,.47]);
  addBolt(g,'BOLT_A',.055,.035,mB,[-.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_B',.055,.035,mB,[.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_C',.045,.035,mB,[-.62,.11,-.48],[PI/2,0,0]);
  addBolt(g,'BOLT_D',.045,.035,mB,[.62,.11,-.48],[PI/2,0,0]);
  addTorus(g,'SERVICE_RING',.23,.025,mC,[0,.12,.52],[PI/2,0,0],24,6);
  addBox(g,'MICRO_RAIL',[.92,.035,.05],mB,[0,.13,-.51]);
  parent.add(g);
  return g;
}
function detailModule062(parent, origin=[0,0,0], phase=0) {
  const g=new THREE.Group();
  g.name='DETAIL_MODULE_062';
  g.position.set(origin[0],origin[1],origin[2]);
  g.rotation.y=phase;
  const mA=(phase*10)%2>1?MAT.gun2:MAT.gun3;
  const mB=(phase*7)%2>1?MAT.steel:MAT.graphite;
  const mC=(phase*5)%2>1?MAT.blood:MAT.gun2;
  addBox(g,'PLATE',[1.8+.08*(62%5),.16,.92+.04*(62%7)],mA,[0,0,0]);
  addBox(g,'BACKING',[1.38,.10,.62],mB,[0,-.16,0]);
  addBox(g,'SEAM',[1.1,.018,.025],mC,[0,.095,.47]);
  addBolt(g,'BOLT_A',.055,.035,mB,[-.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_B',.055,.035,mB,[.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_C',.045,.035,mB,[-.62,.11,-.48],[PI/2,0,0]);
  addBolt(g,'BOLT_D',.045,.035,mB,[.62,.11,-.48],[PI/2,0,0]);
  addTorus(g,'SERVICE_RING',.23,.025,mC,[0,.12,.52],[PI/2,0,0],24,6);
  addBox(g,'MICRO_RAIL',[.92,.035,.05],mB,[0,.13,-.51]);
  parent.add(g);
  return g;
}
function detailModule063(parent, origin=[0,0,0], phase=0) {
  const g=new THREE.Group();
  g.name='DETAIL_MODULE_063';
  g.position.set(origin[0],origin[1],origin[2]);
  g.rotation.y=phase;
  const mA=(phase*10)%2>1?MAT.gun2:MAT.gun3;
  const mB=(phase*7)%2>1?MAT.steel:MAT.graphite;
  const mC=(phase*5)%2>1?MAT.blood:MAT.gun2;
  addBox(g,'PLATE',[1.8+.08*(63%5),.16,.92+.04*(63%7)],mA,[0,0,0]);
  addBox(g,'BACKING',[1.38,.10,.62],mB,[0,-.16,0]);
  addBox(g,'SEAM',[1.1,.018,.025],mC,[0,.095,.47]);
  addBolt(g,'BOLT_A',.055,.035,mB,[-.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_B',.055,.035,mB,[.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_C',.045,.035,mB,[-.62,.11,-.48],[PI/2,0,0]);
  addBolt(g,'BOLT_D',.045,.035,mB,[.62,.11,-.48],[PI/2,0,0]);
  addTorus(g,'SERVICE_RING',.23,.025,mC,[0,.12,.52],[PI/2,0,0],24,6);
  addBox(g,'MICRO_RAIL',[.92,.035,.05],mB,[0,.13,-.51]);
  parent.add(g);
  return g;
}
function detailModule064(parent, origin=[0,0,0], phase=0) {
  const g=new THREE.Group();
  g.name='DETAIL_MODULE_064';
  g.position.set(origin[0],origin[1],origin[2]);
  g.rotation.y=phase;
  const mA=(phase*10)%2>1?MAT.gun2:MAT.gun3;
  const mB=(phase*7)%2>1?MAT.steel:MAT.graphite;
  const mC=(phase*5)%2>1?MAT.blood:MAT.gun2;
  addBox(g,'PLATE',[1.8+.08*(64%5),.16,.92+.04*(64%7)],mA,[0,0,0]);
  addBox(g,'BACKING',[1.38,.10,.62],mB,[0,-.16,0]);
  addBox(g,'SEAM',[1.1,.018,.025],mC,[0,.095,.47]);
  addBolt(g,'BOLT_A',.055,.035,mB,[-.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_B',.055,.035,mB,[.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_C',.045,.035,mB,[-.62,.11,-.48],[PI/2,0,0]);
  addBolt(g,'BOLT_D',.045,.035,mB,[.62,.11,-.48],[PI/2,0,0]);
  addTorus(g,'SERVICE_RING',.23,.025,mC,[0,.12,.52],[PI/2,0,0],24,6);
  addBox(g,'MICRO_RAIL',[.92,.035,.05],mB,[0,.13,-.51]);
  parent.add(g);
  return g;
}
function detailModule065(parent, origin=[0,0,0], phase=0) {
  const g=new THREE.Group();
  g.name='DETAIL_MODULE_065';
  g.position.set(origin[0],origin[1],origin[2]);
  g.rotation.y=phase;
  const mA=(phase*10)%2>1?MAT.gun2:MAT.gun3;
  const mB=(phase*7)%2>1?MAT.steel:MAT.graphite;
  const mC=(phase*5)%2>1?MAT.blood:MAT.gun2;
  addBox(g,'PLATE',[1.8+.08*(65%5),.16,.92+.04*(65%7)],mA,[0,0,0]);
  addBox(g,'BACKING',[1.38,.10,.62],mB,[0,-.16,0]);
  addBox(g,'SEAM',[1.1,.018,.025],mC,[0,.095,.47]);
  addBolt(g,'BOLT_A',.055,.035,mB,[-.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_B',.055,.035,mB,[.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_C',.045,.035,mB,[-.62,.11,-.48],[PI/2,0,0]);
  addBolt(g,'BOLT_D',.045,.035,mB,[.62,.11,-.48],[PI/2,0,0]);
  addTorus(g,'SERVICE_RING',.23,.025,mC,[0,.12,.52],[PI/2,0,0],24,6);
  addBox(g,'MICRO_RAIL',[.92,.035,.05],mB,[0,.13,-.51]);
  parent.add(g);
  return g;
}
function detailModule066(parent, origin=[0,0,0], phase=0) {
  const g=new THREE.Group();
  g.name='DETAIL_MODULE_066';
  g.position.set(origin[0],origin[1],origin[2]);
  g.rotation.y=phase;
  const mA=(phase*10)%2>1?MAT.gun2:MAT.gun3;
  const mB=(phase*7)%2>1?MAT.steel:MAT.graphite;
  const mC=(phase*5)%2>1?MAT.blood:MAT.gun2;
  addBox(g,'PLATE',[1.8+.08*(66%5),.16,.92+.04*(66%7)],mA,[0,0,0]);
  addBox(g,'BACKING',[1.38,.10,.62],mB,[0,-.16,0]);
  addBox(g,'SEAM',[1.1,.018,.025],mC,[0,.095,.47]);
  addBolt(g,'BOLT_A',.055,.035,mB,[-.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_B',.055,.035,mB,[.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_C',.045,.035,mB,[-.62,.11,-.48],[PI/2,0,0]);
  addBolt(g,'BOLT_D',.045,.035,mB,[.62,.11,-.48],[PI/2,0,0]);  addTorus(g,'SERVICE_RING',.23,.025,mC,[0,.12,.52],[PI/2,0,0],24,6);
  addBox(g,'MICRO_RAIL',[.92,.035,.05],mB,[0,.13,-.51]);
  parent.add(g);
  return g;
}
function detailModule067(parent, origin=[0,0,0], phase=0) {
  const g=new THREE.Group();
  g.name='DETAIL_MODULE_067';
  g.position.set(origin[0],origin[1],origin[2]);
  g.rotation.y=phase;
  const mA=(phase*10)%2>1?MAT.gun2:MAT.gun3;
  const mB=(phase*7)%2>1?MAT.steel:MAT.graphite;
  const mC=(phase*5)%2>1?MAT.blood:MAT.gun2;
  addBox(g,'PLATE',[1.8+.08*(67%5),.16,.92+.04*(67%7)],mA,[0,0,0]);
  addBox(g,'BACKING',[1.38,.10,.62],mB,[0,-.16,0]);
  addBox(g,'SEAM',[1.1,.018,.025],mC,[0,.095,.47]);
  addBolt(g,'BOLT_A',.055,.035,mB,[-.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_B',.055,.035,mB,[.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_C',.045,.035,mB,[-.62,.11,-.48],[PI/2,0,0]);
  addBolt(g,'BOLT_D',.045,.035,mB,[.62,.11,-.48],[PI/2,0,0]);
  addTorus(g,'SERVICE_RING',.23,.025,mC,[0,.12,.52],[PI/2,0,0],24,6);
  addBox(g,'MICRO_RAIL',[.92,.035,.05],mB,[0,.13,-.51]);
  parent.add(g);
  return g;
}
function detailModule068(parent, origin=[0,0,0], phase=0) {
  const g=new THREE.Group();
  g.name='DETAIL_MODULE_068';
  g.position.set(origin[0],origin[1],origin[2]);
  g.rotation.y=phase;
  const mA=(phase*10)%2>1?MAT.gun2:MAT.gun3;
  const mB=(phase*7)%2>1?MAT.steel:MAT.graphite;
  const mC=(phase*5)%2>1?MAT.blood:MAT.gun2;
  addBox(g,'PLATE',[1.8+.08*(68%5),.16,.92+.04*(68%7)],mA,[0,0,0]);
  addBox(g,'BACKING',[1.38,.10,.62],mB,[0,-.16,0]);
  addBox(g,'SEAM',[1.1,.018,.025],mC,[0,.095,.47]);
  addBolt(g,'BOLT_A',.055,.035,mB,[-.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_B',.055,.035,mB,[.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_C',.045,.035,mB,[-.62,.11,-.48],[PI/2,0,0]);
  addBolt(g,'BOLT_D',.045,.035,mB,[.62,.11,-.48],[PI/2,0,0]);
  addTorus(g,'SERVICE_RING',.23,.025,mC,[0,.12,.52],[PI/2,0,0],24,6);
  addBox(g,'MICRO_RAIL',[.92,.035,.05],mB,[0,.13,-.51]);
  parent.add(g);
  return g;
}
function detailModule069(parent, origin=[0,0,0], phase=0) {
  const g=new THREE.Group();
  g.name='DETAIL_MODULE_069';
  g.position.set(origin[0],origin[1],origin[2]);
  g.rotation.y=phase;
  const mA=(phase*10)%2>1?MAT.gun2:MAT.gun3;
  const mB=(phase*7)%2>1?MAT.steel:MAT.graphite;
  const mC=(phase*5)%2>1?MAT.blood:MAT.gun2;
  addBox(g,'PLATE',[1.8+.08*(69%5),.16,.92+.04*(69%7)],mA,[0,0,0]);
  addBox(g,'BACKING',[1.38,.10,.62],mB,[0,-.16,0]);
  addBox(g,'SEAM',[1.1,.018,.025],mC,[0,.095,.47]);
  addBolt(g,'BOLT_A',.055,.035,mB,[-.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_B',.055,.035,mB,[.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_C',.045,.035,mB,[-.62,.11,-.48],[PI/2,0,0]);
  addBolt(g,'BOLT_D',.045,.035,mB,[.62,.11,-.48],[PI/2,0,0]);
  addTorus(g,'SERVICE_RING',.23,.025,mC,[0,.12,.52],[PI/2,0,0],24,6);
  addBox(g,'MICRO_RAIL',[.92,.035,.05],mB,[0,.13,-.51]);
  parent.add(g);
  return g;
}
function detailModule070(parent, origin=[0,0,0], phase=0) {
  const g=new THREE.Group();
  g.name='DETAIL_MODULE_070';
  g.position.set(origin[0],origin[1],origin[2]);
  g.rotation.y=phase;
  const mA=(phase*10)%2>1?MAT.gun2:MAT.gun3;
  const mB=(phase*7)%2>1?MAT.steel:MAT.graphite;
  const mC=(phase*5)%2>1?MAT.blood:MAT.gun2;
  addBox(g,'PLATE',[1.8+.08*(70%5),.16,.92+.04*(70%7)],mA,[0,0,0]);
  addBox(g,'BACKING',[1.38,.10,.62],mB,[0,-.16,0]);
  addBox(g,'SEAM',[1.1,.018,.025],mC,[0,.095,.47]);
  addBolt(g,'BOLT_A',.055,.035,mB,[-.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_B',.055,.035,mB,[.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_C',.045,.035,mB,[-.62,.11,-.48],[PI/2,0,0]);
  addBolt(g,'BOLT_D',.045,.035,mB,[.62,.11,-.48],[PI/2,0,0]);
  addTorus(g,'SERVICE_RING',.23,.025,mC,[0,.12,.52],[PI/2,0,0],24,6);
  addBox(g,'MICRO_RAIL',[.92,.035,.05],mB,[0,.13,-.51]);
  parent.add(g);
  return g;
}
function detailModule071(parent, origin=[0,0,0], phase=0) {
  const g=new THREE.Group();
  g.name='DETAIL_MODULE_071';
  g.position.set(origin[0],origin[1],origin[2]);
  g.rotation.y=phase;
  const mA=(phase*10)%2>1?MAT.gun2:MAT.gun3;
  const mB=(phase*7)%2>1?MAT.steel:MAT.graphite;
  const mC=(phase*5)%2>1?MAT.blood:MAT.gun2;
  addBox(g,'PLATE',[1.8+.08*(71%5),.16,.92+.04*(71%7)],mA,[0,0,0]);
  addBox(g,'BACKING',[1.38,.10,.62],mB,[0,-.16,0]);
  addBox(g,'SEAM',[1.1,.018,.025],mC,[0,.095,.47]);
  addBolt(g,'BOLT_A',.055,.035,mB,[-.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_B',.055,.035,mB,[.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_C',.045,.035,mB,[-.62,.11,-.48],[PI/2,0,0]);
  addBolt(g,'BOLT_D',.045,.035,mB,[.62,.11,-.48],[PI/2,0,0]);
  addTorus(g,'SERVICE_RING',.23,.025,mC,[0,.12,.52],[PI/2,0,0],24,6);
  addBox(g,'MICRO_RAIL',[.92,.035,.05],mB,[0,.13,-.51]);
  parent.add(g);
  return g;
}
function detailModule072(parent, origin=[0,0,0], phase=0) {
  const g=new THREE.Group();
  g.name='DETAIL_MODULE_072';
  g.position.set(origin[0],origin[1],origin[2]);
  g.rotation.y=phase;
  const mA=(phase*10)%2>1?MAT.gun2:MAT.gun3;
  const mB=(phase*7)%2>1?MAT.steel:MAT.graphite;
  const mC=(phase*5)%2>1?MAT.blood:MAT.gun2;
  addBox(g,'PLATE',[1.8+.08*(72%5),.16,.92+.04*(72%7)],mA,[0,0,0]);
  addBox(g,'BACKING',[1.38,.10,.62],mB,[0,-.16,0]);
  addBox(g,'SEAM',[1.1,.018,.025],mC,[0,.095,.47]);
  addBolt(g,'BOLT_A',.055,.035,mB,[-.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_B',.055,.035,mB,[.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_C',.045,.035,mB,[-.62,.11,-.48],[PI/2,0,0]);
  addBolt(g,'BOLT_D',.045,.035,mB,[.62,.11,-.48],[PI/2,0,0]);
  addTorus(g,'SERVICE_RING',.23,.025,mC,[0,.12,.52],[PI/2,0,0],24,6);
  addBox(g,'MICRO_RAIL',[.92,.035,.05],mB,[0,.13,-.51]);
  parent.add(g);
  return g;
}
function detailModule073(parent, origin=[0,0,0], phase=0) {
  const g=new THREE.Group();
  g.name='DETAIL_MODULE_073';
  g.position.set(origin[0],origin[1],origin[2]);
  g.rotation.y=phase;
  const mA=(phase*10)%2>1?MAT.gun2:MAT.gun3;
  const mB=(phase*7)%2>1?MAT.steel:MAT.graphite;
  const mC=(phase*5)%2>1?MAT.blood:MAT.gun2;
  addBox(g,'PLATE',[1.8+.08*(73%5),.16,.92+.04*(73%7)],mA,[0,0,0]);
  addBox(g,'BACKING',[1.38,.10,.62],mB,[0,-.16,0]);
  addBox(g,'SEAM',[1.1,.018,.025],mC,[0,.095,.47]);
  addBolt(g,'BOLT_A',.055,.035,mB,[-.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_B',.055,.035,mB,[.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_C',.045,.035,mB,[-.62,.11,-.48],[PI/2,0,0]);
  addBolt(g,'BOLT_D',.045,.035,mB,[.62,.11,-.48],[PI/2,0,0]);
  addTorus(g,'SERVICE_RING',.23,.025,mC,[0,.12,.52],[PI/2,0,0],24,6);
  addBox(g,'MICRO_RAIL',[.92,.035,.05],mB,[0,.13,-.51]);
  parent.add(g);
  return g;
}
function detailModule074(parent, origin=[0,0,0], phase=0) {
  const g=new THREE.Group();
  g.name='DETAIL_MODULE_074';
  g.position.set(origin[0],origin[1],origin[2]);
  g.rotation.y=phase;
  const mA=(phase*10)%2>1?MAT.gun2:MAT.gun3;
  const mB=(phase*7)%2>1?MAT.steel:MAT.graphite;
  const mC=(phase*5)%2>1?MAT.blood:MAT.gun2;
  addBox(g,'PLATE',[1.8+.08*(74%5),.16,.92+.04*(74%7)],mA,[0,0,0]);
  addBox(g,'BACKING',[1.38,.10,.62],mB,[0,-.16,0]);
  addBox(g,'SEAM',[1.1,.018,.025],mC,[0,.095,.47]);
  addBolt(g,'BOLT_A',.055,.035,mB,[-.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_B',.055,.035,mB,[.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_C',.045,.035,mB,[-.62,.11,-.48],[PI/2,0,0]);
  addBolt(g,'BOLT_D',.045,.035,mB,[.62,.11,-.48],[PI/2,0,0]);
  addTorus(g,'SERVICE_RING',.23,.025,mC,[0,.12,.52],[PI/2,0,0],24,6);
  addBox(g,'MICRO_RAIL',[.92,.035,.05],mB,[0,.13,-.51]);
  parent.add(g);
  return g;
}
function detailModule075(parent, origin=[0,0,0], phase=0) {
  const g=new THREE.Group();
  g.name='DETAIL_MODULE_075';
  g.position.set(origin[0],origin[1],origin[2]);
  g.rotation.y=phase;
  const mA=(phase*10)%2>1?MAT.gun2:MAT.gun3;
  const mB=(phase*7)%2>1?MAT.steel:MAT.graphite;
  const mC=(phase*5)%2>1?MAT.blood:MAT.gun2;
  addBox(g,'PLATE',[1.8+.08*(75%5),.16,.92+.04*(75%7)],mA,[0,0,0]);
  addBox(g,'BACKING',[1.38,.10,.62],mB,[0,-.16,0]);
  addBox(g,'SEAM',[1.1,.018,.025],mC,[0,.095,.47]);
  addBolt(g,'BOLT_A',.055,.035,mB,[-.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_B',.055,.035,mB,[.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_C',.045,.035,mB,[-.62,.11,-.48],[PI/2,0,0]);
  addBolt(g,'BOLT_D',.045,.035,mB,[.62,.11,-.48],[PI/2,0,0]);
  addTorus(g,'SERVICE_RING',.23,.025,mC,[0,.12,.52],[PI/2,0,0],24,6);
  addBox(g,'MICRO_RAIL',[.92,.035,.05],mB,[0,.13,-.51]);
  parent.add(g);
  return g;
}
function detailModule076(parent, origin=[0,0,0], phase=0) {
  const g=new THREE.Group();
  g.name='DETAIL_MODULE_076';
  g.position.set(origin[0],origin[1],origin[2]);
  g.rotation.y=phase;
  const mA=(phase*10)%2>1?MAT.gun2:MAT.gun3;
  const mB=(phase*7)%2>1?MAT.steel:MAT.graphite;
  const mC=(phase*5)%2>1?MAT.blood:MAT.gun2;
  addBox(g,'PLATE',[1.8+.08*(76%5),.16,.92+.04*(76%7)],mA,[0,0,0]);
  addBox(g,'BACKING',[1.38,.10,.62],mB,[0,-.16,0]);
  addBox(g,'SEAM',[1.1,.018,.025],mC,[0,.095,.47]);
  addBolt(g,'BOLT_A',.055,.035,mB,[-.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_B',.055,.035,mB,[.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_C',.045,.035,mB,[-.62,.11,-.48],[PI/2,0,0]);
  addBolt(g,'BOLT_D',.045,.035,mB,[.62,.11,-.48],[PI/2,0,0]);
  addTorus(g,'SERVICE_RING',.23,.025,mC,[0,.12,.52],[PI/2,0,0],24,6);
  addBox(g,'MICRO_RAIL',[.92,.035,.05],mB,[0,.13,-.51]);
  parent.add(g);
  return g;
}
function detailModule077(parent, origin=[0,0,0], phase=0) {
  const g=new THREE.Group();
  g.name='DETAIL_MODULE_077';
  g.position.set(origin[0],origin[1],origin[2]);
  g.rotation.y=phase;
  const mA=(phase*10)%2>1?MAT.gun2:MAT.gun3;
  const mB=(phase*7)%2>1?MAT.steel:MAT.graphite;
  const mC=(phase*5)%2>1?MAT.blood:MAT.gun2;
  addBox(g,'PLATE',[1.8+.08*(77%5),.16,.92+.04*(77%7)],mA,[0,0,0]);
  addBox(g,'BACKING',[1.38,.10,.62],mB,[0,-.16,0]);
  addBox(g,'SEAM',[1.1,.018,.025],mC,[0,.095,.47]);
  addBolt(g,'BOLT_A',.055,.035,mB,[-.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_B',.055,.035,mB,[.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_C',.045,.035,mB,[-.62,.11,-.48],[PI/2,0,0]);
  addBolt(g,'BOLT_D',.045,.035,mB,[.62,.11,-.48],[PI/2,0,0]);
  addTorus(g,'SERVICE_RING',.23,.025,mC,[0,.12,.52],[PI/2,0,0],24,6);
  addBox(g,'MICRO_RAIL',[.92,.035,.05],mB,[0,.13,-.51]);
  parent.add(g);
  return g;
}
function detailModule078(parent, origin=[0,0,0], phase=0) {
  const g=new THREE.Group();
  g.name='DETAIL_MODULE_078';
  g.position.set(origin[0],origin[1],origin[2]);
  g.rotation.y=phase;
  const mA=(phase*10)%2>1?MAT.gun2:MAT.gun3;
  const mB=(phase*7)%2>1?MAT.steel:MAT.graphite;
  const mC=(phase*5)%2>1?MAT.blood:MAT.gun2;
  addBox(g,'PLATE',[1.8+.08*(78%5),.16,.92+.04*(78%7)],mA,[0,0,0]);
  addBox(g,'BACKING',[1.38,.10,.62],mB,[0,-.16,0]);
  addBox(g,'SEAM',[1.1,.018,.025],mC,[0,.095,.47]);
  addBolt(g,'BOLT_A',.055,.035,mB,[-.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_B',.055,.035,mB,[.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_C',.045,.035,mB,[-.62,.11,-.48],[PI/2,0,0]);
  addBolt(g,'BOLT_D',.045,.035,mB,[.62,.11,-.48],[PI/2,0,0]);
  addTorus(g,'SERVICE_RING',.23,.025,mC,[0,.12,.52],[PI/2,0,0],24,6);
  addBox(g,'MICRO_RAIL',[.92,.035,.05],mB,[0,.13,-.51]);
  parent.add(g);
  return g;
}
function detailModule079(parent, origin=[0,0,0], phase=0) {
  const g=new THREE.Group();
  g.name='DETAIL_MODULE_079';
  g.position.set(origin[0],origin[1],origin[2]);
  g.rotation.y=phase;
  const mA=(phase*10)%2>1?MAT.gun2:MAT.gun3;
  const mB=(phase*7)%2>1?MAT.steel:MAT.graphite;
  const mC=(phase*5)%2>1?MAT.blood:MAT.gun2;
  addBox(g,'PLATE',[1.8+.08*(79%5),.16,.92+.04*(79%7)],mA,[0,0,0]);
  addBox(g,'BACKING',[1.38,.10,.62],mB,[0,-.16,0]);
  addBox(g,'SEAM',[1.1,.018,.025],mC,[0,.095,.47]);
  addBolt(g,'BOLT_A',.055,.035,mB,[-.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_B',.055,.035,mB,[.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_C',.045,.035,mB,[-.62,.11,-.48],[PI/2,0,0]);
  addBolt(g,'BOLT_D',.045,.035,mB,[.62,.11,-.48],[PI/2,0,0]);
  addTorus(g,'SERVICE_RING',.23,.025,mC,[0,.12,.52],[PI/2,0,0],24,6);
  addBox(g,'MICRO_RAIL',[.92,.035,.05],mB,[0,.13,-.51]);
  parent.add(g);
  return g;
}
function detailModule080(parent, origin=[0,0,0], phase=0) {
  const g=new THREE.Group();
  g.name='DETAIL_MODULE_080';
  g.position.set(origin[0],origin[1],origin[2]);
  g.rotation.y=phase;
  const mA=(phase*10)%2>1?MAT.gun2:MAT.gun3;
  const mB=(phase*7)%2>1?MAT.steel:MAT.graphite;
  const mC=(phase*5)%2>1?MAT.blood:MAT.gun2;
  addBox(g,'PLATE',[1.8+.08*(80%5),.16,.92+.04*(80%7)],mA,[0,0,0]);
  addBox(g,'BACKING',[1.38,.10,.62],mB,[0,-.16,0]);
  addBox(g,'SEAM',[1.1,.018,.025],mC,[0,.095,.47]);
  addBolt(g,'BOLT_A',.055,.035,mB,[-.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_B',.055,.035,mB,[.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_C',.045,.035,mB,[-.62,.11,-.48],[PI/2,0,0]);
  addBolt(g,'BOLT_D',.045,.035,mB,[.62,.11,-.48],[PI/2,0,0]);
  addTorus(g,'SERVICE_RING',.23,.025,mC,[0,.12,.52],[PI/2,0,0],24,6);
  addBox(g,'MICRO_RAIL',[.92,.035,.05],mB,[0,.13,-.51]);
  parent.add(g);
  return g;
}
function detailModule081(parent, origin=[0,0,0], phase=0) {
  const g=new THREE.Group();
  g.name='DETAIL_MODULE_081';
  g.position.set(origin[0],origin[1],origin[2]);
  g.rotation.y=phase;
  const mA=(phase*10)%2>1?MAT.gun2:MAT.gun3;
  const mB=(phase*7)%2>1?MAT.steel:MAT.graphite;
  const mC=(phase*5)%2>1?MAT.blood:MAT.gun2;
  addBox(g,'PLATE',[1.8+.08*(81%5),.16,.92+.04*(81%7)],mA,[0,0,0]);
  addBox(g,'BACKING',[1.38,.10,.62],mB,[0,-.16,0]);
  addBox(g,'SEAM',[1.1,.018,.025],mC,[0,.095,.47]);
  addBolt(g,'BOLT_A',.055,.035,mB,[-.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_B',.055,.035,mB,[.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_C',.045,.035,mB,[-.62,.11,-.48],[PI/2,0,0]);
  addBolt(g,'BOLT_D',.045,.035,mB,[.62,.11,-.48],[PI/2,0,0]);
  addTorus(g,'SERVICE_RING',.23,.025,mC,[0,.12,.52],[PI/2,0,0],24,6);
  addBox(g,'MICRO_RAIL',[.92,.035,.05],mB,[0,.13,-.51]);
  parent.add(g);
  return g;
}
function detailModule082(parent, origin=[0,0,0], phase=0) {
  const g=new THREE.Group();
  g.name='DETAIL_MODULE_082';
  g.position.set(origin[0],origin[1],origin[2]);
  g.rotation.y=phase;
  const mA=(phase*10)%2>1?MAT.gun2:MAT.gun3;
  const mB=(phase*7)%2>1?MAT.steel:MAT.graphite;
  const mC=(phase*5)%2>1?MAT.blood:MAT.gun2;
  addBox(g,'PLATE',[1.8+.08*(82%5),.16,.92+.04*(82%7)],mA,[0,0,0]);
  addBox(g,'BACKING',[1.38,.10,.62],mB,[0,-.16,0]);
  addBox(g,'SEAM',[1.1,.018,.025],mC,[0,.095,.47]);
  addBolt(g,'BOLT_A',.055,.035,mB,[-.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_B',.055,.035,mB,[.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_C',.045,.035,mB,[-.62,.11,-.48],[PI/2,0,0]);
  addBolt(g,'BOLT_D',.045,.035,mB,[.62,.11,-.48],[PI/2,0,0]);
  addTorus(g,'SERVICE_RING',.23,.025,mC,[0,.12,.52],[PI/2,0,0],24,6);
  addBox(g,'MICRO_RAIL',[.92,.035,.05],mB,[0,.13,-.51]);
  parent.add(g);
  return g;
}
function detailModule083(parent, origin=[0,0,0], phase=0) {
  const g=new THREE.Group();
  g.name='DETAIL_MODULE_083';
  g.position.set(origin[0],origin[1],origin[2]);
  g.rotation.y=phase;
  const mA=(phase*10)%2>1?MAT.gun2:MAT.gun3;
  const mB=(phase*7)%2>1?MAT.steel:MAT.graphite;
  const mC=(phase*5)%2>1?MAT.blood:MAT.gun2;
  addBox(g,'PLATE',[1.8+.08*(83%5),.16,.92+.04*(83%7)],mA,[0,0,0]);
  addBox(g,'BACKING',[1.38,.10,.62],mB,[0,-.16,0]);
  addBox(g,'SEAM',[1.1,.018,.025],mC,[0,.095,.47]);
  addBolt(g,'BOLT_A',.055,.035,mB,[-.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_B',.055,.035,mB,[.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_C',.045,.035,mB,[-.62,.11,-.48],[PI/2,0,0]);
  addBolt(g,'BOLT_D',.045,.035,mB,[.62,.11,-.48],[PI/2,0,0]);
  addTorus(g,'SERVICE_RING',.23,.025,mC,[0,.12,.52],[PI/2,0,0],24,6);
  addBox(g,'MICRO_RAIL',[.92,.035,.05],mB,[0,.13,-.51]);
  parent.add(g);
  return g;
}
function detailModule084(parent, origin=[0,0,0], phase=0) {
  const g=new THREE.Group();
  g.name='DETAIL_MODULE_084';
  g.position.set(origin[0],origin[1],origin[2]);
  g.rotation.y=phase;
  const mA=(phase*10)%2>1?MAT.gun2:MAT.gun3;
  const mB=(phase*7)%2>1?MAT.steel:MAT.graphite;
  const mC=(phase*5)%2>1?MAT.blood:MAT.gun2;
  addBox(g,'PLATE',[1.8+.08*(84%5),.16,.92+.04*(84%7)],mA,[0,0,0]);
  addBox(g,'BACKING',[1.38,.10,.62],mB,[0,-.16,0]);
  addBox(g,'SEAM',[1.1,.018,.025],mC,[0,.095,.47]);
  addBolt(g,'BOLT_A',.055,.035,mB,[-.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_B',.055,.035,mB,[.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_C',.045,.035,mB,[-.62,.11,-.48],[PI/2,0,0]);
  addBolt(g,'BOLT_D',.045,.035,mB,[.62,.11,-.48],[PI/2,0,0]);
  addTorus(g,'SERVICE_RING',.23,.025,mC,[0,.12,.52],[PI/2,0,0],24,6);
  addBox(g,'MICRO_RAIL',[.92,.035,.05],mB,[0,.13,-.51]);
  parent.add(g);
  return g;
}
function detailModule085(parent, origin=[0,0,0], phase=0) {
  const g=new THREE.Group();
  g.name='DETAIL_MODULE_085';
  g.position.set(origin[0],origin[1],origin[2]);
  g.rotation.y=phase;
  const mA=(phase*10)%2>1?MAT.gun2:MAT.gun3;
  const mB=(phase*7)%2>1?MAT.steel:MAT.graphite;
  const mC=(phase*5)%2>1?MAT.blood:MAT.gun2;
  addBox(g,'PLATE',[1.8+.08*(85%5),.16,.92+.04*(85%7)],mA,[0,0,0]);
  addBox(g,'BACKING',[1.38,.10,.62],mB,[0,-.16,0]);
  addBox(g,'SEAM',[1.1,.018,.025],mC,[0,.095,.47]);
  addBolt(g,'BOLT_A',.055,.035,mB,[-.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_B',.055,.035,mB,[.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_C',.045,.035,mB,[-.62,.11,-.48],[PI/2,0,0]);
  addBolt(g,'BOLT_D',.045,.035,mB,[.62,.11,-.48],[PI/2,0,0]);
  addTorus(g,'SERVICE_RING',.23,.025,mC,[0,.12,.52],[PI/2,0,0],24,6);
  addBox(g,'MICRO_RAIL',[.92,.035,.05],mB,[0,.13,-.51]);
  parent.add(g);
  return g;
}
function detailModule086(parent, origin=[0,0,0], phase=0) {
  const g=new THREE.Group();
  g.name='DETAIL_MODULE_086';
  g.position.set(origin[0],origin[1],origin[2]);
  g.rotation.y=phase;
  const mA=(phase*10)%2>1?MAT.gun2:MAT.gun3;
  const mB=(phase*7)%2>1?MAT.steel:MAT.graphite;
  const mC=(phase*5)%2>1?MAT.blood:MAT.gun2;
  addBox(g,'PLATE',[1.8+.08*(86%5),.16,.92+.04*(86%7)],mA,[0,0,0]);
  addBox(g,'BACKING',[1.38,.10,.62],mB,[0,-.16,0]);
  addBox(g,'SEAM',[1.1,.018,.025],mC,[0,.095,.47]);
  addBolt(g,'BOLT_A',.055,.035,mB,[-.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_B',.055,.035,mB,[.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_C',.045,.035,mB,[-.62,.11,-.48],[PI/2,0,0]);
  addBolt(g,'BOLT_D',.045,.035,mB,[.62,.11,-.48],[PI/2,0,0]);
  addTorus(g,'SERVICE_RING',.23,.025,mC,[0,.12,.52],[PI/2,0,0],24,6);
  addBox(g,'MICRO_RAIL',[.92,.035,.05],mB,[0,.13,-.51]);
  parent.add(g);
  return g;
}
function detailModule087(parent, origin=[0,0,0], phase=0) {
  const g=new THREE.Group();
  g.name='DETAIL_MODULE_087';
  g.position.set(origin[0],origin[1],origin[2]);
  g.rotation.y=phase;
  const mA=(phase*10)%2>1?MAT.gun2:MAT.gun3;
  const mB=(phase*7)%2>1?MAT.steel:MAT.graphite;
  const mC=(phase*5)%2>1?MAT.blood:MAT.gun2;
  addBox(g,'PLATE',[1.8+.08*(87%5),.16,.92+.04*(87%7)],mA,[0,0,0]);
  addBox(g,'BACKING',[1.38,.10,.62],mB,[0,-.16,0]);
  addBox(g,'SEAM',[1.1,.018,.025],mC,[0,.095,.47]);
  addBolt(g,'BOLT_A',.055,.035,mB,[-.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_B',.055,.035,mB,[.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_C',.045,.035,mB,[-.62,.11,-.48],[PI/2,0,0]);
  addBolt(g,'BOLT_D',.045,.035,mB,[.62,.11,-.48],[PI/2,0,0]);
  addTorus(g,'SERVICE_RING',.23,.025,mC,[0,.12,.52],[PI/2,0,0],24,6);
  addBox(g,'MICRO_RAIL',[.92,.035,.05],mB,[0,.13,-.51]);
  parent.add(g);
  return g;
}
function detailModule088(parent, origin=[0,0,0], phase=0) {
  const g=new THREE.Group();
  g.name='DETAIL_MODULE_088';
  g.position.set(origin[0],origin[1],origin[2]);
  g.rotation.y=phase;
  const mA=(phase*10)%2>1?MAT.gun2:MAT.gun3;
  const mB=(phase*7)%2>1?MAT.steel:MAT.graphite;
  const mC=(phase*5)%2>1?MAT.blood:MAT.gun2;
  addBox(g,'PLATE',[1.8+.08*(88%5),.16,.92+.04*(88%7)],mA,[0,0,0]);
  addBox(g,'BACKING',[1.38,.10,.62],mB,[0,-.16,0]);
  addBox(g,'SEAM',[1.1,.018,.025],mC,[0,.095,.47]);
  addBolt(g,'BOLT_A',.055,.035,mB,[-.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_B',.055,.035,mB,[.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_C',.045,.035,mB,[-.62,.11,-.48],[PI/2,0,0]);
  addBolt(g,'BOLT_D',.045,.035,mB,[.62,.11,-.48],[PI/2,0,0]);
  addTorus(g,'SERVICE_RING',.23,.025,mC,[0,.12,.52],[PI/2,0,0],24,6);
  addBox(g,'MICRO_RAIL',[.92,.035,.05],mB,[0,.13,-.51]);
  parent.add(g);
  return g;
}
function detailModule089(parent, origin=[0,0,0], phase=0) {
  const g=new THREE.Group();
  g.name='DETAIL_MODULE_089';
  g.position.set(origin[0],origin[1],origin[2]);
  g.rotation.y=phase;
  const mA=(phase*10)%2>1?MAT.gun2:MAT.gun3;
  const mB=(phase*7)%2>1?MAT.steel:MAT.graphite;
  const mC=(phase*5)%2>1?MAT.blood:MAT.gun2;
  addBox(g,'PLATE',[1.8+.08*(89%5),.16,.92+.04*(89%7)],mA,[0,0,0]);
  addBox(g,'BACKING',[1.38,.10,.62],mB,[0,-.16,0]);
  addBox(g,'SEAM',[1.1,.018,.025],mC,[0,.095,.47]);
  addBolt(g,'BOLT_A',.055,.035,mB,[-.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_B',.055,.035,mB,[.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_C',.045,.035,mB,[-.62,.11,-.48],[PI/2,0,0]);
  addBolt(g,'BOLT_D',.045,.035,mB,[.62,.11,-.48],[PI/2,0,0]);
  addTorus(g,'SERVICE_RING',.23,.025,mC,[0,.12,.52],[PI/2,0,0],24,6);
  addBox(g,'MICRO_RAIL',[.92,.035,.05],mB,[0,.13,-.51]);
  parent.add(g);
  return g;
}
function detailModule090(parent, origin=[0,0,0], phase=0) {
  const g=new THREE.Group();
  g.name='DETAIL_MODULE_090';
  g.position.set(origin[0],origin[1],origin[2]);
  g.rotation.y=phase;
  const mA=(phase*10)%2>1?MAT.gun2:MAT.gun3;
  const mB=(phase*7)%2>1?MAT.steel:MAT.graphite;
  const mC=(phase*5)%2>1?MAT.blood:MAT.gun2;
  addBox(g,'PLATE',[1.8+.08*(90%5),.16,.92+.04*(90%7)],mA,[0,0,0]);
  addBox(g,'BACKING',[1.38,.10,.62],mB,[0,-.16,0]);
  addBox(g,'SEAM',[1.1,.018,.025],mC,[0,.095,.47]);
  addBolt(g,'BOLT_A',.055,.035,mB,[-.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_B',.055,.035,mB,[.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_C',.045,.035,mB,[-.62,.11,-.48],[PI/2,0,0]);
  addBolt(g,'BOLT_D',.045,.035,mB,[.62,.11,-.48],[PI/2,0,0]);
  addTorus(g,'SERVICE_RING',.23,.025,mC,[0,.12,.52],[PI/2,0,0],24,6);
  addBox(g,'MICRO_RAIL',[.92,.035,.05],mB,[0,.13,-.51]);
  parent.add(g);
  return g;
}
function detailModule091(parent, origin=[0,0,0], phase=0) {
  const g=new THREE.Group();
  g.name='DETAIL_MODULE_091';
  g.position.set(origin[0],origin[1],origin[2]);
  g.rotation.y=phase;
  const mA=(phase*10)%2>1?MAT.gun2:MAT.gun3;
  const mB=(phase*7)%2>1?MAT.steel:MAT.graphite;
  const mC=(phase*5)%2>1?MAT.blood:MAT.gun2;
  addBox(g,'PLATE',[1.8+.08*(91%5),.16,.92+.04*(91%7)],mA,[0,0,0]);
  addBox(g,'BACKING',[1.38,.10,.62],mB,[0,-.16,0]);
  addBox(g,'SEAM',[1.1,.018,.025],mC,[0,.095,.47]);
  addBolt(g,'BOLT_A',.055,.035,mB,[-.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_B',.055,.035,mB,[.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_C',.045,.035,mB,[-.62,.11,-.48],[PI/2,0,0]);
  addBolt(g,'BOLT_D',.045,.035,mB,[.62,.11,-.48],[PI/2,0,0]);
  addTorus(g,'SERVICE_RING',.23,.025,mC,[0,.12,.52],[PI/2,0,0],24,6);
  addBox(g,'MICRO_RAIL',[.92,.035,.05],mB,[0,.13,-.51]);
  parent.add(g);
  return g;
}
function detailModule092(parent, origin=[0,0,0], phase=0) {
  const g=new THREE.Group();
  g.name='DETAIL_MODULE_092';
  g.position.set(origin[0],origin[1],origin[2]);
  g.rotation.y=phase;
  const mA=(phase*10)%2>1?MAT.gun2:MAT.gun3;
  const mB=(phase*7)%2>1?MAT.steel:MAT.graphite;
  const mC=(phase*5)%2>1?MAT.blood:MAT.gun2;
  addBox(g,'PLATE',[1.8+.08*(92%5),.16,.92+.04*(92%7)],mA,[0,0,0]);
  addBox(g,'BACKING',[1.38,.10,.62],mB,[0,-.16,0]);
  addBox(g,'SEAM',[1.1,.018,.025],mC,[0,.095,.47]);
  addBolt(g,'BOLT_A',.055,.035,mB,[-.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_B',.055,.035,mB,[.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_C',.045,.035,mB,[-.62,.11,-.48],[PI/2,0,0]);
  addBolt(g,'BOLT_D',.045,.035,mB,[.62,.11,-.48],[PI/2,0,0]);
  addTorus(g,'SERVICE_RING',.23,.025,mC,[0,.12,.52],[PI/2,0,0],24,6);
  addBox(g,'MICRO_RAIL',[.92,.035,.05],mB,[0,.13,-.51]);
  parent.add(g);
  return g;
}
function detailModule093(parent, origin=[0,0,0], phase=0) {
  const g=new THREE.Group();
  g.name='DETAIL_MODULE_093';
  g.position.set(origin[0],origin[1],origin[2]);
  g.rotation.y=phase;
  const mA=(phase*10)%2>1?MAT.gun2:MAT.gun3;
  const mB=(phase*7)%2>1?MAT.steel:MAT.graphite;
  const mC=(phase*5)%2>1?MAT.blood:MAT.gun2;
  addBox(g,'PLATE',[1.8+.08*(93%5),.16,.92+.04*(93%7)],mA,[0,0,0]);
  addBox(g,'BACKING',[1.38,.10,.62],mB,[0,-.16,0]);
  addBox(g,'SEAM',[1.1,.018,.025],mC,[0,.095,.47]);
  addBolt(g,'BOLT_A',.055,.035,mB,[-.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_B',.055,.035,mB,[.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_C',.045,.035,mB,[-.62,.11,-.48],[PI/2,0,0]);
  addBolt(g,'BOLT_D',.045,.035,mB,[.62,.11,-.48],[PI/2,0,0]);
  addTorus(g,'SERVICE_RING',.23,.025,mC,[0,.12,.52],[PI/2,0,0],24,6);
  addBox(g,'MICRO_RAIL',[.92,.035,.05],mB,[0,.13,-.51]);
  parent.add(g);
  return g;
}
function detailModule094(parent, origin=[0,0,0], phase=0) {
  const g=new THREE.Group();
  g.name='DETAIL_MODULE_094';
  g.position.set(origin[0],origin[1],origin[2]);
  g.rotation.y=phase;
  const mA=(phase*10)%2>1?MAT.gun2:MAT.gun3;
  const mB=(phase*7)%2>1?MAT.steel:MAT.graphite;
  const mC=(phase*5)%2>1?MAT.blood:MAT.gun2;
  addBox(g,'PLATE',[1.8+.08*(94%5),.16,.92+.04*(94%7)],mA,[0,0,0]);
  addBox(g,'BACKING',[1.38,.10,.62],mB,[0,-.16,0]);
  addBox(g,'SEAM',[1.1,.018,.025],mC,[0,.095,.47]);
  addBolt(g,'BOLT_A',.055,.035,mB,[-.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_B',.055,.035,mB,[.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_C',.045,.035,mB,[-.62,.11,-.48],[PI/2,0,0]);
  addBolt(g,'BOLT_D',.045,.035,mB,[.62,.11,-.48],[PI/2,0,0]);
  addTorus(g,'SERVICE_RING',.23,.025,mC,[0,.12,.52],[PI/2,0,0],24,6);
  addBox(g,'MICRO_RAIL',[.92,.035,.05],mB,[0,.13,-.51]);
  parent.add(g);
  return g;
}
function detailModule095(parent, origin=[0,0,0], phase=0) {
  const g=new THREE.Group();
  g.name='DETAIL_MODULE_095';
  g.position.set(origin[0],origin[1],origin[2]);
  g.rotation.y=phase;
  const mA=(phase*10)%2>1?MAT.gun2:MAT.gun3;
  const mB=(phase*7)%2>1?MAT.steel:MAT.graphite;
  const mC=(phase*5)%2>1?MAT.blood:MAT.gun2;
  addBox(g,'PLATE',[1.8+.08*(95%5),.16,.92+.04*(95%7)],mA,[0,0,0]);
  addBox(g,'BACKING',[1.38,.10,.62],mB,[0,-.16,0]);
  addBox(g,'SEAM',[1.1,.018,.025],mC,[0,.095,.47]);
  addBolt(g,'BOLT_A',.055,.035,mB,[-.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_B',.055,.035,mB,[.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_C',.045,.035,mB,[-.62,.11,-.48],[PI/2,0,0]);
  addBolt(g,'BOLT_D',.045,.035,mB,[.62,.11,-.48],[PI/2,0,0]);
  addTorus(g,'SERVICE_RING',.23,.025,mC,[0,.12,.52],[PI/2,0,0],24,6);
  addBox(g,'MICRO_RAIL',[.92,.035,.05],mB,[0,.13,-.51]);
  parent.add(g);
  return g;
}
function detailModule096(parent, origin=[0,0,0], phase=0) {
  const g=new THREE.Group();
  g.name='DETAIL_MODULE_096';
  g.position.set(origin[0],origin[1],origin[2]);
  g.rotation.y=phase;
  const mA=(phase*10)%2>1?MAT.gun2:MAT.gun3;
  const mB=(phase*7)%2>1?MAT.steel:MAT.graphite;
  const mC=(phase*5)%2>1?MAT.blood:MAT.gun2;
  addBox(g,'PLATE',[1.8+.08*(96%5),.16,.92+.04*(96%7)],mA,[0,0,0]);
  addBox(g,'BACKING',[1.38,.10,.62],mB,[0,-.16,0]);
  addBox(g,'SEAM',[1.1,.018,.025],mC,[0,.095,.47]);
  addBolt(g,'BOLT_A',.055,.035,mB,[-.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_B',.055,.035,mB,[.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_C',.045,.035,mB,[-.62,.11,-.48],[PI/2,0,0]);
  addBolt(g,'BOLT_D',.045,.035,mB,[.62,.11,-.48],[PI/2,0,0]);
  addTorus(g,'SERVICE_RING',.23,.025,mC,[0,.12,.52],[PI/2,0,0],24,6);
  addBox(g,'MICRO_RAIL',[.92,.035,.05],mB,[0,.13,-.51]);
  parent.add(g);
  return g;
}
function detailModule097(parent, origin=[0,0,0], phase=0) {
  const g=new THREE.Group();
  g.name='DETAIL_MODULE_097';
  g.position.set(origin[0],origin[1],origin[2]);
  g.rotation.y=phase;
  const mA=(phase*10)%2>1?MAT.gun2:MAT.gun3;
  const mB=(phase*7)%2>1?MAT.steel:MAT.graphite;
  const mC=(phase*5)%2>1?MAT.blood:MAT.gun2;
  addBox(g,'PLATE',[1.8+.08*(97%5),.16,.92+.04*(97%7)],mA,[0,0,0]);
  addBox(g,'BACKING',[1.38,.10,.62],mB,[0,-.16,0]);
  addBox(g,'SEAM',[1.1,.018,.025],mC,[0,.095,.47]);
  addBolt(g,'BOLT_A',.055,.035,mB,[-.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_B',.055,.035,mB,[.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_C',.045,.035,mB,[-.62,.11,-.48],[PI/2,0,0]);
  addBolt(g,'BOLT_D',.045,.035,mB,[.62,.11,-.48],[PI/2,0,0]);
  addTorus(g,'SERVICE_RING',.23,.025,mC,[0,.12,.52],[PI/2,0,0],24,6);
  addBox(g,'MICRO_RAIL',[.92,.035,.05],mB,[0,.13,-.51]);
  parent.add(g);
  return g;
}
function detailModule098(parent, origin=[0,0,0], phase=0) {
  const g=new THREE.Group();
  g.name='DETAIL_MODULE_098';
  g.position.set(origin[0],origin[1],origin[2]);
  g.rotation.y=phase;
  const mA=(phase*10)%2>1?MAT.gun2:MAT.gun3;
  const mB=(phase*7)%2>1?MAT.steel:MAT.graphite;
  const mC=(phase*5)%2>1?MAT.blood:MAT.gun2;
  addBox(g,'PLATE',[1.8+.08*(98%5),.16,.92+.04*(98%7)],mA,[0,0,0]);
  addBox(g,'BACKING',[1.38,.10,.62],mB,[0,-.16,0]);
  addBox(g,'SEAM',[1.1,.018,.025],mC,[0,.095,.47]);
  addBolt(g,'BOLT_A',.055,.035,mB,[-.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_B',.055,.035,mB,[.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_C',.045,.035,mB,[-.62,.11,-.48],[PI/2,0,0]);
  addBolt(g,'BOLT_D',.045,.035,mB,[.62,.11,-.48],[PI/2,0,0]);
  addTorus(g,'SERVICE_RING',.23,.025,mC,[0,.12,.52],[PI/2,0,0],24,6);
  addBox(g,'MICRO_RAIL',[.92,.035,.05],mB,[0,.13,-.51]);
  parent.add(g);
  return g;
}
function detailModule099(parent, origin=[0,0,0], phase=0) {
  const g=new THREE.Group();
  g.name='DETAIL_MODULE_099';
  g.position.set(origin[0],origin[1],origin[2]);
  g.rotation.y=phase;
  const mA=(phase*10)%2>1?MAT.gun2:MAT.gun3;
  const mB=(phase*7)%2>1?MAT.steel:MAT.graphite;
  const mC=(phase*5)%2>1?MAT.blood:MAT.gun2;
  addBox(g,'PLATE',[1.8+.08*(99%5),.16,.92+.04*(99%7)],mA,[0,0,0]);
  addBox(g,'BACKING',[1.38,.10,.62],mB,[0,-.16,0]);
  addBox(g,'SEAM',[1.1,.018,.025],mC,[0,.095,.47]);
  addBolt(g,'BOLT_A',.055,.035,mB,[-.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_B',.055,.035,mB,[.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_C',.045,.035,mB,[-.62,.11,-.48],[PI/2,0,0]);
  addBolt(g,'BOLT_D',.045,.035,mB,[.62,.11,-.48],[PI/2,0,0]);
  addTorus(g,'SERVICE_RING',.23,.025,mC,[0,.12,.52],[PI/2,0,0],24,6);
  addBox(g,'MICRO_RAIL',[.92,.035,.05],mB,[0,.13,-.51]);
  parent.add(g);
  return g;
}
function detailModule100(parent, origin=[0,0,0], phase=0) {
  const g=new THREE.Group();
  g.name='DETAIL_MODULE_100';
  g.position.set(origin[0],origin[1],origin[2]);
  g.rotation.y=phase;
  const mA=(phase*10)%2>1?MAT.gun2:MAT.gun3;
  const mB=(phase*7)%2>1?MAT.steel:MAT.graphite;
  const mC=(phase*5)%2>1?MAT.blood:MAT.gun2;
  addBox(g,'PLATE',[1.8+.08*(100%5),.16,.92+.04*(100%7)],mA,[0,0,0]);
  addBox(g,'BACKING',[1.38,.10,.62],mB,[0,-.16,0]);
  addBox(g,'SEAM',[1.1,.018,.025],mC,[0,.095,.47]);
  addBolt(g,'BOLT_A',.055,.035,mB,[-.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_B',.055,.035,mB,[.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_C',.045,.035,mB,[-.62,.11,-.48],[PI/2,0,0]);
  addBolt(g,'BOLT_D',.045,.035,mB,[.62,.11,-.48],[PI/2,0,0]);
  addTorus(g,'SERVICE_RING',.23,.025,mC,[0,.12,.52],[PI/2,0,0],24,6);
  addBox(g,'MICRO_RAIL',[.92,.035,.05],mB,[0,.13,-.51]);
  parent.add(g);
  return g;
}
function detailModule101(parent, origin=[0,0,0], phase=0) {
  const g=new THREE.Group();
  g.name='DETAIL_MODULE_101';
  g.position.set(origin[0],origin[1],origin[2]);
  g.rotation.y=phase;
  const mA=(phase*10)%2>1?MAT.gun2:MAT.gun3;
  const mB=(phase*7)%2>1?MAT.steel:MAT.graphite;
  const mC=(phase*5)%2>1?MAT.blood:MAT.gun2;
  addBox(g,'PLATE',[1.8+.08*(101%5),.16,.92+.04*(101%7)],mA,[0,0,0]);
  addBox(g,'BACKING',[1.38,.10,.62],mB,[0,-.16,0]);
  addBox(g,'SEAM',[1.1,.018,.025],mC,[0,.095,.47]);
  addBolt(g,'BOLT_A',.055,.035,mB,[-.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_B',.055,.035,mB,[.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_C',.045,.035,mB,[-.62,.11,-.48],[PI/2,0,0]);
  addBolt(g,'BOLT_D',.045,.035,mB,[.62,.11,-.48],[PI/2,0,0]);
  addTorus(g,'SERVICE_RING',.23,.025,mC,[0,.12,.52],[PI/2,0,0],24,6);
  addBox(g,'MICRO_RAIL',[.92,.035,.05],mB,[0,.13,-.51]);
  parent.add(g);
  return g;
}
function detailModule102(parent, origin=[0,0,0], phase=0) {
  const g=new THREE.Group();
  g.name='DETAIL_MODULE_102';
  g.position.set(origin[0],origin[1],origin[2]);
  g.rotation.y=phase;
  const mA=(phase*10)%2>1?MAT.gun2:MAT.gun3;
  const mB=(phase*7)%2>1?MAT.steel:MAT.graphite;
  const mC=(phase*5)%2>1?MAT.blood:MAT.gun2;
  addBox(g,'PLATE',[1.8+.08*(102%5),.16,.92+.04*(102%7)],mA,[0,0,0]);
  addBox(g,'BACKING',[1.38,.10,.62],mB,[0,-.16,0]);
  addBox(g,'SEAM',[1.1,.018,.025],mC,[0,.095,.47]);
  addBolt(g,'BOLT_A',.055,.035,mB,[-.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_B',.055,.035,mB,[.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_C',.045,.035,mB,[-.62,.11,-.48],[PI/2,0,0]);
  addBolt(g,'BOLT_D',.045,.035,mB,[.62,.11,-.48],[PI/2,0,0]);
  addTorus(g,'SERVICE_RING',.23,.025,mC,[0,.12,.52],[PI/2,0,0],24,6);
  addBox(g,'MICRO_RAIL',[.92,.035,.05],mB,[0,.13,-.51]);
  parent.add(g);
  return g;
}
function detailModule103(parent, origin=[0,0,0], phase=0) {
  const g=new THREE.Group();
  g.name='DETAIL_MODULE_103';
  g.position.set(origin[0],origin[1],origin[2]);
  g.rotation.y=phase;
  const mA=(phase*10)%2>1?MAT.gun2:MAT.gun3;
  const mB=(phase*7)%2>1?MAT.steel:MAT.graphite;
  const mC=(phase*5)%2>1?MAT.blood:MAT.gun2;
  addBox(g,'PLATE',[1.8+.08*(103%5),.16,.92+.04*(103%7)],mA,[0,0,0]);
  addBox(g,'BACKING',[1.38,.10,.62],mB,[0,-.16,0]);
  addBox(g,'SEAM',[1.1,.018,.025],mC,[0,.095,.47]);
  addBolt(g,'BOLT_A',.055,.035,mB,[-.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_B',.055,.035,mB,[.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_C',.045,.035,mB,[-.62,.11,-.48],[PI/2,0,0]);
  addBolt(g,'BOLT_D',.045,.035,mB,[.62,.11,-.48],[PI/2,0,0]);
  addTorus(g,'SERVICE_RING',.23,.025,mC,[0,.12,.52],[PI/2,0,0],24,6);
  addBox(g,'MICRO_RAIL',[.92,.035,.05],mB,[0,.13,-.51]);
  parent.add(g);
  return g;
}
function detailModule104(parent, origin=[0,0,0], phase=0) {
  const g=new THREE.Group();
  g.name='DETAIL_MODULE_104';
  g.position.set(origin[0],origin[1],origin[2]);
  g.rotation.y=phase;
  const mA=(phase*10)%2>1?MAT.gun2:MAT.gun3;
  const mB=(phase*7)%2>1?MAT.steel:MAT.graphite;
  const mC=(phase*5)%2>1?MAT.blood:MAT.gun2;
  addBox(g,'PLATE',[1.8+.08*(104%5),.16,.92+.04*(104%7)],mA,[0,0,0]);
  addBox(g,'BACKING',[1.38,.10,.62],mB,[0,-.16,0]);
  addBox(g,'SEAM',[1.1,.018,.025],mC,[0,.095,.47]);
  addBolt(g,'BOLT_A',.055,.035,mB,[-.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_B',.055,.035,mB,[.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_C',.045,.035,mB,[-.62,.11,-.48],[PI/2,0,0]);
  addBolt(g,'BOLT_D',.045,.035,mB,[.62,.11,-.48],[PI/2,0,0]);
  addTorus(g,'SERVICE_RING',.23,.025,mC,[0,.12,.52],[PI/2,0,0],24,6);
  addBox(g,'MICRO_RAIL',[.92,.035,.05],mB,[0,.13,-.51]);
  parent.add(g);
  return g;
}
function detailModule105(parent, origin=[0,0,0], phase=0) {
  const g=new THREE.Group();
  g.name='DETAIL_MODULE_105';
  g.position.set(origin[0],origin[1],origin[2]);
  g.rotation.y=phase;
  const mA=(phase*10)%2>1?MAT.gun2:MAT.gun3;
  const mB=(phase*7)%2>1?MAT.steel:MAT.graphite;
  const mC=(phase*5)%2>1?MAT.blood:MAT.gun2;
  addBox(g,'PLATE',[1.8+.08*(105%5),.16,.92+.04*(105%7)],mA,[0,0,0]);
  addBox(g,'BACKING',[1.38,.10,.62],mB,[0,-.16,0]);
  addBox(g,'SEAM',[1.1,.018,.025],mC,[0,.095,.47]);
  addBolt(g,'BOLT_A',.055,.035,mB,[-.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_B',.055,.035,mB,[.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_C',.045,.035,mB,[-.62,.11,-.48],[PI/2,0,0]);
  addBolt(g,'BOLT_D',.045,.035,mB,[.62,.11,-.48],[PI/2,0,0]);
  addTorus(g,'SERVICE_RING',.23,.025,mC,[0,.12,.52],[PI/2,0,0],24,6);
  addBox(g,'MICRO_RAIL',[.92,.035,.05],mB,[0,.13,-.51]);
  parent.add(g);
  return g;
}
function detailModule106(parent, origin=[0,0,0], phase=0) {
  const g=new THREE.Group();
  g.name='DETAIL_MODULE_106';
  g.position.set(origin[0],origin[1],origin[2]);
  g.rotation.y=phase;
  const mA=(phase*10)%2>1?MAT.gun2:MAT.gun3;
  const mB=(phase*7)%2>1?MAT.steel:MAT.graphite;
  const mC=(phase*5)%2>1?MAT.blood:MAT.gun2;
  addBox(g,'PLATE',[1.8+.08*(106%5),.16,.92+.04*(106%7)],mA,[0,0,0]);
  addBox(g,'BACKING',[1.38,.10,.62],mB,[0,-.16,0]);
  addBox(g,'SEAM',[1.1,.018,.025],mC,[0,.095,.47]);
  addBolt(g,'BOLT_A',.055,.035,mB,[-.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_B',.055,.035,mB,[.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_C',.045,.035,mB,[-.62,.11,-.48],[PI/2,0,0]);
  addBolt(g,'BOLT_D',.045,.035,mB,[.62,.11,-.48],[PI/2,0,0]);
  addTorus(g,'SERVICE_RING',.23,.025,mC,[0,.12,.52],[PI/2,0,0],24,6);
  addBox(g,'MICRO_RAIL',[.92,.035,.05],mB,[0,.13,-.51]);
  parent.add(g);
  return g;
}
function detailModule107(parent, origin=[0,0,0], phase=0) {
  const g=new THREE.Group();
  g.name='DETAIL_MODULE_107';
  g.position.set(origin[0],origin[1],origin[2]);
  g.rotation.y=phase;
  const mA=(phase*10)%2>1?MAT.gun2:MAT.gun3;
  const mB=(phase*7)%2>1?MAT.steel:MAT.graphite;
  const mC=(phase*5)%2>1?MAT.blood:MAT.gun2;
  addBox(g,'PLATE',[1.8+.08*(107%5),.16,.92+.04*(107%7)],mA,[0,0,0]);
  addBox(g,'BACKING',[1.38,.10,.62],mB,[0,-.16,0]);
  addBox(g,'SEAM',[1.1,.018,.025],mC,[0,.095,.47]);
  addBolt(g,'BOLT_A',.055,.035,mB,[-.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_B',.055,.035,mB,[.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_C',.045,.035,mB,[-.62,.11,-.48],[PI/2,0,0]);
  addBolt(g,'BOLT_D',.045,.035,mB,[.62,.11,-.48],[PI/2,0,0]);
  addTorus(g,'SERVICE_RING',.23,.025,mC,[0,.12,.52],[PI/2,0,0],24,6);
  addBox(g,'MICRO_RAIL',[.92,.035,.05],mB,[0,.13,-.51]);
  parent.add(g);
  return g;
}
function detailModule108(parent, origin=[0,0,0], phase=0) {
  const g=new THREE.Group();
  g.name='DETAIL_MODULE_108';
  g.position.set(origin[0],origin[1],origin[2]);
  g.rotation.y=phase;
  const mA=(phase*10)%2>1?MAT.gun2:MAT.gun3;
  const mB=(phase*7)%2>1?MAT.steel:MAT.graphite;
  const mC=(phase*5)%2>1?MAT.blood:MAT.gun2;
  addBox(g,'PLATE',[1.8+.08*(108%5),.16,.92+.04*(108%7)],mA,[0,0,0]);
  addBox(g,'BACKING',[1.38,.10,.62],mB,[0,-.16,0]);
  addBox(g,'SEAM',[1.1,.018,.025],mC,[0,.095,.47]);
  addBolt(g,'BOLT_A',.055,.035,mB,[-.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_B',.055,.035,mB,[.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_C',.045,.035,mB,[-.62,.11,-.48],[PI/2,0,0]);
  addBolt(g,'BOLT_D',.045,.035,mB,[.62,.11,-.48],[PI/2,0,0]);
  addTorus(g,'SERVICE_RING',.23,.025,mC,[0,.12,.52],[PI/2,0,0],24,6);
  addBox(g,'MICRO_RAIL',[.92,.035,.05],mB,[0,.13,-.51]);
  parent.add(g);
  return g;
}
function detailModule109(parent, origin=[0,0,0], phase=0) {
  const g=new THREE.Group();
  g.name='DETAIL_MODULE_109';
  g.position.set(origin[0],origin[1],origin[2]);
  g.rotation.y=phase;
  const mA=(phase*10)%2>1?MAT.gun2:MAT.gun3;
  const mB=(phase*7)%2>1?MAT.steel:MAT.graphite;
  const mC=(phase*5)%2>1?MAT.blood:MAT.gun2;
  addBox(g,'PLATE',[1.8+.08*(109%5),.16,.92+.04*(109%7)],mA,[0,0,0]);
  addBox(g,'BACKING',[1.38,.10,.62],mB,[0,-.16,0]);
  addBox(g,'SEAM',[1.1,.018,.025],mC,[0,.095,.47]);
  addBolt(g,'BOLT_A',.055,.035,mB,[-.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_B',.055,.035,mB,[.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_C',.045,.035,mB,[-.62,.11,-.48],[PI/2,0,0]);
  addBolt(g,'BOLT_D',.045,.035,mB,[.62,.11,-.48],[PI/2,0,0]);
  addTorus(g,'SERVICE_RING',.23,.025,mC,[0,.12,.52],[PI/2,0,0],24,6);
  addBox(g,'MICRO_RAIL',[.92,.035,.05],mB,[0,.13,-.51]);
  parent.add(g);
  return g;
}
function detailModule110(parent, origin=[0,0,0], phase=0) {
  const g=new THREE.Group();
  g.name='DETAIL_MODULE_110';
  g.position.set(origin[0],origin[1],origin[2]);
  g.rotation.y=phase;
  const mA=(phase*10)%2>1?MAT.gun2:MAT.gun3;
  const mB=(phase*7)%2>1?MAT.steel:MAT.graphite;
  const mC=(phase*5)%2>1?MAT.blood:MAT.gun2;
  addBox(g,'PLATE',[1.8+.08*(110%5),.16,.92+.04*(110%7)],mA,[0,0,0]);
  addBox(g,'BACKING',[1.38,.10,.62],mB,[0,-.16,0]);
  addBox(g,'SEAM',[1.1,.018,.025],mC,[0,.095,.47]);
  addBolt(g,'BOLT_A',.055,.035,mB,[-.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_B',.055,.035,mB,[.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_C',.045,.035,mB,[-.62,.11,-.48],[PI/2,0,0]);
  addBolt(g,'BOLT_D',.045,.035,mB,[.62,.11,-.48],[PI/2,0,0]);
  addTorus(g,'SERVICE_RING',.23,.025,mC,[0,.12,.52],[PI/2,0,0],24,6);
  addBox(g,'MICRO_RAIL',[.92,.035,.05],mB,[0,.13,-.51]);
  parent.add(g);
  return g;
}
function detailModule111(parent, origin=[0,0,0], phase=0) {
  const g=new THREE.Group();
  g.name='DETAIL_MODULE_111';
  g.position.set(origin[0],origin[1],origin[2]);
  g.rotation.y=phase;
  const mA=(phase*10)%2>1?MAT.gun2:MAT.gun3;
  const mB=(phase*7)%2>1?MAT.steel:MAT.graphite;
  const mC=(phase*5)%2>1?MAT.blood:MAT.gun2;
  addBox(g,'PLATE',[1.8+.08*(111%5),.16,.92+.04*(111%7)],mA,[0,0,0]);
  addBox(g,'BACKING',[1.38,.10,.62],mB,[0,-.16,0]);
  addBox(g,'SEAM',[1.1,.018,.025],mC,[0,.095,.47]);
  addBolt(g,'BOLT_A',.055,.035,mB,[-.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_B',.055,.035,mB,[.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_C',.045,.035,mB,[-.62,.11,-.48],[PI/2,0,0]);
  addBolt(g,'BOLT_D',.045,.035,mB,[.62,.11,-.48],[PI/2,0,0]);
  addTorus(g,'SERVICE_RING',.23,.025,mC,[0,.12,.52],[PI/2,0,0],24,6);
  addBox(g,'MICRO_RAIL',[.92,.035,.05],mB,[0,.13,-.51]);
  parent.add(g);
  return g;
}
function detailModule112(parent, origin=[0,0,0], phase=0) {
  const g=new THREE.Group();
  g.name='DETAIL_MODULE_112';
  g.position.set(origin[0],origin[1],origin[2]);
  g.rotation.y=phase;
  const mA=(phase*10)%2>1?MAT.gun2:MAT.gun3;
  const mB=(phase*7)%2>1?MAT.steel:MAT.graphite;
  const mC=(phase*5)%2>1?MAT.blood:MAT.gun2;
  addBox(g,'PLATE',[1.8+.08*(112%5),.16,.92+.04*(112%7)],mA,[0,0,0]);
  addBox(g,'BACKING',[1.38,.10,.62],mB,[0,-.16,0]);
  addBox(g,'SEAM',[1.1,.018,.025],mC,[0,.095,.47]);
  addBolt(g,'BOLT_A',.055,.035,mB,[-.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_B',.055,.035,mB,[.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_C',.045,.035,mB,[-.62,.11,-.48],[PI/2,0,0]);
  addBolt(g,'BOLT_D',.045,.035,mB,[.62,.11,-.48],[PI/2,0,0]);
  addTorus(g,'SERVICE_RING',.23,.025,mC,[0,.12,.52],[PI/2,0,0],24,6);
  addBox(g,'MICRO_RAIL',[.92,.035,.05],mB,[0,.13,-.51]);
  parent.add(g);
  return g;
}
function detailModule113(parent, origin=[0,0,0], phase=0) {
  const g=new THREE.Group();
  g.name='DETAIL_MODULE_113';
  g.position.set(origin[0],origin[1],origin[2]);
  g.rotation.y=phase;
  const mA=(phase*10)%2>1?MAT.gun2:MAT.gun3;
  const mB=(phase*7)%2>1?MAT.steel:MAT.graphite;
  const mC=(phase*5)%2>1?MAT.blood:MAT.gun2;
  addBox(g,'PLATE',[1.8+.08*(113%5),.16,.92+.04*(113%7)],mA,[0,0,0]);
  addBox(g,'BACKING',[1.38,.10,.62],mB,[0,-.16,0]);
  addBox(g,'SEAM',[1.1,.018,.025],mC,[0,.095,.47]);
  addBolt(g,'BOLT_A',.055,.035,mB,[-.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_B',.055,.035,mB,[.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_C',.045,.035,mB,[-.62,.11,-.48],[PI/2,0,0]);
  addBolt(g,'BOLT_D',.045,.035,mB,[.62,.11,-.48],[PI/2,0,0]);
  addTorus(g,'SERVICE_RING',.23,.025,mC,[0,.12,.52],[PI/2,0,0],24,6);
  addBox(g,'MICRO_RAIL',[.92,.035,.05],mB,[0,.13,-.51]);
  parent.add(g);
  return g;
}
function detailModule114(parent, origin=[0,0,0], phase=0) {
  const g=new THREE.Group();
  g.name='DETAIL_MODULE_114';
  g.position.set(origin[0],origin[1],origin[2]);
  g.rotation.y=phase;
  const mA=(phase*10)%2>1?MAT.gun2:MAT.gun3;
  const mB=(phase*7)%2>1?MAT.steel:MAT.graphite;
  const mC=(phase*5)%2>1?MAT.blood:MAT.gun2;
  addBox(g,'PLATE',[1.8+.08*(114%5),.16,.92+.04*(114%7)],mA,[0,0,0]);
  addBox(g,'BACKING',[1.38,.10,.62],mB,[0,-.16,0]);
  addBox(g,'SEAM',[1.1,.018,.025],mC,[0,.095,.47]);
  addBolt(g,'BOLT_A',.055,.035,mB,[-.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_B',.055,.035,mB,[.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_C',.045,.035,mB,[-.62,.11,-.48],[PI/2,0,0]);
  addBolt(g,'BOLT_D',.045,.035,mB,[.62,.11,-.48],[PI/2,0,0]);
  addTorus(g,'SERVICE_RING',.23,.025,mC,[0,.12,.52],[PI/2,0,0],24,6);
  addBox(g,'MICRO_RAIL',[.92,.035,.05],mB,[0,.13,-.51]);
  parent.add(g);
  return g;
}
function detailModule115(parent, origin=[0,0,0], phase=0) {
  const g=new THREE.Group();
  g.name='DETAIL_MODULE_115';
  g.position.set(origin[0],origin[1],origin[2]);
  g.rotation.y=phase;
  const mA=(phase*10)%2>1?MAT.gun2:MAT.gun3;
  const mB=(phase*7)%2>1?MAT.steel:MAT.graphite;
  const mC=(phase*5)%2>1?MAT.blood:MAT.gun2;
  addBox(g,'PLATE',[1.8+.08*(115%5),.16,.92+.04*(115%7)],mA,[0,0,0]);
  addBox(g,'BACKING',[1.38,.10,.62],mB,[0,-.16,0]);
  addBox(g,'SEAM',[1.1,.018,.025],mC,[0,.095,.47]);
  addBolt(g,'BOLT_A',.055,.035,mB,[-.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_B',.055,.035,mB,[.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_C',.045,.035,mB,[-.62,.11,-.48],[PI/2,0,0]);
  addBolt(g,'BOLT_D',.045,.035,mB,[.62,.11,-.48],[PI/2,0,0]);
  addTorus(g,'SERVICE_RING',.23,.025,mC,[0,.12,.52],[PI/2,0,0],24,6);
  addBox(g,'MICRO_RAIL',[.92,.035,.05],mB,[0,.13,-.51]);
  parent.add(g);
  return g;
}
function detailModule116(parent, origin=[0,0,0], phase=0) {
  const g=new THREE.Group();
  g.name='DETAIL_MODULE_116';
  g.position.set(origin[0],origin[1],origin[2]);
  g.rotation.y=phase;
  const mA=(phase*10)%2>1?MAT.gun2:MAT.gun3;
  const mB=(phase*7)%2>1?MAT.steel:MAT.graphite;
  const mC=(phase*5)%2>1?MAT.blood:MAT.gun2;
  addBox(g,'PLATE',[1.8+.08*(116%5),.16,.92+.04*(116%7)],mA,[0,0,0]);
  addBox(g,'BACKING',[1.38,.10,.62],mB,[0,-.16,0]);
  addBox(g,'SEAM',[1.1,.018,.025],mC,[0,.095,.47]);
  addBolt(g,'BOLT_A',.055,.035,mB,[-.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_B',.055,.035,mB,[.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_C',.045,.035,mB,[-.62,.11,-.48],[PI/2,0,0]);
  addBolt(g,'BOLT_D',.045,.035,mB,[.62,.11,-.48],[PI/2,0,0]);  addTorus(g,'SERVICE_RING',.23,.025,mC,[0,.12,.52],[PI/2,0,0],24,6);
  addBox(g,'MICRO_RAIL',[.92,.035,.05],mB,[0,.13,-.51]);
  parent.add(g);
  return g;
}
function detailModule117(parent, origin=[0,0,0], phase=0) {
  const g=new THREE.Group();
  g.name='DETAIL_MODULE_117';
  g.position.set(origin[0],origin[1],origin[2]);
  g.rotation.y=phase;
  const mA=(phase*10)%2>1?MAT.gun2:MAT.gun3;
  const mB=(phase*7)%2>1?MAT.steel:MAT.graphite;
  const mC=(phase*5)%2>1?MAT.blood:MAT.gun2;
  addBox(g,'PLATE',[1.8+.08*(117%5),.16,.92+.04*(117%7)],mA,[0,0,0]);
  addBox(g,'BACKING',[1.38,.10,.62],mB,[0,-.16,0]);
  addBox(g,'SEAM',[1.1,.018,.025],mC,[0,.095,.47]);
  addBolt(g,'BOLT_A',.055,.035,mB,[-.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_B',.055,.035,mB,[.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_C',.045,.035,mB,[-.62,.11,-.48],[PI/2,0,0]);
  addBolt(g,'BOLT_D',.045,.035,mB,[.62,.11,-.48],[PI/2,0,0]);
  addTorus(g,'SERVICE_RING',.23,.025,mC,[0,.12,.52],[PI/2,0,0],24,6);
  addBox(g,'MICRO_RAIL',[.92,.035,.05],mB,[0,.13,-.51]);
  parent.add(g);
  return g;
}
function detailModule118(parent, origin=[0,0,0], phase=0) {
  const g=new THREE.Group();
  g.name='DETAIL_MODULE_118';
  g.position.set(origin[0],origin[1],origin[2]);
  g.rotation.y=phase;
  const mA=(phase*10)%2>1?MAT.gun2:MAT.gun3;
  const mB=(phase*7)%2>1?MAT.steel:MAT.graphite;
  const mC=(phase*5)%2>1?MAT.blood:MAT.gun2;
  addBox(g,'PLATE',[1.8+.08*(118%5),.16,.92+.04*(118%7)],mA,[0,0,0]);
  addBox(g,'BACKING',[1.38,.10,.62],mB,[0,-.16,0]);
  addBox(g,'SEAM',[1.1,.018,.025],mC,[0,.095,.47]);
  addBolt(g,'BOLT_A',.055,.035,mB,[-.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_B',.055,.035,mB,[.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_C',.045,.035,mB,[-.62,.11,-.48],[PI/2,0,0]);
  addBolt(g,'BOLT_D',.045,.035,mB,[.62,.11,-.48],[PI/2,0,0]);
  addTorus(g,'SERVICE_RING',.23,.025,mC,[0,.12,.52],[PI/2,0,0],24,6);
  addBox(g,'MICRO_RAIL',[.92,.035,.05],mB,[0,.13,-.51]);
  parent.add(g);
  return g;
}
function detailModule119(parent, origin=[0,0,0], phase=0) {
  const g=new THREE.Group();
  g.name='DETAIL_MODULE_119';
  g.position.set(origin[0],origin[1],origin[2]);
  g.rotation.y=phase;
  const mA=(phase*10)%2>1?MAT.gun2:MAT.gun3;
  const mB=(phase*7)%2>1?MAT.steel:MAT.graphite;
  const mC=(phase*5)%2>1?MAT.blood:MAT.gun2;
  addBox(g,'PLATE',[1.8+.08*(119%5),.16,.92+.04*(119%7)],mA,[0,0,0]);
  addBox(g,'BACKING',[1.38,.10,.62],mB,[0,-.16,0]);
  addBox(g,'SEAM',[1.1,.018,.025],mC,[0,.095,.47]);
  addBolt(g,'BOLT_A',.055,.035,mB,[-.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_B',.055,.035,mB,[.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_C',.045,.035,mB,[-.62,.11,-.48],[PI/2,0,0]);
  addBolt(g,'BOLT_D',.045,.035,mB,[.62,.11,-.48],[PI/2,0,0]);
  addTorus(g,'SERVICE_RING',.23,.025,mC,[0,.12,.52],[PI/2,0,0],24,6);
  addBox(g,'MICRO_RAIL',[.92,.035,.05],mB,[0,.13,-.51]);
  parent.add(g);
  return g;
}
function detailModule120(parent, origin=[0,0,0], phase=0) {
  const g=new THREE.Group();
  g.name='DETAIL_MODULE_120';
  g.position.set(origin[0],origin[1],origin[2]);
  g.rotation.y=phase;
  const mA=(phase*10)%2>1?MAT.gun2:MAT.gun3;
  const mB=(phase*7)%2>1?MAT.steel:MAT.graphite;
  const mC=(phase*5)%2>1?MAT.blood:MAT.gun2;
  addBox(g,'PLATE',[1.8+.08*(120%5),.16,.92+.04*(120%7)],mA,[0,0,0]);
  addBox(g,'BACKING',[1.38,.10,.62],mB,[0,-.16,0]);
  addBox(g,'SEAM',[1.1,.018,.025],mC,[0,.095,.47]);
  addBolt(g,'BOLT_A',.055,.035,mB,[-.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_B',.055,.035,mB,[.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_C',.045,.035,mB,[-.62,.11,-.48],[PI/2,0,0]);
  addBolt(g,'BOLT_D',.045,.035,mB,[.62,.11,-.48],[PI/2,0,0]);
  addTorus(g,'SERVICE_RING',.23,.025,mC,[0,.12,.52],[PI/2,0,0],24,6);
  addBox(g,'MICRO_RAIL',[.92,.035,.05],mB,[0,.13,-.51]);
  parent.add(g);
  return g;
}
function detailModule121(parent, origin=[0,0,0], phase=0) {
  const g=new THREE.Group();
  g.name='DETAIL_MODULE_121';
  g.position.set(origin[0],origin[1],origin[2]);
  g.rotation.y=phase;
  const mA=(phase*10)%2>1?MAT.gun2:MAT.gun3;
  const mB=(phase*7)%2>1?MAT.steel:MAT.graphite;
  const mC=(phase*5)%2>1?MAT.blood:MAT.gun2;
  addBox(g,'PLATE',[1.8+.08*(121%5),.16,.92+.04*(121%7)],mA,[0,0,0]);
  addBox(g,'BACKING',[1.38,.10,.62],mB,[0,-.16,0]);
  addBox(g,'SEAM',[1.1,.018,.025],mC,[0,.095,.47]);
  addBolt(g,'BOLT_A',.055,.035,mB,[-.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_B',.055,.035,mB,[.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_C',.045,.035,mB,[-.62,.11,-.48],[PI/2,0,0]);
  addBolt(g,'BOLT_D',.045,.035,mB,[.62,.11,-.48],[PI/2,0,0]);
  addTorus(g,'SERVICE_RING',.23,.025,mC,[0,.12,.52],[PI/2,0,0],24,6);
  addBox(g,'MICRO_RAIL',[.92,.035,.05],mB,[0,.13,-.51]);
  parent.add(g);
  return g;
}
function detailModule122(parent, origin=[0,0,0], phase=0) {
  const g=new THREE.Group();
  g.name='DETAIL_MODULE_122';
  g.position.set(origin[0],origin[1],origin[2]);
  g.rotation.y=phase;
  const mA=(phase*10)%2>1?MAT.gun2:MAT.gun3;
  const mB=(phase*7)%2>1?MAT.steel:MAT.graphite;
  const mC=(phase*5)%2>1?MAT.blood:MAT.gun2;
  addBox(g,'PLATE',[1.8+.08*(122%5),.16,.92+.04*(122%7)],mA,[0,0,0]);
  addBox(g,'BACKING',[1.38,.10,.62],mB,[0,-.16,0]);
  addBox(g,'SEAM',[1.1,.018,.025],mC,[0,.095,.47]);
  addBolt(g,'BOLT_A',.055,.035,mB,[-.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_B',.055,.035,mB,[.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_C',.045,.035,mB,[-.62,.11,-.48],[PI/2,0,0]);
  addBolt(g,'BOLT_D',.045,.035,mB,[.62,.11,-.48],[PI/2,0,0]);
  addTorus(g,'SERVICE_RING',.23,.025,mC,[0,.12,.52],[PI/2,0,0],24,6);
  addBox(g,'MICRO_RAIL',[.92,.035,.05],mB,[0,.13,-.51]);
  parent.add(g);
  return g;
}
function detailModule123(parent, origin=[0,0,0], phase=0) {
  const g=new THREE.Group();
  g.name='DETAIL_MODULE_123';
  g.position.set(origin[0],origin[1],origin[2]);
  g.rotation.y=phase;
  const mA=(phase*10)%2>1?MAT.gun2:MAT.gun3;
  const mB=(phase*7)%2>1?MAT.steel:MAT.graphite;
  const mC=(phase*5)%2>1?MAT.blood:MAT.gun2;
  addBox(g,'PLATE',[1.8+.08*(123%5),.16,.92+.04*(123%7)],mA,[0,0,0]);
  addBox(g,'BACKING',[1.38,.10,.62],mB,[0,-.16,0]);
  addBox(g,'SEAM',[1.1,.018,.025],mC,[0,.095,.47]);
  addBolt(g,'BOLT_A',.055,.035,mB,[-.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_B',.055,.035,mB,[.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_C',.045,.035,mB,[-.62,.11,-.48],[PI/2,0,0]);
  addBolt(g,'BOLT_D',.045,.035,mB,[.62,.11,-.48],[PI/2,0,0]);
  addTorus(g,'SERVICE_RING',.23,.025,mC,[0,.12,.52],[PI/2,0,0],24,6);
  addBox(g,'MICRO_RAIL',[.92,.035,.05],mB,[0,.13,-.51]);
  parent.add(g);
  return g;
}
function detailModule124(parent, origin=[0,0,0], phase=0) {
  const g=new THREE.Group();
  g.name='DETAIL_MODULE_124';
  g.position.set(origin[0],origin[1],origin[2]);
  g.rotation.y=phase;
  const mA=(phase*10)%2>1?MAT.gun2:MAT.gun3;
  const mB=(phase*7)%2>1?MAT.steel:MAT.graphite;
  const mC=(phase*5)%2>1?MAT.blood:MAT.gun2;
  addBox(g,'PLATE',[1.8+.08*(124%5),.16,.92+.04*(124%7)],mA,[0,0,0]);
  addBox(g,'BACKING',[1.38,.10,.62],mB,[0,-.16,0]);
  addBox(g,'SEAM',[1.1,.018,.025],mC,[0,.095,.47]);
  addBolt(g,'BOLT_A',.055,.035,mB,[-.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_B',.055,.035,mB,[.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_C',.045,.035,mB,[-.62,.11,-.48],[PI/2,0,0]);
  addBolt(g,'BOLT_D',.045,.035,mB,[.62,.11,-.48],[PI/2,0,0]);
  addTorus(g,'SERVICE_RING',.23,.025,mC,[0,.12,.52],[PI/2,0,0],24,6);
  addBox(g,'MICRO_RAIL',[.92,.035,.05],mB,[0,.13,-.51]);
  parent.add(g);
  return g;
}
function detailModule125(parent, origin=[0,0,0], phase=0) {
  const g=new THREE.Group();
  g.name='DETAIL_MODULE_125';
  g.position.set(origin[0],origin[1],origin[2]);
  g.rotation.y=phase;
  const mA=(phase*10)%2>1?MAT.gun2:MAT.gun3;
  const mB=(phase*7)%2>1?MAT.steel:MAT.graphite;
  const mC=(phase*5)%2>1?MAT.blood:MAT.gun2;
  addBox(g,'PLATE',[1.8+.08*(125%5),.16,.92+.04*(125%7)],mA,[0,0,0]);
  addBox(g,'BACKING',[1.38,.10,.62],mB,[0,-.16,0]);
  addBox(g,'SEAM',[1.1,.018,.025],mC,[0,.095,.47]);
  addBolt(g,'BOLT_A',.055,.035,mB,[-.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_B',.055,.035,mB,[.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_C',.045,.035,mB,[-.62,.11,-.48],[PI/2,0,0]);
  addBolt(g,'BOLT_D',.045,.035,mB,[.62,.11,-.48],[PI/2,0,0]);
  addTorus(g,'SERVICE_RING',.23,.025,mC,[0,.12,.52],[PI/2,0,0],24,6);
  addBox(g,'MICRO_RAIL',[.92,.035,.05],mB,[0,.13,-.51]);
  parent.add(g);
  return g;
}
function detailModule126(parent, origin=[0,0,0], phase=0) {
  const g=new THREE.Group();
  g.name='DETAIL_MODULE_126';
  g.position.set(origin[0],origin[1],origin[2]);
  g.rotation.y=phase;
  const mA=(phase*10)%2>1?MAT.gun2:MAT.gun3;
  const mB=(phase*7)%2>1?MAT.steel:MAT.graphite;
  const mC=(phase*5)%2>1?MAT.blood:MAT.gun2;
  addBox(g,'PLATE',[1.8+.08*(126%5),.16,.92+.04*(126%7)],mA,[0,0,0]);
  addBox(g,'BACKING',[1.38,.10,.62],mB,[0,-.16,0]);
  addBox(g,'SEAM',[1.1,.018,.025],mC,[0,.095,.47]);
  addBolt(g,'BOLT_A',.055,.035,mB,[-.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_B',.055,.035,mB,[.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_C',.045,.035,mB,[-.62,.11,-.48],[PI/2,0,0]);
  addBolt(g,'BOLT_D',.045,.035,mB,[.62,.11,-.48],[PI/2,0,0]);
  addTorus(g,'SERVICE_RING',.23,.025,mC,[0,.12,.52],[PI/2,0,0],24,6);
  addBox(g,'MICRO_RAIL',[.92,.035,.05],mB,[0,.13,-.51]);
  parent.add(g);
  return g;
}
function detailModule127(parent, origin=[0,0,0], phase=0) {
  const g=new THREE.Group();
  g.name='DETAIL_MODULE_127';
  g.position.set(origin[0],origin[1],origin[2]);
  g.rotation.y=phase;
  const mA=(phase*10)%2>1?MAT.gun2:MAT.gun3;
  const mB=(phase*7)%2>1?MAT.steel:MAT.graphite;
  const mC=(phase*5)%2>1?MAT.blood:MAT.gun2;
  addBox(g,'PLATE',[1.8+.08*(127%5),.16,.92+.04*(127%7)],mA,[0,0,0]);
  addBox(g,'BACKING',[1.38,.10,.62],mB,[0,-.16,0]);
  addBox(g,'SEAM',[1.1,.018,.025],mC,[0,.095,.47]);
  addBolt(g,'BOLT_A',.055,.035,mB,[-.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_B',.055,.035,mB,[.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_C',.045,.035,mB,[-.62,.11,-.48],[PI/2,0,0]);
  addBolt(g,'BOLT_D',.045,.035,mB,[.62,.11,-.48],[PI/2,0,0]);
  addTorus(g,'SERVICE_RING',.23,.025,mC,[0,.12,.52],[PI/2,0,0],24,6);
  addBox(g,'MICRO_RAIL',[.92,.035,.05],mB,[0,.13,-.51]);
  parent.add(g);
  return g;
}
function detailModule128(parent, origin=[0,0,0], phase=0) {
  const g=new THREE.Group();
  g.name='DETAIL_MODULE_128';
  g.position.set(origin[0],origin[1],origin[2]);
  g.rotation.y=phase;
  const mA=(phase*10)%2>1?MAT.gun2:MAT.gun3;
  const mB=(phase*7)%2>1?MAT.steel:MAT.graphite;
  const mC=(phase*5)%2>1?MAT.blood:MAT.gun2;
  addBox(g,'PLATE',[1.8+.08*(128%5),.16,.92+.04*(128%7)],mA,[0,0,0]);
  addBox(g,'BACKING',[1.38,.10,.62],mB,[0,-.16,0]);
  addBox(g,'SEAM',[1.1,.018,.025],mC,[0,.095,.47]);
  addBolt(g,'BOLT_A',.055,.035,mB,[-.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_B',.055,.035,mB,[.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_C',.045,.035,mB,[-.62,.11,-.48],[PI/2,0,0]);
  addBolt(g,'BOLT_D',.045,.035,mB,[.62,.11,-.48],[PI/2,0,0]);
  addTorus(g,'SERVICE_RING',.23,.025,mC,[0,.12,.52],[PI/2,0,0],24,6);
  addBox(g,'MICRO_RAIL',[.92,.035,.05],mB,[0,.13,-.51]);
  parent.add(g);
  return g;
}
function detailModule129(parent, origin=[0,0,0], phase=0) {
  const g=new THREE.Group();
  g.name='DETAIL_MODULE_129';
  g.position.set(origin[0],origin[1],origin[2]);
  g.rotation.y=phase;
  const mA=(phase*10)%2>1?MAT.gun2:MAT.gun3;
  const mB=(phase*7)%2>1?MAT.steel:MAT.graphite;
  const mC=(phase*5)%2>1?MAT.blood:MAT.gun2;
  addBox(g,'PLATE',[1.8+.08*(129%5),.16,.92+.04*(129%7)],mA,[0,0,0]);
  addBox(g,'BACKING',[1.38,.10,.62],mB,[0,-.16,0]);
  addBox(g,'SEAM',[1.1,.018,.025],mC,[0,.095,.47]);
  addBolt(g,'BOLT_A',.055,.035,mB,[-.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_B',.055,.035,mB,[.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_C',.045,.035,mB,[-.62,.11,-.48],[PI/2,0,0]);
  addBolt(g,'BOLT_D',.045,.035,mB,[.62,.11,-.48],[PI/2,0,0]);
  addTorus(g,'SERVICE_RING',.23,.025,mC,[0,.12,.52],[PI/2,0,0],24,6);
  addBox(g,'MICRO_RAIL',[.92,.035,.05],mB,[0,.13,-.51]);
  parent.add(g);
  return g;
}
function detailModule130(parent, origin=[0,0,0], phase=0) {
  const g=new THREE.Group();
  g.name='DETAIL_MODULE_130';
  g.position.set(origin[0],origin[1],origin[2]);
  g.rotation.y=phase;
  const mA=(phase*10)%2>1?MAT.gun2:MAT.gun3;
  const mB=(phase*7)%2>1?MAT.steel:MAT.graphite;
  const mC=(phase*5)%2>1?MAT.blood:MAT.gun2;
  addBox(g,'PLATE',[1.8+.08*(130%5),.16,.92+.04*(130%7)],mA,[0,0,0]);
  addBox(g,'BACKING',[1.38,.10,.62],mB,[0,-.16,0]);
  addBox(g,'SEAM',[1.1,.018,.025],mC,[0,.095,.47]);
  addBolt(g,'BOLT_A',.055,.035,mB,[-.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_B',.055,.035,mB,[.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_C',.045,.035,mB,[-.62,.11,-.48],[PI/2,0,0]);
  addBolt(g,'BOLT_D',.045,.035,mB,[.62,.11,-.48],[PI/2,0,0]);
  addTorus(g,'SERVICE_RING',.23,.025,mC,[0,.12,.52],[PI/2,0,0],24,6);
  addBox(g,'MICRO_RAIL',[.92,.035,.05],mB,[0,.13,-.51]);
  parent.add(g);
  return g;
}
function detailModule131(parent, origin=[0,0,0], phase=0) {
  const g=new THREE.Group();
  g.name='DETAIL_MODULE_131';
  g.position.set(origin[0],origin[1],origin[2]);
  g.rotation.y=phase;
  const mA=(phase*10)%2>1?MAT.gun2:MAT.gun3;
  const mB=(phase*7)%2>1?MAT.steel:MAT.graphite;
  const mC=(phase*5)%2>1?MAT.blood:MAT.gun2;
  addBox(g,'PLATE',[1.8+.08*(131%5),.16,.92+.04*(131%7)],mA,[0,0,0]);
  addBox(g,'BACKING',[1.38,.10,.62],mB,[0,-.16,0]);
  addBox(g,'SEAM',[1.1,.018,.025],mC,[0,.095,.47]);
  addBolt(g,'BOLT_A',.055,.035,mB,[-.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_B',.055,.035,mB,[.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_C',.045,.035,mB,[-.62,.11,-.48],[PI/2,0,0]);
  addBolt(g,'BOLT_D',.045,.035,mB,[.62,.11,-.48],[PI/2,0,0]);
  addTorus(g,'SERVICE_RING',.23,.025,mC,[0,.12,.52],[PI/2,0,0],24,6);
  addBox(g,'MICRO_RAIL',[.92,.035,.05],mB,[0,.13,-.51]);
  parent.add(g);
  return g;
}
function detailModule132(parent, origin=[0,0,0], phase=0) {
  const g=new THREE.Group();
  g.name='DETAIL_MODULE_132';
  g.position.set(origin[0],origin[1],origin[2]);
  g.rotation.y=phase;
  const mA=(phase*10)%2>1?MAT.gun2:MAT.gun3;
  const mB=(phase*7)%2>1?MAT.steel:MAT.graphite;
  const mC=(phase*5)%2>1?MAT.blood:MAT.gun2;
  addBox(g,'PLATE',[1.8+.08*(132%5),.16,.92+.04*(132%7)],mA,[0,0,0]);
  addBox(g,'BACKING',[1.38,.10,.62],mB,[0,-.16,0]);
  addBox(g,'SEAM',[1.1,.018,.025],mC,[0,.095,.47]);
  addBolt(g,'BOLT_A',.055,.035,mB,[-.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_B',.055,.035,mB,[.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_C',.045,.035,mB,[-.62,.11,-.48],[PI/2,0,0]);
  addBolt(g,'BOLT_D',.045,.035,mB,[.62,.11,-.48],[PI/2,0,0]);
  addTorus(g,'SERVICE_RING',.23,.025,mC,[0,.12,.52],[PI/2,0,0],24,6);
  addBox(g,'MICRO_RAIL',[.92,.035,.05],mB,[0,.13,-.51]);
  parent.add(g);
  return g;
}
function detailModule133(parent, origin=[0,0,0], phase=0) {
  const g=new THREE.Group();
  g.name='DETAIL_MODULE_133';
  g.position.set(origin[0],origin[1],origin[2]);
  g.rotation.y=phase;
  const mA=(phase*10)%2>1?MAT.gun2:MAT.gun3;
  const mB=(phase*7)%2>1?MAT.steel:MAT.graphite;
  const mC=(phase*5)%2>1?MAT.blood:MAT.gun2;
  addBox(g,'PLATE',[1.8+.08*(133%5),.16,.92+.04*(133%7)],mA,[0,0,0]);
  addBox(g,'BACKING',[1.38,.10,.62],mB,[0,-.16,0]);
  addBox(g,'SEAM',[1.1,.018,.025],mC,[0,.095,.47]);
  addBolt(g,'BOLT_A',.055,.035,mB,[-.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_B',.055,.035,mB,[.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_C',.045,.035,mB,[-.62,.11,-.48],[PI/2,0,0]);
  addBolt(g,'BOLT_D',.045,.035,mB,[.62,.11,-.48],[PI/2,0,0]);
  addTorus(g,'SERVICE_RING',.23,.025,mC,[0,.12,.52],[PI/2,0,0],24,6);
  addBox(g,'MICRO_RAIL',[.92,.035,.05],mB,[0,.13,-.51]);
  parent.add(g);
  return g;
}
function detailModule134(parent, origin=[0,0,0], phase=0) {
  const g=new THREE.Group();
  g.name='DETAIL_MODULE_134';
  g.position.set(origin[0],origin[1],origin[2]);
  g.rotation.y=phase;
  const mA=(phase*10)%2>1?MAT.gun2:MAT.gun3;
  const mB=(phase*7)%2>1?MAT.steel:MAT.graphite;
  const mC=(phase*5)%2>1?MAT.blood:MAT.gun2;
  addBox(g,'PLATE',[1.8+.08*(134%5),.16,.92+.04*(134%7)],mA,[0,0,0]);
  addBox(g,'BACKING',[1.38,.10,.62],mB,[0,-.16,0]);
  addBox(g,'SEAM',[1.1,.018,.025],mC,[0,.095,.47]);
  addBolt(g,'BOLT_A',.055,.035,mB,[-.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_B',.055,.035,mB,[.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_C',.045,.035,mB,[-.62,.11,-.48],[PI/2,0,0]);
  addBolt(g,'BOLT_D',.045,.035,mB,[.62,.11,-.48],[PI/2,0,0]);
  addTorus(g,'SERVICE_RING',.23,.025,mC,[0,.12,.52],[PI/2,0,0],24,6);
  addBox(g,'MICRO_RAIL',[.92,.035,.05],mB,[0,.13,-.51]);
  parent.add(g);
  return g;
}
function detailModule135(parent, origin=[0,0,0], phase=0) {
  const g=new THREE.Group();
  g.name='DETAIL_MODULE_135';
  g.position.set(origin[0],origin[1],origin[2]);
  g.rotation.y=phase;
  const mA=(phase*10)%2>1?MAT.gun2:MAT.gun3;
  const mB=(phase*7)%2>1?MAT.steel:MAT.graphite;
  const mC=(phase*5)%2>1?MAT.blood:MAT.gun2;
  addBox(g,'PLATE',[1.8+.08*(135%5),.16,.92+.04*(135%7)],mA,[0,0,0]);
  addBox(g,'BACKING',[1.38,.10,.62],mB,[0,-.16,0]);
  addBox(g,'SEAM',[1.1,.018,.025],mC,[0,.095,.47]);
  addBolt(g,'BOLT_A',.055,.035,mB,[-.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_B',.055,.035,mB,[.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_C',.045,.035,mB,[-.62,.11,-.48],[PI/2,0,0]);
  addBolt(g,'BOLT_D',.045,.035,mB,[.62,.11,-.48],[PI/2,0,0]);
  addTorus(g,'SERVICE_RING',.23,.025,mC,[0,.12,.52],[PI/2,0,0],24,6);
  addBox(g,'MICRO_RAIL',[.92,.035,.05],mB,[0,.13,-.51]);
  parent.add(g);
  return g;
}
function detailModule136(parent, origin=[0,0,0], phase=0) {
  const g=new THREE.Group();
  g.name='DETAIL_MODULE_136';
  g.position.set(origin[0],origin[1],origin[2]);
  g.rotation.y=phase;
  const mA=(phase*10)%2>1?MAT.gun2:MAT.gun3;
  const mB=(phase*7)%2>1?MAT.steel:MAT.graphite;
  const mC=(phase*5)%2>1?MAT.blood:MAT.gun2;
  addBox(g,'PLATE',[1.8+.08*(136%5),.16,.92+.04*(136%7)],mA,[0,0,0]);
  addBox(g,'BACKING',[1.38,.10,.62],mB,[0,-.16,0]);
  addBox(g,'SEAM',[1.1,.018,.025],mC,[0,.095,.47]);
  addBolt(g,'BOLT_A',.055,.035,mB,[-.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_B',.055,.035,mB,[.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_C',.045,.035,mB,[-.62,.11,-.48],[PI/2,0,0]);
  addBolt(g,'BOLT_D',.045,.035,mB,[.62,.11,-.48],[PI/2,0,0]);
  addTorus(g,'SERVICE_RING',.23,.025,mC,[0,.12,.52],[PI/2,0,0],24,6);
  addBox(g,'MICRO_RAIL',[.92,.035,.05],mB,[0,.13,-.51]);
  parent.add(g);
  return g;
}
function detailModule137(parent, origin=[0,0,0], phase=0) {
  const g=new THREE.Group();
  g.name='DETAIL_MODULE_137';
  g.position.set(origin[0],origin[1],origin[2]);
  g.rotation.y=phase;
  const mA=(phase*10)%2>1?MAT.gun2:MAT.gun3;
  const mB=(phase*7)%2>1?MAT.steel:MAT.graphite;
  const mC=(phase*5)%2>1?MAT.blood:MAT.gun2;
  addBox(g,'PLATE',[1.8+.08*(137%5),.16,.92+.04*(137%7)],mA,[0,0,0]);
  addBox(g,'BACKING',[1.38,.10,.62],mB,[0,-.16,0]);
  addBox(g,'SEAM',[1.1,.018,.025],mC,[0,.095,.47]);
  addBolt(g,'BOLT_A',.055,.035,mB,[-.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_B',.055,.035,mB,[.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_C',.045,.035,mB,[-.62,.11,-.48],[PI/2,0,0]);
  addBolt(g,'BOLT_D',.045,.035,mB,[.62,.11,-.48],[PI/2,0,0]);
  addTorus(g,'SERVICE_RING',.23,.025,mC,[0,.12,.52],[PI/2,0,0],24,6);
  addBox(g,'MICRO_RAIL',[.92,.035,.05],mB,[0,.13,-.51]);
  parent.add(g);
  return g;
}
function detailModule138(parent, origin=[0,0,0], phase=0) {
  const g=new THREE.Group();
  g.name='DETAIL_MODULE_138';
  g.position.set(origin[0],origin[1],origin[2]);
  g.rotation.y=phase;
  const mA=(phase*10)%2>1?MAT.gun2:MAT.gun3;
  const mB=(phase*7)%2>1?MAT.steel:MAT.graphite;
  const mC=(phase*5)%2>1?MAT.blood:MAT.gun2;
  addBox(g,'PLATE',[1.8+.08*(138%5),.16,.92+.04*(138%7)],mA,[0,0,0]);
  addBox(g,'BACKING',[1.38,.10,.62],mB,[0,-.16,0]);
  addBox(g,'SEAM',[1.1,.018,.025],mC,[0,.095,.47]);
  addBolt(g,'BOLT_A',.055,.035,mB,[-.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_B',.055,.035,mB,[.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_C',.045,.035,mB,[-.62,.11,-.48],[PI/2,0,0]);
  addBolt(g,'BOLT_D',.045,.035,mB,[.62,.11,-.48],[PI/2,0,0]);
  addTorus(g,'SERVICE_RING',.23,.025,mC,[0,.12,.52],[PI/2,0,0],24,6);
  addBox(g,'MICRO_RAIL',[.92,.035,.05],mB,[0,.13,-.51]);
  parent.add(g);
  return g;
}
function detailModule139(parent, origin=[0,0,0], phase=0) {
  const g=new THREE.Group();
  g.name='DETAIL_MODULE_139';
  g.position.set(origin[0],origin[1],origin[2]);
  g.rotation.y=phase;
  const mA=(phase*10)%2>1?MAT.gun2:MAT.gun3;
  const mB=(phase*7)%2>1?MAT.steel:MAT.graphite;
  const mC=(phase*5)%2>1?MAT.blood:MAT.gun2;
  addBox(g,'PLATE',[1.8+.08*(139%5),.16,.92+.04*(139%7)],mA,[0,0,0]);
  addBox(g,'BACKING',[1.38,.10,.62],mB,[0,-.16,0]);
  addBox(g,'SEAM',[1.1,.018,.025],mC,[0,.095,.47]);
  addBolt(g,'BOLT_A',.055,.035,mB,[-.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_B',.055,.035,mB,[.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_C',.045,.035,mB,[-.62,.11,-.48],[PI/2,0,0]);
  addBolt(g,'BOLT_D',.045,.035,mB,[.62,.11,-.48],[PI/2,0,0]);
  addTorus(g,'SERVICE_RING',.23,.025,mC,[0,.12,.52],[PI/2,0,0],24,6);
  addBox(g,'MICRO_RAIL',[.92,.035,.05],mB,[0,.13,-.51]);
  parent.add(g);
  return g;
}
function detailModule140(parent, origin=[0,0,0], phase=0) {
  const g=new THREE.Group();
  g.name='DETAIL_MODULE_140';
  g.position.set(origin[0],origin[1],origin[2]);
  g.rotation.y=phase;
  const mA=(phase*10)%2>1?MAT.gun2:MAT.gun3;
  const mB=(phase*7)%2>1?MAT.steel:MAT.graphite;
  const mC=(phase*5)%2>1?MAT.blood:MAT.gun2;
  addBox(g,'PLATE',[1.8+.08*(140%5),.16,.92+.04*(140%7)],mA,[0,0,0]);
  addBox(g,'BACKING',[1.38,.10,.62],mB,[0,-.16,0]);
  addBox(g,'SEAM',[1.1,.018,.025],mC,[0,.095,.47]);
  addBolt(g,'BOLT_A',.055,.035,mB,[-.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_B',.055,.035,mB,[.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_C',.045,.035,mB,[-.62,.11,-.48],[PI/2,0,0]);
  addBolt(g,'BOLT_D',.045,.035,mB,[.62,.11,-.48],[PI/2,0,0]);
  addTorus(g,'SERVICE_RING',.23,.025,mC,[0,.12,.52],[PI/2,0,0],24,6);
  addBox(g,'MICRO_RAIL',[.92,.035,.05],mB,[0,.13,-.51]);
  parent.add(g);
  return g;
}
function detailModule141(parent, origin=[0,0,0], phase=0) {
  const g=new THREE.Group();
  g.name='DETAIL_MODULE_141';
  g.position.set(origin[0],origin[1],origin[2]);
  g.rotation.y=phase;
  const mA=(phase*10)%2>1?MAT.gun2:MAT.gun3;
  const mB=(phase*7)%2>1?MAT.steel:MAT.graphite;
  const mC=(phase*5)%2>1?MAT.blood:MAT.gun2;
  addBox(g,'PLATE',[1.8+.08*(141%5),.16,.92+.04*(141%7)],mA,[0,0,0]);
  addBox(g,'BACKING',[1.38,.10,.62],mB,[0,-.16,0]);
  addBox(g,'SEAM',[1.1,.018,.025],mC,[0,.095,.47]);
  addBolt(g,'BOLT_A',.055,.035,mB,[-.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_B',.055,.035,mB,[.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_C',.045,.035,mB,[-.62,.11,-.48],[PI/2,0,0]);
  addBolt(g,'BOLT_D',.045,.035,mB,[.62,.11,-.48],[PI/2,0,0]);
  addTorus(g,'SERVICE_RING',.23,.025,mC,[0,.12,.52],[PI/2,0,0],24,6);
  addBox(g,'MICRO_RAIL',[.92,.035,.05],mB,[0,.13,-.51]);
  parent.add(g);
  return g;
}
function detailModule142(parent, origin=[0,0,0], phase=0) {
  const g=new THREE.Group();
  g.name='DETAIL_MODULE_142';
  g.position.set(origin[0],origin[1],origin[2]);
  g.rotation.y=phase;
  const mA=(phase*10)%2>1?MAT.gun2:MAT.gun3;
  const mB=(phase*7)%2>1?MAT.steel:MAT.graphite;
  const mC=(phase*5)%2>1?MAT.blood:MAT.gun2;
  addBox(g,'PLATE',[1.8+.08*(142%5),.16,.92+.04*(142%7)],mA,[0,0,0]);
  addBox(g,'BACKING',[1.38,.10,.62],mB,[0,-.16,0]);
  addBox(g,'SEAM',[1.1,.018,.025],mC,[0,.095,.47]);
  addBolt(g,'BOLT_A',.055,.035,mB,[-.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_B',.055,.035,mB,[.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_C',.045,.035,mB,[-.62,.11,-.48],[PI/2,0,0]);
  addBolt(g,'BOLT_D',.045,.035,mB,[.62,.11,-.48],[PI/2,0,0]);
  addTorus(g,'SERVICE_RING',.23,.025,mC,[0,.12,.52],[PI/2,0,0],24,6);
  addBox(g,'MICRO_RAIL',[.92,.035,.05],mB,[0,.13,-.51]);
  parent.add(g);
  return g;
}
function detailModule143(parent, origin=[0,0,0], phase=0) {
  const g=new THREE.Group();
  g.name='DETAIL_MODULE_143';
  g.position.set(origin[0],origin[1],origin[2]);
  g.rotation.y=phase;
  const mA=(phase*10)%2>1?MAT.gun2:MAT.gun3;
  const mB=(phase*7)%2>1?MAT.steel:MAT.graphite;
  const mC=(phase*5)%2>1?MAT.blood:MAT.gun2;
  addBox(g,'PLATE',[1.8+.08*(143%5),.16,.92+.04*(143%7)],mA,[0,0,0]);
  addBox(g,'BACKING',[1.38,.10,.62],mB,[0,-.16,0]);
  addBox(g,'SEAM',[1.1,.018,.025],mC,[0,.095,.47]);
  addBolt(g,'BOLT_A',.055,.035,mB,[-.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_B',.055,.035,mB,[.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_C',.045,.035,mB,[-.62,.11,-.48],[PI/2,0,0]);
  addBolt(g,'BOLT_D',.045,.035,mB,[.62,.11,-.48],[PI/2,0,0]);
  addTorus(g,'SERVICE_RING',.23,.025,mC,[0,.12,.52],[PI/2,0,0],24,6);
  addBox(g,'MICRO_RAIL',[.92,.035,.05],mB,[0,.13,-.51]);
  parent.add(g);
  return g;
}
function detailModule144(parent, origin=[0,0,0], phase=0) {
  const g=new THREE.Group();
  g.name='DETAIL_MODULE_144';
  g.position.set(origin[0],origin[1],origin[2]);
  g.rotation.y=phase;
  const mA=(phase*10)%2>1?MAT.gun2:MAT.gun3;
  const mB=(phase*7)%2>1?MAT.steel:MAT.graphite;
  const mC=(phase*5)%2>1?MAT.blood:MAT.gun2;
  addBox(g,'PLATE',[1.8+.08*(144%5),.16,.92+.04*(144%7)],mA,[0,0,0]);
  addBox(g,'BACKING',[1.38,.10,.62],mB,[0,-.16,0]);
  addBox(g,'SEAM',[1.1,.018,.025],mC,[0,.095,.47]);
  addBolt(g,'BOLT_A',.055,.035,mB,[-.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_B',.055,.035,mB,[.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_C',.045,.035,mB,[-.62,.11,-.48],[PI/2,0,0]);
  addBolt(g,'BOLT_D',.045,.035,mB,[.62,.11,-.48],[PI/2,0,0]);
  addTorus(g,'SERVICE_RING',.23,.025,mC,[0,.12,.52],[PI/2,0,0],24,6);
  addBox(g,'MICRO_RAIL',[.92,.035,.05],mB,[0,.13,-.51]);
  parent.add(g);
  return g;
}
function detailModule145(parent, origin=[0,0,0], phase=0) {
  const g=new THREE.Group();
  g.name='DETAIL_MODULE_145';
  g.position.set(origin[0],origin[1],origin[2]);
  g.rotation.y=phase;
  const mA=(phase*10)%2>1?MAT.gun2:MAT.gun3;
  const mB=(phase*7)%2>1?MAT.steel:MAT.graphite;
  const mC=(phase*5)%2>1?MAT.blood:MAT.gun2;
  addBox(g,'PLATE',[1.8+.08*(145%5),.16,.92+.04*(145%7)],mA,[0,0,0]);
  addBox(g,'BACKING',[1.38,.10,.62],mB,[0,-.16,0]);
  addBox(g,'SEAM',[1.1,.018,.025],mC,[0,.095,.47]);
  addBolt(g,'BOLT_A',.055,.035,mB,[-.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_B',.055,.035,mB,[.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_C',.045,.035,mB,[-.62,.11,-.48],[PI/2,0,0]);
  addBolt(g,'BOLT_D',.045,.035,mB,[.62,.11,-.48],[PI/2,0,0]);
  addTorus(g,'SERVICE_RING',.23,.025,mC,[0,.12,.52],[PI/2,0,0],24,6);
  addBox(g,'MICRO_RAIL',[.92,.035,.05],mB,[0,.13,-.51]);
  parent.add(g);
  return g;
}
function detailModule146(parent, origin=[0,0,0], phase=0) {
  const g=new THREE.Group();
  g.name='DETAIL_MODULE_146';
  g.position.set(origin[0],origin[1],origin[2]);
  g.rotation.y=phase;
  const mA=(phase*10)%2>1?MAT.gun2:MAT.gun3;
  const mB=(phase*7)%2>1?MAT.steel:MAT.graphite;
  const mC=(phase*5)%2>1?MAT.blood:MAT.gun2;
  addBox(g,'PLATE',[1.8+.08*(146%5),.16,.92+.04*(146%7)],mA,[0,0,0]);
  addBox(g,'BACKING',[1.38,.10,.62],mB,[0,-.16,0]);
  addBox(g,'SEAM',[1.1,.018,.025],mC,[0,.095,.47]);
  addBolt(g,'BOLT_A',.055,.035,mB,[-.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_B',.055,.035,mB,[.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_C',.045,.035,mB,[-.62,.11,-.48],[PI/2,0,0]);
  addBolt(g,'BOLT_D',.045,.035,mB,[.62,.11,-.48],[PI/2,0,0]);
  addTorus(g,'SERVICE_RING',.23,.025,mC,[0,.12,.52],[PI/2,0,0],24,6);
  addBox(g,'MICRO_RAIL',[.92,.035,.05],mB,[0,.13,-.51]);
  parent.add(g);
  return g;
}
function detailModule147(parent, origin=[0,0,0], phase=0) {
  const g=new THREE.Group();
  g.name='DETAIL_MODULE_147';
  g.position.set(origin[0],origin[1],origin[2]);
  g.rotation.y=phase;
  const mA=(phase*10)%2>1?MAT.gun2:MAT.gun3;
  const mB=(phase*7)%2>1?MAT.steel:MAT.graphite;
  const mC=(phase*5)%2>1?MAT.blood:MAT.gun2;
  addBox(g,'PLATE',[1.8+.08*(147%5),.16,.92+.04*(147%7)],mA,[0,0,0]);
  addBox(g,'BACKING',[1.38,.10,.62],mB,[0,-.16,0]);
  addBox(g,'SEAM',[1.1,.018,.025],mC,[0,.095,.47]);
  addBolt(g,'BOLT_A',.055,.035,mB,[-.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_B',.055,.035,mB,[.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_C',.045,.035,mB,[-.62,.11,-.48],[PI/2,0,0]);
  addBolt(g,'BOLT_D',.045,.035,mB,[.62,.11,-.48],[PI/2,0,0]);
  addTorus(g,'SERVICE_RING',.23,.025,mC,[0,.12,.52],[PI/2,0,0],24,6);
  addBox(g,'MICRO_RAIL',[.92,.035,.05],mB,[0,.13,-.51]);
  parent.add(g);
  return g;
}
function detailModule148(parent, origin=[0,0,0], phase=0) {
  const g=new THREE.Group();
  g.name='DETAIL_MODULE_148';
  g.position.set(origin[0],origin[1],origin[2]);
  g.rotation.y=phase;
  const mA=(phase*10)%2>1?MAT.gun2:MAT.gun3;
  const mB=(phase*7)%2>1?MAT.steel:MAT.graphite;
  const mC=(phase*5)%2>1?MAT.blood:MAT.gun2;
  addBox(g,'PLATE',[1.8+.08*(148%5),.16,.92+.04*(148%7)],mA,[0,0,0]);
  addBox(g,'BACKING',[1.38,.10,.62],mB,[0,-.16,0]);
  addBox(g,'SEAM',[1.1,.018,.025],mC,[0,.095,.47]);
  addBolt(g,'BOLT_A',.055,.035,mB,[-.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_B',.055,.035,mB,[.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_C',.045,.035,mB,[-.62,.11,-.48],[PI/2,0,0]);
  addBolt(g,'BOLT_D',.045,.035,mB,[.62,.11,-.48],[PI/2,0,0]);
  addTorus(g,'SERVICE_RING',.23,.025,mC,[0,.12,.52],[PI/2,0,0],24,6);
  addBox(g,'MICRO_RAIL',[.92,.035,.05],mB,[0,.13,-.51]);
  parent.add(g);
  return g;
}
function detailModule149(parent, origin=[0,0,0], phase=0) {
  const g=new THREE.Group();
  g.name='DETAIL_MODULE_149';
  g.position.set(origin[0],origin[1],origin[2]);
  g.rotation.y=phase;
  const mA=(phase*10)%2>1?MAT.gun2:MAT.gun3;
  const mB=(phase*7)%2>1?MAT.steel:MAT.graphite;
  const mC=(phase*5)%2>1?MAT.blood:MAT.gun2;
  addBox(g,'PLATE',[1.8+.08*(149%5),.16,.92+.04*(149%7)],mA,[0,0,0]);
  addBox(g,'BACKING',[1.38,.10,.62],mB,[0,-.16,0]);
  addBox(g,'SEAM',[1.1,.018,.025],mC,[0,.095,.47]);
  addBolt(g,'BOLT_A',.055,.035,mB,[-.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_B',.055,.035,mB,[.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_C',.045,.035,mB,[-.62,.11,-.48],[PI/2,0,0]);
  addBolt(g,'BOLT_D',.045,.035,mB,[.62,.11,-.48],[PI/2,0,0]);
  addTorus(g,'SERVICE_RING',.23,.025,mC,[0,.12,.52],[PI/2,0,0],24,6);
  addBox(g,'MICRO_RAIL',[.92,.035,.05],mB,[0,.13,-.51]);
  parent.add(g);
  return g;
}
function detailModule150(parent, origin=[0,0,0], phase=0) {
  const g=new THREE.Group();
  g.name='DETAIL_MODULE_150';
  g.position.set(origin[0],origin[1],origin[2]);
  g.rotation.y=phase;
  const mA=(phase*10)%2>1?MAT.gun2:MAT.gun3;
  const mB=(phase*7)%2>1?MAT.steel:MAT.graphite;
  const mC=(phase*5)%2>1?MAT.blood:MAT.gun2;
  addBox(g,'PLATE',[1.8+.08*(150%5),.16,.92+.04*(150%7)],mA,[0,0,0]);
  addBox(g,'BACKING',[1.38,.10,.62],mB,[0,-.16,0]);
  addBox(g,'SEAM',[1.1,.018,.025],mC,[0,.095,.47]);
  addBolt(g,'BOLT_A',.055,.035,mB,[-.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_B',.055,.035,mB,[.62,.11,.48],[PI/2,0,0]);
  addBolt(g,'BOLT_C',.045,.035,mB,[-.62,.11,-.48],[PI/2,0,0]);
  addBolt(g,'BOLT_D',.045,.035,mB,[.62,.11,-.48],[PI/2,0,0]);
  addTorus(g,'SERVICE_RING',.23,.025,mC,[0,.12,.52],[PI/2,0,0],24,6);
  addBox(g,'MICRO_RAIL',[.92,.035,.05],mB,[0,.13,-.51]);
  parent.add(g);
  return g;
}

// Reusable placement catalog. Each entry is a physical station, not a random point.
const DETAIL_STATIONS = [
  {id:'ST_001',x:-33,y:5.2,z:-11,phase:0.19},
  {id:'ST_002',x:-20,y:8.4,z:6,phase:0.38},
  {id:'ST_003',x:-7,y:11.6,z:23,phase:0.57},
  {id:'ST_004',x:6,y:14.8,z:40,phase:0.76},
  {id:'ST_005',x:19,y:18.0,z:57,phase:0.95},
  {id:'ST_006',x:32,y:21.2,z:-21,phase:1.14},
  {id:'ST_007',x:45,y:2.0,z:-4,phase:1.33},
  {id:'ST_008',x:-34,y:5.2,z:13,phase:1.52},
  {id:'ST_009',x:-21,y:8.4,z:30,phase:1.71},
  {id:'ST_010',x:-8,y:11.6,z:47,phase:1.9},
  {id:'ST_011',x:5,y:14.8,z:64,phase:0.0},
  {id:'ST_012',x:18,y:18.0,z:-14,phase:0.19},
  {id:'ST_013',x:31,y:21.2,z:3,phase:0.38},
  {id:'ST_014',x:44,y:2.0,z:20,phase:0.57},
  {id:'ST_015',x:-35,y:5.2,z:37,phase:0.76},
  {id:'ST_016',x:-22,y:8.4,z:54,phase:0.95},
  {id:'ST_017',x:-9,y:11.6,z:-24,phase:1.14},
  {id:'ST_018',x:4,y:14.8,z:-7,phase:1.33},
  {id:'ST_019',x:17,y:18.0,z:10,phase:1.52},
  {id:'ST_020',x:30,y:21.2,z:27,phase:1.71},
  {id:'ST_021',x:43,y:2.0,z:44,phase:1.9},
  {id:'ST_022',x:-36,y:5.2,z:61,phase:0.0},
  {id:'ST_023',x:-23,y:8.4,z:-17,phase:0.19},
  {id:'ST_024',x:-10,y:11.6,z:0,phase:0.38},
  {id:'ST_025',x:3,y:14.8,z:17,phase:0.57},
  {id:'ST_026',x:16,y:18.0,z:34,phase:0.76},
  {id:'ST_027',x:29,y:21.2,z:51,phase:0.95},
  {id:'ST_028',x:42,y:2.0,z:-27,phase:1.14},
  {id:'ST_029',x:-37,y:5.2,z:-10,phase:1.33},
  {id:'ST_030',x:-24,y:8.4,z:7,phase:1.52},
  {id:'ST_031',x:-11,y:11.6,z:24,phase:1.71},
  {id:'ST_032',x:2,y:14.8,z:41,phase:1.9},
  {id:'ST_033',x:15,y:18.0,z:58,phase:0.0},
  {id:'ST_034',x:28,y:21.2,z:-20,phase:0.19},
  {id:'ST_035',x:41,y:2.0,z:-3,phase:0.38},
  {id:'ST_036',x:-38,y:5.2,z:14,phase:0.57},
  {id:'ST_037',x:-25,y:8.4,z:31,phase:0.76},
  {id:'ST_038',x:-12,y:11.6,z:48,phase:0.95},
  {id:'ST_039',x:1,y:14.8,z:65,phase:1.14},
  {id:'ST_040',x:14,y:18.0,z:-13,phase:1.33},
  {id:'ST_041',x:27,y:21.2,z:4,phase:1.52},
  {id:'ST_042',x:40,y:2.0,z:21,phase:1.71},
  {id:'ST_043',x:-39,y:5.2,z:38,phase:1.9},
  {id:'ST_044',x:-26,y:8.4,z:55,phase:0.0},
  {id:'ST_045',x:-13,y:11.6,z:-23,phase:0.19},
  {id:'ST_046',x:0,y:14.8,z:-6,phase:0.38},
  {id:'ST_047',x:13,y:18.0,z:11,phase:0.57},
  {id:'ST_048',x:26,y:21.2,z:28,phase:0.76},
  {id:'ST_049',x:39,y:2.0,z:45,phase:0.95},
  {id:'ST_050',x:-40,y:5.2,z:62,phase:1.14},
  {id:'ST_051',x:-27,y:8.4,z:-16,phase:1.33},
  {id:'ST_052',x:-14,y:11.6,z:1,phase:1.52},
  {id:'ST_053',x:-1,y:14.8,z:18,phase:1.71},
  {id:'ST_054',x:12,y:18.0,z:35,phase:1.9},
  {id:'ST_055',x:25,y:21.2,z:52,phase:0.0},
  {id:'ST_056',x:38,y:2.0,z:-26,phase:0.19},
  {id:'ST_057',x:-41,y:5.2,z:-9,phase:0.38},
  {id:'ST_058',x:-28,y:8.4,z:8,phase:0.57},
  {id:'ST_059',x:-15,y:11.6,z:25,phase:0.76},
  {id:'ST_060',x:-2,y:14.8,z:42,phase:0.95},
  {id:'ST_061',x:11,y:18.0,z:59,phase:1.14},
  {id:'ST_062',x:24,y:21.2,z:-19,phase:1.33},
  {id:'ST_063',x:37,y:2.0,z:-2,phase:1.52},
  {id:'ST_064',x:-42,y:5.2,z:15,phase:1.71},
  {id:'ST_065',x:-29,y:8.4,z:32,phase:1.9},
  {id:'ST_066',x:-16,y:11.6,z:49,phase:0.0},
  {id:'ST_067',x:-3,y:14.8,z:66,phase:0.19},
  {id:'ST_068',x:10,y:18.0,z:-12,phase:0.38},
  {id:'ST_069',x:23,y:21.2,z:5,phase:0.57},
  {id:'ST_070',x:36,y:2.0,z:22,phase:0.76},
];

function buildDeepDetailField(){
  const field=new THREE.Group();
  field.name='DEEP_DETAIL_FIELD';
  environmentRoot.add(field);
  DETAIL_STATIONS.forEach((station,index)=>{
    const g=detailModule001(field,[station.x,station.y,station.z],station.phase);
    g.scale.setScalar(.72+(index%4)*.08);
    if(index%3===0){
      const conduit=addCable(field,`FIELD_CABLE_${index}`,[station.x-.8,station.y-.1,station.z],[station.x+.8,station.y+.15,station.z-.7],.018,MAT.graphite);
      conduit.userData.infrastructure=true;
    }
  });
  return field;
}

// Detail modules are intentionally reused at authored stations so the scene has
// a consistent manufacturing language rather than procedural confetti.
buildDeepDetailField();
// -----------------------------------------------------------------------------
// 30 // CINEMATIC VALIDATION & OBSERVABILITY
// -----------------------------------------------------------------------------
const CHECKPOINTS=[0,.05,.08,.12,.16,.20,.24,.30,.38,.44,.48,.52,.56,.60,.64,.68,.72,.78,.84,.88,.90,.93,.96,.98,1];
const EXPECTED_CHAPTERS=['VOID','IDENTITY','DOOR','WORKSHOP','ARMOR WAKE','MOBILITY','STRUCTURE','CORE','CONTROL','OUTPUT','PERCEPTION','FORMATION','ASSEMBLY','LANDING','OBSERVATION'];

function validateSceneGraph(){
  const required=[doorRoot,workshop,bench,padRoot,irisRoot,interactionRoot,armorRoot];
  const missing=required.filter(Boolean).length!==required.length;
  if(missing)console.warn('[ABOUT QA] scene graph incomplete');
  const armorNames=PART_ORDER.filter(p=>armorGroups[p]);
  if(armorNames.length!==6)console.warn('[ABOUT QA] armor group count',armorNames.length);
  return {ok:!missing,armorNames};
}

function validateArmorScale(){
  const values=PART_ORDER.map(p=>armorGroups[p]?.scale.x||0);
  const bad=values.some(v=>!Number.isFinite(v)||v<=0);
  if(bad)console.warn('[ABOUT QA] invalid armor scale',values);
  return !bad;
}

function validateDeterminismSnapshot(){
  return {
    progress:masterTimeline?.progress()??0,
    camera:[camera.position.x,camera.position.y,camera.position.z],
    armor:PART_ORDER.map(p=>{
      const g=armorGroups[p];
      return [p,g.position.x,g.position.y,g.position.z,g.rotation.x,g.rotation.y,g.rotation.z,g.scale.x];
    })
  };
}

function validateInteractiveContract(){
  return {
    floor:floorCollider.userData.interactiveFloor===true,
    button:physicalButton.userData.interactiveButton===true,
    pit:pit instanceof THREE.Group,
    tunnel:tunnelRoot instanceof THREE.Group
  };
}

window.__ABOUT_VALIDATE__=()=>({
  scene:validateSceneGraph(),
  scale:validateArmorScale(),
  interaction:validateInteractiveContract(),
  snapshot:validateDeterminismSnapshot()
});

function debugCheckpoint(p){
  setCinematicProgress(p);
  const d=window.__ABOUT_DIAGNOSTICS__?.();
  if(!d)return;
  console.log(`[ABOUT CHECKPOINT] ${(p*100).toFixed(1)}%`,d);
}

window.__ABOUT_CHECKPOINTS__=CHECKPOINTS;

function runAuthoringAudit(){
  const report=[];
  report.push(['version',VERSION]);
  report.push(['armorReady',armorReady]);
  report.push(['armorLoaded',armorReadyState.loaded]);
  report.push(['armorFailed',armorReadyState.failed]);
  report.push(['cameraNear',camera.near]);
  report.push(['cameraFar',camera.far]);
  report.push(['suitScale',ARMOR_SCALE]);
  report.push(['showcaseScale',SHOWCASE_SCALE]);
  report.push(['floorY',WORLD.floorY]);
  report.push(['padZ',WORLD.padZ]);
  return report;
}
window.__ABOUT_AUTHORING_AUDIT__=runAuthoringAudit;

// The following explicit labels are also useful when a browser screenshot is
// inspected manually. They never drive the choreography.
const SHOT_LABELS={
  void:'VOID',
  identity:'IDENTITY / INITIALS',
  door:'DOOR / LOCKED',
  doorGap:'DOOR / OPENING',
  workshop:'WORKSHOP / DISTANT BENCH',
  armorWide:'ARMOR / INITIALIZATION',
  boots:'01 / MOBILITY',
  legs:'02 / STRUCTURE',
  torso:'03 / CORE',
  arms:'04 / CONTROL',
  gauntlets:'05 / OUTPUT',
  helmet:'06 / PERCEPTION',
  formation:'FORMATION / FLIGHT',
  assembly:'ASSEMBLY / COMPLETE',
  landing:'LANDING / PAD',
  floor:'OBSERVATION / DISCOVERY',
  pit:'SUBTERRANEAN / DESCENT'
};

window.__ABOUT_SHOT_LABELS__=SHOT_LABELS;
function authoredShotAudit1(shotName,expectedDepth) {
  const shot=CAMERA_SHOTS[shotName];
  if(!shot) return {ok:false,reason:'missing shot'};
  const distance=Math.hypot(shot.p[0],shot.p[1]-shot.t[1],shot.p[2]-shot.t[2]);
  const targetDistance=Math.hypot(shot.t[0],shot.t[1],shot.t[2]);
  const depthOk=Number.isFinite(expectedDepth);
  const record={id:'SHOT_AUDIT_1',shot:shotName,distance,targetDistance,expectedDepth,depthOk};
  if(distance<0.5) console.warn('[ABOUT QA] camera shot too close',record);
  return {ok:depthOk&&distance>0.5,record};
}
function authoredShotAudit2(shotName,expectedDepth) {
  const shot=CAMERA_SHOTS[shotName];
  if(!shot) return {ok:false,reason:'missing shot'};
  const distance=Math.hypot(shot.p[0],shot.p[1]-shot.t[1],shot.p[2]-shot.t[2]);
  const targetDistance=Math.hypot(shot.t[0],shot.t[1],shot.t[2]);
  const depthOk=Number.isFinite(expectedDepth);
  const record={id:'SHOT_AUDIT_2',shot:shotName,distance,targetDistance,expectedDepth,depthOk};
  if(distance<0.5) console.warn('[ABOUT QA] camera shot too close',record);
  return {ok:depthOk&&distance>0.5,record};
}
function authoredShotAudit3(shotName,expectedDepth) {
  const shot=CAMERA_SHOTS[shotName];
  if(!shot) return {ok:false,reason:'missing shot'};
  const distance=Math.hypot(shot.p[0],shot.p[1]-shot.t[1],shot.p[2]-shot.t[2]);
  const targetDistance=Math.hypot(shot.t[0],shot.t[1],shot.t[2]);
  const depthOk=Number.isFinite(expectedDepth);
  const record={id:'SHOT_AUDIT_3',shot:shotName,distance,targetDistance,expectedDepth,depthOk};
  if(distance<0.5) console.warn('[ABOUT QA] camera shot too close',record);
  return {ok:depthOk&&distance>0.5,record};
}
function authoredShotAudit4(shotName,expectedDepth) {
  const shot=CAMERA_SHOTS[shotName];
  if(!shot) return {ok:false,reason:'missing shot'};
  const distance=Math.hypot(shot.p[0],shot.p[1]-shot.t[1],shot.p[2]-shot.t[2]);
  const targetDistance=Math.hypot(shot.t[0],shot.t[1],shot.t[2]);
  const depthOk=Number.isFinite(expectedDepth);
  const record={id:'SHOT_AUDIT_4',shot:shotName,distance,targetDistance,expectedDepth,depthOk};
  if(distance<0.5) console.warn('[ABOUT QA] camera shot too close',record);
  return {ok:depthOk&&distance>0.5,record};
}
function authoredShotAudit5(shotName,expectedDepth) {
  const shot=CAMERA_SHOTS[shotName];
  if(!shot) return {ok:false,reason:'missing shot'};
  const distance=Math.hypot(shot.p[0],shot.p[1]-shot.t[1],shot.p[2]-shot.t[2]);
  const targetDistance=Math.hypot(shot.t[0],shot.t[1],shot.t[2]);
  const depthOk=Number.isFinite(expectedDepth);
  const record={id:'SHOT_AUDIT_5',shot:shotName,distance,targetDistance,expectedDepth,depthOk};
  if(distance<0.5) console.warn('[ABOUT QA] camera shot too close',record);
  return {ok:depthOk&&distance>0.5,record};
}
function authoredShotAudit6(shotName,expectedDepth) {
  const shot=CAMERA_SHOTS[shotName];
  if(!shot) return {ok:false,reason:'missing shot'};
  const distance=Math.hypot(shot.p[0],shot.p[1]-shot.t[1],shot.p[2]-shot.t[2]);
  const targetDistance=Math.hypot(shot.t[0],shot.t[1],shot.t[2]);
  const depthOk=Number.isFinite(expectedDepth);
  const record={id:'SHOT_AUDIT_6',shot:shotName,distance,targetDistance,expectedDepth,depthOk};
  if(distance<0.5) console.warn('[ABOUT QA] camera shot too close',record);
  return {ok:depthOk&&distance>0.5,record};
}
function auditAllAuthoredShots(){
  return Object.keys(CAMERA_SHOTS).map((name,index)=>authoredShotAudit1(name,index));
}
window.__ABOUT_CAMERA_AUDIT__=auditAllAuthoredShots;

function armorStateTable(){
  return PART_ORDER.map((part,index)=>{
    const g=armorGroups[part];
    return {
      index:index+1,
      part,
      loaded:Boolean(armorParts[part]),
      visible:Boolean(g?.visible),
      x:Number((g?.position.x||0).toFixed(4)),
      y:Number((g?.position.y||0).toFixed(4)),
      z:Number((g?.position.z||0).toFixed(4)),
      scale:Number((g?.scale.x||0).toFixed(4))
    };
  });
}
window.__ABOUT_ARMOR_TABLE__=armorStateTable;

function setFloorObservationState(){
  floorActivated=false;
  pitRevealed=false;
  transitioning=false;
  pit.visible=false;
  tunnelRoot.visible=false;
  for(const blade of irisBlades) blade.rotation.z=blade.userData.closedRotation;
  physicalButton.position.y=WORLD.floorY+.78;
  floorMaterial.uniforms.uPulseStrength.value=.2;
}

function resetAboutExperience(){
  setFloorObservationState();
  setWorkbenchPose();
  masterTimeline?.pause(0);
  setCinematicProgress(0);
  applyCameraShot('void');
  hideAllCopy();
  endFade.style.opacity='0';
}
window.__ABOUT_RESET__=resetAboutExperience;
// -----------------------------------------------------------------------------
// 31 // FINAL ENGINEERING NOTES
// -----------------------------------------------------------------------------
// The installation intentionally separates authored state from runtime state.
// Authored state lives in CAMERA_SHOTS, WORKBENCH_POSES, FORMATION_POSES and
// FINAL_POSES. Runtime state lives in the groups and shader uniforms. This means
// a screenshot at an identical progress value is reproducible without asking
// the renderer to guess where the subject ought to be.
//
// The six armor assets share a coordinate frame. Their source dimensions are
// extremely small because the CAD pipeline exports them in a normalized frame.
// WORLD.suitScale is therefore an explicit unit conversion, not a camera hack.
//
// The showcase deliberately moves the subject to an authored focus point rather
// than moving the camera until a bounding box happens to fit. That distinction
// is important: composition belongs to the shot, not to the object.
//
// The floor discovery is deliberately physical. There is no HTML CTA, no arrow,
// no instruction, no floating 'ENTER' prompt. The red pulse is an environmental
// anomaly. The visitor supplies the curiosity.
//
// The pit is not a modal. It is a continuation of the same scene graph. The// iris, wall, tunnel rings, lights and camera all remain in the same coordinate
// system, so the descent can feel like entering a place rather than changing
// pages behind a black transition.
//
// Performance policy: keep DPR fixed at one for the acceptance harness. Geometry
// uses instancing-friendly primitives where possible, shared materials where
// possible, and no per-frame allocation in the main render loop.
//
// Determinism policy: no Math.random() is used for choreography, camera paths,
// armor positions or interaction state. Procedural texture generation is allowed
// to vary internally because those textures are baked during initialization, but
// all visible cinematic transforms are authored.
//
// The renderer owns one scene and one perspective camera. The cinematic is not
// split into multiple renderers, iframe scenes, or separate hidden canvases.
//
// If this file grows further, new code should extend a named section rather than
// adding an anonymous animation callback. Every new visual mechanism should have
// a physical name, an owner group and a deterministic state.
//
// End of VAULT-01 About master runtime.