'use client';
import { useRef, useState } from 'react';
import {
  Upload, FileText, Loader2, Check, X, Copy, Download, AlertTriangle, ShieldCheck, Wand2, Target, Mail, Sparkles,
  ScanLine, Bot, CircleDashed, MinusCircle, MessageCircle,
} from 'lucide-react';
import { useApp } from './AppContext';
import ScoreRing from './ScoreRing';
import { apiUrl, BACKEND_HINT } from '../../lib/api';

const TABS = [
  ['overview', 'Overview', Target],
  ['keywords', 'Keywords', ScanLine],
  ['rewrite', 'AI rewrite', Wand2],
  ['cover', 'Cover letter', Mail],
  ['interview', 'Interview prep', MessageCircle],
  ['security', 'Security', ShieldCheck],
];

const DIM_LABEL = {
  keywords: 'Keyword match',
  impact: 'Impact & metrics',
  structure: 'Structure',
  formatting: 'ATS formatting',
  readability: 'Readability',
};

const SAMPLE_JD = `Data Analyst Intern
We are looking for an intern who can use Python, SQL and Power BI to clean data and build dashboards. Experience with pandas, Excel, statistics and communicating insights to stakeholders is required. Knowledge of Tableau, Docker and cloud platforms (AWS) is a plus.`;

const barColor = (n) => (n >= 80 ? 'var(--ok)' : n >= 60 ? 'var(--warn)' : 'var(--bad)');

function download(name, text) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

function CopyBtn({ text, label = 'Copy' }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      className="btn btn-ghost btn-sm"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setOk(true);
          setTimeout(() => setOk(false), 1600);
        } catch {}
      }}
    >
      {ok ? <Check size={14} /> : <Copy size={14} />} {ok ? 'Copied' : label}
    </button>
  );
}

function AgentList({ agents, running }) {
  return (
    <ol className="agents" aria-live="polite">
      {agents.map((a) => (
        <li key={a.name} className={`ag ag-${a.status}`}>
          <span className="ag-ic">
            {a.status === 'running' ? <Loader2 size={15} className="spin" /> : a.status === 'done' ? <Check size={15} /> : a.status === 'error' ? <X size={15} /> : <MinusCircle size={15} />}
          </span>
          <b>{a.name}</b>
          <span className="muted ag-d">{a.detail || (a.status === 'running' ? 'working…' : '')}</span>
          {a.ms ? <span className="ag-ms">{(a.ms / 1000).toFixed(1)}s</span> : null}
        </li>
      ))}
      {running && agents.length === 0 && (
        <li className="ag ag-running"><span className="ag-ic"><Loader2 size={15} className="spin" /></span><b>Starting</b></li>
      )}
    </ol>
  );
}

