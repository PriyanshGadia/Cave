import * as THREE from '../about/vendor/three.module.js';

// Every visual surface is made here; no raster image or model files are fetched.
export function makeSurface(base, seed=17, size=512) {
  const canvas=document.createElement('canvas');canvas.width=canvas.height=size;
  const ctx=canvas.getContext('2d'),image=ctx.createImageData(size,size),heights=new Float32Array(size*size);
  const hash=(x,y)=>{const v=Math.sin(x*127.1+y*311.7+seed*17.3)*43758.5453;return v-Math.floor(v)};
  const fade=t=>t*t*(3-2*t);
  function noise(x,y){const a=Math.floor(x),b=Math.floor(y),u=fade(x-a),v=fade(y-b);return THREE.MathUtils.lerp(THREE.MathUtils.lerp(hash(a,b),hash(a+1,b),u),THREE.MathUtils.lerp(hash(a,b+1),hash(a+1,b+1),u),v)}
  const rgb=[1,3,5].map(i=>parseInt(base.slice(i,i+2),16));
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const i=y*size+x,n=noise(x/82,y/82)*.4+noise(x/27,y/27)*.25+noise(x/8,y/8)*.22+hash(x,y)*.13;
    const vein=Math.max(0,1-Math.abs(noise(x/73+noise(x/20,y/20)*.6,y/73)-.51)*70),pore=hash(x+11,y-29)>.986?.32:0;
    const h=n-vein*.13-pore;heights[i]=h;const factor=.82+h*.28+(hash(x+17,y+41)-.5)*.08;
    image.data[i*4]=Math.min(255,rgb[0]*factor);image.data[i*4+1]=Math.min(255,rgb[1]*factor);image.data[i*4+2]=Math.min(255,rgb[2]*factor);image.data[i*4+3]=255;
  }
  ctx.putImageData(image,0,0);
  const relief=document.createElement('canvas');relief.width=relief.height=size;const b=relief.getContext('2d'),bits=b.createImageData(size,size);
  for(let i=0;i<heights.length;i++){const value=Math.max(0,Math.min(255,heights[i]*255));bits.data.set([value,value,value,255],i*4)}b.putImageData(bits,0,0);
  const map=new THREE.CanvasTexture(canvas),bump=new THREE.CanvasTexture(relief);map.colorSpace=THREE.SRGBColorSpace;
  for(const t of[map,bump]){t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=4}
  return {map,bumpMap:bump,roughnessMap:bump,roughness:.88,bumpScale:.05};
}

export function createMaterials(renderer) {
  const stone=new THREE.MeshStandardMaterial({...makeSurface('#8b8c86',31),color:0xffffff});
  const darkStone=new THREE.MeshStandardMaterial({...makeSurface('#535957',62),color:0xffffff});
  const ivory=new THREE.MeshStandardMaterial({...makeSurface('#b1a38a',93),color:0xffffff,bumpScale:.055});
  const bronze=new THREE.MeshStandardMaterial({...makeSurface('#a58a53',14,256),metalness:.72,roughness:.4,bumpScale:.018});
  const iron=new THREE.MeshStandardMaterial({...makeSurface('#4b5152',59,256),metalness:.76,roughness:.34,bumpScale:.035});
  const inset=new THREE.MeshStandardMaterial({color:0x141b1d,roughness:1});
  const gold=new THREE.MeshStandardMaterial({color:0xb39560,metalness:.75,roughness:.34});
  const ember=new THREE.MeshBasicMaterial({color:0xe5a85a,transparent:true,opacity:.72,depthWrite:false,blending:THREE.AdditiveBlending});
  const envCanvas=document.createElement('canvas');envCanvas.width=512;envCanvas.height=256;const c=envCanvas.getContext('2d');c.fillStyle='#11191d';c.fillRect(0,0,512,256);c.fillStyle='#979c99';c.fillRect(10,20,140,38);c.fillStyle='#dcc9a6';c.fillRect(320,50,35,160);c.fillStyle='#424d52';c.fillRect(150,0,100,160);
  const environment=new THREE.CanvasTexture(envCanvas);environment.mapping=THREE.EquirectangularReflectionMapping;environment.colorSpace=THREE.SRGBColorSpace;
  return {stone,darkStone,ivory,bronze,iron,inset,gold,ember,environment};
}

export function beveledBlock() {
  const shape=new THREE.Shape();shape.moveTo(-.44,-.44);shape.lineTo(.44,-.44);shape.lineTo(.44,.44);shape.lineTo(-.44,.44);shape.closePath();
  const g=new THREE.ExtrudeGeometry(shape,{depth:.88,bevelEnabled:true,bevelSize:.055,bevelThickness:.055,bevelSegments:1,steps:1,curveSegments:1});g.translate(0,0,-.44);return g;
}
export function wedgeGeometry(inner,outer,start,end,depth) {
  const shape=new THREE.Shape(),n=10;for(let i=0;i<=n;i++){const a=start+(end-start)*i/n;const x=Math.cos(a)*outer,y=Math.sin(a)*outer;i?shape.lineTo(x,y):shape.moveTo(x,y)}
  for(let i=n;i>=0;i--){const a=start+(end-start)*i/n;shape.lineTo(Math.cos(a)*inner,Math.sin(a)*inner)}shape.closePath();
  const g=new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelSize:.025,bevelThickness:.025,bevelSegments:1,steps:1,curveSegments:1});g.translate(0,0,-depth/2);return g;
}
