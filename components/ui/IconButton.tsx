import type { CSSProperties, ReactNode } from 'react'

// A small glyph button — the ✕ dismiss, an inline "Edit", a bare Icon — with
// a proper 44px touch target that costs nothing in layout (the hit box is an
// absolutely-positioned ::after on .icon-btn, see globals.css). The visible
// glyph stays whatever size you pass. Use this instead of hand-rolling a
// `<button style={{ background: 'none', border: 'none', padding: 0 }}>`.
export default function IconButton({
  label, onClick, children, disabled = false, size = 14, color, className = '', style, title,
}: {
  /** Accessible name — required; also the default tooltip. */
  label: string
  onClick?: () => void
  children: ReactNode
  disabled?: boolean
  /** Glyph font-size in px. */
  size?: number
  /** Override the resting color (defaults to --muted via the class). */
  color?: string
  className?: string
  style?: CSSProperties
  title?: string
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={title ?? label}
      onClick={onClick}
      disabled={disabled}
      className={`icon-btn press ${className}`.trim()}
      style={{ fontSize: size, ...(color ? { color } : null), ...style }}
    >
      {children}
    </button>
  )
}
