import { createBoot } from './realm/boot.js';
import { initInspector } from './realm/inspector.js';
import { initExecutiveCalendar } from './executive-calendar.js';
import { mountPrecisionControls } from './realm/precision-controls.js';
import { createScore } from './realm/score.js';
import { mountStations } from './realm/stations.js';
import { clearLegacyGraphicsState } from './realm/smooth-flow.js';
import { createCompassCursor } from './realm/cursor.js';

clearLegacyGraphicsState();
const key = 'portfolio:executive';

async function initPortfolio() {
  const cursor = createCompassCursor();
  const boot = createBoot();
  const score = createScore();
  const chapters = [...document.querySelectorAll('.chapter')];
  const params = new URLSearchParams(location.search);
  const beat = params.has('beat') ? Number(params.get('beat')) : NaN;
  const motion = true;
  let scene;
  let failed = false;
  let restore = {};

  const stations = mountStations(chapters);
  const inspector = initInspector({ getScene: () => scene });
  const calendar = initExecutiveCalendar({ onSound: () => score.click() });
  window.__calendar = calendar;
  const controls = mountPrecisionControls({ getScene: () => scene });
  document.getElementById('taskbar-handle').hidden = false;

  const audio = document.getElementById('audio-toggle');
  audio.addEventListener('click', async () => {
    const enabled = await score.toggle();
    audio.textContent = enabled ? 'Audio on' : 'Audio off';
    audio.setAttribute('aria-pressed', String(enabled));
  });
  const menu = document.getElementById('menu-toggle');
  const header = document.querySelector('.executive-nav');
  function closeMenu() {
    menu.setAttribute('aria-expanded', 'false');
    header.classList.remove('menu-open');
  }
  menu.addEventListener('click', () => {
    const expanded = menu.getAttribute('aria-expanded') !== 'true';
    menu.setAttribute('aria-expanded', String(expanded));
    header.classList.toggle('menu-open', expanded);
  });
  function save() {
    const snapshot = {
      id: chapters[Math.round(stations.read().target)].id,
      scene: scene?.getSnapshot() || restore.scene,
    };
    try {
      sessionStorage.setItem(key, JSON.stringify(snapshot));
      history.replaceState({ ...history.state, executive: snapshot }, '');
    } catch {}
  }
  function fail(_tier, reason) {
    if (failed) return;
    failed = true;
    save();
    showGraphicsIssue(reason);
  }
  document.addEventListener('click', event => {
    const link = event.target.closest('a[href]');
    if (!link) return;
    if (link.getAttribute('href').startsWith('#') && chapters.some(chapter => '#' + chapter.id === link.hash)) {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      closeMenu();
      const url = new URL(location.href);
      url.hash = link.hash;
      if (url.href !== location.href) history.pushState({}, '', url);
      stations.seek(url.hash.slice(1), motion ? 'smooth' : 'instant');
      return;
    }
    save();
  });
  window.addEventListener('popstate', () => {
    stations.seek(location.hash.slice(1) || 'overview');
  });
  try {
    const nav = performance.getEntriesByType('navigation')[0]?.type;
    const referrer = document.referrer ? new URL(document.referrer) : null;
    const returning = referrer?.origin === location.origin &&
      (referrer.pathname.startsWith('/about-3d') || referrer.pathname.startsWith('/portfolio/'));
    restore = history.state?.executive ||
      ((['reload', 'back_forward'].includes(nav) || returning)
        ? JSON.parse(sessionStorage.getItem(key) || '{}') : {});
  } catch {}
  await new Promise(resolve => requestAnimationFrame(() => setTimeout(resolve, 0)));
  if (Number.isFinite(beat)) {
    scrollTo({ top: Math.max(0, Math.min(1, beat)) * (document.documentElement.scrollHeight - innerHeight), behavior: 'instant' });
  } else {
    stations.seek(location.hash.slice(1) || restore.id || 'overview');
  }
  window.addEventListener('pagehide', () => {
    if (!failed) save();
    scene?.dispose();
    calendar.dispose();
    score.dispose();
    inspector.dispose();
  });
  window.addEventListener('pageshow', event => { if (event.persisted) location.reload(); });

  const { createExecutiveScene } = await import('./executive-scene.js');
  scene = await createExecutiveScene({
    calendar, score, motion, stations,
    restore: Number.isFinite(beat) ? { time: Math.max(0, Math.min(1, beat)) * 97 } : restore.scene,
    onProgress: boot.report,
    onFailure: fail,
    onReady() {
      boot.complete();
      controls.enable();
    },
  });
  window.__executive = scene;
}

