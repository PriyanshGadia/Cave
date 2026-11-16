// Dynamic compass cursor with dust particle trails
export function createCompassCursor() {
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;

  const style = document.createElement('style');
  style.textContent = `
    #got-compass-cursor, #astrolabe-cursor {
      position: fixed;
      left: 0;
      top: 0;
      width: 44px;
      height: 44px;
      pointer-events: none !important;
      z-index: 99999;
      will-change: transform;
    }
    .compass-reticle-center {
      position: absolute;
      left: -22px;
      top: -22px;
      width: 44px;
      height: 44px;
      pointer-events: none !important;
      transition: transform 0.16s ease-out;
    }
    #got-compass-cursor .compass-svg {
      transition: transform .22s ease, filter .22s ease;
    }
    #got-compass-cursor.is-hovering .compass-reticle-center {
      transform: scale(1.18);
    }
    #got-compass-cursor.is-hovering .compass-svg {
      transform: scale(1.22) rotate(45deg);
      filter: drop-shadow(0 0 10px #e5c386);
    }
    .pulse-click {
      animation: compassClickPulse 0.38s ease-out forwards;
    }
    @keyframes compassClickPulse {
      0% { transform: scale(0.85); }
      50% { transform: scale(1.35); }
      100% { transform: scale(1.0); }
    }
    @media (hover: none), (pointer: coarse) {
      #got-compass-cursor, #cursor-dust-canvas {
        display: none !important;
      }
    }
  `;
  document.head.appendChild(style);

  if (finePointer) {
    document.body.style.setProperty('cursor', 'none', 'important');
    const glCanvas = document.getElementById('artifact-canvas') || document.getElementById('gl-canvas');
    if (glCanvas) glCanvas.style.setProperty('cursor', 'none', 'important');
  }

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
      <svg class="compass-svg" viewBox="0 0 44 44" width="44" height="44">
        <circle class="compass-outer-ring" cx="22" cy="22" r="18" fill="none" stroke="rgba(216,174,88,0.75)" stroke-width="1.3" stroke-dasharray="3 2"/>
        <circle class="compass-inner-ring" cx="22" cy="22" r="12" fill="none" stroke="rgba(245,212,135,0.52)" stroke-width="1.0"/>
        <path class="compass-star" d="M22 3 L24.6 19.4 L41 22 L24.6 24.6 L22 41 L19.4 24.6 L3 22 L19.4 19.4 Z"
              fill="rgba(235,190,98,0.90)" stroke="#120d07" stroke-width="0.8"/>
        <circle class="compass-core-dot" cx="22" cy="22" r="2.8" fill="#fff6d6"/>
      </svg>
      <div class="compass-click-ring"></div>
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
  let hoveringLink = false;
  el.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0)`;

  const particles = [];
  function spawnDust(x, y, count = 2, burst = false) {
    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = burst ? 1.4 + Math.random() * 4.0 : 0.25 + Math.random() * 1.1;
      particles.push({
        x: x + (Math.random() - 0.5) * 4,
        y: y + (Math.random() - 0.5) * 4,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd - (burst ? 0.25 : 0.4),
        size: burst ? 1.8 + Math.random() * 2.4 : 1.1 + Math.random() * 1.6,
        alpha: burst ? 1.0 : 0.75,
        decay: burst ? 0.022 + Math.random() * 0.016 : 0.032 + Math.random() * 0.02,
        hue: hoveringLink ? 45 + Math.random() * 10 : 38 + Math.random() * 14,
      });
    }
    if (particles.length > 160) particles.splice(0, particles.length - 160);
  }

  const applyHoverVisuals = isHover => {
    hoveringLink = Boolean(isHover);
    if (hoveringLink) {
      el.classList.add('is-hovering');
      if (outerRing) outerRing.setAttribute('stroke', 'rgba(247, 219, 148, 0.95)');
      if (innerRing) innerRing.setAttribute('stroke', 'rgba(255, 238, 185, 0.85)');
      if (compassStar) compassStar.setAttribute('fill', 'rgba(245, 205, 118, 0.95)');
      if (coreDot) coreDot.setAttribute('fill', '#ffffff');
    } else {
      el.classList.remove('is-hovering');
      if (outerRing) outerRing.setAttribute('stroke', 'rgba(216, 174, 88, 0.75)');
      if (innerRing) innerRing.setAttribute('stroke', 'rgba(245, 212, 135, 0.52)');
      if (compassStar) compassStar.setAttribute('fill', 'rgba(235, 190, 98, 0.90)');
      if (coreDot) coreDot.setAttribute('fill', '#fff6d6');
    }
  };

  window.addEventListener(
    'pointermove',
    e => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      el.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0)`;

      const targetEl = e.target;
      if (
        targetEl &&
        targetEl.closest &&
        targetEl.closest('a, button, [role="button"], [data-slot], [data-day], [data-month], input, select, textarea, label')
      ) {
        applyHoverVisuals(true);
      } else {
        applyHoverVisuals(false);
      }

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
      mouseX = e.clientX;
      mouseY = e.clientY;
      el.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0)`;
      reticleCenter.classList.remove('pulse-click');
      void reticleCenter.offsetWidth;
      reticleCenter.classList.add('pulse-click');
      spawnDust(mouseX, mouseY, 26, true);
    },
    { passive: true },
  );

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
    setHover(isHovering) {
      applyHoverVisuals(isHovering);
    },
  };
}
