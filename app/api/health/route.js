import { hasGroq, hasGemini } from '../../../lib/llm.js';
import { cnnHealth } from '../../../lib/cnn.js';
import { corsHeaders, preflight } from '../../../lib/cors.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Reports which capabilities are configured. Never returns key values.
export const OPTIONS = (req) => preflight(req);

export async function GET(req) {
  const cnn = await cnnHealth();
  return Response.json(
    {
    status: 'ok',
    version: '2.0.0',
    providers: { groq: hasGroq(), gemini: hasGemini() },
    mode: hasGroq() || hasGemini() ? 'live' : 'offline',
    cnn,
    },
    { headers: corsHeaders(req) },
  );
}
