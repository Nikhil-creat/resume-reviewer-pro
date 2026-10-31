// Cross-origin access for the static GitHub Pages frontend → this API (e.g. on Vercel).
// Secure default: no cross-origin access unless the origin is listed in ALLOWED_ORIGINS.
//   ALLOWED_ORIGINS=https://nikhil-creat.github.io,http://localhost:3000

export function corsHeaders(req) {
  const allowed = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((s) => s.trim().replace(/\/$/, ''))
    .filter(Boolean);
  const origin = req?.headers?.get('origin') || '';
  const h = { Vary: 'Origin' };
  if (origin && allowed.includes(origin)) {
    h['Access-Control-Allow-Origin'] = origin;
    h['Access-Control-Allow-Methods'] = 'GET,POST,OPTIONS';
    h['Access-Control-Allow-Headers'] = 'Content-Type';
    h['Access-Control-Max-Age'] = '86400';
  }
  return h;
}

export const preflight = (req) => new Response(null, { status: 204, headers: corsHeaders(req) });
