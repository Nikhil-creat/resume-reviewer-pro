// Deterministic, rule-based resume analysis.
// Used (1) as the grounding signal that is blended with the LLM scores, and
// (2) as the complete fallback when no API key is configured.
import { clamp } from './guard.js';

const STOP = new Set(
  ('a an the and or of to in for on with at by from as is are was were be been this that these those it its you your we our they their will can may should would could into over under about across using use used via per not but if then than also etc such more most other any all each both who whom which while within without including include includes experience work team ability skills strong role candidate company looking years knowledge required preferred responsibilities requirements working job position good must have has having able plus related well new').split(' '),
);

const SKILLS = [
  'python', 'java', 'javascript', 'typescript', 'c++', 'c#', 'go', 'rust', 'kotlin', 'swift', 'php', 'ruby', 'scala', 'r', 'matlab',
  'sql', 'mysql', 'postgresql', 'mongodb', 'redis', 'nosql', 'oracle', 'sqlite', 'elasticsearch', 'kafka', 'spark', 'hadoop', 'airflow',
  'pandas', 'numpy', 'scikit-learn', 'tensorflow', 'pytorch', 'keras', 'opencv', 'matplotlib', 'seaborn', 'plotly',
  'machine learning', 'deep learning', 'nlp', 'natural language processing', 'computer vision', 'cnn', 'rnn', 'transformers', 'llm', 'rag', 'generative ai', 'langchain',
  'data analysis', 'data analytics', 'data science', 'data visualization', 'data cleaning', 'etl', 'data engineering', 'statistics', 'a/b testing', 'feature engineering', 'mlops',
  'power bi', 'tableau', 'excel', 'looker', 'dashboards', 'kpi', 'reporting',
  'react', 'next.js', 'node.js', 'express', 'angular', 'vue', 'django', 'flask', 'fastapi', 'spring boot', 'html', 'css', 'tailwind', 'redux', 'graphql', 'rest api', 'rest apis', 'microservices', 'jwt', 'socket.io',
  'docker', 'kubernetes', 'aws', 'azure', 'gcp', 'terraform', 'ci/cd', 'jenkins', 'github actions', 'git', 'github', 'linux', 'devops', 'vercel',
  'agile', 'scrum', 'jira', 'unit testing', 'jest', 'pytest', 'system design', 'data structures', 'algorithms', 'oop',
  'cybersecurity', 'security', 'networking', 'iot', 'embedded', 'figma', 'ui/ux', 'communication', 'leadership', 'problem solving',
];

const STRONG_VERBS = new Set(
  'built designed developed implemented automated optimized optimised reduced increased improved led deployed analyzed analysed trained integrated migrated launched created engineered architected delivered managed streamlined achieved boosted accelerated enhanced established collaborated orchestrated secured tested evaluated researched refactored scaled shipped produced generated visualized cleaned modeled modelled'.split(' '),
);
const WEAK_OPENERS = /^(responsible for|worked on|helped (with|to)|was involved in|assisted (with|in)|duties included|tasked with)/i;

const SECTION_PATTERNS = {
  summary: /^(professional\s+)?(summary|profile|objective|about( me)?)\b/i,
  experience: /^(work\s+|professional\s+)?(experience|employment|internships?)\b/i,
  education: /^education\b|^academic/i,
  skills: /^(technical\s+|key\s+|core\s+)?skills\b|^technologies\b/i,
  projects: /^(academic\s+|personal\s+|key\s+)?projects\b/i,
  certifications: /^(certifications?|certificates|courses|achievements|awards)\b/i,
};

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
export const termRegex = (term) => new RegExp(`(?<![a-z0-9+#])${esc(term.toLowerCase())}(?![a-z0-9+#])`, 'i');
export const hasTerm = (text, term) => termRegex(term).test(text);

