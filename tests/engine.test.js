import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { parseResume } from "../lib/parser.js";
import { scoreText } from "../lib/ats.js";
import { matchRoles, buildKeywords, search, findSkills } from "../lib/rag.js";
import { toStructured, resumeToText, ruleBasedRewrite } from "../lib/resume.js";
import { findFabrications, sanitize } from "../lib/guard.js";
import { runAgent, extractJson, IDEAL_LAYOUT } from "../lib/agent.js";
import { hasTerm, embed, cosine } from "../lib/text.js";

const good = fs.readFileSync(new URL("./fixtures/good.txt", import.meta.url), "utf8");
const bad = fs.readFileSync(new URL("./fixtures/bad.txt", import.meta.url), "utf8");

test("hasTerm handles symbols and boundaries", () => {
  assert.ok(hasTerm("Built with C++ and Node.js", "c++"));
  assert.ok(hasTerm("CI/CD pipelines", "ci/cd"));
  assert.ok(!hasTerm("javascripting", "javascript"));
  assert.ok(!hasTerm("gopher", "go"));
});

test("parser finds contact, sections, name and bullets", () => {
  const p = parseResume(good);
  assert.equal(p.name, "NIKHIL CHARY SRIRAMOJU");
  assert.ok(p.contact.email.includes("@") && p.contact.phone && p.contact.linkedin && p.contact.github);
  assert.deepEqual(p.order.slice(0, 3), ["summary", "skills", "projects"]);
  assert.equal(p.bullets.length, 5);
});

test("score is deterministic and ranks good above bad", () => {
  const a = scoreText(good), b = scoreText(good), c = scoreText(bad);
  assert.equal(a.score, b.score);
  assert.ok(a.score > c.score + 15, `${a.score} vs ${c.score}`);
  assert.ok(a.score <= 100 && c.score >= 0);
});

test("category maxima sum to 100", () => {
  assert.equal(scoreText(good).categories.reduce((s, c) => s + c.max, 0), 100);
});

test("metrics and layout affect the score", () => {
  const withNums = good.replace("Built a platform", "Built a platform serving 500 users").replace("Designed four", "Designed 4").replace("Implemented Raft-inspired", "Implemented 5-node Raft-inspired");
  assert.ok(scoreText(withNums).categories.find((c) => c.id === "impact").score > scoreText(good).categories.find((c) => c.id === "impact").score);
  const two = scoreText(good, { layout: { columns: 2, hasTables: true, hasGraphics: false } });
  const one = scoreText(good, { layout: IDEAL_LAYOUT });
  assert.ok(one.score - two.score >= 6);
});

test("RAG ranks the right role and keywords include JD terms", () => {
  const roles = matchRoles("Python PyTorch LangGraph RAG LLM Docker agents", 3);
  assert.equal(roles[0].id, "ai-ml-engineer");
  const kws = buildKeywords({ jd: "We need Kubernetes, Terraform and AWS experience. Kubernetes Kubernetes terraform aws aws", roleId: "devops-sre" });
  assert.ok(kws.find((k) => k.term === "kubernetes").weight === 2);
  assert.ok(search("two column table layout", { kind: "guideline", k: 1 })[0].id === "g-columns");
  assert.ok(findSkills("k8s and Postgres").map((s) => s.name).includes("kubernetes"));
  assert.ok(cosine(embed("docker kubernetes"), embed("docker kubernetes")) > 0.99);
});

test("structured round trip is lossless for canonical text", () => {
  const s = toStructured(good); const s2 = toStructured(resumeToText(s));
  assert.deepEqual(s, s2);
  assert.equal(s.projects.length, 2);
  assert.equal(s.projects[0].link, "github.com/Nikhil-creat/securenav-nexus");
});

