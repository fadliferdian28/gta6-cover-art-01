// Sunset Syndicate — canvas compositor.
// drawCoverArt(canvas, state) paints the whole poster: graded photo panels, role tags, the striped sunset
// wordmark, script subtitle, quote bar, credits strip, barcode and the gold seal. Everything is 2D canvas,
// system fonts only, so it runs with no network at all.

import { applyGrade } from './grades.js';

export const SIZES = {
  landscape: { w: 1920, h: 1080 },
  square: { w: 1080, h: 1080 },
  portrait: { w: 1080, h: 1350 },
};

export const DEFAULT_ROLES = ['THE DRIVER', 'THE BOSS', 'THE MECHANIC', 'THE CAPTAIN', 'THE RIDER', 'THE LOOKOUT'];

const TITLE_FONT = (s) => `900 ${s}px "Arial Black", Impact, "Franklin Gothic Heavy", sans-serif`;
const SCRIPT_FONT = (s) => `italic 700 ${s}px "Brush Script MT", "Segoe Script", "Lucida Handwriting", cursive`;
const SANS = (w, s) => `${w} ${s}px "Segoe UI", Roboto, Helvetica, Arial, sans-serif`;
const HEAVY = (w, s) => `${w} ${s}px "Arial Black", Impact, "Franklin Gothic Heavy", sans-serif`;

const GOLD = '#ffc45c';
const GOLD_SOFT = '#ffd88c';

function rr(ctx, x, y, w, h, r) {
  const rad = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

function starPath(ctx, cx, cy, r, points = 5, inner = 0.44) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const rad = i % 2 === 0 ? r : r * inner;
    const a = (Math.PI / points) * i - Math.PI / 2;
    const px = cx + Math.cos(a) * rad;
    const py = cy + Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function goldStar(ctx, cx, cy, r) {
  const g = ctx.createLinearGradient(cx, cy - r, cx, cy + r);
  g.addColorStop(0, '#ffe9a8');
  g.addColorStop(0.55, GOLD);
  g.addColorStop(1, '#e08a2c');
  ctx.save();
  ctx.shadowColor = 'rgba(255, 150, 60, 0.55)';
  ctx.shadowBlur = r * 0.9;
  ctx.fillStyle = g;
  starPath(ctx, cx, cy, r);
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = 'rgba(92, 40, 8, 0.55)';
  ctx.lineWidth = Math.max(1, r * 0.09);
  starPath(ctx, cx, cy, r);
  ctx.stroke();
}

function tracked(ctx, text, x, y, spacing, align = 'left') {
  const chars = Array.from(text);
  const widths = chars.map((c) => ctx.measureText(c).width);
  const total = widths.reduce((a, b) => a + b, 0) + spacing * Math.max(0, chars.length - 1);
  let cx = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
  const prev = ctx.textAlign;
  ctx.textAlign = 'left';
  chars.forEach((c, i) => {
    ctx.fillText(c, cx, y);
    cx += widths[i] + spacing;
  });
  ctx.textAlign = prev;
  return total;
}

function ellipsis(ctx, text, maxW) {
  if (ctx.measureText(text).width <= maxW) return text;
  let out = text;
  while (out.length > 2 && ctx.measureText(out + '…').width > maxW) out = out.slice(0, -1);
  return out + '…';
}

// ---------------------------------------------------------------------------
// Layout: six panels per export size, plus the bands text sits in.

export function getLayout(mode) {
  if (mode === 'square') {
    const w = 1080;
    const h = 1080;
    const gap = 8;
    const m = 24;
    const colW = (w - 2 * m - 2 * gap) / 3;
    const row1 = { y: 72, h: 320 };
    const row2 = { y: 628, h: 310 };
    const panels = [];
    for (let r = 0; r < 2; r++) {
      for (let c = 0; c < 3; c++) {
        const row = r === 0 ? row1 : row2;
        panels.push({ x: m + c * (colW + gap), y: row.y, w: colW, h: row.h });
      }
    }
    return {
      w, h, mode, panels,
      u: 1,
      band: { y: 392, h: 236 },
      title: { cx: w / 2, cy: 486, maxW: w * 0.9, size: 100 },
      subtitleY: 574,
      taglineY: 616,
      bottomY: 946,
      seal: { x: 1000, y: 152, r: 62 },
      barcodeW: 118,
    };
  }
  if (mode === 'portrait') {
    const w = 1080;
    const h = 1350;
    const gap = 10;
    const m = 24;
    const colW = (w - 2 * m - gap) / 2;
    const top = 88;
    const bottom = 1262;
    const rowH = (bottom - top - 2 * gap) / 3;
    const panels = [];
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 2; c++) {
        panels.push({ x: m + c * (colW + gap), y: top + r * (rowH + gap), w: colW, h: rowH });
      }
    }
    return {
      w, h, mode, panels,
      u: 1,
      band: { y: 520, h: 372 },
      title: { cx: w / 2, cy: 660, maxW: w * 0.9, size: 112 },
      subtitleY: 792,
      taglineY: 844,
      bottomY: 1262,
      seal: { x: 998, y: 170, r: 62 },
      barcodeW: 118,
    };
  }
  const w = 1920;
  const h = 1080;
  const m = 34;
  const gap = 12;
  const top = 104;
  const bottom = 948;
  const rowH = (bottom - top - gap) / 2;
  const rowAFrac = [0.375, 0.29, 0.335];
  const rowBFrac = [0.295, 0.365, 0.34];
  const regionW = w - 2 * m - 2 * gap;
  const panels = [];
  for (let r = 0; r < 2; r++) {
    const fracs = r === 0 ? rowAFrac : rowBFrac;
    let x = m;
    for (let c = 0; c < 3; c++) {
      const pw = regionW * fracs[c];
      panels.push({ x, y: top + r * (rowH + gap), w: pw, h: rowH });
      x += pw + gap;
    }
  }
  return {
    w, h, mode, panels,
    u: 1,
    band: { y: 398, h: 330 },
    title: { cx: w / 2, cy: 540, maxW: w * 0.86, size: 178 },
    subtitleY: 690,
    taglineY: 748,
    bottomY: 958,
    seal: { x: 1772, y: 182, r: 84 },
    barcodeW: 150,
  };
}

