import { defaultFlowTier, flowTiers } from './smooth-flow.js';

export function mountPrecisionControls({ getScene }) {
  const header = document.querySelector('.executive-nav');
  const handle = document.getElementById('taskbar-handle');
  const toggle = document.getElementById('precision-toggle');
  const status = document.getElementById('quality-status');
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  let nearEdge = false;
  let expanded = false;
  let tier = defaultFlowTier();

  function updateTaskbar() {
    const collapsed = scrollY > 90 && !nearEdge && !expanded &&
      !header.matches(':focus-within') && !header.classList.contains('menu-open');
    header.classList.toggle('is-collapsed', collapsed);
    handle.setAttribute('aria-expanded', String(!collapsed));
  }

  function pointerMoved(event) {
    if (!finePointer.matches) return;
    const near = event.clientY <= Math.max(68, header.offsetHeight);
    if (near === nearEdge) return;
    nearEdge = near;
    if (!near) expanded = false;
    updateTaskbar();
  }

  function updateToggle() {
    const { label, fps } = flowTiers[tier];
    toggle.textContent = label + ' · ' + fps + ' FPS target';
    toggle.setAttribute('aria-pressed', String(tier === 'uhd'));
    status.textContent = label + ' maximum display resolution. Motion enabled.';
  }

  handle.addEventListener('click', () => {
    expanded = header.classList.contains('is-collapsed');
    updateTaskbar();
    if (expanded) document.querySelector('.executive-nav .signature').focus({ preventScroll: true });
  });
  document.addEventListener('pointerdown', event => {
    if (!expanded || header.contains(event.target) || handle.contains(event.target)) return;
    expanded = false;
    updateTaskbar();
  });
  window.addEventListener('pointermove', pointerMoved, { passive: true });
  window.addEventListener('scroll', updateTaskbar, { passive: true });
  header.addEventListener('focusin', updateTaskbar);
  header.addEventListener('focusout', () => queueMicrotask(updateTaskbar));
  header.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    expanded = nearEdge = false;
    header.classList.remove('menu-open');
    document.getElementById('menu-toggle').setAttribute('aria-expanded', 'false');
    handle.focus({ preventScroll: true });
    updateTaskbar();
  });

  toggle.addEventListener('click', () => {
    const scene = getScene();
    if (!scene) return;
    tier = scene.setQuality(tier === 'uhd' ? 'fhd' : 'uhd');
    updateToggle();
  });

  updateTaskbar();
  updateToggle();
  return { enable: () => { toggle.disabled = false; } };
}
