"use client";
import { useEffect, useRef, useState } from "react";
import { ROLES } from "@/lib/kb.js";
import { runAgent } from "@/lib/agent.js";
import { extractFromFile } from "@/lib/extract.js";
import { mergeLayout } from "@/lib/layout.js";
import { matchRoles } from "@/lib/rag.js";
import Results from "./components/Results.js";
import { SAMPLE_RESUME, SAMPLE_JD } from "./components/sample.js";

const ME = { name: "NIKHIL CHARY SRIRAMOJU", github: "https://github.com/Nikhil-creat", linkedin: "https://in.linkedin.com/in/nikhil-chary-sriramoju-95041b38a", mail: "mailto:sriramojunikhil66@gmail.com" };
const HIST_KEY = "rrp_history_v2", KEY_KEY = "rrp_user_key", PROV_KEY = "rrp_provider";

const FEATURES = [
  ["Explainable 100-point ATS score", "Nine weighted categories with the exact points each fix recovers. Same input, same score, every time."],
  ["Agentic rewrite loop", "Plan, rewrite, verify and retry until 95+ or until only real facts are missing."],
  ["No-fabrication guard", "Every number, skill and link in a rewrite must exist in your original or your confirmed details, or it is removed."],
  ["RAG role intelligence", "Retrieves role profiles and ATS guidelines to find the best-fit role and the keywords that matter."],
  ["CNN layout analysis", "Detects columns, tables, photos and skill bars from the rendered page, with a trained CNN when the service is running."],
  ["JD tailoring", "Paste a job description to target its exact skills and see which ones you still need to confirm."],
  ["ATS-safe PDF and DOCX", "Single-column, real-text exports with standard headings, generated in your browser."],
  ["Career kit", "Truthful cover letter, LinkedIn headline and about text, and interview questions from your own resume."]
];
const STEPS = [["Parse", "Sections, contact data, bullets, dates"], ["Retrieve", "RAG over roles, skills and ATS guidelines"], ["Score", "Deterministic 100-point rubric"], ["Plan", "Rank fixes by points recovered"], ["Rewrite", "Groq / Gemini proposes, rules clean up"], ["Guard + Verify", "Strip unsupported facts, re-score, iterate"]];
const FAQ = [
  ["Is this a real ATS score?", "No tool can reproduce every vendor's ATS. This is an open, deterministic rubric built on common ATS parsing rules, so you can see exactly why you lose points."],
  ["Why can't it just reach 95+ for any resume?", "Because that would require inventing metrics or skills. The agent only rewrites what is true, then tells you exactly which real details to add."],
  ["Is my resume stored?", "No. Parsing, scoring and exports run in your browser. Only the text sent to the AI provider for rewriting leaves your device, and it is not stored by this app."],
  ["Which AI does it use?", "Groq (Llama 3.3 70B) or Google Gemini, using a server key or your own key. Without a key, the rules engine still works."],
  ["Which files work?", "PDF, DOCX, PNG, JPG (OCR) and TXT."]
];

