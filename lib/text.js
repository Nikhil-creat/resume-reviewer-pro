import { STOP } from "./kb.js";

export const norm = (s) => String(s || "").replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"').replace(/[\u2013\u2014]/g, "-").replace(/\u00A0/g, " ").replace(/\r/g, "");
export const wordCount = (s) => (String(s || "").match(/\S+/g) || []).length;
export const words = (s) => norm(s).toLowerCase().match(/[a-z0-9][a-z0-9+#.\-/]*/g) || [];
const escRe = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Word-boundary term test that also handles c++, c#, node.js, ci/cd. No lookbehind (older Safari).
export function hasTerm(text, term) {
  const re = new RegExp("(^|[^a-z0-9+#])" + escRe(term.toLowerCase()) + "(?![a-z0-9+#])", "i");
  return re.test(text);
}

function fnv(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h >>> 0;
}

// Deterministic hashed bag-of-words + bigram embedding (signed hashing), L2-normalised.
export function embed(text, dim = 256) {
  const v = new Array(dim).fill(0);
  const toks = words(text).filter((w) => !STOP.has(w));
  const add = (f) => { const h = fnv(f); v[h % dim] += (h >>> 31) & 1 ? 1 : -1; };
  toks.forEach((w, i) => { add(w); if (i < toks.length - 1) add(w + " " + toks[i + 1]); });
  const n = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1;
  return v.map((x) => x / n);
}
export const cosine = (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]; return s; };
