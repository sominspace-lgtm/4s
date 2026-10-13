import dns from 'node:dns/promises'
import net from 'node:net'

// Fetching a page a person pasted, from our server (2026-10-13). A server that
// fetches arbitrary URLs can be tricked into reaching things only it can see
// (its own network, cloud metadata), so every hop is checked first: http(s)
// only, the host must resolve to public addresses, redirects are followed by
// hand (so each one is checked too), and the body is size-capped.

export function isPrivateAddress(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number)
    return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31)
      || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224
  }
  if (net.isIPv6(ip)) {
    const x = ip.toLowerCase()
    if (x === '::1' || x === '::') return true
    if (x.startsWith('fc') || x.startsWith('fd') || x.startsWith('fe8') || x.startsWith('fe9') || x.startsWith('fea') || x.startsWith('feb')) return true
    const mapped = x.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)
    if (mapped) return isPrivateAddress(mapped[1])
    return false
  }
  return true // not an address we understand: refuse
}

async function assertPublic(url: URL): Promise<void> {
  if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error('Only web links can be imported.')
  if (url.username || url.password) throw new Error('That link is not allowed.')
  const host = url.hostname.replace(/^\[|\]$/g, '')
  if (net.isIP(host)) { if (isPrivateAddress(host)) throw new Error('That link is not allowed.'); return }
  if (host === 'localhost' || host.endsWith('.local') || host.endsWith('.internal')) throw new Error('That link is not allowed.')
  const addrs = await dns.lookup(host, { all: true })
  if (addrs.length === 0 || addrs.some(a => isPrivateAddress(a.address))) throw new Error('That link is not allowed.')
}

export interface Fetched { url: string; html: string; status: number }

export async function safeFetchHtml(start: string, opts: { maxBytes?: number; timeoutMs?: number } = {}): Promise<Fetched> {
  const maxBytes = opts.maxBytes ?? 2_500_000
  let url = new URL(start)
  for (let hop = 0; hop < 4; hop++) {
    await assertPublic(url)
    const res = await fetch(url, {
      redirect: 'manual', signal: AbortSignal.timeout(opts.timeoutMs ?? 9000),
      headers: {
        // A real browser string: many recipe sites refuse an obvious bot.
        'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
        accept: 'text/html,application/xhtml+xml',
        'accept-language': 'en-US,en;q=0.9',
      },
    })
    if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
      url = new URL(res.headers.get('location')!, url)
      continue
    }
    const type = res.headers.get('content-type') ?? ''
    if (res.ok && type && !/html|xml|text/i.test(type)) throw new Error('That link is not a web page.')
    const reader = res.body?.getReader()
    const chunks: Uint8Array[] = []
    let size = 0
    if (reader) {
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        size += value.length
        if (size > maxBytes) { await reader.cancel(); break }
        chunks.push(value)
      }
    }
    return { url: url.toString(), html: Buffer.concat(chunks).toString('utf8'), status: res.status }
  }
  throw new Error('That link redirects too many times.')
}
