import { NextResponse } from "next/server";
import { callProvider } from "@/lib/llm.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const hits = new Map(); // best-effort per-instance rate limit: 20 requests / minute / IP
function limited(ip) {
  const now = Date.now(); const arr = (hits.get(ip) || []).filter((t) => now - t < 60000);
  arr.push(now); hits.set(ip, arr); if (hits.size > 5000) hits.clear();
  return arr.length > 20;
}

export async function POST(req) {
  const ip = (req.headers.get("x-forwarded-for") || "local").split(",")[0].trim();
  if (limited(ip)) return NextResponse.json({ error: "Rate limit: please wait a minute." }, { status: 429 });
  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const { system = "", user = "", json = false } = body || {};
  let provider = body?.provider || "auto";
  if (typeof system !== "string" || typeof user !== "string" || system.length + user.length > 60000) return NextResponse.json({ error: "Input too large" }, { status: 413 });

  const userKey = (req.headers.get("x-user-key") || "").trim();
  const env = { groq: process.env.GROQ_API_KEY, gemini: process.env.GOOGLE_API_KEY };
  let key = "";
  if (userKey) {
    if (provider === "auto") provider = userKey.startsWith("gsk_") ? "groq" : "gemini";
    key = userKey;
  } else {
    if (provider === "auto") provider = env.groq ? "groq" : "gemini";
    key = env[provider] || "";
  }
  if (!["groq", "gemini"].includes(provider)) return NextResponse.json({ error: "Unknown provider" }, { status: 400 });
  if (!key) return NextResponse.json({ error: "No API key configured. Add one in AI settings or set GROQ_API_KEY / GOOGLE_API_KEY on the server." }, { status: 400 });
  try {
    const out = await callProvider({ provider, key, system, user, json: !!json });
    return NextResponse.json({ text: out.text, provider, model: out.model });
  } catch (e) {
    const status = e.status === 401 || e.status === 403 ? 401 : e.status === 429 ? 429 : 502;
    const msg = status === 401 ? "The provider rejected the API key." : status === 429 ? "Provider rate limit reached. Try again shortly." : "The AI provider returned an error.";
    return NextResponse.json({ error: msg }, { status });
  }
}
