// RAG layer: role profiles + ATS guidelines + skill ontology, searched with deterministic hashed embeddings.
import { ROLES, GUIDELINES, SKILLS } from "./kb.js";
import { embed, cosine, hasTerm, words } from "./text.js";

const DOCS = [
  ...ROLES.map((r) => ({ kind: "role", id: r.id, title: r.title, text: `${r.title} ${r.blurb} ${r.must.join(" ")} ${r.nice.join(" ")}` })),
  ...GUIDELINES.map((g) => ({ kind: "guideline", id: g.id, title: g.title, text: `${g.title} ${g.text}` }))
];
const VEC = DOCS.map((d) => embed(d.text));

export function search(query, { kind, k = 3 } = {}) {
  const q = embed(query);
  return DOCS.map((d, i) => ({ d, s: cosine(q, VEC[i]) })).filter((x) => !kind || x.d.kind === kind)
    .sort((a, b) => b.s - a.s).slice(0, k).map(({ d, s }) => ({ ...d, score: +s.toFixed(3) }));
}

// Rank roles by combining skill overlap (precise) with embedding similarity (semantic).
export function matchRoles(resumeText, k = 3) {
  const found = new Set(findSkills(resumeText).map((s) => s.name));
  const sem = new Map(search(resumeText, { kind: "role", k: ROLES.length }).map((r) => [r.id, r.score]));
  return ROLES.map((r) => {
    const all = [...r.must, ...r.nice];
    const hit = all.filter((t) => found.has(t) || hasTerm(resumeText, t)).length;
    const must = r.must.filter((t) => found.has(t) || hasTerm(resumeText, t)).length;
    const score = 0.5 * (hit / all.length) + 0.3 * (must / r.must.length) + 0.2 * Math.max(0, sem.get(r.id) || 0);
    return { id: r.id, title: r.title, score: +score.toFixed(3), mustHit: must, mustTotal: r.must.length };
  }).sort((a, b) => b.score - a.score).slice(0, k);
}

export function roleById(id) { return ROLES.find((r) => r.id === id) || null; }

// Skills (canonical) present in a text, via the ontology with aliases.
export function findSkills(text) {
  const out = [];
  for (const [name, aliases, cat] of SKILLS) {
    const forms = [name, ...aliases].filter((f) => f.length > 1 || f === "c");
    if (forms.some((f) => hasTerm(text, f))) out.push({ name, cat });
  }
  return out;
}

// Keyword targets for scoring: JD terms (weight 2) + role must (1.5) + role nice (0.5). Only canonical ontology terms + JD n-grams.
export function buildKeywords({ jd = "", roleId = "" } = {}) {
  const map = new Map();
  const put = (term, weight, source) => {
    const sk = SKILLS.find(([n, a]) => n === term || a.includes(term));
    const name = sk ? sk[0] : term;
    const aliases = sk ? [sk[0], ...sk[1]] : [term];
    const cur = map.get(name);
    if (!cur || cur.weight < weight) map.set(name, { term: name, aliases, weight, source: cur ? cur.source : source });
  };
  if (jd && jd.trim().length > 40) {
    findSkills(jd).forEach((s) => put(s.name, 2, "jd"));
    // frequent non-ontology tokens in the JD (tools, domains) get weight 1
    const freq = new Map();
    words(jd).forEach((w) => { if (w.length > 3 && !/^\d/.test(w)) freq.set(w, (freq.get(w) || 0) + 1); });
    [...freq.entries()].filter(([, c]) => c >= 3).sort((a, b) => b[1] - a[1]).slice(0, 8)
      .forEach(([w]) => { if (!map.has(w) && !JD_NOISE.has(w)) put(w, 1, "jd"); });
  }
  const role = roleById(roleId);
  if (role) {
    role.must.forEach((t) => put(t, 1.5, "role"));
    role.nice.forEach((t) => put(t, 0.5, "role"));
  }
  return [...map.values()];
}
const JD_NOISE = new Set(("experience years work team role will skills ability strong knowledge required preferred responsibilities requirements working candidate company join looking including understanding management development business support software engineer senior junior").split(" "));
