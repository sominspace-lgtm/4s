// Turn a pasted playlist / track link into an <iframe> src for an inline
// player. Used by the Village home panel's Music card and the guest party
// screen. Returns null for anything we don't recognise, so the caller can
// fall back to a plain "open link" button.

export interface MediaEmbed {
  src: string
  provider: 'spotify' | 'youtube' | 'apple'
  /** A sensible default iframe height for this provider's player. */
  height: number
  /** Whether the compact (single-row) player is available — Spotify only. */
  compact: boolean
}

export function mediaEmbed(rawUrl: string | null | undefined): MediaEmbed | null {
  if (!rawUrl) return null
  let url: URL
  try {
    url = new URL(rawUrl.trim())
  } catch {
    return null
  }
  const host = url.hostname.replace(/^www\./, '')

  // Spotify — open.spotify.com/{playlist|album|track|show|episode|artist}/{id}
  if (host === 'open.spotify.com') {
    const m = url.pathname.match(/\/(playlist|album|track|show|episode|artist)\/([A-Za-z0-9]+)/)
    if (m) {
      return {
        src: `https://open.spotify.com/embed/${m[1]}/${m[2]}`,
        provider: 'spotify',
        height: m[1] === 'track' || m[1] === 'episode' ? 152 : 380,
        compact: true,
      }
    }
  }

  // YouTube — youtube.com/playlist?list=ID, youtube.com/watch?v=ID, youtu.be/ID
  if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com') {
    const list = url.searchParams.get('list')
    if (url.pathname === '/playlist' && list) {
      return { src: `https://www.youtube.com/embed/videoseries?list=${list}`, provider: 'youtube', height: 300, compact: false }
    }
    const v = url.searchParams.get('v')
    if (url.pathname === '/watch' && v) {
      return { src: `https://www.youtube.com/embed/${v}${list ? `?list=${list}` : ''}`, provider: 'youtube', height: 220, compact: false }
    }
  }
  if (host === 'youtu.be') {
    const id = url.pathname.slice(1)
    if (id) return { src: `https://www.youtube.com/embed/${id}`, provider: 'youtube', height: 220, compact: false }
  }

  // Apple Music — music.apple.com/<country>/<type>/<slug>/<id>
  if (host === 'music.apple.com') {
    return { src: `https://embed.music.apple.com${url.pathname}${url.search}`, provider: 'apple', height: 380, compact: true }
  }

  return null
}