function Results({ r }) {
  const { askAssistant } = useApp();
  const [tab, setTab] = useState('overview');
  const b = r.score.breakdown;

  return (
    <div className="results glass rise">
      <div className="res-top">
        <ScoreRing value={r.score.overall} grade={r.score.grade} />
        <div className="res-sum">
          <div className="badges">
            <span className={`badge ${r.mode === 'live' ? 'badge-ok' : 'badge-warn'}`}>
              {r.mode === 'live' ? `AI: ${r.providers.join(' + ')}` : r.mode === 'degraded' ? 'AI unavailable — rule-based' : 'Offline rule-based mode'}
            </span>
            {r.layout && (
              <span className="badge">{r.layout.source === 'cnn' ? 'CNN' : 'Heuristic'} layout: {r.layout.label.replace('_', ' ')} · {Math.round(r.layout.confidence * 100)}%</span>
            )}
            {!r.score.hasJD && <span className="badge badge-warn">No job description — general score</span>}
          </div>
          <p>{r.summary}</p>
          <button className="btn btn-ghost btn-sm" onClick={() => askAssistant('Explain my score and tell me the 3 fastest fixes.')}>
            <MessageCircle size={14} /> Ask the assistant about this result
          </button>
        </div>
      </div>

      <div className="tabs" role="tablist">
        {TABS.map(([id, label, Icon]) => (
          <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? 'on' : ''} onClick={() => setTab(id)}>
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="pane">
          <div className="bars">
            {Object.entries(b).map(([k, v]) => (
              <div key={k} className="bar">
                <div className="bar-h"><span>{DIM_LABEL[k]}</span><b>{v}</b></div>
                <div className="bar-t"><i style={{ width: `${v}%`, background: barColor(v) }} /></div>
              </div>
            ))}
          </div>

          {r.layout && <p className="note"><ScanLine size={14} /> {r.layout.advice}</p>}

          <div className="two">
            <div>
              <h4>Strengths</h4>
              <ul className="ticks">{r.strengths.map((s, i) => <li key={i}><Check size={14} /> {s}</li>)}</ul>
            </div>
            <div>
              <h4>Fix these first</h4>
              <ul className="issues">
                {r.issues.map((i, n) => (
                  <li key={n}>
                    <span className={`sev sev-${i.severity}`}>{i.severity}</span>
                    <div><b>{i.title}</b><p className="muted">{i.fix}</p></div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {tab === 'keywords' && (
        <div className="pane">
          {r.keywords.coverage !== null ? (
            <p className="note"><Target size={14} /> Keyword coverage: <b>{r.keywords.coverage}%</b> ({r.keywords.matched.length} matched, {r.keywords.missing.length} missing). Missing terms are code-verified against your resume text.</p>
          ) : (
            <p className="note">Add a job description to see keyword gaps.</p>
          )}
          <h4>Missing — add only if truthful</h4>
          <div className="chips">
            {r.keywords.missing.length === 0 && <span className="muted">No gaps found 🎉</span>}
            {r.keywords.missing.map((m) => (
              <span key={m.term} className={`chip chip-${m.importance}`} title={m.suggestion || m.importance}>
                {m.term}<small>{m.importance}</small>
              </span>
            ))}
          </div>
          <h4>Matched</h4>
          <div className="chips">
            {r.keywords.matched.length === 0 && <span className="muted">None yet</span>}
            {r.keywords.matched.map((m) => <span key={m} className="chip chip-ok">{m}</span>)}
          </div>
        </div>
      )}

      {tab === 'rewrite' && (
        <div className="pane">
          {r.rewrite.text ? (
            <>
              <div className="row-between">
                <span className="badge badge-ok">
                  {r.rewrite.estimatedScore ? `Estimated ATS score: ${r.rewrite.estimatedScore}` : 'Critic score unavailable'} · {r.rewrite.rounds} pass{r.rewrite.rounds > 1 ? 'es' : ''}
                </span>
                <span className="row">
                  <CopyBtn text={r.rewrite.text} />
                  <button className="btn btn-ghost btn-sm" onClick={() => download('resume-optimized.txt', r.rewrite.text)}><Download size={14} /> .txt</button>
                </span>
              </div>
              <pre className="doc">{r.rewrite.text}</pre>
              <p className="note"><AlertTriangle size={14} /> {r.rewrite.note} Replace every <code>[add metric]</code> placeholder with real numbers and review each line before sending.</p>
            </>
          ) : (
            <p className="note"><Bot size={14} /> {r.rewrite.note || 'The rewrite agent could not produce a result this time. Try again.'}</p>
          )}
        </div>
      )}

      {tab === 'cover' && (
        <div className="pane">
          <div className="row-between">
            <span className="muted">Tailored to your resume + job description</span>
            <span className="row">
              <CopyBtn text={r.coverLetter} />
              <button className="btn btn-ghost btn-sm" onClick={() => download('cover-letter.txt', r.coverLetter)}><Download size={14} /> .txt</button>
            </span>
          </div>
          <pre className="doc">{r.coverLetter}</pre>
        </div>
      )}

      {tab === 'interview' && (
        <div className="pane">
          <p className="note"><MessageCircle size={14} /> {r.interview?.source === 'ai' ? 'Likely questions for this resume and job, generated by AI.' : 'Template questions built from your matched and missing keywords. Add an AI key for tailored ones.'}</p>
          <ol className="qa">
            {(r.interview?.questions || []).map((x, i) => (
              <li key={i}>
                <b>{x.q}</b>
                {x.why && <p className="muted">Tests: {x.why}</p>}
                {x.tip && <p className="tip">Tip: {x.tip}</p>}
              </li>
            ))}
          </ol>
          <button className="btn btn-ghost btn-sm" onClick={() => askAssistant('Run a mock interview with me. Ask one question at a time.')}><MessageCircle size={14} /> Practice with the assistant</button>
        </div>
      )}

      {tab === 'security' && (
        <div className="pane">
          <ul className="ticks sec-list">
            <li><ShieldCheck size={14} /> Masked before reaching any model: <b>{r.security.redacted.length ? r.security.redacted.join(', ') : 'nothing found'}</b> (restored only in your output).</li>
            <li><ShieldCheck size={14} /> Prompt-injection scan: <b>{r.security.injectionFlags.length ? r.security.injectionFlags.map((f) => f.label).join(', ') : 'clean'}</b>{r.security.injectionFlags.length ? ' — treated as plain text, no effect.' : '.'}</li>
            <li><ShieldCheck size={14} /> Input limits: {r.security.truncated ? <b>text was truncated to the size limit</b> : 'within limits'}{r.security.hiddenChars ? <>; <b>hidden zero-width characters removed</b></> : ''}.</li>
            <li><ShieldCheck size={14} /> Nothing is stored: files and text are processed in memory for this request only.</li>
          </ul>
          {r.security.redacted.some((k) => k.startsWith('national-id')) && (
            <p className="note"><AlertTriangle size={14} /> A government ID number was found in your resume. We removed it from the analysis — delete it from the document too.</p>
          )}
          {r.sources?.length > 0 && (
            <>
              <h4>Knowledge used (RAG)</h4>
              <div className="chips">{r.sources.map((s) => <span key={s.id} className="chip">{s.title}</span>)}</div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function Analyzer() {
  const { setAnalysis } = useApp();
  const [mode, setMode] = useState('upload');
  const [file, setFile] = useState(null);
  const [text, setText] = useState('');
  const [jd, setJd] = useState('');
  const [tone, setTone] = useState('professional');
  const [running, setRunning] = useState(false);
  const [agents, setAgents] = useState([]);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [drag, setDrag] = useState(false);
  const inputRef = useRef(null);
  const resRef = useRef(null);

  const canRun = !running && (mode === 'upload' ? !!file : text.trim().length > 60);

  const pick = (f) => {
    if (!f) return;
    if (f.size > 4 * 1024 * 1024) return setError('File is larger than 4 MB.');
    setError('');
    setFile(f);
  };

  async function run() {
    setRunning(true);
    setError('');
    setResult(null);
    setAgents([]);
    try {
      const fd = new FormData();
      if (mode === 'upload' && file) fd.append('file', file);
      else fd.append('resumeText', text);
      fd.append('jd', jd);
      fd.append('tone', tone);

      const res = await fetch(apiUrl('/api/analyze'), { method: 'POST', body: fd });
      if (!res.ok || !res.body) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Request failed (${res.status})`);
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = '';
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let i;
        while ((i = buf.indexOf('\n')) >= 0) {
          const line = buf.slice(0, i).trim();
          buf = buf.slice(i + 1);
          if (!line) continue;
          const ev = JSON.parse(line);
          if (ev.type === 'agent') {
            setAgents((prev) => {
              const idx = prev.findIndex((a) => a.name === ev.name);
              const next = { name: ev.name, status: ev.status, ms: ev.ms, detail: ev.detail };
              if (idx === -1) return [...prev, next];
              const copy = [...prev];
              copy[idx] = { ...copy[idx], ...next };
              return copy;
            });
          } else if (ev.type === 'result') {
            setResult(ev.data);
            setAnalysis({
              overall: ev.data.score.overall,
              summary: ev.data.summary,
              missing: ev.data.keywords.missing.map((m) => m.term),
              issues: ev.data.issues.map((x) => x.title),
            });
            setTimeout(() => resRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
          } else if (ev.type === 'error') {
            throw new Error(ev.error);
          }
        }
      }
    } catch (e) {
      setError((e.message === 'Failed to fetch' ? 'Cannot reach the backend.' : e.message || 'Something went wrong.') + (e.message === 'Failed to fetch' || /404|405/.test(e.message) ? BACKEND_HINT : ''));
    } finally {
      setRunning(false);
    }
  }

  return (
    <section id="analyzer" className="section">
      <div className="container">
        <div className="sec-head">
          <span className="eyebrow">Live analyzer</span>
          <h2>Scan your resume in under a minute</h2>
          <p className="muted">PDF, DOCX, JPG/PNG or pasted text. Add a job description for keyword-gap analysis and a tailored rewrite.</p>
        </div>

        <div className="an-grid">
          <div className="glass card-in">
            <div className="seg">
              <button className={mode === 'upload' ? 'on' : ''} onClick={() => setMode('upload')}><Upload size={14} /> Upload</button>
              <button className={mode === 'paste' ? 'on' : ''} onClick={() => setMode('paste')}><FileText size={14} /> Paste text</button>
            </div>

            {mode === 'upload' ? (
              <div
                className={`drop ${drag ? 'drag' : ''} ${file ? 'has' : ''}`}
                onClick={() => inputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
                onDragLeave={() => setDrag(false)}
                onDrop={(e) => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files?.[0]); }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && inputRef.current?.click()}
              >
                <input ref={inputRef} type="file" hidden accept=".pdf,.docx,.png,.jpg,.jpeg,.txt" onChange={(e) => pick(e.target.files?.[0])} />
                {file ? (
                  <>
                    <FileText size={28} />
                    <b>{file.name}</b>
                    <span className="muted">{(file.size / 1024).toFixed(0)} KB · click to replace</span>
                  </>
                ) : (
                  <>
                    <Upload size={28} />
                    <b>Drop your resume here</b>
                    <span className="muted">PDF · DOCX · JPG · PNG · max 4 MB</span>
                  </>
                )}
              </div>
            ) : (
              <textarea className="ta" rows={9} placeholder="Paste your resume text here…" value={text} onChange={(e) => setText(e.target.value)} maxLength={20000} />
            )}

            <label className="lbl">
              Job description <span className="muted">(optional, recommended)</span>
              <button type="button" className="link" onClick={() => setJd(SAMPLE_JD)}>use sample</button>
            </label>
            <textarea className="ta" rows={6} placeholder="Paste the job description…" value={jd} onChange={(e) => setJd(e.target.value)} maxLength={8000} />

            <div className="row-between wrap">
              <label className="lbl inline">
                Cover-letter tone
                <select value={tone} onChange={(e) => setTone(e.target.value)}>
                  <option value="professional">Professional</option>
                  <option value="confident">Confident</option>
                  <option value="friendly">Friendly</option>
                </select>
              </label>
              <button className="btn btn-primary btn-lg" disabled={!canRun} onClick={run}>
                {running ? <><Loader2 size={18} className="spin" /> Agents working…</> : <><Sparkles size={18} /> Run agent scan</>}
              </button>
            </div>

            {error && <div className="err" role="alert"><AlertTriangle size={16} /> {error}</div>}
            <p className="fine"><ShieldCheck size={12} /> Emails & phone numbers are masked before any AI sees your text. Nothing is stored.</p>
          </div>

          <div className="glass card-in agents-card">
            <h3><Bot size={18} /> Agent run</h3>
            {agents.length === 0 && !running ? (
              <div className="empty">
                <CircleDashed size={30} />
                <p className="muted">Agents appear here live: Extractor → Guard → Retriever → CNN → Analyst → Rewriter ⇄ Critic → Cover letter.</p>
              </div>
            ) : (
              <AgentList agents={agents} running={running} />
            )}
          </div>
        </div>

        <div ref={resRef} className="res-anchor">{result && <Results r={result} />}</div>
      </div>
    </section>
  );
}