export function panelAt(mode, x, y) {
  const layout = getLayout(mode);
  for (let i = 0; i < layout.panels.length; i++) {
    const p = layout.panels[i];
    if (x >= p.x && x <= p.x + p.w && y >= p.y && y <= p.y + p.h) return i;
  }
  return -1;
}

// ---------------------------------------------------------------------------
// Background and panels.

function drawBackground(ctx, layout, state) {
  const { w, h } = layout;
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, '#120a20');
  sky.addColorStop(0.46, '#241033');
  sky.addColorStop(0.76, '#3d1436');
  sky.addColorStop(1, '#53162f');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  const sun = ctx.createRadialGradient(w * 0.5, h * 0.72, 0, w * 0.5, h * 0.72, w * 0.62);
  sun.addColorStop(0, 'rgba(255, 146, 74, 0.5)');
  sun.addColorStop(0.35, 'rgba(255, 92, 128, 0.26)');
  sun.addColorStop(1, 'rgba(120, 30, 120, 0)');
  ctx.fillStyle = sun;
  ctx.fillRect(0, 0, w, h);

  // retro sun bands behind the grid
  ctx.save();
  ctx.globalAlpha = 0.16;
  ctx.fillStyle = '#ffcf7a';
  for (let i = 0; i < 7; i++) {
    const y = h * 0.2 + i * h * 0.035;
    ctx.fillRect(w * 0.06, y, w * 0.88, Math.max(2, h * 0.008));
  }
  ctx.restore();

  // horizon streaks
  ctx.save();
  ctx.globalAlpha = 0.22;
  const streak = ctx.createLinearGradient(0, h * 0.9, w, h * 0.62);
  streak.addColorStop(0, 'rgba(255, 190, 100, 0)');
  streak.addColorStop(0.5, 'rgba(255, 190, 100, 0.5)');
  streak.addColorStop(1, 'rgba(255, 120, 160, 0)');
  ctx.fillStyle = streak;
  ctx.beginPath();
  ctx.moveTo(-w * 0.1, h * 0.96);
  ctx.lineTo(w * 0.55, h * 0.68);
  ctx.lineTo(w * 0.62, h * 0.72);
  ctx.lineTo(-w * 0.04, h);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  const vig = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.28, w / 2, h / 2, Math.max(w, h) * 0.72);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(6, 2, 12, 0.72)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);
}

