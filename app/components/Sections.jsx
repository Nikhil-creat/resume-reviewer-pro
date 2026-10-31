import {
  Gauge, ScanLine, Wand2, Mail, Bot, Database, Eye, MessageCircle, ShieldCheck, Lock, Container, Cpu, Layers, Zap, AlertTriangle,
  FileSearch, Brain, Network, GitBranch, Server,
} from 'lucide-react';

const FEATURES = [
  [Gauge, 'Recruiter-grade ATS score', 'Five weighted dimensions — keywords, impact, structure, formatting, readability — blended from AI judgement and deterministic checks.'],
  [ScanLine, 'Keyword-gap finder', 'Compares your resume with the job description. Every “missing” term is verified against your text in code, so the model cannot invent gaps.'],
  [Wand2, '95%+ truthful rewrite', 'A rewriter and an independent critic loop until the estimated score reaches 95+. It never fabricates; unknown metrics become [add metric] placeholders.'],
  [Mail, 'Tailored cover letter', 'Three short paragraphs in the tone you choose, grounded only in facts from your resume and the job description.'],
  [Network, 'Agentic pipeline', 'Eight single-purpose agents with live progress: extract, guard, retrieve, classify, analyse, rewrite, critique, write, prepare interviews.'],
  [Database, 'RAG knowledge base', 'A BM25 retriever feeds ATS rules and role-specific keyword packs into the prompts and into the chatbot, with sources shown.'],
  [Eye, 'CNN layout check', 'A small PyTorch CNN looks at the rendered first page and flags two-column or graphic-heavy layouts that confuse ATS parsers.'],
  [MessageCircle, 'Personal assistant', 'A floating chatbot (Groq first, Gemini fallback) that knows your latest scan and answers resume, interview and LinkedIn questions.'],
];

