"use client";

import { useState, useRef, useEffect } from "react";
import * as mammoth from "mammoth";
import { Github, Linkedin, Instagram, Upload, FileText, Mail } from "lucide-react";

const FONT_IMPORT = `
@import url('https://fonts.googleapis.com/css2?family=Newsreader:wght@500;600;700;800&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
`;

const COLORS = {
  bg: "#0A0E17",
  card: "rgba(24,31,48,0.55)",
  cardBorder: "rgba(201,162,75,0.14)",
  cardBorderHover: "rgba(201,162,75,0.55)",
  ink: "#F5F6FA",
  inkSoft: "#96A0B5",
  inkFaint: "#5C6579",
  gold: "#D9B15C",
  goldBright: "#F0C878",
  goldSoft: "rgba(201,162,75,0.12)",
  cyan: "#5FD3D0",
  pass: "#57C495",
  passBg: "rgba(87,196,149,0.1)",
  flag: "#E67A63",
  flagBg: "rgba(230,122,99,0.1)",
};

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function highlightResume(text, keywords) {
  if (!text) return null;
  if (!keywords || keywords.length === 0) return [text];
  const pattern = keywords.map(escapeRegExp).filter(Boolean).join("|");
  if (!pattern) return [text];
  const re = new RegExp(`(${pattern})`, "gi");
  const parts = text.split(re);
  return parts.map((part, i) => {
    const isMatch = keywords.some((k) => k.toLowerCase() === part.toLowerCase());
    if (isMatch) {
      return (
        <span
          key={i}
          style={{
            background: "linear-gradient(180deg, transparent 60%, rgba(217,177,92,0.28) 60%)",
            color: COLORS.goldBright,
            fontWeight: 500,
            padding: "0 1px",
          }}
        >
          {part}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result.split(",")[1]);
    r.onerror = () => reject(new Error("Read failed"));
    r.readAsDataURL(file);
  });
}

function repairJSON(str) {
  let s = str;
  // Remove trailing commas before } or ]
  s = s.replace(/,\s*([}\]])/g, "$1");
  // Escape stray literal newlines/tabs that appear INSIDE string values
  // (common when the model doesn't escape them), by walking char by char.
  let out = "";
  let inString = false;
  let escaped = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (inString) {
      if (escaped) {
        out += ch;
        escaped = false;
        continue;
      }
      if (ch === "\\") {
        out += ch;
        escaped = true;
        continue;
      }
      if (ch === '"') {
        inString = false;
        out += ch;
        continue;
      }
      if (ch === "\n") {
        out += "\\n";
        continue;
      }
      if (ch === "\t") {
        out += "\\t";
        continue;
      }
      out += ch;
    } else {
      if (ch === '"') inString = true;
      out += ch;
    }
  }
  return out;
}

function safeParseJSON(rawText) {
  const clean = rawText.replace(/```json|```/g, "").trim();
  const start = clean.indexOf("{");
  const end = clean.lastIndexOf("}");
  const candidate = start !== -1 && end !== -1 && end > start ? clean.slice(start, end + 1) : clean;

  try {
    return JSON.parse(candidate);
  } catch (e1) {
    try {
      return JSON.parse(repairJSON(candidate));
    } catch (e2) {
      const err = new Error(`JSON parse failed: ${e2.message}`);
      err.raw = candidate.slice(0, 300);
      throw err;
    }
  }
}

/* ---------- Logo mark: angular hexagon monogram, gradient stroke ---------- */
function LogoMark({ size = 40, gradId }) {
  return (
    <svg width={size} height={size} viewBox="0 0 44 44" fill="none" style={{ filter: "drop-shadow(0 0 8px rgba(217,177,92,0.45))" }}>
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={COLORS.goldBright} />
          <stop offset="100%" stopColor={COLORS.gold} />
        </linearGradient>
      </defs>
      <polygon
        points="22,2 39,12 39,32 22,42 5,32 5,12"
        fill="rgba(217,177,92,0.08)"
        stroke={`url(#${gradId})`}
        strokeWidth="1.6"
      />
      <text
        x="22"
        y="28"
        textAnchor="middle"
        fontFamily="'Newsreader', serif"
        fontWeight="700"
        fontSize="16"
        fill={COLORS.goldBright}
      >
        N
      </text>
    </svg>
  );
}

function ScoreRing({ score }) {
  const size = 148;
  const stroke = 9;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 75 ? COLORS.pass : score >= 50 ? COLORS.gold : COLORS.flag;
  return (
    <div style={{ position: "relative", width: size, height: size, filter: `drop-shadow(0 0 18px ${color}55)` }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <defs>
          <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity="0.55" />
            <stop offset="100%" stopColor={color} stopOpacity="1" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#ringGrad)"
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1.1s cubic-bezier(0.4,0,0.2,1)" }}
        />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "36px", fontWeight: 600, color: COLORS.ink, lineHeight: 1 }}>
          {score}
        </div>
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "10px", color: COLORS.inkFaint, letterSpacing: "0.1em", marginTop: "4px" }}>
          ATS SCORE
        </div>
      </div>
    </div>
  );
}

function PassProbability({ value }) {
  return (
    <div style={{ minWidth: "150px", display: "flex", flexDirection: "column", justifyContent: "center", gap: "10px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <span className="pulse-dot" />
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "10px", letterSpacing: "0.1em", color: COLORS.cyan }}>
          AI PASS PROBABILITY
        </span>
      </div>
      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "34px", fontWeight: 600, color: COLORS.ink, lineHeight: 1 }}>
        {value}<span style={{ fontSize: "16px", color: COLORS.inkFaint }}>%</span>
      </div>
      <div style={{ height: "5px", borderRadius: "4px", backgroundColor: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
        <div
          style={{
            width: `${value}%`,
            height: "100%",
            background: `linear-gradient(90deg, ${COLORS.cyan}88, ${COLORS.cyan})`,
            boxShadow: `0 0 10px ${COLORS.cyan}77`,
            transition: "width 1.1s cubic-bezier(0.4,0,0.2,1)",
          }}
        />
      </div>
    </div>
  );
}

