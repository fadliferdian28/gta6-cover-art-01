// Sunset Syndicate editor wiring: six panels, each with a sample strip, an upload, a role label, a zoom
// slider and drag-to-pan on the canvas; poster text fields; grade presets; export sizes; PNG export.
import { drawCoverArt, DEFAULT_ROLES, panelAt, SIZES, getLayout } from './cover.js';
import { GRADE_KEYS, GRADES } from './grades.js';
import { afterPaint, shotConfig } from './shots.js';

const SAMPLES = ['driver', 'boss', 'mechanic', 'captain', 'rider', 'lookout', 'queen'];
const SAMPLE_LABELS = {
  driver: 'Driver', boss: 'Boss', mechanic: 'Mechanic', captain: 'Captain',
  rider: 'Rider', lookout: 'Lookout', queen: 'Queen',
};

const state = {
  mode: 'landscape',
  grade: 'sunset',
  title: 'SUNSET SYNDICATE',
  subtitle: 'every crew has its sunset',
  quote: 'THE COOLEST CREW ON THE COAST',
  quoteSource: 'THE SUNSET HERALD',
  tagline: 'ONE CREW · ONE COAST · ONE LAST SCORE',
  credits: 'A NEON REEF PICTURES PRODUCTION · STARRING YOU AND YOUR CREW\nSHOT ON YOUR OWN CAMERA · GRADED AT SUNSET',
  panels: DEFAULT_ROLES.map((role, i) => ({
    img: null, sample: SAMPLES[i], role, zoom: 1, panX: 0, panY: [0, -0.35, -0.25, 0, 0, 0][i],
  })),
  selected: 0,
  showSelection: true,
};

const canvas = document.getElementById('cover');
const status = document.getElementById('status');
const dims = document.getElementById('dims');
const panelsHost = document.getElementById('panels');
const gradesHost = document.getElementById('grades');

const images = new Map();

function setStatus(text, warn = false) {
  status.textContent = text;
  status.classList.toggle('warn', warn);
}

