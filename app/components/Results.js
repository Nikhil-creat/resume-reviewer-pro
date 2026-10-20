"use client";
import { useState } from "react";
import { Bar, Chip, ScoreRing, Sparkline } from "./ui.js";
import { buildPdf, buildDocx, toTxt, toJson, download } from "@/lib/export.js";
import { loadScript } from "@/lib/extract.js";
import { toStructured } from "@/lib/resume.js";
import { scoreText } from "@/lib/ats.js";
import { IDEAL_LAYOUT, generateExtras } from "@/lib/agent.js";

const safeName = (n) => (n || "resume").replace(/[^A-Za-z0-9]+/g, "_").replace(/^_|_$/g, "") || "resume";

export default function Results({ result, input, confirmed, setConfirmed, answers, setAnswers, onRerun, busy, llm, history }) {
  const [tab, setTab] = useState("resume");
  const [text, setText] = useState(result.text);
  const [live, setLive] = useState(null);
  const [extras, setExtras] = useState(result.extras || null);
  const [extrasBusy, setExtrasBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const before = result.before, after = live || result.after;
  const reached = after.score >= result.target;

  const rescore = () => setLive(scoreText(text, { keywords: result.keywords, layout: IDEAL_LAYOUT }));
  const resume = () => toStructured(text);
  const fname = () => safeName(resume().name) + "_ATS_Resume";

  async function dl(kind) {
    setMsg("");
    try {
      if (kind === "pdf") { await loadScript("jspdf"); download(buildPdf(resume(), window.jspdf.jsPDF).output("blob"), fname() + ".pdf"); }
      else if (kind === "docx") { await loadScript("jszip"); download(await buildDocx(resume(), window.JSZip), fname() + ".docx"); }
      else if (kind === "txt") download(toTxt(resume()), fname() + ".txt");
      else download(toJson(resume()), fname() + ".json");
    } catch (e) { setMsg("Download failed: " + (e.message || e)); }
  }

  async function makeExtras() {
    if (!llm) { setMsg("Enable an AI provider in AI settings to generate the career kit."); return; }
    setExtrasBusy(true); setMsg("");
    try { setExtras(await generateExtras({ resume: resume(), role: result.role, jd: input.jd, text: input.text, allowedText: confirmed.join(" ") + " " + Object.values(answers).join(" "), llm })); }
    catch (e) { setMsg("Career kit failed: " + (e.message || e)); }
    setExtrasBusy(false);
  }

  const toggle = (t) => setConfirmed(confirmed.includes(t) ? confirmed.filter((x) => x !== t) : [...confirmed, t]);
  const copy = (t) => { try { navigator.clipboard.writeText(t); setMsg("Copied to clipboard"); } catch { setMsg("Copy failed"); } };
  const needs = result.needsInput;

  return (
    <div className="results">
      <div className="card hero-score">
        <div className="rings">
          <ScoreRing value={before.score} size={118} label="before" sub={before.grade} color="#94a3b8" />
          <div className="arrow" aria-hidden="true">→</div>
          <ScoreRing value={after.score} size={150} label="after" sub={reached ? "Target reached" : `Target ${result.target}`} />
        </div>
        <div className="score-meta">
          <h3>{after.score >= 95 ? "ATS-excellent resume" : after.score >= 85 ? "Strong, a few gaps left" : "Real improvements available"}</h3>
          <p className="muted small">Scored by an open 100-point rubric (not a real vendor ATS). The after score assumes you submit the PDF or DOCX generated here, which is single-column and text-based. Role: <b>{result.role.title}</b>. {result.usedLLM ? "Rewritten by the AI agent and verified by the rules engine." : "Rule-based cleanup only (no AI provider used)."}</p>
          <div className="bars">{after.categories.map((c, i) => <Bar key={c.id} label={c.label} score={c.score} max={c.max} before={before.categories[i].score} />)}</div>
        </div>
      </div>

      {!reached && <div className="card note"><b>Why not 95+ yet?</b> The agent is not allowed to invent facts. Open <b>Needs your input</b> to add real numbers and confirm the skills you genuinely have, then run again.</div>}

      <div className="tabs" role="tablist">
        {[["resume", "Rewritten resume"], ["fixes", `Fix list (${after.issues.length})`], ["keywords", "Keywords"], ["input", "Needs your input"], ["kit", "Career kit"], ["history", "History"]].map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} className={tab === id ? "tab on" : "tab"} onClick={() => setTab(id)}>{label}</button>
        ))}
      </div>

      {tab === "resume" && (
        <div className="card">
          <div className="row">
            <button type="button" className="btn primary" onClick={() => dl("pdf")}>Download PDF</button>
            <button type="button" className="btn" onClick={() => dl("docx")}>Download DOCX</button>
            <button type="button" className="btn ghost" onClick={() => dl("txt")}>TXT</button>
            <button type="button" className="btn ghost" onClick={() => dl("json")}>JSON</button>
          </div>
          <p className="muted small">Edit anything below, press Re-score, then download. Keep section headings on their own lines and bullets starting with a dash.</p>
          <textarea className="editor" value={text} onChange={(e) => setText(e.target.value)} spellCheck="false" aria-label="Rewritten resume text" />
          <div className="row"><button type="button" className="btn" onClick={rescore}>Re-score my edits</button>{live && <span className="muted small">Edited score: <b>{live.score}</b></span>}</div>
          {result.notes.length > 0 && <details className="small"><summary>What changed ({result.notes.length})</summary><ul>{result.notes.map((n, i) => <li key={i}>{n}</li>)}</ul></details>}
          <details className="small"><summary>Agent iterations</summary><ul>{result.history.map((h, i) => <li key={i}>{h.label}: <b>{h.score}</b>{h.fabrications ? ` (guard removed ${h.fabrications} unsupported facts)` : ""}</li>)}</ul></details>
        </div>
      )}

      {tab === "fixes" && (
        <div className="card">
          {after.issues.length === 0 ? <p>No outstanding issues. Nice.</p> : after.issues.map((i, k) => (
            <div key={k} className={`issue ${i.severity}`}><div className="gain">+{i.gain}</div><div><b>{i.msg}</b>{i.fix ? <div className="muted small">{i.fix}</div> : null}</div></div>
          ))}
        </div>
      )}

      {tab === "keywords" && (
        <div className="card">
          <p className="muted small">Coverage: <b>{after.categories[2].coverage}%</b> of target keywords. Tick only the skills you genuinely have, then run again. The agent will never add a skill you have not confirmed.</p>
          <h4>Matched</h4><div className="chips">{after.categories[2].matched.map((m) => <span key={m} className="chip ok">{m}</span>)}</div>
          <h4>Missing</h4><div className="chips">{after.categories[2].missing.map((m) => <Chip key={m.term} tone="warn" active={confirmed.includes(m.term)} onClick={() => toggle(m.term)}>{confirmed.includes(m.term) ? "✓ " : "+ "}{m.term}</Chip>)}</div>
          <div className="row"><button type="button" className="btn primary" disabled={busy} onClick={onRerun}>Run again with confirmed skills</button></div>
        </div>
      )}

      {tab === "input" && (
        <div className="card">
          <p className="muted small">Add true details. They are merged into the matching bullet and treated as allowed facts by the guard.</p>
          {needs.metrics.length === 0 ? <p>Every bullet already has a metric.</p> : needs.metrics.map((m, i) => (
            <div key={i} className="ask"><div className="small"><b>{m.bullet}</b></div>
              <input value={answers[m.bullet] || ""} placeholder="e.g. serving 500 daily users, cut response time by 35%" onChange={(e) => setAnswers({ ...answers, [m.bullet]: e.target.value })} aria-label="Detail for this bullet" /></div>
          ))}
          {needs.contact.length > 0 && <div className="small"><b>Contact gaps:</b><ul>{needs.contact.map((c, i) => <li key={i}>{c}</li>)}</ul></div>}
          <div className="row"><button type="button" className="btn primary" disabled={busy} onClick={onRerun}>Apply and run again</button></div>
        </div>
      )}

      {tab === "kit" && (
        <div className="card">
          <div className="row"><button type="button" className="btn primary" disabled={extrasBusy} onClick={makeExtras}>{extrasBusy ? "Generating..." : "Generate cover letter, LinkedIn text and interview questions"}</button></div>
          {extras && (
            <div>
              {extras._unsupported && extras._unsupported.length > 0 && <p className="small warn-text">Check these unverified items before using: {extras._unsupported.join(", ")}</p>}
              <h4>Cover letter <button type="button" className="link" onClick={() => copy(extras.coverLetter || "")}>copy</button></h4><pre className="doc">{extras.coverLetter}</pre>
              <h4>LinkedIn headline <button type="button" className="link" onClick={() => copy(extras.linkedin?.headline || "")}>copy</button></h4><pre className="doc">{extras.linkedin?.headline}</pre>
              <h4>LinkedIn about <button type="button" className="link" onClick={() => copy(extras.linkedin?.about || "")}>copy</button></h4><pre className="doc">{extras.linkedin?.about}</pre>
              <h4>Likely interview questions</h4><ol>{(extras.interview || []).map((q, i) => <li key={i}>{q}</li>)}</ol>
            </div>
          )}
        </div>
      )}

      {tab === "history" && (
        <div className="card"><h4>Score trend (after)</h4><Sparkline points={history.map((h) => h.after)} />
          <ul className="small">{history.slice().reverse().slice(0, 8).map((h, i) => <li key={i}>{new Date(h.ts).toLocaleString()}: {h.role} {h.before} → <b>{h.after}</b></li>)}</ul></div>
      )}
      {msg && <div className="toast" role="status">{msg}</div>}
    </div>
  );
}
