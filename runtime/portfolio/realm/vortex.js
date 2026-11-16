import * as T from '../../about/vendor/three.module.js';

export const landmarks = [
  ['seal', [0, 2.85, 0]], ['argus', [-8, 0, -48]], ['nexus', [6, -1, -98]],
  ['twins', [-5, -1, -148]], ['calendar', [3, -2, -198]],
];
const nodes = landmarks.map(([, [x, y, z]]) => new T.Vector3(x, y + 2, z));
export const spineCurve = new T.CatmullRomCurve3(nodes, false, 'catmullrom', .5);
const particleCount = 1400;
const spineEnd = .90;
const segments = 320;

const curveGLSL = `
uniform vec3 uNodes[5];
vec3 curve(float t) {
  float q=clamp(t,0.,.999999)*4.;
  int i=int(floor(q));
  float f=fract(q);
  vec3 a=uNodes[max(0,i-1)], b=uNodes[i], c=uNodes[i+1], d=uNodes[min(4,i+2)];
  return .5*((2.*b)+(-a+c)*f+(2.*a-5.*b+4.*c-d)*f*f+(-a+3.*b-3.*c+d)*f*f*f);
}`;

export function createVortex() {
  const group = new T.Group();
  const uniforms = {
    uTime: { value: 0 },
    uPointer: { value: new T.Vector2() },
    uNodes: { value: nodes },
    uFront: { value: .07 },
  };
  const ribbons = [0, 1].map(lane => {
    const direction = lane ? -1 : 1;
    const points = Array.from({ length: segments + 1 }, (_, i) => {
      const t = i / segments * spineEnd;
      const point = spineCurve.getPoint(t);
      const angle = t * Math.PI * 28 + lane * Math.PI;
      const radius = .8 + Math.sin(t * 19) * .25;
      const fromCalendar = Math.abs(point.z - nodes[4].z);
      const fork = 1 - T.MathUtils.smoothstep(fromCalendar, 4, 15);
      point.x += Math.cos(angle) * radius + direction * 7.2 * fork;
      point.y += Math.sin(angle) * radius - 1.9 * fork;
      return point;
    });
    const curve = new T.CatmullRomCurve3(points);
    const lengths = curve.getLengths(segments);
    const geometry = new T.TubeGeometry(curve, segments, lane ? .11 : .15, 7, false);
    const head = { value: .07 };
    const material = new T.ShaderMaterial({
      uniforms: { uTime: uniforms.uTime, uHead: head },
      transparent: true,
      depthWrite: false,
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vN,vV;
        void main(){
          vUv=uv;
          vec4 p=modelViewMatrix*vec4(position,1.);
          vN=normalize(normalMatrix*normal);
          vV=-p.xyz;
          gl_Position=projectionMatrix*p;
        }`,
      fragmentShader: `
        precision highp float;
        varying vec2 vUv;
        varying vec3 vN,vV;
        uniform float uTime,uHead;
        void main(){
          float tail=(1.-smoothstep(.91,1.,vUv.x))*(1.-smoothstep(uHead-.018,uHead,vUv.x));
          if(tail<.012)discard;
          float pulse=pow(.5+.5*sin(vUv.x*280.-uTime*5.),8.);
          float surge=pow(.5+.5*sin(vUv.x*58.-uTime*1.8),4.);
          float tip=exp(-pow((vUv.x-uHead+.013)*104.,2.));
          vec3 n=normalize(vN),v=normalize(vV),light=normalize(vec3(-.4,.7,.5));
          float fresnel=pow(1.-abs(dot(n,v)),2.5);
          float spec=pow(max(0.,dot(reflect(-light,n),v)),28.);
          vec3 c=vec3(.015,.02,.026)*(1.+max(0.,dot(n,light)));
          c+=vec3(.95,.42,.085)*(pulse*.22+surge*.06+tip*.7);
          c+=fresnel*vec3(.035,.055,.065)+spec*vec3(.12,.09,.045);
          gl_FragColor=vec4(c,tail);
        }`,
    });
    group.add(new T.Mesh(geometry, material));
    return { geometry, material, lengths, head };
  });

  const position = new Float32Array(particleCount * 3);
  const seed = new Float32Array(particleCount * 3);
  for (let i = 0; i < particleCount; i++) {
    position[i * 3] = ((i + .5) * .61803398875) % 1;
    seed.set([((i + 7) * .754877666) % 1, ((i + 3) * .56984029) % 1, ((i + 11) * .438579) % 1], i * 3);
  }
  const geometry = new T.BufferGeometry();
  geometry.setAttribute('position', new T.BufferAttribute(position, 3));
  geometry.setAttribute('aSeed', new T.BufferAttribute(seed, 3));
  const particleMaterial = new T.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: T.AdditiveBlending,
    vertexShader: `
      attribute vec3 aSeed;
      uniform float uTime,uFront;
      uniform vec2 uPointer;
      varying float vAlpha,vTint;
      ${curveGLSL}
      void main() {
        float s=fract(position.x+uTime*(.009+aSeed.y*.008))*.9;
        float angle=aSeed.x*6.28318+uTime*.24;
        float radius=.55+pow(aSeed.z,2.)*8.;
        vec3 p=curve(s)+vec3(cos(angle)*radius,sin(angle)*radius*.58,0.);
        p.xy+=vec2(sin(s*44.+uTime*.63),cos(s*49.-uTime*.58))*.7+uPointer*.4;
        float calendarClear=smoothstep(7.,17.,distance(p.xz,uNodes[4].xz));
        float hallClear=smoothstep(-230.,-217.,p.z);
        float front=1.-smoothstep(uFront-.035,uFront,s);
        vec4 mv=modelViewMatrix*vec4(p,1.);
        gl_Position=projectionMatrix*mv;
        gl_PointSize=clamp(77./max(1.,-mv.z),1.,3.7);
        vAlpha=calendarClear*hallClear*front*(.43+aSeed.z*.47)*(1.-smoothstep(90.,145.,-mv.z));
        vTint=aSeed.x;
      }`,
    fragmentShader: `
      precision highp float;
      varying float vAlpha,vTint;
      void main(){
        float d=length(gl_PointCoord-.5)*2.;
        if(d>1.||vAlpha<.015)discard;
        vec3 c=mix(vec3(.43,.51,.55),vec3(1.,.68,.28),smoothstep(.2,.5,vTint));
        gl_FragColor=vec4(c*1.2,pow(1.-d,2.)*vAlpha);
      }`,
  });
  const particles = new T.Points(geometry, particleMaterial);
  particles.frustumCulled = false;
  group.add(particles);
  let previousX = 0, previousY = 0;
  const pointerDelta = new T.Vector2();
  return {
    group,
    particleCount,
    get front() { return uniforms.uFront.value; },
    update(time, pointer, progress, insideHall) {
      uniforms.uTime.value = time;
      pointerDelta.set((pointer.x - previousX) * 8, (pointer.y - previousY) * 8);
      uniforms.uPointer.value.lerp(pointerDelta, .1);
      previousX = pointer.x;
      previousY = pointer.y;
      const front = Math.min(spineEnd, (progress + .39) / 5);
      uniforms.uFront.value = front;
      const at = front / spineEnd * segments;
      for (const ribbon of ribbons) {
        const left = Math.floor(at);
        const right = Math.min(segments, left + 1);
        ribbon.head.value = T.MathUtils.lerp(ribbon.lengths[left], ribbon.lengths[right], at - left) / ribbon.lengths[segments];
        ribbon.geometry.setDrawRange(0, Math.ceil(ribbon.head.value * segments) * 7 * 6);
      }
      group.visible = !insideHall;
    },
    dispose() {
      for (const ribbon of ribbons) {
        ribbon.geometry.dispose();
        ribbon.material.dispose();
      }
      geometry.dispose();
      particleMaterial.dispose();
    },
  };
}
