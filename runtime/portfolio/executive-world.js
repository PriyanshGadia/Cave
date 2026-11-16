import * as T from '../about/vendor/three.module.js';
import {createArtifacts} from './executive-artifacts.js';
import {forgeTextures} from './realm/texture-forge.js';
import {createMediaForge} from './realm/media-forge.js';
import {buildArmillary} from './realm/armillary.js';
import {addObservatory} from './realm/observatory.js';
import {addGreatHall} from './realm/great-hall.js';
import {addRelics,hallFocusPoints} from './realm/relics.js';
import {createScenery} from './realm/scenery.js';
import {createCompositor} from './realm/compositor.js';
import {createWorldDirector,scrollTarget} from './realm/world-director.js';
import {landmarks} from './realm/vortex.js';
import { createFramePacer, defaultFlowTier, flowTiers } from './realm/smooth-flow.js';
import {yieldToPage} from './realm/boot.js';
const clamp=T.MathUtils.clamp;
const focusModels={core:'seal','argus-eye':'argus',nexus:'nexus',twins:'twins','project-graph':'nexus','project-document':'nexus','project-clinical':'nexus'};

export async function createExecutiveScene({calendar,score,stations,motion=true,restore={},onProgress=()=>{},onReady=()=>{},onFailure=()=>{}}={}){
 const initTime=performance.now(),canvas=document.getElementById('artifact-canvas'),stats={ready:false,fps:0,frames:0,renderedFrames:0,effects:true,rasterFiles:0};let gl;
 onProgress(.02,'Opening the rendering context');await yieldToPage();try{gl=canvas.getContext('webgl2',{alpha:false,antialias:false,powerPreference:'high-performance'})}catch{}
 if(!gl)throw new Error('This browser could not create a WebGL 2 context.');
 const renderer=new T.WebGLRenderer({canvas,context:gl,antialias:false,alpha:false});renderer.setPixelRatio(1);renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.NoToneMapping;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.autoClear=false;renderer.setClearColor(0x080d13,1);
 renderer.setSize(Math.min(864,innerWidth),Math.min(540,innerHeight),false);const depthMaterials=new Map();
 renderer.debug.onShaderError=()=>{throw new Error('A Citadel shader could not compile.');};
 const scene=new T.Scene(),camera=new T.PerspectiveCamera(42,1,.15,1000),director=createWorldDirector(),post=createCompositor(renderer),media=createMediaForge(renderer),handlers=[],pointer={x:0,y:0};
 scene.add(new T.HemisphereLight(0xbdccd3,0x11151c,1.25));const key=new T.DirectionalLight(0xffe3b6,3.1);key.position.set(-30,50,30);key.castShadow=true;key.shadow.autoUpdate=false;key.shadow.mapSize.set(512,512);Object.assign(key.shadow.camera,{left:-18,right:18,top:18,bottom:-18,near:1,far:90});key.shadow.bias=-.00025;key.shadow.normalBias=.04;scene.add(key,key.target);const rimLight=new T.DirectionalLight(0xa7becd,1.6);rimLight.position.set(30,15,-35);scene.add(rimLight);const practical=new T.PointLight(0xffcf8c,30,38,2);scene.add(practical);
 const initialTier = defaultFlowTier();
 let forged=await forgeTextures(renderer,initialTier==='fhd'?'low':'flow',p=>onProgress(.04+p*.36,'Etching stone, steel and bronze'));onProgress(.42,'Constructing the monuments');let kit=await createArtifacts(forged);await yieldToPage();kit.models.seal=buildArmillary(kit);let observatory=addObservatory(kit),hall=addGreatHall(kit),relics=addRelics(kit,hall,media),scenery=createScenery(kit.materials);scene.add(scenery.scene);await yieldToPage();
 onProgress(.66,'Lighting the caldera');const sky=await media.forgeSky(false);scenery.setSky(sky.sky);scene.environment=sky.environment;
 const entries=landmarks.map(([id,pos])=>{const model=kit.models[id],el=document.querySelector(`[data-artifact="${id}"]`);model.root.position.fromArray(pos);model.root.name=id;model.root.userData.poi=id==='argus'?'argus-eye':id==='nexus'||id==='twins'?id:undefined;scene.add(model.root);return {id,model,el,chapter:el.closest('.chapter'),formation:clamp(Number(restore.formations?.[id])||0,0,1),activation:Number(restore.activations?.[id])||0,turn:Number(restore.turns?.[id])||0,view:{yaw:0,pitch:0,x:0,y:0,...restore.views?.[id]},hover:0,hoverY:0,hovered:false,explode:0,parts:[]}});
 let disposed=false,contextLost=false,qualityMode=initialTier,raf=0,last=performance.now(),sample=last,sampleFrames=0,time=Number(restore.time)||0,w=innerWidth,h=innerHeight,lastCalendar=-1,active=entries[0],drag=null,rig=null,warmTimer=0,warmIndex=0;
 const ringControls = ['month-ring','day-ring','time-ring'].map(id=>document.getElementById(id));
 let calendarState = calendar.getState(), timeRingLift = 0;
 const unsubscribeCalendar = calendar.subscribe(state => {
  if (state.start!==calendarState.start || state.end!==calendarState.end) timeRingLift = .18;
  calendarState = state;
 });
 let shadowLandmark = '', shadowTime = -Infinity, shadowFormation = -1, introMaterial = 0;
 const pacer = createFramePacer();
 let resolutionFactor = 1;
 let slowSamples = 0;
 let previousStationPhase;
 const lightOffset = new T.Vector3();
 const raycaster=new T.Raycaster(),mouse=new T.Vector2(),pois=[];
 function prepareParts(){for(const e of entries){e.model.root.traverse(o=>{if(o.isMesh){o.receiveShadow=!!o.material?.isMeshStandardMaterial;o.castShadow=!!o.material?.isMeshStandardMaterial&&!!o.material?.map&&!o.material?.transparent}});const parts=e.id==='argus'?e.model.spin.children:e.id==='nexus'?kit.satellites.map(s=>s.root):e.id==='twins'?e.model.spin.children.filter(o=>o.isGroup):[];e.parts=parts.map((object,i)=>({object,base:object.position.clone(),axis:new T.Vector3(Math.sin(i*2.399),.5+Math.cos(i)*.2,Math.cos(i*2.399)).normalize()}))}}prepareParts();
 function resize() {
  w = innerWidth;
  h = innerHeight;
  const tier = flowTiers[qualityMode];
  const portrait = h > w;
  const maxWidth = portrait ? tier.height : tier.width;
  const maxHeight = portrait ? tier.width : tier.height;
  const limit = renderer.capabilities.maxTextureSize;
  const scale = Math.min(devicePixelRatio, qualityMode === 'fhd' ? 1.5 : 2, maxWidth / w, maxHeight / h, limit / w, limit / h) * resolutionFactor;
  renderer.setSize(Math.max(1, Math.floor(w * scale)), Math.max(1, Math.floor(h * scale)), false);
  post.resize(canvas.width, canvas.height);
 }
 resize();addEventListener('resize',resize);
 function pick(entry,event){mouse.set(event.clientX/w*2-1,1-event.clientY/h*2);raycaster.setFromCamera(mouse,camera);const hits=raycaster.intersectObject(entry.model.root,true);for(const hit of hits){let obj=hit.object;while(obj){if(obj.userData.poi){focus(obj.userData.poi);return}obj=obj.parent}if(!hit.object.material?.transparent)break}}
 function focus(name){const entry=entries.find(e=>e.id===(focusModels[name]||'throne'));if(!entry)return;if(Math.abs((rig?.progress||0)-entries.indexOf(entry))>.65){if(stations)stations.seek(entry.chapter.id,motion?'smooth':'instant');else entry.chapter.scrollIntoView({behavior:motion?'smooth':'instant',block:'start'});}entry.view.focus=name;for(const k of['yaw','pitch','x','y'])entry.view['target'+k[0].toUpperCase()+k.slice(1)]=0;entry.view.dolly=entry.view.roll=0;entry.el.dataset.inspecting='true';active=entry;dispatchEvent(new CustomEvent('executive:inspect',{detail:{name}}))}
 function resetCamera(){dispatchEvent(new CustomEvent('executive:reset'));for(const e of entries){Object.assign(e.view,{yaw:0,pitch:0,x:0,y:0,targetYaw:0,targetPitch:0,targetX:0,targetY:0,dolly:0,roll:0,focus:''});e.el.dataset.inspecting='false'}}
 function endDrag(event){if(!drag)return;const d=drag;drag=null;d.entry.dragging=false;document.body.classList.remove('is-dragging');try{d.el.releasePointerCapture(event.pointerId)}catch{}if(event.type==='pointerup'&&Math.hypot(event.clientX-d.x,event.clientY-d.y)<6)pick(d.entry,event)}
 function startDrag(entry,event,el){if(event.button>0||event.target.closest('a,input,select,textarea,.artifact-poi')||event.target.closest('button')&&!event.target.closest('.artifact-drag'))return;active=entry;const v=entry.view;drag={entry,el,pointer:event.pointerId,x:event.clientX,y:event.clientY,shift:event.shiftKey,view:{yaw:v.targetYaw??v.yaw,pitch:v.targetPitch??v.pitch,x:v.targetX??v.x,y:v.targetY??v.y}};entry.dragging=true;if(event.pointerType!=='touch'||cameraMode==='free'){event.preventDefault();el.setPointerCapture(event.pointerId);document.body.classList.add('is-dragging');getSelection()?.removeAllRanges()}}
 let cameraMode='cinematic';
 const move=event=>{pointer.x=event.clientX/Math.max(1,w)-.5;pointer.y=event.clientY/Math.max(1,h)-.5;if(!drag||event.pointerId!==drag.pointer)return;const dx=event.clientX-drag.x,dy=event.clientY-drag.y;if(event.pointerType==='touch'&&cameraMode!=='free'&&Math.abs(dy)>Math.abs(dx)){endDrag(event);return}event.preventDefault();document.body.classList.add('is-dragging');try{drag.el.setPointerCapture(event.pointerId)}catch{}const v=drag.entry.view;v.focus='';if(event.shiftKey||drag.shift){v.targetX=clamp(drag.view.x-dx*.018,-5,5);v.targetY=clamp(drag.view.y+dy*.018,-4,4)}else{v.targetYaw=cameraMode==='free'?drag.view.yaw+dx*.006:clamp(drag.view.yaw+dx*.006,-1.1,1.1);v.targetPitch=clamp(drag.view.pitch+dy*.004,-.65,.65)}getSelection()?.removeAllRanges()};
 addEventListener('pointermove',move,{passive:false});addEventListener('pointerup',endDrag);addEventListener('pointercancel',endDrag);
 for(const e of entries){if(e.id==='calendar')continue;const down=event=>startDrag(e,event,e.el),hover=event=>{const r=e.el.getBoundingClientRect();e.hover=(event.clientX-r.left)/Math.max(1,r.width)-.5;e.hoverY=(event.clientY-r.top)/Math.max(1,r.height)-.5;e.hovered=true},leave=()=>{e.hover=e.hoverY=0;e.hovered=false};e.el.addEventListener('pointerdown',down);e.el.addEventListener('pointermove',hover);e.el.addEventListener('pointerleave',leave);handlers.push(()=>{e.el.removeEventListener('pointerdown',down);e.el.removeEventListener('pointermove',hover);e.el.removeEventListener('pointerleave',leave)});
  const button=e.el.querySelector('.artifact-drag');const keydown=event=>{const v=e.view;if(event.key.startsWith('Arrow')){event.preventDefault();v.focus='';if(event.shiftKey){if(['ArrowLeft','ArrowRight'].includes(event.key))v.targetX=(v.targetX??v.x)+(event.key==='ArrowLeft'?-.2:.2);else v.targetY=(v.targetY??v.y)+(event.key==='ArrowUp'?.2:-.2)}else if(['ArrowUp','ArrowDown'].includes(event.key))v.targetPitch=clamp((v.targetPitch??v.pitch)+(event.key==='ArrowUp'?-.1:.1),-.65,.65);else v.targetYaw=(v.targetYaw??v.yaw)+(event.key==='ArrowLeft'?-.18:.18)}else if(['+','=','-','_','[',']'].includes(event.key)){event.preventDefault();if(['[',']'].includes(event.key))v.roll=clamp((v.roll||0)+(event.key==='['?-.08:.08),-.5,.5);else v.dolly=clamp((v.dolly||0)+(['+','='].includes(event.key)?-.1:.1),-.8,.6)}else if(event.key==='Escape')resetCamera()};const toggle=()=>e.el.dataset.inspecting=e.el.dataset.inspecting==='true'?'false':'true';button?.addEventListener('keydown',keydown);button?.addEventListener('click',toggle);handlers.push(()=>{button?.removeEventListener('keydown',keydown);button?.removeEventListener('click',toggle)});const help=document.createElement('span');help.className='camera-help';help.setAttribute('aria-hidden','true');help.textContent='Drag to orbit · Shift-drag to pan · + / − to zoom';e.el.append(help);
 }
 const bodyDown=event=>{if(cameraMode==='free'&&!event.target.closest('button,a,input,textarea,select,summary,label,dialog,[popover],.calendar-instrument,.artifact,.chapter header,.hero-bottom,.case-study,.ecosystem-ledger,.credentials,.production-note'))startDrag(active,event,document.body)};document.body.addEventListener('pointerdown',bodyDown);
 const poiDefinitions = [
  ['seal','core','Solar core',[0,0,0]],
  ['argus','argus-eye','ARGUS iris',[0,3.25,0]],
  ...kit.satellites.map((dial,index)=>['nexus',dial.root.userData.poi,['CryptoGraph Analytics','Document Intelligence','Respiratory AI'][index],[dial.root.position.x,.65,dial.root.position.z]]),
  ['twins','twins','Twin foundations',[0,.7,0]],
 ];
 for (const [id,name,label,position] of poiDefinitions) {
  const entry = entries.find(candidate => candidate.id === id);
  if (!entry) continue;
  const marker = new T.Object3D();
  marker.position.fromArray(position);
  entry.model.root.add(marker);
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'artifact-poi';
  button.dataset.poi = name;
  button.title = label;
  button.setAttribute('aria-label','Inspect ' + label.toLowerCase());
  button.hidden = true;
  button.addEventListener('click', () => focus(name));
  entry.el.append(button);
  pois.push({entry,name,marker,button});
 }
 const projectedPoint = new T.Vector3();
 function projectPOIs() {
  const settled = Math.abs(rig.progress - rig.index) < .15 &&
    (!stations || active.chapter.classList.contains('station-visible'));
  for (const poi of pois) {
   const entry = poi.entry;
   let hidden = entry !== active || !settled || entry.formation < .95 ||
     (entry.view.focus && entry.view.focus !== poi.name);
   if (!hidden) {
    poi.marker.getWorldPosition(projectedPoint).project(camera);
    hidden = Math.abs(projectedPoint.z) > 1 || Math.abs(projectedPoint.x) > .94 || Math.abs(projectedPoint.y) > .92;
   }
   poi.button.hidden = Boolean(hidden);
   if (hidden) continue;
   poi.button.style.left = (projectedPoint.x * .5 + .5) * w + 'px';
   poi.button.style.top = (.5 - projectedPoint.y * .5) * h + 'px';
  }
 }
 function render(now){
  try {
  if(disposed)return;raf=requestAnimationFrame(render);if (document.hidden || contextLost || !pacer.take(now, flowTiers[qualityMode].fps)) return;
  const cpu = performance.now();
  const dt = Math.max(0, Math.min(.25, (now - last) / 1000));
  last = now;
  if (motion) time += dt;
  for(const e of entries)for(const k of['yaw','pitch','x','y'])e.view[k]=T.MathUtils.damp(e.view[k],e.view['target'+k[0].toUpperCase()+k.slice(1)]??e.view[k],9,dt);
  const station = stations?.step();
  if (station?.phase === 'move' && previousStationPhase !== 'move') resetCamera();
  previousStationPhase = station?.phase;
  rig = director.frame(camera, entries, {width:w,height:h,time,motion,dt,station});
  if (stations) stations.paint(station, rig.progress, dt);
  active = entries[clamp(rig.index, 0, 5)];
  const bands = score?.bands() || {bass:0,mid:0,high:0};
  if (calendarState.version !== lastCalendar) {
   kit.updateCalendar(calendarState);
   lastCalendar = calendarState.version;
  }
  media.update(time);
  scenery.update(time, false, pointer, motion ? rig.hallTransition : 0, rig.progress, rig.inside);
  const selected = kit.satellites.findIndex(dial=>dial.root.userData.poi===active.view.focus);
  introMaterial = motion ? Math.min(1, introMaterial + dt / 1.25) : 1;
  for (const [i,e] of entries.entries()) {
   e.formation = T.MathUtils.smoothstep(rig.progress, i - .45, i);
   e.activation = e.formation;
   e.model.root.visible = Math.abs(rig.progress - i) < .78;
   if (e.paintedFormation !== e.formation) {
    e.paintedFormation = e.formation;
    e.el.style.setProperty('--formed', e.formation);
    e.chapter.style.setProperty('--formed', e.formation);
   }
   if (!e.model.root.visible) continue;
   const canExplode = e.id !== 'calendar';
   const exploded = canExplode ? (e.el.dataset.inspecting === 'true' ? 1 : motion && e.hovered ? .18 : 0) : 0;
   e.explode = motion ? T.MathUtils.damp(e.explode, exploded, 6, dt) : exploded;
   if (e.id === 'seal') {
    e.model.update(time, motion ? bands.bass : 0, false, motion, e.formation, e.explode, introMaterial);
    observatory.update(1);
   } else if (e.id === 'calendar') {
    e.model.rings.forEach((ring,n) => {
     const spread = T.MathUtils.smoothstep(Math.abs(rig.progress - i), .06, .55);
     const target = e.model.targets?.[n] || 0;
     const turn = Math.atan2(Math.sin(target-ring.rotation.y),Math.cos(target-ring.rotation.y));
     const slotShift = n===2 ? timeRingLift : 0;
     ring.rotation.y += Math.abs(turn)<.0001 ? turn : turn * (1-Math.exp(-7*dt));
     ring.position.y = (n===0?.245:.08 + n * .08) + spread * (2.6 - n * .95) + Math.min(.28,Math.abs(turn)*.20) + slotShift;
     ring.scale.setScalar(1 + spread * (n - 1) * .23);
     ring.rotation.z = spread * (n - 1) * .28;
     if (spread<.001) {
      const projection = 15.386/(15.386-ring.position.y-.216);
      ringControls[n].setAttribute('transform',`translate(500 500) rotate(${-T.MathUtils.radToDeg(ring.rotation.y)}) scale(${projection}) translate(-500 -500)`);
     }
    });
    timeRingLift *= Math.exp(-8*dt);
    e.model.engraving.turn(time + (calendarState.start ?? 0) * .7);
   } else {
    e.model.spin.scale.setScalar(.25 + e.formation * .75);
    e.model.spin.position.y = e.formation * .55 - (1 - e.formation) * 1.4;
    e.model.spin.rotation.y = motion ? Math.sin(time * .16) * .025 : 0;
    for (const part of e.parts) part.object.position.copy(part.base).addScaledVector(part.axis, e.explode * .8);
    kit.updateMechanics(e.id, time, e.formation, e.explode);
   }
   if (e.id === 'nexus') kit.satellites.forEach((node,n) => {
    node.spin.position.y = .25 + (n === selected ? .3 : 0);
    node.spin.rotation.y = (motion ? time * .03 : 0) + (n === selected ? .3 : 0);
   });
   if(cameraMode==='cinematic'&&Math.abs(rig.velocity)>.2&&!e.dragging&&!e.view.focus)for(const k of['yaw','pitch','x','y']){const key='target'+k[0].toUpperCase()+k.slice(1);e.view[key]=T.MathUtils.damp(e.view[key]||0,0,2,dt)}
  }
  kit.uniforms.uTime.value = time;
  kit.uniforms.uPower.value = .95;
  kit.uniforms.uHighlight.value = selected<0?0:.15;
  const lightZone = active.id + (rig.inside ? '-interior' : '');
  if (shadowLandmark !== lightZone) {
   const origin = active.model.root.position;
   key.intensity = rig.inside ? 1.9 : 3.1;
   rimLight.intensity = rig.inside ? .55 : 1.6;
   key.position.copy(origin).add(rig.inside ? lightOffset.set(0,12,-7) : lightOffset.set(-25,36,22));
   key.target.position.copy(origin).add(rig.inside ? lightOffset.set(0,2,7) : lightOffset.set(0,1,0));
   practical.position.copy(origin).add(rig.inside ? lightOffset.set(1,6,15) : lightOffset.set(0,3,4));
   practical.intensity = rig.inside ? 40 : 18;
   key.target.updateMatrixWorld();
   shadowLandmark = lightZone;
   key.shadow.needsUpdate = true;
  }
  if ((!rig.inside && time - shadowTime > 1.1) || Math.abs(active.formation - shadowFormation) > .06) {
   key.shadow.needsUpdate = true;
   shadowTime = time;
   shadowFormation = active.formation;
  }
  renderer.setRenderTarget(post.target);renderer.setViewport(0,0,canvas.width,canvas.height);renderer.setScissorTest(false);renderer.clear(true,true,true);renderer.render(scene,camera);const sceneCalls=renderer.info.render.calls,sceneTriangles=renderer.info.render.triangles;post.setPortal(motion?rig.hallTransition:0);post.render(time);projectPOIs();
  stats.frames++;
  stats.renderedFrames++;
  sampleFrames++;
  if (now - sample > 1000) {
   stats.fps = Math.round(sampleFrames * 1000 / (now - sample));
   sample = now;
   sampleFrames = 0;
   if (stats.ready && time > 2 && station?.phase === 'hold' && stats.fps < 30) {
    if (++slowSamples >= 2 && resolutionFactor > .72) {
     resolutionFactor = Math.max(.72, resolutionFactor * .86);
     slowSamples = 0;
     resize();
    }
   } else slowSamples = 0;
  }
  const first=!stats.ready;Object.assign(stats,{ready:true,time,cpuMs:performance.now()-cpu,mapMs:0,pan:pointer.x,tilt:rig.transition*22,visible:entries.filter(e=>e.model.root.visible).length,calls:sceneCalls+(stats.effects?2:1),triangles:sceneTriangles+(stats.effects?4:2),drawBuffer:[canvas.width,canvas.height],textures:renderer.info.memory.textures,geometries:renderer.info.memory.geometries,quality:qualityMode,targetFps:flowTiers[qualityMode].fps,motion,atlas:forged.dimensions,mapMiB:forged.estimatedMapMiB,sky:media.dimensions,skyMiB:media.estimatedMiB,hdr:post.hdr,msaa:post.samples,portalTransmission:relics.transmission,audio:bands,playback:score?.state,camera:camera.position.toArray(),cameraMode,worldProgress:rig.progress,stationPhase:document.documentElement.dataset.stationPhase,transition:rig.hallTransition,insideHall:rig.inside,localHallCamera:rig.localHallCamera,riverParticles:scenery.vortex.particleCount,spineFront:scenery.vortex.front,scenery:true,portalCount:relics.portals.length,poiCount:pois.length,bladeCount:hall.bladeCount,columnCount:hall.columns,brazierCount:hall.braziers,ringSegments:[12,kit.models.calendar.days,48],formations:Object.fromEntries(entries.map(e=>[e.id,e.formation])),activations:Object.fromEntries(entries.map(e=>[e.id,e.activation])),exploded:Object.fromEntries(entries.map(e=>[e.id,e.explode]))});
  if (first) {
   if (gl.getError() !== gl.NO_ERROR) throw new Error('WebGL reported an error while drawing the first Citadel frame.');
   stats.firstFrameMs = performance.now() - initTime;
   onProgress(1,'The Citadel is ready');
   onReady();
  }
  } catch (error) {
   cancelAnimationFrame(raf);
   onFailure(qualityMode,error.message);
  }
 }
 function releaseModels(old){const gs=new Set(old.geometries?.values?.()||[]),ms=new Set(),ts=new Set();for(const model of Object.values(old.models))model.root.traverse(o=>{if(o.isInstancedMesh)o.dispose();if(o.geometry)gs.add(o.geometry);for(const m of(Array.isArray(o.material)?o.material:[o.material]).filter(Boolean)){ms.add(m);for(const t of Object.values(m))if(t?.isTexture)ts.add(t)}});gs.forEach(g=>g.dispose());ms.forEach(m=>m.dispose());ts.forEach(t=>t.dispose())}
 function setQuality(value) {
  if (disposed || !Object.hasOwn(flowTiers,value) || value === qualityMode) return qualityMode;
  qualityMode = value;
  resolutionFactor = 1;
  slowSamples = 0;
  pacer.reset();
  sample = performance.now();
  sampleFrames = 0;
  resize();
  return qualityMode;
 }
 async function compileObject(object){const saved=renderer.getRenderTarget();renderer.setRenderTarget(post.target);const pending=renderer.extensions.has('KHR_parallel_shader_compile')?renderer.compileAsync(object,camera,scene):Promise.resolve(renderer.compile(object,camera,scene));renderer.setRenderTarget(saved);await pending}
 async function warmDepth(root){const group=new T.Group(),primers=[];root.traverse(o=>{if(!o.castShadow)return;const side=o.material.side===T.DoubleSide?T.DoubleSide:T.BackSide,id=[!!o.isInstancedMesh,side,o.material.map.uuid].join(':');let m=depthMaterials.get(id);if(!m){m=new T.MeshDepthMaterial({depthPacking:T.RGBADepthPacking,map:o.material.map,side});depthMaterials.set(id,m);const clone=o.isInstancedMesh?new T.InstancedMesh(o.geometry,m,1):new T.Mesh(o.geometry,m);group.add(clone);primers.push(clone)}o.customDepthMaterial=m});if(primers.length)await compileObject(group);primers.forEach(o=>{if(o.isInstancedMesh)o.dispose()})}
 async function start(){const initial=Math.round(stations?.read().target??scrollTarget(entries,h));entries.forEach((e,i)=>e.model.root.visible=i===initial);warmIndex=initial+1;onProgress(.82,'Compiling the first view');await compileObject(entries[initial].model.root);await compileObject(scenery.scene);await warmDepth(entries[initial].model.root);await post.prepare();await yieldToPage();onProgress(.96,'Preparing the first frame');last=sample=performance.now();if(!Number.isFinite(restore.time))time=(last-initTime)/1000;raf=requestAnimationFrame(render);warmTimer=setTimeout(warmNext,1800)}
 async function warmNext(){if(disposed)return;if(warmIndex>=entries.length)return;const entry=entries[warmIndex++];await yieldToPage();try{await compileObject(entry.model.root);await warmDepth(entry.model.root)}catch{}if(!disposed)warmTimer=setTimeout(warmNext,300)}
 start().catch(error=>onFailure(qualityMode,error.message));
 const lost=event=>{event.preventDefault();contextLost=true;canvas.style.visibility='hidden';stats.fallback=true;onFailure(qualityMode,'The GPU lost the Citadel rendering context.')},recovered=()=>{contextLost=false;canvas.style.visibility='';stats.fallback=false;resize()};canvas.addEventListener('webglcontextlost',lost);canvas.addEventListener('webglcontextrestored',recovered);
 return {focus,resetCamera,setQuality,setCameraMode(value){cameraMode=value==='free'?'free':'cinematic';document.body.dataset.cameraMode=cameraMode},setEffects(value){stats.effects=!!value;post.setEffects(value)},getStats:()=>({...stats}),getSnapshot:()=>({time,formations:Object.fromEntries(entries.map(e=>[e.id,e.formation])),views:Object.fromEntries(entries.map(e=>[e.id,e.view])),activations:Object.fromEntries(entries.map(e=>[e.id,e.activation])),turns:Object.fromEntries(entries.map(e=>[e.id,e.turn]))}),dispose(){if(disposed)return;disposed=true;cancelAnimationFrame(raf);clearTimeout(warmTimer);unsubscribeCalendar();depthMaterials.forEach(m=>m.dispose());handlers.forEach(fn=>fn());removeEventListener('resize',resize);removeEventListener('pointermove',move);removeEventListener('pointerup',endDrag);removeEventListener('pointercancel',endDrag);document.body.removeEventListener('pointerdown',bodyDown);canvas.removeEventListener('webglcontextlost',lost);canvas.removeEventListener('webglcontextrestored',recovered);scenery.dispose();releaseModels(kit);forged.dispose();media.dispose();post.dispose();renderer.dispose()}};
}
