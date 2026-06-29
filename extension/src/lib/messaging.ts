import type { SavedUrlItem, SavedImageItem } from "./api"
import type { StoredSession } from "./session"
import type { ViewportSize } from "./viewports"

export type ExtensionBoard = {
  id: string
  name: string
}

export type PanelTab = "url" | "image"

export type MessageResponse<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string }

export type BackgroundRequest =
  | { type: "GET_AUTH_STATE" }
  | { type: "GET_CURATOR_TAB_AUTH" }
  | { type: "CONNECT_FROM_TAB" }
  | { type: "SIGN_IN"; email: string; password: string }
  | { type: "SIGN_OUT" }
  | { type: "GET_BOARDS" }
  | { type: "GET_TAB_URL" }
  | {
      type: "SAVE_URL"
      url: string
      viewport: ViewportSize
      boardId: string
      tabTitle?: string
    }
  | {
      type: "SAVE_IMAGE"
      imageUrl: string
      boardId: string
      sourceName?: string
    }
  | { type: "OPEN_CURATOR_SIGNED_IN"; path: string }
  | { type: "MARK_CURATOR_PAGE_INSTALLED" }

export type AuthState =
  | { status: "authenticated"; session: StoredSession }
  | { status: "unauthenticated" }

export type BackgroundResponseMap = {
  GET_AUTH_STATE: AuthState
  GET_CURATOR_TAB_AUTH: { state: "logged-in" | "logged-out" | null }
  CONNECT_FROM_TAB: { connected: boolean; session?: StoredSession }
  SIGN_IN: { session: StoredSession }
  SIGN_OUT: { signedOut: true }
  GET_BOARDS: { boards: ExtensionBoard[] }
  GET_TAB_URL: { url: string; title: string }
  SAVE_URL: { item: SavedUrlItem }
  SAVE_IMAGE: { item: SavedImageItem }
  OPEN_CURATOR_SIGNED_IN: { opened: true }
  MARK_CURATOR_PAGE_INSTALLED: { marked: true }
}

export function sendBackgroundMessage<T extends BackgroundRequest["type"]>(
  message: Extract<BackgroundRequest, { type: T }>,
): Promise<MessageResponse<BackgroundResponseMap[T]>> {
  return chrome.runtime.sendMessage(message)
}

export const CONTENT_TOGGLE_PANEL = "curator-extension:toggle-panel" as const
export const CONTENT_CLOSE_PANEL = "curator-extension:close-panel" as const
