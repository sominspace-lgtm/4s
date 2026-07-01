import type { Metadata, Viewport } from 'next'
import {
  Cormorant_Garamond, Inter, Playfair_Display, DM_Serif_Display,
  Lora, Source_Sans_3, Fraunces, IBM_Plex_Sans, Bitter, Manrope,
  Libre_Baskerville, Spectral, Work_Sans, Plus_Jakarta_Sans,
  Newsreader, Nunito_Sans, JetBrains_Mono, IBM_Plex_Mono,
  Fira_Code, Instrument_Sans,
} from 'next/font/google'
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
const dmSerif = DM_Serif_Display({
  variable: '--font-dm-serif', subsets: ['latin'],
  weight: ['400'], style: ['normal', 'italic'],
})
const lora = Lora({
  variable: '--font-lora', subsets: ['latin'],
  weight: ['400', '500'], style: ['normal', 'italic'],
})
const sourceSans = Source_Sans_3({
  variable: '--font-source-sans', subsets: ['latin'],
  weight: ['300', '400', '600'],
})
const fraunces = Fraunces({
  variable: '--font-fraunces', subsets: ['latin'],
  weight: ['300', '400', '500'], style: ['normal', 'italic'],
})
const ibmPlexSans = IBM_Plex_Sans({
  variable: '--font-ibm-plex-sans', subsets: ['latin'],
  weight: ['300', '400', '500'],
})
const bitter = Bitter({
  variable: '--font-bitter', subsets: ['latin'],
  weight: ['400', '500'], style: ['normal', 'italic'],
})
const manrope = Manrope({
  variable: '--font-manrope', subsets: ['latin'],
  weight: ['300', '400', '500'],
})
const libreBaskerville = Libre_Baskerville({
  variable: '--font-libre-baskerville', subsets: ['latin'],
  weight: ['400'], style: ['normal', 'italic'],
})
const spectral = Spectral({
  variable: '--font-spectral', subsets: ['latin'],
  weight: ['300', '400', '500'], style: ['normal', 'italic'],
})
const workSans = Work_Sans({
  variable: '--font-work-sans', subsets: ['latin'],
  weight: ['300', '400', '500'],
})
const plusJakarta = Plus_Jakarta_Sans({
  variable: '--font-plus-jakarta', subsets: ['latin'],
  weight: ['300', '400', '500'],
})
const newsreader = Newsreader({
  variable: '--font-newsreader', subsets: ['latin'],
  weight: ['400', '500'], style: ['normal', 'italic'],
})
const nunitoSans = Nunito_Sans({
  variable: '--font-nunito', subsets: ['latin'],
  weight: ['300', '400', '600'],
})
const jetbrainsMono = JetBrains_Mono({
  variable: '--font-jetbrains', subsets: ['latin'],
  weight: ['300', '400', '500'],
})
const ibmPlexMono = IBM_Plex_Mono({
  variable: '--font-ibm-plex-mono', subsets: ['latin'],
  weight: ['300', '400'],
})
const firaCode = Fira_Code({
  variable: '--font-fira', subsets: ['latin'],
  weight: ['300', '400', '500'],
})
const instrumentSans = Instrument_Sans({
  variable: '--font-instrument', subsets: ['latin'],
  weight: ['400', '500'],
})

export const metadata: Metadata = {
  title: '4S',
  description: 'Your personal operating system',
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
