import { NextResponse } from "next/server"

function isPrivateOrLocalHost(hostname: string): boolean {
  const host = hostname.toLowerCase()

  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host === "local" ||
    host.endsWith(".local") ||
    host === "127.0.0.1" ||
    host === "::1"
  ) {
    return true
  }

  const ipv4Match = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)
  if (ipv4Match) {
    const octets = ipv4Match.slice(1).map(Number)
    if (octets.some((n) => Number.isNaN(n) || n < 0 || n > 255)) return true

    const [a, b] = octets
    if (
      a === 10 ||
      a === 127 ||
      (a === 192 && b === 168) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 169 && b === 254)
    ) {
      return true
    }
  }

  // Block common private/link-local IPv6 prefixes.
  if (host.startsWith("fc") || host.startsWith("fd") || host.startsWith("fe80:")) {
    return true
  }

  return false
}

function parseFrameAncestors(cspHeader: string | null): string | null {
  if (!cspHeader) return null
  const directives = cspHeader
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
  const frameAncestorsDirective = directives.find((part) => part.toLowerCase().startsWith("frame-ancestors"))
  if (!frameAncestorsDirective) return null
  const firstSpace = frameAncestorsDirective.indexOf(" ")
  if (firstSpace < 0) return ""
  return frameAncestorsDirective.slice(firstSpace + 1).trim()
}

function isLikelyIframeBlocked(res: Response): boolean {
  const xFrameOptions = res.headers.get("x-frame-options")?.trim().toLowerCase() ?? ""
  if (xFrameOptions.includes("deny") || xFrameOptions.includes("sameorigin")) {
    return true
  }

  const frameAncestors = parseFrameAncestors(res.headers.get("content-security-policy"))
  if (!frameAncestors) return false

  const normalized = frameAncestors.toLowerCase()
  if (normalized.includes("'none'") || normalized.includes("'self'")) {
    return true
  }

  return false
}

export async function POST(request: Request) {
  try {
    const { url } = await request.json()

    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "URL is required" }, { status: 400 })
    }

    const parsedUrl = new URL(url)
    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      return NextResponse.json({ error: "Only http/https URLs are allowed" }, { status: 400 })
    }
    if (isPrivateOrLocalHost(parsedUrl.hostname)) {
      return NextResponse.json({ error: "URL host is not allowed" }, { status: 400 })
    }
    const domain = parsedUrl.hostname

    // Fetch the page to extract metadata
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)

    let title: string | undefined
    let description: string | undefined
    let favicon: string | undefined
    let iframeBlocked = false

    try {
      const res = await fetch(parsedUrl.toString(), {
        signal: controller.signal,
        redirect: "manual",
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; CuratedBot/1.0)",
        },
      })
      clearTimeout(timeout)
      iframeBlocked = isLikelyIframeBlocked(res)

      const html = await res.text()

      // Extract title
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
      if (titleMatch) title = titleMatch[1].trim()

      // Extract og:title fallback
      if (!title) {
        const ogTitleMatch = html.match(
          /<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i,
        )
        if (ogTitleMatch) title = ogTitleMatch[1].trim()
      }

      // Extract description
      const descMatch = html.match(
        /<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i,
      )
      if (descMatch) description = descMatch[1].trim()

      // Extract favicon
      const faviconMatch = html.match(
        /<link[^>]*rel=["'](?:shortcut )?icon["'][^>]*href=["']([^"']+)["']/i,
      )
      if (faviconMatch) {
        const href = faviconMatch[1]
        if (href.startsWith("http")) {
          favicon = href
        } else if (href.startsWith("//")) {
          favicon = `https:${href}`
        } else {
          favicon = `${parsedUrl.origin}${href.startsWith("/") ? "" : "/"}${href}`
        }
      } else {
        favicon = `${parsedUrl.origin}/favicon.ico`
      }
    } catch {
      clearTimeout(timeout)
      favicon = `${parsedUrl.origin}/favicon.ico`
    }

    return NextResponse.json({ title, description, favicon, domain, iframeBlocked })
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 })
  }
}
