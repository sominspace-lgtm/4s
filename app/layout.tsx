import type { Metadata, Viewport } from 'next'
import localFont from 'next/font/local'
import './globals.css'

// Fonts are self-hosted from app/fonts rather than fetched from Google at
// build time. next/font/google downloads woff2 files from fonts.gstatic.com
// during the build, and when Google serves a URL its own CDN then 404s, the
// production build dies with a module-not-found for every face — which is
// exactly what took deploys down on 2026-08-10. A build should not depend on
// a third party being healthy. Regenerate with scripts/fetch-fonts.mjs.

const cormorant = localFont({
  variable: '--font-cormorant',
  display: 'swap',
  src: [
    { path: './fonts/cormorant-300-italic.woff2', weight: '300', style: 'italic' },
    { path: './fonts/cormorant-400-italic.woff2', weight: '400', style: 'italic' },
    { path: './fonts/cormorant-300-normal.woff2', weight: '300', style: 'normal' },
    { path: './fonts/cormorant-400-normal.woff2', weight: '400', style: 'normal' },
  ],
})
const inter = localFont({
  variable: '--font-inter',
  display: 'swap',
  src: [
    { path: './fonts/inter-300-normal.woff2', weight: '300', style: 'normal' },
    { path: './fonts/inter-400-normal.woff2', weight: '400', style: 'normal' },
    { path: './fonts/inter-500-normal.woff2', weight: '500', style: 'normal' },
  ],
})
const playfair = localFont({
  variable: '--font-playfair',
  display: 'swap',
  src: [
    { path: './fonts/playfair-400-italic.woff2', weight: '400', style: 'italic' },
    { path: './fonts/playfair-500-italic.woff2', weight: '500', style: 'italic' },
    { path: './fonts/playfair-400-normal.woff2', weight: '400', style: 'normal' },
    { path: './fonts/playfair-500-normal.woff2', weight: '500', style: 'normal' },
  ],
})
const dmSerif = localFont({
  variable: '--font-dm-serif',
  display: 'swap',
  src: [
    { path: './fonts/dm-serif-400-italic.woff2', weight: '400', style: 'italic' },
    { path: './fonts/dm-serif-400-normal.woff2', weight: '400', style: 'normal' },
  ],
})
const lora = localFont({
  variable: '--font-lora',
  display: 'swap',
  src: [
    { path: './fonts/lora-400-italic.woff2', weight: '400', style: 'italic' },
    { path: './fonts/lora-500-italic.woff2', weight: '500', style: 'italic' },
    { path: './fonts/lora-400-normal.woff2', weight: '400', style: 'normal' },
    { path: './fonts/lora-500-normal.woff2', weight: '500', style: 'normal' },
  ],
})
const sourceSans = localFont({
  variable: '--font-source-sans',
  display: 'swap',
  src: [
    { path: './fonts/source-sans-300-normal.woff2', weight: '300', style: 'normal' },
    { path: './fonts/source-sans-400-normal.woff2', weight: '400', style: 'normal' },
    { path: './fonts/source-sans-600-normal.woff2', weight: '600', style: 'normal' },
  ],
})
const fraunces = localFont({
  variable: '--font-fraunces',
  display: 'swap',
  src: [
    { path: './fonts/fraunces-300-italic.woff2', weight: '300', style: 'italic' },
    { path: './fonts/fraunces-400-italic.woff2', weight: '400', style: 'italic' },
    { path: './fonts/fraunces-500-italic.woff2', weight: '500', style: 'italic' },
    { path: './fonts/fraunces-300-normal.woff2', weight: '300', style: 'normal' },
    { path: './fonts/fraunces-400-normal.woff2', weight: '400', style: 'normal' },
    { path: './fonts/fraunces-500-normal.woff2', weight: '500', style: 'normal' },
  ],
})
const ibmPlexSans = localFont({
  variable: '--font-ibm-plex-sans',
  display: 'swap',
  src: [
    { path: './fonts/ibm-plex-sans-300-normal.woff2', weight: '300', style: 'normal' },
    { path: './fonts/ibm-plex-sans-400-normal.woff2', weight: '400', style: 'normal' },
    { path: './fonts/ibm-plex-sans-500-normal.woff2', weight: '500', style: 'normal' },
  ],
})
const bitter = localFont({
  variable: '--font-bitter',
  display: 'swap',
  src: [
    { path: './fonts/bitter-400-italic.woff2', weight: '400', style: 'italic' },
    { path: './fonts/bitter-500-italic.woff2', weight: '500', style: 'italic' },
    { path: './fonts/bitter-400-normal.woff2', weight: '400', style: 'normal' },
    { path: './fonts/bitter-500-normal.woff2', weight: '500', style: 'normal' },
  ],
})
const manrope = localFont({
  variable: '--font-manrope',
  display: 'swap',
  src: [
    { path: './fonts/manrope-300-normal.woff2', weight: '300', style: 'normal' },
    { path: './fonts/manrope-400-normal.woff2', weight: '400', style: 'normal' },
    { path: './fonts/manrope-500-normal.woff2', weight: '500', style: 'normal' },
  ],
})
const libreBaskerville = localFont({
  variable: '--font-libre-baskerville',
  display: 'swap',
  src: [
    { path: './fonts/libre-baskerville-400-italic.woff2', weight: '400', style: 'italic' },
    { path: './fonts/libre-baskerville-400-normal.woff2', weight: '400', style: 'normal' },
  ],
})
const spectral = localFont({
  variable: '--font-spectral',
  display: 'swap',
  src: [
    { path: './fonts/spectral-300-italic.woff2', weight: '300', style: 'italic' },
    { path: './fonts/spectral-400-italic.woff2', weight: '400', style: 'italic' },
    { path: './fonts/spectral-500-italic.woff2', weight: '500', style: 'italic' },
    { path: './fonts/spectral-300-normal.woff2', weight: '300', style: 'normal' },
    { path: './fonts/spectral-400-normal.woff2', weight: '400', style: 'normal' },
    { path: './fonts/spectral-500-normal.woff2', weight: '500', style: 'normal' },
  ],
})
const workSans = localFont({
  variable: '--font-work-sans',
  display: 'swap',
  src: [
    { path: './fonts/work-sans-300-normal.woff2', weight: '300', style: 'normal' },
    { path: './fonts/work-sans-400-normal.woff2', weight: '400', style: 'normal' },
    { path: './fonts/work-sans-500-normal.woff2', weight: '500', style: 'normal' },
  ],
})
const plusJakarta = localFont({
  variable: '--font-plus-jakarta',
  display: 'swap',
  src: [
    { path: './fonts/plus-jakarta-300-normal.woff2', weight: '300', style: 'normal' },
    { path: './fonts/plus-jakarta-400-normal.woff2', weight: '400', style: 'normal' },
    { path: './fonts/plus-jakarta-500-normal.woff2', weight: '500', style: 'normal' },
  ],
})
const newsreader = localFont({
  variable: '--font-newsreader',
  display: 'swap',
  src: [
    { path: './fonts/newsreader-400-italic.woff2', weight: '400', style: 'italic' },
    { path: './fonts/newsreader-500-italic.woff2', weight: '500', style: 'italic' },
    { path: './fonts/newsreader-400-normal.woff2', weight: '400', style: 'normal' },
    { path: './fonts/newsreader-500-normal.woff2', weight: '500', style: 'normal' },
  ],
})
const nunitoSans = localFont({
  variable: '--font-nunito',
  display: 'swap',
  src: [
    { path: './fonts/nunito-300-normal.woff2', weight: '300', style: 'normal' },
    { path: './fonts/nunito-400-normal.woff2', weight: '400', style: 'normal' },
    { path: './fonts/nunito-600-normal.woff2', weight: '600', style: 'normal' },
  ],
})
const jetbrainsMono = localFont({
  variable: '--font-jetbrains',
  display: 'swap',
  src: [
    { path: './fonts/jetbrains-300-normal.woff2', weight: '300', style: 'normal' },
    { path: './fonts/jetbrains-400-normal.woff2', weight: '400', style: 'normal' },
    { path: './fonts/jetbrains-500-normal.woff2', weight: '500', style: 'normal' },
  ],
})
const ibmPlexMono = localFont({
  variable: '--font-ibm-plex-mono',
  display: 'swap',
  src: [
    { path: './fonts/ibm-plex-mono-300-normal.woff2', weight: '300', style: 'normal' },
    { path: './fonts/ibm-plex-mono-400-normal.woff2', weight: '400', style: 'normal' },
  ],
})
const firaCode = localFont({
  variable: '--font-fira',
  display: 'swap',
  src: [
    { path: './fonts/fira-300-normal.woff2', weight: '300', style: 'normal' },
    { path: './fonts/fira-400-normal.woff2', weight: '400', style: 'normal' },
    { path: './fonts/fira-500-normal.woff2', weight: '500', style: 'normal' },
  ],
})
const instrumentSans = localFont({
  variable: '--font-instrument',
  display: 'swap',
  src: [
    { path: './fonts/instrument-400-normal.woff2', weight: '400', style: 'normal' },
    { path: './fonts/instrument-500-normal.woff2', weight: '500', style: 'normal' },
  ],
})

export const metadata: Metadata = {
  title: '4S Home',
  description: 'Your private family life OS',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: '4S' },
}

export const viewport: Viewport = {
  themeColor: '#080a18',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const fontVars = [
    cormorant.variable, inter.variable, playfair.variable, dmSerif.variable,
    lora.variable, sourceSans.variable, fraunces.variable, ibmPlexSans.variable,
    bitter.variable, manrope.variable, libreBaskerville.variable, spectral.variable,
    workSans.variable, plusJakarta.variable, newsreader.variable, nunitoSans.variable,
    jetbrainsMono.variable, ibmPlexMono.variable, firaCode.variable, instrumentSans.variable,
  ].join(' ')

  return (
    <html lang="en" className={fontVars}>
      <head>
        <link rel="apple-touch-icon" href="/icons/192.png" />
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
