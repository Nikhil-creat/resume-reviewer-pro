// Tiny dependency-free BM25 retriever over the knowledge base.
// Works offline (no embedding API), is deterministic and fast enough for a serverless cold start.
import { KB } from './kb.js';

const STOP = new Set(
  'a an the and or of to in for on with at by from as is are was were be been this that these those it its you your we our they their will can may should would could into over under about not but if then than also what how why when do does i me my'.split(' '),
);

export const tokenize = (s) =>
  String(s || '')
    .toLowerCase()
    .match(/[a-z][a-z0-9+#.]*[a-z0-9+#]|[a-z]/g)
    ?.filter((w) => !STOP.has(w)) || [];

let index = null;

function build() {
  const docs = KB.map((d) => {
    // title and tags weigh more: repeat them
    const toks = tokenize(`${d.title} ${d.title} ${d.tags.join(' ')} ${d.tags.join(' ')} ${d.text}`);
    const tf = new Map();
    for (const t of toks) tf.set(t, (tf.get(t) || 0) + 1);
    return { doc: d, tf, len: toks.length };
  });
  const df = new Map();
  for (const d of docs) for (const t of d.tf.keys()) df.set(t, (df.get(t) || 0) + 1);
  const avg = docs.reduce((s, d) => s + d.len, 0) / docs.length;
  return { docs, df, avg, N: docs.length };
}

export function retrieve(query, k = 4) {
  index ||= build();
  const q = [...new Set(tokenize(query))];
  const { docs, df, avg, N } = index;
  const k1 = 1.5;
  const b = 0.75;
  const scored = docs.map(({ doc, tf, len }) => {
    let score = 0;
    for (const t of q) {
      const f = tf.get(t);
      if (!f) continue;
      const idf = Math.log(1 + (N - (df.get(t) || 0) + 0.5) / ((df.get(t) || 0) + 0.5));
      score += (idf * (f * (k1 + 1))) / (f + k1 * (1 - b + (b * len) / avg));
    }
    return { ...doc, score };
  });
  return scored
    .filter((s) => s.score > 0)
    .sort((a, b2) => b2.score - a.score)
    .slice(0, k);
}

export const formatContext = (chunks, maxChars = 2200) => {
  let out = '';
  for (const c of chunks) {
    const piece = `[${c.id}] ${c.title}: ${c.text}\n`;
    if (out.length + piece.length > maxChars) break;
    out += piece;
  }
  return out.trim();
};
