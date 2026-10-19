import { KB } from "./kb";
const tok = s => (s.toLowerCase().match(/[a-z0-9+#.]{2,}/g) || []);
// BM25 retrieval over the knowledge base (no external vector DB needed).
export function retrieve(query, k = 6) {
  const docs = KB.map(d => ({ d, t: tok(d.text + " " + d.tag) }));
  const N = docs.length, avg = docs.reduce((a, x) => a + x.t.length, 0) / N;
  const q = [...new Set(tok(query))];
  const df = {}; q.forEach(w => (df[w] = docs.filter(x => x.t.includes(w)).length));
  return docs.map(({ d, t }) => {
    let s = 0;
    q.forEach(w => {
      const f = t.filter(x => x === w).length; if (!f) return;
      const idf = Math.log(1 + (N - df[w] + 0.5) / (df[w] + 0.5));
      s += idf * (f * 2.2) / (f + 1.2 * (0.25 + 0.75 * t.length / avg));
    });
    return { ...d, score: +s.toFixed(3) };
  }).filter(x => x.score > 0).sort((a, b) => b.score - a.score).slice(0, k);
}
