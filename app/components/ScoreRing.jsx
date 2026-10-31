export default function ScoreRing({ value = 0, grade = '', size = 132 }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const color = value >= 80 ? 'var(--ok)' : value >= 60 ? 'var(--warn)' : 'var(--bad)';
  return (
    <div className="ring" style={{ width: size, height: size }} role="img" aria-label={`ATS score ${value} out of 100, grade ${grade}`}>
      <svg viewBox="0 0 120 120" width={size} height={size}>
        <circle cx="60" cy="60" r={r} fill="none" stroke="var(--line)" strokeWidth="10" />
        <circle
          cx="60" cy="60" r={r} fill="none" stroke={color} strokeWidth="10" strokeLinecap="round"
          strokeDasharray={`${(value / 100) * c} ${c}`} transform="rotate(-90 60 60)"
          style={{ transition: 'stroke-dasharray 1s ease' }}
        />
      </svg>
      <div className="ring-t">
        <b>{value}</b>
        <span>ATS · {grade}</span>
      </div>
    </div>
  );
}
