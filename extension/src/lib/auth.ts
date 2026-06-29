import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./config"
import {
  clearStoredSession,
  getStoredSession,
  isSessionValid,
  sessionFromSupabase,
  setStoredSession,
  type StoredSession,
} from "./session"
import { clearSessionSource, setSessionSource } from "./session-source"
import { clearCachedBoards } from "./boards-cache"

function createChromeStorageAdapter() {
  return {
    getItem: async (key: string) => {
      const result = await chrome.storage.local.get(key)
      return (result[key] as string | undefined) ?? null
    },
    setItem: async (key: string, value: string) => {
      await chrome.storage.local.set({ [key]: value })
    },
    removeItem: async (key: string) => {
      await chrome.storage.local.remove(key)
    },
  }
}

let supabaseClient: SupabaseClient | null = null

export function getSupabaseClient(): SupabaseClient {
  if (!supabaseClient) {
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        storage: createChromeStorageAdapter(),
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    })
  }
  return supabaseClient
}

export async function getValidAccessToken(): Promise<string | null> {
  const stored = await getStoredSession()
  if (!stored) return null

  if (isSessionValid(stored)) {
    return stored.access_token
  }

  const supabase = getSupabaseClient()
  const { data, error } = await supabase.auth.setSession({
    access_token: stored.access_token,
    refresh_token: stored.refresh_token,
  })

  if (error || !data.session) return null

  const refreshed = sessionFromSupabase(data.session)
  await setStoredSession(refreshed)
  return refreshed.access_token
}

/** Confirm extension storage still matches a live Supabase session. */
export async function validateStoredSession(): Promise<StoredSession | null> {
  const stored = await getStoredSession()
  if (!stored) return null

  const supabase = getSupabaseClient()

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(stored.access_token)

  if (!error && user) {
    return stored
  }

  const { data, error: refreshError } = await supabase.auth.setSession({
    access_token: stored.access_token,
    refresh_token: stored.refresh_token,
  })

  if (refreshError || !data.session) {
    await clearStoredSession()
    return null
  }

  const refreshed = sessionFromSupabase(data.session)
  await setStoredSession(refreshed)
  return refreshed
}

export async function signInWithPassword(
  email: string,
  password: string,
): Promise<{ session: StoredSession } | { error: string }> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error || !data.session) {
    return { error: error?.message ?? "Sign in failed" }
  }

  const session = sessionFromSupabase(data.session)
  await setStoredSession(session)
  await setSessionSource("native")
  return { session }
}

export async function signOutExtension(): Promise<void> {
  await clearStoredSession()
  await clearSessionSource()
  await clearCachedBoards()
}

export async function persistSessionFromRaw(rawSessionJson: string): Promise<StoredSession | null> {
  try {
    const parsed = JSON.parse(rawSessionJson) as {
      access_token?: string
      refresh_token?: string
      expires_at?: number
      user?: { id: string; email?: string }
    }

    if (!parsed.access_token || !parsed.refresh_token || !parsed.user?.id) {
      return null
    }

    const session: StoredSession = {
      access_token: parsed.access_token,
      refresh_token: parsed.refresh_token,
      expires_at: parsed.expires_at ?? 0,
      user: {
        id: parsed.user.id,
        email: parsed.user.email,
      },
    }

    await setStoredSession(session)
    return session
  } catch {
    return null
  }
}

export {}