export function Features() {
  return (
    <section id="features" className="section alt">
      <div className="container">
        <div className="sec-head">
          <span className="eyebrow">Features</span>
          <h2>Everything a modern resume workflow needs</h2>
          <p className="muted">The original scan, rewrite and cover letter — rebuilt on an agentic, secure, retrieval-grounded core.</p>
        </div>
        <div className="grid4">
          {FEATURES.map(([Icon, t, d]) => (
            <article key={t} className="glass feat">
              <span className="feat-ic"><Icon size={20} /></span>
              <h3>{t}</h3>
              <p className="muted">{d}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

const STEPS = [
  [FileSearch, 'Extractor', 'PDF / DOCX / text parsed on the server; scanned PDFs and images go through Gemini vision OCR.'],
  [Lock, 'Guard', 'Sanitises input, masks emails & phone numbers, drops ID numbers, scans for prompt injection.'],
  [Database, 'Retriever (RAG)', 'BM25 pulls the most relevant ATS rules and role keyword packs for this resume + job.'],
  [Eye, 'Layout CNN', 'Classifies the page layout: ATS-friendly, two-column or graphic-heavy.'],
  [Brain, 'Analyst', 'Scores five dimensions and lists issues; code verifies keywords and blends in rule-based scores.'],
  [Wand2, 'Rewriter ⇄ Critic', 'Rewrites truthfully, then an independent critic scores it and checks for fabrication — up to two passes.'],
  [Mail, 'Cover letter', 'Writes a tailored letter from the verified facts, then restores your contact details locally.'],
  [MessageCircle, 'Interview prep', 'Generates the likely questions for this resume and job, with what is being tested and how to answer truthfully.'],
];

export function Pipeline() {
  return (
    <section id="pipeline" className="section">
      <div className="container">
        <div className="sec-head">
          <span className="eyebrow">How it works</span>
          <h2>A multi-agent pipeline, not a single prompt</h2>
          <p className="muted">Each agent has one job and a strict output format. Deterministic code sits between them and checks their work.</p>
        </div>
        <ol className="steps">
          {STEPS.map(([Icon, t, d], i) => (
            <li key={t} className="glass step">
              <span className="step-n">{String(i + 1).padStart(2, '0')}</span>
              <span className="feat-ic"><Icon size={18} /></span>
              <div>
                <h3>{t}</h3>
                <p className="muted">{d}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

const PROTECT = [
  'Emails and phone numbers are replaced with tokens before any model call and restored only in your output.',
  'Government ID numbers (Aadhaar / PAN-like) are removed and you are warned to delete them from the document.',
  'Prompt-injection scan on resumes, job descriptions and chat; documents are wrapped as untrusted data in every prompt.',
  'Per-IP rate limits, file size/type limits and magic-byte checks on uploads; hard caps on text length and agent loops.',
  'API keys stay on the server and travel in headers; strict CSP, frame-deny, no-store API responses and HSTS.',
  'Scores are not taken on trust: keywords are re-verified in code and blended with rule-based signals.',
  'Nothing is written to a database — files and text live in memory for the duration of one request.',
];

const LIMITS = [
  'The “estimated 95%+” is a model-assessed score, not a real ATS result. Treat it as guidance, not a guarantee.',
  'Free-tier APIs have rate limits; the app falls back between Groq and Gemini, and to an offline rule-based mode with no keys.',
  'The built-in rate limiter is in-memory, so it is per server instance. Use Redis/Upstash for strict global limits.',
  'The CNN is trained on synthetic page layouts as a demonstration. Retrain it on real labelled resumes for production accuracy.',
  'AI can still make mistakes. Review every rewritten line and fill in placeholder metrics with real numbers.',
  'Scanned or image-only resumes depend on OCR quality; English-language resumes work best.',
];

export function SecuritySection() {
  return (
    <section id="security" className="section alt">
      <div className="container">
        <div className="sec-head">
          <span className="eyebrow">Security &amp; limitations</span>
          <h2>Guardrails you can see — and limits we admit</h2>
        </div>
        <div className="two-col">
          <div className="glass pad">
            <h3 className="h-ic ok"><ShieldCheck size={18} /> Protections</h3>
            <ul className="ticks big">{PROTECT.map((p) => <li key={p}><ShieldCheck size={14} /> {p}</li>)}</ul>
          </div>
          <div className="glass pad">
            <h3 className="h-ic warn"><AlertTriangle size={18} /> Honest limitations</h3>
            <ul className="ticks big warnlist">{LIMITS.map((p) => <li key={p}><AlertTriangle size={14} /> {p}</li>)}</ul>
          </div>
        </div>
      </div>
    </section>
  );
}

const STACK = [
  [Layers, 'Next.js 14 + React 18', 'App Router, streaming API routes, standalone output'],
  [Zap, 'Groq (Llama 3.3 70B)', 'Fast free-tier inference for rewrite, cover letter and chat'],
  [Brain, 'Google Gemini', 'Long-context analysis, critic and vision OCR'],
  [Database, 'BM25 RAG', 'Dependency-free retriever over a curated career knowledge base'],
  [Cpu, 'PyTorch CNN + FastAPI', 'Layout classifier microservice with PDF page rendering'],
  [Container, 'Docker Compose', 'Web + CNN services, health checks, non-root images'],
  [GitBranch, 'GitHub Actions + Pages', 'CI runs tests and the build; a workflow publishes the UI to GitHub Pages'],
  [Server, 'Vercel / any Docker host', 'Backend on Vercel with the UI on Pages, or the full stack on a VM'],
];

export function StackSection() {
  return (
    <section id="stack" className="section">
      <div className="container">
        <div className="sec-head">
          <span className="eyebrow">Tech stack</span>
          <h2>Modern, free-tier-friendly and easy to self-host</h2>
        </div>
        <div className="grid4 compact">
          {STACK.map(([Icon, t, d]) => (
            <div key={t} className="glass feat">
              <span className="feat-ic"><Icon size={18} /></span>
              <h3>{t}</h3>
              <p className="muted">{d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const FAQ = [
  ['Is it really free?', 'Yes. It runs on the free tiers of Groq and Google Gemini (no credit card) and deploys on Vercel’s free plan. Free tiers have rate limits, so very heavy use may need a paid key.'],
  ['Do you store my resume?', 'No. Files and text are processed in memory for the request and are not saved to disk or a database. Your emails and phone numbers are masked before they reach any model.'],
  ['Is the 95%+ score a real ATS score?', 'No — it is an estimate from an independent AI critic checked against the job description. Real ATS software differs, and recruiters still read resumes. Use it to find and fix gaps.'],
  ['Does it make things up?', 'The rewriter is instructed to use only facts from your resume, uses [add metric] placeholders instead of invented numbers, and a critic flags fabrication. You should still review every line.'],
  ['Can I run it without API keys?', 'Yes. Offline mode still gives a rule-based score, keyword gaps, a cover-letter template and a RAG-powered assistant; add a Groq or Gemini key to unlock the AI rewrite and full chat.'],
  ['Why two AI providers?', 'Each agent has a preferred provider and automatically falls back to the other on errors or rate limits, which keeps the app working on free tiers.'],
];

export function Faq() {
  return (
    <section id="faq" className="section alt">
      <div className="container narrow">
        <div className="sec-head">
          <span className="eyebrow">FAQ</span>
          <h2>Questions, answered</h2>
        </div>
        <div className="faq">
          {FAQ.map(([q, a]) => (
            <details key={q} className="glass">
              <summary>{q}</summary>
              <p className="muted">{a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
