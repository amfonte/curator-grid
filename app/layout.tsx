import React from "react"
import type { Metadata } from "next"
import { Host_Grotesk } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { SpeedInsights } from "@vercel/speed-insights/next"
import { SuppressParamsEnumerationWarning } from "@/components/suppress-params-enumeration-warning"
import { DialKitDevMount } from "@/components/DialKitDevMount"
import "./globals.css"

const hostGrotesk = Host_Grotesk({
  subsets: ["latin"],
  variable: "--font-host-grotesk",
})

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")

const metadataBase = new URL(siteUrl)
// Explicit absolute URL — X/Twitter’s crawler is picky; avoids any ambiguity vs relative paths
const ogImageUrl = new URL("/og-image.png", metadataBase).toString()

const title = "Curator - Your Inspiration Board"
const description =
  "A personal workspace for collecting and organizing design inspiration. Save URLs, upload images, and curate your creative references."

const ogImage = {
  url: ogImageUrl,
  width: 1200,
  height: 630,
  alt: title,
}

export const metadata: Metadata = {
  metadataBase,
  title,
  description,
  // Use /public/og-image.png only; app/opengraph-image.* adds duplicate og tags and query-string URLs
  openGraph: {
    title,
    description,
    siteName: "Curator",
    type: "website",
    images: [ogImage],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: [ogImage],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" type="image/svg+xml" href="/favicon-light.svg" />
        <link
          rel="icon"
          type="image/svg+xml"
          href="/favicon-light.svg"
          media="(prefers-color-scheme: light)"
        />
        <link
          rel="icon"
          type="image/svg+xml"
          href="/favicon-dark.svg"
          media="(prefers-color-scheme: dark)"
        />
      </head>
      <body
        className={`${hostGrotesk.variable} min-h-dvh font-sans antialiased`}
      >
        <SuppressParamsEnumerationWarning />
        {children}
        <Analytics />
        <SpeedInsights />
        <DialKitDevMount />
      </body>
    </html>
  )
}
