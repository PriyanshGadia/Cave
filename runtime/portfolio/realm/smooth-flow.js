export const flowTiers = {
  uhd: { label: '4K', fps: 60, width: 3840, height: 2160 },
  fhd: { label: '1080p', fps: 45, width: 1920, height: 1080 },
};

export function defaultFlowTier() {
  return matchMedia('(pointer: coarse)').matches ? 'fhd' : 'uhd';
}

export function clearLegacyGraphicsState() {
  const url = new URL(location.href);
  url.searchParams.delete('safe');
  if (url.searchParams.get('mode') === 'incompatible') url.searchParams.delete('mode');
  try {
    if (url.href !== location.href) history.replaceState(history.state, '', url);
  } catch {}
  for (const name of ['sessionStorage', 'localStorage']) {
    try {
      for (const key of ['portfolio:citadel-failure', 'sota_citadel_fallback_stage', 'sota_fallback_reason']) {
        window[name].removeItem(key);
      }
    } catch {}
  }
}

export function createFramePacer() {
  let next;
  return {
    reset() { next = undefined; },
    take(now, fps) {
      const interval = 1000 / fps;
      if (next === undefined || now - next > interval) next = now;
      if (now + 1 < next) return false;
      next += interval;
      return true;
    },
  };
}
