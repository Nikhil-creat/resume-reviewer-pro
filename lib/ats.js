// Deterministic ATS scoring engine. No LLM involved: the same input always yields the same score and explanations.
import { ACTION_VERBS, WEAK_PHRASES, BUZZWORDS, PII_FLAGS } from "./kb.js";
import { hasTerm } from "./text.js";
import { parseResume } from "./parser.js";

const NUM = /(\d+(?:[.,]\d+)?\s?(?:%|x\b|k\b|m\b|\+|ms\b|users|requests|services|models|nodes|apis|endpoints|hours|hrs|days|seconds|gb|tb|mb)|\b\d{2,}\b|\b\d+(?:\.\d+)?\s?(?:percent)\b)/i;

export const CATEGORIES = [
  { id: "contact", label: "Contact and identity", max: 10 },
  { id: "structure", label: "Section structure", max: 15 },
  { id: "keywords", label: "Keyword match", max: 25 },
  { id: "impact", label: "Quantified impact", max: 15 },
  { id: "bullets", label: "Action verbs and bullet quality", max: 10 },
  { id: "format", label: "Formatting and layout", max: 10 },
  { id: "length", label: "Length and readability", max: 5 },
  { id: "dates", label: "Dates and consistency", max: 5 },
  { id: "hygiene", label: "Hygiene and clarity", max: 5 }
];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const round1 = (v) => Math.round(v * 10) / 10;
const issue = (id, severity, msg, fix, gain) => ({ id, severity, msg, fix, gain: round1(gain) });
const startsWithVerb = (t) => { const w = t.toLowerCase().replace(/^[^a-z]+/, "").split(/\s+/)[0] || ""; return ACTION_VERBS.has(w); };

export function scoreText(text, ctx = {}) { return scoreParsed(parseResume(text), ctx); }

