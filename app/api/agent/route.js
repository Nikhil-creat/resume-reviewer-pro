import { retrieve } from "../../../lib/rag";
import { ask } from "../../../lib/llm";
export const maxDuration = 60;

const hits = new Map(); // best-effort rate limit (per serverless instance)
const limited = ip => { const n = Date.now(), a = (hits.get(ip) || []).filter(t => n - t < 60000); a.push(n); hits.set(ip, a); return a.length > 6; };

export async function POST(req) {
  const trace = [];
  try {
    if (limited(req.headers.get("x-forwarded-for") || "x")) return Response.json({ error: "Too many requests. Wait a minute." }, { status: 429 });
    const b = await req.json();
    const { text = "", file = null, jd = "", role = "auto", task = "analyze" } = b;
    if (!text.trim() && !file) return Response.json({ error: "Add a resume (file or text)." }, { status: 400 });
    if (file && file.data.length > 5_500_000) return Response.json({ error: "File too large. Keep it under 4 MB." }, { status: 413 });
    const J = jd.slice(0, 8000), vision = !!file;
    const rp = [{ text: "RESUME TEXT:\n" + text.slice(0, 12000) }];
    if (file) rp.push({ inlineData: { mimeType: file.type, data: file.data } });

    if (task === "letter") {
      const len = b.length === "Short" ? "150-190 words" : "230-280 words";
      const { data, provider } = await ask([...rp, { text: `JOB DESCRIPTION:\n${J}\nCOMPANY: ${b.company || "unknown"}\nJOB TITLE: ${b.role || role}\nHIRING MANAGER: ${b.manager || "unknown"}` }],
        `You write cover letters. Tone: ${b.tone || "Professional"}. Length: ${len}. Use ONLY facts in the resume; never invent employers, degrees, tools or numbers. Address the hiring manager by name if given, else "Hiring Manager". Three short paragraphs: a hook tied to the company, two proof points matched to the job description, a clear close. No clichés. Return JSON {"subject","letter","tips":[]}.`, { vision });
      return Response.json({ ...data, provider });
    }

    const a1 = await ask(rp, `You are a resume parser and layout inspector. Return JSON: {"name","email","phone","links":[],"summary","skills":[],"experience":[{"title","org","dates","bullets":[]}],"projects":[{"name","stack":[],"bullets":[]}],"education":[{"degree","school","years","score"}],"certifications":[],"layout":{"score":0-100,"columns":1,"uses_tables":false,"has_photo":false,"dense":false,"issues":[]}}. Never invent data.`, { vision });
    const profile = a1.data;
    trace.push({ agent: "Parser + Vision", note: `${a1.provider}: ${profile?.skills?.length || 0} skills, layout ${profile?.layout?.score ?? "n/a"}/100` });
    const ctx = retrieve(`${role} ${J} ${(profile.skills || []).join(" ")}`, 6);
    trace.push({ agent: "RAG Retriever", note: `${ctx.length} guidelines`, sources: ctx.map(c => c.id) });
    const a3 = await ask([{ text: `PROFILE:\n${JSON.stringify(profile)}\n\nJOB DESCRIPTION:\n${J || "(none; target role: " + role + ")"}\n\nGUIDELINES:\n${ctx.map(c => `[${c.id}] ${c.text}`).join("\n")}` }],
      `You are a strict recruiter-grade ATS scorer. Return JSON: {"overall":0-100,"verdict","categories":{"keyword_match":0,"impact_and_metrics":0,"ats_format":0,"structure":0,"role_fit":0,"clarity":0},"matched_keywords":[],"missing_keywords":[{"keyword","why","where_to_add"}],"strengths":[],"fixes":[{"priority","issue","fix"}],"skill_gaps":[{"skill","learn_next"}]}. Be honest; do not inflate.`);
    trace.push({ agent: "ATS Scorer", note: `${a3.provider}: ${a3.data.overall}/100` });
    const a4 = await ask([{ text: `PROFILE:\n${JSON.stringify(profile)}\n\nJD:\n${J}\n\nSCORE:\n${JSON.stringify(a3.data)}` }],
      `You are a resume rewriter and critic. Use ONLY facts in PROFILE; use [add metric] where a number is unknown. Return JSON: {"summary","rewritten_bullets":[{"before","after"}],"ats_resume_markdown","cover_letter","interview_questions":[{"q","tip"}],"critic":{"fabrication_risk":"low|med|high","flags":[]}}.`);
    trace.push({ agent: "Rewriter + Critic", note: `${a4.provider}: fabrication risk ${a4.data?.critic?.fabrication_risk || "n/a"}` });
    return Response.json({ profile, score: a3.data, out: a4.data, trace });
  } catch (e) { return Response.json({ error: e.message, trace }, { status: 500 }); }
}
