// Structured resume model <-> canonical ATS text. Single source of truth for exports and scoring.
import { parseResume } from "./parser.js";
import { findSkills } from "./rag.js";
import { PII_FLAGS, BUZZWORDS, SKILLS } from "./kb.js";

const BULLET = /^\s*([\-\u2022\u25AA\u25CF\u25E6\u2023\u27A2\u25BA\u2013\u2014*])\s+/;
const DATE_PART = /((?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+\d{4}|\b\d{1,2}\/\d{4}\b|\b(?:19|20)\d{2}\b|\bpresent\b|\bcurrent\b|final year|expected)/i;
const LINK_PART = /(https?:\/\/|github\.com|\.io\b|\.com\b|linkedin\.com)/i;
const CATEGORY_LABEL = { language: "Languages", web: "Web", backend: "Backend", data: "Data", ai: "AI / ML", devops: "DevOps", cloud: "Cloud", security: "Security", robotics: "Robotics", process: "Practices", qa: "Testing", mobile: "Mobile" };
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const emptyResume = () => ({ name: "", contact: { phone: "", email: "", linkedin: "", github: "", portfolio: "" }, summary: "", skills: [], experience: [], projects: [], education: [], certifications: [], achievements: [] });

export function coerceResume(o) {
  const r = emptyResume();
  if (!o || typeof o !== "object") return r;
  const s = (v) => (typeof v === "string" ? v.trim() : "");
  const arr = (v) => (Array.isArray(v) ? v : []);
  r.name = s(o.name);
  Object.keys(r.contact).forEach((k) => { r.contact[k] = s(o.contact && o.contact[k]); });
  r.summary = s(o.summary);
  r.skills = arr(o.skills).map((g) => ({ group: s(g && g.group) || "Skills", items: arr(g && g.items).map(s).filter(Boolean) })).filter((g) => g.items.length);
  const ent = (e) => ({ ...Object.fromEntries(Object.entries(e || {}).filter(([k]) => k !== "bullets").map(([k, v]) => [k, s(v)])), bullets: arr(e && e.bullets).map(s).filter(Boolean) });
  r.experience = arr(o.experience).map(ent); r.projects = arr(o.projects).map(ent); r.education = arr(o.education).map(ent);
  r.certifications = arr(o.certifications).map(s).filter(Boolean); r.achievements = arr(o.achievements).map(s).filter(Boolean);
  return r;
}

export function resumeToText(r) {
  const out = [];
  const c = r.contact || {};
  out.push((r.name || "").toUpperCase());
  const contact = [c.phone, c.email, c.linkedin, c.github, c.portfolio].filter(Boolean).join(" | ");
  if (contact) out.push(contact);
  const sec = (title, lines) => { if (lines.some((x) => x && x.trim())) { out.push("", title, ...lines); } };
  sec("SUMMARY", [r.summary]);
  sec("SKILLS", (r.skills || []).map((g) => `${g.group}: ${g.items.join(", ")}`));
  const entry = (e, keys) => [keys.map((k) => e[k]).filter(Boolean).join(" | "), ...(e.bullets || []).map((b) => `- ${b}`)];
  sec("EXPERIENCE", (r.experience || []).flatMap((e) => entry(e, ["role", "company", "dates", "location"])));
  sec("PROJECTS", (r.projects || []).flatMap((e) => entry(e, ["name", "stack", "link"])));
  sec("EDUCATION", (r.education || []).flatMap((e) => [[e.degree, e.school, e.dates].filter(Boolean).join(" | "), ...(e.bullets || []).map((b) => `- ${b}`)]));
  sec("CERTIFICATIONS", (r.certifications || []).map((x) => `- ${x}`));
  sec("ACHIEVEMENTS", (r.achievements || []).map((x) => `- ${x}`));
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
}

const splitBar = (l) => l.split("|").map((x) => x.trim()).filter(Boolean);

export function toStructured(input) {
  const p = typeof input === "string" ? parseResume(input) : input;
  const r = emptyResume();
  r.name = p.name;
  const c = p.contact;
  r.contact = { phone: c.phone, email: c.email, linkedin: c.linkedin, github: c.github, portfolio: c.portfolio };
  r.summary = (p.sections.summary || []).map((l) => l.trim()).filter(Boolean).join(" ");
  // skills
  const flat = [];
  for (const l of p.sections.skills || []) {
    const t = l.trim().replace(BULLET, "");
    if (!t) continue;
    const m = t.match(/^([^:]{2,40}):\s*(.+)$/);
    const items = (m ? m[2] : t).split(/[,;|]/).map((x) => x.trim()).filter(Boolean);
    if (m) r.skills.push({ group: m[1].trim(), items }); else flat.push(...items);
  }
  if (flat.length) r.skills.push({ group: "Skills", items: flat });
  // entries
  const buildEntries = (lines, kind) => {
    const list = []; let cur = null;
    for (const l of lines || []) {
      const t = l.trim(); if (!t) continue;
      if (BULLET.test(l)) { if (!cur) { cur = { bullets: [] }; list.push(cur); } cur.bullets.push(t.replace(BULLET, "").trim()); continue; }
      const words = t.split(/\s+/).length;
      const headerLike = t.includes("|") || (words <= 14 && !/[.!?]$/.test(t));
      if (headerLike) {
        const parts = splitBar(t); cur = { bullets: [] };
        if (kind === "projects") {
          cur.name = parts[0] || ""; const rest = parts.slice(1);
          cur.link = rest.find((x) => LINK_PART.test(x) && !x.includes(",")) || "";
          cur.stack = rest.filter((x) => x !== cur.link).join(", ");
        } else {
          const dates = parts.find((x, i) => i > 0 && DATE_PART.test(x)) || "";
          const others = parts.filter((x) => x !== dates);
          cur.role = others[0] || ""; cur.company = others[1] || ""; cur.location = others[2] || ""; cur.dates = dates;
        }
        list.push(cur);
      } else { if (!cur) { cur = { bullets: [] }; list.push(cur); } cur.bullets.push(t); }
    }
    return list;
  };
  r.experience = buildEntries(p.sections.experience, "experience");
  r.projects = buildEntries(p.sections.projects, "projects");
  // education
  for (const l of p.sections.education || []) {
    const t = l.trim(); if (!t) continue;
    if (BULLET.test(l) && r.education.length) { r.education[r.education.length - 1].bullets.push(t.replace(BULLET, "").trim()); continue; }
    const parts = splitBar(t.replace(BULLET, ""));
    const dates = parts.find((x, i) => i > 0 && DATE_PART.test(x)) || "";
    const others = parts.filter((x) => x !== dates);
    r.education.push({ degree: others[0] || "", school: others[1] || "", dates, bullets: others.slice(2) });
  }
  const items = (lines) => (lines || []).map((l) => l.trim().replace(BULLET, "").trim()).filter(Boolean);
  r.certifications = items(p.sections.certifications); r.achievements = items(p.sections.achievements);
  return r;
}

const dedupe = (a) => { const seen = new Set(); return a.filter((x) => { const k = x.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; }); };
const STRIP_PRONOUN = /^(i|we)\s+(have\s+|had\s+|was\s+|am\s+)?/i;
const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
function normDate(d) {
  return (d || "").replace(/\b(\d{1,2})\/((?:19|20)\d{2})\b/g, (m, mo, y) => (+mo >= 1 && +mo <= 12 ? `${MONTHS[+mo - 1]} ${y}` : m));
}

// Offline, deterministic cleanup. Never adds facts: only normalises, removes noise, regroups, and merges user-confirmed skills/details.
function skillSurface(text, name) {
  const entry = SKILLS.find((x) => x[0] === name); if (!entry) return name;
  for (const f of [name, ...entry[1]]) {
    const m = text.match(new RegExp("(^|[^A-Za-z0-9+#])(" + f.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")(?![A-Za-z0-9+#])", "i"));
    if (m) return m[2];
  }
  return name;
}

export function ruleBasedRewrite(src, { confirmedSkills = [], answers = {}, roleTitle = "", fullText = "" } = {}) {
  const r = coerceResume(JSON.parse(JSON.stringify(src)));
  const log = [];
  const clean = (b) => { let t = b.replace(BULLET, "").trim().replace(/\s{2,}/g, " "); const before = t; t = cap(t.replace(STRIP_PRONOUN, "")); if (t !== before) log.push("Removed first-person wording"); return t; };
  for (const sec of ["experience", "projects"]) for (const e of r[sec]) { e.bullets = dedupe(e.bullets.map(clean).filter(Boolean)); if (e.dates) e.dates = normDate(e.dates); }
  r.education.forEach((e) => { e.dates = normDate(e.dates); });
  // PII and buzzword cleanup in summary
  const sentences = (r.summary.match(/[^.!?]+(?:[.!?]+|$)/g) || []).map((x) => x.trim()).filter(Boolean).filter((s) => !PII_FLAGS.some((f) => s.toLowerCase().includes(f)));
  if (sentences.join(" ") !== r.summary) log.push("Removed personal data (DOB, marital status) from summary");
  const concrete = (s) => /\d/.test(s) || findSkills(s).length > 0;
  const kept = sentences.filter((s) => !(BUZZWORDS.some((b) => s.toLowerCase().includes(b)) && !concrete(s)));
  if (kept.length !== sentences.length) log.push("Removed cliché-only summary sentences");
  r.summary = kept.join(" ");
  // user answers: append the user's own detail to the matching bullet
  for (const sec of ["experience", "projects"]) for (const e of r[sec]) e.bullets = e.bullets.map((b) => { const a = answers[b]; if (a && a.trim()) { log.push("Added your detail to a bullet"); return `${b.replace(/[.\s]+$/, "")}, ${a.trim().replace(/^[,\s]+/, "").replace(/[.\s]+$/, "")}`; } return b; });
  // skills: regroup flat list, then merge confirmed skills
  const have = new Set(r.skills.flatMap((g) => g.items.map((i) => i.toLowerCase())));
  const flatGroup = r.skills.find((g) => g.group === "Skills");
  if (flatGroup && r.skills.length === 1) {
    const cats = {}; const rest = [];
    for (const it of flatGroup.items) { const hit = findSkills(it)[0]; if (hit) (cats[hit.cat] ||= []).push(it); else rest.push(it); }
    r.skills = Object.entries(cats).map(([c, items]) => ({ group: CATEGORY_LABEL[c] || c, items })); if (rest.length) r.skills.push({ group: "Other", items: rest });
    log.push("Grouped skills by category");
  }
  for (const s of confirmedSkills) {
    if (have.has(s.toLowerCase())) continue;
    const cat = findSkills(s)[0]?.cat; const label = CATEGORY_LABEL[cat] || "Other";
    let g = r.skills.find((x) => x.group === label); if (!g) { g = { group: label, items: [] }; r.skills.push(g); }
    g.items.push(s); have.add(s.toLowerCase()); log.push(`Added confirmed skill: ${s}`);
  }
  r.certifications = dedupe(r.certifications);
  if (!r.summary.trim() && roleTitle) {
    const top = findSkills(fullText || resumeToText(r)).slice(0, 5).map((x) => skillSurface(fullText || resumeToText(r), x.name));
    if (top.length >= 3) { r.summary = `${roleTitle} candidate with skills in ${top.slice(0, -1).join(", ")} and ${top[top.length - 1]}.`; log.push("Generated a factual summary from your listed skills (edit it to add your real strengths)"); }
  }
  return { resume: r, log: [...new Set(log)] };
}
