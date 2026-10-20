// Browser-side text extraction (PDF, DOCX, images via OCR, TXT). Heavy libraries load on demand from a CDN.
import { analyzeImageData } from "./layout.js";

const CDN = {
  pdfjs: "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js",
  pdfWorker: "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js",
  mammoth: "https://cdn.jsdelivr.net/npm/mammoth@1.8.0/mammoth.browser.min.js",
  tesseract: "https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js",
  jspdf: "https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js",
  jszip: "https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js"
};
const loaded = {};
export function loadScript(key) {
  if (loaded[key]) return loaded[key];
  loaded[key] = new Promise((res, rej) => {
    const s = document.createElement("script"); s.src = CDN[key]; s.async = true; s.onload = () => res(); s.onerror = () => { delete loaded[key]; rej(new Error("Failed to load " + key)); };
    document.head.appendChild(s);
  });
  return loaded[key];
}

export function itemsToLines(items) {
  const rows = [];
  for (const it of items) {
    if (!it.str || !it.str.trim()) continue;
    const y = Math.round(it.transform[5]);
    let row = rows.find((r) => Math.abs(r.y - y) <= 2);
    if (!row) { row = { y, items: [] }; rows.push(row); }
    row.items.push(it);
  }
  rows.sort((a, b) => b.y - a.y);
  return rows.map((r) => r.items.sort((a, b) => a.transform[4] - b.transform[4]).map((i) => i.str).join(" ").replace(/\s+/g, " ").trim()).filter(Boolean);
}

async function ocr(imageSource, onStatus) {
  await loadScript("tesseract"); onStatus && onStatus("Running OCR (first run downloads the language model)...");
  const { data } = await window.Tesseract.recognize(imageSource, "eng"); return data.text || "";
}

export async function extractFromFile(file, onStatus = () => {}) {
  const name = file.name.toLowerCase();
  if (name.endsWith(".txt") || file.type === "text/plain") return { text: await file.text(), layout: null, pages: null };
  if (name.endsWith(".docx")) {
    await loadScript("mammoth"); onStatus("Reading DOCX...");
    const r = await window.mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
    return { text: r.value, layout: null, pages: null };
  }
  if (/\.(png|jpe?g|webp)$/.test(name) || file.type.startsWith("image/")) {
    const text = await ocr(file, onStatus);
    const bmp = await createImageBitmap(file); const c = document.createElement("canvas"); c.width = bmp.width; c.height = bmp.height;
    const g = c.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height); g.drawImage(bmp, 0, 0);
    return { text, layout: { ...analyzeImageData(g.getImageData(0, 0, c.width, c.height), { textBased: false }) }, pages: 1, image: c.toDataURL("image/png") };
  }
  if (name.endsWith(".pdf")) {
    await loadScript("pdfjs"); const lib = window.pdfjsLib; lib.GlobalWorkerOptions.workerSrc = CDN.pdfWorker;
    onStatus("Reading PDF...");
    const pdf = await lib.getDocument({ data: await file.arrayBuffer() }).promise;
    let lines = [], canvas = null;
    for (let i = 1; i <= Math.min(pdf.numPages, 4); i++) {
      const page = await pdf.getPage(i); const tc = await page.getTextContent(); lines = lines.concat(itemsToLines(tc.items));
      if (i === 1) { const vp = page.getViewport({ scale: 1.3 }); canvas = document.createElement("canvas"); canvas.width = vp.width; canvas.height = vp.height; await page.render({ canvasContext: canvas.getContext("2d"), viewport: vp }).promise; }
    }
    let text = lines.join("\n"); const textBased = text.replace(/\s/g, "").length > 120;
    if (!textBased && canvas) text = await ocr(canvas, onStatus);
    const layout = canvas ? analyzeImageData(canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height), { textBased }) : null;
    return { text, layout, pages: pdf.numPages, image: canvas ? canvas.toDataURL("image/png") : null };
  }
  throw new Error("Unsupported file type. Use PDF, DOCX, PNG, JPG or TXT.");
}
