export function normalizeUrl(url: string): string {
  const trimmed = url.trim()
  if (!trimmed) return trimmed
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
}

export function isSaveableTabUrl(url: string): boolean {
  try {
    const parsed = new URL(normalizeUrl(url))
    return parsed.protocol === "http:" || parsed.protocol === "https:"
  } catch {
    return false
  }
}
