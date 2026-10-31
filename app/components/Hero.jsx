import { ArrowRight, ShieldCheck, Bot, Gauge } from 'lucide-react';

const TRACE = [
  ['Guard', 'PII masked · 0 injection flags', 'ok'],
  ['Retriever (RAG)', '5 rubric chunks (BM25)', 'ok'],
  ['Layout CNN', 'ats_friendly · 94%', 'ok'],
  ['Analyst', 'ATS 71 → gaps: docker, tableau', 'ok'],
  ['Rewriter', 'truthful rewrite · 412 words', 'ok'],
  ['Critic', 'score 96 · fabrication risk: none', 'ok'],
  ['Cover letter', '3 paragraphs · confident', 'ok'],
];

export default function Hero() {
  return (
    <section id="top" className="hero">
      <div className="container hero-grid">
        <div className="hero-copy rise">
          <span className="pill"><span className="dot" /> Multi-agent AI · Groq + Gemini · Free tier</span>
          <h1>
            Beat the ATS with an <span className="grad">agentic AI</span> resume reviewer.
          </h1>
          <p className="lead">
            Upload your resume and a job description. Eight specialised agents score it, find keyword gaps,
            rewrite it <em>truthfully</em> to 95%+, and draft a tailored cover letter — while a security layer
            keeps your personal data out of the model.
          </p>
          <div className="hero-cta">
            <a href="#analyzer" className="btn btn-primary btn-lg">Scan my resume <ArrowRight size={18} /></a>
            <a href="#pipeline" className="btn btn-ghost btn-lg">See how it works</a>
          </div>
          <ul className="hero-stats">
            <li><Gauge size={16} /> <b>5</b> scoring dimensions</li>
            <li><Bot size={16} /> <b>8</b> cooperating agents</li>
            <li><ShieldCheck size={16} /> <b>PII</b> never sent to the LLM</li>
          </ul>
        </div>

        <div className="trace glass rise" style={{ animationDelay: '.15s' }} aria-label="Example agent run">
          <div className="trace-bar">
            <i /><i /><i />
            <span>agent-run.log</span>
          </div>
          <ol className="trace-body">
            {TRACE.map(([name, detail], i) => (
              <li key={name} style={{ animationDelay: `${0.5 + i * 0.25}s` }}>
                <span className="tick">✓</span>
                <b>{name}</b>
                <span className="muted">{detail}</span>
              </li>
            ))}
          </ol>
          <div className="trace-foot">
            <span className="score-chip">ATS 71 → <b>96</b></span>
            <span className="muted">illustrative example</span>
          </div>
        </div>
      </div>
    </section>
  );
}
