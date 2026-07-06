import { ImageResponse } from 'next/og'

export const runtime = 'edge'

// PWA icon — matches the 4S mark (dark aurora tile, gold monogram, companion dot).
export async function GET() {
  return new ImageResponse(
    (
      <div style={{
        width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative', borderRadius: 48,
        backgroundImage: 'radial-gradient(120% 90% at 50% 28%, #141638 0%, #0e1028 55%, #080a18 100%)',
        border: '1px solid rgba(143,160,240,0.18)',
      }}>
        <div style={{ display: 'flex', color: '#8fa0f0', fontSize: 100, fontWeight: 500, fontFamily: 'Georgia, serif', letterSpacing: -4 }}>
          4S
        </div>
        <div style={{ position: 'absolute', top: 56, right: 56, width: 9, height: 9, borderRadius: 5, background: '#8fa0f0' }} />
      </div>
    ),
    { width: 192, height: 192 }
  )
}
