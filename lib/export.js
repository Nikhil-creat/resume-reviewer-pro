// Client-side exporters: ATS-safe PDF (jsPDF, real text), DOCX (minimal OOXML via JSZip), TXT and JSON.
import { resumeToText } from "./resume.js";

const esc = (s) => String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const ACCENT = "C2410C";

function blocks(r) {
  // Flat list of typed blocks shared by PDF and DOCX so both stay identical.
  const out = []; const c = r.contact || {};
  out.push({ t: "name", text: (r.name || "").toUpperCase() });
  const contact = [c.phone, c.email, c.linkedin, c.github, c.portfolio].filter(Boolean).join(" | ");
  if (contact) out.push({ t: "contact", text: contact });
  const sec = (title, fn) => { const items = fn(); if (items.length) { out.push({ t: "h", text: title }); out.push(...items); } };
  sec("SUMMARY", () => (r.summary ? [{ t: "p", text: r.summary }] : []));
  sec("SKILLS", () => (r.skills || []).map((g) => ({ t: "skill", label: g.group, text: g.items.join(", ") })));
  const entries = (list, keys) => list.flatMap((e) => [{ t: "entry", text: keys.map((k) => e[k]).filter(Boolean).join(" | ") }, ...(e.bullets || []).map((b) => ({ t: "b", text: b }))]);
  sec("EXPERIENCE", () => entries(r.experience || [], ["role", "company", "dates", "location"]));
  sec("PROJECTS", () => entries(r.projects || [], ["name", "stack", "link"]));
  sec("EDUCATION", () => (r.education || []).flatMap((e) => [{ t: "entry", text: [e.degree, e.school, e.dates].filter(Boolean).join(" | ") }, ...(e.bullets || []).map((b) => ({ t: "b", text: b }))]));
  sec("CERTIFICATIONS", () => (r.certifications || []).map((x) => ({ t: "b", text: x })));
  sec("ACHIEVEMENTS", () => (r.achievements || []).map((x) => ({ t: "b", text: x })));
  return out;
}
export { blocks as resumeBlocks };

export function buildPdf(r, JsPDF) {
  const doc = new JsPDF({ unit: "mm", format: "a4", compress: true });
  doc.setProperties({ title: `${r.name || "Resume"} - Resume`, author: r.name || "", subject: "ATS-friendly resume", keywords: (r.skills || []).flatMap((g) => g.items).join(", ") });
  const W = 210, H = 297, M = 14, TW = W - 2 * M; let y = M + 4;
  const need = (h) => { if (y + h > H - M) { doc.addPage(); y = M + 2; } };
  const wrap = (txt, width, size, style) => { doc.setFont("helvetica", style); doc.setFontSize(size); return doc.splitTextToSize(txt, width); };
  for (const b of blocks(r)) {
    if (b.t === "name") { doc.setFont("helvetica", "bold"); doc.setFontSize(18); need(9); doc.text(b.text, W / 2, y, { align: "center" }); y += 7; }
    else if (b.t === "contact") { const ls = wrap(b.text, TW, 8.8, "normal"); doc.setTextColor(70); ls.forEach((l) => { need(4.5); doc.text(l, W / 2, y, { align: "center" }); y += 4.3; }); doc.setTextColor(0); y += 1.5; }
    else if (b.t === "h") { need(9); y += 2.5; doc.setFont("helvetica", "bold"); doc.setFontSize(10.5); doc.setTextColor(194, 65, 12); doc.text(b.text, M, y); doc.setTextColor(0); doc.setDrawColor(194, 65, 12); doc.setLineWidth(0.3); doc.line(M, y + 1.2, W - M, y + 1.2); y += 5.2; }
    else if (b.t === "p") { wrap(b.text, TW, 9.6, "normal").forEach((l) => { need(4.6); doc.text(l, M, y); y += 4.5; }); }
    else if (b.t === "skill") { const label = b.label + ": "; doc.setFont("helvetica", "bold"); doc.setFontSize(9.6); const lw = doc.getTextWidth(label); const ls = wrap(b.text, TW - lw, 9.6, "normal"); need(4.6); doc.setFont("helvetica", "bold"); doc.text(label, M, y); doc.setFont("helvetica", "normal"); ls.forEach((l, i) => { if (i) need(4.6); doc.text(l, M + lw, y); y += 4.5; }); }
    else if (b.t === "entry") { y += 1; wrap(b.text, TW, 9.8, "bold").forEach((l) => { need(4.8); doc.setFont("helvetica", "bold"); doc.setFontSize(9.8); doc.text(l, M, y); y += 4.6; }); }
    else if (b.t === "b") { const ls = wrap(b.text, TW - 5, 9.4, "normal"); ls.forEach((l, i) => { need(4.5); if (!i) doc.text("\u2022", M + 1.2, y); doc.text(l, M + 5, y); y += 4.4; }); }
  }
  return doc;
}

