// The 4S mark — "4S" is the hero, wrapped in a ring of SOS Morse code
// (··· ––– ···) orbiting it like a quiet distress signal. Theme-reactive:
// uses var(--gold) for the monogram and the ring so it stays monochrome in
// whatever theme is active. The fixed-palette PWA / Alexa exports (in
// public/icons + alexa-icons) render the same shape in near-white on charcoal.

// Nine Morse glyphs evenly spaced around a circle (r=40, center 50,50),
// starting at top and going clockwise: S (··· dots), O (––– dashes), S (··· dots).
const R = 40
const CENTER = 50
const RING = Array.from({ length: 9 }, (_, i) => {
  const angle = -90 + i * 40 // degrees, clockwise from top
  const rad = (angle * Math.PI) / 180
  return {
    isDash: i >= 3 && i <= 5, // middle three = O
    cx: CENTER + R * Math.cos(rad),
    cy: CENTER + R * Math.sin(rad),
    rot: angle + 90, // tangent to the ring
  }
})

export default function Logo({ size = 40, glow = true }: { size?: number; glow?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="4S" role="img">
      <defs>
        <radialGradient id="lg-bg" cx="50%" cy="30%" r="85%">
          <stop offset="0%" stopColor="var(--surface2)" />
          <stop offset="58%" stopColor="var(--surface)" />
          <stop offset="100%" stopColor="var(--bg)" />
        </radialGradient>
      </defs>

      <rect x="1" y="1" width="98" height="98" rx="26" fill="url(#lg-bg)" />
      {glow && <ellipse cx="50" cy="30" rx="46" ry="34" fill="var(--glow)" opacity="0.5" />}
      <rect x="1.5" y="1.5" width="97" height="97" rx="25.5" fill="none" stroke="var(--gold)" strokeOpacity="0.16" strokeWidth="1" />

      {/* SOS Morse ring */}
      <g fill="var(--gold)" opacity="0.85">
        {RING.map((p, i) =>
          p.isDash ? (
            <rect
              key={i}
              x={p.cx - 4.5} y={p.cy - 1.6} width="9" height="3.2" rx="1.6"
              transform={`rotate(${p.rot} ${p.cx} ${p.cy})`}
            />
          ) : (
            <circle key={i} cx={p.cx} cy={p.cy} r="3" />
          )
        )}
      </g>

      {/* 4S hero */}
      <text x="50" y="52" textAnchor="middle" dominantBaseline="central"
        fontFamily="var(--font-display), Georgia, serif" fontWeight="600" fontSize="42"
        letterSpacing="-2" fill="var(--gold)">4S</text>
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
