# Resume Reviewer Pro: Agentic upgrade
New files only; nothing existing is overwritten.
1. Copy `lib/`, `app/api/agent/`, `app/pro/` into the repo root (merge folders).
2. Env var `GOOGLE_API_KEY` already set on Vercel is reused. Optional: `GEMINI_MODEL`.
3. `git add . && git commit -m "Agentic RAG + vision upgrade" && git push`; Vercel redeploys.
4. Open `/master.html` (full site) or `/pro` (React version). Link your home page button to `/master.html`.
Notes: files must be under 4 MB (Vercel body limit). DOCX: paste text. Extend `lib/kb.js` to grow the RAG knowledge.
