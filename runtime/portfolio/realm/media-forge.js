import * as T from '../../about/vendor/three.module.js';

const vertex='varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}';
const noise=`float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+1.),f.x),f.y);}float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<4;i++){v+=noise(p)*a;p=mat2(1.6,1.2,-1.2,1.6)*p;a*=.5;}return v;}`;
const skyFragment=`precision highp float;varying vec2 vUv;${noise}
void main(){float lat=(vUv.y-.5)*3.14159265,lon=(vUv.x-.5)*6.2831853;vec3 d=vec3(cos(lat)*cos(lon),sin(lat),cos(lat)*sin(lon));float horizon=exp(-abs(d.y)*6.);vec3 c=mix(vec3(.008,.022,.032),vec3(.06,.095,.105),pow(max(d.y,0.),.4));c+=horizon*vec3(.065,.065,.05);vec2 cp=vec2(lon*3.,d.y*13.);float cloud=fbm(cp+fbm(cp*.7)*2.);float banks=smoothstep(.43,.76,cloud)*(1.-smoothstep(.1,.7,d.y));c=mix(c,vec3(.095,.115,.119),banks*.72);float moon=dot(d,normalize(vec3(-.5,.32,-.8)));c+=vec3(.25,.3,.26)*pow(max(moon,0.),55.);c+=vec3(.65,.66,.54)*smoothstep(.9993,.9996,moon);vec2 cell=floor(vUv*vec2(3200.,1600.));float star=step(.9987,hash(cell))*smoothstep(.52,.75,vUv.y);c+=star*(.2+hash(cell+7.)*.6)*vec3(.7,.77,.8)*(1.-banks);float comet=exp(-pow((lon+.86+(d.y-.5)*1.2)*230.,2.))*smoothstep(.3,.4,d.y)*(1.-smoothstep(.4,.66,d.y));c+=comet*vec3(.35,.19,.065);gl_FragColor=vec4(c,1.);}`;
const portalFragment=`precision highp float;varying vec2 vUv;uniform float uTime,uMode,uHover;${noise}
float line(vec2 p,vec2 a,vec2 b){vec2 pa=p-a,ba=b-a;return length(pa-ba*clamp(dot(pa,ba)/dot(ba,ba),0.,1.));}
void main(){vec2 p=(vUv-.5)*vec2(1.6,1.);float ink=0.,glow=0.;float t=uTime*.24;
if(uMode<.5){for(int i=0;i<9;i++){float lane=(float(i)-4.)*.075;float bend=sin(p.x*7.+t+float(i)*.4)*.035;float l=abs(p.y-lane-bend);ink+=exp(-l*200.)*.5;float pulse=fract(p.x*.8-t-float(i)*.13);glow+=exp(-l*230.)*pow(max(0.,1.-pulse*7.),5.);}float iris=abs(length(p)-.23);ink+=exp(-iris*250.)*.3;}
else if(uMode<1.5){for(int i=0;i<14;i++){float a=float(i)*2.39996;vec2 node=vec2(cos(a),sin(a))*(.12+float(i)*.021);vec2 next=vec2(cos(a+4.8),sin(a+4.8))*(.12+mod(float(i)+2.,14.)*.021);float d=line(p,node,next);ink+=exp(-d*210.)*.28;glow+=exp(-length(p-node)*160.)*(.6+.4*sin(t*5.+float(i)));}ink+=exp(-abs(length(p)-.4)*230.)*.2;}
else if(uMode<2.5){for(int i=0;i<3;i++){float y=(float(i)-1.)*.23;float wave=sin(p.x*12.+t*4.+float(i))*sin(p.x*3.+t)*.055;wave+=exp(-pow(mod(p.x*3.+t*.5,1.)-.5,2.)*400.)*.13;float d=abs(p.y-y-wave);ink+=exp(-d*210.);glow+=exp(-d*65.)*.16;}}
else{for(int i=0;i<4;i++){float r=.09+float(i)*.085,angle=atan(p.y,p.x)+t*(mod(float(i),2.)*2.-1.);ink+=exp(-abs(length(p)-r)*230.)*(.3+.7*pow(abs(sin(angle*(12.+float(i)*4.))),4.));}glow=exp(-length(p)*55.)*.8;}
float edge=1.-smoothstep(.25,.5,max(abs(vUv.x-.5),abs(vUv.y-.5)));vec3 c=vec3(.013,.024,.024)+vec3(.32,.25,.12)*ink+vec3(.7,.5,.22)*glow*(1.+uHover*.5);c+=noise(vUv*170.)*.008;gl_FragColor=vec4(c*edge,1.);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}`;

