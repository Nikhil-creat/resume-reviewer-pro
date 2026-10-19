"use client";
import { useState } from "react";

const CATS = { keyword_match: "Keyword match", impact_and_metrics: "Impact & metrics", ats_format: "ATS format", structure: "Structure", role_fit: "Role fit", clarity: "Clarity" };
const ROLES = ["auto", "AI/ML Engineer", "GenAI/LLM Engineer", "Data Analyst", "Data Engineer", "Software Engineer", "Cloud/DevOps"];

export default function Pro() {
  const [text, setText] = useState(""), [jd, setJd] = useState(""), [role, setRole] = useState("auto");
  const [file, setFile] = useState(null), [busy, setBusy] = useState(false), [err, setErr] = useState(""), [res, setRes] = useState(null), [tab, setTab] = useState("score");

  const pick = f => {
    if (!f) return;
    if (!/pdf|image/.test(f.type)) return setErr("Use PDF, JPG or PNG. For Word files, paste the text.");
    const r = new FileReader();
    r.onload = () => { setFile({ name: f.name, type: f.type, data: String(r.result).split(",")[1] }); setErr(""); };
    r.readAsDataURL(f);
  };
  const run = async () => {
    setBusy(true); setErr(""); setRes(null);
    try {
      const r = await fetch("/api/agent", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text, jd, role, file: file && { type: file.type, data: file.data } }) });
      const j = await r.json(); if (!r.ok) throw new Error(j.error || "Request failed");
      setRes(j); setTab("score");
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };
  const copy = t => navigator.clipboard?.writeText(t);
  const s = res?.score, o = res?.out, L = res?.profile?.layout;

  return (<main>
    <style>{`
    :root{--ink:#0A0E17;--panel:#121826;--line:#26324b;--tx:#e8ecf5;--mut:#8b97b3;--amber:#ffb347;--blue:#7aa2ff;--red:#ff7a7a}
    *{box-sizing:border-box}body{margin:0;background:var(--ink)}
    main{max-width:980px;margin:0 auto;padding:20px 16px 60px;color:var(--tx);font:15px/1.55 system-ui,sans-serif}
    h1{font:600 clamp(28px,6vw,46px)/1.1 Georgia,serif;margin:18px 0 8px}h2{font:600 18px Georgia,serif;margin:0 0 10px}
    .mut{color:var(--mut)}.card{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:16px;margin:12px 0}
    textarea,select{width:100%;background:#0d1322;color:var(--tx);border:1px solid var(--line);border-radius:6px;padding:10px;font:inherit}
    textarea{min-height:130px;resize:vertical}label{display:block;margin:10px 0 6px;color:var(--mut);font-size:13px}
    button{font:inherit;cursor:pointer;border-radius:6px;border:1px solid var(--line);background:#0d1322;color:var(--tx);padding:9px 14px}
    button:focus-visible,textarea:focus-visible,select:focus-visible{outline:2px solid var(--blue)}
    .go{background:var(--amber);color:#1a1200;border:0;font-weight:700;width:100%;padding:13px;margin-top:14px}.go[disabled]{opacity:.6}
    .tabs{display:flex;gap:6px;overflow-x:auto;margin:16px 0 0}.tabs button[aria-selected=true]{background:var(--amber);color:#1a1200;border-color:var(--amber)}
    .bar{height:8px;background:#0d1322;border-radius:4px;overflow:hidden}.bar i{display:block;height:100%}
    .row{display:flex;justify-content:space-between;font-size:13px;margin:10px 0 4px}
    .chip{display:inline-block;border:1px solid var(--line);border-radius:99px;padding:3px 10px;margin:3px;font-size:13px}.ok{border-color:#3d8f6e}.no{border-color:var(--red)}
    .big{font:700 64px/1 Georgia,serif}pre{white-space:pre-wrap;word-break:break-word;font:inherit;margin:0}
    .tr li{margin:6px 0}@media(prefers-reduced-motion:no-preference){.bar i{transition:width .8s}}`}</style>

    <h1>Resume Reviewer Pro</h1>
    <p className="mut">Four agents parse, retrieve guidelines, score, and rewrite your resume. Nothing is invented: the critic flags anything it can't trace to your resume.</p>

    <div className="card">
      <label htmlFor="f">Resume file (PDF, JPG, PNG)</label>
      <input id="f" type="file" accept=".pdf,image/*" onChange={e => pick(e.target.files[0])} />
      {file && <div className="mut">Attached: {file.name}</div>}
      <label htmlFor="t">Or paste resume text</label>
      <textarea id="t" value={text} onChange={e => setText(e.target.value)} />
      <label htmlFor="r">Target role</label>
      <select id="r" value={role} onChange={e => setRole(e.target.value)}>{ROLES.map(r => <option key={r}>{r}</option>)}</select>
      <label htmlFor="j">Job description</label>
      <textarea id="j" value={jd} onChange={e => setJd(e.target.value)} />
      <button className="go" onClick={run} disabled={busy}>{busy ? "Agents are working (20–40s)…" : "Analyze my resume"}</button>
      {err && <p role="alert" style={{ color: "var(--red)" }}>{err}</p>}
    </div>

    {res && <>
      <div className="tabs" role="tablist">{[["score", "Score"], ["fix", "Fixes"], ["rewrite", "Rewrite"], ["letter", "Cover letter"], ["prep", "Interview prep"], ["trace", "Agent trace"]].map(([k, n]) =>
        <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}>{n}</button>)}</div>

      {tab === "score" && <div className="card">
        <div className="big">{s.overall}<span className="mut" style={{ fontSize: 22 }}>/100</span></div><p>{s.verdict}</p>
        {Object.entries(CATS).map(([k, n]) => { const v = s.categories?.[k] ?? 0; return <div key={k}><div className="row"><span>{n}</span><span>{v}</span></div><div className="bar"><i style={{ width: v + "%", background: v > 74 ? "#3d8f6e" : v > 49 ? "var(--amber)" : "var(--red)" }} /></div></div>; })}
        <h2 style={{ marginTop: 18 }}>Keywords</h2>
        {s.matched_keywords?.map(k => <span key={k} className="chip ok">{k}</span>)}
        {s.missing_keywords?.map(k => <span key={k.keyword} className="chip no" title={k.where_to_add}>{k.keyword}</span>)}
        {L && <><h2 style={{ marginTop: 18 }}>Layout check (vision): {L.score}/100</h2>
          <p className="mut">{L.columns} column(s){L.uses_tables ? ", tables detected" : ""}{L.has_photo ? ", photo present" : ""}</p>
          <ul>{L.issues?.map((i, n) => <li key={n}>{i}</li>)}</ul></>}
        {s.skill_gaps?.length > 0 && <><h2>Skill gaps</h2><ul>{s.skill_gaps.map(g => <li key={g.skill}><b>{g.skill}</b>: {g.learn_next}</li>)}</ul></>}
      </div>}

      {tab === "fix" && <div className="card">{s.fixes?.map((f, i) => <p key={i}><b>[{f.priority}]</b> {f.issue}<br /><span className="mut">{f.fix}</span></p>)}
        {s.missing_sections?.length > 0 && <p>Missing sections: {s.missing_sections.join(", ")}</p>}</div>}

      {tab === "rewrite" && <div className="card"><h2>Summary</h2><p>{o.summary}</p>
        {o.rewritten_bullets?.map((b, i) => <p key={i}><span className="mut">Before: {b.before}</span><br />After: {b.after}</p>)}
        <h2>ATS-safe resume</h2><button onClick={() => copy(o.ats_resume_markdown)}>Copy</button><pre style={{ marginTop: 10 }}>{o.ats_resume_markdown}</pre>
        <p className="mut">Critic: fabrication risk {o.critic?.fabrication_risk}. {o.critic?.flags?.join(" ")}</p></div>}

      {tab === "letter" && <div className="card"><button onClick={() => copy(o.cover_letter)}>Copy</button><pre style={{ marginTop: 10 }}>{o.cover_letter}</pre></div>}
      {tab === "prep" && <div className="card">{o.interview_questions?.map((q, i) => <p key={i}><b>{q.q}</b><br /><span className="mut">{q.tip}</span></p>)}</div>}
      {tab === "trace" && <div className="card"><ol className="tr">{res.trace.map((t, i) => <li key={i}><b>{t.agent}</b>: {t.note}{t.sources && <span className="mut"> ({t.sources.join(", ")})</span>}</li>)}</ol></div>}
    </>}
  </main>);
}
