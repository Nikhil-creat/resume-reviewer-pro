// Server-side provider calls (Groq, Gemini). Keys come from env or a per-request user key; nothing is logged or stored.
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const timeout = (ms) => { const c = new AbortController(); const t = setTimeout(() => c.abort(), ms); return { signal: c.signal, done: () => clearTimeout(t) }; };

export async function callProvider({ provider, key, system, user, json = false, model }) {
  const t = timeout(45000);
  try {
    if (provider === "groq") {
      const m = model || process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
      const r = await fetch(GROQ_URL, { method: "POST", signal: t.signal, headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify({ model: m, temperature: 0.2, max_tokens: 3500, messages: [{ role: "system", content: system }, { role: "user", content: user }], ...(json ? { response_format: { type: "json_object" } } : {}) }) });
      if (!r.ok) throw httpError(r.status, await r.text());
      const d = await r.json(); return { text: d.choices?.[0]?.message?.content || "", model: m };
    }
    if (provider === "gemini") {
      const m = model || process.env.GEMINI_MODEL || "gemini-2.5-flash";
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(m)}:generateContent`, { method: "POST", signal: t.signal,
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({ systemInstruction: { parts: [{ text: system }] }, contents: [{ role: "user", parts: [{ text: user }] }], generationConfig: { temperature: 0.2, maxOutputTokens: 3500, ...(json ? { responseMimeType: "application/json" } : {}) } }) });
      if (!r.ok) throw httpError(r.status, await r.text());
      const d = await r.json(); return { text: (d.candidates?.[0]?.content?.parts || []).map((p) => p.text || "").join(""), model: m };
    }
    throw httpError(400, "unknown provider");
  } finally { t.done(); }
}
function httpError(status, body) { const e = new Error(String(body).slice(0, 300)); e.status = status; return e; }
