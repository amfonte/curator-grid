import React from "react"
import type { Metadata } from "next"
import { Host_Grotesk } from "next/font/google"
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

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'Curator - Your Inspiration Board',
  description: 'A personal workspace for collecting and organizing design inspiration. Save URLs, upload images, and curate your creative references.',
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
      <body className={`${hostGrotesk.variable} font-sans antialiased`}>
        <SuppressParamsEnumerationWarning />
        {children}
        <DialKitDevMount />
      </body>
    </html>
  )
}