export function tokenizeWords(text) {
  return text.toLowerCase().match(/[a-z][a-z0-9+#.]*[a-z0-9+#]|[a-z]/g) || [];
}

export function extractKeywords(jd) {
  const lower = String(jd || '').toLowerCase();
  if (!lower.trim()) return [];
  const out = new Map();
  for (const s of SKILLS) {
    const m = lower.match(new RegExp(termRegex(s).source, 'gi'));
    if (m) out.set(s, m.length);
  }
  const freq = new Map();
  for (const w of tokenizeWords(lower)) {
    if (w.length < 4 || STOP.has(w)) continue;
    freq.set(w, (freq.get(w) || 0) + 1);
  }
  for (const [w, c] of [...freq].sort((a, b) => b[1] - a[1])) {
    if (c < 2 || out.size >= 30) break;
    if (![...out.keys()].some((k) => k.includes(w) || w.includes(k))) out.set(w, c);
  }
  return [...out].map(([term, count]) => ({
    term,
    count,
    importance: count >= 3 ? 'high' : SKILLS.includes(term) || count === 2 ? 'medium' : 'low',
  }));
}

export function detectSections(text) {
  const found = new Set();
  for (const raw of text.split('\n')) {
    const line = raw.trim().replace(/[:\-–—_*#|]+$/g, '').trim();
    if (!line || line.length > 40) continue;
    for (const [k, re] of Object.entries(SECTION_PATTERNS)) if (re.test(line)) found.add(k);
  }
  return found;
}

function bulletLines(text) {
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => /^[-•*–▪●◦>]\s+/.test(l) || (l.split(/\s+/).length >= 8 && /^[A-Z][a-z]+ed\b|^[A-Z][a-z]+\b/.test(l) && !/[:]$/.test(l)))
    .map((l) => l.replace(/^[-•*–▪●◦>]\s+/, ''));
}

export function analyzeOffline(resumeText, jd = '') {
  const text = String(resumeText || '');
  const words = tokenizeWords(text);
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const sections = detectSections(text);
  const bullets = bulletLines(text);
  const quantified = bullets.filter((b) => /\d/.test(b) || /%/.test(b)).length;
  const strongStart = bullets.filter((b) => STRONG_VERBS.has((b.split(/\s+/)[0] || '').toLowerCase().replace(/[^a-z]/g, ''))).length;
  const weakStart = bullets.filter((b) => WEAK_OPENERS.test(b)).length;
  const avgBulletWords = bullets.length ? bullets.reduce((s, b) => s + b.split(/\s+/).length, 0) / bullets.length : 0;
  const longBullets = bullets.filter((b) => b.split(/\s+/).length > 32).length;

  // keywords
  const kws = extractKeywords(jd);
  const matched = kws.filter((k) => hasTerm(text, k.term));
  const missing = kws.filter((k) => !hasTerm(text, k.term));
  const weighted = (arr) => arr.reduce((s, k) => s + (k.importance === 'high' ? 3 : k.importance === 'medium' ? 2 : 1), 0);
  const kwScore = kws.length ? (weighted(matched) / Math.max(1, weighted(kws))) * 100 : 60;

  // structure
  const need = ['experience', 'education', 'skills'];
  const nice = ['summary', 'projects', 'certifications'];
  let structure = 35;
  for (const s of need) if (sections.has(s) || (s === 'experience' && sections.has('projects'))) structure += 17;
  for (const s of nice) if (sections.has(s)) structure += 5;
  if (wordCount >= 250 && wordCount <= 800) structure += 4;
  else structure -= 8;
  const hasEmail = /@/.test(text) || /\[\[EMAIL_\d+\]\]/.test(text);
  const hasPhone = /\d{10}/.test(text.replace(/\D+/g, '')) || /\[\[PHONE_\d+\]\]/.test(text);
  if (hasEmail) structure += 3;
  if (hasPhone) structure += 2;

  // impact
  const quantRatio = bullets.length ? quantified / bullets.length : 0;
  const verbRatio = bullets.length ? strongStart / bullets.length : 0;
  let impact = 25 + quantRatio * 55 + verbRatio * 25 - weakStart * 4;
  if (!bullets.length) impact = 35;

  // formatting (text-level heuristics)
  const pipes = (text.match(/\|/g) || []).length;
  const odd = (text.match(/[^\x00-\x7F–—•’“”… ₹]/g) || []).length;
  const shortLines = text.split('\n').filter((l) => l.trim() && l.trim().split(/\s+/).length <= 2).length;
  let formatting = 92 - Math.min(25, pipes * 2) - Math.min(20, odd * 0.5) - (shortLines > 40 ? 12 : 0);
  if (wordCount < 150) formatting -= 15;

  // readability
  let readability = 88;
  if (avgBulletWords > 28 || avgBulletWords < 7) readability -= 14;
  readability -= longBullets * 4;
  if (/\b(I|my|me)\b/.test(text)) readability -= 6;

  const scores = {
    keywords: clamp(kwScore),
    impact: clamp(impact),
    structure: clamp(structure),
    formatting: clamp(formatting),
    readability: clamp(readability),
  };

  // issues
  const issues = [];
  if (kws.length && missing.length) {
    const top = missing.filter((m) => m.importance !== 'low').slice(0, 6).map((m) => m.term).join(', ');
    issues.push({ severity: kwScore < 50 ? 'high' : 'medium', title: `Missing job-description keywords${top ? `: ${top}` : ''}`, fix: 'Add the ones you genuinely have to Skills and to project/experience bullets, using the JD wording.' });
  }
  if (bullets.length && quantRatio < 0.4) issues.push({ severity: 'high', title: `Only ${quantified} of ${bullets.length} bullets contain numbers`, fix: 'Add measurable results (%, counts, time saved, users, accuracy) to your top bullets.' });
  if (weakStart) issues.push({ severity: 'medium', title: `${weakStart} bullet(s) start with weak phrases ("Responsible for", "Worked on")`, fix: 'Start with strong action verbs: Built, Automated, Reduced, Deployed…' });
  for (const s of need) if (!sections.has(s) && !(s === 'experience' && sections.has('projects'))) issues.push({ severity: 'high', title: `No clear "${s}" section found`, fix: `Add a standard heading named "${s[0].toUpperCase() + s.slice(1)}" so ATS parsers can find it.` });
  if (!sections.has('summary')) issues.push({ severity: 'low', title: 'No professional summary', fix: 'Add a 2-3 line summary tailored to the target role.' });
  if (wordCount > 900) issues.push({ severity: 'medium', title: `Long resume (${wordCount} words)`, fix: 'Trim to one page (350-700 words) for early-career profiles.' });
  if (wordCount < 200) issues.push({ severity: 'high', title: `Very little text extracted (${wordCount} words)`, fix: 'If this is a scanned/graphic PDF, export a text-based PDF or paste the text.' });
  if (pipes > 8) issues.push({ severity: 'medium', title: 'Many "|" characters suggest tables/columns', fix: 'Use a single-column layout without tables.' });
  if (longBullets) issues.push({ severity: 'low', title: `${longBullets} bullet(s) are over 32 words`, fix: 'Split long bullets into 1-2 line statements.' });
  if (!hasEmail) issues.push({ severity: 'medium', title: 'No email detected', fix: 'Add a professional email in the body of the resume.' });

  const strengths = [];
  if (sections.size >= 4) strengths.push(`Clear section structure (${[...sections].join(', ')})`);
  if (quantRatio >= 0.5) strengths.push('Good use of quantified results');
  if (verbRatio >= 0.6) strengths.push('Bullets open with strong action verbs');
  if (kws.length && kwScore >= 70) strengths.push('Strong keyword coverage for this job description');
  if (!strengths.length) strengths.push('Contact details and basic content are present');

  return {
    scores,
    issues: issues.slice(0, 10),
    strengths: strengths.slice(0, 5),
    matched: matched.map((k) => k.term),
    missing: missing.map((k) => ({ term: k.term, importance: k.importance })),
    stats: { wordCount, bullets: bullets.length, quantified, sections: [...sections] },
  };
}

export const WEIGHTS = { keywords: 0.35, impact: 0.2, structure: 0.15, formatting: 0.1, readability: 0.2 };

export function overallScore(scores, hasJD = true) {
  const w = hasJD ? WEIGHTS : { keywords: 0, impact: 0.3, structure: 0.25, formatting: 0.2, readability: 0.25 };
  const total = Object.entries(w).reduce((s, [k, v]) => s + (scores[k] ?? 0) * v, 0);
  return clamp(total);
}

export const gradeFor = (n) => (n >= 90 ? 'A+' : n >= 80 ? 'A' : n >= 70 ? 'B' : n >= 60 ? 'C' : n >= 45 ? 'D' : 'E');

export function guessName(text) {
  const first = text.split('\n').map((l) => l.trim()).find((l) => l && !/\[\[/.test(l));
  return first && first.split(/\s+/).length <= 5 && !/[0-9@]/.test(first) ? first : '';
}

export function coverLetterTemplate(resumeText, jd, name) {
  const kws = extractKeywords(jd).filter((k) => hasTerm(resumeText, k.term)).slice(0, 4).map((k) => k.term);
  return `Dear Hiring Manager,

I am excited to apply for this opportunity. My background in ${kws.length ? kws.join(', ') : '[your strongest relevant skills]'} aligns closely with the role, and I enjoy turning that into practical, measurable results.

In my recent work I [describe your most relevant project and its measurable outcome]. I am comfortable learning quickly, collaborating with a team and taking ownership of delivery.

I would welcome the chance to discuss how I can contribute. Thank you for your time and consideration.

Sincerely,
${name || '[Your name]'}

(Offline template — add a Groq or Gemini API key for a fully tailored AI cover letter.)`;
}

/** Text-only layout guess used when the CNN service is not reachable. */
export function heuristicLayout(text) {
  const lines = text.split('\n').filter((l) => l.trim());
  const short = lines.filter((l) => l.trim().split(/\s+/).length <= 3).length / Math.max(1, lines.length);
  const pipes = (text.match(/\|/g) || []).length;
  const label = pipes > 12 || short > 0.55 ? 'two_column' : 'ats_friendly';
  return {
    label,
    confidence: 0.55,
    probs: { ats_friendly: label === 'ats_friendly' ? 0.55 : 0.2, two_column: label === 'two_column' ? 0.55 : 0.3, graphic_heavy: 0.15 },
    source: 'heuristic',
  };
}
