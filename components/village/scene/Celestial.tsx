'use client'

import type { Celestial as CelestialData } from '@/lib/village/sky'

/**
 * The sun, or the moon with tonight's actual phase.
 *
 * Round 4 (2026-08-27) — both were previously a flat circle at low opacity
 * (var(--amber)/var(--text) at ~0.3), which read as a dull grey or amber
 * dot rather than an actual sun or moon ("make the moon and sun pretty").
 * Real radial gradients + a warmer/cooler fixed palette (same reasoning
 * WALL/ROOF/TRIM in shapes.tsx already established — a sun's warmth and a
 * moon's pale glow aren't themeable any more than a cat's coat is) plus a
 * soft multi-layer glow instead of one faint halo ring.
 *
 * The shadow is still a second circle filled with the sky colour rather
 * than a mask — masks don't inherit `color-mix` custom properties reliably
 * across themes, and a crescent is two circles anyway.
 */
export default function Celestial({ c }: { c: CelestialData }) {
  const r = c.body === 'sun' ? 15 : 12

  if (c.body === 'sun') {
    return (
      <g className="village-fade" pointerEvents="none">
        <defs>
          <radialGradient id="vsun" cx="35%" cy="30%" r="65%">
            <stop offset="0%" stopColor="#FFF6D8" />
            <stop offset="45%" stopColor="#FFD874" />
            <stop offset="100%" stopColor="#F0A83C" />
          </radialGradient>
        </defs>
        {/* Layered glow, soft to sharp, instead of one flat halo ring. The
            outer two rings get a real Gaussian blur (round 8 atmosphere
            pass, 2026-08-27, url(#vglow) — defined in VillageScene.tsx,
            reachable here because this renders into that same <svg>) —
            concentric flat-opacity circles have a visible banded edge up
            close; an actual blur is what soft light looks like. */}
        <circle cx={c.x} cy={c.y} r={r + 20} fill="#FFD874" opacity={0.14} filter="url(#vglow)" />
        <circle cx={c.x} cy={c.y} r={r + 11} fill="#FFD874" opacity={0.24} filter="url(#vglow)" />
        <circle cx={c.x} cy={c.y} r={r + 3} fill="#FFE9AE" opacity={0.35} />
        <circle cx={c.x} cy={c.y} r={r} fill="url(#vsun)" />
        {/* A small bright highlight — the one thing that reads as "lit
            sphere" rather than "flat disc" at this size. */}
        <circle cx={c.x - r * 0.3} cy={c.y - r * 0.3} r={r * 0.28} fill="#FFFCF0" opacity={0.55} />
      </g>
    )
  }

  // Shadow offset: none at new moon, fully clear of the disc at full. Sits on
  // the left while waxing and the right while waning.
  const offset = r * (1 - Math.cos(2 * Math.PI * c.phase))
  const dir = c.phase < 0.5 ? -1 : 1

  return (
    <g className="village-fade" pointerEvents="none">
      <defs>
        <radialGradient id="vmoon" cx="38%" cy="32%" r="70%">
          <stop offset="0%" stopColor="#FDFBF4" />
          <stop offset="55%" stopColor="#E9E4D6" />
          <stop offset="100%" stopColor="#C7C6DA" />
        </radialGradient>
      </defs>
      <circle cx={c.x} cy={c.y} r={r + 15} fill="#D8DCF2" opacity={0.22} filter="url(#vglow)" />
      <circle cx={c.x} cy={c.y} r={r + 8} fill="#E9E9F6" opacity={0.32} filter="url(#vglow)" />
      <circle cx={c.x} cy={c.y} r={r} fill="url(#vmoon)" />
      {/* A couple of faint, fixed "craters" — pure texture, not a real
          lunar map — so the disc doesn't read as a flat painted circle. */}
      <circle cx={c.x - r * 0.28} cy={c.y + r * 0.15} r={r * 0.18} fill="#C9C6D8" opacity={0.35} />
      <circle cx={c.x + r * 0.15} cy={c.y - r * 0.35} r={r * 0.12} fill="#C9C6D8" opacity={0.3} />
      {/* Bites the disc back down to the current phase. Drawn last, so it
          correctly covers the gradient/craters/highlight at every phase
          including new moon (no highlight left floating on a "dark" moon). */}
      <circle cx={c.x + offset * dir} cy={c.y} r={r} fill="url(#vsky)" />
    </g>
  )
}
