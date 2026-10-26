'use client'

// Holidays decorate the village by themselves (2026-10-26). Nothing to set
// up: the date picks the holiday, and the cottage dresses for it. Everything
// here is drawn in the cottage's own frame (0,0 is the middle of its
// doorstep, the roof peak sits near y -73), so it moves with Home.

export type Holiday = 'halloween' | 'thanksgiving' | 'christmas' | 'newyear' | 'seollal' | 'valentine' | 'july4'

// Seollal moves with the moon, so its days are listed out.
const SEOLLAL: Record<number, string> = { 2027: '02-06', 2028: '01-26', 2029: '02-13', 2030: '02-03', 2031: '01-23' }

function md(d: Date): string { return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }

/** Which holiday the village is dressed for on this day, if any. */
export function holidayOn(d = new Date()): Holiday | null {
  const m = md(d)
  const y = d.getFullYear()
  const s = SEOLLAL[y]
  if (s) {
    const day = new Date(`${y}-${s}T12:00:00`)
    const diff = Math.round((d.getTime() - day.getTime()) / 86_400_000)
    if (diff >= -3 && diff <= 2) return 'seollal'
  }
  if (m >= '10-15' && m <= '10-31') return 'halloween'
  // Thanksgiving week: the fourth Thursday of November and the days around it.
  if (d.getMonth() === 10) {
    const first = new Date(y, 10, 1).getDay()
    const thursday = 1 + ((4 - first + 7) % 7) + 21
    if (d.getDate() >= thursday - 6 && d.getDate() <= thursday + 1) return 'thanksgiving'
  }
  if (m === '12-31' || m === '01-01') return 'newyear'
  if (m >= '12-01' && m <= '12-30') return 'christmas'
  if (m >= '02-07' && m <= '02-14') return 'valentine'
  if (m >= '07-01' && m <= '07-04') return 'july4'
  return null
}

function Pumpkin({ x, y, s = 1, lit = false }: { x: number; y: number; s?: number; lit?: boolean }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cx={0} cy={0.6} rx={4.6} ry={1} fill="#000" opacity={0.15} />
      <ellipse cx={-1.9} cy={-2.6} rx={2.5} ry={2.7} fill="#d9782d" />
      <ellipse cx={1.9} cy={-2.6} rx={2.5} ry={2.7} fill="#d9782d" />
      <ellipse cx={0} cy={-2.7} rx={2.4} ry={2.9} fill="#e88a3a" />
      <rect x={-0.4} y={-6.6} width={0.9} height={1.7} rx={0.3} fill="#5b7a3a" />
      {lit && (
        <g>
          <path d="M -1.9 -3.6 L -1.1 -2.6 L -2.7 -2.6 Z M 1.9 -3.6 L 2.7 -2.6 L 1.1 -2.6 Z" fill="#ffd36b" />
          <path d="M -2 -1.6 Q 0 -0.4 2 -1.6 L 1.2 -1.2 L 0.6 -1.6 L 0 -1.1 L -0.6 -1.6 L -1.2 -1.2 Z" fill="#ffd36b" />
        </g>
      )}
    </g>
  )
}

