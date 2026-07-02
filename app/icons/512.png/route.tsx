import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export async function GET() {
  return new ImageResponse(
    (
      <div style={{
        width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#080a18', borderRadius: 106,
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', color: '#8fa0f0', fontSize: 256, fontWeight: 300 }}>
          4<span style={{ fontSize: 148 }}>S</span>
        </div>
      </div>
    ),
    { width: 512, height: 512 }
  )
}
