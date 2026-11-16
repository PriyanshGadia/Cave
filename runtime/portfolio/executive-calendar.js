import {dialRadii} from './realm/calendar-engraving.js';
import {daysInMonth,daySlots,parts,validSelection} from './calendar-model.js';
const $=s=>document.querySelector(s),NS='http://www.w3.org/2000/svg',MONTHS=['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
export function initExecutiveCalendar({onChange=()=>{},onSound=()=>{}}={}){
 const local=Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC',today=parts(Date.now(),local);
 let year=+today.year,month=+today.month-1,day=+today.day,timezone=local,slots=[],feed=[],busyFeed=[],busyKnown=false,status='loading',a=null,b=null,waiting=false,dragging=false,dragMoved=false,version=0,abort=null,chosen=null,idempotency=null,reservation=null;
 const cache=new Map(),listeners=new Set(),openers=new WeakMap();let freeDays=[];let monthDrag=null,suppressMonthClick=false,handleDrag=null;let saved=[];try{saved=JSON.parse(sessionStorage.getItem('portfolio:reservations')||'[]').filter(r=>/^[a-f0-9]{64}$/.test(r.id)&&/^[a-f0-9]{48}$/.test(r.cancelToken)&&Date.parse(r.start)>Date.now()&&Date.parse(r.end)>Date.parse(r.start))}catch{}
 const persist=()=>{try{sessionStorage.setItem('portfolio:reservations',JSON.stringify(saved))}catch{}};
 const key=()=>`${year}-${String(month+1).padStart(2,'0')}`,dateLabel=()=>new Intl.DateTimeFormat('en-GB',{timeZone:'UTC',weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(new Date(Date.UTC(year,month,day,12)));
 const snapshot=()=>({year,month,day,timezone,dayCount:daysInMonth(year,month),freeDays,freeSlots:slots.map(slot=>slot.free),start:a,end:b,status,version,busyKnown,busyCount:dayEvents().filter(v=>!v.own).length,ownReservations:dayEvents().filter(v=>v.own).length});
 function emit(){version++;onChange(snapshot());listeners.forEach(fn=>fn(snapshot()))}
 function open(dialog){openers.set(dialog,document.activeElement);dialog.showModal();dialog.querySelector('button,input')?.focus()}
 function close(dialog){dialog.close();openers.get(dialog)?.focus({preventScroll:true})}
 document.querySelectorAll('dialog').forEach(d=>{d.addEventListener('cancel',()=>openers.get(d)?.focus({preventScroll:true}));d.addEventListener('keydown',e=>{if(e.key!=='Tab')return;const list=[...d.querySelectorAll('button:not(:disabled),input,textarea,select,a[href]')].filter(x=>x.getClientRects().length),first=list[0],last=list.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}})});
 document.querySelectorAll('[data-close], [data-close-dialog]').forEach(b=>b.addEventListener('click',()=>close(b.closest('dialog'))));
 document.querySelectorAll('[data-open-standard]').forEach(b=>activate(b,()=>{if($('#day-agenda').open)close($('#day-agenda'));open($('#standard-calendar'))}));
 function polar(radius,t){return [500+Math.sin(t)*radius,500-Math.cos(t)*radius]}
 const scale=500/(15.386*Math.tan(Math.PI/9));
 function wedge(i) {
  const start=i/48*Math.PI*2+.007, end=(i+1)/48*Math.PI*2-.007;
  const outer=dialRadii.timeOuter*scale, inner=dialRadii.timeInner*scale;
  return `M${polar(outer,start)} A${outer} ${outer} 0 0 1 ${polar(outer,end)} L${polar(inner,end)} A${inner} ${inner} 0 0 0 ${polar(inner,start)} Z`;
 }
 function activate(element, callback) {
  element.addEventListener('click', callback);
  if (element.namespaceURI === NS) element.addEventListener('keydown', event => {
   if (event.key !== 'Enter' && event.key !== ' ') return;
   event.preventDefault();
   callback();
  });
 }
 function etchedButton(index,count,radius,size) {
  const button=document.createElementNS(NS,'g');
  const [x,y]=polar(radius,index/count*Math.PI*2);
  button.setAttribute('transform',`translate(${x} ${y})`);
  button.setAttribute('role','button');
  button.setAttribute('tabindex','0');
  const inset=document.createElementNS(NS,'circle');
  inset.setAttribute('r',size);
  button.append(inset);
  return button;
 }
 function clearRange(){a=b=null;waiting=false;preview(null)}
 function chooseMonth(m){month=((m%12)+12)%12;day=Math.min(day,daysInMonth(year,month));clearRange();render();onSound();load()}
 function chooseDay(d){day=d;clearRange();render();onSound()}
 function changeYear(y){if(!Number.isInteger(y)||y<2020||y>2099||y===year)return;year=y;day=Math.min(day,daysInMonth(year,month));clearRange();render();load();onSound()}
 document.querySelectorAll('[data-calendar-year]').forEach(input=>{input.addEventListener('input',()=>{if(input.value.length===4)changeYear(Number(input.value))});input.addEventListener('change',()=>{changeYear(Number(input.value));input.value=year})});
 document.querySelectorAll('[data-year-step]').forEach(button=>button.addEventListener('click',()=>changeYear(year+Number(button.dataset.yearStep))));
 document.querySelectorAll('[data-month-step]').forEach(button=>button.addEventListener('click',()=>{let m=month+Number(button.dataset.monthStep),nextYear=year;if(m<0){nextYear--;m=11}if(m>11){nextYear++;m=0}if(nextYear<2020||nextYear>2099)return;year=nextYear;chooseMonth(m)}));
 $('#calendar-timezone').addEventListener('change',e=>{timezone=e.target.value==='local'?local:e.target.value;clearRange();render();load()});
 function updateRange(){const valid=a!==null&&b!==null&&validSelection(slots,a,b),lo=Math.min(a,b),hi=Math.max(a,b);const range=valid?`${slots[lo].label} – ${hi===47?'24:00':slots[hi+1].label}`:'Select a time';
  $('#seal-range').textContent=range;$('#seal-duration').textContent=valid?`${(hi-lo+1)*30} minutes · ${timezone}`:'30-minute increments';$('#range-status').textContent=valid?`${dateLabel()} · ${range} · ${(hi-lo+1)*30} minutes · ${timezone}`:'';
  $('.standard-range').textContent=$('#range-status').textContent;document.querySelectorAll('[data-reserve]').forEach(b=>{const disabled=!valid||status!=='ready';if(b.namespaceURI===NS)b.setAttribute('aria-disabled',String(disabled));else b.disabled=disabled});
  document.querySelectorAll('[data-slot]').forEach(el=>el.setAttribute('aria-pressed',String(valid&&+el.dataset.slot>=lo&&+el.dataset.slot<=hi)));document.querySelectorAll('[data-duration]').forEach(el=>{el.disabled=status!=='ready';el.setAttribute('aria-pressed',String(valid&&(hi-lo+1)*30===Number(el.dataset.duration)*60))});renderHandles(valid,lo,hi);preview(null);renderDayHub();emit();
 }
 function dayEvents(){const start=Date.parse(slots[0]?.start),end=Date.parse(slots[47]?.end);if(!Number.isFinite(start)||!Number.isFinite(end))return [];const own=saved.filter(r=>Date.parse(r.start)<end&&Date.parse(r.end)>start).map(r=>({...r,own:true}));return [...busyFeed.filter(r=>Date.parse(r.start)<end&&Date.parse(r.end)>start&&!own.some(o=>Date.parse(o.start)<=Date.parse(r.start)&&Date.parse(o.end)>=Date.parse(r.end))),...own].map(r=>({...r,start:new Date(Math.max(start,Date.parse(r.start))).toISOString(),end:new Date(Math.min(end,Date.parse(r.end))).toISOString()})).sort((a,b)=>Date.parse(a.start)-Date.parse(b.start))}
 function renderDayHub(){const events=dayEvents(),own=events.filter(e=>e.own).length,busy=events.length-own,summary=status!=='ready'?(status==='loading'?'Checking this date':'Calendar not connected')+(own?' · '+own+' yours':''):!busyKnown?'Busy details unavailable'+(own?' · '+own+' yours':''):events.length?`${busy} busy period${busy===1?'':'s'}${own?' · '+own+' yours':''}`:'No busy periods returned';$('#dial-event-summary').textContent=summary;$('#agenda-title').textContent=dateLabel();$('#agenda-status').textContent=summary+'. Availability also follows working-hours policy.';for(const parent of[$('#dial-event-list'),$('#agenda-list')]){parent.replaceChildren();for(const event of events){const li=document.createElement('li'),label=document.createElement(parent.id==='agenda-list'?'strong':'span'),fmt=instant=>new Intl.DateTimeFormat('en-GB',{timeZone:timezone,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(instant));label.textContent=`${fmt(event.start)}–${fmt(event.end)} · ${event.own?'Your reservation':'Busy'}`;li.append(label);if(parent.id==='agenda-list'&&event.own){const manage=document.createElement('button');manage.className='text-link';manage.textContent='Manage your reservation';manage.addEventListener('click',()=>{close($('#day-agenda'));$('#reservation-management').querySelector(`[data-reservation="${event.id}"]`)?.click()});li.append(manage)}parent.append(li)}}}
 document.querySelectorAll('[data-open-agenda]').forEach(b=>b.addEventListener('click',()=>{renderDayHub();open($('#day-agenda'))}));
 function preview(i){const valid=i!==null&&waiting&&a!==null&&validSelection(slots,a,i),selected=a!==null&&b!==null&&validSelection(slots,a,b),lo=valid?Math.min(a,i):Math.min(a,b),hi=valid?Math.max(a,i):Math.max(a,b);document.querySelectorAll('[data-slot]').forEach(el=>el.dataset.preview=String(valid&&+el.dataset.slot>=lo&&+el.dataset.slot<=hi));const label=valid||selected?`${slots[lo].label} – ${hi===47?'24:00':slots[hi+1].label}`:'Select a time';$('#seal-range').textContent=label;$('#seal-duration').textContent=valid?`${(hi-lo+1)*30} minutes preview`:selected?`${(hi-lo+1)*30} minutes · ${timezone}`:'30-minute increments';document.querySelectorAll('.range-preview').forEach(el=>el.textContent=valid?`${label} · ${(hi-lo+1)*30} minutes preview`:'')}
 function renderHandles(valid,lo,hi){const ring=$('#time-ring');ring.querySelectorAll('.range-handle').forEach(el=>el.remove());if(!valid)return;for(const [name,index]of [['start',lo],['end',hi]]){const circle=document.createElementNS(NS,'circle'),pos=polar(dialRadii.time*scale,(index+.5)/48*Math.PI*2);circle.setAttribute('cx',pos[0]);circle.setAttribute('cy',pos[1]);circle.setAttribute('r','17');circle.setAttribute('role','slider');circle.setAttribute('tabindex','0');circle.setAttribute('aria-label',`Adjust range ${name}`);circle.setAttribute('aria-valuemin','0');circle.setAttribute('aria-valuemax','47');circle.setAttribute('aria-valuenow',index);circle.setAttribute('aria-valuetext',slots[index].label);circle.dataset.handle=name;circle.classList.add('range-handle');circle.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();a=lo;b=hi;handleDrag=name;waiting=false});circle.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowDown','ArrowRight','ArrowUp'].includes(e.key))return;e.preventDefault();a=lo;b=hi;adjustHandle(name,Math.max(0,Math.min(47,index+(['ArrowLeft','ArrowDown'].includes(e.key)?-1:1))));ring.querySelector(`[data-handle="${name}"]`)?.focus()});ring.append(circle)}}
 function adjustHandle(name,index){const start=name==='start'?index:Math.min(a,b),end=name==='end'?index:Math.max(a,b);if(start>end||!validSelection(slots,start,end)){rangeError('That adjustment crosses unavailable time. The previous range is preserved.');return}a=start;b=end;updateRange()}
 document.querySelectorAll('[data-duration]').forEach(el=>el.addEventListener('click',()=>{const length=Number(el.dataset.duration)*2,preferred=a!==null?Math.min(a,b):0,candidates=[preferred,...Array.from({length:48},(_,i)=>i).filter(i=>i!==preferred)],start=candidates.find(i=>i+length<=48&&validSelection(slots,i,i+length-1));if(status!=='ready'||start===undefined){rangeError(`No continuous ${el.dataset.duration}-hour window is available on this date. The previous selection is unchanged. Choose another day or duration.`);return}a=start;b=start+length-1;waiting=false;updateRange();onSound()}));
 function rangeError(message){$('#range-status').textContent=message;$('.standard-range').textContent=message}
 function selectSlot(i,extend=false){if(status!=='ready'||!slots[i]?.free){rangeError(status==='ready'?'That segment is unavailable. Choose a continuous free range.':'Availability is not connected. No time is marked free.');return}
  if(extend&&a!==null){if(!validSelection(slots,a,i)){rangeError('The range crosses unavailable time. Choose adjacent free segments.');return}b=i;dragMoved=true}
  else if(a!==null && (waiting || (a!==b && i===b+Math.sign(b-a)))){if(!validSelection(slots,a,i)){rangeError('The range crosses unavailable time. The previous selection is preserved.');return}b=i;waiting=false}
  else{a=b=i;waiting=true}updateRange();onSound();
 }
 function keyboard(event,i){if(['ArrowLeft','ArrowDown','ArrowRight','ArrowUp'].includes(event.key)){event.preventDefault();const next=(i+(['ArrowLeft','ArrowDown'].includes(event.key)?-1:1)+48)%48;if(event.shiftKey)selectSlot(next,true);const target=event.currentTarget.closest('svg')?$('#time-ring').querySelector(`[data-slot="${next}"]`):$('#standard-times').querySelector(`[data-slot="${next}"]`);target?.focus({preventScroll:true})}else if(event.key===' '||event.key==='Enter'){event.preventDefault();selectSlot(i)}}
 function bindSlot(el,i){el.dataset.slot=i;el.addEventListener('keydown',e=>keyboard(e,i));el.addEventListener('pointerdown',e=>{if(!slots[i]?.free)return;dragging=true;dragMoved=false;if(e.pointerType==='mouse')e.preventDefault();selectSlot(i);el.focus({preventScroll:true})});el.addEventListener('pointerenter',()=>{if(dragging&&a!==i)selectSlot(i,true);else preview(i)});el.addEventListener('pointerleave',()=>{if(!dragging)preview(null)});el.addEventListener('click',e=>{if(e.detail===0)selectSlot(i)})}
 $('#month-ring').addEventListener('pointerdown',e=>{monthDrag={x:e.clientX,y:e.clientY};suppressMonthClick=false});
 const pointerMove=e=>{if(monthDrag){const dx=e.clientX-monthDrag.x,dy=e.clientY-monthDrag.y;if(Math.abs(dx)>45&&Math.abs(dx)>Math.abs(dy)){suppressMonthClick=true;monthDrag={x:e.clientX,y:e.clientY};chooseMonth(month+(dx>0?1:-1))}}if(handleDrag){const r=$('#horologium').getBoundingClientRect(),angle=Math.atan2(e.clientX-r.left-r.width/2,-(e.clientY-r.top-r.height/2)),i=Math.floor(((angle+Math.PI*2)%(Math.PI*2))/(Math.PI*2)*48);adjustHandle(handleDrag,i);return}if(!dragging)return;const el=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-slot]');if(el&&+el.dataset.slot!==b)selectSlot(+el.dataset.slot,true)};
 const pointerUp=()=>{monthDrag=null;handleDrag=null;setTimeout(()=>suppressMonthClick=false,50);if(dragMoved)waiting=false;dragging=false};addEventListener('pointermove',pointerMove);addEventListener('pointerup',pointerUp);addEventListener('pointercancel',pointerUp);
 function render(){const focus=document.activeElement,focusParent=focus?.parentElement?.id,focusIndex=focus?.dataset?.slot,focusDay=focus?.dataset?.day,focusMonth=focus?.dataset?.month;slots=daySlots(year,month,day,timezone,status==='ready'?feed:[]);
  if (status === 'ready' && a === null && b === null) {
    const firstFree = slots.find(slot => slot.free);
    if (firstFree) a = b = firstFree.index;
  }
  document.querySelectorAll('[data-calendar-year]').forEach(i=>{if(i!==document.activeElement)i.value=year});$('#seal-date').textContent=`${day} ${MONTHS[month]} ${year}`;$('#standard-month-label').textContent=new Intl.DateTimeFormat('en-GB',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(Date.UTC(year,month,1)));$('.standard-date-label').textContent=dateLabel();
  const months=$('#month-ring');months.replaceChildren();
  MONTHS.forEach((name,i)=>{
   const button=etchedButton(i,12,dialRadii.month*scale,29);
   button.dataset.month=i;
   button.setAttribute('aria-label',name+' '+year);
   button.setAttribute('aria-pressed',String(i===month));
   activate(button,()=>{if(!suppressMonthClick)chooseMonth(i)});
   months.append(button);
  });
  const availableDates=new Set(feed.map(s=>{const p=parts(s.start,timezone);return `${p.year}-${p.month}-${p.day}`}));freeDays=Array.from({length:daysInMonth(year,month)},(_,i)=>i+1).filter(i=>availableDates.has(`${key()}-${String(i).padStart(2,'0')}`));const days=$('#day-ring'),standard=$('#standard-days');days.replaceChildren();standard.replaceChildren();const offset=(new Date(Date.UTC(year,month,1)).getUTCDay()+6)%7;for(let i=0;i<offset;i++)standard.append(document.createElement('span'));
  for(let i=1;i<=daysInMonth(year,month);i++){for(const parent of[days,standard]){const button=parent===days?etchedButton(i-1,daysInMonth(year,month),dialRadii.day*scale,31):document.createElement('button');if(parent===standard)button.textContent=i;button.dataset.day=i;button.dataset.free=String(status==='ready'&&availableDates.has(`${key()}-${String(i).padStart(2,'0')}`));button.setAttribute('aria-label',`${i} ${MONTHS[month]} ${year}${status==='ready'?(button.dataset.free==='true'?', free times available':', no free times'): ', availability unknown'}`);button.setAttribute('aria-pressed',String(i===day));activate(button,()=>{chooseDay(i);parent.querySelector(`[data-day="${i}"]`)?.focus({preventScroll:true})});parent.append(button)}}
  const ring=$('#time-ring'),grid=$('#standard-times');ring.replaceChildren();grid.replaceChildren();for(const slot of slots){const path=document.createElementNS(NS,'path');path.setAttribute('d',wedge(slot.index));path.setAttribute('role','button');path.setAttribute('tabindex',slot.index===0?'0':'-1');path.setAttribute('aria-label',slot.label+(slot.free?' free':' unavailable'));path.setAttribute('aria-disabled',String(!slot.free));path.dataset.free=String(slot.free);path.dataset.busy=String(busyFeed.some(b=>Date.parse(b.start)<Date.parse(slot.end)&&Date.parse(b.end)>Date.parse(slot.start)));bindSlot(path,slot.index);ring.append(path);const b=document.createElement('button');b.textContent=slot.label;b.disabled=!slot.free;b.setAttribute('aria-label',slot.label+(slot.free?' free':' unavailable'));bindSlot(b,slot.index);grid.append(b)}
  $('#seal-status').textContent=status==='loading'?'Checking availability':status==='ready'?(slots.some(slot=>slot.free)?'Free slots lit':'No free slots'):'Availability offline';
  const info=$('#calendar-status');info.replaceChildren();if(status==='loading'){const s=document.createElement('span');s.className='loading-line';s.textContent='Checking this month’s availability';info.append(s)}else if(status==='ready'){info.textContent='Live availability · '+timezone+'. Private event details are never shown.'}else{info.append(document.createTextNode('Google Calendar is not connected. No availability is assumed. '));const a=document.createElement('a');a.href='mailto:gadiapriyansh@gmail.com';a.textContent='Email to arrange a time.';info.append(a);const retry=document.createElement('button');retry.className='text-link';retry.textContent='Check again';retry.addEventListener('click',()=>load(true));info.append(document.createTextNode(' '),retry)}
  updateRange();if(focusIndex!==undefined&&focusParent)document.getElementById(focusParent)?.querySelector(`[data-slot="${focusIndex}"]`)?.focus({preventScroll:true});if(focusDay&&focusParent)document.getElementById(focusParent)?.querySelector(`[data-day="${focusDay}"]`)?.focus({preventScroll:true});if(focusMonth!==undefined)months.querySelector(`[data-month="${focusMonth}"]`)?.focus({preventScroll:true});renderSaved();
 }
 let bookingClientId = null;
 let credential = null;
 let signInScript;
 const identityStatus = $('#booking-identity');
 const confirmBooking = $('#confirm-booking');
 const identityMount = $('#booking-google');

 function browserBookingId() {
  const key = 'portfolio:booking-device';
  try {
   let id = localStorage.getItem(key);
   if (!/^[0-9a-f-]{36}$/i.test(id || '')) {
    id = crypto.randomUUID();
    localStorage.setItem(key,id);
   }
   return id;
  } catch {
   return null;
  }
 }

 async function showGoogleSignIn() {
  credential = null;
  confirmBooking.disabled = true;
  identityMount.replaceChildren();
  if (!bookingClientId) {
   identityStatus.textContent = 'Online booking is unavailable. Email to arrange a meeting.';
   return;
  }
  identityStatus.textContent = 'Sign in with Google to reserve this range.';
  const clientId = bookingClientId;
  try {
   if (!window.google?.accounts?.id) {
    signInScript ??= new Promise((resolve,reject) => {
     const script = document.createElement('script');
     script.src = 'https://accounts.google.com/gsi/client';
     script.async = true;
     script.onload = resolve;
     script.onerror = () => { script.remove(); reject(new Error('Google sign-in could not load.')); };
     document.head.append(script);
    }).catch(error => { signInScript = undefined; throw error; });
    await signInScript;
   }
   if (!$('#booking-dialog').open || clientId !== bookingClientId) return;
   google.accounts.id.initialize({client_id:clientId,ux_mode:'popup',callback:response => {
    if (!$('#booking-dialog').open || $('#booking-form').hidden || !response.credential) return;
    credential = response.credential;
    confirmBooking.disabled = false;
    identityStatus.textContent = 'Google account selected. The invitation goes to that account.';
   }});
   google.accounts.id.renderButton(identityMount,{theme:'filled_black',size:'large',width:Math.min(320, Math.floor(identityMount.clientWidth)),text:'signin_with'});
  } catch {
   identityStatus.textContent = 'Google sign-in could not load. Reopen the booking form or email to arrange a meeting.';
  }
 }

 async function load(force=false){const k=key()+'|'+timezone,cached=cache.get(k);abort?.abort();if(cached&&!force&&Date.now()-cached.time<120000){feed=cached.data.slots;busyFeed=cached.data.busy;busyKnown=cached.data.busyKnown;bookingClientId=cached.data.bookingClientId;status=cached.data.status;render();return}status='loading';feed=[];busyFeed=[];busyKnown=false;bookingClientId=null;render();const controller=new AbortController();abort=controller;const timeout=setTimeout(()=>controller.abort(),12000);try{const response=await fetch(`/api/portfolio-calendar?month=${key()}&timezone=${encodeURIComponent(timezone)}`,{headers:{Accept:'application/json'},signal:controller.signal});if(!response.ok)throw Error();const data=await response.json();if(abort!==controller)return;status=data.status==='ready'?'ready':'not_configured';bookingClientId=status==='ready'&&typeof data.bookingClientId==='string'?data.bookingClientId:null;feed=status==='ready'&&Array.isArray(data.slots)?data.slots.filter(s=>Number.isFinite(Date.parse(s.start))&&Date.parse(s.end)-Date.parse(s.start)===1800000):[];busyKnown=status==='ready'&&Array.isArray(data.busy);busyFeed=busyKnown?data.busy.filter(v=>Number.isFinite(Date.parse(v.start))&&Date.parse(v.end)>Date.parse(v.start)).map(v=>({start:v.start,end:v.end})):[];if(cache.size>=12)cache.delete(cache.keys().next().value);cache.set(k,{time:Date.now(),data:{status,slots:feed,busy:busyFeed,busyKnown,bookingClientId}})}catch{if(abort!==controller)return;status='unavailable';feed=[];busyFeed=[];busyKnown=false}finally{clearTimeout(timeout);if(abort===controller)render()}}
 function beginBooking(){if(a===null||b===null||!validSelection(slots,a,b)||status!=='ready')return;chosen={start:slots[Math.min(a,b)].start,end:slots[Math.max(a,b)].end};idempotency=crypto.randomUUID();reservation=null;$('#booking-form').reset();$('#booking-form').hidden=false;$('#booking-confirmation').hidden=true;$('#booking-status').textContent='';$('#booking-time').textContent=$('#range-status').textContent;open($('#booking-dialog'));void showGoogleSignIn()}
 document.querySelectorAll('[data-reserve]').forEach(b=>activate(b,beginBooking));
 $('#booking-form').addEventListener('submit',async event=>{event.preventDefault();if(!chosen||!credential||!event.target.reportValidity())return;const device=browserBookingId();if(!device){$('#booking-status').textContent='Enable browser storage to reserve online, or email to arrange a meeting.';return}const form=new FormData(event.target),button=$('#confirm-booking');button.disabled=true;$('#booking-status').textContent='Confirming the full time range…';try{const response=await fetch('/api/portfolio-calendar',{method:'POST',headers:{'Content-Type':'application/json','Idempotency-Key':idempotency,Authorization:'Bearer '+credential,'X-Booking-Device':device},body:JSON.stringify({action:'book',...chosen,note:form.get('note'),consent:form.get('consent')==='on'}),signal:AbortSignal.timeout(20000)}),body=await response.json();if(response.status===401){await showGoogleSignIn();throw Error('Sign in with Google again to continue.')}if(response.status===429)throw Error(body.error==='booking_quota_exceeded'?'This Google account or browser has reached its daily booking limit.':'Too many requests. Try again later.');if(!response.ok||body.status!=='confirmed')throw Error(response.status===409?'Part of this range has just been taken. Choose another range.':'The reservation could not be confirmed. Retry or email me.');credential=null;identityMount.replaceChildren();reservation=body;stamp(body.id);saved=saved.filter(s=>s.id!==body.id);saved.push(body);persist();$('#booking-form').hidden=true;$('#booking-confirmation').hidden=false;$('#cancel-booking').hidden=false;$('#booking-confirmation p').textContent='The full selected range is reserved. Google Calendar will send your invitation.';$('#booking-status').textContent='';cache.clear();await load(true)}catch(e){$('#booking-status').textContent=e.message}finally{button.disabled=!credential}});
 $('#booking-dialog').addEventListener('close',()=>{credential=null;identityMount.replaceChildren();confirmBooking.disabled=true});
 function stamp(id){let seal=$('#booking-confirmation .wax-seal');if(!seal){seal=document.createElement('div');seal.className='wax-seal';seal.setAttribute('aria-hidden','true');seal.textContent='PG';$('#booking-confirmation').prepend(seal)}let reference=$('#booking-confirmation .reservation-reference');if(!reference){reference=document.createElement('p');reference.className='reservation-reference';$('#booking-confirmation').append(reference)}reference.textContent='Reservation reference: '+id}
 function renderSaved(){const root=$('#reservation-management');root.replaceChildren();for(const ref of saved){const b=document.createElement('button');b.className='text-link';b.dataset.reservation=ref.id;b.textContent='Manage reservation · '+new Intl.DateTimeFormat('en-GB',{timeZone:timezone,dateStyle:'medium',timeStyle:'short'}).format(new Date(ref.start));b.addEventListener('click',()=>{reservation=ref;stamp(ref.id);$('#booking-form').hidden=true;$('#booking-confirmation').hidden=false;$('#cancel-booking').hidden=false;$('#booking-confirmation p').textContent='This range is reserved. Cancel below if your plans change.';$('#booking-time').textContent=new Intl.DateTimeFormat('en-GB',{timeZone:timezone,dateStyle:'full',timeStyle:'short'}).format(new Date(ref.start));open($('#booking-dialog'))});root.append(b)}}
 $('#cancel-booking').addEventListener('click',async()=>{if(!reservation)return;const b=$('#cancel-booking');b.disabled=true;try{const response=await fetch('/api/portfolio-calendar',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'cancel',id:reservation.id,token:reservation.cancelToken}),signal:AbortSignal.timeout(15000)}),body=await response.json();if(!response.ok||body.status!=='cancelled')throw Error();saved=saved.filter(s=>s.id!==reservation.id);persist();$('#booking-confirmation p').textContent='The reservation is cancelled.';b.hidden=true;cache.clear();await load(true)}catch{$('#booking-confirmation p').textContent='Cancellation could not be confirmed. Retry or email gadiapriyansh@gmail.com.'}finally{b.disabled=false}});
 render();const observer=new IntersectionObserver(([e])=>{if(e.isIntersecting){observer.disconnect();load()}},{rootMargin:'400px'});observer.observe($('#schedule'));
 return {getState:snapshot,subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn)},dispose(){observer.disconnect();abort?.abort();removeEventListener('pointermove',pointerMove);removeEventListener('pointerup',pointerUp);removeEventListener('pointercancel',pointerUp)}};
}
