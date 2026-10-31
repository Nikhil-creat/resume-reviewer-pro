// Client for the optional CNN layout-classifier microservice (see /cnn-service).
import { heuristicLayout } from './offline.js';

export const cnnConfigured = () => !!process.env.CNN_SERVICE_URL;

export async function cnnHealth() {
  if (!cnnConfigured()) return { configured: false, ok: false };
  try {
    const r = await fetch(`${process.env.CNN_SERVICE_URL.replace(/\/$/, '')}/health`, { signal: AbortSignal.timeout(2500) });
    return { configured: true, ok: r.ok };
  } catch {
    return { configured: true, ok: false };
  }
}

/** Classify the visual layout of an uploaded PDF/image. Returns null if no service is reachable. */
export async function classifyLayout(buffer, { name, type }) {
  if (!cnnConfigured()) return null;
  try {
    const fd = new FormData();
    fd.append('file', new Blob([buffer], { type: type || 'application/octet-stream' }), name || 'resume');
    const r = await fetch(`${process.env.CNN_SERVICE_URL.replace(/\/$/, '')}/predict`, {
      method: 'POST',
      body: fd,
      signal: AbortSignal.timeout(12000),
    });
    if (!r.ok) return null;
    const j = await r.json();
    if (!j?.label || typeof j.confidence !== 'number') return null;
    return { label: String(j.label), confidence: j.confidence, probs: j.probs || {}, source: 'cnn' };
  } catch {
    return null;
  }
}

export const layoutOrHeuristic = (layout, text) => layout || heuristicLayout(text);

export const LAYOUT_ADVICE = {
  ats_friendly: 'Single-column, text-first layout — ideal for ATS parsers.',
  two_column: 'Two-column / sidebar layout detected. Many ATS parsers read columns out of order; consider a single column.',
  graphic_heavy: 'Graphics, photos or rating bars detected. These are often ignored or break parsing; move key info into plain text.',
};
