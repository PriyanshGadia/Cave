import * as T from '../../about/vendor/three.module.js';
const TAU=Math.PI*2;
export const hallFocusPoints = {
 table: [-5.55, 1, 6.8],
 orrery: [-5.68, 2.4, 1.7],
 chronometer: [5.68, 2.4, 1.7],
 compiler: [5.64, 2.8, 7.1],
 graph: [-5.2, 3.7, 13.5],
 document: [5.2, 3.7, 13.5],
 clinical: [-5.7, 2.75, -3.1],
};

/** Inspectable physical counterparts to the real portfolio and scheduler. */
export function addRelics(kit,hall,media,high=false){
 const {mesh,annulus,rim,segmented}=kit.builders,{stone,bronze,gold,steel}=kit.materials,root=new T.Group(),animated=[];hall.hall.add(root);
 function pedestal([x,,z]){const group=new T.Group();group.position.set(x,0,z);root.add(group);const profile=[new T.Vector2(.85,0),new T.Vector2(.9,.18),new T.Vector2(.65,.35),new T.Vector2(.48,1.1),new T.Vector2(.65,1.3),new T.Vector2(.8,1.4)];mesh(group,new T.LatheGeometry(profile,40),stone);rim(group,.72,1.44,bronze);return group}
 const orrery=pedestal(hallFocusPoints.orrery);orrery.userData.poi='orrery';const orrerySpin=new T.Group();orrerySpin.position.y=2.4;orrery.add(orrerySpin);
 for(let i=0;i<3;i++){const g=new T.Group();g.rotation.set(i*.7,.3+i*.5,i*.6);annulus(g,.78+i*.18,.84+i*.18,.09,i%2?bronze:steel);orrerySpin.add(g);animated.push({g,speed:(i%2?-1:1)*(.12+i*.04)})}mesh(orrerySpin,new T.SphereGeometry(.22,32,20),gold);for(let i=0;i<5;i++){const a=i/5*TAU;mesh(orrerySpin,new T.SphereGeometry(.065+i*.008,16,12),bronze,Math.cos(a),Math.sin(a)*.6,Math.sin(a))}
 const clock=pedestal(hallFocusPoints.chronometer);clock.userData.poi='chronometer';const mechanism=new T.Group();mechanism.position.set(0,2.4,0);mechanism.rotation.x=Math.PI*.3;clock.add(mechanism);for(let i=0;i<3;i++){const g=new T.Group();annulus(g,.2+i*.26,.38+i*.26,.12,i%2?stone:bronze);segmented(g,.27+i*.26,.41+i*.26,i?24:12,.12,gold);mechanism.add(g);animated.push({g,speed:i%2?-.09:.12})}
 mesh(mechanism,new T.CircleGeometry(.25,48).rotateX(-Math.PI/2),media.portalMaterial(3),0,.16,0);
 const compiler=pedestal(hallFocusPoints.compiler);compiler.userData.poi='compiler';
 const plateShape=new T.Shape();plateShape.moveTo(-.75,0);plateShape.lineTo(-.75,2.5);plateShape.lineTo(0,3.2);plateShape.lineTo(.75,2.5);plateShape.lineTo(.75,0);plateShape.closePath();mesh(compiler,new T.ExtrudeGeometry(plateShape,{depth:.22,bevelEnabled:true,bevelSize:.06,bevelThickness:.06,bevelSegments:3,steps:1}),stone,0,1.5,-.2);const compilerPortal=mesh(compiler,new T.PlaneGeometry(1.2,1.9),media.portalMaterial(0),0,2.8,.09);compilerPortal.userData.poi='compiler';
 const glass=new T.MeshPhysicalMaterial({color:0xc6d3d6,roughness:.1,metalness:0,transmission:high?.92:0,ior:1.52,thickness:.12,transparent:true,opacity:high?1:.13,clearcoat:high?1:.2,side:T.DoubleSide});
 const portals=[];for(const [i,name]of ['graph','document','clinical'].entries()){const portal=new T.Group();portal.position.fromArray(hallFocusPoints[name]);portal.rotation.y=portal.position.x>0?-.45:.45;portal.userData.poi=['graph','document','clinical'][i];root.add(portal);const mat=media.portalMaterial(i===0?1:i===1?0:2),g=new T.PlaneGeometry(2.3,1.6,1,1);mesh(portal,g,mat,0,0,.04);mesh(portal,new T.PlaneGeometry(2.3,1.6),glass,0,0,.12);const frameShape=new T.Shape();frameShape.moveTo(-1.3,-.95);frameShape.lineTo(1.3,-.95);frameShape.lineTo(1.3,.95);frameShape.lineTo(-1.3,.95);frameShape.closePath();const hole=new T.Path();hole.moveTo(-1.15,-.8);hole.lineTo(-1.15,.8);hole.lineTo(1.15,.8);hole.lineTo(1.15,-.8);hole.closePath();frameShape.holes.push(hole);mesh(portal,new T.ExtrudeGeometry(frameShape,{depth:.12,bevelEnabled:true,bevelSize:.035,bevelThickness:.035,bevelSegments:2,steps:1}),bronze);portals.push({root:portal,material:mat,base:portal.rotation.y})}
 return {root,portals,get transmission(){return glass.transmission},setOptics(enabled){const next=high&&enabled?.92:0;if(next===glass.transmission)return;glass.transmission=next;glass.opacity=next?1:.13;glass.clearcoat=next?1:.2;glass.needsUpdate=true},positions:hallFocusPoints,update(t,pointer={x:0,y:0}){for(const {g,speed}of animated)g.rotation.y=t*speed;for(const p of portals){p.root.rotation.y=T.MathUtils.damp(p.root.rotation.y,p.base+pointer.x*.2,5,.016);p.root.rotation.x=T.MathUtils.damp(p.root.rotation.x,-pointer.y*.12,5,.016)}}};
}
