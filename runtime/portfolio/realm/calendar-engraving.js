import * as T from '../../about/vendor/three.module.js';

const fullTurn = Math.PI * 2;
export const dialRadii = {month:4.95, day:3.875, time:2.65, timeInner:2.14, timeOuter:3.16};
const months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];

export function engraveCalendar(calendar, materials) {
 const faces = calendar.rings.map(ring => {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 1024;
  const context = canvas.getContext('2d');
  const map = new T.CanvasTexture(canvas);
  map.colorSpace = T.SRGBColorSpace;
  const material = new T.MeshBasicMaterial({map, transparent:true, alphaTest:.04, depthWrite:false});
  const face = new T.Mesh(new T.PlaneGeometry(11.2,11.2),material);
  face.rotation.x = -Math.PI/2;
  face.position.y = .216;
  ring.add(face);
  return {context,map};
 });

 const teeth = new T.Shape();
 for (let i=0; i<64; i++) {
  const angle=i/64*fullTurn;
  const radius=i%4===1||i%4===2 ? .225 : .179;
  const x=Math.cos(angle)*radius, y=Math.sin(angle)*radius;
  if(i) teeth.lineTo(x,y); else teeth.moveTo(x,y);
 }
 teeth.closePath();
 const bore=new T.Path();
 bore.absarc(0,0,.071,0,fullTurn,true);
 teeth.holes.push(bore);
 const gearGeometry=new T.ExtrudeGeometry(teeth,{depth:.09,bevelSize:.01,bevelThickness:.01,bevelSegments:1,curveSegments:12});
 gearGeometry.rotateX(-Math.PI/2);
 const gears=[];
 for (const [track,radius] of [3.295,4.48].entries()) {
  for(let i=0;i<10;i++) {
   const angle=i/10*fullTurn+track*.18;
   const gear=new T.Mesh(gearGeometry,i%2?materials.gold:materials.bronze);
   gear.position.set(Math.sin(angle)*radius,.055,Math.cos(angle)*radius);
   calendar.root.add(gear);
   gears.push({gear,track,angle});
  }
 }

 function paint(state) {
  const selectedStart=state.start===null?-1:Math.min(state.start,state.end);
  const selectedEnd=state.start===null?-1:Math.max(state.start,state.end);
  const entries=[
   months.map((label,i)=>({label,active:i===state.month})),
   Array.from({length:state.dayCount},(_,i)=>({label:String(i+1),active:i+1===state.day,free:state.freeDays.includes(i+1)})),
   Array.from({length:48},(_,i)=>({label:i%2===0?String(i/2).padStart(2,'0'):null,
    free:state.freeSlots[i],active:i>=selectedStart&&i<=selectedEnd}))
  ];
  faces.forEach(({context:ctx,map},track)=>{
   ctx.clearRect(0,0,1024,1024);
   ctx.save();
   ctx.translate(512,512);
   ctx.textAlign='center';
   ctx.textBaseline='middle';
   const radius=[dialRadii.month,dialRadii.day,dialRadii.time][track]*1024/11.2;
   const items=entries[track];
   ctx.font=`bold ${[25,21,17][track]}px Georgia`;
   items.forEach(({label,active,free},index)=>{
    const angle=(index+(track===2?.5:0))/items.length*fullTurn;
    ctx.save();
    ctx.rotate(angle);
    ctx.translate(0,-radius);
    if (active||free) {
     ctx.fillStyle=active?'#f9d695':'#e7b86c';
     ctx.fillRect(-2,-(track===2?37:20),4,track===2?9:5);
    }
    if(label) {
     ctx.lineWidth=3.5;
     ctx.strokeStyle='#241407';
     ctx.strokeText(label,0,1);
     ctx.fillStyle=active?'#fff1c9':'#33200f';
     if(!active) {
      ctx.shadowColor='#ffdfa2';
      ctx.shadowOffsetY=1;
     }
     ctx.fillText(label,0,0);
    } else {
     ctx.fillStyle='#38230f';
     ctx.fillRect(-1,-8,2,16);
    }
    ctx.restore();
   });
   ctx.restore();
   map.needsUpdate=true;
  });
 }

 return {paint, turn(time) {
  for (const {gear,track,angle} of gears) {
   gear.rotation.y=angle - calendar.rings[track].rotation.y*(track===0?8:12) - time*.15;
  }
 }};
}
