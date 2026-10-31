# Security policy

## Reporting a vulnerability
Please open a **private** report via GitHub → Security → "Report a vulnerability", or message the maintainer on LinkedIn. Do not post exploits in public issues.

## Handling of secrets
- API keys (`GROQ_API_KEY`, `GEMINI_API_KEY`) live only in server environment variables (Vercel / `.env.local`). They are never sent to the browser or put in URLs.
- `.env.local` is git-ignored. **Never commit keys.** If a key leaks, revoke it in the provider console immediately.
- GitHub Pages hosts only the static UI; it contains no secrets. The only build-time value is the public backend URL (`API_BASE`).

## Built-in protections
PII masking, prompt-injection scan, per-IP rate limits, upload size/type/magic-byte checks, strict CORS allow-list (`ALLOWED_ORIGINS`), CSP and security headers on the API host, no data persistence.

## Known limits
In-memory rate limiting (per instance), heuristic injection detection (not a guarantee), AI output can be wrong. See the README.
