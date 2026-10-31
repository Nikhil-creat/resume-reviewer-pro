'use client';
import { useEffect, useRef, useState } from 'react';
import { MessageCircle, X, Send, Loader2, Bot, ShieldCheck } from 'lucide-react';
import { useApp } from './AppContext';
import { apiUrl } from '../../lib/api';

const CHIPS = [
  'How do I add metrics to my bullets?',
  'Prepare me for a data analyst interview',
  'Write a LinkedIn headline for me',
  'What makes a resume ATS-friendly?',
];

const WELCOME = {
  role: 'assistant',
  content: "Hi! I'm **ResumeBot**, your personal career assistant. Ask me about resumes, ATS, cover letters, LinkedIn or interviews. Run a scan first and I can use your results.",
};

// tiny, safe markdown: **bold**, "- " bullets, line breaks (no innerHTML)
function Md({ text }) {
  const bold = (s) => s.split(/(\*\*[^*]+\*\*)/g).map((p, i) => (p.startsWith('**') && p.endsWith('**') ? <b key={i}>{p.slice(2, -2)}</b> : <span key={i}>{p}</span>));
  return (
    <>
      {text.split('\n').map((l, i) =>
        /^\s*[-•*]\s+/.test(l) ? (
          <div key={i} className="md-li">• {bold(l.replace(/^\s*[-•*]\s+/, ''))}</div>
        ) : l.trim() === '' ? (
          <div key={i} className="md-gap" />
        ) : (
          <div key={i}>{bold(l)}</div>
        ),
      )}
    </>
  );
}

export default function ChatWidget() {
  const { analysis, chatOpen, setChatOpen, chatSeed, setChatSeed } = useApp();
  const [msgs, setMsgs] = useState([WELCOME]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const endRef = useRef(null);
  const seeded = useRef('');

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [msgs, busy, chatOpen]);

  async function send(text) {
    const content = (text ?? input).trim();
    if (!content || busy) return;
    setInput('');
    const next = [...msgs, { role: 'user', content }];
    setMsgs(next);
    setBusy(true);
    try {
      const res = await fetch(apiUrl('/api/chat'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: next.filter((m) => m !== WELCOME).map(({ role, content: c }) => ({ role, content: c })),
          context: analysis || undefined,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || 'Request failed');
      setMsgs((m) => [...m, { role: 'assistant', content: j.reply, sources: j.sources, provider: j.provider }]);
    } catch (e) {
      setMsgs((m) => [...m, { role: 'assistant', content: `Sorry — ${e.message || 'something went wrong'}.`, error: true }]);
    } finally {
      setBusy(false);
    }
  }

  // "Ask the assistant about this result" → auto-send the seeded question once
  useEffect(() => {
    if (chatOpen && chatSeed && seeded.current !== chatSeed) {
      seeded.current = chatSeed;
      const q = chatSeed;
      setChatSeed('');
      send(q);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatOpen, chatSeed]);

  return (
    <>
      {!chatOpen && (
        <button className="fab" onClick={() => setChatOpen(true)} aria-label="Open career assistant">
          <MessageCircle size={22} />
          <span>Ask AI</span>
        </button>
      )}

      {chatOpen && (
        <section className="chat glass" role="dialog" aria-label="Career assistant">
          <header className="chat-h">
            <span className="row"><Bot size={18} /> <b>ResumeBot</b> <small className="muted">RAG · Groq + Gemini</small></span>
            <button className="icon-btn" onClick={() => setChatOpen(false)} aria-label="Close chat"><X size={18} /></button>
          </header>

          <div className="chat-b">
            {msgs.map((m, i) => (
              <div key={i} className={`msg ${m.role} ${m.error ? 'err' : ''}`}>
                <Md text={m.content} />
                {m.sources?.length > 0 && <div className="src">Sources: {m.sources.map((s) => s.title).join(' · ')}</div>}
              </div>
            ))}
            {busy && <div className="msg assistant"><Loader2 size={14} className="spin" /> thinking…</div>}
            {msgs.length === 1 && (
              <div className="quick">{CHIPS.map((c) => <button key={c} onClick={() => send(c)}>{c}</button>)}</div>
            )}
            <div ref={endRef} />
          </div>

          <form className="chat-f" onSubmit={(e) => { e.preventDefault(); send(); }}>
            <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask about your resume, interviews…" maxLength={1000} aria-label="Message" />
            <button className="btn btn-primary" disabled={busy || !input.trim()} aria-label="Send"><Send size={16} /></button>
          </form>
          <div className="chat-note"><ShieldCheck size={11} /> Don't share passwords or ID numbers. AI can make mistakes.</div>
        </section>
      )}
    </>
  );
}
