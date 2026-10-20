// Agentic ATS pipeline: Parse -> Retrieve (RAG) -> Score -> Plan -> Rewrite (LLM or rules) -> Guard -> Verify -> iterate.
// The deterministic engine is the judge; the LLM is only a proposer, and nothing unsupported survives the guard.
import { parseResume } from "./parser.js";
import { scoreParsed } from "./ats.js";
import { matchRoles, buildKeywords, roleById, search } from "./rag.js";
import { toStructured, resumeToText, ruleBasedRewrite, coerceResume } from "./resume.js";
import { findFabrications, sanitize } from "./guard.js";

export const IDEAL_LAYOUT = { columns: 1, hasTables: false, hasGraphics: false, marginsOk: true, textBased: true };

export function extractJson(s) {
  const t = String(s || "").trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try { return JSON.parse(t); } catch { /* fall through */ }
  const a = t.indexOf("{"), b = t.lastIndexOf("}");
  if (a >= 0 && b > a) { try { return JSON.parse(t.slice(a, b + 1)); } catch { /* ignore */ } }
  return null;
}

const REWRITE_SYSTEM = [
  "You are an expert ATS resume editor. Improve the resume JSON for ATS compatibility WITHOUT inventing anything.",
  "HARD RULES:",
  "1. Never add employers, projects, degrees, dates, links, numbers, percentages, metrics or skills that are not present in the input resume, USER_FACTS or CONFIRMED_SKILLS.",
  "2. Keep every existing entry. You may merge duplicates, reorder bullets by impact and tighten wording.",
  "3. Start every bullet with a strong past-tense action verb; 10-24 words; one idea per bullet; no first-person pronouns.",
  "4. Use the exact wording of CONFIRMED_SKILLS and TARGET_KEYWORDS only where the resume already supports them.",
  "5. Summary: 2-3 sentences, target role first, only facts already in the resume.",
  "6. Remove personal data (photo, date of birth, marital status) and cliché phrases.",
  "Return ONLY JSON with keys: name, contact{phone,email,linkedin,github,portfolio}, summary, skills[{group,items[]}], experience[{role,company,dates,location,bullets[]}], projects[{name,stack,link,bullets[]}], education[{degree,school,dates,bullets[]}], certifications[], achievements[]."
].join("\n");

const EXTRAS_SYSTEM = [
  "You write career documents grounded ONLY in the supplied resume. Never invent employers, numbers or skills.",
  'Return ONLY JSON: {"coverLetter": string (max 230 words, plain text, no placeholders except [Hiring Manager]), "linkedin": {"headline": string (max 120 chars), "about": string (max 900 chars)}, "interview": [8 strings: likely interview questions that probe the projects and skills listed]}.'
].join("\n");

export async function generateExtras({ resume, role, jd = "", text = "", allowedText = "", llm }) {
  const raw = await llm({ system: EXTRAS_SYSTEM, user: JSON.stringify({ TARGET_ROLE: role.title, JOB_DESCRIPTION: jd.slice(0, 3000), RESUME: resume }), json: true });
  const out = extractJson(raw);
  if (!out) throw new Error("model returned invalid JSON");
  const f = findFabrications(text || resumeToText(resume), JSON.stringify(out), allowedText);
  out._unsupported = f.count ? [...f.numbers, ...f.skills] : [];
  return out;
}

export function buildNeedsInput(resume, score, keywords) {
  const impact = score.categories.find((c) => c.id === "impact");
  const kw = score.categories.find((c) => c.id === "keywords");
  const contact = score.categories.find((c) => c.id === "contact").issues.map((i) => i.msg);
  return {
    metrics: (impact.missingMetric || []).slice(0, 6).map((b) => ({ bullet: b, question: "Can you quantify this truthfully? (users, requests, % improvement, time or cost saved, dataset or fleet size)" })),
    missingKeywords: (kw.missing || []).slice(0, 14),
    contact
  };
}