export default function Home() {
  const [text, setText] = useState("");
  const [jd, setJd] = useState("");
  const [roleId, setRoleId] = useState("");
  const [fileInfo, setFileInfo] = useState(null);
  const [layout, setLayout] = useState(null);
  const [pages, setPages] = useState(null);
  const [provider, setProvider] = useState("auto");
  const [userKey, setUserKey] = useState("");
  const [health, setHealth] = useState(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [steps, setSteps] = useState([]);
  const [result, setResult] = useState(null);
  const [confirmed, setConfirmed] = useState([]);
  const [answers, setAnswers] = useState({});
  const [history, setHistory] = useState([]);
  const [error, setError] = useState("");
  const [runId, setRunId] = useState(0);
  const [wantExtras, setWantExtras] = useState(false);
  const resultRef = useRef(null);

  useEffect(() => {
    try { setHistory(JSON.parse(localStorage.getItem(HIST_KEY) || "[]")); setUserKey(localStorage.getItem(KEY_KEY) || ""); setProvider(localStorage.getItem(PROV_KEY) || "auto"); } catch { /* ignore */ }
    fetch("/api/health").then((r) => r.json()).then(setHealth).catch(() => setHealth(null));
  }, []);

  const serverAI = health && (health.providers.groq || health.providers.gemini);
  const aiAvailable = provider !== "off" && (userKey || serverAI);
  const llm = aiAvailable ? async ({ system, user, json }) => {
    const r = await fetch("/api/llm", { method: "POST", headers: { "Content-Type": "application/json", ...(userKey ? { "x-user-key": userKey } : {}) }, body: JSON.stringify({ provider: provider === "off" ? "auto" : provider, system, user, json }) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.error || `HTTP ${r.status}`);
    return d.text;
  } : null;

  async function onFile(file) {
    if (!file) return;
    setError(""); setStatus("Extracting text..."); setBusy(true);
    try {
      const out = await extractFromFile(file, setStatus);
      setText(out.text); setPages(out.pages); setFileInfo({ name: file.name, size: file.size });
      let lay = out.layout;
      if (lay && out.image && health && health.cnn) {
        try {
          const r = await fetch("/api/layout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ image: out.image, textBased: lay.textBased }) });
          if (r.ok) lay = mergeLayout(lay, await r.json());
        } catch { /* heuristic only */ }
      }
      setLayout(lay);
      setStatus(`Loaded ${file.name}`);
      if (!roleId && out.text.trim().length > 80) setRoleId(matchRoles(out.text, 1)[0].id);
    } catch (e) { setError(e.message || String(e)); setStatus(""); }
    setBusy(false);
  }

  function saveSettings(k, p) { try { localStorage.setItem(KEY_KEY, k); localStorage.setItem(PROV_KEY, p); } catch { /* ignore */ } }

  async function run(extraOpts = {}) {
    if (text.trim().length < 60) { setError("Paste or upload your resume text first (at least a few lines)."); return; }
    setError(""); setBusy(true); setSteps([]); setStatus("Agent running...");
    try {
      const out = await runAgent({ text, jd, roleId, confirmedSkills: confirmed, answers, layout, pages, llm, extras: wantExtras, onStep: (s) => setSteps((p) => [...p, s]), ...extraOpts });
      setResult(out); setRunId((n) => n + 1);
      const entry = { ts: Date.now(), role: out.role.title, before: out.before.score, after: out.after.score };
      const next = [...history, entry].slice(-20); setHistory(next);
      try { localStorage.setItem(HIST_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      setStatus(`Done: ${out.before.score} → ${out.after.score}`);
      setTimeout(() => resultRef.current && resultRef.current.scrollIntoView({ behavior: "smooth", block: "start" }), 120);
    } catch (e) { setError(e.message || String(e)); setStatus(""); }
    setBusy(false);
  }

  return (
    <>
      <header className="top">
        <div className="wrap nav">
          <a href="#top" className="brand"><span className="logo">RR</span><span>Resume Reviewer <b>Pro</b></span></a>
          <nav><a href="#analyze">Analyze</a><a href="#pipeline">Pipeline</a><a href="#features">Features</a><a href="#faq">FAQ</a></nav>
          <span className={`pill ${aiAvailable ? "on" : ""}`}>{aiAvailable ? "AI agent on" : "Rules engine"}</span>
        </div>
      </header>

      <main id="top">
        <section className="hero wrap">
          <p className="eyebrow">AGENTIC AI · RAG · CNN · DOCKER</p>
          <h1>Make your resume <span className="grad">95+ ATS-ready</span> without lying on it.</h1>
          <p className="lead">Upload your resume. An agent scores it on an explainable 100-point rubric, rewrites it truthfully, checks every claim against your original, and gives you an ATS-safe PDF and DOCX.</p>
          <div className="stats"><span>100-point open rubric</span><span>No-fabrication guard</span><span>CNN layout check</span><span>Groq + Gemini</span><span>Private by design</span></div>
        </section>

        <section id="analyze" className="wrap">
          <div className="grid2">
            <div className="card">
              <h2>1. Your resume</h2>
              <label className="drop">
                <input type="file" accept=".pdf,.docx,.txt,.png,.jpg,.jpeg,.webp" onChange={(e) => onFile(e.target.files && e.target.files[0])} aria-label="Upload resume" />
                <span><b>Upload</b> PDF, DOCX, PNG, JPG or TXT</span>
                {fileInfo && <small>{fileInfo.name} · {(fileInfo.size / 1024).toFixed(0)} KB</small>}
              </label>
              <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="...or paste your resume text here" rows={11} aria-label="Resume text" />
              <div className="row"><button type="button" className="btn ghost" onClick={() => { setText(SAMPLE_RESUME); setJd(SAMPLE_JD); setLayout(null); setFileInfo(null); setRoleId("backend-engineer"); }}>Load sample</button>
                <button type="button" className="btn ghost" onClick={() => { setText(""); setJd(""); setLayout(null); setFileInfo(null); setResult(null); setSteps([]); setConfirmed([]); setAnswers({}); }}>Clear</button></div>
              {layout && (
                <div className="layout-card" aria-label="Layout analysis">
                  <b>Layout analysis</b> <small>({layout.source || "heuristic"}{layout.cnnLabel ? `, CNN: ${layout.cnnLabel} ${(layout.cnnConfidence * 100).toFixed(0)}%` : ""})</small>
                  <div className="chips"><span className={`chip ${layout.columns <= 1 ? "ok" : "bad"}`}>{layout.columns <= 1 ? "single column" : `${layout.columns} columns`}</span>
                    <span className={`chip ${layout.hasTables ? "bad" : "ok"}`}>{layout.hasTables ? "tables found" : "no tables"}</span>
                    <span className={`chip ${layout.hasGraphics ? "warn" : "ok"}`}>{layout.hasGraphics ? "graphics found" : "no graphics"}</span>
                    <span className={`chip ${layout.textBased === false ? "bad" : "ok"}`}>{layout.textBased === false ? "scanned / image" : "text layer"}</span></div>
                </div>
              )}
            </div>

            <div className="card">
              <h2>2. Target (optional)</h2>
              <label className="lab">Target role</label>
              <select value={roleId} onChange={(e) => setRoleId(e.target.value)} aria-label="Target role">
                <option value="">Auto-detect from my resume</option>
                {ROLES.map((r) => <option key={r.id} value={r.id}>{r.title}</option>)}
              </select>
              <label className="lab">Job description (recommended)</label>
              <textarea value={jd} onChange={(e) => setJd(e.target.value)} placeholder="Paste the job description to target its exact keywords" rows={7} aria-label="Job description" />
              <details className="settings">
                <summary>AI settings</summary>
                <label className="lab">Provider</label>
                <select value={provider} onChange={(e) => { setProvider(e.target.value); saveSettings(userKey, e.target.value); }} aria-label="AI provider">
                  <option value="auto">Auto (server key or my key)</option><option value="groq">Groq (Llama 3.3 70B)</option><option value="gemini">Google Gemini</option><option value="off">Off (rules engine only)</option>
                </select>
                <label className="lab">Your own API key (optional)</label>
                <input type="password" value={userKey} placeholder="gsk_... or AIza..." autoComplete="off" onChange={(e) => { setUserKey(e.target.value); saveSettings(e.target.value, provider); }} aria-label="API key" />
                <p className="muted small">A key you paste is kept in this browser only and sent with your requests to this app's server, which forwards it to the provider and does not store it. Server status: Groq {health?.providers.groq ? "✓" : "–"}, Gemini {health?.providers.gemini ? "✓" : "–"}, CNN {health?.cnn ? "✓" : "–"}.</p>
              </details>
              <button type="button" className="btn primary big" disabled={busy} onClick={() => run()}>{busy ? "Working..." : "Run ATS Agent"}</button>
              <label className="check"><input type="checkbox" checked={wantExtras} onChange={(e) => setWantExtras(e.target.checked)} /> also generate cover letter, LinkedIn and interview questions</label>
              {status && <p className="muted small" role="status">{status}</p>}
              {error && <p className="err" role="alert">{error}</p>}
            </div>
          </div>

          {steps.length > 0 && (
            <div className="card trace"><h3>Agent trace</h3>
              <ol>{steps.map((s, i) => <li key={i} className={s.id.includes("error") ? "bad" : s.id === "guard" ? "warn" : ""}><b>{s.title}</b>{s.detail ? <span className="muted small"> {s.detail}</span> : null}</li>)}</ol>
            </div>
          )}

          <div ref={resultRef}>
            {result && <Results key={runId} result={result} input={{ text, jd }} confirmed={confirmed} setConfirmed={setConfirmed} answers={answers} setAnswers={setAnswers} onRerun={() => run()} busy={busy} llm={llm} history={history} />}
          </div>
        </section>

        <section id="pipeline" className="wrap">
          <h2 className="sec">How the agent works</h2>
          <div className="pipe">{STEPS.map(([t, d], i) => <div key={t} className="step"><i>{String(i + 1).padStart(2, "0")}</i><b>{t}</b><span>{d}</span></div>)}</div>
          <p className="muted">The rules engine is the judge. The language model is only a proposer: whatever it returns is re-scored and stripped of anything not supported by your original resume.</p>
        </section>

        <section id="features" className="wrap">
          <h2 className="sec">Features</h2>
          <div className="feat">{FEATURES.map(([t, d]) => <div key={t} className="card"><h3>{t}</h3><p className="muted small">{d}</p></div>)}</div>
        </section>

        <section id="faq" className="wrap">
          <h2 className="sec">FAQ</h2>
          {FAQ.map(([q, a]) => <details key={q} className="card faq"><summary>{q}</summary><p className="muted">{a}</p></details>)}
        </section>
      </main>

      <footer className="foot">
        <div className="wrap">
          <p><b>DESIGNED AND DEVELOPED BY {ME.name}</b></p>
          <p className="links"><a href={ME.github} target="_blank" rel="noopener noreferrer">GitHub</a><a href={ME.linkedin} target="_blank" rel="noopener noreferrer">LinkedIn</a><a href={ME.mail}>Email</a></p>
          <p className="muted small">Resume Reviewer Pro v2.0.0 · Next.js · RAG · CNN layout service · Groq / Gemini. The ATS score comes from an open rubric and is not affiliated with any ATS vendor.</p>
        </div>
      </footer>
    </>
  );
}
