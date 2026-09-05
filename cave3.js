// cave3.js — v3 cavern for VAULT-01. Domain-warped rock, embedded lumps, stalactites, debris,
// end wall with a real doorway hole, door pocket + dark vestibule. Zero image files.
import * as THREE from 'three';

export function buildCave3({scene,R,CAVE_Y,FLOOR_Y,DOOR_Y,DOOR_Z,Q,LOW,rockCave,rockF,rockWall,rockFloor,gunD,compM,ledG}){
  const smooth=THREE.MathUtils.smoothstep, ZC=-.5, LEN=14.5;
  /* noise */
  const fract=x=>x-Math.floor(x), sm=t=>t*t*(3-2*t), hash=n=>fract(Math.sin(n*12.9898)*43758.5453);
  const h3=(x,y,z)=>fract(Math.sin(x*127.1+y*311.7+z*74.7)*43758.5453);
  const vnoise=(x,y,z)=>{ const xi=Math.floor(x),yi=Math.floor(y),zi=Math.floor(z),xf=sm(x-xi),yf=sm(y-yi),zf=sm(z-zi),l=(a,b,t)=>a+(b-a)*t;
    return l(l(l(h3(xi,yi,zi),h3(xi+1,yi,zi),xf),l(h3(xi,yi+1,zi),h3(xi+1,yi+1,zi),xf),yf),
             l(l(h3(xi,yi,zi+1),h3(xi+1,yi,zi+1),xf),l(h3(xi,yi+1,zi+1),h3(xi+1,yi+1,zi+1),xf),yf),zf); };
  const fbm=(x,y,z,o=4)=>{ let a=.5,f=1,s=0,n=0; for(let i=0;i<o;i++){ s+=a*vnoise(x*f+i*17.3,y*f+i*5.1,z*f); n+=a; a*=.5; f*=2.03; } return s/n; };
  const ridge=(x,y,z,o=3)=>{ let a=.5,f=1,s=0,n=0; for(let i=0;i<o;i++){ const v=1-Math.abs(2*vnoise(x*f+i*9.7,y*f+i*3.3,z*f+i*1.1)-1); s+=a*v*v; n+=a; a*=.5; f*=2.1; } return s/n; };

  /* lump field: bulges pressed into the wall (never below the floor line) */
  const lumps=[];
  for(let i=0;i<56;i++){ const ang=hash(i*3.1)*Math.PI*2, z=-7+hash(i*5.3)*13.5, r=.3+hash(i*7.7)*.7, amp=.18+hash(i*11.3)*.42;
    if(CAVE_Y+Math.sin(ang)*R<FLOOR_Y+.3) continue; lumps.push({ang,z,r,amp}); }
  const lumpDisp=(ang,z)=>{ let d=0; for(const L of lumps){ let da=Math.abs(ang-L.ang); da=Math.min(da,Math.PI*2-da);
    const dist=Math.hypot(da*R,z-L.z); if(dist<L.r){ const t=1-dist/L.r; d+=L.amp*t*t*(3-2*t); } } return d; };

  /* one function defines the wall surface — geometry AND props sample it, so nothing floats */
  function radAt(ang,z){ const x=Math.cos(ang)*R, y=Math.sin(ang)*R;
    const q1=fbm(x*.33+5.2,y*.33+1.7,z*.33,3), q2=fbm(x*.33+9.1,y*.33+4.4,z*.33+2.2,3);      // domain warp
    const wx=x+(q1-.5)*1.8, wy=y+(q2-.5)*1.8;
    const big=fbm(wx*.45,wy*.45,z*.45,4), frac=ridge(wx*1.4,wy*1.4,z*1.4,3), fine=fbm(x*4.5,y*4.5,z*4.5,2);
    const strata=Math.sin(y*2.2+fbm(x*.3,0,z*.3,2)*4)*.06;
    const n=(big-.55)*1.9+(frac-.5)*.7+(fine-.5)*.16+strata;
    return Math.max(1.7, R+n-smooth(-z,3.0,6.8)*.55-lumpDisp(ang,z)); }
  const surf=(ang,z)=>{ const r=radAt(ang,z); return new THREE.Vector3(Math.cos(ang)*r*.92, CAVE_Y+Math.sin(ang)*r, z+ZC); };

  /* tube */
  const geo=new THREE.CylinderGeometry(R,R,LEN,LOW?48:80,LOW?60:120,true); geo.rotateX(Math.PI/2);
  const p=geo.attributes.position;
  for(let i=0;i<p.count;i++){ const ang=Math.atan2(p.getY(i),p.getX(i)), z=p.getZ(i), r=radAt(ang,z); p.setXYZ(i,Math.cos(ang)*r*.92,Math.sin(ang)*r,z); }
  geo.computeVertexNormals();
  { const rs=geo.parameters.radialSegments, hs=geo.parameters.heightSegments, nm=geo.attributes.normal;  // weld the seam normals
    for(let row=0;row<=hs;row++){ const a=row*(rs+1), b=a+rs, nx=nm.getX(a)+nm.getX(b), ny=nm.getY(a)+nm.getY(b), nz=nm.getZ(a)+nm.getZ(b), l=Math.hypot(nx,ny,nz)||1;
      nm.setXYZ(a,nx/l,ny/l,nz/l); nm.setXYZ(b,nx/l,ny/l,nz/l); } }
  const cave=new THREE.Mesh(geo,rockCave); cave.position.set(0,CAVE_Y,ZC); cave.receiveShadow=true; scene.add(cave);

  /* end wall WITH a doorway hole (faces removed inside the door footprint, hidden by the frame until it retracts) */
  const wg=new THREE.PlaneGeometry(9,9,72,72), wp=wg.attributes.position;
  for(let i=0;i<wp.count;i++){ const x=wp.getX(i), y=wp.getY(i), d=Math.max(Math.abs(x)/1.42,Math.abs(y)/2.08), mask=smooth(d,1,1.3);
    const wx=x+(fbm(x*.4+3,y*.4,1,3)-.5)*1.5, wy=y+(fbm(x*.4,y*.4+7,2,3)-.5)*1.5;
    wp.setZ(i, mask*((fbm(wx*.7,wy*.7,3.1,4)-.55)*1.4+(ridge(wx*1.6,wy*1.6,1.7,3)-.5)*.6+(fbm(x*4,y*4,5,2)-.5)*.15)); }
  { const ia=wg.index.array, keep=[]; for(let i=0;i<ia.length;i+=3){ let inside=0;
      for(let k=0;k<3;k++){ const v=ia[i+k]; if(Math.abs(wp.getX(v))<1.26&&Math.abs(wp.getY(v))<1.91) inside++; }
      if(inside<3) keep.push(ia[i],ia[i+1],ia[i+2]); } wg.setIndex(keep); }
  wg.computeVertexNormals();
  const wall=new THREE.Mesh(wg,rockWall); wall.position.set(0,DOOR_Y,DOOR_Z-.35); wall.receiveShadow=true; scene.add(wall);

  /* door pocket: jambs, sill, lintel — the door retracts into this and rises behind the lintel */
  const pz=DOOR_Z-.65;
  const jamb=(w,h,d,x,y,z)=>{ const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),gunD); m.position.set(x,DOOR_Y+y,z); m.castShadow=m.receiveShadow=true; scene.add(m); return m; };
  const pocket=[jamb(.1,3.96,.62,-1.3,0,pz), jamb(.1,3.96,.62,1.3,0,pz), jamb(2.7,.1,.62,0,-1.93,pz), jamb(2.7,.18,.72,0,1.99,pz-.05)];

  /* vestibule: five-sided dark box (front face removed), ribs, floor grating, one faint far light */
  const HW=1.25,HH=1.9,VD=3.6, vz0=DOOR_Z-.95;
  const vg=new THREE.BoxGeometry(HW*2,HH*2,VD); { const ia=Array.from(vg.index.array); ia.splice(24,6); vg.setIndex(ia); vg.clearGroups(); }
  const vest=new THREE.Mesh(vg,new THREE.MeshStandardMaterial({color:0x0f1114,roughness:.82,metalness:.55,side:THREE.BackSide,envMapIntensity:.15}));
  vest.position.set(0,DOOR_Y,vz0-VD/2); vest.receiveShadow=true; scene.add(vest);
  for(let k=0;k<5;k++){ const z=vz0-.35-k*.7;
    [-1,1].forEach(s=>{ const rib=new THREE.Mesh(new THREE.BoxGeometry(.06,HH*2-.1,.1),gunD); rib.position.set(s*(HW-.04),DOOR_Y,z); rib.castShadow=rib.receiveShadow=true; scene.add(rib); });
    const top=new THREE.Mesh(new THREE.BoxGeometry(HW*2-.1,.06,.1),gunD); top.position.set(0,DOOR_Y+HH-.04,z); top.receiveShadow=true; scene.add(top); }
  for(let k=0;k<9;k++){ const st=new THREE.Mesh(new THREE.BoxGeometry(HW*2-.2,.02,.05),compM); st.position.set(0,DOOR_Y-HH+.02,vz0-.3-k*.38); st.receiveShadow=true; scene.add(st); }
  const far=new THREE.PointLight(0x18404c,.5,2.6,2); far.position.set(0,DOOR_Y+.4,vz0-VD+.3); scene.add(far);
  [[-.5,.9],[.5,.9],[0,-1.2]].forEach(([x,y])=>{ const l=new THREE.Mesh(new THREE.BoxGeometry(.014,.024,.01),ledG); l.position.set(x,DOOR_Y+y,vz0-VD+.01); scene.add(l); });

  /* floor: debris slope up the walls, gravel lip at the sill */
  const fg=new THREE.PlaneGeometry(7.5,15.5,LOW?40:64,LOW?80:128); fg.rotateX(-Math.PI/2); const fp=fg.attributes.position;
  for(let i=0;i<fp.count;i++){ const x=fp.getX(i), z=fp.getZ(i);
    fp.setY(i,(fbm(x*1.1,0,z*1.1,3)-.5)*.18+(fbm(x*4.5,1,z*4.5,2)-.5)*.05+(ridge(x*2,0,z*2,2)-.5)*.06+smooth(Math.abs(x),1.2,3.2)*.8+smooth(-z,5.4,6.8)*.06); }
  fg.computeVertexNormals(); const floor=new THREE.Mesh(fg,rockFloor); floor.position.set(0,FLOOR_Y,ZC); floor.receiveShadow=true; scene.add(floor);

  /* boulders — free-standing rubble + ones sunk into the lumps; stalactites on the ceiling */
  const base=new THREE.IcosahedronGeometry(1,3);
  const boulder=(k,sc)=>{ const g=base.clone(), pp=g.attributes.position;
    for(let i=0;i<pp.count;i++){ const x=pp.getX(i),y=pp.getY(i),z=pp.getZ(i), s=.65+fbm(x*1.3+k*7.31,y*1.3,z*1.3,3)*.75; pp.setXYZ(i,x*s,y*s,z*s); }
    g.computeVertexNormals(); const b=new THREE.Mesh(g,rockF); b.scale.setScalar(sc); b.rotation.set(hash(k+1)*6,hash(k+2)*6,hash(k+3)*6); b.castShadow=b.receiveShadow=true; scene.add(b); return b; };
  for(let k=0;k<18;k++){ const ang=k/18*Math.PI*2+.2, rr=2.1+(k%2)*.4, px=Math.cos(ang)*rr*.92, py=CAVE_Y+Math.sin(ang)*rr;
    if(Math.abs(px)<1.6&&py<2.4&&py>-1.7) continue; boulder(k,.35+hash(k)*.45).position.set(px,Math.max(py,FLOOR_Y+.1),-6.8+(k%3)*.3); }
  for(let k=20;k<50;k++){ const s=k%2?1:-1; boulder(k,.1+hash(k)*.22).position.set(s*(1.6+hash(k*2)*.8),FLOOR_Y+.02,-6.3+hash(k*5)*11); }
  lumps.forEach((L,i)=>{ if(i%2||L.amp<.3||radAt(L.ang,L.z)<2.2) return; boulder(100+i,Math.min(.4,L.r*.6)).position.copy(surf(L.ang,L.z)); });
  for(let k=0;k<7;k++){ const ang=Math.PI/2+(hash(k*4.4)-.5)*1.4, z=-6.5+hash(k*6.6)*11.5, h=.45+hash(k*8.8)*.6;
    const cg=new THREE.ConeGeometry(.09+hash(k*2.2)*.12,h,7,3), cp=cg.attributes.position;
    for(let i=0;i<cp.count;i++){ const x=cp.getX(i),y=cp.getY(i),zz=cp.getZ(i), s=.8+fbm(x*6+k,y*3,zz*6,2)*.5; cp.setXYZ(i,x*s,y,zz*s); }
    cg.computeVertexNormals(); const c=new THREE.Mesh(cg,rockF); c.rotation.x=Math.PI; const S=surf(ang,z); c.position.set(S.x,S.y-h/2+.12,S.z); c.castShadow=c.receiveShadow=true; scene.add(c); }
  const peb=new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1,0),rockF,Q.pebbles), d=new THREE.Object3D();
  for(let i=0;i<Q.pebbles;i++){ const t=hash(i*3.3); d.position.set((hash(i*1.1)-.5)*4.6,FLOOR_Y+.01,-6.85+t*t*9); d.rotation.set(hash(i)*6,hash(i*2)*6,0); d.scale.setScalar(.02+hash(i*5)*.06); d.updateMatrix(); peb.setMatrixAt(i,d.matrix); }
  peb.castShadow=peb.receiveShadow=true; scene.add(peb);

  return { cave, wall, pocket, vestibule:vest, hole:{halfW:HW,halfH:HH}, vestibuleEnd:vz0-VD };
}
