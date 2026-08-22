'use client'

// One line, when there is something to say.
//
// The whole design constraint is what this ISN'T: no day count, no "you
// haven't been here in 9 days", no total, no badge, no streak. Those all turn
// noticing your own life into a scoreboard, which is the thing this product
// refuses to do. It reports what happened while you were gone the way you'd
// notice it walking back into a room, and then it stops talking.
//
// Nothing renders on a first-ever visit, or on a quiet week.
export default function VillageArrival({ caption }: { caption: string | null }) {
  if (!caption) return null
  // Real opacity on a static outer span, fade animation on the inner one —
  // same fix as Sky.tsx's skyWash bug. .village-fade's keyframes animate to
  // opacity:1, which wins the cascade over an inline opacity on the SAME
  // element once the 400ms animation finishes (CSS animations sit above
  // normal author declarations, inline style included, unless !important).
  // The visible effect here was small (0.85 vs 1, a caption barely more
  // opaque than intended) rather than the sky's fully-opaque wash, but it's
  // the identical bug and worth fixing the same way for consistency.
  return (
    <div style={{ opacity: 0.85, marginTop: '0.6rem' }}>
      <div className="village-fade" style={{
        fontSize: '0.72rem', color: 'var(--muted)', lineHeight: 1.5,
      }}>
        {caption}
      </div>
    </div>
  )
}
