import type { GuestInfo } from '@/lib/hooks/useGathering'

// A one-page guest card to print (2026-10-29): the welcome line, the Wi-Fi
// with its QR code, where things are and the house rules. For the fridge or
// the guest room. Opens in its own window and brings up the print dialog.

const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
const lines = (s?: string) => (s ?? '').split('\n').map(l => l.trim()).filter(Boolean)

export function printGuestCard(info: GuestInfo, qr: string | null): boolean {
  const w = window.open('', '_blank', 'width=720,height=900')
  if (!w) return false
  const list = (title: string, items: string[]) => items.length
    ? `<h2>${title}</h2><ul>${items.map(i => `<li>${esc(i)}</li>`).join('')}</ul>`
    : ''
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Guest card</title>
<style>
  @page { margin: 18mm; }
  body { font-family: Georgia, 'Times New Roman', serif; color: #2b2320; max-width: 560px; margin: 0 auto; padding: 24px; }
  h1 { font-weight: 400; font-size: 34px; margin: 0 0 18px; }
  h2 { font: 600 13px system-ui, sans-serif; letter-spacing: 0.08em; text-transform: uppercase; color: #8a5a2c; margin: 22px 0 8px; }
  .wifi { display: flex; gap: 20px; align-items: center; border: 1px solid #e3d6c3; border-radius: 14px; padding: 16px; }
  .wifi img { width: 150px; height: 150px; }
  .k { font: 13px system-ui, sans-serif; color: #7a6b5d; }
  .v { font: 18px ui-monospace, Menlo, monospace; margin: 2px 0 10px; word-break: break-all; }
  ul { margin: 0; padding-left: 20px; font-size: 17px; line-height: 1.6; }
  p { font-size: 17px; line-height: 1.6; }
</style></head><body>
<h1>${esc(info.welcome || 'Welcome to our home')}</h1>
${info.wifiName ? `<div class="wifi">${qr ? `<img src="${qr}" alt="">` : ''}<div>
  <div class="k">Wi-Fi</div><div class="v">${esc(info.wifiName)}</div>
  ${info.wifiPassword ? `<div class="k">Password</div><div class="v">${esc(info.wifiPassword)}</div>` : ''}
  ${qr ? '<div class="k">Point your phone camera at the code to join.</div>' : ''}
</div></div>` : ''}
${list('Where things are', lines(info.places))}
${list('House rules', lines(info.rules))}
${info.notes ? `<h2>Anything else</h2><p>${esc(info.notes)}</p>` : ''}
<script>window.onload = function () { window.focus(); window.print(); };</script>
</body></html>`)
  w.document.close()
  return true
}
