import webpush from 'web-push'
import type { SupabaseClient } from '@supabase/supabase-js'

// The one place that knows how to actually deliver a push — every server
// trigger (currently just the waiting-notice cron) calls THIS rather than
// touching web-push or push_subscriptions directly, same "one function, not
// duplicated per caller" reasoning as routineDue()/computeStatus() elsewhere.

let configured = false
function ensureConfigured() {
  if (configured) return
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  if (!publicKey || !privateKey) throw new Error('VAPID keys are not configured')
  webpush.setVapidDetails('mailto:hrld.net@gmail.com', publicKey, privateKey)
  configured = true
}

export interface PushPayload {
  title: string
  body: string
  /** Where notificationclick should open — see the sw.js handler. */
  url?: string
}

/** Sends to every device this user has subscribed on, and quietly prunes any
 *  subscription the push service reports as gone (410/404) — an expired or
 *  uninstalled device shouldn't keep failing forever. */
export async function sendPushToUser(admin: SupabaseClient, userId: string, payload: PushPayload): Promise<number> {
  ensureConfigured()
  const { data } = await admin.from('push_subscriptions').select('id, endpoint, p256dh, auth').eq('user_id', userId)
  if (!data || data.length === 0) return 0

  let sent = 0
  await Promise.all(data.map(async (sub) => {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload),
      )
      sent++
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode
      if (status === 404 || status === 410) {
        await admin.from('push_subscriptions').delete().eq('id', sub.id)
      }
    }
  }))
  return sent
}
