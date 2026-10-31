// Knowledge base for the RAG retriever (resume rubric + career guidance).
// Short, factual chunks: they are injected into prompts as grounding context.

export const KB = [
  {
    id: 'ats-format',
    title: 'ATS-safe formatting',
    tags: ['format', 'ats', 'layout'],
    text: 'Use a single-column layout with standard section headings (Summary, Experience, Education, Skills, Projects, Certifications). Avoid tables, text boxes, headers/footers for key info, icons, skill-rating bars and images. Use common fonts, 10-12pt, and save as PDF (text-based, not scanned) or DOCX. Keep contact details in the body, not in the page header.',
  },
  {
    id: 'ats-length',
    title: 'Resume length',
    tags: ['length', 'format', 'fresher'],
    text: 'Freshers and early-career candidates (under ~8 years) should use one page. Two pages are acceptable for senior profiles. Cut outdated or irrelevant roles rather than shrinking the font. Aim for 350-700 words on one page.',
  },
  {
    id: 'bullets-impact',
    title: 'Impact-driven bullets',
    tags: ['bullets', 'impact', 'metrics', 'achievements'],
    text: 'Write bullets as Action verb + what you did + how/tool + measurable result. Example pattern: "Built X using Y, reducing Z by 30%". Quantify with %, counts, time saved, users, revenue or accuracy. If there is no exact number, use an honest scale (e.g. "for 200+ users"). Aim for most bullets to contain a number.',
  },
  {
    id: 'action-verbs',
    title: 'Strong action verbs',
    tags: ['verbs', 'bullets', 'writing'],
    text: 'Start bullets with strong verbs: Built, Designed, Developed, Implemented, Automated, Optimized, Reduced, Increased, Led, Deployed, Analyzed, Trained, Integrated, Migrated, Launched. Avoid weak openers such as "Responsible for", "Worked on", "Helped with", "Was involved in".',
  },
  {
    id: 'keywords-match',
    title: 'Keyword matching with a job description',
    tags: ['keywords', 'jd', 'ats', 'matching'],
    text: 'Mirror the exact terms used in the job description for skills, tools and certifications, but only when they are true. Place important keywords in both the Skills section and in experience/project bullets so they appear in context. Use both spelled-out and acronym forms once (e.g. "Natural Language Processing (NLP)"). Do not keyword-stuff or hide white text; ATS and recruiters penalise it.',
  },
  {
    id: 'summary',
    title: 'Professional summary',
    tags: ['summary', 'objective', 'profile'],
    text: 'A summary is 2-3 lines: who you are, your strongest relevant skills, and what you want to do. Tailor it to the target role. Avoid generic phrases like "hard-working team player". For freshers, mention degree, graduation year, core stack and 1 standout project.',
  },
  {
    id: 'skills-section',
    title: 'Skills section',
    tags: ['skills', 'keywords', 'technical'],
    text: 'Group skills by category (Languages, Frameworks, Databases, Tools, Cloud). List only skills you can discuss in an interview. Put the most job-relevant skills first. Skip soft-skill lists and self-rated proficiency bars.',
  },
  {
    id: 'projects',
    title: 'Projects for freshers',
    tags: ['projects', 'fresher', 'student', 'portfolio'],
    text: 'For students and freshers, projects replace experience. For each project: name, stack, 2-3 bullets covering problem, approach and measurable outcome, plus a GitHub or live link. Prefer 2-4 strong projects over a long list. End-to-end projects (data, model, API, deployment) stand out.',
  },
  {
    id: 'education',
    title: 'Education section',
    tags: ['education', 'fresher', 'student'],
    text: 'List degree, institution, years and CGPA/percentage if strong. Freshers keep education near the top; experienced candidates move it below experience. Add relevant coursework only if it matches the job.',
  },
  {
    id: 'certs',
    title: 'Certifications and internships',
    tags: ['certifications', 'internship', 'courses'],
    text: 'Include only relevant, verifiable certifications with issuer and year. Micro-internships and virtual experience programs belong under Internships/Experience with 1-2 outcome bullets. Remove expired or unrelated certificates.',
  },
  {
    id: 'role-data',
    title: 'Data analyst / data science keywords',
    tags: ['data analyst', 'data science', 'analytics', 'role', 'keywords'],
    text: 'Common data-role keywords: SQL, Python, pandas, NumPy, Excel, Power BI, Tableau, data cleaning, ETL, dashboards, KPI, A/B testing, statistics, regression, visualization, stakeholder reporting, storytelling with data. Show a project with a business question, dataset size, method and insight.',
  },
  {
    id: 'role-swe',
    title: 'Software engineer keywords',
    tags: ['software engineer', 'developer', 'backend', 'frontend', 'role', 'keywords'],
    text: 'Common SWE keywords: data structures and algorithms, REST APIs, microservices, Git, CI/CD, Docker, testing, system design, SQL/NoSQL, React, Node.js, Java, Python, cloud (AWS/GCP/Azure). Show scale, latency, test coverage, uptime or deployment ownership.',
  },
  {
    id: 'role-ml',
    title: 'ML / AI engineer keywords',
    tags: ['machine learning', 'ai', 'ml engineer', 'deep learning', 'role', 'keywords'],
    text: 'Common ML/AI keywords: PyTorch, TensorFlow, scikit-learn, CNN, transformers, NLP, LLM, RAG, vector database, embeddings, fine-tuning, MLOps, model evaluation (precision, recall, F1, AUC), feature engineering, deployment, Docker. Report dataset size, metrics and baselines.',
  },
  {
    id: 'role-web',
    title: 'Full-stack / web developer keywords',
    tags: ['full stack', 'web', 'react', 'next.js', 'role', 'keywords'],
    text: 'Common full-stack keywords: React, Next.js, TypeScript, Node.js, Express, REST, GraphQL, MongoDB, PostgreSQL, authentication (JWT), responsive design, accessibility, performance (Lighthouse), testing (Jest), deployment (Vercel, Docker).',
  },
  {
    id: 'cover-letter',
    title: 'Cover letter structure',
    tags: ['cover letter', 'writing'],
    text: 'Keep a cover letter to 200-280 words in 3 short paragraphs: (1) why this role and company, (2) two achievements that match the top requirements, (3) a confident close with availability. Address a named person when possible. Never repeat the whole resume and never claim skills you do not have.',
  },
  {
    id: 'interview',
    title: 'Interview preparation',
    tags: ['interview', 'questions', 'prepare'],
    text: 'Prepare for each resume line: be ready to explain any project, tool or number you list. Use the STAR method (Situation, Task, Action, Result) for behavioural questions. Prepare 2 questions to ask the interviewer. For technical roles, revise fundamentals of every skill listed.',
  },
  {
    id: 'linkedin',
    title: 'LinkedIn alignment',
    tags: ['linkedin', 'profile', 'headline'],
    text: 'Keep LinkedIn consistent with the resume: same titles, dates and skills. Headline pattern: "Target role | 3 core skills | proof point". Add a customised profile URL, a featured project link and a short About section with keywords recruiters search for.',
  },
  {
    id: 'honesty',
    title: 'Honesty and fabrication',
    tags: ['honesty', 'ethics', 'fabrication', 'rewrite'],
    text: 'Never invent employers, degrees, dates, metrics or skills. Use placeholders like [add metric] where numbers are missing and fill them with real data. Background checks and technical interviews expose fabricated claims. An optimised rewrite must stay truthful.',
  },
  {
    id: 'score-meaning',
    title: 'What the ATS score means',
    tags: ['score', 'ats', 'explain', 'limits'],
    text: 'The score is an estimate combining keyword coverage, impact/quantification, structure, formatting and readability. Real ATS products differ and many do not auto-reject by score; recruiters still read resumes. Use the score as guidance to find gaps, not as a guarantee of interview outcomes.',
  },
  {
    id: 'privacy',
    title: 'Privacy tips',
    tags: ['privacy', 'pii', 'security'],
    text: 'Do not put government ID numbers (Aadhaar, PAN, SSN, passport), date of birth, marital status or full home address on a resume. A city and state, one email and one phone number are enough. Photos are unnecessary in most countries and can break ATS parsing.',
  },
  {
    id: 'gaps',
    title: 'Career gaps and switches',
    tags: ['gap', 'career change', 'switch'],
    text: 'Be upfront about gaps with one factual line (e.g. "Upskilling in data analytics, 2025") and show what you built in that time. For career switches, lead with a summary that frames transferable skills, then projects, then past roles.',
  },
  {
    id: 'readability',
    title: 'Readability',
    tags: ['readability', 'writing', 'bullets'],
    text: 'Keep bullets to 1-2 lines (12-25 words). Use consistent tense (past for previous roles, present for current). Use 3-6 bullets per role. Avoid dense paragraphs, first-person pronouns and unexplained jargon. Proofread for spelling: typos are a top rejection reason.',
  },
];