function showGraphicsIssue(reason) {
  const screen = document.getElementById('incompatible');
  screen.querySelector('[data-graphics-reason]').textContent = reason || 'WebGL could not draw the observatory.';
  document.documentElement.classList.add('citadel-incompatible');
  document.getElementById('sota-preloader').hidden = true;
  screen.hidden = false;
  screen.querySelector('a').focus();
}

initPortfolio().catch(error => showGraphicsIssue(error.message));


/* === SOTA v8.0 CROSS-DEVICE FOV ADAPTER + 48-SLOT CONTIGUOUS RANGE OAUTH CHRONOMETER === */
(function initSotaV8LaunchReadiness() {
  if (window.__sotaV8Active) return;
  window.__sotaV8Active = true;

  // 1. Generate a privacy-preserving per-device fingerprint hash (for anti-spam quota header)
  function getDeviceFingerprint() {
    const key = 'sota_device_fp_v8';
    try {
      let fp = localStorage.getItem(key);
      if (!fp) {
        const raw = [
          navigator.userAgent,
          screen.width + 'x' + screen.height,
          screen.colorDepth,
          Intl.DateTimeFormat().resolvedOptions().timeZone,
          crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2),
        ].join('|');
        let hash = 2166136261;
        for (let i = 0; i < raw.length; i++) {
          hash ^= raw.charCodeAt(i);
          hash = Math.imul(hash, 16777619);
        }
        fp = 'dfp_' + (hash >>> 0).toString(16);
        localStorage.setItem(key, fp);
      }
      return fp;
    } catch (_) {
      return 'dfp_fallback';
    }
  }

  // 2. Load Google Identity Services SDK on demand when the user reaches the Chronometer
  let gisLoaded = false;
  let visitorGoogleIdToken = null;

  function ensureGoogleIdentityServices(clientId, onVerified) {
    if (!clientId) {
      onVerified(null);
      return;
    }
    if (window.google?.accounts?.id) {
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (resp) => {
          visitorGoogleIdToken = resp.credential || null;
          onVerified(visitorGoogleIdToken);
        },
      });
      window.google.accounts.id.prompt();
      return;
    }
    if (!gisLoaded) {
      gisLoaded = true;
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => ensureGoogleIdentityServices(clientId, onVerified);
      document.head.appendChild(script);
    }
  }

  // 3. Upgrade #schedule to 48-Slot (30-Min Interval) Contiguous Range Engraved Chronometer
  function initContiguous48SlotChronometer() {
    // The experimental OAuth dial owns its entire section. Only mount it on
    // an explicitly dedicated section, since the standard dial is already live.
    const scheduleSec = document.querySelector('#schedule[data-oauth-chronometer]');
    if (!scheduleSec) return;

    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const state = {
      year: 2026,
      monthIdx: 10, // NOV
      day: 16,
      startSlot: 27, // 13:30 (slot 27 = 13:30-14:00)
      endSlot: 27,   // Contiguous range [startSlot..endSlot]; 27..30 = 13:30-15:30 (4 x 30m = 2 hrs)
      busySlots: new Set([18, 19, 24, 25, 34, 35]),
      googleClientId: null,
      oauthReady: false,
      isDraggingRange: false,
    };

    function slotToTimeStr(slotIndex) {
      const totalMins = slotIndex * 30;
      const hh = Math.floor(totalMins / 60) % 24;
      const mm = totalMins % 60;
      return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
    }

    function polar(cx, cy, r, deg) {
      const rad = ((deg - 90) * Math.PI) / 180;
      return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
    }

    function wedgePath(cx, cy, rInner, rOuter, startDeg, endDeg) {
      const p1 = polar(cx, cy, rOuter, startDeg);
      const p2 = polar(cx, cy, rOuter, endDeg);
      const p3 = polar(cx, cy, rInner, endDeg);
      const p4 = polar(cx, cy, rInner, startDeg);
      return [
        `M ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`,
        `A ${rOuter} ${rOuter} 0 0 1 ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`,
        `L ${p3.x.toFixed(2)} ${p3.y.toFixed(2)}`,
        `A ${rInner} ${rInner} 0 0 0 ${p4.x.toFixed(2)} ${p4.y.toFixed(2)}`,
        'Z',
      ].join(' ');
    }

    // Build 12 Engraved Months on Outer Gold Bezel (r = 214)
    let monthNodes = '';
    for (let m = 0; m < 12; m++) {
      const deg = m * 30;
      const pt = polar(300, 300, 214, deg);
      monthNodes += `
        <g class="engraved-month-node" data-month="${m}" style="cursor:pointer;pointer-events:all;">
          <circle cx="${pt.x.toFixed(1)}" cy="${pt.y.toFixed(1)}" r="16" fill="transparent"/>
          <text x="${pt.x.toFixed(1)}" y="${pt.y.toFixed(1)}" text-anchor="middle" dominant-baseline="middle"
                transform="rotate(${deg}, ${pt.x.toFixed(1)}, ${pt.y.toFixed(1)})"
                class="chiseled-engraving" data-month-lbl="${m}" font-size="10.8">${months[m]}</text>
        </g>
      `;
    }

    // Build 48 Half-Hour Contiguous Range Wedges on Main Slotted Gold Track (r = 152..192)
    let slotWedges = '';
    for (let s = 0; s < 48; s++) {
      const sDeg = s * 7.5;
      const eDeg = (s + 1) * 7.5;
      const midDeg = sDeg + 3.75;
      const dPath = wedgePath(300, 300, 152, 192, sDeg + 0.3, eDeg - 0.3);
      const pt = polar(300, 300, 172, midDeg);
      const showLabel = s % 2 === 0; // Label every hour on the dial, while every 30-min wedge is individually selectable
      slotWedges += `
        <g class="engraved-slot-node" data-slot="${s}" style="pointer-events:all;">
          <path d="${dPath}" class="engraved-slot-wedge" data-slot-wedge="${s}">
            <title>${slotToTimeStr(s)} – ${slotToTimeStr(s + 1)} IST (30 min)</title>
          </path>
          ${
            showLabel
              ? `<text x="${pt.x.toFixed(1)}" y="${pt.y.toFixed(1)}" text-anchor="middle" dominant-baseline="middle"
                       transform="rotate(${midDeg}, ${pt.x.toFixed(1)}, ${pt.y.toFixed(1)})"
                       class="chiseled-engraving" data-slot-lbl="${s}" font-size="8.2">${slotToTimeStr(s)}</text>`
              : ''
          }
        </g>
      `;
    }

    // Build 31 Engraved Days on Inner Silver Ring (r = 126)
    let dayNodes = '';
    for (let d = 1; d <= 31; d++) {
      const deg = ((d - 1) / 31) * 360;
      const pt = polar(300, 300, 126, deg);
      dayNodes += `
        <g class="engraved-day-node" data-day="${d}" style="cursor:pointer;pointer-events:all;">
          <circle cx="${pt.x.toFixed(1)}" cy="${pt.y.toFixed(1)}" r="9" fill="transparent"/>
          <text x="${pt.x.toFixed(1)}" y="${pt.y.toFixed(1)}" text-anchor="middle" dominant-baseline="middle"
                transform="rotate(${deg}, ${pt.x.toFixed(1)}, ${pt.y.toFixed(1)})"
                class="chiseled-engraving" data-day-lbl="${d}" font-size="8.5">${String(d).padStart(2, '0')}</text>
        </g>
      `;
    }

    scheduleSec.innerHTML = `
      <div class="sota-horologium-only" id="sota-pure-horologium">
        <svg viewBox="0 0 600 600" class="sota-horologium-svg" role="application" aria-label="48-Slot 30-Minute Range Engraved Chronometer">
          <polygon points="300,68 294,82 306,82" fill="#2b1a04" stroke="#ffe59e" stroke-width="1"/>
          <polygon points="300,532 294,518 306,518" fill="#ffe59e" stroke="#2b1a04" stroke-width="1"/>

          <g id="engraved-ring-month" style="transition: transform 0.65s cubic-bezier(0.22, 1, 0.36, 1);" transform="rotate(0, 300, 300)">
            ${monthNodes}
          </g>

          <g id="engraved-ring-hour" style="transition: transform 0.65s cubic-bezier(0.22, 1, 0.36, 1);" transform="rotate(0, 300, 300)">
            ${slotWedges}
          </g>

          <g id="engraved-ring-day" style="transition: transform 0.65s cubic-bezier(0.22, 1, 0.36, 1);" transform="rotate(0, 300, 300)">
            ${dayNodes}
          </g>

          <g id="engraved-center-seal" role="button" tabindex="0" aria-label="Confirm and Lock Selected Time Range" style="cursor:pointer;pointer-events:all;">
            <circle cx="300" cy="300" r="76" fill="transparent" stroke="rgba(42,24,4,0.45)" stroke-width="1.2" stroke-dasharray="4 3"/>
            <text x="300" y="268" text-anchor="middle" class="chiseled-engraving" font-size="8" id="engraved-status-kicker">30-MIN RANGE CHRONOMETER</text>
            <text x="300" y="291" text-anchor="middle" class="chiseled-engraving is-active" font-size="13.5" id="engraved-readout-date">16 NOV · 13:30–14:00</text>
            <text x="300" y="311" text-anchor="middle" class="chiseled-engraving" font-size="8" id="engraved-readout-sub">30 MIN (1 SLOT) · CLICK ADJACENT TO EXTEND</text>
            <text x="300" y="334" text-anchor="middle" class="chiseled-engraving is-active" font-size="8.5" id="engraved-cta-text">[ SIGN IN &amp; LOCK RANGE ]</text>
          </g>
        </svg>
      </div>
    `;

    const ringMonth = scheduleSec.querySelector('#engraved-ring-month');
    const ringHour = scheduleSec.querySelector('#engraved-ring-hour');
    const ringDay = scheduleSec.querySelector('#engraved-ring-day');
    const dateText = scheduleSec.querySelector('#engraved-readout-date');
    const subText = scheduleSec.querySelector('#engraved-readout-sub');
    const ctaText = scheduleSec.querySelector('#engraved-cta-text');

    // Attempt to extend contiguous range [startSlot..endSlot] if all slots in between are free and <= 4 slots (2 hours)
    function handleSlotSelection(clickedSlot, isDragExtend = false) {
      if (state.busySlots.has(clickedSlot)) return;

      const minCandidate = Math.min(state.startSlot, clickedSlot);
      const maxCandidate = Math.max(state.endSlot, clickedSlot);
      const candidateSpan = maxCandidate - minCandidate + 1;

      // Check if clickedSlot is adjacent or within a valid contiguous free block (up to 4 half-hour slots = 2 hours)
      let allFreeInBetween = true;
      for (let s = minCandidate; s <= maxCandidate; s++) {
        if (state.busySlots.has(s)) {
          allFreeInBetween = false;
          break;
        }
      }

      const isAdjacentOrExtending =
        clickedSlot === state.endSlot + 1 ||
        clickedSlot === state.startSlot - 1 ||
        (isDragExtend && clickedSlot >= state.startSlot);

      if (allFreeInBetween && candidateSpan <= 4 && (isAdjacentOrExtending || (clickedSlot > state.startSlot && clickedSlot <= state.startSlot + 3))) {
        state.startSlot = minCandidate;
        state.endSlot = maxCandidate;
      } else if (clickedSlot === state.endSlot && state.endSlot > state.startSlot && !isDragExtend) {
        // Clicking the tail of an existing multi-slot range trims it by 30 mins
        state.endSlot -= 1;
      } else {
        // Start a fresh 30-minute selection at clickedSlot
        state.startSlot = clickedSlot;
        state.endSlot = clickedSlot;
      }

      renderDialState();
    }

    function renderDialState() {
      const midSlot = (state.startSlot + state.endSlot) * 0.5;
      const mRot = -(state.monthIdx * 30);
      const hRot = -(midSlot * 7.5 + 3.75);
      const dRot = -(((state.day - 1) / 31) * 360);

      if (ringMonth) ringMonth.setAttribute('transform', `rotate(${mRot.toFixed(1)}, 300, 300)`);
      if (ringHour) ringHour.setAttribute('transform', `rotate(${hRot.toFixed(1)}, 300, 300)`);
      if (ringDay) ringDay.setAttribute('transform', `rotate(${dRot.toFixed(1)}, 300, 300)`);

      scheduleSec.querySelectorAll('[data-month-lbl]').forEach((el) => {
        el.classList.toggle('is-active', Number(el.dataset.monthLbl) === state.monthIdx);
      });
      scheduleSec.querySelectorAll('[data-day-lbl]').forEach((el) => {
        el.classList.toggle('is-active', Number(el.dataset.dayLbl) === state.day);
      });

      scheduleSec.querySelectorAll('[data-slot-wedge]').forEach((wedge) => {
        const s = Number(wedge.dataset.slotWedge);
        const isBusy = state.busySlots.has(s);
        const inRange = !isBusy && s >= state.startSlot && s <= state.endSlot;
        wedge.classList.toggle('is-busy', isBusy);
        wedge.classList.toggle('is-in-range', inRange);
      });

      const slotCount = state.endSlot - state.startSlot + 1;
      const durationMins = slotCount * 30;
      const rangeStr = `${slotToTimeStr(state.startSlot)}–${slotToTimeStr(state.endSlot + 1)}`;

      if (dateText) {
        dateText.textContent = `${String(state.day).padStart(2, '0')} ${months[state.monthIdx]} · ${rangeStr}`;
      }
      if (subText) {
        subText.textContent = `${durationMins} MIN (${slotCount}×30M) · CLICK NEXT SLOT TO EXTEND`;
      }

      if (typeof window.__rotateSchedule3DMechanism === 'function') {
        window.__rotateSchedule3DMechanism(state.monthIdx, state.day, midSlot);
      }
    }

    async function fetchLiveFreeBusy() {
      const dateStr = `${state.year}-${String(state.monthIdx + 1).padStart(2, '0')}-${String(state.day).padStart(2, '0')}`;
      try {
        const resp = await fetch(`/api/calendar/freebusy?date=${dateStr}`);
        if (resp.ok) {
          const data = await resp.json();
          if (Array.isArray(data.busySlots)) {
            state.busySlots = new Set(data.busySlots);
            // Ensure current selection is on a free slot
            if (state.busySlots.has(state.startSlot)) {
              for (let s = 18; s < 42; s++) {
                if (!state.busySlots.has(s)) {
                  state.startSlot = s;
                  state.endSlot = s;
                  break;
                }
              }
            }
            renderDialState();
          }
        }
      } catch (_) {}
    }

    // Wire month, day, and 48 half-hour slot click + drag range listeners
    scheduleSec.querySelectorAll('.engraved-month-node').forEach((n) => {
      n.addEventListener('click', (e) => {
        e.stopPropagation();
        state.monthIdx = Number(n.dataset.month);
        renderDialState();
        fetchLiveFreeBusy();
      });
    });

    scheduleSec.querySelectorAll('.engraved-day-node').forEach((n) => {
      n.addEventListener('click', (e) => {
        e.stopPropagation();
        state.day = Number(n.dataset.day);
        renderDialState();
        fetchLiveFreeBusy();
      });
    });

    scheduleSec.querySelectorAll('.engraved-slot-node').forEach((n) => {
      const s = Number(n.dataset.slot);
      n.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        state.isDraggingRange = true;
        handleSlotSelection(s, false);
      });
      n.addEventListener('pointerenter', () => {
        if (state.isDraggingRange) {
          handleSlotSelection(s, true);
        }
      });
    });

    window.addEventListener('pointerup', () => {
      state.isDraggingRange = false;
    });

    // Center Seal Click -> Verify Visitor via Google Sign-In & Book Contiguous Range via OAuth API
    const centerSeal = scheduleSec.querySelector('#engraved-center-seal');
    if (centerSeal) {
      centerSeal.addEventListener('click', async (e) => {
        e.stopPropagation();
        const dateStr = `${state.year}-${String(state.monthIdx + 1).padStart(2, '0')}-${String(state.day).padStart(2, '0')}`;
        const rangeStr = `${slotToTimeStr(state.startSlot)}–${slotToTimeStr(state.endSlot + 1)}`;
        const durationMins = (state.endSlot - state.startSlot + 1) * 30;

        async function executeBooking(idToken) {
          if (ctaText) ctaText.textContent = '[ LOCKING GEARS... ]';
          try {
            const resp = await fetch('/api/calendar/book', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-Device-Fingerprint': getDeviceFingerprint(),
              },
              body: JSON.stringify({
                date: dateStr,
                startSlot: state.startSlot,
                endSlot: state.endSlot,
                visitorIdToken: idToken,
                topic: `Technical / Hiring Discussion (${durationMins} min)`,
              }),
            });
            const resData = await resp.json();
            if (resp.ok && resData.ok) {
              if (ctaText) ctaText.textContent = '[ CONFIRMED · INVITE SENT ]';
              fetchLiveFreeBusy();
              return;
            }
            if (subText && resData.error) {
              subText.textContent = resData.error.slice(0, 48).toUpperCase();
            }
          } catch (_) {}
          if (ctaText) ctaText.textContent = '[ SIGN IN & LOCK RANGE ]';
        }

        if (state.googleClientId) {
          if (visitorGoogleIdToken) {
            await executeBooking(visitorGoogleIdToken);
          } else {
            ensureGoogleIdentityServices(state.googleClientId, (token) => {
              if (token) executeBooking(token);
            });
          }
        } else {
          // Fallback pre-filled Google Calendar reservation link if server env vars aren't loaded yet
          const startIso = `${state.year}${String(state.monthIdx + 1).padStart(2, '0')}${String(state.day).padStart(2, '0')}T${slotToTimeStr(state.startSlot).replace(':', '')}00`;
          const endIso = `${state.year}${String(state.monthIdx + 1).padStart(2, '0')}${String(state.day).padStart(2, '0')}T${slotToTimeStr(state.endSlot + 1).replace(':', '')}00`;
          const gcalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent('Technical Discussion — Priyansh Gadia')}&dates=${startIso}/${endIso}&ctz=Asia/Kolkata&add=gadiapriyansh@gmail.com`;
          window.open(gcalUrl, '_blank', 'noopener');
        }
      });
    }

    // Load public OAuth config & initial FreeBusy state
    fetch('/api/calendar/config')
      .then((r) => (r.ok ? r.json() : null))
      .then((cfg) => {
        if (cfg && cfg.googleClientId) {
          state.googleClientId = cfg.googleClientId;
          state.oauthReady = Boolean(cfg.oauthReady);
        }
        fetchLiveFreeBusy();
      })
      .catch(() => {});

    renderDialState();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initContiguous48SlotChronometer);
  } else {
    setTimeout(initContiguous48SlotChronometer, 60);
  }
})();