function drawPhoto(ctx, img, p, scale, panX, panY) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  if (!iw || !ih) return;
  const cover = Math.max(p.w / iw, p.h / ih) * scale;
  const dw = iw * cover;
  const dh = ih * cover;
  const dx = p.x + (p.w - dw) / 2 + panX * (dw - p.w) / 2;
  const dy = p.y + (p.h - dh) / 2 + panY * (dh - p.h) / 2;
  ctx.drawImage(img, dx, dy, dw, dh);
}

function drawPanel(ctx, panel, p, index, grade, layout) {
  const u = layout.u;
  ctx.save();
  rr(ctx, p.x, p.y, p.w, p.h, 5 * u);
  ctx.clip();
  ctx.fillStyle = '#170c22';
  ctx.fillRect(p.x, p.y, p.w, p.h);

  if (panel.img) {
    drawPhoto(ctx, panel.img, p, panel.zoom ?? 1, panel.panX ?? 0, panel.panY ?? 0);
    applyGrade(grade, ctx, p.x, p.y, p.w, p.h);
  } else {
    const ph = ctx.createLinearGradient(p.x, p.y, p.x + p.w, p.y + p.h);
    ph.addColorStop(0, '#3a1b46');
    ph.addColorStop(0.6, '#5a1f44');
    ph.addColorStop(1, '#8a2f3e');
    ctx.fillStyle = ph;
    ctx.fillRect(p.x, p.y, p.w, p.h);
    ctx.fillStyle = 'rgba(255, 220, 160, 0.5)';
    ctx.font = HEAVY(800, p.h * 0.28);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(index + 1), p.x + p.w / 2, p.y + p.h / 2 - 8 * u);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
  }

  // darken the foot of each panel so the tag reads
  const foot = ctx.createLinearGradient(0, p.y + p.h * 0.55, 0, p.y + p.h);
  foot.addColorStop(0, 'rgba(10, 4, 18, 0)');
  foot.addColorStop(1, 'rgba(10, 4, 18, 0.78)');
  ctx.fillStyle = foot;
  ctx.fillRect(p.x, p.y + p.h * 0.55, p.w, p.h * 0.45);

  // inner warm rim
  const rim = ctx.createLinearGradient(p.x, p.y, p.x, p.y + p.h);
  rim.addColorStop(0, 'rgba(255, 200, 120, 0.16)');
  rim.addColorStop(0.2, 'rgba(255, 200, 120, 0)');
  rim.addColorStop(1, 'rgba(255, 120, 160, 0.12)');
  ctx.fillStyle = rim;
  ctx.fillRect(p.x, p.y, p.w, p.h);
  ctx.restore();

  ctx.strokeStyle = 'rgba(255, 198, 110, 0.52)';
  ctx.lineWidth = 2 * u;
  rr(ctx, p.x + u, p.y + u, p.w - 2 * u, p.h - 2 * u, 4 * u);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255, 236, 200, 0.16)';
  ctx.lineWidth = 1;
  rr(ctx, p.x + 5 * u, p.y + 5 * u, p.w - 10 * u, p.h - 10 * u, 3 * u);
  ctx.stroke();

  const bandCy = layout.band.y + layout.band.h / 2;
  const tagTop = Math.abs(p.y - bandCy) > Math.abs((p.y + p.h) - bandCy);
  drawRoleTag(ctx, panel.role || DEFAULT_ROLES[index], p, u, tagTop, layout);
}

function drawRoleTag(ctx, role, p, u, tagTop, layout) {
  const text = (role || '').toUpperCase();
  const size = 17 * u;
  ctx.font = HEAVY(800, size);
  const label = ellipsis(ctx, text, p.w * 0.8) || DEFAULT_ROLES[0];
  const padX = 11 * u;
  const tagH = 34 * u;
  const tw = ctx.measureText(label).width + padX * 2 + 14 * u;
  const x = p.x + 14 * u;
  const y = tagTop ? p.y + 14 * u : p.y + p.h - tagH - 14 * u;

  ctx.fillStyle = 'rgba(9, 4, 15, 0.9)';
  rr(ctx, x, y, tw, tagH, 3 * u);
  ctx.fill();
  ctx.fillStyle = GOLD;
  ctx.fillRect(x, y, 4 * u, tagH);
  ctx.fillStyle = 'rgba(255, 196, 92, 0.28)';
  ctx.fillRect(x, y, tw, 1);
  ctx.fillRect(x, y + tagH - 1, tw, 1);

  ctx.fillStyle = '#ffe0a3';
  ctx.textBaseline = 'middle';
  ctx.font = HEAVY(800, size);
  tracked(ctx, label, x + padX + 6 * u, y + tagH / 2 + 0.5 * u, 1.6 * u);
  ctx.textBaseline = 'alphabetic';
}

