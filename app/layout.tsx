import type { Metadata, Viewport } from 'next'
import { Cormorant_Garamond, Inter, Playfair_Display, Space_Mono, DM_Serif_Display, Raleway } from 'next/font/google'
import './globals.css'

const cormorant = Cormorant_Garamond({
  variable: '--font-cormorant', subsets: ['latin'],
  weight: ['300', '400'], style: ['normal', 'italic'],
})
const inter = Inter({
  variable: '--font-inter', subsets: ['latin'],
  weight: ['300', '400', '500'],
})
const playfair = Playfair_Display({
  variable: '--font-playfair', subsets: ['latin'],
  weight: ['400', '500'], style: ['normal', 'italic'],
})
const spaceMono = Space_Mono({
  variable: '--font-space-mono', subsets: ['latin'],
  weight: ['400', '700'],
})
const dmSerif = DM_Serif_Display({
  variable: '--font-dm-serif', subsets: ['latin'],
  weight: ['400'], style: ['normal', 'italic'],
})
const raleway = Raleway({
  variable: '--font-raleway', subsets: ['latin'],
  weight: ['300', '400', '500'],
})

export const metadata: Metadata = {
  title: '4S',
  description: 'Your personal operating system',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: '4S' },
}

export const viewport: Viewport = {
  themeColor: '#120a10',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const fontVars = [
    cormorant.variable, inter.variable, playfair.variable,
    spaceMono.variable, dmSerif.variable, raleway.variable,
  ].join(' ')

  return (
    <html lang="en" className={fontVars}>
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body>
        {children}
        <script dangerouslySetInnerHTML={{
          __html: `if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js')`
        }} />
      </body>
    </html>
  )
}
