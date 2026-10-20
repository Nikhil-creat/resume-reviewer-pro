import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";

export async function GET() {
  let cnn = false;
  const base = process.env.CNN_SERVICE_URL;
  if (base) {
    try {
      const c = new AbortController(); const t = setTimeout(() => c.abort(), 1500);
      const r = await fetch(base.replace(/\/$/, "") + "/health", { signal: c.signal }); clearTimeout(t);
      cnn = r.ok && !!(await r.json()).cnn;
    } catch { cnn = false; }
  }
  return NextResponse.json({ ok: true, version: "2.0.0", providers: { groq: !!process.env.GROQ_API_KEY, gemini: !!process.env.GOOGLE_API_KEY }, cnn });
}