export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load ${url}`));
    img.src = url;
  });
}

function sampleUrl(slug) {
  return `samples/${slug}.jpg`;
}

function redraw() {
  drawCoverArt(canvas, state);
}

// ---------------------------------------------------------------------------
// Panel cards

function buildPanelCard(index) {
  const card = document.createElement('div');
  card.className = 'pcard';
  card.dataset.index = String(index);
  card.innerHTML = `
    <div class="pcard-top">
      <div class="thumb" title="Choose a sample"></div>
      <div class="pcard-meta">
        <input class="role-input" type="text" maxlength="24" spellcheck="false" aria-label="Role label ${index + 1}">
        <div class="samples"></div>
      </div>
    </div>
    <div class="pcard-bottom">
      <div class="zoom-row"><span>1.0</span><input type="range" min="1" max="2" step="0.01" aria-label="Zoom panel ${index + 1}"></div>
      <label class="load">PHOTO<input type="file" accept="image/*" aria-label="Upload a photo for panel ${index + 1}"></label>
    </div>`;

  const thumb = card.querySelector('.thumb');
  const role = card.querySelector('.role-input');
  const strip = card.querySelector('.samples');
  const zoom = card.querySelector('input[type="range"]');
  const file = card.querySelector('input[type="file"]');

  SAMPLES.forEach((slug) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'sample';
    b.title = SAMPLE_LABELS[slug];
    b.dataset.slug = slug;
    b.innerHTML = `<img src="${sampleUrl(slug)}" alt="${SAMPLE_LABELS[slug]} sample">`;
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      chooseSample(index, slug);
    });
    strip.append(b);
  });

  role.addEventListener('input', () => {
    state.panels[index].role = role.value;
    redraw();
  });
  zoom.addEventListener('input', () => {
    state.panels[index].zoom = Number(zoom.value);
    state.selected = index;
    syncCard(index);
    redraw();
  });
  file.addEventListener('change', async () => {
    const f = file.files && file.files[0];
    if (!f) return;
    try {
      const img = await loadImage(URL.createObjectURL(f));
      const panel = state.panels[index];
      panel.img = img;
      panel.sample = null;
      panel.zoom = 1;
      panel.panX = 0;
      panel.panY = 0;
      state.selected = index;
      syncCard(index);
      redraw();
      setStatus(`Panel ${index + 1} loaded from ${f.name}`);
    } catch {
      setStatus('That file could not be read as an image.', true);
    }
  });
  thumb.addEventListener('click', () => {
    state.selected = index;
    syncCard(index);
    redraw();
    strip.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  });
  card.addEventListener('click', () => selectPanel(index));

  card._parts = { thumb, role, strip, zoom };
  return card;
}

function selectPanel(index) {
  state.selected = index;
  document.querySelectorAll('.pcard').forEach((c) => {
    c.classList.toggle('selected', Number(c.dataset.index) === index);
  });
  redraw();
}

function syncCard(index) {
  const card = panelsHost.querySelector(`[data-index="${index}"]`);
  if (!card || !card._parts) return;
  const panel = state.panels[index];
  const { thumb, role, strip, zoom } = card._parts;
  if (document.activeElement !== role) role.value = panel.role;
  zoom.value = String(panel.zoom ?? 1);
  thumb.innerHTML = panel.img
    ? `<img src="${panel.img.src}" alt="Panel ${index + 1} photo">`
    : `<img src="${sampleUrl(panel.sample ?? SAMPLES[index])}" alt="Panel ${index + 1} photo">`;
  strip.querySelectorAll('.sample').forEach((b) => {
    b.classList.toggle('active', !!panel.sample && b.dataset.slug === panel.sample);
  });
}

async function chooseSample(index, slug) {
  const panel = state.panels[index];
  panel.sample = slug;
  panel.zoom = 1;
  panel.panX = 0;
  panel.panY = 0;
  panel.img = await getImage(slug);
  state.selected = index;
  syncCard(index);
  selectPanel(index);
  setStatus(`${SAMPLE_LABELS[slug]} loaded into panel ${index + 1}`);
}

async function getImage(slug) {
  if (!images.has(slug)) {
    images.set(slug, await loadImage(sampleUrl(slug)));
  }
  return images.get(slug);
}

// ---------------------------------------------------------------------------
// Text fields, grades, size

const bindText = (id, key) => {
  const el = document.getElementById(id);
  el.value = state[key];
  el.addEventListener('input', () => {
    state[key] = el.value;
    redraw();
  });
};
['title', 'subtitle', 'quote', 'quoteSource', 'tagline', 'credits'].forEach((k) => bindText(k, k));

GRADE_KEYS.forEach((key) => {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = `grade${key === state.grade ? ' active' : ''}`;
  b.dataset.grade = key;
  b.textContent = GRADES[key].label;
  b.addEventListener('click', () => {
    state.grade = key;
    gradesHost.querySelectorAll('.grade').forEach((g) => g.classList.toggle('active', g.dataset.grade === key));
    redraw();
  });
  gradesHost.append(b);
});

document.getElementById('size').addEventListener('change', (e) => {
  state.mode = e.target.value;
  dims.textContent = `${SIZES[state.mode].w} × ${SIZES[state.mode].h}`;
  redraw();
});

// ---------------------------------------------------------------------------
// Drag-to-pan on the preview canvas

let drag = null;
canvas.addEventListener('pointerdown', (e) => {
  const cfg = shotConfig(new URLSearchParams(location.search));
  if (cfg) return;
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) * (canvas.width / rect.width);
  const y = (e.clientY - rect.top) * (canvas.height / rect.height);
  const index = panelAt(state.mode, x, y);
  if (index < 0) return;
  selectPanel(index);
  const panel = state.panels[index];
  drag = { index, startX: e.clientX, startY: e.clientY, panX: panel.panX, panY: panel.panY, rect };
  canvas.classList.add('dragging');
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const panel = state.panels[drag.index];
  const p = getLayout(state.mode).panels[drag.index];
  const dx = (e.clientX - drag.startX) * (canvas.width / drag.rect.width);
  const dy = (e.clientY - drag.startY) * (canvas.height / drag.rect.height);
  const overflowX = Math.max(1, p.w * 0.5);
  const overflowY = Math.max(1, p.h * 0.5);
  panel.panX = Math.max(-1, Math.min(1, drag.panX + dx / overflowX));
  panel.panY = Math.max(-1, Math.min(1, drag.panY + dy / overflowY));
  redraw();
});
const endDrag = (e) => {
  if (!drag) return;
  drag = null;
  canvas.classList.remove('dragging');
  if (e && e.pointerId !== undefined && canvas.hasPointerCapture?.(e.pointerId)) {
    canvas.releasePointerCapture(e.pointerId);
  }
};
canvas.addEventListener('pointerup', endDrag);
canvas.addEventListener('pointercancel', endDrag);
canvas.addEventListener('pointerleave', (e) => { if (drag && e.buttons === 0) endDrag(e); });

// ---------------------------------------------------------------------------
// Export

document.getElementById('export').addEventListener('click', () => {
  const prevSelection = state.showSelection;
  state.showSelection = false;
  redraw();
  const { w, h } = SIZES[state.mode];
  canvas.toBlob((blob) => {
    state.showSelection = prevSelection;
    redraw();
    if (!blob) {
      setStatus('Export failed — the browser refused the canvas.', true);
      return;
    }
    const name = `cover-${w}x${h}.png`;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    setStatus(`Saved ${name} (${Math.round(blob.size / 1024)} KB)`);
  }, 'image/png');
});

// ---------------------------------------------------------------------------
// Boot

async function bootSamples() {
  await Promise.all(SAMPLES.map(async (slug) => {
    try {
      images.set(slug, await loadImage(sampleUrl(slug)));
    } catch {
      images.set(slug, null);
    }
  }));
  state.panels.forEach((panel, i) => {
    panel.img = images.get(panel.sample) ?? null;
  });
  for (let i = 0; i < 6; i++) {
    panelsHost.append(buildPanelCard(i));
    syncCard(i);
  }
  selectPanel(0);
  dims.textContent = `${SIZES[state.mode].w} × ${SIZES[state.mode].h}`;
}

async function applyShot(cfg) {
  state.showSelection = false;
  state.mode = cfg.mode;
  if (cfg.grade && GRADE_KEYS.includes(cfg.grade)) state.grade = cfg.grade;
  for (const key of ['title', 'subtitle', 'quote', 'quoteSource', 'tagline']) {
    if (cfg[key]) state[key] = cfg[key];
  }
  if (cfg.panels) cfg.panels.forEach((slug, i) => { if (i < 6) state.panels[i].sample = slug; });
  state.panels.forEach((panel, i) => {
    panel.img = images.get(panel.sample) ?? images.get(SAMPLES[i]) ?? null;
  });
  if (cfg.shot === 'cover') {
    document.body.classList.add('shot-cover');
  } else {
    for (let i = 0; i < 6; i++) if (!panelsHost.children[i]) { panelsHost.append(buildPanelCard(i)); syncCard(i); }
    const sel = document.getElementById('size');
    sel.value = state.mode;
  }
  document.querySelectorAll('.grade').forEach((g) => g.classList.toggle('active', g.dataset.grade === state.grade));
  dims.textContent = `${SIZES[state.mode].w} × ${SIZES[state.mode].h}`;
  redraw();
  await afterPaint();
}

(async function boot() {
  const cfg = shotConfig(new URLSearchParams(location.search));
  try {
    await bootSamples();
  } catch {
    setStatus('Sample images could not be loaded; upload your own.', true);
  }
  if (cfg) {
    await applyShot(cfg);
  } else {
    redraw();
  }
})();