test("rule-based rewrite removes PII and pronouns, merges only confirmed skills", () => {
  const r = ruleBasedRewrite(toStructured(bad), { confirmedSkills: ["Docker"] });
  const t = resumeToText(r.resume);
  assert.ok(!/date of birth|marital/i.test(t));
  assert.ok(!/^- I did/im.test(t));
  assert.ok(/Docker/.test(t));
  const none = ruleBasedRewrite(toStructured(bad));
  assert.ok(!/Docker/.test(resumeToText(none.resume)));
});

test("guard flags invented numbers, skills and links; sanitize reverts them", () => {
  const cand = resumeToText(toStructured(good)) + "\n- Reduced latency by 45% using AWS and Terraform https://evil.example.com/x";
  const f = findFabrications(good, cand);
  assert.ok(f.numbers.includes("45") && f.skills.includes("aws") && f.skills.includes("terraform"));
  const orig = toStructured(good); const bady = JSON.parse(JSON.stringify(orig));
  bady.projects[0].bullets[0] = "Cut latency by 73% across 9 regions";
  bady.skills[0].items.push("Terraform");
  const s = sanitize(bady, orig, good);
  assert.equal(s.resume.projects[0].bullets[0], orig.projects[0].bullets[0]);
  assert.ok(!s.resume.skills.flatMap((g) => g.items).includes("Terraform"));
  assert.ok(findFabrications(good, resumeToText(s.resume)).count === 0);
});

test("allowed user facts are not fabrications", () => {
  assert.equal(findFabrications("Built an API.", "Built an API serving 500 users.", "serving 500 users").count, 0);
  assert.equal(findFabrications("Built an API.", "Built an API serving 500 users.").count, 1);
});

test("extractJson tolerates fences and chatter", () => {
  assert.deepEqual(extractJson('```json\n{"a":1}\n```'), { a: 1 });
  assert.deepEqual(extractJson('Sure! {"a": {"b": 2}} hope that helps'), { a: { b: 2 } });
  assert.equal(extractJson("nope"), null);
});

test("agent without LLM: improves, never fabricates, reports needed input", async () => {
  const steps = [];
  const out = await runAgent({ text: bad, roleId: "software-engineer", onStep: (s) => steps.push(s.id) });
  assert.ok(out.after.score > out.before.score);
  assert.equal(out.usedLLM, false);
  assert.ok(steps.includes("parse") && steps.includes("done"));
  assert.equal(findFabrications(bad, out.text).count, 0);
});

test("agent with a hostile mock LLM: guard strips fabrications, score never drops", async () => {
  let calls = 0;
  const hostile = async () => {
    calls++;
    const r = toStructured(good);
    r.projects[0].bullets[0] = "Reduced detection latency by 62% for 1,200 robots using Kubernetes and AWS";
    r.skills.push({ group: "Cloud", items: ["AWS", "Terraform"] });
    return JSON.stringify(r);
  };
  const out = await runAgent({ text: good, roleId: "ai-ml-engineer", llm: hostile, maxIter: 2 });
  assert.ok(calls >= 1);
  const f = findFabrications(good, out.text);
  assert.equal(f.count, 0, JSON.stringify(f));
  assert.ok(out.after.score >= out.history[0].score - 3);
  assert.ok(out.history.some((h) => h.fabrications > 0));
});

test("agent with a good mock LLM and user facts can lift the score", async () => {
  const facts = { "Designed four cooperating LangGraph agents with human-in-the-loop approval and Corrective Agentic RAG on Qdrant hybrid search.": "serving 3 concurrent teams" };
  const llm = async () => JSON.stringify((() => { const r = toStructured(good); r.projects[1].bullets[0] += ", serving 3 concurrent teams"; r.projects[0].bullets[0] = r.projects[0].bullets[0].replace(/\.$/, ""); return r; })());
  const out = await runAgent({ text: good, roleId: "ai-ml-engineer", answers: facts, llm, maxIter: 1 });
  assert.equal(findFabrications(good, out.text, Object.values(facts).join(" ")).count, 0);
  assert.ok(out.after.score >= out.before.score);
});
