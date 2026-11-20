// Colour grades for Sunset Syndicate. Each preset paints a translucent overlay inside a panel's clipped rect,
// mixing gradients with canvas composite operations so every photo lands in the same dusk palette.
// apply(ctx, x, y, w, h) is called with the context already clipped to the panel.

function shade(ctx, x, y, w, h, angle, stops) {
  const cx = x + w / 2;
  const cy = y + h / 2;
  const len = Math.hypot(w, h) / 2;
  const g = ctx.createLinearGradient(
    cx - Math.cos(angle) * len, cy - Math.sin(angle) * len,
    cx + Math.cos(angle) * len, cy + Math.sin(angle) * len,
  );
  for (const [at, color] of stops) g.addColorStop(at, color);
  return g;
}

function glow(ctx, x, y, w, h, cx, cy, r, color) {
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
}

const sunset = {
  label: 'Sunset',
  apply(ctx, x, y, w, h) {
    ctx.save();
    ctx.globalCompositeOperation = 'soft-light';
    ctx.fillStyle = shade(ctx, x, y, w, h, -Math.PI / 2.2, [
      [0, 'rgba(255, 206, 108, 0.85)'],
      [0.46, 'rgba(240, 116, 88, 0.7)'],
      [0.78, 'rgba(196, 56, 124, 0.78)'],
      [1, 'rgba(78, 30, 118, 0.85)'],
    ]);
    ctx.fillRect(x, y, w, h);
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = shade(ctx, x, y, w, h, Math.PI / 2, [
      [0, 'rgba(255, 236, 214, 0)'],
      [0.62, 'rgba(255, 214, 190, 0.06)'],
      [1, 'rgba(150, 46, 104, 0.5)'],
    ]);
    ctx.fillRect(x, y, w, h);
    glow(ctx, x, y, w, h, x + w * 0.76, y + h * 0.18, Math.max(w, h) * 0.6, 'rgba(255, 208, 130, 0.32)');
    ctx.restore();
  },
};

const neon = {
  label: 'Neon',
  apply(ctx, x, y, w, h) {
    ctx.save();
    ctx.globalCompositeOperation = 'saturation';
    ctx.fillStyle = 'rgba(128, 128, 128, 0.55)';
    ctx.fillRect(x, y, w, h);
    ctx.globalCompositeOperation = 'color';
    ctx.fillStyle = shade(ctx, x, y, w, h, Math.PI / 2.6, [
      [0, 'rgba(64, 210, 255, 0.75)'],
      [0.44, 'rgba(132, 92, 255, 0.7)'],
      [0.72, 'rgba(255, 72, 168, 0.8)'],
      [1, 'rgba(255, 116, 132, 0.72)'],
    ]);
    ctx.fillRect(x, y, w, h);
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = shade(ctx, x, y, w, h, Math.PI / 2, [
      [0, 'rgba(70, 200, 255, 0.22)'],
      [1, 'rgba(255, 60, 150, 0)'],
    ]);
    ctx.fillRect(x, y, w, h);
    glow(ctx, x, y, w, h, x + w * 0.18, y + h * 0.8, Math.max(w, h) * 0.55, 'rgba(255, 64, 172, 0.3)');
    ctx.restore();
  },
};

const golden = {
  label: 'Golden Hour',
  apply(ctx, x, y, w, h) {
    ctx.save();
    ctx.globalCompositeOperation = 'soft-light';
    ctx.fillStyle = shade(ctx, x, y, w, h, -Math.PI / 3, [
      [0, 'rgba(255, 224, 150, 0.95)'],
      [0.5, 'rgba(255, 172, 84, 0.7)'],
      [1, 'rgba(146, 66, 42, 0.8)'],
    ]);
    ctx.fillRect(x, y, w, h);
    ctx.globalCompositeOperation = 'screen';
    glow(ctx, x, y, w, h, x + w * 0.72, y + h * 0.2, Math.max(w, h) * 0.75, 'rgba(255, 196, 92, 0.34)');
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = shade(ctx, x, y, w, h, Math.PI / 2, [
      [0, 'rgba(255, 244, 222, 0)'],
      [1, 'rgba(112, 52, 34, 0.42)'],
    ]);
    ctx.fillRect(x, y, w, h);
    ctx.restore();
  },
};

const noir = {
  label: 'Noir',
  apply(ctx, x, y, w, h) {
    ctx.save();
    ctx.globalCompositeOperation = 'saturation';
    ctx.fillStyle = 'rgba(128, 128, 128, 1)';
    ctx.fillRect(x, y, w, h);
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = shade(ctx, x, y, w, h, -Math.PI / 2.4, [
      [0, 'rgba(192, 200, 236, 0.72)'],
      [1, 'rgba(28, 22, 52, 0.92)'],
    ]);
    ctx.fillRect(x, y, w, h);
    ctx.globalCompositeOperation = 'screen';
    glow(ctx, x, y, w, h, x + w * 0.4, y + h * 0.22, Math.max(w, h) * 0.6, 'rgba(212, 224, 255, 0.22)');
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = shade(ctx, x, y, w, h, Math.PI / 2, [
      [0, 'rgba(120, 138, 190, 0.18)'],
      [1, 'rgba(10, 8, 26, 0.6)'],
    ]);
    ctx.fillRect(x, y, w, h);
    ctx.restore();
  },
};

export const GRADES = { sunset, neon, golden, noir };
export const GRADE_KEYS = Object.keys(GRADES);

export function applyGrade(key, ctx, x, y, w, h) {
  const grade = GRADES[key] ?? sunset;
  grade.apply(ctx, x, y, w, h);
}
