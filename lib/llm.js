// Unified LLM layer: Groq (OpenAI-compatible) + Google Gemini, with automatic fallback.
// API keys only ever live on the server and travel in headers, never in URLs.
import { safeMsg } from './guard.js';

const TIMEOUT_MS = 45000;

const groqKey = () => process.env.GROQ_API_KEY || '';
const geminiKey = () => process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';

export const hasGroq = () => !!groqKey();
export const hasGemini = () => !!geminiKey();
export const hasAnyLLM = () => hasGroq() || hasGemini();

async function post(url, headers, body) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
      signal: ctl.signal,
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      const err = new Error(`HTTP ${r.status}: ${data?.error?.message || 'request failed'}`);
      err.status = r.status;
      throw err;
    }
    return data;
  } catch (e) {
    if (e.name === 'AbortError') throw new Error('LLM request timed out');
    throw new Error(safeMsg(e));
  } finally {
    clearTimeout(t);
  }
}

export async function callGroq({ system, user, messages, json = false, maxTokens = 2048, temperature = 0.3 }) {
  if (!hasGroq()) throw new Error('GROQ_API_KEY not set');
  const model = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
  const msgs = messages
    ? [{ role: 'system', content: system }, ...messages]
    : [{ role: 'system', content: system }, { role: 'user', content: user }];
  const body = { model, messages: msgs, temperature, max_tokens: maxTokens };
  if (json) body.response_format = { type: 'json_object' };
  const r = await post('https://api.groq.com/openai/v1/chat/completions', { Authorization: `Bearer ${groqKey()}` }, body);
  return { text: r.choices?.[0]?.message?.content || '', provider: 'groq', model };
}

export async function callGemini({ system, user, messages, files = [], json = false, maxTokens = 4096, temperature = 0.3 }) {
  if (!hasGemini()) throw new Error('GEMINI_API_KEY not set');
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const contents = messages
    ? messages.map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }))
    : [
        {
          role: 'user',
          parts: [...files.map((f) => ({ inline_data: { mime_type: f.mimeType, data: f.data } })), { text: user }],
        },
      ];
  const body = {
    systemInstruction: { parts: [{ text: system }] },
    contents,
    generationConfig: { temperature, maxOutputTokens: maxTokens, ...(json ? { responseMimeType: 'application/json' } : {}) },
  };
  const r = await post(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    { 'x-goog-api-key': geminiKey() },
    body,
  );
  const text = (r.candidates?.[0]?.content?.parts || []).map((p) => p.text || '').join('');
  return { text, provider: 'gemini', model };
}

function order(prefer, needsGemini) {
  if (needsGemini) return hasGemini() ? ['gemini'] : [];
  const all = prefer === 'gemini' ? ['gemini', 'groq'] : ['groq', 'gemini'];
  return all.filter((p) => (p === 'groq' ? hasGroq() : hasGemini()));
}

/** Run a completion on the preferred provider, falling back to the other on failure. */
export async function llm({ prefer = 'groq', ...opts }) {
  const providers = order(prefer, (opts.files || []).length > 0);
  if (!providers.length) throw new Error('NO_PROVIDER');
  let last;
  for (const p of providers) {
    try {
      return p === 'groq' ? await callGroq(opts) : await callGemini(opts);
    } catch (e) {
      last = e;
    }
  }
  throw last;
}

export function parseJSON(text) {
  let t = String(text || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '');
  const a = t.indexOf('{');
  const b = t.lastIndexOf('}');
  if (a === -1 || b === -1) throw new Error('Model did not return JSON');
  return JSON.parse(t.slice(a, b + 1));
}

/** JSON completion. If the first provider returns malformed JSON, the other one gets a try. */
export async function llmJSON({ prefer = 'groq', ...opts }) {
  const providers = order(prefer, false);
  if (!providers.length) throw new Error('NO_PROVIDER');
  let last;
  for (const p of providers) {
    try {
      const r = p === 'groq' ? await callGroq({ ...opts, json: true }) : await callGemini({ ...opts, json: true });
      return { data: parseJSON(r.text), provider: r.provider, model: r.model };
    } catch (e) {
      last = e;
    }
  }
  throw last;
}
