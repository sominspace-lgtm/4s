import type { DeviceKind, DeviceState } from './capabilities'

// Where a device change actually goes (2026-11-08). Every change runs
// through one of these on the server, after it has been checked and before
// the shared board is written. A real hub (Home Assistant, Matter, a vendor
// cloud) is one more entry here; nothing else in the app has to change.
//
//   home_assistant  your own Home Assistant (2026-11-10). Real devices; the
//             change goes there and the board is only written if it took.
//   manual    your own list. Records what you set, controls nothing.
//   practice  a pretend house to try the Controller with. Clearly labeled
//             everywhere it shows, and never touches anything real.

export type ProviderId = 'manual' | 'practice' | 'home_assistant'

export interface ProviderDevice { id: string; kind: DeviceKind; name: string; spaceId: string | null; externalId: string | null; meta: { celsius?: boolean } }

export interface SmartHomeProvider {
  id: ProviderId
  label: string
  /** True when nothing in the real house changes. Shown to you, always. */
  simulated: boolean
  /** `change` is only what was asked for; `next` is the whole state after it. */
  send(device: ProviderDevice, next: DeviceState, change: DeviceState): Promise<{ ok: true } | { ok: false; error: string }>
}

const manual: SmartHomeProvider = {
  id: 'manual',
  label: 'Your list',
  simulated: true,
  async send() { return { ok: true } },
}

const practice: SmartHomeProvider = {
  id: 'practice',
  label: 'Practice',
  simulated: true,
  async send() { return { ok: true } },
}

const homeAssistant: SmartHomeProvider = {
  id: 'home_assistant',
  label: 'Home Assistant',
  simulated: false,
  async send(device, _next, change) {
    if (!device.spaceId || !device.externalId) return { ok: false, error: 'This device is not linked to Home Assistant.' }
    // Loaded here so the browser bundle never pulls in the server-only client.
    const { sendToHA } = await import('./hass')
    return sendToHA(device.spaceId, device.externalId, device.kind, change, !!device.meta.celsius)
  },
}

const PROVIDERS: Record<ProviderId, SmartHomeProvider> = { manual, practice, home_assistant: homeAssistant }

export function providerFor(id: unknown): SmartHomeProvider {
  return PROVIDERS[id as ProviderId] ?? manual
}