function Bat({ x, y, delay }: { x: number; y: number; delay: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(1.7)`}>
      <g>
        <animateTransform attributeName="transform" type="translate" values="0 0; 6 -3; 12 1; 6 3; 0 0" dur="7s" begin={`${delay}s`} repeatCount="indefinite" />
        <path d="M 0 0 Q -2 -2 -4 -0.6 Q -3 0 -2.4 0.6 Q -1.2 0 0 0.8 Q 1.2 0 2.4 0.6 Q 3 0 4 -0.6 Q 2 -2 0 0 Z" fill="#2b2433">
          <animate attributeName="d" dur="0.5s" repeatCount="indefinite"
            values="M 0 0 Q -2 -2 -4 -0.6 Q -3 0 -2.4 0.6 Q -1.2 0 0 0.8 Q 1.2 0 2.4 0.6 Q 3 0 4 -0.6 Q 2 -2 0 0 Z;M 0 0 Q -2 1 -4 2 Q -3 1.4 -2.4 1.6 Q -1.2 0.8 0 0.8 Q 1.2 0.8 2.4 1.6 Q 3 1.4 4 2 Q 2 1 0 0 Z;M 0 0 Q -2 -2 -4 -0.6 Q -3 0 -2.4 0.6 Q -1.2 0 0 0.8 Q 1.2 0 2.4 0.6 Q 3 0 4 -0.6 Q 2 -2 0 0 Z" />
        </path>
      </g>
    </g>
  )
}

// Little bulbs along the roof line, from the left eave up to the peak and
// down to the right eave, twinkling one after another.
function RoofLights({ colors, night }: { colors: string[]; night: boolean }) {
  const pts: [number, number][] = []
  const L: [number, number] = [-39, -41], P: [number, number] = [-0.5, -72], R: [number, number] = [41, -41]
  const n = 9
  for (let i = 0; i <= n; i++) pts.push([L[0] + (P[0] - L[0]) * i / n, L[1] + (P[1] - L[1]) * i / n + 1.4])
  for (let i = 1; i <= n; i++) pts.push([P[0] + (R[0] - P[0]) * i / n, P[1] + (R[1] - P[1]) * i / n + 1.4])
  return (
    <g pointerEvents="none">
      <polyline points={pts.map(p => p.join(',')).join(' ')} fill="none" stroke="#3b2a1e" strokeWidth={0.35} opacity={0.6} />
      {pts.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y + 0.9} r={night ? 1.05 : 0.85} fill={colors[i % colors.length]} opacity={0.95}>
          <animate attributeName="opacity" values="1;0.45;1" dur="2.4s" begin={`${(i % 4) * 0.6}s`} repeatCount="indefinite" />
        </circle>
      ))}
    </g>
  )
}

function Wreath({ x, y, bow = '#c0392b' }: { x: number; y: number; bow?: string }) {
  return (
    <g transform={`translate(${x} ${y})`} pointerEvents="none">
      <circle r={3} fill="none" stroke="#3f6b3a" strokeWidth={1.6} />
      <circle r={3} fill="none" stroke="#5b8a4c" strokeWidth={0.6} strokeDasharray="0.8 0.8" />
      <path d="M -1.2 2.2 L 0 3 L 1.2 2.2 L 1 3.8 M -1.2 2.2 L -1 3.8" fill={bow} stroke={bow} strokeWidth={0.5} />
    </g>
  )
}

function Heart({ x, y, s = 1, fill = '#d9667a' }: { x: number; y: number; s?: number; fill?: string }) {
  return <path transform={`translate(${x} ${y}) scale(${s})`} d="M 0 1.6 C -2.6 -0.2 -2 -2.4 -0.8 -2.2 C -0.3 -2.1 0 -1.6 0 -1.4 C 0 -1.6 0.3 -2.1 0.8 -2.2 C 2 -2.4 2.6 -0.2 0 1.6 Z" fill={fill} />
}

// A string of little flags or hearts hung across the front of the house.
function Garland({ items }: { items: (i: number, x: number, y: number) => React.ReactNode }) {
  const pts = Array.from({ length: 9 }, (_, i) => {
    const t = i / 8
    return [-30 + 56 * t, -38 + Math.sin(t * Math.PI) * 4] as [number, number]
  })
  return (
    <g pointerEvents="none">
      <path d={`M ${pts[0][0]} ${pts[0][1]} Q -2 -30 ${pts[8][0]} ${pts[8][1]}`} fill="none" stroke="#6b4426" strokeWidth={0.35} />
      {pts.map(([x, y], i) => <g key={i}>{items(i, x, y)}</g>)}
    </g>
  )
}

function Lantern({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(1.6)`} pointerEvents="none">
      <line x1={0} y1={-3} x2={0} y2={0} stroke="#6b4426" strokeWidth={0.3} />
      <ellipse cx={0} cy={2.6} rx={2.4} ry={2.8} fill="#c8333a" />
      <rect x={-1.4} y={-0.4} width={2.8} height={0.7} fill="#e2b33c" />
      <rect x={-1.4} y={5.1} width={2.8} height={0.7} fill="#e2b33c" />
      <line x1={0} y1={5.8} x2={0} y2={8} stroke="#e2b33c" strokeWidth={0.4} />
      <ellipse cx={0} cy={2.6} rx={1.2} ry={2} fill="#ff8a6a" opacity={0.4} className="village-glow" />
    </g>
  )
}

