const SESSION_SOURCE_KEY = "curator_extension_session_source"

export type SessionSource = "native" | "curator-tab"

export async function getSessionSource(): Promise<SessionSource | null> {
  const result = await chrome.storage.local.get(SESSION_SOURCE_KEY)
  const value = result[SESSION_SOURCE_KEY]
  return value === "native" || value === "curator-tab" ? value : null
}

export async function setSessionSource(source: SessionSource): Promise<void> {
  await chrome.storage.local.set({ [SESSION_SOURCE_KEY]: source })
}

export async function clearSessionSource(): Promise<void> {
  await chrome.storage.local.remove(SESSION_SOURCE_KEY)
}
