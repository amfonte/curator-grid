export const MIN_IMAGE_DIMENSION_PX = 80

const ALLOWED_PROTOCOLS = new Set(["http:", "https:", "data:"])

export function parseSrcset(srcset: string): string | null {
  const candidates = srcset
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)

  if (candidates.length === 0) return null

  let bestUrl: string | null = null
  let bestScore = -1

  for (const candidate of candidates) {
    const parts = candidate.split(/\s+/)
    const url = parts[0]
    if (!url) continue

    let score = 1
    const descriptor = parts[1]
    if (descriptor?.endsWith("w")) {
      score = Number.parseInt(descriptor, 10) || score
    } else if (descriptor?.endsWith("x")) {
      score = Number.parseFloat(descriptor) * 1000 || score
    }

    if (score > bestScore) {
      bestScore = score
      bestUrl = url
    }
  }

  return bestUrl
}

export function resolveImageUrl(img: HTMLImageElement): string | null {
  const fromCurrentSrc = img.currentSrc?.trim()
  if (fromCurrentSrc && isAllowedImageUrl(fromCurrentSrc)) {
    return fromCurrentSrc
  }

  const fromSrcset = img.srcset ? parseSrcset(img.srcset) : null
  if (fromSrcset && isAllowedImageUrl(fromSrcset)) {
    return fromSrcset
  }

  const fromSrc = img.src?.trim()
  if (fromSrc && isAllowedImageUrl(fromSrc)) {
    return fromSrc
  }

  const pictureSource = img.closest("picture")?.querySelector("source[srcset]")
  if (pictureSource instanceof HTMLSourceElement && pictureSource.srcset) {
    const fromPicture = parseSrcset(pictureSource.srcset)
    if (fromPicture && isAllowedImageUrl(fromPicture)) {
      return fromPicture
    }
  }

  return null
}

export function isAllowedImageUrl(url: string): boolean {
  try {
    const parsed = new URL(url, window.location.href)
    return ALLOWED_PROTOCOLS.has(parsed.protocol)
  } catch {
    return false
  }
}

export function isSaveableImageElement(img: HTMLImageElement): boolean {
  const rect = img.getBoundingClientRect()
  if (rect.width < MIN_IMAGE_DIMENSION_PX || rect.height < MIN_IMAGE_DIMENSION_PX) {
    return false
  }

  return resolveImageUrl(img) != null
}

export function filenameFromImageUrl(url: string): string {
  try {
    const parsed = new URL(url)
    const segment = parsed.pathname.split("/").filter(Boolean).pop()
    if (segment) return decodeURIComponent(segment)
  } catch {
    // Fall through to default name.
  }
  return "image"
}
