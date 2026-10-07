const fs = require('fs');

let code = fs.readFileSync('about.js', 'utf8');

const newCameraShots = `const CAMERA_SHOTS={
  void:{p:[0,1.4,34],t:[0,1.5,0]},
  door:{p:[0,2.0,27],t:[0,2.0,8]},
  doorGap:{p:[0,2.2,19],t:[0,2.1,0]},
  workshop:{p:[0,4.2,2],t:[0,2.4,WORLD.workshopZ-14]},
  armorWide:{p:[8,4.0,-53],t:[0,2.2,WORLD.workshopZ-19]},
  hatchLaunch:{p:[0, -2, WORLD.workshopZ-18], t:[0, 30, WORLD.workshopZ-18]},
  showcaseRail:{p:[12, 3.0, -15], t:[-6, 3.0, -40]}, // ENE looking left
  flight:{p:[10,4.0,-2],t:[0,1.2,-18]},
  formation:{p:[9,5.0,18],t:[0,1.0,-18.5]},
  distanceBeat:{p:[0, 12.0, WORLD.padZ+70], t:[0, 5.0, WORLD.padZ]},
  assembly:{p:[8.5,5.0,WORLD.padZ+20],t:[0,3.0,WORLD.padZ]},
  landing:{p:[8,3.2,WORLD.padZ+18],t:[0,2.8,WORLD.padZ]},
  floor:{p:[8,3.0,WORLD.padZ+15],t:[0,-1.8,WORLD.padZ]},
  pit:{p:[7,3.0,WORLD.padZ+11],t:[0,-10,WORLD.padZ]},
  pitLook:{p:[4, 2.0, WORLD.padZ+6], t:[0,-20,WORLD.padZ]},
  pitDescend:{p:[0, -15, WORLD.padZ], t:[0, -50, WORLD.padZ]}
};`;
code = code.replace(/const CAMERA_SHOTS=\{[\s\S]*?\};\n/, newCameraShots + '\n');

