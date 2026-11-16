import * as T from '../../about/vendor/three.module.js';

export function createRoseRays() {
 const rays = new T.Group();
 const positions = [], uvs = [], indices = [];
 const material = new T.ShaderMaterial({
  uniforms:{uTime:{value:0}}, depthWrite:false, transparent:true,
  side:T.DoubleSide, forceSinglePass:true, blending:T.AdditiveBlending,
  vertexShader:`
   varying vec2 vUv;
   void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.);
   }
  `,
  fragmentShader:`
   varying vec2 vUv;
   uniform float uTime;
   void main() {
    float falloff = 1. - smoothstep(.12,.5,abs(vUv.x-.5));
    float lengthFade = smoothstep(0.,.08,vUv.y) * (1. - smoothstep(.15,1.,vUv.y));
    float dust = .81 + .19*sin(vUv.x*26. + vUv.y*41. - uTime*.32);
    gl_FragColor = vec4(vec3(.82,.59,.33),falloff * lengthFade * dust * .105);
   }
  `
 });
 for (let i = -2; i <= 2; i++) {
  const n = positions.length / 3;
  positions.push(i*.56-.18, 10.2-Math.abs(i)*.34, -7.2,
                 i*.56+.18, 10.2-Math.abs(i)*.34, -7.2,
                 i*2.1+1.75, .45+Math.abs(i)*.38, 29-Math.abs(i)*4,
                 i*2.1-1.75, .45+Math.abs(i)*.38, 29-Math.abs(i)*4);
  uvs.push(0,0, 1,0, 1,1, 0,1);
  indices.push(n,n+1,n+2, n,n+2,n+3);
 }
 const geometry = new T.BufferGeometry();
 geometry.setAttribute('position', new T.Float32BufferAttribute(positions,3));
 geometry.setAttribute('uv', new T.Float32BufferAttribute(uvs,2));
 geometry.setIndex(indices);
 rays.add(new T.Mesh(geometry,material));
 return {rays, update(time,visible) {
  rays.visible = visible;
  material.uniforms.uTime.value = time;
 }};
}
