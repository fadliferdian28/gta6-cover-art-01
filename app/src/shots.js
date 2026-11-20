// Fixed scenes for screenshots. ?shot=cover hides the editor chrome and shows the cover alone;
// ?shot=editor shows the full editor with every sample loaded. Extra query params: size, title,
// subtitle, quote, quoteSource, tagline, grade, panels (comma-separated sample slugs).
// window.__shotReady flips true on the second animation frame after the first paint.

export function shotConfig(query) {
  const shot = query.get('shot');
  if (!shot) return null;
  const size = query.get('size');
  const mode = size === 'square' || size === 'portrait' || size === 'landscape' ? size : 'landscape';
  const cfg = { shot, mode };
  for (const key of ['title', 'subtitle', 'quote', 'quoteSource', 'tagline', 'grade']) {
    const v = query.get(key);
    if (v) cfg[key] = v;
  }
  const panels = query.get('panels');
  if (panels) cfg.panels = panels.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 6);
  return cfg;
}

export function afterPaint() {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => {
      window.__shotReady = true;
      resolve();
    }));
  });
}