const newBuildTimeline = `function buildTimeline(){
  masterTimeline=gsap.timeline({
    paused:true,
    defaults:{ease:'none'},
    onUpdate(){
      currentProgress=masterTimeline.progress();
      setHudProgress(currentProgress);
    }
  });

  // ACT 00 // VOID
  applyCameraShot('void');
  hideAllCopy();
  gsap.set(identity,{autoAlpha:1});
  gsap.set('.identity-mark',{autoAlpha:0});
  gsap.set('.identity-name',{autoAlpha:0});
  gsap.set('.identity-rule',{width:0});
  gsap.set('.identity-sub',{autoAlpha:0});
  gsap.set(hud,{autoAlpha:0});

  // ACT 01 // IDENTITY REVEAL
  masterTimeline.to('.identity-p',{autoAlpha:1,x:0,duration:.8,ease:'power2.out'},0);
  masterTimeline.to('.identity-g',{autoAlpha:1,x:0,duration:.8,ease:'power2.out'},0);
  masterTimeline.to('.identity-p',{left:'31vw',duration:2.0,ease:'power3.inOut'},.4);
  masterTimeline.to('.identity-g',{right:'31vw',duration:2.0,ease:'power3.inOut'},.4);
  masterTimeline.to('.identity-name',{autoAlpha:1,scaleX:1,duration:1.6,ease:'expo.out'},1.5);
  masterTimeline.to('.identity-rule',{width:'38vw',duration:1.1,ease:'power2.out'},2.3);
  masterTimeline.to('.identity-sub',{autoAlpha:1,duration:.9,ease:'power2.out'},2.7);

  masterTimeline.to(identity,{autoAlpha:0,duration:1.2,ease:'power2.inOut'},5.5);
  masterTimeline.to(hud,{autoAlpha:1,duration:.7},5.7);

  // ACT 02 // EMERGENCE
  tweenCameraShot(masterTimeline,'door',6.0,3.0);
  setHud('EMERGENCE','01','X 000 / Y 002 / Z +027');
  
  // ACT 03 // DOOR REVEAL
  masterTimeline.to(lights.blood,{intensity:8,duration:1.2},7.5);
  masterTimeline.to(doorRoot.position,{z:0,duration:2.0,ease:'power3.out'},7.4);
  masterTimeline.to(scene.fog,{density:.016,duration:2.0},7.4);
  masterTimeline.to(leftDoor.scale,{x:1,y:1,z:1,duration:.1},7.4);
  masterTimeline.to(rightDoor.scale,{x:1,y:1,z:1,duration:.1},7.4);

  // ACT 04 // DOOR OPEN
  setHud('DOOR SYSTEM','04','X 000 / Y 002 / Z +019');
  masterTimeline.to(leftDoor.position,{x:-22,duration:2.2,ease:'power3.inOut'},10.0);
  masterTimeline.to(rightDoor.position,{x:22,duration:2.2,ease:'power3.inOut'},10.0);
  masterTimeline.to(lights.key,{intensity:2.2,duration:2.5},10.2);
  masterTimeline.to(lights.cyan,{intensity:7,duration:2.5},11.0);
  tweenCameraShot(masterTimeline,'doorGap',10.2,3.3);

  // ACT 05 // WORKSHOP REVEAL
  setHud('THE WORKSHOP','08','X 000 / Y 004 / Z -014');
  masterTimeline.to(lights.ambient,{intensity:.8,duration:1.8},13.3);
  masterTimeline.to(lights.blood,{intensity:3.2,duration:1.8},13.5);
  masterTimeline.to(lights.cyan,{intensity:3.5,duration:2.0},14.0);
  tweenCameraShot(masterTimeline,'workshop',13.2,4.6);
  masterTimeline.to(dustMat,{opacity:.42,duration:2.0},14.0);
  masterTimeline.to(workbench.scale,{x:1.0,y:1.0,z:1.0,duration:.5},15.0);

  // ACT 06 // ARMOR ACTIVATION & HATCH LAUNCH
  setHud('VAULT-01 // INITIALIZING','14','X 000 / Y 005 / Z -061');
  setWorkbenchPose();
  masterTimeline.to(lights.cyan,{intensity:11,duration:2.8},18.0);
  masterTimeline.to(lights.blood,{intensity:6,duration:2.8},18.0);
  
  // Components lift to hover
  for(let i=0;i<PART_ORDER.length;i++){
    const part=PART_ORDER[i];
    const group=armorGroups[part];
    const t=18.0+i*.15; 
    masterTimeline.to(group.position,{y:group.position.y+2.0,duration:.7,ease:'power2.out'},t);
    masterTimeline.to(group.rotation,{y:group.rotation.y+.18,duration:.9,ease:'sine.inOut'},t);
  }
  
  tweenCameraShot(masterTimeline,'armorWide',18.0,3.0);
  
  // Hatch Launch! Sequential vertical escape
  const hatchStart=21.5;
  tweenCameraShot(masterTimeline,'hatchLaunch',hatchStart,2.5, 'power2.in');
  for(let i=0;i<PART_ORDER.length;i++){
    const part=PART_ORDER[i];
    const group=armorGroups[part];
    const t=hatchStart+i*.2;
    masterTimeline.to(group.position,{y:group.position.y+60, z:group.position.z-10, duration:1.5,ease:'power2.in'},t);
  }

  // ACT 07 // TRANSIT SHOWCASE
  // Components travel through space ENE, occupying left half, text on right.
  const showStart=24.5;
  const showWindow=3.5;
  
  tweenCameraShot(masterTimeline,'showcaseRail',showStart, showWindow * 6);
  
  for(let i=0;i<PART_ORDER.length;i++){
    const part=PART_ORDER[i];
    const meta=PART_META[part];
    const t=showStart+i*showWindow;
    setHud(meta.index,\`1\${i}\`,\`X -\${String(i+1).padStart(3,'0')} / Y 004 / Z -008\`);
    
    const g=armorGroups[part];
    
    // Position component to enter from bottom left, travel ENE across frame
    masterTimeline.set(g.position, {x:-10, y: 1, z:-20}, t - 0.1); 
    masterTimeline.set(g.rotation, {x:0, y:meta.yaw, z:0}, t - 0.1);
    
    // Copy appears
    masterTimeline.call(()=>showCopy(part),[],t);
    
    // Travel across the left side of the screen
    masterTimeline.to(g.position, {x: 4, y: 3.5, z: -40, duration: showWindow, ease: 'power1.inOut'}, t);
    
    // Small articulation rotation
    masterTimeline.to(g.rotation, {x: .1, y: meta.yaw + .2, duration: showWindow, ease: 'sine.inOut'}, t);
    
    masterTimeline.call(()=>setWorkbenchPose(),[],t+showWindow-.02); 
  }
  hideAllCopy();

  // ACT 08 // FORMATION FLIGHT
  const flightStart=46.0;
  setHud('FORMATION FLIGHT','20','X 000 / Y 004 / Z -018');
  for(const part of PART_ORDER){
    const g=armorGroups[part];
    const p=FORMATION_POSES[part];
    masterTimeline.set(g.position, {x:p[0], y:p[1], z:p[2]+60}, flightStart-0.1);
    masterTimeline.set(g.rotation, {x:0, y:0, z:0}, flightStart-0.1);
    
    masterTimeline.to(g.position,{x:p[0],y:p[1],z:p[2],duration:2.2,ease:'power3.out'},flightStart);
    masterTimeline.to(g.scale,{x:ARMOR_SCALE,y:ARMOR_SCALE,z:ARMOR_SCALE,duration:1.2},flightStart);
  }
  tweenCameraShot(masterTimeline,'flight',flightStart,4.2);
  masterTimeline.to(lights.cyan,{intensity:14,duration:1.5},flightStart);
  masterTimeline.to(lights.blood,{intensity:4,duration:1.5},flightStart);

  // Stable flight for a moment
  tweenCameraShot(masterTimeline,'formation',50.5,4.0);

  // ACT 09 // SEQUENTIAL ASSEMBLY
  const distanceStart=55.0;
  // Shot 09A: All six at a distance before convergence
  tweenCameraShot(masterTimeline,'distanceBeat',distanceStart, 3.0, 'power2.out');
  for(const part of PART_ORDER){
    const g=armorGroups[part];
    const p=FORMATION_POSES[part];
    masterTimeline.to(g.position,{x:p[0]*4, y:p[1]*2 + 10, z:p[2]-20, duration: 2.0, ease: 'power2.out'}, distanceStart);
  }

  const assemblyStart=58.5;
  setHud('ASSEMBLY','27','X 000 / Y 003 / Z -104');
  tweenCameraShot(masterTimeline,'assembly',assemblyStart, 6.0);
  
  // Physical Staggered Assembly
  const assembleOrder = ['boots', 'legs', 'torso', 'arms', 'gauntlets', 'helmet'];
  for(let i=0;i<assembleOrder.length;i++){
    const part = assembleOrder[i];
    const g=armorGroups[part];
    const p=FINAL_POSES[part];
    const t = assemblyStart + (i * 0.8);
    
    masterTimeline.to(g.position,{x:p[0],y:p[1]+5,z:p[2]-8,duration:1.5,ease:'power4.inOut'}, t);
    masterTimeline.to(g.rotation,{x:0,y:0,z:0,duration:1.2,ease:'power3.inOut'}, t);
  }
  masterTimeline.to(lights.pad,{intensity:5.0,duration:2.0},assemblyStart+2.0);

  // ACT 10 // HEAVY DESCENT & LANDING
  const landingStart=68.0;
  setHud('LANDING','31','X 000 / Y -004 / Z -104');
  
  for(const part of PART_ORDER){
    const g=armorGroups[part];
    const p=FINAL_POSES[part];
    masterTimeline.to(g.position,{x:p[0],y:p[1],z:p[2],duration:0.4,ease:'power4.in'},landingStart);
  }
  
  tweenCameraShot(masterTimeline,'landing',landingStart, 4.0);
  
  masterTimeline.call(()=>showCopy('assembly'),[],71.0);
  masterTimeline.to(copyNodes.assembly,{autoAlpha:1,duration:1.2},71.0);
  masterTimeline.to('.assembly-rule',{width:'18vw',duration:1.0,ease:'power2.out'},71.3);

  // ACT 11 // THE QUIET FLOOR
  const floorStart=74.0;
  setHud('OBSERVATION','38','X +011 / Y -006 / Z -079');
  tweenCameraShot(masterTimeline,'floor',floorStart,5.0);
  masterTimeline.to(lights.key,{intensity:1.1,duration:2.2},floorStart);
  masterTimeline.to(lights.cyan,{intensity:1.3,duration:2.2},floorStart);
  masterTimeline.to(lights.blood,{intensity:1.5,duration:2.2},floorStart);
  masterTimeline.to(lights.pad,{intensity:2.2,duration:2.2},floorStart);
  masterTimeline.to(floorMaterial.uniforms.uPulseStrength,{value:.1,duration:2.0},floorStart+2.0);
  masterTimeline.to(physicalButton.scale,{x:1,y:1,z:1,duration:.5},floorStart+2.2);
  masterTimeline.to(copyNodes.assembly,{autoAlpha:0,duration:1.0},floorStart);
  masterTimeline.to(hud,{autoAlpha:.72,duration:1.0},floorStart);

  masterTimeline.to({}, {duration:10}, 80.0);

  window.__ABOUT_MASTER_TIMELINE__=masterTimeline;
  window.__ABOUT_VERSION__=VERSION;
}`;
code = code.replace(/function buildTimeline\(\)\{[\s\S]*?window\.__ABOUT_VERSION__=VERSION;\n\}/, newBuildTimeline);

