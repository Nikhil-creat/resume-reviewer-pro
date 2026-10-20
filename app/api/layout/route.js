import { NextResponse } from "next/server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req) {
  const base = process.env.CNN_SERVICE_URL;
  if (!base) return NextResponse.json({ fallback: true }, { status: 503 });
  try {
    const body = await req.json();
    if (typeof body?.image !== "string" || body.image.length > 8_000_000) return NextResponse.json({ error: "bad image" }, { status: 400 });
    const c = new AbortController(); const t = setTimeout(() => c.abort(), 8000);
    const r = await fetch(base.replace(/\/$/, "") + "/analyze", { method: "POST", signal: c.signal, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ image: body.image, text_based: body.textBased !== false }) });
    clearTimeout(t);
    if (!r.ok) return NextResponse.json({ fallback: true }, { status: 502 });
    return NextResponse.json(await r.json());
  } catch { return NextResponse.json({ fallback: true }, { status: 502 }); }
}
