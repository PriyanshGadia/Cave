import * as T from '../../about/vendor/three.module.js';
import {createDirector} from './camera-director.js';
import {landmarks,spineCurve} from './vortex.js';
const clamp=T.MathUtils.clamp,worldUp=new T.Vector3(0,1,0);

export function scrollTarget(entries,height){
 const y=scrollY;for(let i=0;i<entries.length-1;i++){const r=entries[i].chapter.getBoundingClientRect(),next=entries[i+1].chapter.getBoundingClientRect(),start=y+r.bottom-height*.55,end=y+next.top-height*.3;if(y<start)return i;if(y<end)return i+T.MathUtils.smoothstep((y-start)/Math.max(1,end-start),0,1)}return entries.length-1;
}

export function createWorldDirector(){
 const local=createDirector(),scratch=new T.PerspectiveCamera(),curveEye=new T.CatmullRomCurve3(Array.from({length:4},()=>new T.Vector3()),false,'centripetal'),curveLook=new T.CatmullRomCurve3(Array.from({length:4},()=>new T.Vector3()),false,'centripetal');let progress=0,speed=0,initialized=false;
 const eye=new T.Vector3(),target=new T.Vector3(),up=new T.Vector3();
 let wasTraveling=false;
 function pose(entry,{width,height,time,motion,dt},traveling){
  const r=entry.el.getBoundingClientRect(),mobile=width<1100;
  local.frame(scratch,entry.id,{aspect:mobile?r.width/Math.max(1,r.height):width/height,turn:traveling?0:entry.turn,hover:0,hoverY:0,phase:0,time,motion:motion&&!traveling,view:traveling?{}:entry.view,dt});
  const look=new T.Vector3().fromArray(scratch.userData.lookTarget||[0,entry.id==='throne'?5:.2,0]),position=scratch.position.clone();
  if(!mobile&&(traveling||!entry.view.focus)){const scale=entry.id==='seal'?1.6:['argus','nexus'].includes(entry.id)?1.3:entry.id==='twins'?1.22:1;position.sub(look).multiplyScalar(scale).add(look)}
  const origin=entry.model.root.position;let fov=scratch.fov,ox=0,oy=0;
  if(mobile||entry.id==='calendar'){fov=2*Math.atan(Math.tan(T.MathUtils.degToRad(fov)/2)*height/Math.max(1,r.height))*180/Math.PI;fov=clamp(fov,25,110);ox=width/2-(r.left+r.width/2);oy=height/2-clamp(r.top+r.height/2,-height*.4,height*1.4)}
  return {eye:position.multiply(entry.model.root.scale).add(origin),look:look.multiply(entry.model.root.scale).add(origin),up:new T.Vector3(0,1,0).applyQuaternion(scratch.quaternion),fov,ox,oy};
 }
 return {frame(camera,entries,{width,height,time,motion,dt,station}){
  const wanted = station?.target ?? scrollTarget(entries,height);
  if (!initialized || !motion || Math.abs(progress-wanted) < .0002) {
   progress = wanted;
   speed = 0;
  } else {
   const displacement = progress - wanted;
   if (speed * displacement > 0) speed = 0;
   const decay = Math.exp(-12 * dt);
   const correction = (speed + 12 * displacement) * dt;
   const next = wanted + (displacement + correction) * decay;
   speed = (speed - 12 * correction) * decay;
   progress = clamp(next, Math.min(progress,wanted), Math.max(progress,wanted));
  }
  initialized = true;
  const index=Math.min(4,Math.floor(progress)),f=progress>=5?1:progress-index,traveling=f>0&&f<1;
  if(!traveling&&wasTraveling){
   const view=entries[Math.round(progress)]?.view;
   if(view)for(const key of ['fx','fy','fz','ox','oy','oz'])delete view[key];
  }
  wasTraveling=traveling;
  const a=pose(entries[index],{width,height,time,motion,dt},traveling),b=pose(entries[Math.min(entries.length-1,index+1)],{width,height,time,motion,dt},traveling);
  const transition=Math.sin(f*Math.PI),hallTransition=index===4?Math.pow(Math.sin(f*Math.PI),2):0;
  if(f<.0001){eye.copy(a.eye);target.copy(a.look);up.copy(a.up)}else if(f>.9999){eye.copy(b.eye);target.copy(b.look);up.copy(b.up)}else{
   const p1=spineCurve.getPoint((index+.3)/5),p2=spineCurve.getPoint((index+.72)/5);curveEye.points[0].copy(a.eye);curveEye.points[1].copy(p1).add(new T.Vector3(0,3.5,9));curveEye.points[2].copy(p2).add(new T.Vector3(0,2.7,8));curveEye.points[3].copy(b.eye);curveLook.points[0].copy(a.look);curveLook.points[1].copy(p1).add(new T.Vector3(0,0,-10));curveLook.points[2].copy(p2).add(new T.Vector3(0,0,-12));curveLook.points[3].copy(b.look);
   if(index===4){curveEye.points[1].set(2,1,-216);curveEye.points[2].set(0,1,-235);curveLook.points[1].set(0,-1,-238);curveLook.points[2].set(0,0,-266)}
   curveEye.getPoint(f,eye);curveLook.getPoint(f,target);
   if(index===4){
    eye.z=T.MathUtils.lerp(a.eye.z,b.eye.z,T.MathUtils.smoothstep(f,0,1));
    target.z=T.MathUtils.lerp(a.look.z,b.look.z,f);
   }up.copy(a.up).lerp(b.up,f).lerp(worldUp,transition*.9).normalize();
  }
  const hallOrigin=entries[5]?.model.root.position || new T.Vector3(0,-4,-275);
  const inside=entries.length>5&&progress>4.4&&eye.z<hallOrigin.z+38.5;
  if(inside){const {x:sx,y:sy}=entries[5].model.root.scale,x=clamp(eye.x-hallOrigin.x,-7*sx,7*sx),ceiling=(7.6+6.4*Math.pow(1-Math.abs(x/(7.7*sx)),.72)-.5)*sy;eye.x=hallOrigin.x+x;eye.y=hallOrigin.y+clamp(eye.y-hallOrigin.y,.75,ceiling);eye.z=hallOrigin.z+clamp(eye.z-hallOrigin.z,-7.2,38);}
  camera.position.copy(eye);camera.up.copy(up);camera.aspect=width/height;camera.fov=clamp(T.MathUtils.lerp(a.fov,b.fov,f)+transition*6,25,115);camera.near=.15;camera.far=1000;camera.lookAt(target);camera.setViewOffset(width,height,T.MathUtils.lerp(a.ox,b.ox,f)*(1-transition*.7),T.MathUtils.lerp(a.oy,b.oy,f)*(1-transition*.7),width,height);camera.updateProjectionMatrix();camera.updateMatrixWorld();
  return {progress,wanted,index:Math.round(progress),transition,hallTransition,inside,velocity:local.step(dt),target:target.clone(),localHallCamera:inside?eye.clone().sub(hallOrigin).toArray():null};
 }};
}
