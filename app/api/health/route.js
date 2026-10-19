import { providers } from "../../../lib/llm";
export async function GET() { return Response.json({ ok: true, ...providers() }); }
