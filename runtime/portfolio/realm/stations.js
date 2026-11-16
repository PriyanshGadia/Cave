const holdPoint = .30;
const burnOutStart = .48;
const travelStart = .64;

function ease(value) {
  const t = Math.max(0, Math.min(1, value));
  return t * t * (3 - 2 * t);
}

export function mountStations(chapters) {
  const root = document.documentElement;
  const track = document.getElementById('station-track');
  const end = chapters.length - 1 + holdPoint;
  const links = [...document.querySelectorAll('#chapter-nav a')];
  let active = null;
  let lastInk = -1;

  function maxScroll() {
    return Math.max(1, track.offsetHeight - innerHeight);
  }

  function read() {
    const position = Math.min(end, Math.max(0, scrollY / maxScroll() * end));
    const index = Math.floor(position);
    const fraction = position - index;
    if (index < chapters.length - 1 && fraction >= travelStart) {
      return { index, target: index + ease((fraction - travelStart) / (1 - travelStart)), ink: 0, phase: 'move' };
    }
    if (index > 0 && fraction < .15) {
      return { index, target: index, ink: ease(fraction / .15), phase: 'burn-in' };
    }
    if (fraction >= burnOutStart) {
      return { index, target: index, ink: 1 - ease((fraction - burnOutStart) / (travelStart - burnOutStart)), phase: 'burn-out' };
    }
    return { index, target: index, ink: 1, phase: 'hold' };
  }

  function seek(id, behavior = 'instant') {
    const index = chapters.findIndex(chapter => chapter.id === id);
    if (index < 0) return false;
    const position = index === 0 ? 0 : index + holdPoint;
    scrollTo({ top: position / end * maxScroll(), behavior });
    return true;
  }

  const displacement = document.getElementById('fire-displacement');
  const noise = document.getElementById('fire-noise');
  let burn = 0;
  let time = 0;

  function step() {
    const intent = read();
    if (active && (chapters[intent.index] !== active || intent.phase === 'move')) {
      const index = chapters.indexOf(active);
      return { index, target: index, phase: 'burn-out' };
    }
    return intent;
  }

  function paint(station, progress, dt) {
    time += dt;
    const settled = Math.abs(progress - station.index) < .004;
    const visible = settled && station.phase !== 'burn-out' && station.phase !== 'move';
    burn = visible ? Math.min(1, burn + dt / .48) : Math.max(0, burn - dt / .36);
    const ink = ease(burn);
    const next = burn > 0 ? chapters[station.index] : null;
    if (active !== next) {
      if (active?.contains(document.activeElement)) document.activeElement.blur();
      chapters.forEach(chapter => {
        chapter.classList.toggle('station-visible', chapter === next);
        chapter.inert = chapter !== next;
      });
      active = next;
      links.forEach(link => {
        if (link.hash === '#' + next?.id) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
    }

    const burning = burn > 0 && burn < 1;
    root.classList.toggle('station-burning', burning);
    const level = Math.round(ink * 100);
    if (level !== lastInk) {
      lastInk = level;
      document.body.style.setProperty('--station-ink', String(level / 100));
      document.body.style.setProperty('--station-ember', (Math.sin(ink * Math.PI) * 15).toFixed(1) + 'px');
    }
    if (burning) {
      displacement?.setAttribute('scale', (Math.sin(Math.PI * ink) * 16).toFixed(2));
      noise?.setAttribute('baseFrequency', `0.018 ${(.064 + Math.sin(time * 12) * .016).toFixed(4)}`);
    }
    const phase = burning ? (visible ? 'burn-in' : 'burn-out') : visible ? 'hold' : settled ? station.phase : 'move';
    if (root.dataset.stationPhase !== phase) root.dataset.stationPhase = phase;
  }

  root.classList.add('citadel-lock');
  track.hidden = false;
  chapters.forEach(chapter => { chapter.inert = true; });
  return { read, seek, step, paint };
}