// ctx: { keywords:[{term,aliases,weight}], layout:{columns,hasTables,hasGraphics,risk,marginsOk,textBased}, pages }
export function scoreParsed(p, ctx = {}) {
  const cats = {};
  const add = (id, score, issues, extra = {}) => { const c = CATEGORIES.find((x) => x.id === id); cats[id] = { id, label: c.label, max: c.max, score: round1(clamp(score, 0, c.max)), issues, ...extra }; };

  // 1. contact (10)
  { const c = p.contact, iss = []; let s = 0;
    if (c.email) s += 3; else iss.push(issue("email", "high", "No email address found.", "Add a professional email at the top of the page body.", 3));
    if (c.phone) s += 3; else iss.push(issue("phone", "high", "No phone number found.", "Add a phone number with country code.", 3));
    if (c.linkedin || c.github) s += 2; else iss.push(issue("links", "medium", "No LinkedIn or GitHub link found.", "Add LinkedIn and GitHub URLs as plain text.", 2));
    if (p.name) s += 2; else iss.push(issue("name", "high", "Name not detected as the first line.", "Put your full name alone on the first line.", 2));
    add("contact", s, iss); }

  // 2. structure (15)
  { const sec = p.sections, has = (k) => (sec[k] || []).some((l) => l.trim()), iss = []; let s = 0;
    if (has("summary")) s += 3; else iss.push(issue("summary", "medium", "No Summary section.", "Add a 2-3 line Summary with your target role and strongest skills.", 3));
    if (has("skills")) s += 4; else iss.push(issue("skills-sec", "high", "No Skills section.", "Add a Skills section grouped by category.", 4));
    if (has("experience") || has("projects")) s += 4; else iss.push(issue("exp", "high", "No Experience or Projects section.", "Add Projects (freshers) or Experience with bullets.", 4));
    if (has("education")) s += 3; else iss.push(issue("edu", "high", "No Education section.", "Add Education with degree, institution and year.", 3));
    if (has("certifications") || has("achievements")) s += 1; else iss.push(issue("certs", "low", "No Certifications or Achievements section.", "Add relevant certifications if you have them.", 1));
    if (p.unknownHeadings.length) { s -= 1; iss.push(issue("headings", "medium", `Non-standard headings: ${p.unknownHeadings.slice(0, 3).join(", ")}.`, "Rename to standard headings such as Skills, Projects, Education.", 1)); }
    add("structure", s, iss); }

  // 3. keywords (25)
  { const kws = ctx.keywords || [], iss = [];
    let total = 0, got = 0; const matched = [], missing = [];
    for (const k of kws) {
      total += k.weight;
      if (k.aliases.some((a) => hasTerm(p.raw, a))) { got += k.weight; matched.push(k.term); } else missing.push(k);
    }
    const cov = total ? got / total : 0.6;
    const s = total ? 25 * clamp(cov / 0.85, 0, 1) : 15;
    if (total && cov < 0.85) iss.push(issue("keywords", cov < 0.5 ? "high" : "medium", `Keyword coverage ${(cov * 100).toFixed(0)}% (target 85%+). Missing: ${missing.sort((a, b) => b.weight - a.weight).slice(0, 8).map((m) => m.term).join(", ")}.`, "Add only the skills you genuinely have, using the exact wording from the job description.", 25 - s));
    if (!total) iss.push(issue("no-target", "low", "No job description or role selected, so keyword match is estimated.", "Paste a job description or choose a target role.", 10));
    add("keywords", s, iss, { coverage: round1(cov * 100), matched, missing: missing.map((m) => ({ term: m.term, weight: m.weight })) }); }

  // 4. impact (15)
  { const b = p.bullets, iss = []; const withNum = b.filter((x) => NUM.test(x.text)).length; const ratio = b.length ? withNum / b.length : 0;
    const s = b.length ? 15 * clamp(ratio / 0.5, 0, 1) : 3;
    if (!b.length) iss.push(issue("no-bullets", "high", "No bullet points detected under Experience or Projects.", "Describe each role or project in 2-4 bullets.", 12));
    else if (ratio < 0.5) iss.push(issue("metrics", ratio < 0.25 ? "high" : "medium", `Only ${withNum} of ${b.length} bullets contain a number or metric (target 50%+).`, "Add real figures: users, requests, latency, accuracy, time or cost saved. Do not invent numbers.", 15 - s));
    add("impact", s, iss, { bulletsWithMetrics: withNum, bulletsTotal: b.length, missingMetric: b.filter((x) => !NUM.test(x.text)).slice(0, 6).map((x) => x.text) }); }

  // 5. bullet quality (10)
  { const b = p.bullets, iss = []; let s = 0;
    if (b.length) {
      const verbRatio = b.filter((x) => startsWithVerb(x.text)).length / b.length;
      s += 6 * clamp(verbRatio / 0.8, 0, 1);
      const lens = b.map((x) => x.text.split(/\s+/).length); const avg = lens.reduce((a, c) => a + c, 0) / lens.length;
      s += avg >= 10 && avg <= 26 ? 3 : avg >= 7 && avg <= 32 ? 1.5 : 0;
      const first = b.filter((x) => /^(i|my|we)\b/i.test(x.text)).length; s += first === 0 ? 1 : 0;
      if (verbRatio < 0.8) iss.push(issue("verbs", "medium", `${Math.round(verbRatio * 100)}% of bullets start with an action verb (target 80%+).`, "Start each bullet with a verb such as Built, Designed, Reduced, Automated.", 6 - 6 * clamp(verbRatio / 0.8, 0, 1)));
      if (avg < 10 || avg > 26) iss.push(issue("length-b", "low", `Average bullet length is ${avg.toFixed(0)} words (ideal 10-26).`, "Make bullets one to two lines: action, scope, result.", 3 - (avg >= 7 && avg <= 32 ? 1.5 : 0)));
      if (first) iss.push(issue("pronouns", "low", "Bullets use first-person pronouns.", "Remove I, my and we; start with the action.", 1));
    } else iss.push(issue("no-bullets-q", "medium", "No bullets to evaluate.", "Add bullet points.", 8));
    add("bullets", s, iss); }

  // 6. format (10)
  { const iss = []; let s; const L = ctx.layout;
    if (L) {
      s = 0;
      if (L.columns <= 1) s += 4; else iss.push(issue("columns", "high", `Layout analysis found ${L.columns} columns.`, "Use a single-column layout so parsers read in the right order.", 4));
      if (!L.hasTables) s += 2; else iss.push(issue("tables", "high", "Tables or grid lines detected.", "Replace tables with plain text lines.", 2));
      if (!L.hasGraphics) s += 2; else iss.push(issue("graphics", "medium", "Large graphics, photo or skill bars detected.", "Remove images, icons and rating bars.", 2));
      if (L.marginsOk !== false) s += 1; else iss.push(issue("margins", "low", "Margins look too tight or uneven.", "Use 12-20 mm margins.", 1));
      if (L.textBased !== false) s += 1; else iss.push(issue("scan", "high", "The PDF looks scanned (no text layer).", "Export a text-based PDF or upload DOCX.", 1));
    } else {
      s = 7;
      const tabbed = p.lines.filter((l) => /\S\s{4,}\S/.test(l) || /\t/.test(l)).length;
      if (tabbed > 3) { s -= 2; iss.push(issue("spacing", "medium", "Lines with wide gaps suggest columns or tables.", "Use a single column; separate items with a pipe or comma.", 2)); }
      const odd = (p.raw.match(/[^\x00-\x7F\u2022\u2013\u2014\u2018\u2019\u201C\u201D]/g) || []).length;
      if (odd > 12) { s -= 1; iss.push(issue("glyphs", "low", "Many special symbols or icons.", "Use plain text characters.", 1)); } else s += 1;
      iss.push(issue("layout-unknown", "low", "Upload a PDF to unlock the CNN layout analysis (columns, tables, graphics).", "", 2));
      s += 1;
    }
    add("format", s, iss); }

  // 7. length (5)
  { const w = p.wordCount, iss = []; let s = 5;
    if (w < 250) { s = 1.5; iss.push(issue("short", "high", `Only ${w} words; too little content.`, "Add projects, skills and measurable results (350-700 words).", 3.5)); }
    else if (w < 350) { s = 3.5; iss.push(issue("short", "low", `${w} words; slightly thin.`, "Aim for 350-700 words.", 1.5)); }
    else if (w > 850) { s = 3; iss.push(issue("long", "medium", `${w} words; likely over two pages.`, "Trim older or weaker items.", 2)); }
    if (ctx.pages && ctx.pages > 2) { s = Math.min(s, 2); iss.push(issue("pages", "medium", `${ctx.pages} pages.`, "Keep to one or two pages.", 3)); }
    add("length", s, iss); }

  // 8. dates (5)
  { const d = p.dates, iss = []; let s = 5;
    const fmts = [d.monthYear.length ? 1 : 0, d.numeric.length ? 1 : 0].reduce((a, c) => a + c, 0);
    const any = d.monthYear.length + d.numeric.length + d.years.length;
    if (!any) { s = 2; iss.push(issue("no-dates", "medium", "No dates found.", "Add month and year for projects, roles and education.", 3)); }
    else if (fmts > 1) { s = 3; iss.push(issue("date-mix", "low", "Mixed date formats (e.g. Jan 2026 and 01/2026).", "Use one format such as Jan 2026.", 2)); }
    else if (!d.monthYear.length && !d.numeric.length) { s = 3.5; iss.push(issue("date-year", "low", "Only years found, no months.", "Use Mon YYYY for roles and projects.", 1.5)); }
    add("dates", s, iss); }

  // 9. hygiene (5)
  { const low = p.raw.toLowerCase(), iss = []; let s = 5;
    const buzz = BUZZWORDS.filter((b) => low.includes(b)); if (buzz.length) { s -= Math.min(2, buzz.length * 0.7); iss.push(issue("buzz", "low", `Cliché phrases: ${buzz.slice(0, 4).join(", ")}.`, "Replace with specific evidence.", Math.min(2, buzz.length * 0.7))); }
    const weak = WEAK_PHRASES.filter((w) => low.includes(w)); if (weak.length) { s -= Math.min(2, weak.length * 0.7); iss.push(issue("weak", "medium", `Weak phrases: ${weak.slice(0, 4).join(", ")}.`, "Lead with a concrete action verb instead.", Math.min(2, weak.length * 0.7))); }
    const pii = PII_FLAGS.filter((x) => low.includes(x)); if (pii.length) { s -= 1.5; iss.push(issue("pii", "medium", `Personal data that should be omitted: ${pii.slice(0, 3).join(", ")}.`, "Remove photo, DOB, marital status and similar.", 1.5)); }
    add("hygiene", s, iss); }

  const list = CATEGORIES.map((c) => cats[c.id]);
  const total = Math.round(list.reduce((a, c) => a + c.score, 0) * 10) / 10;
  const issues = list.flatMap((c) => c.issues.map((i) => ({ ...i, category: c.id }))).filter((i) => i.gain > 0).sort((a, b) => b.gain - a.gain);
  const grade = total >= 95 ? "Excellent" : total >= 85 ? "Strong" : total >= 70 ? "Good" : total >= 50 ? "Needs work" : "Poor";
  return { score: total, grade, categories: list, issues, wordCount: p.wordCount };
}