/** Shared procedural media, never network raster assets or synthetic telemetry. */
export function createMediaForge(renderer){
 const time={value:0},materials=new Set(),canvases=[...document.querySelectorAll('[data-project-stream]')].map(canvas=>({canvas,ctx:canvas.getContext('2d'),mode:Number(canvas.dataset.projectStream)}));
 let sky=null,environment=null,lastDraw=0,skySize=[0,0];
 const pmrem=renderer.extensions.has('EXT_color_buffer_float')?new T.PMREMGenerator(renderer):null;
 function portalMaterial(mode){const material=new T.ShaderMaterial({uniforms:{uTime:time,uMode:{value:mode},uHover:{value:0}},vertexShader:vertex,fragmentShader:portalFragment,side:T.DoubleSide});materials.add(material);material.addEventListener('dispose',()=>materials.delete(material));return material}
 async function forgeSky(high=false){
  const width=Math.min(high?4096:1024,renderer.capabilities.maxTextureSize),height=width/2;
  const rt=new T.WebGLRenderTarget(width,height,{type:T.UnsignedByteType,depthBuffer:false}),s=new T.Scene(),c=new T.Camera(),mat=new T.ShaderMaterial({vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',fragmentShader:skyFragment,depthTest:false,depthWrite:false}),q=new T.Mesh(new T.PlaneGeometry(2,2),mat);s.add(q);
  const saved=renderer.getRenderTarget(),viewport=renderer.getViewport(new T.Vector4()),scissor=renderer.getScissor(new T.Vector4()),scissorTest=renderer.getScissorTest();let nextEnvironment;
  try{renderer.setRenderTarget(rt);renderer.setScissorTest(false);renderer.setViewport(0,0,width,height);renderer.render(s,c);rt.texture.mapping=T.EquirectangularReflectionMapping;if(pmrem){let source=rt;if(width>1024){source=new T.WebGLRenderTarget(1024,512,{type:T.UnsignedByteType,depthBuffer:false});renderer.setRenderTarget(source);renderer.setViewport(0,0,1024,512);renderer.render(s,c);source.texture.mapping=T.EquirectangularReflectionMapping}nextEnvironment=pmrem.fromEquirectangular(source.texture);if(source!==rt)source.dispose();}}
  finally{renderer.setRenderTarget(saved);renderer.setViewport(viewport);renderer.setScissor(scissor);renderer.setScissorTest(scissorTest);q.geometry.dispose();mat.dispose()}
  sky?.dispose();environment?.dispose();sky=rt;environment=nextEnvironment;skySize=[width,height];await new Promise(requestAnimationFrame);return {sky:rt.texture,environment:environment?.texture||null};
 }
 function drawCanvas({canvas,ctx,mode},t){const r=canvas.getBoundingClientRect();if(!r.width||r.bottom<0||r.top>innerHeight)return false;const w=canvas.width,h=canvas.height;ctx.fillStyle='#101a19';ctx.fillRect(0,0,w,h);ctx.strokeStyle='#927c4e';ctx.lineWidth=.8;
  if(mode===1){const nodes=Array.from({length:107},(_,i)=>{const a=i*2.39996,rad=Math.sqrt((i+.5)/107)*h*.43;return [w*.5+Math.cos(a+t*.018)*rad*1.5,h*.5+Math.sin(a+t*.018)*rad]});for(let i=0;i<nodes.length;i++){const a=nodes[i],b=nodes[(i+13)%nodes.length];ctx.globalAlpha=.17;ctx.beginPath();ctx.moveTo(...a);ctx.lineTo(...b);ctx.stroke();ctx.globalAlpha=.65;ctx.fillStyle='#d1b77f';ctx.beginPath();ctx.arc(...a,i%11?1.3:2,0,Math.PI*2);ctx.fill()}}
  else{for(let lane=0;lane<7;lane++){ctx.globalAlpha=.28+lane%3*.12;ctx.beginPath();for(let x=0;x<=w;x+=3){let y=h*.5+(lane-3)*h*.06+Math.sin(x*.018+t*.5+lane*.6)*h*.09;if(mode===2)y+=Math.exp(-Math.pow(((x/w*4+t*.08)%1)-.5,2)*500)*h*.2;else y+=Math.sin(x*.04-t*.3)*h*.05;x?ctx.lineTo(x,y):ctx.moveTo(x,y)}ctx.stroke()}}ctx.globalAlpha=1;return true;
 }
 return {portalMaterial,forgeSky,get dimensions(){return skySize},get estimatedMiB(){return Math.round(skySize[0]*skySize[1]*4/1048576+(pmrem?6:0))},update(t){time.value=t;canvases.forEach(c=>{if(c.lastDraw===undefined||t-c.lastDraw>.033||t<c.lastDraw){if(drawCanvas(c,t))c.lastDraw=t}})},dispose(){sky?.dispose();environment?.dispose();pmrem?.dispose();materials.forEach(m=>m.dispose())}};
}
