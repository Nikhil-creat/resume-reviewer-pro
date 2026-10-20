// Knowledge base: skills ontology, role profiles, ATS guidelines. Used by the scoring engine and the RAG layer.

export const STOP = new Set(("a an and are as at be by for from has have in into is it its of on or that the to was were will with your you our we they their this these those not but if then than so such can may more most other some any each per via using use used within across over under about also etc new").split(" "));

// [canonical, aliases[], category]
export const SKILLS = [
  ["python", ["py"], "language"], ["java", [], "language"], ["javascript", ["js", "ecmascript"], "language"], ["typescript", ["ts"], "language"],
  ["c++", ["cpp"], "language"], ["c#", ["csharp"], "language"], ["go", ["golang"], "language"], ["rust", [], "language"], ["sql", [], "language"],
  ["bash", ["shell scripting", "shell"], "language"], ["kotlin", [], "language"], ["swift", [], "language"], ["php", [], "language"], ["scala", [], "language"],
  ["html", ["html5"], "web"], ["css", ["css3"], "web"], ["react", ["react.js", "reactjs"], "web"], ["next.js", ["nextjs", "next js"], "web"], ["node.js", ["nodejs", "node"], "web"],
  ["express", ["express.js"], "web"], ["vue", ["vue.js", "vuejs"], "web"], ["angular", ["angularjs"], "web"], ["tailwind css", ["tailwind"], "web"], ["redux", [], "web"],
  ["rest api", ["rest", "restful", "restful api", "rest apis"], "web"], ["graphql", [], "web"], ["websockets", ["websocket"], "web"], ["fastapi", [], "backend"], ["flask", [], "backend"],
  ["django", [], "backend"], ["spring boot", ["springboot", "spring"], "backend"], ["microservices", ["microservice"], "backend"], ["grpc", [], "backend"],
  ["postgresql", ["postgres", "psql"], "data"], ["mysql", [], "data"], ["mongodb", ["mongo"], "data"], ["redis", [], "data"], ["sqlite", [], "data"], ["elasticsearch", [], "data"],
  ["kafka", ["apache kafka"], "data"], ["airflow", ["apache airflow"], "data"], ["dbt", [], "data"], ["spark", ["apache spark", "pyspark"], "data"], ["delta lake", [], "data"],
  ["snowflake", [], "data"], ["power bi", ["powerbi"], "data"], ["tableau", [], "data"], ["excel", ["microsoft excel", "advanced excel"], "data"], ["pandas", [], "data"], ["numpy", [], "data"],
  ["etl", ["data pipelines", "data pipeline", "elt"], "data"], ["data analysis", ["data analytics", "analytics"], "data"], ["data visualization", ["data visualisation"], "data"],
  ["machine learning", ["ml"], "ai"], ["deep learning", [], "ai"], ["pytorch", [], "ai"], ["tensorflow", [], "ai"], ["scikit-learn", ["sklearn", "scikit learn"], "ai"],
  ["cnn", ["convolutional neural network", "convolutional neural networks"], "ai"], ["transformers", ["transformer"], "ai"], ["nlp", ["natural language processing"], "ai"],
  ["computer vision", ["opencv"], "ai"], ["llm", ["llms", "large language model", "large language models"], "ai"], ["rag", ["retrieval augmented generation", "retrieval-augmented generation"], "ai"],
  ["langchain", [], "ai"], ["langgraph", [], "ai"], ["agentic ai", ["ai agents", "multi-agent", "agentic"], "ai"], ["prompt engineering", [], "ai"], ["mlops", [], "ai"],
  ["vector database", ["vector db", "qdrant", "chromadb", "pinecone", "faiss"], "ai"], ["onnx", [], "ai"], ["tensorrt", [], "ai"], ["vllm", [], "ai"], ["hugging face", ["huggingface"], "ai"],
  ["docker", ["containerization", "containers"], "devops"], ["kubernetes", ["k8s"], "devops"], ["helm", [], "devops"], ["terraform", [], "devops"], ["ansible", [], "devops"],
  ["ci/cd", ["cicd", "ci cd", "continuous integration"], "devops"], ["github actions", [], "devops"], ["jenkins", [], "devops"], ["git", [], "devops"], ["linux", [], "devops"],
  ["prometheus", [], "devops"], ["grafana", [], "devops"], ["opentelemetry", [], "devops"], ["nginx", [], "devops"], ["monitoring", ["observability"], "devops"],
  ["aws", ["amazon web services"], "cloud"], ["azure", ["microsoft azure"], "cloud"], ["gcp", ["google cloud", "google cloud platform"], "cloud"], ["vercel", [], "cloud"], ["serverless", [], "cloud"],
  ["cybersecurity", ["cyber security", "information security", "infosec"], "security"], ["zero trust", ["zero-trust"], "security"], ["siem", [], "security"], ["owasp", [], "security"],
  ["penetration testing", ["pentesting", "pen testing"], "security"], ["encryption", ["cryptography"], "security"], ["mitre att&ck", ["mitre attack", "mitre"], "security"],
  ["ebpf", [], "security"], ["iam", ["identity and access management"], "security"], ["pki", [], "security"], ["post-quantum cryptography", ["pqc"], "security"], ["incident response", [], "security"],
  ["ros 2", ["ros2", "ros"], "robotics"], ["gazebo", [], "robotics"], ["kalman filter", ["ekf"], "robotics"], ["embedded systems", ["embedded"], "robotics"], ["iot", ["internet of things"], "robotics"],
  ["agile", ["scrum"], "process"], ["unit testing", ["pytest", "jest", "junit", "unit tests"], "process"], ["tdd", ["test driven development"], "process"], ["system design", [], "process"],
  ["data structures", ["dsa", "data structures and algorithms", "algorithms"], "process"], ["oop", ["object oriented programming", "object-oriented programming"], "process"], ["jira", [], "process"],
  ["selenium", [], "qa"], ["cypress", [], "qa"], ["postman", [], "qa"], ["android", [], "mobile"], ["ios", [], "mobile"], ["flutter", [], "mobile"], ["react native", [], "mobile"]
];

