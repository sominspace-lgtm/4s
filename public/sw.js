const CACHE = '4s-v1'
const SHELL = ['/', '/dashboard', '/login']

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)))
  self.skipWaiting()
})

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ))
  self.clients.claim()
})

// Real push (2026-08-20) — everything above this was offline app-shell
// caching only; this is what lets a server trigger (see
// app/api/cron/waiting-notice) reach a device even when no 4S tab is open.
self.addEventListener('push', e => {
  let data = { title: '4S', body: '' }
  try { data = e.data.json() } catch { /* not JSON, use the default */ }
  e.waitUntil(self.registration.showNotification(data.title || '4S', {
    body: data.body,
    icon: '/icons/192.png',
    badge: '/icons/192.png',
    data: { url: data.url || '/dashboard' },
  }))
})

self.addEventListener('notificationclick', e => {
  e.notification.close()
  const url = e.notification.data?.url || '/dashboard'
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      for (const client of clients) {
        if (client.url.includes(url) && 'focus' in client) return client.focus()
      }
      if (self.clients.openWindow) return self.clients.openWindow(url)
    })
  )
})

self.addEventListener('fetch', e => {
  // Only cache GET requests; pass everything else through
  if (e.request.method !== 'GET') return
  // Don't cache Supabase API calls
  if (e.request.url.includes('supabase.co')) return

  e.respondWith(
    fetch(e.request)
      .then(res => {
        const clone = res.clone()
        caches.open(CACHE).then(c => c.put(e.request, clone))
        return res
      })
      .catch(() => caches.match(e.request))
  )
})
