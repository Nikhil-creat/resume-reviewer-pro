# Architecture

```
Browser (Next.js client)                                   Server
  upload PDF/DOCX/IMG/TXT                                   /api/llm     -> Groq | Gemini (server key or user key)
  pdf.js / mammoth / tesseract.js (CDN, on demand)          /api/layout  -> cnn-service (FastAPI, ONNX CNN + heuristics)
  layout.js heuristics  ------------------------------->    /api/health
  runAgent():
    parse -> RAG(role, keywords) -> score -> plan
    rule-based cleanup  (always)
    LLM rewrite -> guard -> verify -> iterate (if AI on)
    needs-input (real metrics, confirmed skills)
  exports: jsPDF (PDF) | OOXML+JSZip (DOCX) | TXT | JSON
```

- **Judge vs proposer:** the rules engine scores and verifies; the LLM only proposes rewrites.
- **Privacy:** parsing, scoring, RAG and exports run client-side. Only text sent for AI rewriting goes to the provider through `/api/llm`, which stores nothing.
- **RAG:** role profiles, ATS guidelines and a skills ontology embedded with deterministic hashed embeddings (`lib/text.js`) and searched by cosine similarity. No external vector database is needed; the same interface can be pointed at Qdrant.
- **CNN:** `cnn-service/model.py` is a 4-block CNN trained on procedurally generated resume pages (single column, two column, table heavy, graphics heavy) and exported to ONNX. Heuristics in `heuristics.py` / `lib/layout.js` are always available as a fallback and as complementary features.
