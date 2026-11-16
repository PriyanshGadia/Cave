// Dynamic compass cursor with multi-action reticle and dust particle trails
export function createCompassCursor() {
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;

  const style = document.createElement('style');
  style.textContent = `
    *, *::before, *::after, html, body, a, button, input, select, textarea, canvas, svg, [role="button"] {
      cursor: none !important;
    }
    #got-compass-cursor, #astrolabe-cursor {
      position: fixed;
      left: 0;
      top: 0;
      width: 48px;
      height: 48px;
      pointer-events: none !important;
      z-index: 99999;
      will-change: transform;
    }
    .compass-reticle-center {
      position: absolute;
      left: -24px;
      top: -24px;
      width: 48px;
      height: 48px;
      pointer-events: none !important;
      transition: transform 0.18s cubic-bezier(0.2, 0.8, 0.2, 1);
    }
    #got-compass-cursor .compass-svg {
      overflow: visible;
      transition: transform 0.24s cubic-bezier(0.2, 0.8, 0.2, 1), filter 0.24s ease;
    }
    /* Action: Link / Select / Clickable */
    #got-compass-cursor.is-action-link .compass-reticle-center {
      transform: scale(1.22);
    }
    #got-compass-cursor.is-action-link .compass-svg {
      transform: scale(1.2) rotate(45deg);
      filter: drop-shadow(0 0 10px rgba(245, 212, 135, 0.95)) drop-shadow(0 0 20px rgba(216, 174, 88, 0.5));
    }
    /* Action: Grab (3D Orbitable Artifacts) */
    #got-compass-cursor.is-action-grab .compass-reticle-center {
      transform: scale(1.15);
    }
    #got-compass-cursor.is-action-grab .compass-grab-brackets {
      opacity: 1;
      transform: scale(1);
    }
    /* Action: Move / Dragging (Pointer Down on 3D or dial) */
    #got-compass-cursor.is-action-move .compass-reticle-center {
      transform: scale(0.92);
    }
    #got-compass-cursor.is-action-move .compass-svg {
      transform: scale(0.95) rotate(90deg);
      filter: drop-shadow(0 0 14px rgba(255, 240, 190, 1)) drop-shadow(0 0 25px rgba(235, 190, 98, 0.7));
    }
    /* Action: Text Input */
    #got-compass-cursor.is-action-text .compass-reticle-center {
      transform: scale(1.05);
    }
    #got-compass-cursor.is-action-text .compass-text-bar {
      opacity: 1;
    }
    #got-compass-cursor.is-action-text .compass-star {
      opacity: 0.2;
    }
    /* Action: Disabled / Unavailable */
    #got-compass-cursor.is-action-disabled .compass-reticle-center {
      transform: scale(0.85);
    }
    #got-compass-cursor.is-action-disabled .compass-slash {
      opacity: 0.85;
    }
    .compass-grab-brackets, .compass-text-bar, .compass-slash {
      transition: opacity 0.2s ease, transform 0.2s ease;
      opacity: 0;
    }
    .pulse-click {
      animation: compassClickPulse 0.38s cubic-bezier(0.1, 0.9, 0.2, 1) forwards;
    }
    @keyframes compassClickPulse {
      0% { transform: scale(0.82); }
      40% { transform: scale(1.38); }
      100% { transform: scale(1.0); }
    }
    @media (hover: none), (pointer: coarse) {
      #got-compass-cursor, #cursor-dust-canvas {
        display: none !important;
      }
    }
  `;
  document.head.appendChild(style);

  // Fullscreen golden dust trail canvas
  let dustCanvas = document.getElementById('cursor-dust-canvas');
  if (!dustCanvas) {
    dustCanvas = document.createElement('canvas');
    dustCanvas.id = 'cursor-dust-canvas';
    dustCanvas.style.cssText =
      'position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none !important;z-index:99998;cursor:none !important;';
    document.body.appendChild(dustCanvas);
  }
  const ctx = dustCanvas.getContext('2d');
  let cw = window.innerWidth;
  let ch = window.innerHeight;
  const resizeDust = () => {
    cw = window.innerWidth;
    ch = window.innerHeight;
    dustCanvas.width = cw;
    dustCanvas.height = ch;
  };
  resizeDust();
  window.addEventListener('resize', resizeDust, { passive: true });

  const oldCursor = document.getElementById('astrolabe-cursor');
  if (oldCursor) oldCursor.remove();
  const oldCompass = document.getElementById('got-compass-cursor');
  if (oldCompass) oldCompass.remove();

  const el = document.createElement('div');
  el.id = 'got-compass-cursor';
  el.innerHTML = `
    <div class="compass-reticle-center">
      <svg class="compass-svg" viewBox="0 0 48 48" width="48" height="48">
        <!-- Outer Orbit Ring -->
        <circle class="compass-outer-ring" cx="24" cy="24" r="20" fill="none" stroke="rgba(216,174,88,0.78)" stroke-width="1.3" stroke-dasharray="3.5 2.5"/>
        <!-- Inner Ring -->
        <circle class="compass-inner-ring" cx="24" cy="24" r="13" fill="none" stroke="rgba(245,212,135,0.55)" stroke-width="1.0"/>
        <!-- 4-point Astrolabe Compass Star -->
        <path class="compass-star" d="M24 3 L26.8 21.2 L45 24 L26.8 26.8 L24 45 L21.2 26.8 L3 24 L21.2 21.2 Z"
              fill="rgba(235,190,98,0.92)" stroke="#120d07" stroke-width="0.8"/>
        <!-- Center Core Gem -->
        <circle class="compass-core-dot" cx="24" cy="24" r="3.2" fill="#fff9e6"/>
        
        <!-- Action Overlays -->
        <!-- Grab: 4 Orbital Brackets -->
        <g class="compass-grab-brackets">
          <path d="M14 6 A20 20 0 0 0 6 14 M34 6 A20 20 0 0 1 42 14 M42 34 A20 20 0 0 1 34 42 M6 34 A20 20 0 0 0 14 42"
                fill="none" stroke="#fff0be" stroke-width="2.2" stroke-linecap="round"/>
        </g>
        <!-- Text: Serif Alignment Bar -->
        <g class="compass-text-bar">
          <path d="M21 11 h6 M24 11 v26 M21 37 h6" stroke="#fff7db" stroke-width="1.8" stroke-linecap="square"/>
        </g>
        <!-- Disabled Slash -->
        <line class="compass-slash" x1="12" y1="36" x2="36" y2="12" stroke="#b24338" stroke-width="2.2" stroke-linecap="round"/>
      </svg>
    </div>
  `;
  document.body.appendChild(el);

  const reticleCenter = el.querySelector('.compass-reticle-center');
  const outerRing = el.querySelector('.compass-outer-ring');
  const innerRing = el.querySelector('.compass-inner-ring');
  const compassStar = el.querySelector('.compass-star');
  const coreDot = el.querySelector('.compass-core-dot');

  let mouseX = window.innerWidth * 0.5;
  let mouseY = window.innerHeight * 0.5;
  let lastX = mouseX;
  let lastY = mouseY;
  let currentAction = 'normal'; // 'normal', 'link', 'grab', 'move', 'text', 'disabled'
  let isPointerDown = false;
  el.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0)`;

  const particles = [];
  function spawnDust(x, y, count = 2, burst = false) {
    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = burst ? 1.6 + Math.random() * 4.5 : 0.3 + Math.random() * 1.2;
      particles.push({
        x: x + (Math.random() - 0.5) * 4,
        y: y + (Math.random() - 0.5) * 4,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd - (burst ? 0.3 : 0.45),
        size: burst ? 2.0 + Math.random() * 2.8 : 1.2 + Math.random() * 1.8,
        alpha: burst ? 1.0 : 0.8,
        decay: burst ? 0.022 + Math.random() * 0.016 : 0.03 + Math.random() * 0.02,
        hue: currentAction === 'link' ? 46 + Math.random() * 8 : currentAction === 'move' ? 42 + Math.random() * 10 : 38 + Math.random() * 12,
      });
    }
    if (particles.length > 180) particles.splice(0, particles.length - 180);
  }

  function setAction(action) {
    if (currentAction === action) return;
    el.classList.remove('is-action-link', 'is-action-grab', 'is-action-move', 'is-action-text', 'is-action-disabled');
    currentAction = action;
    if (action !== 'normal') {
      el.classList.add(`is-action-${action}`);
    }

    if (action === 'link') {
      outerRing.setAttribute('stroke', 'rgba(255, 226, 162, 0.95)');
      innerRing.setAttribute('stroke', 'rgba(255, 242, 201, 0.85)');
      compassStar.setAttribute('fill', 'rgba(250, 215, 130, 0.98)');
      coreDot.setAttribute('fill', '#ffffff');
    } else if (action === 'move') {
      outerRing.setAttribute('stroke', 'rgba(255, 245, 210, 1)');
      innerRing.setAttribute('stroke', 'rgba(255, 235, 175, 0.95)');
      compassStar.setAttribute('fill', 'rgba(255, 225, 140, 1)');
      coreDot.setAttribute('fill', '#ffffff');
    } else if (action === 'disabled') {
      outerRing.setAttribute('stroke', 'rgba(150, 110, 75, 0.5)');
      innerRing.setAttribute('stroke', 'rgba(120, 85, 55, 0.4)');
      compassStar.setAttribute('fill', 'rgba(140, 100, 70, 0.5)');
      coreDot.setAttribute('fill', '#b87c70');
    } else {
      outerRing.setAttribute('stroke', 'rgba(216, 174, 88, 0.78)');
      innerRing.setAttribute('stroke', 'rgba(245, 212, 135, 0.55)');
      compassStar.setAttribute('fill', 'rgba(235, 190, 98, 0.92)');
      coreDot.setAttribute('fill', '#fff9e6');
    }
  }

  function detectAction(target) {
    if (isPointerDown) return 'move';
    if (!target || !target.closest) return 'normal';

    if (target.closest('[disabled], [aria-disabled="true"], [data-free="false"], .is-disabled')) {
      return 'disabled';
    }
    if (target.closest('input, textarea, [contenteditable="true"]')) {
      return 'text';
    }
    if (target.closest('a, button, [role="button"], [data-slot], [data-day], [data-month], [data-reserve], label, .text-link')) {
      return 'link';
    }
    if (target.closest('#stage, #artifact-canvas, .artifact, .artifact-drag, .artifact-poi, canvas')) {
      return 'grab';
    }
    return 'normal';
  }

  window.addEventListener(
    'pointermove',
    e => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      el.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0)`;

      setAction(detectAction(e.target));

      const dist = Math.hypot(mouseX - lastX, mouseY - lastY);
      if (dist > 3.5) {
        spawnDust(mouseX, mouseY, dist > 18 ? 3 : 1, false);
        lastX = mouseX;
        lastY = mouseY;
      }
    },
    { passive: true },
  );

  window.addEventListener(
    'pointerdown',
    e => {
      isPointerDown = true;
      mouseX = e.clientX;
      mouseY = e.clientY;
      el.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0)`;
      setAction('move');
      reticleCenter.classList.remove('pulse-click');
      void reticleCenter.offsetWidth;
      reticleCenter.classList.add('pulse-click');
      spawnDust(mouseX, mouseY, 28, true);
    },
    { passive: true },
  );

  const onPointerEnd = e => {
    isPointerDown = false;
    setAction(detectAction(document.elementFromPoint(e.clientX, e.clientY)));
  };
  window.addEventListener('pointerup', onPointerEnd, { passive: true });
  window.addEventListener('pointercancel', onPointerEnd, { passive: true });

  function renderDust() {
    ctx.clearRect(0, 0, cw, ch);
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.95;
      p.vy *= 0.95;
      p.alpha -= p.decay;
      if (p.alpha <= 0.01) {
        particles.splice(i, 1);
        continue;
      }
      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 2.6);
      grad.addColorStop(0, `hsla(${p.hue}, 95%, 86%, ${p.alpha})`);
      grad.addColorStop(0.5, `hsla(${p.hue}, 88%, 56%, ${p.alpha * 0.6})`);
      grad.addColorStop(1, `hsla(${p.hue}, 85%, 40%, 0)`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * 2.6, 0, Math.PI * 2);
      ctx.fill();
    }
    requestAnimationFrame(renderDust);
  }
  requestAnimationFrame(renderDust);

  return {
    el,
    setAction,
  };
}