// ---------------------------------------------------------------------------
// Top bar, title block, bottom strip, seal.

function drawHeader(ctx, layout, state) {
  const { w, u } = layout;
  const y = layout.mode === 'landscape' ? 52 : layout.mode === 'square' ? 44 : 46;
  const r = (layout.mode === 'landscape' ? 12 : 8) * u;
  const gap = (layout.mode === 'landscape' ? 32 : 22) * u;
  let x = (layout.mode === 'landscape' ? 44 : 26) * u;
  for (let i = 0; i < 5; i++) {
    goldStar(ctx, x + i * gap, y, r);
  }
  const textX = x + 4 * gap + r + 16 * u;
  const qSize = (layout.mode === 'landscape' ? 21 : 13) * u;
  ctx.font = HEAVY(800, qSize);
  ctx.fillStyle = '#fff4e2';
  const quote = (state.quote || '').toUpperCase();
  const source = (state.quoteSource || '').toUpperCase();
  const maxQuoteW = w - textX - (layout.mode === 'landscape' ? 340 : 190) * u;
  const q = ellipsis(ctx, quote, maxQuoteW);
  const qw = tracked(ctx, q, textX, y + qSize * 0.36, 1.9 * u);
  if (source) {
    ctx.font = HEAVY(800, qSize * 0.8);
    ctx.fillStyle = GOLD;
    tracked(ctx, `— ${source}`, textX + qw + 14 * u, y + qSize * 0.34, 1.4 * u);
  }

  // VOL. 1 badge
  const bw = (layout.mode === 'landscape' ? 128 : 84) * u;
  const bh = (layout.mode === 'landscape' ? 48 : 32) * u;
  const bx = w - bw - (layout.mode === 'landscape' ? 42 : 22) * u;
  const by = y - bh * 0.62;
  ctx.save();
  ctx.translate(bx + bw / 2, by + bh / 2);
  ctx.rotate(-0.055);
  const bg = ctx.createLinearGradient(-bw / 2, 0, bw / 2, 0);
  bg.addColorStop(0, '#ffdf9a');
  bg.addColorStop(0.5, '#ffc15a');
  bg.addColorStop(1, '#e89330');
  ctx.fillStyle = bg;
  rr(ctx, -bw / 2, -bh / 2, bw, bh, 4 * u);
  ctx.fill();
  ctx.strokeStyle = 'rgba(58, 24, 4, 0.6)';
  ctx.lineWidth = 1.5 * u;
  rr(ctx, -bw / 2 + 2 * u, -bh / 2 + 2 * u, bw - 4 * u, bh - 4 * u, 3 * u);
  ctx.stroke();
  ctx.fillStyle = '#2c1206';
  ctx.font = HEAVY(900, (layout.mode === 'landscape' ? 24 : 16) * u);
  ctx.textBaseline = 'middle';
  tracked(ctx, 'VOL. 1', 0, 1 * u, 1.2 * u, 'center');
  ctx.textBaseline = 'alphabetic';
  ctx.restore();
}