code = code.replace(/cursor\.classList\.add\('is-hot'\);/g, '');
code = code.replace(/cursor\.classList\.remove\('is-hot'\);/g, '');

const newActivateFloor = `function activateFloor(){
  if(floorActivated||currentProgress<.88)return;
  floorActivated=true;
  physicalButton.userData.active=true;
  gsap.to(physicalButton.position,{y:WORLD.floorY+.62,duration:.14,ease:'power2.in'});
  gsap.to(buttonCore.material.uniforms.uIntensity,{value:2.5,duration:.2});
  gsap.to(floorMaterial.uniforms.uPulseStrength,{value:1.35,duration:.8,ease:'power2.out'});
  gsap.to(lights.pad,{intensity:18,duration:.8,ease:'power2.out'});
  gsap.to(lights.blood,{intensity:10,duration:1.0});
  gsap.to(camera.position,{x:8.4,y:3.5,z:WORLD.padZ+17,duration:1.7,ease:'power3.inOut',onUpdate:()=>camera.lookAt(0,-1.5,WORLD.padZ)});
  window.setTimeout(revealPit,1050);
}

function revealPit(){
  if(pitRevealed)return;
  pitRevealed=true;
  pit.visible=true;
  tunnelRoot.visible=true;
  irisRoot.visible=true;
  for(let i=0;i<irisBlades.length;i++){
    const blade=irisBlades[i];
    gsap.to(blade.rotation,{z:blade.userData.openRotation,duration:1.55,delay:i*.045,ease:'power3.inOut'});
  }
  gsap.to(pit.position,{y:0,duration:1.8,ease:'power3.out'});
  gsap.to(lights.pad,{intensity:3.5,duration:2.0});
  gsap.to(lights.blood,{intensity:20,duration:2.0});
  gsap.to(floorMaterial.uniforms.uPulseStrength,{value:2.2,duration:1.8});
  gsap.to(camera.position,{x:4,y:2.0,z:WORLD.padZ+6,duration:2.5,ease:'power3.inOut',onUpdate:()=>camera.lookAt(0,-20,WORLD.padZ)});
}

function descendPit() {
  if(!pitRevealed || transitioning) return;
  transitioning=true;
  gsap.to(camera.position,{x:0,y:-15,z:WORLD.padZ,duration:2.5,ease:'power2.in',onUpdate:()=>camera.lookAt(0,-50,WORLD.padZ)});
  window.setTimeout(enterVault, 2400);
}

window.addEventListener('click', (e) => {
  if(pitRevealed && !transitioning) {
    descendPit();
  }
});
`;

code = code.replace(/function activateFloor\(\)\{[\s\S]*?function enterVault\(\)\{/, newActivateFloor + '\\nfunction enterVault(){');

fs.writeFileSync('about.js', code);
console.log('Successfully updated about.js');
