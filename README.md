# Resume Reviewer Pro v2

**Agentic ATS resume analyzer and builder.** Upload a resume, get an explainable 100-point ATS score, a truthful agent-rewritten version, and ATS-safe PDF and DOCX downloads. Next.js 14, RAG, a CNN layout service, Docker, and Groq or Gemini for the rewrite agent.

![version](https://img.shields.io/badge/version-2.0.0-34d399) ![license](https://img.shields.io/badge/license-MIT-818cf8)

## What is new in v2
| Area | v1 | v2 |
|---|---|---|
| Scoring | LLM opinion | **Deterministic 100-point rubric** (9 categories, exact points per fix, reproducible) |
| Rewrite | one LLM call | **Agent loop**: plan, rewrite, guard, verify, iterate; LLM is only a proposer |
| Honesty | none | **No-fabrication guard**: unsupported numbers, skills and links are stripped |
| Knowledge | prompt only | **RAG** over 15 role profiles, ATS guidelines and a 150-skill ontology |
| Layout | not checked | **CNN + heuristics** detect columns, tables, graphics, margins, scanned PDFs |
| Output | text | **ATS-safe PDF and DOCX** (single column, real text), TXT, JSON, editable preview with re-scoring |
| Extras | cover letter | cover letter, LinkedIn headline and about, interview questions, JD tailoring, score history |
| Providers | Gemini | **Groq (Llama 3.3 70B) or Gemini**, server key or your own key, offline rules mode |
| Ops | Vercel | Vercel, Docker Compose, CI, 23 engine tests + CNN service tests |

## Why it can say "95+" and still be honest
The score comes from an open rubric (`docs/SCORING.md`), not from a vendor ATS. The agent only rewrites what is true. If a resume lacks real metrics or confirmed skills, the app tells you exactly which details to add instead of inventing them.

## Architecture
See `docs/ARCHITECTURE.md`. Summary: parsing, scoring, RAG, layout heuristics and exports run in the browser; only text sent for AI rewriting goes through `/api/llm` to Groq or Gemini; `/api/layout` proxies page images to the optional CNN service.

## Run it
**Vercel (existing deployment):** push to `main`; set env vars `GOOGLE_API_KEY` and/or `GROQ_API_KEY` (optional: visitors can paste their own key in AI settings).

**Local:**
```bash
npm install
cp .env.local.example .env.local   # add a key (free: console.groq.com/keys or aistudio.google.com/apikey)
npm run dev                         # http://localhost:3000
npm test                            # 23 engine tests
```

**Docker (web + CNN layout service):**
```bash
docker compose up --build           # http://localhost:3000
```
The CNN image trains on synthetic resume pages while building and exports ONNX for inference.

## Configuration
| Variable | Purpose |
|---|---|
| `GOOGLE_API_KEY` | Gemini key (server side) |
| `GROQ_API_KEY` | Groq key (server side) |
| `GEMINI_MODEL`, `GROQ_MODEL` | override models (defaults `gemini-2.5-flash`, `llama-3.3-70b-versatile`) |
| `CNN_SERVICE_URL` | URL of `cnn-service`; empty = heuristics only |

## Repository map
`app/` UI + API routes | `lib/` engine: `parser`, `ats`, `rag`, `kb`, `resume`, `guard`, `agent`, `layout`, `extract`, `export`, `llm` | `cnn-service/` FastAPI + PyTorch CNN | `tests/` | `docs/`

## Limitations
- Not affiliated with any ATS vendor; scores are explainable estimates.
- The CNN is trained on synthetic pages; the heuristics remain the safety net. Fine-tune on real resumes for production.
- PDF text extraction follows reading order as an ATS would, so two-column resumes will look scrambled by design.
- Browser libraries (pdf.js, mammoth, tesseract.js, jsPDF, JSZip) load from jsDelivr on demand.

## Author
**DESIGNED AND DEVELOPED BY NIKHIL CHARY SRIRAMOJU** · [GitHub](https://github.com/Nikhil-creat) · [LinkedIn](https://in.linkedin.com/in/nikhil-chary-sriramoju-95041b38a)

MIT licensed.
