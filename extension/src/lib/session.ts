import type { Session } from "@supabase/supabase-js"
import { SESSION_STORAGE_KEY } from "./config"

export type StoredSession = {
  access_token: string
  refresh_token: string
  expires_at: number
  user: {
    id: string
    email?: string
  }
}

export function sessionFromSupabase(session: Session): StoredSession {
  return {
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_at: session.expires_at ?? 0,
    user: {
      id: session.user.id,
      email: session.user.email,
    },
  }
}

export function parseStoredSession(raw: string | null | undefined): StoredSession | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as StoredSession
    if (!parsed.access_token || !parsed.refresh_token) return null
    return parsed
  } catch {
    return null
  }
}

export async function getStoredSession(): Promise<StoredSession | null> {
  const result = await chrome.storage.local.get(SESSION_STORAGE_KEY)
  return parseStoredSession(result[SESSION_STORAGE_KEY] as string | undefined)
}

export async function setStoredSession(session: StoredSession): Promise<void> {
  await chrome.storage.local.set({
    [SESSION_STORAGE_KEY]: JSON.stringify(session),
  })
}

export async function clearStoredSession(): Promise<void> {
  await chrome.storage.local.remove(SESSION_STORAGE_KEY)
}

export function isSessionValid(session: StoredSession): boolean {
  const now = Math.floor(Date.now() / 1000)
  // Treat as valid if expiry is more than 60s away, or missing (will refresh)
  return !session.expires_at || session.expires_at > now + 60
}
