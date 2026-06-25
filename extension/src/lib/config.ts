/** Curator app origins used for connect-from-tab auth. */
const LOCAL_DEV_ORIGINS = ["http://127.0.0.1:3000", "http://localhost:3000"] as const

function parseOrigin(url: string): string | null {
  try {
    return new URL(url).origin
  } catch {
    return null
  }
}

function uniqueOrigins(origins: readonly (string | null | undefined)[]): readonly string[] {
  return [...new Set(origins.filter((origin): origin is string => Boolean(origin)))]
}

export const API_BASE_URL =
  import.meta.env.VITE_CURATOR_API_URL ?? "http://127.0.0.1:3000"

const configuredOrigin = parseOrigin(API_BASE_URL)

/** Includes localhost for dev plus the origin from `VITE_CURATOR_API_URL` at build time. */
export const CURATOR_ORIGINS = uniqueOrigins([...LOCAL_DEV_ORIGINS, configuredOrigin])

export const CURATOR_ORIGIN_PATTERNS = CURATOR_ORIGINS.map(
  (origin) => `${origin}/*`,
) as readonly string[]

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export const SESSION_STORAGE_KEY = "curator_extension_session"

export function curatorWebUrl(path: string): string {
  const base = API_BASE_URL.replace(/\/$/, "")
  return `${base}${path.startsWith("/") ? path : `/${path}`}`
}

export function isCuratorOrigin(url: string): boolean {
  try {
    const origin = new URL(url).origin
    return (CURATOR_ORIGINS as readonly string[]).includes(origin)
  } catch {
    return false
  }
}
