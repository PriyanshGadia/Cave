import * as T from '../../about/vendor/three.module.js';
const TAU=Math.PI*2;
export function addObservatory(kit){const root=new T.Group(),{mesh,annulus,rim}=kit.builders,{stone,bronze,gold}=kit.materials;root.position.y=-2.2;kit.models.seal.root.add(root);
 const plinth = new T.LatheGeometry([
  [0,-16.8],[9.3,-16.8],[9.7,-15.9],[9.7,-13.6],[8.3,-12.9],
  [6.7,-11.4],[6.7,-3.8],[7.4,-3.1],[10,-2.6],[10.3,-1.8],[10.3,-.1],[0,-.1],
 ].map(([radius,y])=>new T.Vector2(radius,y)),72);
 mesh(root,plinth,stone);
 for(const [radius,y]of [[9.5,-15.9],[8.3,-12.9],[6.74,-4.1],[10.3,-.13]])rim(root,radius,y,bronze);
 annulus(root,6.5,10.5,.35,stone);for(const r of[7,8.9,10.3])rim(root,r,.37,bronze);
 const columnGeo=new T.LatheGeometry([new T.Vector2(.4,0),new T.Vector2(.46,.2),new T.Vector2(.25,.4),new T.Vector2(.22,4.5),new T.Vector2(.45,4.8),new T.Vector2(.45,5)],32),columns=new T.InstancedMesh(columnGeo,stone,12),d=new T.Object3D();
 for(let i=0;i<12;i++){const a=i/12*TAU;d.position.set(Math.sin(a)*9.5,0,Math.cos(a)*9.5);d.rotation.set(0,a,0);d.updateMatrix();columns.setMatrixAt(i,d.matrix)}columns.computeBoundingSphere();root.add(columns);
 const pts=[new T.Vector3(-2.3,0,0),new T.Vector3(-1.8,1.4,0),new T.Vector3(0,2.6,0),new T.Vector3(1.8,1.4,0),new T.Vector3(2.3,0,0)],geo=new T.TubeGeometry(new T.CatmullRomCurve3(pts),48,.12,8,false);
 const arches = new T.InstancedMesh(geo,stone,12);
 const chains = new T.InstancedMesh(new T.CylinderGeometry(.025,.025,2.6,8),bronze,12);
 const pendants = new T.InstancedMesh(new T.OctahedronGeometry(.18,1),gold,12);
 for (let i=0; i<12; i++) {
  const a=(i+.5)/12*TAU, x=Math.sin(a), z=Math.cos(a);
  d.rotation.set(0,a,0);
  d.position.set(x*9.2,4.8,z*9.2);
  d.updateMatrix();
  arches.setMatrixAt(i,d.matrix);
  d.rotation.set(0,0,0);
  d.position.set(x*8.5,4.1,z*8.5);
  d.updateMatrix();
  chains.setMatrixAt(i,d.matrix);
  d.position.y=2.7;
  d.updateMatrix();
  pendants.setMatrixAt(i,d.matrix);
 }
 for (const part of [arches,chains,pendants]) part.computeBoundingSphere();
 root.add(arches,chains,pendants);
 return {root,update(f){root.scale.y=.1+.9*f;root.position.y=-2.2-(1-f)*2.5}};
}
