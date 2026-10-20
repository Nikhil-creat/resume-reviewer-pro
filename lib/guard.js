// Fabrication guard: any number, skill or link in a rewrite that is not in the original (or user-supplied facts) is flagged.
import { findSkills } from "./rag.js";
import { SKILLS } from "./kb.js";

function stripKnown(text) {
  let t = String(text || "").toLowerCase();
  t = t.replace(/https?:\/\/\S+|\b[\w.-]+\.(?:com|io|dev|app|org)\/?\S*/g, " ");
  for (const [name, aliases] of SKILLS) for (const f of [name, ...aliases]) if (/\d/.test(f)) t = t.split(f.toLowerCase()).join(" ");
  t = t.replace(/\b(?:html5|css3|ros2|python3|s3|ec2|gpt-?\d|llama\s?\d[\d.]*|\d+[bB]\b)/g, " ");
  return t;
}
export function numbersIn(text) { return new Set((stripKnown(text).match(/\d+(?:[.,]\d+)?/g) || []).map((n) => n.replace(/,/g, ""))); }
export function skillsIn(text) { return new Set(findSkills(text).map((s) => s.name)); }
export function linksIn(text) { return new Set((String(text).toLowerCase().match(/https?:\/\/\S+|\b[\w-]+\.(?:github\.io|com|io|dev|app)\/[\w\-/.]*/g) || []).map((l) => l.replace(/[).,;]+$/, ""))); }

export function findFabrications(originalText, candidateText, allowedText = "") {
  const origNums = numbersIn(originalText + " " + allowedText), origSk = skillsIn(originalText + " " + allowedText);
  const origLinks = linksIn(originalText + " " + allowedText);
  const nums = [...numbersIn(candidateText)].filter((n) => !origNums.has(n));
  const skills = [...skillsIn(candidateText)].filter((s) => !origSk.has(s));
  const links = [...linksIn(candidateText)].filter((l) => ![...origLinks].some((o) => o.includes(l) || l.includes(o)));
  return { numbers: nums, skills, links, count: nums.length + skills.length + links.length };
}

const violates = (text, orig) => { const f = findFabrications(orig.text, text, orig.allowed); return f.count > 0; };

// Revert or drop anything fabricated so the output stays truthful, whatever the LLM returned.
export function sanitize(candidate, original, originalText, allowedText = "") {
  const ctx = { text: originalText, allowed: allowedText };
  const out = JSON.parse(JSON.stringify(candidate)); const notes = [];
  if (out.summary && violates(out.summary, ctx)) { notes.push("Summary reverted: it contained unsupported facts"); out.summary = original.summary; }
  for (const sec of ["experience", "projects"]) {
    (out[sec] || []).forEach((e, i) => {
      e.bullets = e.bullets.map((b, j) => {
        if (!violates(b, ctx)) return b;
        notes.push(`Reverted a ${sec} bullet with unsupported facts`);
        return original[sec] && original[sec][i] && original[sec][i].bullets[j] ? original[sec][i].bullets[j] : null;
      }).filter(Boolean);
    });
  }
  const okSkill = (s) => !violates(s, ctx);
  out.skills = (out.skills || []).map((g) => ({ ...g, items: g.items.filter((s) => { const ok = okSkill(s); if (!ok) notes.push(`Removed unconfirmed skill: ${s}`); return ok; }) })).filter((g) => g.items.length);
  return { resume: out, notes: [...new Set(notes)] };
}
