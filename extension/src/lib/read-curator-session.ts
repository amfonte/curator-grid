import { CURATOR_ORIGINS, SUPABASE_URL, isCuratorOrigin } from "./config"
import { persistSessionFromRaw } from "./auth"
import type { StoredSession } from "./session"

const BASE64_PREFIX = "base64-"

export function getAuthStorageKey(): string {
  const projectRef = new URL(SUPABASE_URL).hostname.split(".")[0]
  return `sb-${projectRef}-auth-token`
}

export async function getOpenCuratorOrigins(): Promise<string[]> {
  const tabs = await chrome.tabs.query({})
  const origins = new Set<string>()
  for (const tab of tabs) {
    if (tab.url && isCuratorOrigin(tab.url)) {
      origins.add(new URL(tab.url).origin)
    }
  }
  return [...origins]
}

async function readAuthCookiesForOrigin(origin: string): Promise<StoredSession | null> {
  const storageKey = getAuthStorageKey()
  const cookies = await chrome.cookies.getAll({ url: origin })
  const authCookies = cookies.filter((cookie) => isChunkLike(cookie.name, storageKey))
  if (authCookies.length === 0) return null

  const combined = combineChunkValues(storageKey, cookies)
  if (!combined) return null

  const sessionJson = decodeSupabaseCookieValue(combined)
  if (!sessionJson) return null

  return persistSessionFromRaw(sessionJson)
}

/**
 * When a Curator tab is open, report whether the web app is signed in there.
 * Returns null if no Curator tab is open (unknown).
 */
export async function getOpenCuratorTabAuthState(): Promise<"logged-in" | "logged-out" | null> {
  const openOrigins = await getOpenCuratorOrigins()
  if (openOrigins.length === 0) return null

  const storageKey = getAuthStorageKey()
  for (const origin of openOrigins) {
    const cookies = await chrome.cookies.getAll({ url: origin })
    if (cookies.some((cookie) => isChunkLike(cookie.name, storageKey))) {
      return "logged-in"
    }
  }

  return "logged-out"
}

export function isChunkLike(cookieName: string, key: string): boolean {
  if (cookieName === key) return true
  const match = cookieName.match(/^(.*)[.](0|[1-9][0-9]*)$/)
  return match !== null && match[1] === key
}

function combineChunkValues(
  key: string,
  cookies: chrome.cookies.Cookie[],
): string | null {
  const getValue = (name: string) =>
    cookies.find((cookie) => cookie.name === name)?.value ?? null

  const single = getValue(key)
  if (single) return single

  const chunks: string[] = []
  for (let index = 0; ; index += 1) {
    const chunk = getValue(`${key}.${index}`)
    if (!chunk) break
    chunks.push(chunk)
  }

  return chunks.length > 0 ? chunks.join("") : null
}

function stringFromBase64URL(value: string): string {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/")
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4)
  const binary = atob(padded)
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

function decodeSupabaseCookieValue(value: string): string | null {
  const payload = value.startsWith(BASE64_PREFIX)
    ? stringFromBase64URL(value.slice(BASE64_PREFIX.length))
    : value

  try {
    JSON.parse(payload)
    return payload
  } catch {
    return null
  }
}

/** Read an existing Supabase session from Curator web app cookies. */
export async function connectSessionFromCuratorCookies(): Promise<StoredSession | null> {
  const openOrigins = await getOpenCuratorOrigins()
  const originsToCheck = openOrigins.length > 0 ? openOrigins : [...CURATOR_ORIGINS]

  for (const origin of originsToCheck) {
    const session = await readAuthCookiesForOrigin(origin)
    if (session) return session
  }

  return null
}