export async function runAgent({ text, jd = "", roleId = "", confirmedSkills = [], answers = {}, layout = null, pages = null, llm = null, target = 95, maxIter = 3, extras = false, onStep = () => {} }) {
  const step = (id, title, detail = "") => onStep({ id, title, detail, ts: Date.now() });
  step("parse", "Parsing resume", "Detecting sections, contact details, bullets and dates");
  const parsed = parseResume(text);
  const original = toStructured(parsed);

  step("rag", "Retrieving role profile (RAG)", "Matching your skills against role profiles and ATS guidelines");
  const roles = matchRoles(text, 3);
  const role = roleById(roleId) || roleById(roles[0].id);
  const keywords = buildKeywords({ jd, roleId: role.id });
  const guidance = search(`${role.title} ats resume ${jd.slice(0, 200)}`, { kind: "guideline", k: 3 });
  step("rag-done", `Target role: ${role.title}`, `${keywords.length} target keywords (${jd.trim().length > 40 ? "job description + role profile" : "role profile"})`);

  const ctx = { keywords, layout, pages };
  const before = scoreParsed(parsed, ctx);
  step("score", `Baseline ATS score: ${before.score}`, `${before.grade}; ${before.issues.length} improvement opportunities`);

  const plan = before.issues.slice(0, 8);
  step("plan", "Planning fixes", plan.slice(0, 4).map((i) => `+${i.gain} ${i.msg}`).join(" | "));

  const allowedText = confirmedSkills.join(" ") + " " + Object.values(answers).join(" ");
  const afterCtx = { keywords, layout: IDEAL_LAYOUT, pages: null };
  const history = [{ iter: 0, label: "Original", score: before.score, fabrications: 0 }];
  let best = { score: -1, resume: original, text: resumeToText(original) };
  const notes = [];
  let feedback = "";

  // Pass A: deterministic cleanup (always runs, always safe)
  const rb = ruleBasedRewrite(original, { confirmedSkills, answers, roleTitle: role.title, fullText: text });
  rb.log.forEach((l) => notes.push(l));
  const rbText = resumeToText(rb.resume);
  const rbScore = scoreParsed(parseResume(rbText), afterCtx);
  best = { score: rbScore.score, resume: rb.resume, text: rbText };
  history.push({ iter: 1, label: "Rule-based cleanup", score: rbScore.score, fabrications: 0 });
  step("rules", `Rule-based cleanup: ${rbScore.score}`, rb.log.join("; ") || "Normalised headings, dates and bullets");

  // Pass B: LLM proposer + deterministic verifier loop
  let usedLLM = false;
  if (llm && best.score < target) {
    for (let i = 0; i < maxIter && best.score < target; i++) {
      step("llm", `Agent rewrite attempt ${i + 1}/${maxIter}`, "Proposing improvements under the no-fabrication rules");
      let cand;
      try {
        const user = JSON.stringify({
          TARGET_ROLE: role.title, TARGET_KEYWORDS: keywords.filter((k) => confirmedSkills.map((s) => s.toLowerCase()).includes(k.term) || before.categories[2].matched.includes(k.term)).map((k) => k.term),
          CONFIRMED_SKILLS: confirmedSkills, USER_FACTS: answers, GUIDELINES: guidance.map((g) => g.title + ": " + g.text),
          ISSUES_TO_FIX: plan.map((p) => p.msg + " -> " + p.fix), FEEDBACK_FROM_VERIFIER: feedback, RESUME: best.resume
        });
        const raw = await llm({ system: REWRITE_SYSTEM, user, json: true });
        const obj = extractJson(raw);
        if (!obj) throw new Error("model returned invalid JSON");
        cand = coerceResume(obj); usedLLM = true;
      } catch (e) { step("llm-error", "LLM unavailable, keeping rule-based result", String(e.message || e)); break; }
      const candText = resumeToText(cand);
      const fabs = findFabrications(text, candText, allowedText);
      let finalRes = cand, finalText = candText;
      if (fabs.count) {
        step("guard", `Guard caught ${fabs.count} unsupported fact(s)`, [...fabs.numbers, ...fabs.skills, ...fabs.links].join(", "));
        const s = sanitize(cand, original, text, allowedText); s.notes.forEach((n) => notes.push(n));
        finalRes = s.resume; finalText = resumeToText(finalRes);
        feedback = `Your previous answer contained unsupported facts (${[...fabs.numbers, ...fabs.skills, ...fabs.links].join(", ")}). Remove them.`;
      } else feedback = "";
      const sc = scoreParsed(parseResume(finalText), afterCtx);
      history.push({ iter: history.length, label: `Agent attempt ${i + 1}`, score: sc.score, fabrications: fabs.count });
      step("verify", `Verified score: ${sc.score}`, sc.score > best.score ? "Improvement accepted" : "No improvement, discarded");
      if (sc.score > best.score) best = { score: sc.score, resume: finalRes, text: finalText };
      else if (!fabs.count) break;
    }
  }

  const finalScore = scoreParsed(parseResume(best.text), afterCtx);
  const needsInput = buildNeedsInput(best.resume, finalScore, keywords);
  step("done", `Final ATS score: ${finalScore.score}`, finalScore.score >= target ? "Target reached" : "Target not reached: provide the real details below to close the gap");

  let extrasOut = null;
  if (extras && llm) {
    step("extras", "Generating cover letter, LinkedIn text and interview questions");
    try { extrasOut = await generateExtras({ resume: best.resume, role, jd, text, allowedText, llm }); } catch (e) { step("extras-error", "Extras unavailable", String(e.message || e)); }
  }
  return { usedLLM, role, roles, keywords, before, after: finalScore, history, resume: best.resume, text: best.text, notes: [...new Set(notes)], needsInput, extras: extrasOut, target };
}