export const ACTION_VERBS = new Set(("achieved accelerated architected automated analyzed analysed assembled authored boosted built championed collaborated configured consolidated created cut debugged decreased delivered deployed " +
  "designed detected developed devised directed drove eliminated enabled engineered enhanced established evaluated executed expanded extended fixed generated governed guided identified implemented improved increased " +
  "initiated installed integrated introduced investigated launched led maintained managed mentored migrated modelled modeled monitored optimized optimised orchestrated organized organised owned partnered performed " +
  "piloted planned presented prioritized produced programmed prototyped published rebuilt reduced refactored released remediated replaced researched resolved restructured reviewed revamped scaled secured shipped " +
  "simplified solved spearheaded standardized streamlined strengthened structured supported tested trained transformed translated tuned unified upgraded validated visualized wrote conducted coordinated " +
  "contributed demonstrated documented facilitated formulated hardened instrumented leveraged operationalized processed provisioned ran reengineered refined rolled secured trained").split(" "));

export const WEAK_PHRASES = ["responsible for", "worked on", "helped with", "duties included", "assisted with", "involved in", "participated in", "tasked with", "worked with", "was part of", "handled"];
export const BUZZWORDS = ["synergy", "hard-working", "hardworking", "team player", "go-getter", "results-driven", "self-motivated", "dynamic", "guru", "ninja", "rockstar", "think outside the box", "detail-oriented", "passionate about", "fast learner", "jack of all trades", "proven track record"];
export const PII_FLAGS = ["date of birth", "dob", "marital status", "gender:", "nationality", "religion", "father's name", "passport no", "aadhaar", "photo"];

