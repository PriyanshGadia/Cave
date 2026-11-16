import * as T from '../../about/vendor/three.module.js';

const vertexShader = `
 varying vec2 vUv;
 void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0., 1.);
 }
`;

export function createCompositor(renderer) {
 const target = new T.WebGLRenderTarget(1, 1);
 const bloom = new T.WebGLRenderTarget(1, 1, {depthBuffer:false});
 const quad = new T.Mesh(new T.PlaneGeometry(2, 2));
 const scene = new T.Scene();
 const camera = new T.Camera();
 scene.add(quad);

 const highlights = new T.ShaderMaterial({
  vertexShader, depthTest:false, depthWrite:false, toneMapped:false,
  uniforms:{image:{value:target.texture}, texel:{value:new T.Vector2()}},
  fragmentShader:`
   varying vec2 vUv;
   uniform sampler2D image;
   uniform vec2 texel;
   void main() {
    vec3 c = (texture2D(image, vUv + texel).rgb +
              texture2D(image, vUv - texel).rgb +
              texture2D(image, vUv + texel * vec2(1., -1.)).rgb +
              texture2D(image, vUv + texel * vec2(-1., 1.)).rgb) * .25;
    gl_FragColor = vec4(max(c - .38, 0.), 1.);
   }
  `
 });
 const uniforms = {
  image:{value:target.texture}, bloom:{value:bloom.texture},
  texel:{value:new T.Vector2()}, portal:{value:0}, effects:{value:1}, time:{value:0}
 };
 const grade = new T.ShaderMaterial({
  vertexShader, uniforms, depthTest:false, depthWrite:false, toneMapped:false,
  fragmentShader:`
   varying vec2 vUv;
   uniform sampler2D image, bloom;
   uniform vec2 texel;
   uniform float portal, effects, time;
   void main() {
    vec2 p = vUv - .5;
    vec3 c = texture2D(image, vUv).rgb;
    if (effects > .5) {
     vec3 n = texture2D(image, vUv + vec2(0., texel.y)).rgb;
     vec3 s = texture2D(image, vUv - vec2(0., texel.y)).rgb;
     vec3 e = texture2D(image, vUv + vec2(texel.x, 0.)).rgb;
     vec3 w = texture2D(image, vUv - vec2(texel.x, 0.)).rgb;
     vec3 lo = min(c, min(min(n, s), min(e, w)));
     vec3 hi = max(c, max(max(n, s), max(e, w)));
     vec3 contrast = (hi - lo) / max(hi, vec3(.08));
     c = clamp(c + (c - (n + s + e + w) * .25) * (.18 - .1 * contrast), lo, hi);
     c += texture2D(bloom, vUv).rgb * .28;
     c *= 1. - smoothstep(.05, .52, dot(p,p)) * .32;
     float haze = .45 + .15 * sin(8.*p.x + 5.*p.y + time*.8);
     c = mix(c, vec3(.09, .075, .056), haze * portal);
    }
    c = c * 1.08 / (1. + c * .13);
    gl_FragColor = vec4(max(c, vec3(0.)), 1.);
    #include <colorspace_fragment>
   }
  `
 });

 return {
  target, hdr:false, samples:0,
  async prepare() {
   const saved = renderer.getRenderTarget();
   for (const [material, output] of [[highlights,bloom],[grade,null]]) {
    quad.material = material;
    renderer.setRenderTarget(output);
    if (renderer.extensions.has('KHR_parallel_shader_compile')) await renderer.compileAsync(scene,camera);
    else renderer.compile(scene,camera);
   }
   renderer.setRenderTarget(saved);
  },
  setPortal(value) { uniforms.portal.value = value; },
  setEffects(value) { uniforms.effects.value = Number(value); },
  resize(width, height) {
   target.setSize(width, height);
   bloom.setSize(Math.max(1, width >> 2), Math.max(1, height >> 2));
   uniforms.texel.value.set(1 / width, 1 / height);
   highlights.uniforms.texel.value.set(4 / width, 4 / height);
  },
  render(time) {
   uniforms.time.value = time;
   if (uniforms.effects.value) {
    quad.material = highlights;
    renderer.setRenderTarget(bloom);
    renderer.render(scene,camera);
   }
   quad.material = grade;
   renderer.setRenderTarget(null);
   renderer.render(scene,camera);
  },
  dispose() {
   target.dispose();
   bloom.dispose();
   quad.geometry.dispose();
   highlights.dispose();
   grade.dispose();
  }
 };
}
