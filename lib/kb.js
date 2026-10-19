// Knowledge base for RAG retrieval. Extend freely: {id, tag, text}
export const KB = [
 {id:"ats-1",tag:"ats",text:"ATS parsers read single-column layouts best. Avoid tables, text boxes, icons for contact info, headers/footers for key content, and multi-column skill grids."},
 {id:"ats-2",tag:"ats",text:"Use standard section headings: Summary, Skills, Experience, Projects, Education, Certifications. Non-standard headings can drop sections during parsing."},
 {id:"ats-3",tag:"ats",text:"Mirror exact keywords and spellings from the job description, including acronyms and the long form once, for example Natural Language Processing (NLP)."},
 {id:"bul-1",tag:"writing",text:"Strong bullets follow Action verb + what you built + how (tools) + measurable result. Example: Built a RAG pipeline with FAISS and Groq that cut support lookup time by 40%."},
 {id:"bul-2",tag:"writing",text:"Never invent metrics. If a number is unknown, describe scale instead: users, rows, requests, latency, accuracy, dataset size."},
 {id:"bul-3",tag:"writing",text:"Prefer verbs such as built, designed, deployed, optimized, automated, trained, benchmarked, migrated. Avoid responsible for, worked on, helped with."},
 {id:"fr-1",tag:"fresher",text:"Freshers: lead with Education, Projects, Skills, then Internships. Keep to one page. Projects need stack, problem, and outcome with a live link or GitHub."},
 {id:"fr-2",tag:"fresher",text:"Recruiters scan in 6 to 10 seconds. Put the strongest project and a one-line summary with target role at the top."},
 {id:"ml-1",tag:"ai-ml",text:"AI/ML roles expect: Python, PyTorch or TensorFlow, scikit-learn, NumPy, Pandas, model evaluation (precision, recall, F1, AUC), MLOps basics (Docker, MLflow), and deployment (FastAPI)."},
 {id:"ml-2",tag:"ai-ml",text:"GenAI/LLM roles expect: prompt engineering, RAG (chunking, embeddings, vector DBs like FAISS/Qdrant/pgvector, reranking), LangChain/LangGraph agents, evaluation, guardrails, fine-tuning (LoRA/QLoRA)."},
 {id:"ml-3",tag:"ai-ml",text:"Computer vision roles expect: CNN architectures (ResNet, EfficientNet, YOLO), OpenCV, data augmentation, transfer learning, ONNX export, and metrics like mAP and IoU."},
 {id:"da-1",tag:"data",text:"Data analyst roles expect: SQL (joins, window functions), Excel, Power BI or Tableau, Python (Pandas), statistics, A/B testing, dashboards, and business storytelling."},
 {id:"de-1",tag:"data",text:"Data engineering roles expect: Spark, Airflow, dbt, Kafka, Delta Lake, warehouse modelling, data quality checks, and cloud (AWS/Azure/GCP)."},
 {id:"sw-1",tag:"software",text:"Software roles expect: DSA, one primary language, REST APIs, SQL/NoSQL, Git, testing, Docker, CI/CD, system design basics, and deployed projects."},
 {id:"cl-1",tag:"cloud",text:"Cloud/DevOps roles expect: Linux, Docker, Kubernetes, Terraform, CI/CD (GitHub Actions), monitoring (Prometheus/Grafana), and one cloud certification."},
 {id:"cv-1",tag:"cover",text:"Cover letters: 3 short paragraphs. Hook tied to the company, two proof points matched to the JD, a clear close. Under 250 words, no clichés."}
];
