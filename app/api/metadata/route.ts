import { NextResponse } from "next/server"

type UrlMetadataResponse = {
  title?: string
  description?: string
  favicon?: string
  domain?: string
  iframeBlocked?: boolean
}

type CacheEntry = { value: UrlMetadataResponse; expiresAt: number }
const metadataCache = new Map<string, CacheEntry>()
const CACHE_TTL_MS = 1000 * 60 * 60 * 24 // 24h
const MAX_HTML_BYTES = 512 * 1024 // 512KB
const MAX_REDIRECTS = 5

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

function normalizeKey(url: string): string {
  // Keep keys stable across minor URL variations.
  try {
    const u = new URL(url)
    u.hash = ""
    // Keep query params — they often affect page content/og tags.
    return u.toString()
  } catch {
    return url
  }
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

function extractFirstMetaContent(html: string, candidates: Array<{ attr: "name" | "property"; key: string }>) {
  for (const c of candidates) {
    // Support both content-first and content-last attribute orderings.
    const re1 = new RegExp(
      `<meta[^>]*${c.attr}=["']${c.key.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}["'][^>]*content=["']([^"']+)["'][^>]*>`,
      "i",
    )
    const re2 = new RegExp(
      `<meta[^>]*content=["']([^"']+)["'][^>]*${c.attr}=["']${c.key.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}["'][^>]*>`,
      "i",
    )
    const m = html.match(re1) ?? html.match(re2)
    const v = m?.[1]?.trim()
    if (v) return v
  }
  return undefined
}

function resolveUrl(base: URL, href: string): string | undefined {
  const raw = href.trim()
  if (!raw) return undefined
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw
  if (raw.startsWith("//")) return `${base.protocol}${raw}`
  try {
    return new URL(raw, base).toString()
  } catch {
    return undefined
  }
}

function concatUint8Arrays(chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((acc, c) => acc + c.byteLength, 0)
  const out = new Uint8Array(total)
  let offset = 0
  for (const c of chunks) {
    out.set(c, offset)
    offset += c.byteLength
  }
  return out
}

async function readTextUpToSafe(res: Response, maxBytes: number): Promise<string> {
  if (!res.body) return await res.text()
  const reader = res.body.getReader()
  const chunks: Uint8Array[] = []
  let received = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    if (!value) continue
    const next = received + value.byteLength
    if (next > maxBytes) {
      chunks.push(value.slice(0, Math.max(0, maxBytes - received)))
      break
    }
    chunks.push(value)
    received = next
    if (received >= maxBytes) break
  }
  try {
    reader.cancel().catch(() => {})
  } catch {
    // ignore
  }
  const bytes = concatUint8Arrays(chunks)
  return new TextDecoder("utf-8", { fatal: false }).decode(bytes)
}

async function fetchWithSafeRedirects(startUrl: URL, signal: AbortSignal): Promise<{ res: Response; finalUrl: URL }> {
  let current = startUrl
  for (let i = 0; i <= MAX_REDIRECTS; i++) {
    if (isPrivateOrLocalHost(current.hostname)) {
      throw new Error("URL host is not allowed")
    }

    const res = await fetch(current.toString(), {
      signal,
      redirect: "manual",
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; CuratorBot/1.0; +https://curator)",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
    })

    const status = res.status
    const location = res.headers.get("location")
    const isRedirect = status >= 300 && status < 400
    if (isRedirect && location) {
      const next = new URL(location, current)
      current = next
      continue
    }

    return { res, finalUrl: current }
  }
  throw new Error("Too many redirects")
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

    const cacheKey = normalizeKey(parsedUrl.toString())
    const now = Date.now()
    const cached = metadataCache.get(cacheKey)
    if (cached && cached.expiresAt > now) {
      return NextResponse.json(cached.value, {
        headers: {
          "Cache-Control": "public, max-age=0, s-maxage=86400, stale-while-revalidate=604800",
        },
      })
    }

    // Fetch the page to extract metadata
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 12000)

    let title: string | undefined
    let description: string | undefined
    let favicon: string | undefined
    let iframeBlocked = false
    let domain = parsedUrl.hostname

    try {
      const { res, finalUrl } = await fetchWithSafeRedirects(parsedUrl, controller.signal)
      clearTimeout(timeout)
      domain = finalUrl.hostname
      iframeBlocked = isLikelyIframeBlocked(res)

      const contentType = res.headers.get("content-type")?.toLowerCase() ?? ""
      if (!contentType.includes("text/html") && !contentType.includes("application/xhtml+xml")) {
        // Still return favicon/domain so UI has something stable.
        favicon = `${finalUrl.origin}/favicon.ico`
        const value: UrlMetadataResponse = { title, description, favicon, domain, iframeBlocked }
        metadataCache.set(cacheKey, { value, expiresAt: now + CACHE_TTL_MS })
        return NextResponse.json(value, {
          headers: {
            "Cache-Control": "public, max-age=0, s-maxage=86400, stale-while-revalidate=604800",
          },
        })
      }

      const html = await readTextUpToSafe(res, MAX_HTML_BYTES)

      // Extract title
      title =
        extractFirstMetaContent(html, [
          { attr: "property", key: "og:title" },
          { attr: "name", key: "twitter:title" },
        ]) ??
        (() => {
          const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
          return titleMatch?.[1]?.trim()
        })() ??
        undefined

      // Extract description
      description =
        extractFirstMetaContent(html, [
          { attr: "property", key: "og:description" },
          { attr: "name", key: "twitter:description" },
          { attr: "name", key: "description" },
        ]) ?? undefined

      // Extract favicon
      const faviconHref =
        html.match(/<link[^>]*rel=["'][^"']*(?:icon|shortcut icon|apple-touch-icon)[^"']*["'][^>]*href=["']([^"']+)["']/i)?.[1] ??
        html.match(/<link[^>]*href=["']([^"']+)["'][^>]*rel=["'][^"']*(?:icon|shortcut icon|apple-touch-icon)[^"']*["']/i)?.[1] ??
        undefined
      favicon = faviconHref ? resolveUrl(finalUrl, faviconHref) : `${finalUrl.origin}/favicon.ico`
    } catch {
      clearTimeout(timeout)
      favicon = `${parsedUrl.origin}/favicon.ico`
    }

    const value: UrlMetadataResponse = { title, description, favicon, domain, iframeBlocked }
    metadataCache.set(cacheKey, { value, expiresAt: now + CACHE_TTL_MS })

    return NextResponse.json(value, {
      headers: {
        "Cache-Control": "public, max-age=0, s-maxage=86400, stale-while-revalidate=604800",
      },
    })
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 })
  }
}