/** The cottage's decorations for a holiday. Drawn inside Home's own <g>. */
export function HolidayDecor({ holiday, night }: { holiday: Holiday; night: boolean }) {
  switch (holiday) {
    case 'halloween':
      return (
        <g pointerEvents="none">
          <title>Happy Halloween</title>
          <Pumpkin x={-24} y={-0.5} s={1.7} lit={night} />
          <Pumpkin x={8} y={-0.5} s={1.35} lit={night} />
          <Pumpkin x={-31} y={0} s={1} />
          {night && <circle cx={-24} cy={-5} r={8} fill="#ffb347" opacity={0.25} filter="url(#vglow)" className="village-glow" />}
          <Bat x={-30} y={-88} delay={0} />
          <Bat x={18} y={-98} delay={2.5} />
          {/* A little web in the top corner of the door. */}
          <path d="M -18.5 -36 L -14 -36 M -18.5 -36 L -18.5 -31.5 M -18.5 -36 L -15 -32.5 M -16.5 -36 Q -16.8 -34.2 -18.5 -34 M -15 -36 Q -15.4 -33 -18.5 -32.6" stroke="#f4f0e8" strokeWidth={0.25} fill="none" opacity={0.85} />
        </g>
      )
    case 'thanksgiving':
      return (
        <g pointerEvents="none">
          <title>Happy Thanksgiving</title>
          <Pumpkin x={-24} y={-0.5} s={1.5} />
          <Pumpkin x={8} y={-0.5} s={1.2} />
          {/* A sheaf of dried corn by the door. */}
          <g transform="translate(-31 -1) scale(1.4)">
            {[-1.6, -0.5, 0.6, 1.6].map((dx, i) => <line key={i} x1={dx * 0.4} y1={0} x2={dx} y2={-11} stroke="#c9a464" strokeWidth={0.8} />)}
            <rect x={-1.4} y={-5} width={2.8} height={1} fill="#8a5a2b" />
          </g>
          <Wreath x={-10.2} y={-28} bow="#b5652b" />
        </g>
      )
    case 'christmas':
    case 'newyear':
      return (
        <g pointerEvents="none">
          <title>{holiday === 'christmas' ? 'Merry Christmas' : 'Happy New Year'}</title>
          <RoofLights colors={holiday === 'christmas' ? ['#e05a4f', '#f2c14e', '#5fae6e', '#6aa8e0'] : ['#f2c14e', '#fff1c4', '#f2c14e']} night={night} />
          {holiday === 'christmas' && <Wreath x={-10.2} y={-28} />}
          {holiday === 'christmas' && (
            <g transform="translate(6 -1)">
              <path d="M 0 -12 L 4 -4 L 2.4 -4 L 5 0 L -5 0 L -2.4 -4 L -4 -4 Z" fill="#3f6b3a" />
              <rect x={-0.7} y={0} width={1.4} height={1.4} fill="#6b4426" />
              <circle cx={-1.5} cy={-3} r={0.6} fill="#e05a4f" /><circle cx={1.8} cy={-1.5} r={0.6} fill="#f2c14e" /><circle cx={0.4} cy={-7} r={0.6} fill="#6aa8e0" />
              <path d="M 0 -13.6 L 0.5 -12.4 L -0.5 -12.4 Z" fill="#f2c14e" />
            </g>
          )}
        </g>
      )
    case 'seollal':
      return (
        <g pointerEvents="none">
          <title>새해 복 많이 받으세요</title>
          <Lantern x={-27} y={-44} />
          <Lantern x={18} y={-44} />
        </g>
      )
    case 'valentine':
      return (
        <g>
          <title>Happy Valentine&apos;s Day</title>
          <Garland items={(i, x, y) => <Heart x={x} y={y + 2.2} s={1.1} fill={i % 2 ? '#e88ea0' : '#d9667a'} />} />
        </g>
      )
    case 'july4':
      return (
        <g>
          <title>Happy Fourth of July</title>
          <Garland items={(i, x, y) => <path d={`M ${x - 1.6} ${y} L ${x + 1.6} ${y} L ${x} ${y + 3} Z`} fill={['#c0392b', '#f4f0e8', '#2e5aa8'][i % 3]} />} />
        </g>
      )
  }
}
