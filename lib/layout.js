// Client-side resume layout analysis (columns, tables, graphics, margins) from a rendered page image.
// Mirrors cnn-service/heuristics.py. The CNN service adds a learned classification on top when available.

export function toGray(rgba, w, h) {
  const g = new Uint8ClampedArray(w * h);
  for (let i = 0, j = 0; i < g.length; i++, j += 4) {
    const a = rgba[j + 3] / 255;
    g[i] = (0.299 * rgba[j] + 0.587 * rgba[j + 1] + 0.114 * rgba[j + 2]) * a + 255 * (1 - a);
  }
  return g;
}

// Downsample to an ink grid: 1 where the block contains dark pixels.
function inkGrid(gray, w, h, gw = 160, gh = 208, thresh = 170) {
  const ink = new Uint8Array(gw * gh), dens = new Float32Array(gw * gh);
  for (let gy = 0; gy < gh; gy++) {
    const y0 = Math.floor((gy * h) / gh), y1 = Math.max(y0 + 1, Math.floor(((gy + 1) * h) / gh));
    for (let gx = 0; gx < gw; gx++) {
      const x0 = Math.floor((gx * w) / gw), x1 = Math.max(x0 + 1, Math.floor(((gx + 1) * w) / gw));
      let dark = 0, n = 0;
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { if (gray[y * w + x] < thresh) dark++; n++; }
      dens[gy * gw + gx] = dark / n; ink[gy * gw + gx] = dark / n > 0.08 ? 1 : 0;
    }
  }
  return { ink, dens, gw, gh };
}

export function analyzeGray(gray, w, h, { textBased = true } = {}) {
  const { ink, dens, gw, gh } = inkGrid(gray, w, h);
  const at = (x, y) => ink[y * gw + x];
  let total = 0, minX = gw, maxX = -1, minY = gh, maxY = -1;
  for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) if (at(x, y)) { total++; if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; }
  if (total === 0) return { columns: 1, hasTables: false, hasGraphics: false, marginsOk: true, textBased, inkDensity: 0, blank: true, risk: 0.5 };
  const inkDensity = total / (gw * gh);

  // margins: content must not touch the edges and must not be squeezed into a narrow strip
  const left = minX / gw, right = 1 - (maxX + 1) / gw, top = minY / gh;
  const marginsOk = left >= 0.03 && right >= 0.03 && top >= 0.015 && left <= 0.3 && right <= 0.3;

  // columns: look for a persistent empty vertical gutter inside horizontal bands
  const bands = 14, bandH = Math.floor(gh / bands);
  let bandsWithText = 0, bandsWithGutter = 0;
  for (let b = 0; b < bands; b++) {
    const y0 = b * bandH, y1 = y0 + bandH;
    const col = new Array(gw).fill(0); let bandInk = 0;
    for (let y = y0; y < y1; y++) for (let x = 0; x < gw; x++) if (at(x, y)) { col[x]++; bandInk++; }
    if (bandInk < gw * 0.15) continue;
    bandsWithText++;
    const lo = Math.floor(gw * 0.2), hi = Math.floor(gw * 0.8), minGap = Math.floor(gw * 0.035);
    let run = 0, runStart = 0, found = false;
    for (let x = lo; x <= hi; x++) {
      if (col[x] === 0) { if (run === 0) runStart = x; run++; if (run >= minGap) {
        let leftInk = 0, rightInk = 0; for (let k = 0; k < runStart; k++) leftInk += col[k]; for (let k = x + 1; k < gw; k++) rightInk += col[k];
        if (leftInk > bandInk * 0.12 && rightInk > bandInk * 0.12) { found = true; break; } } } else run = 0;
    }
    if (found) bandsWithGutter++;
  }
  const columns = bandsWithText >= 4 && bandsWithGutter / bandsWithText >= 0.45 ? 2 : 1;

  // tables: thin long horizontal rules AND vertical rules that actually cross (a grid). Filled blocks are not lines.
  const line = (x, y) => at(x, y) && dens[y * gw + x] <= 0.7;
  const hRows = [], vCols = [];
  for (let y = 0; y < gh; y++) { let run = 0, best = 0; for (let x = 0; x < gw; x++) { if (line(x, y)) { run++; best = Math.max(best, run); } else run = 0; } if (best >= gw * 0.5) hRows.push(y); }
  for (let x = 0; x < gw; x++) { let run = 0, best = 0; for (let y = 0; y < gh; y++) { if (line(x, y)) { run++; best = Math.max(best, run); } else run = 0; } if (best >= gh * 0.07) vCols.push(x); }
  let crossings = 0; for (const y of hRows) for (const x of vCols) if (line(x, y)) crossings++;
  const hLines = hRows.length, vLines = vCols.length;
  const hasTables = hLines >= 3 && vLines >= 2 && crossings >= 4;

  // graphics: large filled regions (photos, skill bars, banners). Text blocks sit well below 0.6 density.
  let filled = 0;
  for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) if (dens[y * gw + x] > 0.7) filled++;
  const hasGraphics = filled / (gw * gh) > 0.012;

  const risk = Math.min(1, (columns > 1 ? 0.4 : 0) + (hasTables ? 0.3 : 0) + (hasGraphics ? 0.2 : 0) + (marginsOk ? 0 : 0.1) + (textBased ? 0 : 0.3));
  return { columns, hasTables, hasGraphics, marginsOk, textBased, inkDensity: +inkDensity.toFixed(3), hLines, vLines, risk: +risk.toFixed(2) };
}

export function analyzeImageData(imageData, opts) {
  return analyzeGray(toGray(imageData.data, imageData.width, imageData.height), imageData.width, imageData.height, opts);
}

export function mergeLayout(local, cnn) {
  if (!cnn || !cnn.label) return { ...local, source: "heuristic" };
  const worse = cnn.probs && Object.entries(cnn.probs).sort((a, b) => b[1] - a[1])[0];
  const m = { ...local, source: "heuristic+cnn", cnnLabel: cnn.label, cnnConfidence: cnn.confidence };
  if (cnn.confidence >= 0.75) {
    if (cnn.label === "two_column") m.columns = Math.max(m.columns, 2);
    if (cnn.label === "table_heavy") m.hasTables = true;
    if (cnn.label === "graphics_heavy") m.hasGraphics = true;
  }
  m.cnnTop = worse ? worse[0] : cnn.label;
  return m;
}
