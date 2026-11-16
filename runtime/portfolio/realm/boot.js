/** The blueprint is first-paint HTML/CSS; percentages are completed work, not a timer. */
export function createBoot(){
 const el=document.getElementById('sota-preloader'),ring=el.querySelector('.cad-progress'),percent=el.querySelector('[data-boot-percent]'),status=el.querySelector('[data-boot-status]');let progress=0,finished=false;
 percent.setAttribute('aria-hidden','true');performance.mark('about:boot-start');
 function report(value,label){if(finished)return;progress=Math.max(progress,Math.min(1,value));percent.textContent=String(Math.round(progress*100)).padStart(3,'0')+'%';ring.style.strokeDashoffset=String(628.32*(1-progress));if(label&&status.textContent!==label)status.textContent=label;el.dataset.progress=progress.toFixed(3)}
 return {report,complete(fallback=false){if(finished)return;report(1,fallback?'Portfolio ready in 2D':'The observatory is ready');finished=true;el.setAttribute('aria-busy','false');document.documentElement.classList.remove('world-preview');document.documentElement.classList.add('world-ready');el.classList.add('is-complete');performance.mark(fallback?'about:2d-ready':'about:first-scene-frame');setTimeout(()=>el.hidden=true,700)},fail(){this.complete(true)}};
}

export function yieldToPage(){return new Promise(resolve=>{if('requestIdleCallback'in window)requestIdleCallback(()=>resolve(),{timeout:35});else requestAnimationFrame(()=>resolve())})}
