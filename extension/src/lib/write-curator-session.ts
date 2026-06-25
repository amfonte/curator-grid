import { validateStoredSession, getSupabaseClient } from "./auth"
import { API_BASE_URL } from "./config"
import { getAuthStorageKey, isChunkLike } from "./read-curator-session"

const BASE64_PREFIX = "base64-"
const MAX_CHUNK_SIZE = 3180
const COOKIE_MAX_AGE_SECONDS = 400 * 24 * 60 * 60

function stringToBase64URL(value: string): string {
  const bytes = new TextEncoder().encode(value)
  let binary = ""
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

function createChunks(key: string, value: string): { name: string; value: string }[] {
  let encodedValue = encodeURIComponent(value)
  if (encodedValue.length <= MAX_CHUNK_SIZE) {
    return [{ name: key, value }]
  }

  const chunks: string[] = []
  while (encodedValue.length > 0) {
    let encodedChunkHead = encodedValue.slice(0, MAX_CHUNK_SIZE)
    const lastEscapePos = encodedChunkHead.lastIndexOf("%")
    if (lastEscapePos > MAX_CHUNK_SIZE - 3) {
      encodedChunkHead = encodedChunkHead.slice(0, lastEscapePos)
    }

    let valueHead = ""
    while (encodedChunkHead.length > 0) {
      try {
        valueHead = decodeURIComponent(encodedChunkHead)
        break
      } catch (error) {
        if (
          error instanceof URIError &&
          encodedChunkHead.at(-3) === "%" &&
          encodedChunkHead.length > 3
        ) {
          encodedChunkHead = encodedChunkHead.slice(0, encodedChunkHead.length - 3)
        } else {
          throw error
        }
      }
    }

    chunks.push(valueHead)
    encodedValue = encodedValue.slice(encodedChunkHead.length)
  }

  return chunks.map((chunkValue, index) => ({
    name: `${key}.${index}`,
    value: chunkValue,
  }))
}

async function getSessionJsonForCookies(): Promise<string | null> {
  const storageKey = getAuthStorageKey()
  const stored = await chrome.storage.local.get(storageKey)
  if (stored[storageKey]) {
    return stored[storageKey] as string
  }

  const validated = await validateStoredSession()
  if (!validated) return null

  const supabase = getSupabaseClient()
  const { error } = await supabase.auth.setSession({
    access_token: validated.access_token,
    refresh_token: validated.refresh_token,
  })
  if (error) return null

  const { data } = await supabase.auth.getSession()
  if (!data.session) return null

  return JSON.stringify(data.session)
}

async function clearAuthCookies(origin: string, storageKey: string): Promise<void> {
  const cookies = await chrome.cookies.getAll({ url: origin })
  for (const cookie of cookies) {
    if (isChunkLike(cookie.name, storageKey)) {
      await chrome.cookies.remove({ url: origin, name: cookie.name })
    }
  }
}

/** Write the extension session into Curator web app cookies so a new tab opens signed in. */
export async function writeSessionToCuratorCookies(): Promise<boolean> {
  const sessionJson = await getSessionJsonForCookies()
  if (!sessionJson) return false

  const origin = new URL(API_BASE_URL).origin
  const storageKey = getAuthStorageKey()
  const encoded = `${BASE64_PREFIX}${stringToBase64URL(sessionJson)}`
  const chunks = createChunks(storageKey, encoded)

  await clearAuthCookies(origin, storageKey)

  const expirationDate = Math.floor(Date.now() / 1000) + COOKIE_MAX_AGE_SECONDS
  const secure = origin.startsWith("https://")

  for (const chunk of chunks) {
    const setResult = await chrome.cookies.set({
      url: origin,
      name: chunk.name,
      value: chunk.value,
      path: "/",
      secure,
      sameSite: "lax",
      expirationDate,
    })

    if (!setResult) return false
  }

  return true
}
