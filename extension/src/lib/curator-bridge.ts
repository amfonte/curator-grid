import { curatorWebUrl } from "./config"
import type { StoredSession } from "./session"

export function buildExtensionBridgeUrl(path: string, session: StoredSession): string {
  const bridge = new URL(curatorWebUrl("/auth/extension-bridge"))
  bridge.searchParams.set("next", path.startsWith("/") ? path : `/${path}`)

  const hash = new URLSearchParams({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
  })

  return `${bridge.toString()}#${hash.toString()}`
}
