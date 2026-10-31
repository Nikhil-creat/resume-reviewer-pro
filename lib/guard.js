// Security + limits layer. No LLM involved: everything here is deterministic.

const buckets = new Map();

export function getIP(req) {
  const h = req.headers;
  return (h.get('x-forwarded-for') || '').split(',')[0].trim() || h.get('x-real-ip') || 'local';
}

/** Fixed-window rate limiter. In-memory => per server instance (see README "Limitations"). */
export function rateLimit(key, { limit, windowMs }) {
  const now = Date.now();
  let b = buckets.get(key);
  if (!b || now > b.reset) {
    b = { count: 0, reset: now + windowMs };
    buckets.set(key, b);
  }
  b.count++;
  if (buckets.size > 5000) for (const [k, v] of buckets) if (now > v.reset) buckets.delete(k);
  return {
    ok: b.count <= limit,
    remaining: Math.max(0, limit - b.count),
    retryAfter: Math.max(1, Math.ceil((b.reset - now) / 1000)),
  };
}

export const envInt = (name, def) => {
  const n = parseInt(process.env[name] || '', 10);
  return Number.isFinite(n) && n > 0 ? n : def;
};

export function clamp(n, lo = 0, hi = 100) {
  n = Number(n);
  if (!Number.isFinite(n)) return lo;
  return Math.min(hi, Math.max(lo, Math.round(n)));
}

/** Strip control + zero-width characters, normalise newlines, cap length. */
export function sanitizeText(input, max) {
  let t = String(input ?? '');
  const hidden = /[​-‍⁠﻿]/.test(t);
  t = t
    .replace(/[​-‍⁠﻿]/g, '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim();
  const truncated = t.length > max;
  if (truncated) t = t.slice(0, max);
  return { text: t, truncated, hiddenChars: hidden };
}

// ── Prompt-injection detection ──────────────────────────────────────────────
const INJECTION = [
  { re: /ignore\s+(all\s+|any\s+|the\s+|your\s+)?(previous|prior|above|earlier)\s+(instructions?|prompts?|rules?)/i, sev: 'high', label: 'override-instructions' },
  { re: /disregard\s+.{0,40}(instructions?|rules?|guidelines?)/i, sev: 'high', label: 'disregard-rules' },
  { re: /(reveal|show|print|leak|repeat)\s+.{0,30}(system\s+prompt|hidden\s+prompt|api\s*key|secret|password|env(ironment)?\s+var)/i, sev: 'high', label: 'exfiltrate-secrets' },
  { re: /(^|\s)(you\s+are\s+now|act\s+as\s+(if\s+you\s+are\s+)?(dan|an?\s+unrestricted))/i, sev: 'medium', label: 'persona-hijack' },
  { re: /<\|?\s*(system|im_start|im_end)\s*\|?>|\[\s*(system|inst)\s*\]/i, sev: 'medium', label: 'fake-role-tokens' },
  { re: /(jailbreak|developer\s+mode|do\s+anything\s+now)/i, sev: 'medium', label: 'jailbreak-keyword' },
  { re: /give\s+(this\s+)?(resume|candidate)\s+(a\s+)?(score|rating)\s+of\s+\d+/i, sev: 'medium', label: 'score-manipulation' },
];

export function detectInjection(text) {
  const flags = [];
  for (const p of INJECTION) if (p.re.test(text)) flags.push({ label: p.label, severity: p.sev });
  return flags;
}
export const hasHighSeverity = (flags) => flags.some((f) => f.severity === 'high');

// ── PII tokenisation: the LLM never sees the real email/phone ───────────────
export function redactPII(text) {
  const map = {};
  const kinds = new Set();
  const n = { EMAIL: 0, PHONE: 0 };

  let t = text.replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, (m) => {
    const k = `[[EMAIL_${++n.EMAIL}]]`;
    map[k] = m;
    kinds.add('email');
    return k;
  });

  // Government IDs: removed entirely, never restored (and the user is warned)
  t = t.replace(/\b[A-Z]{5}\d{4}[A-Z]\b/g, () => (kinds.add('national-id (PAN-like)'), '[[ID_REMOVED]]'));
  t = t.replace(/\b\d{4}\s\d{4}\s\d{4}\b/g, () => (kinds.add('national-id (Aadhaar-like)'), '[[ID_REMOVED]]'));

  t = t.replace(/(?<![\w/])\+?\d[\d ().-]{8,16}\d(?![\w/])/g, (m) => {
    const digits = m.replace(/\D/g, '');
    if (digits.length < 10 || digits.length > 13) return m;
    if (/\b(19|20)\d{2}\b.*\b(19|20)\d{2}\b/.test(m)) return m; // date ranges, not phones
    const k = `[[PHONE_${++n.PHONE}]]`;
    map[k] = m;
    kinds.add('phone');
    return k;
  });

  return { text: t, map, kinds: [...kinds] };
}

export function restorePII(text, map) {
  if (!text) return text;
  let out = String(text);
  for (const [k, v] of Object.entries(map || {})) out = out.split(k).join(v);
  return out.replace(/\[\[ID_REMOVED\]\]/g, '');
}

// ── Upload validation (size, type, magic bytes) ─────────────────────────────
const MAGIC = {
  pdf: (b) => b.length > 4 && b.slice(0, 4).toString('latin1') === '%PDF',
  png: (b) => b.length > 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47,
  jpg: (b) => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  docx: (b) => b.length > 4 && b[0] === 0x50 && b[1] === 0x4b,
};

export function detectKind(name = '', type = '') {
  const n = name.toLowerCase();
  if (type === 'application/pdf' || n.endsWith('.pdf')) return 'pdf';
  if (n.endsWith('.docx') || type.includes('officedocument.wordprocessingml')) return 'docx';
  if (type === 'image/png' || n.endsWith('.png')) return 'png';
  if (type === 'image/jpeg' || n.endsWith('.jpg') || n.endsWith('.jpeg')) return 'jpg';
  if (type.startsWith('text/') || n.endsWith('.txt') || n.endsWith('.md')) return 'txt';
  return null;
}

export function validateUpload({ name, type, size, buffer }) {
  const maxMb = envInt('MAX_FILE_MB', 4);
  if (size > maxMb * 1024 * 1024) return { ok: false, error: `File is larger than ${maxMb} MB.` };
  const kind = detectKind(name, type);
  if (!kind) return { ok: false, error: 'Unsupported file type. Use PDF, DOCX, JPG, PNG or paste text.' };
  if (kind !== 'txt' && !MAGIC[kind](buffer)) return { ok: false, error: 'File content does not match its extension.' };
  return { ok: true, kind };
}

export const safeMsg = (e) =>
  String(e?.message || e || 'error')
    .replace(/(key|token|bearer)[=:\s]+[\w-]{8,}/gi, '$1=***')
    .slice(0, 200);
