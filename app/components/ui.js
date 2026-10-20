"use client";

export function ScoreRing({ value = 0, size = 150, label, sub, color }) {
  const r = size / 2 - 11, c = 2 * Math.PI * r, v = Math.max(0, Math.min(100, value));
  const col = color || (v >= 95 ? "#34d399" : v >= 80 ? "#a3e635" : v >= 60 ? "#fbbf24" : "#fb7185");
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,.09)" strokeWidth="10" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={col} strokeWidth="10" strokeLinecap="round" strokeDasharray={`${(c * v) / 100} ${c}`} transform={`rotate(-90 ${size / 2} ${size / 2})`} style={{ transition: "stroke-dasharray .8s ease" }} />
      </svg>
      <div className="ring-text"><b>{Math.round(v)}</b><small>{label}</small>{sub ? <em>{sub}</em> : null}</div>
    </div>
  );
}

export function Bar({ label, score, max, before }) {
  const pct = (score / max) * 100;
  return (
    <div className="bar">
      <div className="bar-top"><span>{label}</span><b>{score}<small>/{max}</small>{before !== undefined && before !== score ? <i className={score >= before ? "up" : "down"}> {score >= before ? "+" : ""}{(score - before).toFixed(1)}</i> : null}</b></div>
      <div className="bar-track"><div className="bar-fill" style={{ width: `${pct}%`, background: pct >= 90 ? "var(--ok)" : pct >= 60 ? "var(--warn)" : "var(--bad)" }} /></div>
    </div>
  );
}

export function Sparkline({ points = [], width = 260, height = 60 }) {
  if (points.length < 2) return <div className="muted small">Run the analyzer a few times to see your score trend.</div>;
  const min = Math.min(...points, 0), max = Math.max(...points, 100);
  const xy = points.map((p, i) => [(i / (points.length - 1)) * (width - 8) + 4, height - 4 - ((p - min) / (max - min || 1)) * (height - 8)]);
  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Score history">
      <polyline fill="none" stroke="var(--accent)" strokeWidth="2.2" points={xy.map((p) => p.join(",")).join(" ")} />
      {xy.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r="3" fill="var(--accent2)" />)}
    </svg>
  );
}

export function Chip({ children, tone = "", onClick, active }) {
  return <button type="button" className={`chip ${tone} ${active ? "on" : ""}`} onClick={onClick}>{children}</button>;
}