function titleBitmap(ctx, text, size, fillStops) {
  const font = TITLE_FONT(size);
  ctx.font = font;
  const width = Math.ceil(ctx.measureText(text).width);
  const pad = Math.ceil(size * 0.34);
  const off = document.createElement('canvas');
  off.width = Math.max(8, width + pad * 2);
  off.height = Math.ceil(size * 1.62);
  const o = off.getContext('2d');
  o.font = font;
  o.textAlign = 'center';
  o.textBaseline = 'middle';
  const cx = off.width / 2;
  const cy = off.height / 2;

  const grad = o.createLinearGradient(cx - width / 2, 0, cx + width / 2, 0);
  fillStops.forEach(([at, colour]) => grad.addColorStop(at, colour));
  o.fillStyle = grad;
  o.fillText(text, cx, cy);

  // horizontal sunset stripes across the lettering
  o.globalCompositeOperation = 'source-atop';
  for (let y = 0; y < off.height; y += Math.max(6, size * 0.085)) {
    o.fillStyle = 'rgba(58, 12, 46, 0.26)';
    o.fillRect(0, y, off.width, Math.max(2, size * 0.032));
  }
  o.fillStyle = 'rgba(255, 246, 214, 0.22)';
  o.fillRect(0, 0, off.width, Math.max(2, size * 0.02));

  // outer gold ring then cream outline, both behind the fill
  o.globalCompositeOperation = 'destination-over';
  o.lineJoin = 'round';
  o.miterLimit = 2;
  o.strokeStyle = 'rgba(255, 200, 110, 0.95)';
  o.lineWidth = Math.max(6, size * 0.15);
  o.strokeText(text, cx, cy);
  o.strokeStyle = '#fff8ec';
  o.lineWidth = Math.max(4, size * 0.085);
  o.strokeText(text, cx, cy);
  o.globalCompositeOperation = 'source-over';
  return off;
}

function drawTitleBlock(ctx, layout, state) {
  const { w, u } = layout;
  const band = layout.band;

  // soft centre band behind the type
  const bandGrad = ctx.createLinearGradient(0, band.y, 0, band.y + band.h);
  bandGrad.addColorStop(0, 'rgba(12, 4, 20, 0)');
  bandGrad.addColorStop(0.24, 'rgba(12, 4, 20, 0.66)');
  bandGrad.addColorStop(0.76, 'rgba(12, 4, 20, 0.66)');
  bandGrad.addColorStop(1, 'rgba(12, 4, 20, 0)');
  ctx.fillStyle = bandGrad;
  ctx.fillRect(0, band.y, w, band.h);

  const glow = ctx.createRadialGradient(w / 2, band.y + band.h / 2, 0, w / 2, band.y + band.h / 2, w * 0.52);
  glow.addColorStop(0, 'rgba(255, 70, 140, 0.16)');
  glow.addColorStop(1, 'rgba(255, 70, 140, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, band.y, w, band.h);

  const title = (state.title || 'SUNSET SYNDICATE').toUpperCase();
  let size = layout.title.size * u;
  const maxW = layout.title.maxW;
  ctx.font = TITLE_FONT(size);
  while (size > 24 && ctx.measureText(title).width > maxW) {
    size -= Math.max(2, size * 0.02);
    ctx.font = TITLE_FONT(size);
  }
  const bitmap = titleBitmap(ctx, title, size, [
    [0, '#ffe36e'],
    [0.3, '#ffb04a'],
    [0.58, '#ff6f8f'],
    [0.8, '#d254b0'],
    [1, '#8d4bd6'],
  ]);
  const tx = layout.title.cx - bitmap.width / 2;
  const ty = layout.title.cy - bitmap.height / 2;
  ctx.save();
  ctx.shadowColor = 'rgba(255, 62, 138, 0.9)';
  ctx.shadowBlur = size * 0.42;
  ctx.drawImage(bitmap, tx, ty);
  ctx.shadowColor = 'rgba(255, 118, 176, 0.7)';
  ctx.shadowBlur = size * 0.18;
  ctx.drawImage(bitmap, tx, ty);
  ctx.restore();

  // script subtitle
  const sub = (state.subtitle || '').trim();
  if (sub) {
    const subSize = (layout.mode === 'landscape' ? 48 : layout.mode === 'square' ? 34 : 40) * u;
    ctx.save();
    ctx.font = SCRIPT_FONT(subSize);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffe9cf';
    ctx.shadowColor = 'rgba(255, 84, 150, 0.95)';
    ctx.shadowBlur = subSize * 0.55;
    const subText = ellipsis(ctx, sub, w * 0.8);
    ctx.fillText(subText, w / 2, layout.subtitleY);
    ctx.shadowBlur = subSize * 0.2;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
    ctx.fillText(subText, w / 2, layout.subtitleY - 1.5);
    ctx.restore();
  }

  // tagline ribbon
  const tag = (state.tagline || '').toUpperCase();
  if (tag) {
    const sizeT = (layout.mode === 'landscape' ? 20 : 14) * u;
    ctx.font = HEAVY(800, sizeT);
    const textW = ctx.measureText(tag).width + tag.length * 2.6 * u;
    const padX = (layout.mode === 'landscape' ? 34 : 22) * u;
    const rh = (layout.mode === 'landscape' ? 44 : 32) * u;
    const rw = Math.min(w * 0.92, textW + padX * 2);
    const rx = w / 2 - rw / 2;
    const ry = layout.taglineY - rh / 2;
    ctx.fillStyle = 'rgba(10, 4, 16, 0.92)';
    rr(ctx, rx, ry, rw, rh, 3 * u);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 196, 92, 0.75)';
    ctx.lineWidth = 1.5 * u;
    rr(ctx, rx + 3 * u, ry + 3 * u, rw - 6 * u, rh - 6 * u, 2 * u);
    ctx.stroke();
    ctx.fillStyle = GOLD_SOFT;
    ctx.textBaseline = 'middle';
    const shown = ellipsis(ctx, tag, rw - padX * 2);
    tracked(ctx, shown, w / 2, layout.taglineY + 1 * u, 2.6 * u, 'center');
    ctx.textBaseline = 'alphabetic';
  }
}

