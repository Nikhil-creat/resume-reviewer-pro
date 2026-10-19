// Provider chain: Gemini (primary, supports PDF/images) then Groq (secondary, text only).
const GM = process.env.GEMINI_MODEL || "gemini-3.6-flash";
const QM = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
const parse = t => JSON.parse(String(t).replace(/```json|```/g, "").trim());

async function gemini(parts, system) {
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GM}:generateContent?key=${process.env.GOOGLE_API_KEY}`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ systemInstruction: { parts: [{ text: system }] }, contents: [{ role: "user", parts }], generationConfig: { responseMimeType: "application/json", temperature: 0.3 } })
  });
  if (!r.ok) throw new Error("HTTP " + r.status);
  const j = await r.json();
  return parse(j?.candidates?.[0]?.content?.parts?.map(p => p.text).join("") || "");
}
async function groq(parts, system) {
  const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + process.env.GROQ_API_KEY },
    body: JSON.stringify({ model: QM, temperature: 0.3, response_format: { type: "json_object" },
      messages: [{ role: "system", content: system + " Respond with valid JSON only." }, { role: "user", content: parts.filter(p => p.text).map(p => p.text).join("\n\n") }] })
  });
  if (!r.ok) throw new Error("HTTP " + r.status);
  return parse((await r.json())?.choices?.[0]?.message?.content || "");
}
export const providers = () => ({ gemini: !!process.env.GOOGLE_API_KEY, groq: !!process.env.GROQ_API_KEY, geminiModel: GM, groqModel: QM });

export async function ask(parts, system, { vision = false } = {}) {
  const errs = [];
  if (process.env.GOOGLE_API_KEY) { try { return { data: await gemini(parts, system), provider: "gemini" }; } catch (e) { errs.push("Gemini " + e.message); } }
  if (process.env.GROQ_API_KEY && !vision) { try { return { data: await groq(parts, system), provider: "groq" }; } catch (e) { errs.push("Groq " + e.message); } }
  if (vision && !errs.length) errs.push("PDF/image reading needs GOOGLE_API_KEY (Groq is text-only)");
  throw new Error(errs.join(" | ") || "No API key set. Add GOOGLE_API_KEY and/or GROQ_API_KEY in Vercel.");
}
