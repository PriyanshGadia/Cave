// transition.js — door-open cinematic + push-through into the dark vestibule. Zero assets.
import * as THREE from 'three';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

const E={ io:t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2, ios:t=>-(Math.cos(Math.PI*t)-1)/2, ic:t=>t*t*t };
const seg=(T,a,b)=>THREE.MathUtils.clamp((T-a)/(b-a),0,1), lerp=THREE.MathUtils.lerp;

export function installDoorSequence({scene,camera,composer,door,walk,look,canvas,DOOR_Y,DOOR_Z,onEntered}){
  /* locate parts without touching index.html */
  let panel=null, amber=null, cyan=null, ember=null;
  door.traverse(o=>{ if(o.userData?.action==='approach') panel=o.parent; });
  scene.traverse(o=>{ if(o.isSpotLight) amber=o;
    if(o.isPointLight&&Math.abs(o.position.z-(DOOR_Z+.6))<.01&&Math.abs(o.position.x)<.01) cyan=o;
    if(o.isMesh&&o.material?.emissive?.getHex?.()===0xff5a12) ember=o; });
  const door0=door.position.clone(), panel0=panel?panel.position.z:0, cyan0=cyan?cyan.position.y:0;
  const EYE_WORLD_Y = -0.02, PANEL_Z = DOOR_Z + 0.13;

  /* iris fade pass (after the grade) */
  const fade=new ShaderPass({uniforms:{tDiffuse:{value:null},uFade:{value:0}},
    vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:`uniform sampler2D tDiffuse;uniform float uFade;varying vec2 vUv;
      void main(){vec3 c=texture2D(tDiffuse,vUv).rgb;float v=1.-uFade;v*=mix(1.,smoothstep(1.2,.1,length(vUv-.5)*2.),uFade*.9);gl_FragColor=vec4(c*v,1.);}`});
  composer.addPass(fade);

  /* dust */
  const NP=160, dg=new THREE.BufferGeometry(), dpos=new Float32Array(NP*3).fill(-99), dvel=new Float32Array(NP*3), dlife=new Float32Array(NP); let head=0;
  dg.setAttribute('position',new THREE.BufferAttribute(dpos,3));
  const dust=new THREE.Points(dg,new THREE.PointsMaterial({color:0xd9b07a,size:.05,transparent:true,opacity:0,depthWrite:false})); dust.frustumCulled=false; scene.add(dust);
  const burst=(n,at,sp,dir)=>{ for(let i=0;i<n;i++){ const k=head++%NP;
    dpos[k*3]=at.x+(Math.random()-.5)*sp.x; dpos[k*3+1]=at.y+(Math.random()-.5)*sp.y; dpos[k*3+2]=at.z+(Math.random()-.5)*sp.z;
    dvel[k*3]=dir.x+(Math.random()-.5)*.6; dvel[k*3+1]=dir.y+Math.random()*.5; dvel[k*3+2]=dir.z+(Math.random()-.5)*.4; dlife[k]=1; } };
  const dustStep=dt=>{ let any=false; for(let k=0;k<NP;k++){ if(dlife[k]<=0) continue; any=true; dlife[k]-=dt*.45; dvel[k*3+1]-=dt*.9;
    for(let a=0;a<3;a++){ dvel[k*3+a]*=1-dt*1.8; dpos[k*3+a]+=dvel[k*3+a]*dt; } if(dlife[k]<=0) dpos[k*3+1]=-99; }
    dg.attributes.position.needsUpdate=true; dust.material.opacity=any?.55:0; };

  /* synthesized audio — clunk / hiss / rumble / drone, through one compressor */
  let ac,master; const A=()=>{ if(!ac){ ac=new (window.AudioContext||window.webkitAudioContext)(); master=ac.createDynamicsCompressor(); master.threshold.value=-18; master.ratio.value=6; master.connect(ac.destination); } if(ac.state==='suspended') ac.resume(); return ac; };
  const noise=sec=>{ const c=A(), b=c.createBuffer(1,(c.sampleRate*sec)|0,c.sampleRate), d=b.getChannelData(0); for(let i=0;i<d.length;i++) d[i]=Math.random()*2-1; return b; };
  const clunk=(t,g=.6)=>{ const c=A(), o=c.createOscillator(), og=c.createGain(); o.type='sine'; o.frequency.setValueAtTime(95,t); o.frequency.exponentialRampToValueAtTime(34,t+.3);
    og.gain.setValueAtTime(g,t); og.gain.exponentialRampToValueAtTime(.001,t+.45); o.connect(og).connect(master); o.start(t); o.stop(t+.5);
    const n=c.createBufferSource(), f=c.createBiquadFilter(), ng=c.createGain(); n.buffer=noise(.25); f.type='lowpass'; f.frequency.value=650;
    ng.gain.setValueAtTime(g*.7,t); ng.gain.exponentialRampToValueAtTime(.001,t+.16); n.connect(f).connect(ng).connect(master); n.start(t); };
  const hiss=(t,dur,g=.28)=>{ const c=A(), n=c.createBufferSource(), f=c.createBiquadFilter(), ng=c.createGain(); n.buffer=noise(dur+.1); f.type='bandpass'; f.Q.value=.9;
    f.frequency.setValueAtTime(3200,t); f.frequency.exponentialRampToValueAtTime(600,t+dur); ng.gain.setValueAtTime(.001,t); ng.gain.exponentialRampToValueAtTime(g,t+.12);
    ng.gain.setValueAtTime(g,t+dur*.6); ng.gain.exponentialRampToValueAtTime(.001,t+dur); n.connect(f).connect(ng).connect(master); n.start(t); n.stop(t+dur+.1); };
  const rumble=(t,dur,g=.4)=>{ const c=A(), n=c.createBufferSource(), f=c.createBiquadFilter(), ng=c.createGain(); n.buffer=noise(2); n.loop=true; f.type='lowpass'; f.frequency.value=120;
    ng.gain.setValueAtTime(.001,t); ng.gain.linearRampToValueAtTime(g,t+.5); ng.gain.setValueAtTime(g,t+dur-.9); ng.gain.linearRampToValueAtTime(.001,t+dur); n.connect(f).connect(ng).connect(master); n.start(t); n.stop(t+dur+.05);
    const s=c.createOscillator(), l=c.createOscillator(), lg=c.createGain(), sg=c.createGain(); s.type='sine'; s.frequency.value=41; l.frequency.value=5.5; lg.gain.value=3; l.connect(lg).connect(s.frequency);
    sg.gain.setValueAtTime(.001,t); sg.gain.linearRampToValueAtTime(g*.5,t+.6); sg.gain.linearRampToValueAtTime(.001,t+dur); s.connect(sg).connect(master); s.start(t); l.start(t); s.stop(t+dur+.05); l.stop(t+dur+.05); };
  const drone=(t,dur,g=.09)=>{ const c=A(); [52,52.7,104.3].forEach((fq,i)=>{ const o=c.createOscillator(), og=c.createGain(); o.type=i<2?'sine':'triangle'; o.frequency.value=fq;
    og.gain.setValueAtTime(.001,t); og.gain.linearRampToValueAtTime(g/(i+1),t+2.5); og.gain.setValueAtTime(g/(i+1),t+dur-1); og.gain.linearRampToValueAtTime(.001,t+dur); o.connect(og).connect(master); o.start(t); o.stop(t+dur+.1); }); };

  /* timeline */
  const TL={lock:[.55,1,1.45], panelIn:[1.5,1.9], retract:[2,3.6], rise:[3.9,8.4], push:[6.8,12.2], black:[11.2,12.8]};
  let T=-1, cam0=null, entered=false; const fired={}; const once=(k,fn)=>{ if(!fired[k]){ fired[k]=1; fn(); } };
  function begin(){ if(T>=0) return; T=0; canvas.style.pointerEvents='none'; walk.target=1; look.ty=0; look.tp=0;
    cam0={z:camera.position.z,pitch:camera.rotation.x,yaw:camera.rotation.y,y:camera.position.y};
    const a=A().currentTime+.05;
    TL.lock.forEach((t,i)=>clunk(a+t,.5+i*.15)); hiss(a+TL.panelIn[0],.5,.15); hiss(a+TL.retract[0],TL.retract[1]-TL.retract[0]+.3,.3);
    rumble(a+TL.rise[0]-.2,TL.rise[1]-TL.rise[0]+1.2,.45); clunk(a+TL.rise[1]+.1,.7); drone(a+TL.push[0],TL.black[1]-TL.push[0]+3,.1); hiss(a+TL.push[0]+1.5,2.5,.06); }
  addEventListener('vault:granted',begin,{once:true});

  function cinematic(dt){ if(T<0) return; T+=dt;
    /* camera settles from the panel close-up to a centred view of the door */
    const s=E.io(seg(T,0,1.2)); let pitch=lerp(cam0.pitch,.1,s), yaw=lerp(cam0.yaw,0,s), x=0,y=lerp(cam0.y??-0.02,-0.02,s),z=cam0.z;
    /* lock pins: jolts */
    let jolt=0; for(const lt of TL.lock){ const u=T-lt; if(u>0&&u<.5) jolt+=Math.sin(u*70)*Math.exp(-u*9)*.012; }
    if(panel) panel.position.z=panel0-.075*E.io(seg(T,...TL.panelIn));
    /* retract, settle, rise with chain stutter */
    const r=E.io(seg(T,...TL.retract)), rEnd=T-TL.retract[1], settle=rEnd>0&&rEnd<.6?Math.sin(rEnd*50)*Math.exp(-rEnd*8)*.01:0;
    const uR=seg(T,...TL.rise), rise=E.ios(uR), stutter=uR>0&&uR<1?Math.sin(T*38)*.004*(1-uR)*Math.min(1,uR*6):0;
    door.position.set(door0.x+jolt*.5, door0.y+4.25*rise+stutter, door0.z-.5*r+settle+jolt);
    if(cyan){ cyan.position.y=cyan0+4.25*rise; cyan.intensity*=1-rise*.9; }
    if(amber) amber.intensity*=1-Math.min(.45,Math.abs(jolt)*25);
    if(ember) ember.material.emissiveIntensity*=1+rise*.6;
    if(T>TL.retract[0]) once('d1',()=>burst(70,new THREE.Vector3(0,DOOR_Y-1.9,DOOR_Z+.2),{x:2.4,y:.05,z:.1},{x:0,y:.4,z:.9}));
    if(T>TL.rise[0]) once('d2',()=>[-1,1].forEach(sd=>burst(35,new THREE.Vector3(sd*1.25,DOOR_Y-1.2,DOOR_Z+.1),{x:.1,y:1.4,z:.1},{x:sd*.2,y:.2,z:.6})));
    dustStep(dt);
    /* push-through: stride bob, level gaze, fog closes, iris to black */
    const uP=seg(T,...TL.push), pu=E.io(uP), env=Math.sin(Math.PI*uP), ph=(T-TL.push[0])*1.9*Math.PI*2;
    z=lerp(cam0.z,DOOR_Z-2.3,pu); x=Math.sin(ph/2)*.01*env; y=-0.02+Math.abs(Math.sin(ph/2))*.02*env-.006*pu; pitch=lerp(pitch,-.02,pu);
    if(T < TL.black[1]){
      camera.position.set(x+jolt*.4,y+jolt*.3,z); camera.rotation.set(pitch,yaw,0);
      scene.fog.density=.05+.28*E.ic(seg(T,TL.push[0]+1,TL.black[1]));
    }
    fade.uniforms.uFade.value = T < 12.8 ? E.io(seg(T, ...TL.black)) : Math.max(0, 1.0 - E.io(seg(T, 13.0, 14.2)));
    if(T>=TL.black[1]&&!entered){
      entered=true;
      if (canvas) canvas.style.pointerEvents = 'auto';
      if (window.VAULT) {
        window.VAULT.sceneMode = 'table';
        window.VAULT.table?.activate(0);
      }
      door.visible = false;
      window.dispatchEvent(new CustomEvent('vault:enterTable'));
      window.dispatchEvent(new CustomEvent('vault:entered'));
      onEntered?.();
    } }

  return {cinematic,begin,timeline:TL,fade};
}