export const SECTION_ALIASES = {
  summary: ["summary", "professional summary", "profile", "professional profile", "objective", "career objective", "about me", "about", "executive summary"],
  skills: ["skills", "technical skills", "core competencies", "key skills", "technologies", "tech stack", "skills and tools", "skills & tools", "skills & technologies", "technical proficiencies"],
  experience: ["experience", "work experience", "professional experience", "employment", "employment history", "internship", "internships", "internship experience", "work history"],
  projects: ["projects", "academic projects", "personal projects", "key projects", "selected projects", "technical projects", "additional projects", "other projects"],
  education: ["education", "academic background", "qualifications", "academic qualifications", "education and training"],
  certifications: ["certifications", "certificates", "licenses", "courses", "certifications and job simulations", "certifications & courses", "training", "certifications and courses"],
  achievements: ["achievements", "awards", "honors", "accomplishments", "awards and achievements", "honours"]
};

export const ROLES = [
  { id: "ai-ml-engineer", title: "AI / ML Engineer", must: ["python", "machine learning", "pytorch", "deep learning", "llm", "rag", "docker"], nice: ["tensorflow", "mlops", "langchain", "langgraph", "vector database", "onnx", "fastapi", "agentic ai", "transformers", "computer vision", "nlp", "kubernetes"], blurb: "build train and deploy machine learning and LLM systems, retrieval augmented generation, agents, model serving" },
  { id: "data-scientist", title: "Data Scientist", must: ["python", "machine learning", "sql", "pandas", "data analysis", "scikit-learn"], nice: ["statistics", "numpy", "tableau", "power bi", "deep learning", "nlp", "spark", "data visualization"], blurb: "analyze data build predictive models statistical experiments dashboards insights" },
  { id: "data-analyst", title: "Data Analyst", must: ["sql", "excel", "data analysis", "data visualization", "power bi"], nice: ["python", "tableau", "pandas", "etl", "statistics", "dashboard"], blurb: "clean analyze visualize data dashboards reports business insights kpi" },
  { id: "data-engineer", title: "Data Engineer", must: ["python", "sql", "etl", "airflow", "kafka", "spark"], nice: ["dbt", "delta lake", "snowflake", "aws", "docker", "postgresql", "data pipelines"], blurb: "build batch and streaming data pipelines warehouses orchestration data quality" },
  { id: "backend-engineer", title: "Backend Engineer", must: ["python", "rest api", "sql", "docker", "git", "microservices"], nice: ["fastapi", "django", "postgresql", "redis", "kafka", "kubernetes", "ci/cd", "aws", "system design"], blurb: "design develop scalable apis services databases caching message queues" },
  { id: "frontend-engineer", title: "Frontend Engineer", must: ["javascript", "react", "html", "css", "typescript", "git"], nice: ["next.js", "tailwind css", "redux", "rest api", "unit testing", "accessibility", "graphql"], blurb: "build responsive accessible user interfaces components performance state management" },
  { id: "fullstack-engineer", title: "Full-Stack Engineer", must: ["javascript", "react", "node.js", "sql", "rest api", "git"], nice: ["typescript", "next.js", "postgresql", "mongodb", "docker", "aws", "ci/cd", "fastapi"], blurb: "build end to end web applications frontend backend databases deployment" },
  { id: "devops-sre", title: "DevOps / SRE Engineer", must: ["docker", "kubernetes", "ci/cd", "linux", "terraform", "aws"], nice: ["github actions", "prometheus", "grafana", "ansible", "helm", "monitoring", "bash", "python"], blurb: "automate infrastructure deployment pipelines reliability monitoring incident response" },
  { id: "cloud-engineer", title: "Cloud Engineer", must: ["aws", "linux", "docker", "terraform", "networking"], nice: ["azure", "gcp", "kubernetes", "serverless", "iam", "ci/cd", "python"], blurb: "design secure scalable cloud infrastructure services cost optimization" },
  { id: "security-analyst", title: "Cybersecurity Analyst", must: ["cybersecurity", "siem", "incident response", "mitre att&ck", "linux", "networking"], nice: ["owasp", "penetration testing", "python", "zero trust", "iam", "encryption", "threat detection", "forensics"], blurb: "monitor detect investigate threats security operations vulnerability management" },
  { id: "security-engineer", title: "Security Engineer", must: ["cybersecurity", "python", "zero trust", "encryption", "pki", "docker"], nice: ["ebpf", "owasp", "kubernetes", "iam", "post-quantum cryptography", "ci/cd", "mitre att&ck", "threat modeling"], blurb: "build secure systems threat modeling cryptography identity zero trust automation" },
  { id: "robotics-engineer", title: "Robotics Engineer", must: ["ros 2", "python", "c++", "linux", "kalman filter"], nice: ["gazebo", "computer vision", "embedded systems", "pytorch", "docker", "sensor fusion", "slam"], blurb: "develop autonomous robot software navigation perception sensor fusion simulation" },
  { id: "software-engineer", title: "Software Engineer", must: ["data structures", "git", "oop", "sql", "unit testing"], nice: ["python", "java", "system design", "rest api", "docker", "agile", "ci/cd", "javascript"], blurb: "design develop test and maintain software with strong fundamentals" },
  { id: "qa-automation", title: "QA Automation Engineer", must: ["selenium", "unit testing", "python", "ci/cd", "postman"], nice: ["cypress", "jira", "agile", "rest api", "java", "git", "test automation"], blurb: "automate testing frameworks regression api testing quality assurance" },
  { id: "mobile-developer", title: "Mobile Developer", must: ["android", "kotlin", "rest api", "git"], nice: ["ios", "swift", "flutter", "react native", "unit testing", "firebase"], blurb: "build native and cross platform mobile applications" }
];