function drawBarcode(ctx, x, y, w, h, seed) {
  let s = seed | 0;
  const rand = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return (s >>> 8) / 16777216;
  };
  ctx.fillStyle = 'rgba(255, 244, 224, 0.92)';
  let cx = x;
  while (cx < x + w - 2) {
    const bw = 1 + Math.floor(rand() * 2);
    const tall = rand() > 0.3;
    if (rand() > 0.25) {
      ctx.fillRect(cx, y, bw, tall ? h : h * 0.7);
    }
    cx += bw + 1 + Math.floor(rand() * 2);
  }
  ctx.fillStyle = 'rgba(255, 196, 92, 0.9)';
  ctx.font = SANS(600, Math.max(7, h * 0.34));
  ctx.textAlign = 'center';
  const digits = String(seed).padStart(6, '0').split('').join(' ');
  ctx.fillText(digits, x + w / 2, y + h + Math.max(8, h * 0.38));
  ctx.textAlign = 'left';
}

function drawFooter(ctx, layout, state) {
  const { w, u } = layout;
  const y = layout.bottomY;
  const line = ctx.createLinearGradient(0, 0, w, 0);
  line.addColorStop(0, 'rgba(255, 196, 92, 0)');
  line.addColorStop(0.5, 'rgba(255, 196, 92, 0.7)');
  line.addColorStop(1, 'rgba(255, 196, 92, 0)');
  ctx.fillStyle = line;
  ctx.fillRect(w * 0.04, y, w * 0.92, 1.5);

  const left = (layout.mode === 'landscape' ? 46 : 24) * u;
  const base = layout.mode === 'landscape' ? y + 62 : layout.mode === 'square' ? y + 54 : y + 56;
  const csSize = (layout.mode === 'landscape' ? 23 : 15) * u;
  ctx.font = HEAVY(900, csSize);
  ctx.fillStyle = '#fff3dd';
  tracked(ctx, 'COMING SOON', left, base, (layout.mode === 'landscape' ? 7 : 4) * u);

  const creditSize = (layout.mode === 'landscape' ? 11.5 : 9) * u;
  ctx.font = HEAVY(700, creditSize);
  ctx.fillStyle = 'rgba(238, 220, 240, 0.82)';
  const lines = (state.credits || '').split('\n').filter((l) => l.trim());
  const cw = w * (layout.mode === 'landscape' ? 0.62 : 0.6);
  lines.slice(0, 2).forEach((ln, i) => {
    const txt = ellipsis(ctx, ln.trim().toUpperCase(), cw);
    tracked(ctx, txt, w / 2, base - (lines.length > 1 ? (1 - i) * (creditSize * 1.75) : 0), 1.3 * u, 'center');
  });

  const bcH = (layout.mode === 'landscape' ? 30 : 20) * u;
  const bcW = layout.barcodeW * u;
  drawBarcode(ctx, w - bcW - (layout.mode === 'landscape' ? 48 : 24) * u, y + (layout.mode === 'landscape' ? 32 : 24) * u, bcW, bcH, 82617 + (state.title || '').length * 137);
}