// ---------- DOCX (OOXML) ----------
const run = (text, { bold, size, color } = {}) => `<w:r><w:rPr>${bold ? "<w:b/>" : ""}${color ? `<w:color w:val="${color}"/>` : ""}${size ? `<w:sz w:val="${size}"/><w:szCs w:val="${size}"/>` : ""}</w:rPr><w:t xml:space="preserve">${esc(text)}</w:t></w:r>`;
const para = (runs, { align, before, after, heading, border, left, hanging } = {}) =>
  `<w:p><w:pPr>${heading ? '<w:pStyle w:val="Heading1"/>' : ""}${border ? `<w:pBdr><w:bottom w:val="single" w:sz="6" w:space="1" w:color="${ACCENT}"/></w:pBdr>` : ""}<w:spacing w:before="${before || 0}" w:after="${after ?? 40}"/>${left ? `<w:ind w:left="${left}" w:hanging="${hanging || 0}"/>` : ""}${align ? `<w:jc w:val="${align}"/>` : ""}</w:pPr>${runs}</w:p>`;

export function docxParts(r) {
  const body = [];
  for (const b of blocks(r)) {
    if (b.t === "name") body.push(para(run(b.text, { bold: true, size: 36 }), { align: "center", after: 20 }));
    else if (b.t === "contact") body.push(para(run(b.text, { size: 18, color: "444444" }), { align: "center", after: 80 }));
    else if (b.t === "h") body.push(para(run(b.text, { bold: true, size: 21, color: ACCENT }), { heading: true, border: true, before: 140, after: 60 }));
    else if (b.t === "p") body.push(para(run(b.text, { size: 20 })));
    else if (b.t === "skill") body.push(para(run(b.label + ": ", { bold: true, size: 20 }) + run(b.text, { size: 20 })));
    else if (b.t === "entry") body.push(para(run(b.text, { bold: true, size: 20 }), { before: 60 }));
    else if (b.t === "b") body.push(para(run("\u2022\t", { size: 20 }) + run(b.text, { size: 19 }), { left: 300, hanging: 220 }));
  }
  const ns = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"';
  const sect = '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="567" w:right="680" w:bottom="567" w:left="680" w:header="400" w:footer="400" w:gutter="0"/></w:sectPr>';
  return {
    "[Content_Types].xml": '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>',
    "_rels/.rels": '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>',
    "word/_rels/document.xml.rels": '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>',
    "word/styles.xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles ${ns}><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/><w:sz w:val="20"/></w:rPr></w:rPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style><w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:pPr><w:keepNext/><w:outlineLvl w:val="0"/></w:pPr><w:rPr><w:b/><w:sz w:val="21"/></w:rPr></w:style></w:styles>`,
    "docProps/core.xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>${esc((r.name || "Resume") + " - Resume")}</dc:title><dc:creator>${esc(r.name || "")}</dc:creator></cp:coreProperties>`,
    "word/document.xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ${ns}><w:body>${body.join("")}${sect}</w:body></w:document>`
  };
}

export async function buildDocx(r, JSZip) {
  const zip = new JSZip();
  Object.entries(docxParts(r)).forEach(([p, c]) => zip.file(p, c));
  return zip.generateAsync({ type: "blob", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
}

export const toTxt = (r) => new Blob([resumeToText(r)], { type: "text/plain" });
export const toJson = (r) => new Blob([JSON.stringify(r, null, 2)], { type: "application/json" });
export function download(blob, filename) {
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = filename; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}