export const GUIDELINES = [
  { id: "g-columns", title: "Use a single column", text: "Applicant tracking systems read left to right, top to bottom. Two column layouts, sidebars, text boxes and tables scramble reading order and drop content. Use one column." },
  { id: "g-headings", title: "Standard section headings", text: "Use conventional headings such as Summary, Skills, Experience, Projects, Education, Certifications. Creative headings are not recognised by parsers." },
  { id: "g-keywords", title: "Mirror job description keywords", text: "Match the exact terms from the job description for skills and tools, spell out acronyms once, and include both forms such as Kubernetes (K8s). Only include skills you genuinely have." },
  { id: "g-metrics", title: "Quantify impact", text: "Strong bullets state action, scope and measurable result: users served, latency reduced, cost saved, accuracy achieved, time saved. Use numbers wherever they are true." },
  { id: "g-verbs", title: "Start bullets with action verbs", text: "Begin every bullet with a strong past tense verb such as Built, Designed, Reduced, Automated, Led. Avoid responsible for, worked on, helped with." },
  { id: "g-length", title: "Keep it to one or two pages", text: "Freshers should use one page. Experienced candidates up to two pages. Aim for 350 to 700 words of focused content." },
  { id: "g-format", title: "Plain fonts and file formats", text: "Use standard fonts, real text not images, and submit PDF generated from text or DOCX. Avoid headers and footers for contact details, icons, photos, rating bars and graphics." },
  { id: "g-dates", title: "Consistent dates", text: "Use one date format throughout such as Jan 2026 to Mar 2026. Include month and year for roles and projects." },
  { id: "g-contact", title: "Contact details in the body", text: "Put name, email, phone, LinkedIn and GitHub at the top of the page body as plain text, not inside a header or image." },
  { id: "g-pii", title: "Omit personal data", text: "Do not include photo, date of birth, marital status, religion or national ID. They add bias risk and parsing noise." },
  { id: "g-skills", title: "Group skills", text: "List skills in a dedicated section grouped by category such as Languages, Frameworks, Cloud, Tools. Put the most relevant skills first." }
];
