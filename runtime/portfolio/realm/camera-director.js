import {hallFocusPoints} from './relics.js';
import * as T from '../../about/vendor/three.module.js';
const clamp=T.MathUtils.clamp,up=new T.Vector3(0,1,0);
export function createDirector(){
 const orbit=new T.CatmullRomCurve3([new T.Vector3(-.12,.67,1),new T.Vector3(.22,.82,.92),new T.Vector3(-.18,.7,1),new T.Vector3(0,1,.76)],false,'centripetal'),v=new T.Vector3(),target=new T.Vector3(),right=new T.Vector3(),offset=new T.Vector3();let velocity=0,previous=scrollY;
 return {step(dt){const d=(scrollY-previous)/Math.max(.008,dt);previous=scrollY;velocity=T.MathUtils.damp(velocity,clamp(d/1200,-2,2),7,dt);return velocity},frame(camera,id,{aspect,turn=0,hover=0,hoverY=0,phase,time,motion,view={},dt=.016}){
 camera.fov=id==='seal'?42:40;camera.aspect=aspect;camera.up.set(0,1,0);target.set(0,.2,0);
 if(id==='calendar'){camera.position.set(0,15.386,0);camera.up.set(0,0,-1);camera.lookAt(0,0,0);camera.userData.lookTarget=[0,0,0];return}
 if(id==='throne'){const distance=Math.max(28,19/Math.max(.5,aspect));camera.position.set(0,7.5+phase*1.8,distance-phase*2);target.set(0,5,0)}
 else if(id==='seal'){orbit.getPoint(clamp(.2+phase*.6,0,1),v);const distance=Math.max(22,18/Math.max(.5,aspect));camera.position.copy(v).multiplyScalar(distance/1.25);target.y=.4}
 else{const r=id==='nexus'?8.5:id==='twins'?6.5:6,distance=Math.max(r*2.95,r*2.75/Math.max(.5,aspect)),elevation=id==='twins'?.71:.79;camera.position.set(distance*.26,distance*elevation,distance*.57);target.y=id==='twins'?2.7:1.65}
 const focus=view.focus||'',positions={core:[0,0,0],window:[0,10.2,-7.8],'argus-eye':[0,.5,0],nexus:[0,.3,0],twins:[0,.4,0],throne:[0,4.5,0],...hallFocusPoints},eyes={core:[0,4,9],table:[1,5.5,7.5],window:[0,1,6.5],'argus-eye':[0,7,9],nexus:[0,14,9],twins:[0,11,10],throne:[0,2,22],orrery:[0,1,5.5],compiler:[0,.8,4.5],chronometer:[0,1,5],graph:[1,0,5],document:[-1,0,5],clinical:[1,0,5]};
 if (id==='nexus') {
  for (const [index,key] of ['project-graph','project-document','project-clinical'].entries()) {
   const angle=index/3*Math.PI*2;
   positions[key]=[Math.sin(angle)*4.65,.65,Math.cos(angle)*4.65];
   eyes[key]=[0,8,7];
  }
 }
 offset.copy(camera.position).sub(target);const destination=positions[focus]||target.toArray(),desired=eyes[focus]||offset.toArray();for(const [key,want]of Object.entries({fx:destination[0],fy:destination[1],fz:destination[2],ox:desired[0],oy:desired[1],oz:desired[2]})){view[key]=T.MathUtils.damp(view[key]??(key[0]==='f'?target[['x','y','z'][['fx','fy','fz'].indexOf(key)]]:offset[['x','y','z'][['ox','oy','oz'].indexOf(key)]]),want,5,dt)}
 offset.set(view.ox,view.oy,view.oz).multiplyScalar(Math.exp(view.dolly||0));target.set(view.fx,view.fy,view.fz);if (id === 'throne') {
  camera.position.copy(target).add(offset);
  const sight = v.copy(offset).negate();
  right.crossVectors(camera.up, offset).normalize();
  sight.applyAxisAngle(right, clamp(view.pitch || 0, -.18, .18))
    .applyAxisAngle(up, clamp(view.yaw || 0, -.28, .28));
  target.copy(camera.position).add(sight);
  camera.lookAt(target);
  camera.userData.lookTarget = target.toArray();
  return;
 }
 right.crossVectors(camera.up,offset).normalize();offset.applyAxisAngle(right,view.pitch||0).applyAxisAngle(up,(view.yaw||0)+turn);camera.up.applyAxisAngle(up,(view.yaw||0)+turn);
 right.crossVectors(camera.up,offset).normalize();const truck=(view.x||0)+(motion?hover*.8:0),pedestal=(view.y||0)+(motion?hoverY*.6:0);target.addScaledVector(right,truck).addScaledVector(camera.up,pedestal);camera.position.copy(target).add(offset);camera.position.y=Math.max(.8,camera.position.y);camera.lookAt(target);camera.userData.lookTarget=target.toArray();camera.rotateZ((view.roll||0)+(motion?velocity*.012*phase:0));

 }};
}
