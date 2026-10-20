import test from "node:test";
import assert from "node:assert/strict";
import { analyzeGray, mergeLayout } from "../lib/layout.js";
import { docxParts, buildPdf, resumeBlocks } from "../lib/export.js";
import { toStructured } from "../lib/resume.js";
import { itemsToLines } from "../lib/extract.js";
import fs from "node:fs";

const W = 600, H = 780;
let seed = 7; const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
const page = () => new Uint8ClampedArray(W * H).fill(255);
function rect(g, x0, y0, x1, y1, v = 40) { for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) g[y * W + x] = v; }
// Glyph-like pattern (about 1/3 ink coverage) so text is never a solid block, like real rendered text.
function glyphs(g, x0, y0, x1, y1) { for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) if (x % 3 !== 0 && y % 2 === 0) g[y * W + x] = 40; }
function textBlock(g, x0, x1, y0, y1) { for (let y = y0; y < y1; y += 15) { let x = x0; while (x < x1 - 20) { const w = 14 + Math.floor(rnd() * 40); glyphs(g, x, y, Math.min(x + w, x1), y + 8); x += w + 4 + Math.floor(rnd() * 5); } } }

test("single column page is analysed as 1 column, no tables, no graphics", () => {
  const g = page(); textBlock(g, 50, 550, 50, 730); rect(g, 50, 100, 550, 101); rect(g, 50, 300, 550, 301);
  const L = analyzeGray(g, W, H);
  assert.equal(L.columns, 1); assert.equal(L.hasTables, false); assert.equal(L.hasGraphics, false); assert.equal(L.marginsOk, true);
});

test("two-column page is detected", () => {
  const g = page(); textBlock(g, 40, 285, 50, 730); textBlock(g, 320, 560, 50, 730);
  assert.equal(analyzeGray(g, W, H).columns, 2);
});

test("sidebar layout (30/70) is detected as 2 columns", () => {
  const g = page(); textBlock(g, 30, 190, 50, 730); textBlock(g, 230, 570, 50, 730);
  assert.equal(analyzeGray(g, W, H).columns, 2);
});

test("table grid is detected, lone heading rules are not", () => {
  const g = page(); textBlock(g, 50, 550, 50, 200);
  for (const y of [230, 260, 290, 320]) rect(g, 50, y, 550, y + 1);
  for (const x of [50, 250, 450, 549]) rect(g, x, 230, x + 1, 321);
  assert.equal(analyzeGray(g, W, H).hasTables, true);
});

test("photo / skill bars count as graphics", () => {
  const g = page(); textBlock(g, 200, 550, 50, 400); rect(g, 40, 40, 160, 170, 90);
  const L = analyzeGray(g, W, H);
  assert.equal(L.hasGraphics, true); assert.equal(L.hasTables, false);
});

test("tight margins and merge with CNN output", () => {
  const g = page(); textBlock(g, 2, 598, 2, 778);
  assert.equal(analyzeGray(g, W, H).marginsOk, false);
  const m = mergeLayout({ columns: 1, hasTables: false, hasGraphics: false }, { label: "two_column", confidence: 0.9, probs: { two_column: 0.9, ats_safe: 0.1 } });
  assert.equal(m.columns, 2); assert.equal(m.source, "heuristic+cnn");
  assert.equal(mergeLayout({ columns: 1 }, { label: "two_column", confidence: 0.4 }).columns, 1);
});

test("pdf.js item grouping rebuilds lines in reading order", () => {
  const it = (s, x, y) => ({ str: s, transform: [1, 0, 0, 1, x, y] });
  const lines = itemsToLines([it("World", 80, 700), it("Hello", 20, 700), it("Next line", 20, 680), it(" ", 5, 5)]);
  assert.deepEqual(lines, ["Hello World", "Next line"]);
});

class MockPdf {
  constructor() { this.texts = []; this.pages = 1; this.ys = []; }
  setProperties() {} setFont() {} setFontSize(s) { this.fs = s; } setTextColor() {} setDrawColor() {} setLineWidth() {} line() {} addPage() { this.pages++; }
  splitTextToSize(t, w) { const per = Math.max(10, Math.floor(w * 2.1)); const out = []; let cur = ""; for (const word of String(t).split(" ")) { if ((cur + " " + word).trim().length > per) { out.push(cur); cur = word; } else cur = (cur + " " + word).trim(); } if (cur) out.push(cur); return out; }
  getTextWidth(t) { return String(t).length * 1.8; }
  text(t, x, y) { this.texts.push(t); this.ys.push(y); }
}

test("PDF builder emits every block as real text within page bounds", () => {
  const r = toStructured(fs.readFileSync(new URL("./fixtures/good.txt", import.meta.url), "utf8"));
  const doc = buildPdf(r, MockPdf);
  const joined = doc.texts.join(" ");
  assert.ok(joined.includes("NIKHIL CHARY SRIRAMOJU") && joined.includes("SKILLS") && joined.includes("BastionMesh"));
  assert.ok(doc.ys.every((y) => y > 0 && y < 297));
  assert.ok(doc.pages >= 1 && doc.pages <= 3);
});

test("DOCX parts are complete and escape XML", () => {
  const r = toStructured(fs.readFileSync(new URL("./fixtures/good.txt", import.meta.url), "utf8"));
  r.summary = 'Built <fast> & "safe" systems';
  const p = docxParts(r);
  for (const k of ["[Content_Types].xml", "_rels/.rels", "word/document.xml", "word/styles.xml", "word/_rels/document.xml.rels", "docProps/core.xml"]) assert.ok(p[k], k);
  assert.ok(p["word/document.xml"].includes("&lt;fast&gt; &amp;"));
  assert.ok(p["word/document.xml"].includes("Heading1"));
  assert.ok(resumeBlocks(r).filter((b) => b.t === "h").length >= 4);
});
