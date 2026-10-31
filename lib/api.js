// Client-side API base. Empty on Vercel/Docker (same origin).
// On GitHub Pages (static) set NEXT_PUBLIC_API_BASE=https://your-backend.vercel.app at build time.
export const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || '').replace(/\/$/, '');
export const apiUrl = (path) => `${API_BASE}${path}`;
export const BACKEND_HINT = API_BASE
  ? ''
  : ' (If this is the GitHub Pages site, the backend URL was not configured: set the API_BASE repository variable and re-run the workflow.)';
