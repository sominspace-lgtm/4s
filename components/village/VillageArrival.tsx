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
  return (
    <div className="village-fade" style={{
      fontSize: '0.72rem', color: 'var(--muted)', opacity: 0.85,
      marginTop: '0.6rem', lineHeight: 1.5,
    }}>
      {caption}
    </div>
  )
}
