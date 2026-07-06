// The 4S mark — a rounded tile with a soft aurora, a quiet orbiting dot
// (the "alive but quiet" companion), and the 4S monogram. Theme-reactive:
// uses CSS variables so it matches whatever theme is active. For fixed-palette
// exports (PWA / Alexa icons) the same shape is rendered with hard colors.
export default function Logo({ size = 40, glow = true }: { size?: number; glow?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="4S" role="img">
      <defs>
        <radialGradient id="lg-bg" cx="50%" cy="32%" r="80%">
          <stop offset="0%" stopColor="var(--surface2)" />
          <stop offset="60%" stopColor="var(--surface)" />
          <stop offset="100%" stopColor="var(--bg)" />
        </radialGradient>
        <linearGradient id="lg-fg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--blush)" />
          <stop offset="100%" stopColor="var(--gold)" />
        </linearGradient>
      </defs>

      <rect x="1" y="1" width="98" height="98" rx="26" fill="url(#lg-bg)" />
      {glow && (
        <ellipse cx="50" cy="30" rx="46" ry="34" fill="var(--glow)" opacity="0.5" />
      )}
      <rect x="1.5" y="1.5" width="97" height="97" rx="25.5" fill="none" stroke="var(--gold)" strokeOpacity="0.18" strokeWidth="1" />

      {/* quiet orbit + companion dot */}
      <circle cx="50" cy="50" r="40" fill="none" stroke="var(--gold)" strokeOpacity="0.14" strokeWidth="1" strokeDasharray="3 6" />
      <circle cx="82" cy="34" r="3" fill="var(--gold)" opacity="0.9" />

      {/* monogram */}
      <text x="50" y="52" textAnchor="middle" dominantBaseline="central"
        fontFamily="var(--font-display), Georgia, serif" fontWeight="500" fontSize="52"
        letterSpacing="-2" fill="url(#lg-fg)">4S</text>
    </svg>
  )
}

// Logo + wordmark lockup for headers and the login screen.
export function Wordmark({ size = 40, subtitle = 'personal operating system' }: { size?: number; subtitle?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
      <Logo size={size} />
      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.05 }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: `${size * 0.55}px`, fontWeight: 400, color: 'var(--text)', letterSpacing: '0.04em' }}>4S</span>
        {subtitle && (
          <span style={{ fontSize: `${Math.max(9, size * 0.18)}px`, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--muted)', opacity: 0.7 }}>{subtitle}</span>
        )}
      </div>
    </div>
  )
}