function CategoryBar({ label, value }) {
  const color = value >= 75 ? COLORS.pass : value >= 50 ? COLORS.gold : COLORS.flag;
  return (
    <div style={{ marginBottom: "16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "7px" }}>
        <span style={{ fontSize: "12.5px", color: COLORS.inkSoft }}>{label}</span>
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "12px", color: COLORS.ink, fontWeight: 500 }}>{value}</span>
      </div>
      <div style={{ height: "6px", borderRadius: "4px", backgroundColor: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
        <div
          style={{
            width: `${value}%`,
            height: "100%",
            background: `linear-gradient(90deg, ${color}99, ${color})`,
            borderRadius: "4px",
            transition: "width 1s cubic-bezier(0.4,0,0.2,1)",
            boxShadow: `0 0 10px ${color}66`,
          }}
        />
      </div>
    </div>
  );
}

function Chip({ children, tone }) {
  const isPass = tone === "pass";
  return (
    <span
      style={{
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: "11.5px",
        fontWeight: 500,
        padding: "6px 12px",
        borderRadius: "20px",
        border: `1px solid ${isPass ? "rgba(87,196,149,0.35)" : "rgba(230,122,99,0.35)"}`,
        color: isPass ? COLORS.pass : COLORS.flag,
        backgroundColor: isPass ? COLORS.passBg : COLORS.flagBg,
        display: "inline-block",
        margin: "0 6px 8px 0",
      }}
    >
      {children}
    </span>
  );
}

const cardStyle = {
  backgroundColor: COLORS.card,
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
  border: `1px solid ${COLORS.cardBorder}`,
  borderRadius: "16px",
  padding: "28px",
  boxShadow: "0 8px 32px rgba(0,0,0,0.25)",
};

const labelStyle = {
  fontFamily: "'IBM Plex Mono', monospace",
  fontSize: "10.5px",
  letterSpacing: "0.12em",
  color: COLORS.inkFaint,
  marginBottom: "16px",
  textTransform: "uppercase",
};

const SYSTEM_PROMPT = `You are a senior technical recruiter and ATS specialist. You will be given a candidate's RESUME (as text, an uploaded PDF, or an uploaded image) and a JOB DESCRIPTION. Read the resume carefully, whatever form it arrives in, then produce a rigorous evaluation.

The resume may be poorly formatted, use tables, columns, graphics, unconventional section order, or inconsistent structure — this is common for non-ATS-friendly resumes. Still extract as much real content as possible (name, roles, companies, dates, skills, achievements) rather than giving up or leaving fields empty. A messy or poorly-structured resume should itself be reflected as a low "formatting" score and called out in section_feedback, not treated as a reason to produce a thin analysis.

Respond with ONLY a raw JSON object, no markdown fences, no preamble, in exactly this shape:
{
  "resume_text": "<the full text content of the resume, transcribed as faithfully as possible from whatever input you were given, preserving line breaks with \\n>",
  "overall_score": <integer 0-100>,
  "ats_pass_probability": <integer 0-100, your estimate of the probability this resume clears an automated ATS filter for this specific role>,
  "verdict": "<one sharp, specific sentence on hire-readiness for this role>",
  "categories": {
    "keyword_match": <integer 0-100, how well resume keywords cover the JD>,
    "formatting": <integer 0-100, ATS parseability - clean structure, no tables/graphics issues, standard headings>,
    "impact": <integer 0-100, quantified achievements vs vague duty statements>,
    "structure": <integer 0-100, logical flow, relevant section ordering for this role>,
    "tone_clarity": <integer 0-100, writing clarity, professional tone, absence of fluff>,
    "seniority_fit": <integer 0-100, how well the candidate's experience level matches what the JD is asking for>
  },
  "matched_keywords": [<up to 14 important JD keywords/skills present in the resume, exact wording as in the resume>],
  "missing_keywords": [<up to 12 important JD keywords/skills absent from the resume>],
  "section_feedback": [
    {"title": "<short section or theme label>", "comment": "<two to three sentence specific, actionable feedback referencing actual resume content>", "severity": "flag" or "pass"}
  ],
  "quick_wins": [<3 to 5 short, concrete edits the candidate could make in under 10 minutes each>]
}
Include 4-6 section_feedback items, ordered by importance (most critical first). Be specific, reference actual content, avoid generic advice. Do not include any text outside the JSON object.`;

const SYSTEM_PROMPT_OPTIMIZE = `You are an expert resume writer and ATS specialist. You will be given a candidate's original resume text, a target job description, and a prior ATS analysis (missing keywords and section feedback). Rewrite the resume so it would score 95+ out of 100 on an ATS scan for THIS SPECIFIC job description.

Before writing, work through this internally (do not include it in your output):
1. List every required skill, technology, tool, certification, and qualification explicitly named in the job description.
2. For each one, check: does the candidate's real background genuinely support including it? If yes, it MUST appear in the rewritten resume (in skills and/or naturally within a relevant bullet) using the same terminology the job description uses, not a vague paraphrase. If the resume already contains an equivalent skill under different wording (e.g. resume says "Postgres", JD says "SQL databases"), align the wording to match the JD's phrasing.
3. If a required qualification (e.g. years of experience, a specific certification, a degree level) is NOT genuinely met by the candidate, do not fabricate it — but do not let its absence cause you to under-cover everything else the candidate does have.
4. The single biggest failure mode is a rewritten resume that reads well but is missing obvious, high-value keywords straight from the job description — treat closing that gap as the primary goal, second only to truthfulness.

Rules:
- Keep every fact truthful. Do not invent employers, titles, dates, or numbers that were not implied by the original resume.
- If the original resume is poorly structured, disorganized, uses tables/columns, or buries key info, fully reorganize it into the clean structure below — do not preserve a bad structure out of caution.
- Where a metric is missing but clearly implied (e.g. "led a team"), you may rephrase for clarity, but if a real number is genuinely unknown, insert a bracketed placeholder like [X%] or [Y team members] rather than fabricating one.
- Do not keyword-stuff unnaturally — every keyword you add must sit inside a genuine, readable sentence or skill list entry.
- Use clean, standard ATS-safe formatting: plain section headers (SUMMARY, EXPERIENCE, SKILLS, EDUCATION, etc.), no tables, no columns, no graphics references.
- Fix the specific issues raised in the section feedback.
- Keep it concise and professional. Include at most the 5 most relevant experience entries — if the original has more, keep the most recent/relevant ones and omit the rest rather than including everything.

Respond with ONLY a raw JSON object, no markdown fences, no preamble, in exactly this shape:
{
  "optimized_resume": "<the full rewritten resume as plain text, with \\n for line breaks>",
  "changes_summary": [<3 to 5 short bullet points describing the key changes made and why>],
  "structured": {
    "name": "<candidate full name as it appears on the resume>",
    "title": "<a short professional title/headline matching the target role, e.g. 'Senior Backend Engineer'>",
    "contact": "<one line of contact info as available: email · phone · location · links, using only real info from the original resume>",
    "summary": "<2-3 sentence professional summary tailored to the target role>",
    "skills": [<8 to 12 key skills/keywords, short strings>],
    "experience": [
      {"role": "<job title>", "company": "<company name>", "dates": "<date range as on original resume>", "bullets": [<2 to 4 short achievement bullets, each starting with an action verb>]}
    ],
    "education": [
      {"degree": "<degree/certification>", "school": "<institution>", "dates": "<date range if available>"}
    ]
  }
}
Populate "structured" using only real information drawn from the original resume; if a field genuinely isn't present (e.g. no education listed), use an empty array or empty string for it rather than inventing content. Do not include any text outside the JSON object.`;

const SYSTEM_PROMPT_COVER_LETTER = `You are an expert cover letter writer. You will be given a candidate's resume text and a target job description. Write a compelling, concise cover letter (3-4 short paragraphs) tailored specifically to this role.

Rules:
- Keep every fact truthful — only reference skills, experience, and achievements that actually appear in the resume. Do not invent anything.
- Open with genuine, specific interest in the role (not generic filler).
- In the body, connect 2-3 concrete pieces of the candidate's real experience to what the job description is asking for.
- Close with a brief, confident call to action.
- Address it "Dear Hiring Manager," unless a specific name/company is evident from the job description.
- Sign off with the candidate's real name from the resume.
- Tone: professional, warm, confident — not stiff or generic. Avoid cliches like "I am writing to express my interest."

Respond with ONLY a raw JSON object, no markdown fences, no preamble, in exactly this shape:
{
  "cover_letter": "<the full cover letter as plain text, with \\n\\n between paragraphs, including greeting and sign-off>"
}
Do not include any text outside the JSON object.`;

function Footer() {
  return (
    <footer style={{ position: "relative", marginTop: "90px" }}>
      <div style={{ height: "1px", background: "linear-gradient(90deg, transparent, rgba(201,162,75,0.4), transparent)" }} />

      <div style={{ maxWidth: "1120px", margin: "0 auto", padding: "34px 24px 0" }}>
        <div
          style={{
            border: `1px solid ${COLORS.cardBorder}`,
            backgroundColor: COLORS.card,
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            borderRadius: "14px",
            padding: "22px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "16px",
          }}
        >
          <div>
            <div style={{ fontFamily: "'Newsreader', serif", fontWeight: 600, fontSize: "15.5px", color: COLORS.ink, marginBottom: "4px" }}>
              Need help?
            </div>
            <div style={{ fontSize: "12.5px", color: COLORS.inkSoft }}>
              Facing an issue, or have feedback? Reach out directly.
            </div>
          </div>
          <a
            href="mailto:sriramojunikhil66@gmail.com"
            className="icon-link"
            style={{
              width: "auto",
              borderRadius: "8px",
              padding: "10px 16px",
              gap: "8px",
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: "12px",
            }}
          >
            <Mail size={15} />
            sriramojunikhil66@gmail.com
          </a>
        </div>
      </div>

      <div
        style={{
          maxWidth: "1120px",
          margin: "0 auto",
          padding: "30px 24px 38px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "20px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <LogoMark size={46} gradId="logoGradFooter" />
          <div>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "10px", letterSpacing: "0.12em", color: COLORS.inkFaint, marginBottom: "4px" }}>
              BUILT BY
            </div>
            <div style={{ fontFamily: "'Newsreader', serif", fontSize: "16.5px", color: COLORS.ink, fontWeight: 700, letterSpacing: "0.01em" }}>
              NIKHIL CHARY SRIRAMOJU
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: "12px" }}>
          <a href="https://github.com/Nikhil-creat" target="_blank" rel="noopener noreferrer" className="icon-link" aria-label="GitHub">
            <Github size={16} />
          </a>
          <a href="https://in.linkedin.com/in/nikhil-chary-sriramoju-95041b38a" target="_blank" rel="noopener noreferrer" className="icon-link" aria-label="LinkedIn">
            <Linkedin size={16} />
          </a>
          <a href="https://www.instagram.com/nikhil__sriramoju" target="_blank" rel="noopener noreferrer" className="icon-link" aria-label="Instagram">
            <Instagram size={16} />
          </a>
        </div>
      </div>
    </footer>
  );
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildResumeHTML(data) {
  const skills = (data.skills || []).map(escapeHtml).join("  &middot;  ");
  const experience = (data.experience || [])
    .map(
      (job) => `
      <div class="job">
        <div class="job-row">
          <div class="job-title">${escapeHtml(job.role || "")}${job.company ? " &middot; " + escapeHtml(job.company) : ""}</div>
          <div class="job-dates">${escapeHtml(job.dates || "")}</div>
        </div>
        <ul>${(job.bullets || []).map((b) => `<li>${escapeHtml(b)}</li>`).join("")}</ul>
      </div>`
    )
    .join("");
  const education = (data.education || [])
    .map(
      (ed) => `
      <div class="edu-row">
        <div>${escapeHtml(ed.degree || "")}${ed.school ? " &mdash; " + escapeHtml(ed.school) : ""}</div>
        <div class="edu-dates">${escapeHtml(ed.dates || "")}</div>
      </div>`
    )
    .join("");

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${escapeHtml(data.name || "Resume")}</title>
<style>
  @page { margin: 0.6in; }
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #1E2430; margin: 0; padding: 24px; }
  .name { font-size: 24px; font-weight: 700; margin-bottom: 4px; }
  .title { font-size: 13px; color: #4A5568; margin-bottom: 6px; }
  .contact { font-size: 11px; color: #6B7280; margin-bottom: 18px; }
  .section-label { font-size: 10px; letter-spacing: 0.08em; color: #B8860B; margin: 16px 0 6px; text-transform: uppercase; }
  .summary { font-size: 12.5px; line-height: 1.55; color: #2D3444; }
  .skills { font-size: 12px; line-height: 1.6; color: #2D3444; }
  .job { margin-bottom: 12px; }
  .job-row { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 4px; }
  .job-title { font-weight: 700; font-size: 13px; }
  .job-dates { font-size: 10.5px; color: #6B7280; }
  ul { margin: 4px 0 0; padding-left: 18px; }
  li { font-size: 12px; line-height: 1.5; color: #2D3444; margin-bottom: 2px; }
  .edu-row { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 4px; font-size: 12.5px; margin-bottom: 4px; }
  .edu-dates { font-size: 10.5px; color: #6B7280; }
</style>
</head>
<body>
  <div class="name">${escapeHtml(data.name || "")}</div>
  ${data.title ? `<div class="title">${escapeHtml(data.title)}</div>` : ""}
  ${data.contact ? `<div class="contact">${escapeHtml(data.contact)}</div>` : ""}
  ${data.summary ? `<div class="section-label">Summary</div><div class="summary">${escapeHtml(data.summary)}</div>` : ""}
  ${skills ? `<div class="section-label">Skills</div><div class="skills">${skills}</div>` : ""}
  ${experience ? `<div class="section-label">Experience</div>${experience}` : ""}
  ${education ? `<div class="section-label">Education</div>${education}` : ""}
</body>
</html>`;
}

function downloadResumeAsPDF(data) {
  const html = buildResumeHTML(data);
  const printWindow = window.open("", "_blank", "width=800,height=1000");
  if (!printWindow) {
    alert("Please allow popups for this site to download the PDF.");
    return;
  }
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.onload = () => {
    printWindow.focus();
    printWindow.print();
  };
}

function ResumeDocument({ data }) {
  if (!data) return null;
  return (
    <div
      id="printable-resume"
      style={{
        backgroundColor: "#FDFDFC",
        color: "#1E2430",
        borderRadius: "8px",
        padding: "38px 40px",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <div style={{ fontFamily: "'Newsreader', serif", fontWeight: 700, fontSize: "26px", marginBottom: "4px" }}>
        {data.name}
      </div>
      {data.title && (
        <div style={{ fontSize: "13.5px", color: "#4A5568", marginBottom: "8px" }}>{data.title}</div>
      )}
      {data.contact && (
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "11px", color: "#6B7280", marginBottom: "20px" }}>
          {data.contact}
        </div>
      )}

      {data.summary && (
        <div style={{ marginBottom: "22px" }}>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "10px", letterSpacing: "0.1em", color: "#B8860B", marginBottom: "8px" }}>SUMMARY</div>
          <div style={{ fontSize: "13px", lineHeight: 1.6, color: "#2D3444" }}>{data.summary}</div>
        </div>
      )}

      {data.skills?.length > 0 && (
        <div style={{ marginBottom: "22px" }}>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "10px", letterSpacing: "0.1em", color: "#B8860B", marginBottom: "8px" }}>SKILLS</div>
          <div style={{ fontSize: "12.5px", color: "#2D3444", lineHeight: 1.7 }}>{data.skills.join("  ·  ")}</div>
        </div>
      )}

      {data.experience?.length > 0 && (
        <div style={{ marginBottom: "22px" }}>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "10px", letterSpacing: "0.1em", color: "#B8860B", marginBottom: "10px" }}>EXPERIENCE</div>
          {data.experience.map((job, i) => (
            <div key={i} style={{ marginBottom: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "4px" }}>
                <div style={{ fontWeight: 600, fontSize: "13.5px", color: "#1E2430" }}>
                  {job.role}{job.company ? ` · ${job.company}` : ""}
                </div>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "11px", color: "#6B7280" }}>{job.dates}</div>
              </div>
              <ul style={{ margin: "6px 0 0", paddingLeft: "18px" }}>
                {job.bullets?.map((b, j) => (
                  <li key={j} style={{ fontSize: "12.5px", lineHeight: 1.6, color: "#2D3444", marginBottom: "3px" }}>{b}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {data.education?.length > 0 && (
        <div>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "10px", letterSpacing: "0.1em", color: "#B8860B", marginBottom: "10px" }}>EDUCATION</div>
          {data.education.map((ed, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "4px", marginBottom: "6px" }}>
              <div style={{ fontSize: "13px", color: "#1E2430" }}>{ed.degree}{ed.school ? ` — ${ed.school}` : ""}</div>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "11px", color: "#6B7280" }}>{ed.dates}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ResumeReviewerPro() {
  const [resumeText, setResumeText] = useState("");
  const [resumeFile, setResumeFile] = useState(null);
  const [fileError, setFileError] = useState("");
  const [jd, setJd] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [view, setView] = useState("overview");
  const [scrollY, setScrollY] = useState(0);
  const [optimizedResume, setOptimizedResume] = useState(null);
  const [optimizing, setOptimizing] = useState(false);
  const [optimizeError, setOptimizeError] = useState("");
  const [copied, setCopied] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [coverLetter, setCoverLetter] = useState(null);
  const [coverLetterLoading, setCoverLetterLoading] = useState(false);
  const [coverLetterError, setCoverLetterError] = useState("");
  const [coverCopied, setCoverCopied] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    let ticking = false;
    function onScroll() {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setScrollY(window.scrollY || 0);
          ticking = false;
        });
        ticking = true;
      }
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const hasResumeInput = resumeText.trim().length > 30 || !!resumeFile;
  const canRun = hasResumeInput && jd.trim().length > 30 && !loading;

  async function processFile(file) {
    if (!file) return;
    setFileError("");
    const ext = file.name.split(".").pop().toLowerCase();

    try {
      if (ext === "pdf") {
        const base64 = await fileToBase64(file);
        setResumeFile({ kind: "pdf", name: file.name, data: base64, mediaType: "application/pdf" });
        setResumeText("");
      } else if (ext === "docx" || ext === "doc") {
        const arrayBuffer = await file.arrayBuffer();
        const { value } = await mammoth.extractRawText({ arrayBuffer });
        setResumeText(value);
        setResumeFile(null);
      } else if (["jpg", "jpeg", "png", "webp"].includes(ext)) {
        const base64 = await fileToBase64(file);
        const mediaType = ext === "jpg" ? "image/jpeg" : `image/${ext}`;
        setResumeFile({ kind: "image", name: file.name, data: base64, mediaType });
        setResumeText("");
      } else {
        setFileError("Unsupported file type. Use PDF, DOCX, JPG, or PNG.");
      }
    } catch (err) {
      setFileError("Couldn't read that file. Try a different one.");
    }
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    processFile(file);
  }

  function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  }

  function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }

  function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    processFile(file);
  }

  function clearFile() {
    setResumeFile(null);
    setFileError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function runScan() {
    setLoading(true);
    setError("");
    setResult(null);
    setOptimizedResume(null);
    setOptimizeError("");
    try {
      let userContent;
      if (resumeFile) {
        const block =
          resumeFile.kind === "pdf"
            ? { type: "document", source: { type: "base64", media_type: resumeFile.mediaType, data: resumeFile.data } }
            : { type: "image", source: { type: "base64", media_type: resumeFile.mediaType, data: resumeFile.data } };
        userContent = [
          block,
          { type: "text", text: `The file above is the candidate's resume (${resumeFile.name}).\n\nJOB DESCRIPTION:\n${jd}` },
        ];
      } else {
        userContent = [{ type: "text", text: `RESUME:\n${resumeText}\n\nJOB DESCRIPTION:\n${jd}` }];
      }

      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ systemPrompt: SYSTEM_PROMPT, userContent }),
      });
      const data = await response.json();

      if (!response.ok || data.error) {
        setError(data.error || "Scan couldn't finish. Try again.");
        return;
      }

      const text = data.content.map((b) => (b.type === "text" ? b.text : "")).join("").trim();
      const parsed = safeParseJSON(text);
      setResult(parsed);
      setView("optimized");
      generateOptimizedResume(parsed);
    } catch (e) {
      setError(`Scan couldn't finish — ${e.message || "unknown error"}. Try again.`);
    } finally {
      setLoading(false);
    }
  }

  async function generateOptimizedResume(analysis) {
    const source = analysis || result;
    if (!source) return;
    setOptimizing(true);
    setOptimizeError("");
    try {
      const context = `ORIGINAL RESUME:\n${source.resume_text || resumeText}\n\nJOB DESCRIPTION:\n${jd}\n\nMISSING KEYWORDS TO WEAVE IN WHERE TRUE:\n${(source.missing_keywords || []).join(", ")}\n\nSECTION FEEDBACK TO ADDRESS:\n${(source.section_feedback || []).map((f) => `- ${f.title}: ${f.comment}`).join("\n")}`;

      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ systemPrompt: SYSTEM_PROMPT_OPTIMIZE, userContent: [{ type: "text", text: context }] }),
      });
      const data = await response.json();

      if (!response.ok || data.error) {
        setOptimizeError(data.error || "Couldn't generate the optimized resume. Try again.");
        return;
      }

      const text = data.content.map((b) => (b.type === "text" ? b.text : "")).join("").trim();
      const parsed = safeParseJSON(text);
      setOptimizedResume(parsed);
    } catch (e) {
      setOptimizeError(`Couldn't generate the optimized resume — ${e.message || "unknown error"}. Try again.`);
    } finally {
      setOptimizing(false);
    }
  }

  function copyOptimized() {
    if (!optimizedResume?.optimized_resume) return;
    navigator.clipboard.writeText(optimizedResume.optimized_resume).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }

  function downloadOptimized() {
    if (!optimizedResume?.optimized_resume) return;
    const blob = new Blob([optimizedResume.optimized_resume], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "optimized-resume.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function generateCoverLetter() {
    if (!result) return;
    setCoverLetterLoading(true);
    setCoverLetterError("");
    try {
      const context = `RESUME:\n${result.resume_text || resumeText}\n\nJOB DESCRIPTION:\n${jd}`;
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ systemPrompt: SYSTEM_PROMPT_COVER_LETTER, userContent: [{ type: "text", text: context }] }),
      });
      const data = await response.json();

      if (!response.ok || data.error) {
        setCoverLetterError(data.error || "Couldn't generate the cover letter. Try again.");
        return;
      }

      const text = data.content.map((b) => (b.type === "text" ? b.text : "")).join("").trim();
      const parsed = safeParseJSON(text);
      setCoverLetter(parsed.cover_letter);
    } catch (e) {
      setCoverLetterError(`Couldn't generate the cover letter — ${e.message || "unknown error"}. Try again.`);
    } finally {
      setCoverLetterLoading(false);
    }
  }

  function copyCoverLetter() {
    if (!coverLetter) return;
    navigator.clipboard.writeText(coverLetter).then(() => {
      setCoverCopied(true);
      setTimeout(() => setCoverCopied(false), 1800);
    });
  }

  function downloadCoverLetterTxt() {
    if (!coverLetter) return;
    const blob = new Blob([coverLetter], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "cover-letter.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function downloadCoverLetterPDF() {
    if (!coverLetter) return;
    const paragraphs = coverLetter
      .split(/\n\s*\n/)
      .map((p) => `<p>${escapeHtml(p).replace(/\n/g, "<br>")}</p>`)
      .join("");
    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Cover Letter</title>
<style>
  @page { margin: 0.8in; }
  body { font-family: Arial, Helvetica, sans-serif; color: #1E2430; font-size: 13px; line-height: 1.7; margin: 0; padding: 24px; }
  p { margin: 0 0 14px; }
</style>
</head>
<body>${paragraphs}</body>
</html>`;
    const printWindow = window.open("", "_blank", "width=800,height=1000");
    if (!printWindow) {
      alert("Please allow popups for this site to download the PDF.");
      return;
    }
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
    };
  }

  return (
    <div style={{ minHeight: "100vh", backgroundColor: COLORS.bg, fontFamily: "'Inter', sans-serif", color: COLORS.ink, position: "relative", overflow: "hidden" }}>
      <style>{`
        ${FONT_IMPORT}
        * { box-sizing: border-box; }

        .depth-gradient {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            180deg,
            #1a2c42 0%,
            #101a2c 12%,
            #0d1420 28%,
            #0a0e17 50%,
            #070a11 72%,
            #04060a 100%
          );
          pointer-events: none;
        }

        .ice-shard {
          position: absolute;
          width: 10px;
          height: 10px;
          background: linear-gradient(135deg, rgba(210,235,240,0.55), rgba(95,211,208,0.12));
          clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%);
          filter: blur(0.2px);
          animation: iceDrift linear infinite;
          pointer-events: none;
        }
        @keyframes iceDrift {
          0% { transform: translateY(-40px) translateX(0) rotate(0deg); opacity: 0; }
          8% { opacity: 0.8; }
          92% { opacity: 0.5; }
          100% { transform: translateY(2400px) translateX(40px) rotate(180deg); opacity: 0; }
        }

        .grid-bg {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(217,177,92,0.055) 1px, transparent 1px),
            linear-gradient(90deg, rgba(217,177,92,0.055) 1px, transparent 1px);
          background-size: 46px 46px;
          -webkit-mask-image: radial-gradient(ellipse 900px 500px at 50% 0%, black 40%, transparent 85%);
          mask-image: radial-gradient(ellipse 900px 500px at 50% 0%, black 40%, transparent 85%);
          animation: gridDrift 30s linear infinite;
          pointer-events: none;
        }
        @keyframes gridDrift {
          from { background-position: 0 0, 0 0; }
          to { background-position: 46px 46px, 46px 46px; }
        }

        .scan-line {
          position: absolute;
          left: 0; right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(95,211,208,0.55), transparent);
          animation: scanSweep 6s ease-in-out infinite;
          pointer-events: none;
        }
        @keyframes scanSweep {
          0% { top: 0%; opacity: 0; }
          10% { opacity: 1; }
          50% { top: 70%; opacity: 1; }
          60% { opacity: 0; }
          100% { top: 70%; opacity: 0; }
        }

        .glow-orb-1 {
          position: absolute; top: -180px; left: -120px; width: 520px; height: 520px;
          background: radial-gradient(circle, rgba(217,177,92,0.16) 0%, transparent 70%);
          filter: blur(20px); pointer-events: none;
        }
        .glow-orb-2 {
          position: absolute; top: 260px; right: -180px; width: 480px; height: 480px;
          background: radial-gradient(circle, rgba(95,211,208,0.10) 0%, transparent 70%);
          filter: blur(30px); pointer-events: none;
        }

        .pulse-dot {
          width: 7px; height: 7px; border-radius: 50%;
          background: ${COLORS.cyan};
          box-shadow: 0 0 0 0 rgba(95,211,208,0.6);
          animation: pulseDot 1.8s ease-out infinite;
        }
        @keyframes pulseDot {
          0% { box-shadow: 0 0 0 0 rgba(95,211,208,0.55); }
          70% { box-shadow: 0 0 0 8px rgba(95,211,208,0); }
          100% { box-shadow: 0 0 0 0 rgba(95,211,208,0); }
        }

        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .fade-in { animation: fadeInUp 0.55s cubic-bezier(0.2,0.8,0.2,1) both; }
        .fade-in-1 { animation-delay: 0.05s; }
        .fade-in-2 { animation-delay: 0.12s; }
        .fade-in-3 { animation-delay: 0.19s; }

        .glass-card { transition: border-color 0.25s ease, transform 0.25s ease, box-shadow 0.25s ease; }
        .glass-card:hover { border-color: ${COLORS.cardBorderHover}; }

        textarea:focus {
          outline: none;
          border-color: ${COLORS.gold} !important;
          box-shadow: 0 0 0 3px rgba(217,177,92,0.12);
        }
        .upload-zone { transition: border-color 0.2s ease, color 0.2s ease, background 0.2s ease; }
        .upload-zone:hover {
          border-color: ${COLORS.gold} !important;
          color: ${COLORS.goldBright} !important;
          background: rgba(217,177,92,0.05);
        }

        .btn-primary { transition: transform 0.2s ease, box-shadow 0.2s ease, filter 0.2s ease; }
        .btn-primary:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 10px 30px rgba(217,177,92,0.35);
          filter: brightness(1.08);
        }
        .btn-primary:active:not(:disabled) { transform: translateY(0); }

        .tab-btn { transition: all 0.2s ease; }
        .tab-btn:hover { border-color: ${COLORS.gold} !important; color: ${COLORS.goldBright} !important; }

        .icon-link {
          width: 36px; height: 36px; border-radius: 50%;
          border: 1px solid rgba(255,255,255,0.1);
          display: flex; align-items: center; justify-content: center;
          color: ${COLORS.inkSoft}; text-decoration: none;
          transition: all 0.2s ease;
        }
        .icon-link:hover {
          border-color: ${COLORS.gold}; color: ${COLORS.goldBright};
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(217,177,92,0.25);
        }

        .clear-btn { transition: color 0.15s ease, transform 0.15s ease; }
        .clear-btn:hover { color: ${COLORS.flag}; transform: scale(1.15); }

        @media (max-width: 860px) {
          .pro-grid { grid-template-columns: 1fr !important; }
          .stat-row { flex-direction: column; align-items: flex-start !important; }
        }
        @media (max-width: 560px) {
          .cat-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <div className="depth-gradient" />
      <div className="grid-bg" />
      <div className="scan-line" />
      <div
        className="glow-orb-1"
        style={{ transform: `translateY(${scrollY * 0.15}px)` }}
      />
      <div
        className="glow-orb-2"
        style={{ transform: `translateY(${scrollY * -0.1}px)` }}
      />
      {[
        { left: "6%", size: 8, duration: 16, delay: 0 },
        { left: "18%", size: 12, duration: 22, delay: 3 },
        { left: "34%", size: 6, duration: 14, delay: 6 },
        { left: "52%", size: 10, duration: 19, delay: 1 },
        { left: "68%", size: 14, duration: 25, delay: 8 },
        { left: "81%", size: 7, duration: 17, delay: 4 },
        { left: "92%", size: 9, duration: 20, delay: 10 },
      ].map((s, i) => (
        <div
          key={i}
          className="ice-shard"
          style={{
            left: s.left,
            width: `${s.size}px`,
            height: `${s.size}px`,
            animationDuration: `${s.duration}s`,
            animationDelay: `${s.delay}s`,
          }}
        />
      ))}

      {/* Top bar */}
      <div style={{ position: "relative", borderBottom: `1px solid rgba(255,255,255,0.06)`, backdropFilter: "blur(10px)" }}>
        <div style={{ maxWidth: "1120px", margin: "0 auto", padding: "18px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <LogoMark size={34} gradId="logoGradTop" />
            <div>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "12.5px", letterSpacing: "0.08em", color: COLORS.ink, fontWeight: 600 }}>
                NIKHIL CHARY SRIRAMOJU
              </div>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "9.5px", letterSpacing: "0.1em", color: COLORS.inkFaint }}>
                RESUME INTELLIGENCE
              </div>
            </div>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: "10.5px",
              letterSpacing: "0.06em",
              color: COLORS.cyan,
              border: "1px solid rgba(95,211,208,0.3)",
              backgroundColor: "rgba(95,211,208,0.08)",
              borderRadius: "20px",
              padding: "6px 12px",
            }}
          >
            <span className="pulse-dot" />
            AI ENGINE ACTIVE
          </div>
        </div>
      </div>

      <div style={{ position: "relative", maxWidth: "1120px", margin: "0 auto", padding: "56px 24px 40px" }}>
        <div className="fade-in fade-in-1">
          <div
            style={{
              display: "inline-block",
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: "11px",
              letterSpacing: "0.1em",
              color: COLORS.goldBright,
              backgroundColor: COLORS.goldSoft,
              border: `1px solid rgba(217,177,92,0.3)`,
              borderRadius: "20px",
              padding: "6px 14px",
              marginBottom: "22px",
            }}
          >
            AI-POWERED · RECRUITER STANDARD
          </div>
          <h1
            style={{
              fontFamily: "'Newsreader', serif",
              fontWeight: 700,
              fontSize: "clamp(32px, 4.6vw, 46px)",
              lineHeight: 1.12,
              margin: "0 0 16px",
              maxWidth: "680px",
              letterSpacing: "-0.01em",
            }}
          >
            A recruiter-grade read on your resume,{" "}
            <span
              style={{
                background: `linear-gradient(90deg, ${COLORS.goldBright}, ${COLORS.gold})`,
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              before it reaches one.
            </span>
          </h1>
          <p style={{ color: COLORS.inkSoft, fontSize: "16px", maxWidth: "560px", marginBottom: "44px", lineHeight: 1.6 }}>
            Upload your resume as a PDF, Word doc, or photo — or paste the text.
            Add the target job description and get a category-level breakdown,
            missing keywords, and specific edits.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: "24px" }} className="pro-grid">
          <div className="fade-in fade-in-2" style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
            <div style={cardStyle} className="glass-card">
              <div style={labelStyle}>RESUME</div>

              {resumeFile ? (
                <div
                  style={{
                    border: `1px solid rgba(217,177,92,0.4)`,
                    background: "linear-gradient(135deg, rgba(217,177,92,0.1), rgba(217,177,92,0.03))",
                    borderRadius: "10px",
                    padding: "16px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: "12px",
                  }}
                >
                  <div style={{ display: "flex", flexDirection: "column", gap: "3px", overflow: "hidden" }}>
                    <span style={{ fontSize: "12.5px", color: COLORS.goldBright, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {resumeFile.name}
                    </span>
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "10.5px", color: COLORS.inkFaint }}>
                      {resumeFile.kind === "pdf" ? "PDF ATTACHED" : "IMAGE ATTACHED"}
                    </span>
                  </div>
                  <button onClick={clearFile} className="clear-btn" style={{ background: "none", border: "none", color: COLORS.inkFaint, cursor: "pointer", fontSize: "18px", padding: "4px" }}>
                    ×
                  </button>
                </div>
              ) : (
                <textarea
                  value={resumeText}
                  onChange={(e) => setResumeText(e.target.value)}
                  placeholder="Paste your resume text..."
                  style={{
                    width: "100%",
                    height: "170px",
                    padding: "13px",
                    border: `1px solid rgba(255,255,255,0.08)`,
                    borderRadius: "10px",
                    backgroundColor: "rgba(0,0,0,0.2)",
                    color: COLORS.ink,
                    fontFamily: "'Inter', sans-serif",
                    fontSize: "12.5px",
                    resize: "vertical",
                    boxSizing: "border-box",
                    marginBottom: "12px",
                  }}
                />
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp"
                onChange={handleFileChange}
                style={{ display: "none" }}
                id="resume-file-input"
              />
              <label
                htmlFor="resume-file-input"
                className="upload-zone"
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: "11.5px",
                  color: dragActive ? COLORS.goldBright : COLORS.inkSoft,
                  border: `1.5px dashed ${dragActive ? COLORS.gold : "rgba(255,255,255,0.15)"}`,
                  backgroundColor: dragActive ? "rgba(217,177,92,0.07)" : "transparent",
                  borderRadius: "10px",
                  padding: "22px 14px",
                  cursor: "pointer",
                  width: "100%",
                  textAlign: "center",
                  boxSizing: "border-box",
                }}
              >
                <Upload size={20} color={dragActive ? COLORS.goldBright : COLORS.inkFaint} />
                <span>{dragActive ? "DROP TO UPLOAD" : "TAP TO BROWSE · OR DRAG & DROP"}</span>
                <span style={{ fontSize: "10px", color: COLORS.inkFaint, letterSpacing: "0.03em" }}>PDF · DOCX · JPG · PNG</span>
              </label>
              {fileError && <div style={{ fontSize: "11.5px", color: COLORS.flag, marginTop: "8px" }}>{fileError}</div>}
            </div>

            <div style={cardStyle} className="glass-card">
              <div style={labelStyle}>TARGET JOB DESCRIPTION</div>
              <textarea
                value={jd}
                onChange={(e) => setJd(e.target.value)}
                placeholder="Paste the job posting..."
                style={{
                  width: "100%",
                  height: "150px",
                  padding: "13px",
                  border: `1px solid rgba(255,255,255,0.08)`,
                  borderRadius: "10px",
                  backgroundColor: "rgba(0,0,0,0.2)",
                  color: COLORS.ink,
                  fontFamily: "'Inter', sans-serif",
                  fontSize: "12.5px",
                  resize: "vertical",
                  boxSizing: "border-box",
                }}
              />
              <button
                onClick={runScan}
                disabled={!canRun}
                className="btn-primary"
                style={{
                  marginTop: "18px",
                  width: "100%",
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: "12.5px",
                  fontWeight: 600,
                  letterSpacing: "0.04em",
                  padding: "14px",
                  borderRadius: "10px",
                  border: "none",
                  background: canRun ? `linear-gradient(135deg, ${COLORS.goldBright}, ${COLORS.gold})` : "rgba(255,255,255,0.06)",
                  color: canRun ? "#1A1306" : COLORS.inkFaint,
                  cursor: canRun ? "pointer" : "not-allowed",
                }}
              >
                {loading ? "ANALYZING..." : "RUN ANALYSIS"}
              </button>
              {error && <div style={{ fontSize: "12px", color: COLORS.flag, marginTop: "10px" }}>{error}</div>}
            </div>
          </div>

          <div className="fade-in fade-in-3">
            {!result && !loading && (
              <div style={{ ...cardStyle, height: "100%", minHeight: "320px", display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", color: COLORS.inkFaint, fontSize: "13.5px" }} className="glass-card">
                Your analysis will appear here.
              </div>
            )}

            {loading && (
              <div style={{ ...cardStyle, minHeight: "320px", display: "flex", alignItems: "center", justifyContent: "center", color: COLORS.inkSoft, fontSize: "13.5px" }} className="glass-card">
                Reading your resume against the role...
              </div>
            )}

            {result && (
              <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
                <div style={{ ...cardStyle, display: "flex", gap: "32px", flexWrap: "wrap" }} className="glass-card stat-row">
                  <ScoreRing score={result.overall_score} />
                  {typeof result.ats_pass_probability === "number" && (
                    <PassProbability value={result.ats_pass_probability} />
                  )}
                  <div style={{ flex: 1, minWidth: "220px" }}>
                    <div style={labelStyle}>VERDICT</div>
                    <div style={{ fontSize: "15px", lineHeight: 1.55, marginBottom: "20px", color: COLORS.ink }}>{result.verdict}</div>
                    {result.categories && (
                      <div className="cat-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", columnGap: "24px" }}>
                        <CategoryBar label="Keyword match" value={result.categories.keyword_match} />
                        <CategoryBar label="ATS formatting" value={result.categories.formatting} />
                        <CategoryBar label="Impact / quantification" value={result.categories.impact} />
                        <CategoryBar label="Structure" value={result.categories.structure} />
                        <CategoryBar label="Tone & clarity" value={result.categories.tone_clarity} />
                        <CategoryBar label="Seniority fit" value={result.categories.seniority_fit} />
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  {["overview", "keywords", "resume", "optimized", "cover"].map((v) => (
                    <button
                      key={v}
                      onClick={() => setView(v)}
                      className="tab-btn"
                      style={{
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: "11.5px",
                        letterSpacing: "0.05em",
                        padding: "9px 16px",
                        borderRadius: "8px",
                        border: `1px solid ${view === v ? COLORS.gold : "rgba(255,255,255,0.1)"}`,
                        backgroundColor: view === v ? COLORS.goldSoft : "transparent",
                        color: view === v ? COLORS.goldBright : COLORS.inkFaint,
                        cursor: "pointer",
                        textTransform: "uppercase",
                      }}
                    >
                      {v === "overview" ? "Feedback" : v === "keywords" ? "Keywords" : v === "resume" ? "Marked-up resume" : v === "optimized" ? "95%+ Resume" : "Cover Letter"}
                    </button>
                  ))}
                </div>

                {view === "overview" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
                    <div style={cardStyle} className="glass-card">
                      <div style={labelStyle}>SECTION-BY-SECTION FEEDBACK</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
                        {result.section_feedback?.map((f, i) => (
                          <div key={i} style={{ display: "flex", gap: "14px", borderLeft: `3px solid ${f.severity === "pass" ? COLORS.pass : COLORS.flag}`, paddingLeft: "16px" }}>
                            <div>
                              <div style={{ fontFamily: "'Newsreader', serif", fontWeight: 600, fontSize: "15px", marginBottom: "5px", color: COLORS.ink }}>{f.title}</div>
                              <div style={{ fontSize: "13px", color: COLORS.inkSoft, lineHeight: 1.6 }}>{f.comment}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    {result.quick_wins?.length > 0 && (
                      <div style={cardStyle} className="glass-card">
                        <div style={labelStyle}>QUICK WINS · UNDER 10 MINUTES EACH</div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                          {result.quick_wins.map((qw, i) => (
                            <div key={i} style={{ display: "flex", gap: "10px", fontSize: "13.5px", color: COLORS.ink, lineHeight: 1.5 }}>
                              <span style={{ color: COLORS.goldBright, fontFamily: "'IBM Plex Mono', monospace" }}>→</span>
                              {qw}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {view === "keywords" && (
                  <div style={cardStyle} className="glass-card">
                    <div style={labelStyle}>MATCHED</div>
                    <div style={{ marginBottom: "24px" }}>
                      {result.matched_keywords?.length ? (
                        result.matched_keywords.map((k, i) => <Chip key={i} tone="pass">{k}</Chip>)
                      ) : (
                        <span style={{ fontSize: "13px", color: COLORS.inkFaint }}>None found.</span>
                      )}
                    </div>
                    <div style={labelStyle}>MISSING</div>
                    <div>
                      {result.missing_keywords?.length ? (
                        result.missing_keywords.map((k, i) => <Chip key={i} tone="flag">{k}</Chip>)
                      ) : (
                        <span style={{ fontSize: "13px", color: COLORS.inkFaint }}>Nothing major missing.</span>
                      )}
                    </div>
                  </div>
                )}

                {view === "resume" && (
                  <div style={cardStyle} className="glass-card">
                    <div style={labelStyle}>RESUME · MATCHED TERMS HIGHLIGHTED</div>
                    <div style={{ whiteSpace: "pre-wrap", fontSize: "13px", lineHeight: 1.8, maxHeight: "440px", overflowY: "auto", color: COLORS.ink, paddingRight: "8px" }}>
                      {highlightResume(result.resume_text || resumeText, result.matched_keywords || [])}
                    </div>
                  </div>
                )}

                {view === "optimized" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
                    {!optimizedResume && !optimizing && (
                      <div style={{ ...cardStyle, textAlign: "center", padding: "40px 28px" }} className="glass-card">
                        <div style={{ fontFamily: "'Newsreader', serif", fontSize: "18px", fontWeight: 600, marginBottom: "10px", color: COLORS.ink }}>
                          Generate a 95%+ ATS-ready rewrite
                        </div>
                        <div style={{ fontSize: "13px", color: COLORS.inkSoft, marginBottom: "22px", maxWidth: "440px", marginLeft: "auto", marginRight: "auto", lineHeight: 1.6 }}>
                          Claude rewrites your resume against this job description — fixing the flagged
                          issues and weaving in missing keywords truthfully — aimed at a 95+ ATS score.
                        </div>
                        <button onClick={() => generateOptimizedResume()} className="btn-primary" style={{
                          fontFamily: "'IBM Plex Mono', monospace",
                          fontSize: "12.5px",
                          fontWeight: 600,
                          letterSpacing: "0.04em",
                          padding: "13px 24px",
                          borderRadius: "10px",
                          border: "none",
                          background: `linear-gradient(135deg, ${COLORS.goldBright}, ${COLORS.gold})`,
                          color: "#1A1306",
                          cursor: "pointer",
                        }}>
                          {optimizeError ? "RETRY GENERATION" : "GENERATE OPTIMIZED RESUME"}
                        </button>
                        {optimizeError && (
                          <div style={{ fontSize: "12px", color: COLORS.flag, marginTop: "14px" }}>
                            {optimizeError}
                          </div>
                        )}
                      </div>
                    )}

                    {optimizing && (
                      <div style={{ ...cardStyle, minHeight: "200px", display: "flex", alignItems: "center", justifyContent: "center", color: COLORS.inkSoft, fontSize: "13.5px" }} className="glass-card">
                        <span className="pulse-dot" style={{ marginRight: "10px" }} />
                        Rewriting your resume for a 95%+ score...
                      </div>
                    )}

                    {optimizedResume && (
                      <>
                        {optimizedResume.structured && (
                          <div style={cardStyle} className="glass-card">
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px", marginBottom: "16px" }}>
                              <div style={labelStyle}>FORMATTED RESUME · READY TO DOWNLOAD</div>
                              <button onClick={() => downloadResumeAsPDF(optimizedResume.structured)} className="btn-primary" style={{
                                fontFamily: "'IBM Plex Mono', monospace", fontSize: "11px", fontWeight: 600,
                                padding: "9px 16px", borderRadius: "8px", border: "none",
                                background: `linear-gradient(135deg, ${COLORS.goldBright}, ${COLORS.gold})`,
                                color: "#1A1306", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px",
                              }}>
                                <FileText size={13} /> DOWNLOAD AS PDF
                              </button>
                            </div>
                            <div style={{ maxHeight: "560px", overflowY: "auto", borderRadius: "8px" }}>
                              <ResumeDocument data={optimizedResume.structured} />
                            </div>
                          </div>
                        )}

                        {optimizedResume.changes_summary?.length > 0 && (
                          <div style={cardStyle} className="glass-card">
                            <div style={labelStyle}>WHAT CHANGED</div>
                            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                              {optimizedResume.changes_summary.map((c, i) => (
                                <div key={i} style={{ display: "flex", gap: "10px", fontSize: "13px", color: COLORS.inkSoft, lineHeight: 1.55 }}>
                                  <span style={{ color: COLORS.pass, fontFamily: "'IBM Plex Mono', monospace" }}>✓</span>
                                  {c}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div style={cardStyle} className="glass-card">
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px", marginBottom: "16px" }}>
                            <div style={labelStyle}>PLAIN TEXT VERSION</div>
                            <div style={{ display: "flex", gap: "8px" }}>
                              <button onClick={copyOptimized} className="tab-btn" style={{
                                fontFamily: "'IBM Plex Mono', monospace", fontSize: "11px", padding: "7px 12px",
                                borderRadius: "7px", border: "1px solid rgba(255,255,255,0.12)",
                                backgroundColor: "transparent", color: COLORS.inkSoft, cursor: "pointer",
                              }}>
                                {copied ? "COPIED ✓" : "COPY"}
                              </button>
                              <button onClick={downloadOptimized} className="tab-btn" style={{
                                fontFamily: "'IBM Plex Mono', monospace", fontSize: "11px", padding: "7px 12px",
                                borderRadius: "7px", border: "1px solid rgba(255,255,255,0.12)",
                                backgroundColor: "transparent", color: COLORS.inkSoft, cursor: "pointer",
                              }}>
                                DOWNLOAD .TXT
                              </button>
                            </div>
                          </div>
                          <div style={{ whiteSpace: "pre-wrap", fontSize: "13px", lineHeight: 1.8, maxHeight: "300px", overflowY: "auto", color: COLORS.ink, paddingRight: "8px" }}>
                            {optimizedResume.optimized_resume}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {view === "cover" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
                    {!coverLetter && !coverLetterLoading && (
                      <div style={{ ...cardStyle, textAlign: "center", padding: "40px 28px" }} className="glass-card">
                        <div style={{ fontFamily: "'Newsreader', serif", fontSize: "18px", fontWeight: 600, marginBottom: "10px", color: COLORS.ink }}>
                          Generate a tailored cover letter
                        </div>
                        <div style={{ fontSize: "13px", color: COLORS.inkSoft, marginBottom: "22px", maxWidth: "440px", marginLeft: "auto", marginRight: "auto", lineHeight: 1.6 }}>
                          Written from your actual resume and this job description — no filler, no fabricated experience.
                        </div>
                        <button onClick={generateCoverLetter} className="btn-primary" style={{
                          fontFamily: "'IBM Plex Mono', monospace",
                          fontSize: "12.5px",
                          fontWeight: 600,
                          letterSpacing: "0.04em",
                          padding: "13px 24px",
                          borderRadius: "10px",
                          border: "none",
                          background: `linear-gradient(135deg, ${COLORS.goldBright}, ${COLORS.gold})`,
                          color: "#1A1306",
                          cursor: "pointer",
                        }}>
                          {coverLetterError ? "RETRY GENERATION" : "GENERATE COVER LETTER"}
                        </button>
                        {coverLetterError && (
                          <div style={{ fontSize: "12px", color: COLORS.flag, marginTop: "14px" }}>
                            {coverLetterError}
                          </div>
                        )}
                      </div>
                    )}

                    {coverLetterLoading && (
                      <div style={{ ...cardStyle, minHeight: "200px", display: "flex", alignItems: "center", justifyContent: "center", color: COLORS.inkSoft, fontSize: "13.5px" }} className="glass-card">
                        <span className="pulse-dot" style={{ marginRight: "10px" }} />
                        Writing your cover letter...
                      </div>
                    )}

                    {coverLetter && (
                      <div style={cardStyle} className="glass-card">
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px", marginBottom: "16px" }}>
                          <div style={labelStyle}>COVER LETTER</div>
                          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                            <button onClick={copyCoverLetter} className="tab-btn" style={{
                              fontFamily: "'IBM Plex Mono', monospace", fontSize: "11px", padding: "7px 12px",
                              borderRadius: "7px", border: "1px solid rgba(255,255,255,0.12)",
                              backgroundColor: "transparent", color: COLORS.inkSoft, cursor: "pointer",
                            }}>
                              {coverCopied ? "COPIED ✓" : "COPY"}
                            </button>
                            <button onClick={downloadCoverLetterTxt} className="tab-btn" style={{
                              fontFamily: "'IBM Plex Mono', monospace", fontSize: "11px", padding: "7px 12px",
                              borderRadius: "7px", border: "1px solid rgba(255,255,255,0.12)",
                              backgroundColor: "transparent", color: COLORS.inkSoft, cursor: "pointer",
                            }}>
                              DOWNLOAD .TXT
                            </button>
                            <button onClick={downloadCoverLetterPDF} className="btn-primary" style={{
                              fontFamily: "'IBM Plex Mono', monospace", fontSize: "11px", fontWeight: 600,
                              padding: "7px 12px", borderRadius: "7px", border: "none",
                              background: `linear-gradient(135deg, ${COLORS.goldBright}, ${COLORS.gold})`,
                              color: "#1A1306", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px",
                            }}>
                              <FileText size={12} /> DOWNLOAD PDF
                            </button>
                          </div>
                        </div>
                        <div style={{ whiteSpace: "pre-wrap", fontSize: "13px", lineHeight: 1.8, maxHeight: "460px", overflowY: "auto", color: COLORS.ink, paddingRight: "8px" }}>
                          {coverLetter}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