function drawSeal(ctx, layout) {
  const { x, y, r } = layout.seal;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.14);
  const spikes = 28;
  ctx.beginPath();
  for (let i = 0; i < spikes * 2; i++) {
    const rad = i % 2 === 0 ? r : r * 0.82;
    const a = (Math.PI / spikes) * i;
    const px = Math.cos(a) * rad;
    const py = Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  const g = ctx.createLinearGradient(0, -r, 0, r);
  g.addColorStop(0, '#ffe9ac');
  g.addColorStop(0.5, '#ffc45c');
  g.addColorStop(1, '#d8892c');
  ctx.fillStyle = g;
  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
  ctx.shadowBlur = r * 0.3;
  ctx.shadowOffsetY = r * 0.08;
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.strokeStyle = 'rgba(70, 30, 4, 0.7)';
  ctx.lineWidth = Math.max(1, r * 0.03);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(0, 0, r * 0.86, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(70, 30, 4, 0.5)';
  ctx.setLineDash([r * 0.06, r * 0.05]);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.rotate(0.14);
  ctx.fillStyle = '#33150a';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = HEAVY(900, r * 0.27);
  ctx.fillText('ORIGINAL', 0, -r * 0.2);
  ctx.font = HEAVY(900, r * 0.2);
  ctx.fillText('COVER', 0, r * 0.03);
  ctx.fillText('ART', 0, r * 0.24);
  ctx.fillStyle = 'rgba(70, 30, 4, 0.8)';
  goldStar(ctx, -r * 0.44, -r * 0.04, r * 0.075);
  goldStar(ctx, r * 0.44, -r * 0.04, r * 0.075);
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  ctx.restore();
}

function drawSelection(ctx, layout, state) {
  const i = state.selected;
  if (!(i >= 0) || !layout.panels[i]) return;
  const p = layout.panels[i];
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 210, 120, 0.95)';
  ctx.lineWidth = 3;
  ctx.setLineDash([14, 9]);
  rr(ctx, p.x + 3, p.y + 3, p.w - 6, p.h - 6, 4);
  ctx.stroke();
  ctx.setLineDash([]);
  const label = `PANEL ${i + 1} · ${Math.round((state.panels[i].zoom ?? 1) * 100)}%`;
  ctx.font = HEAVY(800, 15);
  const tw = ctx.measureText(label).width + 22;
  ctx.fillStyle = 'rgba(16, 8, 24, 0.92)';
  rr(ctx, p.x + p.w - tw - 12, p.y + 12, tw, 30, 4);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 196, 92, 0.7)';
  ctx.lineWidth = 1;
  rr(ctx, p.x + p.w - tw - 12, p.y + 12, tw, 30, 4);
  ctx.stroke();
  ctx.fillStyle = GOLD_SOFT;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, p.x + p.w - tw / 2 - 12, p.y + 27);
  ctx.restore();
}

function drawGrain(ctx, layout) {
  const { w, h } = layout;
  ctx.save();
  ctx.globalAlpha = 0.05;
  let s = 20261120;
  for (let i = 0; i < 1400; i++) {
    s = (s * 1103515245 + 12345) >>> 0;
    const x = (s % 10000) / 10000 * w;
    s = (s * 1103515245 + 12345) >>> 0;
    const y = (s % 10000) / 10000 * h;
    ctx.fillStyle = i % 3 === 0 ? '#ffe7c0' : '#1a0a24';
    ctx.fillRect(x, y, 1.6, 1.6);
  }
  ctx.restore();
}

/** Paints the full cover at the size for state.mode. Safe to call on every input event. */
export function drawCoverArt(canvas, state) {
  const layout = getLayout(state.mode);
  if (canvas.width !== layout.w || canvas.height !== layout.h) {
    canvas.width = layout.w;
    canvas.height = layout.h;
  }
  const ctx = canvas.getContext('2d');
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, layout.w, layout.h);
  drawBackground(ctx, layout, state);

  state.panels.forEach((panel, i) => {
    drawPanel(ctx, panel, layout.panels[i], i, state.grade, layout);
  });

  drawHeader(ctx, layout, state);
  drawTitleBlock(ctx, layout, state);
  drawFooter(ctx, layout, state);
  drawSeal(ctx, layout);
  if (state.showSelection) drawSelection(ctx, layout, state);
  drawGrain(ctx, layout);
  return layout;
}
