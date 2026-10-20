import { SECTION_ALIASES } from "./kb.js";
import { norm } from "./text.js";

const BULLET = /^\s*([\-\u2022\u25AA\u25CF\u25E6\u2023\u27A2\u25BA\u2013\u2014*])\s+/;
const MONTH = "(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\\.?";

export function headingKey(line) {
  const s = line.trim().replace(/[:\-_|]+$/, "").replace(/^[^A-Za-z]+/, "").trim().toLowerCase();
  if (!s || s.split(/\s+/).length > 5) return null;
  for (const [key, aliases] of Object.entries(SECTION_ALIASES)) if (aliases.includes(s)) return key;
  return null;
}

export function extractContact(raw) {
  const email = (raw.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/) || [])[0] || "";
  let phone = "";
  for (const m of raw.matchAll(/\+?\d[\d\s().-]{8,}\d/g)) {
    const digits = m[0].replace(/\D/g, "");
    if (digits.length >= 10 && digits.length <= 14 && !/^(19|20)\d{2}[\s-]/.test(m[0])) { phone = m[0].trim(); break; }
  }
  const linkedin = (raw.match(/(?:https?:\/\/)?(?:[a-z]{2,3}\.)?linkedin\.com\/in\/[\w%-]+/i) || [])[0] || "";
  const github = (raw.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/[\w-]+/i) || [])[0] || "";
  const urls = [...raw.matchAll(/(?:https?:\/\/)[^\s)|,]+/gi)].map((m) => m[0]);
  const portfolio = urls.find((u) => !/linkedin|github\.com/i.test(u)) || (raw.match(/\b[\w-]+\.github\.io\/[\w\/-]*/i) || [])[0] || "";
  return { email, phone, linkedin, github, portfolio };
}

export function parseResume(text) {
  const raw = norm(text);
  const lines = raw.split("\n").map((l) => l.replace(/\s+$/, ""));
  const sections = { header: [] };
  const order = [];
  const unknownHeadings = [];
  let cur = "header";
  for (const line of lines) {
    const t = line.trim();
    if (!t) { (sections[cur] ||= []).push(""); continue; }
    const key = BULLET.test(line) ? null : headingKey(t);
    if (key) { cur = key; (sections[cur] ||= []); if (!order.includes(key)) order.push(key); continue; }
    if (cur !== "header" && /^[A-Z][A-Z &/]{3,30}$/.test(t) && !/@|\d/.test(t) && t.split(" ").length <= 4 && !BULLET.test(line)) unknownHeadings.push(t);
    (sections[cur] ||= []).push(line);
  }
  const contact = extractContact(raw);
  const header = sections.header.filter((l) => l.trim());
  let name = "";
  for (const l of header.slice(0, 4)) {
    const t = l.trim();
    if (/@|\d|http|linkedin|github/i.test(t)) continue;
    const w = t.split(/\s+/);
    if (w.length >= 2 && w.length <= 5 && /^[A-Za-z][A-Za-z.\-' ]+$/.test(t)) { name = t; break; }
  }
  const bullets = [];
  for (const sec of ["experience", "projects", "achievements"]) {
    for (const l of sections[sec] || []) {
      const t = l.trim();
      if (!t) continue;
      if (BULLET.test(l)) bullets.push({ section: sec, text: t.replace(BULLET, "").trim() });
      else if (t.split(/\s+/).length >= 9 && !t.includes("|")) bullets.push({ section: sec, text: t });
    }
  }
  const dateSrc = lines.filter((l) => !/date of birth|\bdob\b|\bborn\b/i.test(l)).join("\n");
  const dateMatches = [...dateSrc.matchAll(new RegExp(`${MONTH}\\s+\\d{4}`, "gi"))].map((m) => m[0]);
  const numericDates = [...dateSrc.matchAll(/\b\d{1,2}[\/.]\d{4}\b/g)].map((m) => m[0]);
  const years = [...dateSrc.matchAll(/\b(?:19|20)\d{2}\b/g)].map((m) => m[0]);
  return { raw, lines, sections, order, unknownHeadings, contact, name, bullets, dates: { monthYear: dateMatches, numeric: numericDates, years }, wordCount: (raw.match(/\S+/g) || []).length };
}
