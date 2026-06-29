import {
  signInWithPassword,
  signOutExtension,
  validateStoredSession,
} from "../lib/auth"
import { fetchBoards, saveImage, saveUrl } from "../lib/api"
import { fetchImageBlob, sourceNameFromImageUrl } from "../lib/fetch-image"
import { buildExtensionBridgeUrl } from "../lib/curator-bridge"
import { curatorWebUrl, isCuratorOrigin } from "../lib/config"
import {
  connectSessionFromCuratorCookies,
  getOpenCuratorTabAuthState,
} from "../lib/read-curator-session"
import { getStoredSession } from "../lib/session"
import { getSessionSource, setSessionSource } from "../lib/session-source"
import { writeSessionToCuratorCookies } from "../lib/write-curator-session"
import {
  markAllOpenCuratorTabsInstalled,
  markCuratorTabInstalled,
} from "../lib/mark-curator-page-installed"
import type {
  AuthState,
  BackgroundRequest,
  MessageResponse,
} from "../lib/messaging"

async function getAuthState(): Promise<AuthState> {
  const openCuratorAuth = await getOpenCuratorTabAuthState()

  // Prefer a live session from an open, signed-in Curator tab.
  if (openCuratorAuth === "logged-in") {
    const cookieSession = await connectSessionFromCuratorCookies()
    if (cookieSession) {
      await setSessionSource("curator-tab")
      return { status: "authenticated", session: cookieSession }
    }
  }

  if (openCuratorAuth === "logged-out") {
    const source = await getSessionSource()
    if (source === "curator-tab") {
      await signOutExtension()
      return { status: "unauthenticated" }
    }
  }

  const validated = await validateStoredSession()
  if (validated) {
    return { status: "authenticated", session: validated }
  }

  return { status: "unauthenticated" }
}

async function connectFromCuratorTab(): Promise<{ connected: boolean; session?: NonNullable<Awaited<ReturnType<typeof validateStoredSession>>> }> {
  const authState = await getAuthState()
  if (authState.status === "authenticated") {
    return { connected: true, session: authState.session }
  }

  return { connected: false }
}

async function getActiveTabInfo(): Promise<{ url: string; title: string }> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  return {
    url: tab?.url ?? "",
    title: tab?.title ?? "",
  }
}

function success<T>(data: T): MessageResponse<T> {
  return { ok: true, data }
}

function failure(error: string): MessageResponse<never> {
  return { ok: false, error }
}

chrome.runtime.onMessage.addListener((message: BackgroundRequest, sender, sendResponse) => {
  void (async () => {
    try {
      switch (message.type) {
        case "GET_AUTH_STATE": {
          sendResponse(success(await getAuthState()))
          break
        }
        case "GET_CURATOR_TAB_AUTH": {
          sendResponse(success({ state: await getOpenCuratorTabAuthState() }))
          break
        }
        case "CONNECT_FROM_TAB": {
          sendResponse(success(await connectFromCuratorTab()))
          break
        }
        case "SIGN_IN": {
          const result = await signInWithPassword(message.email, message.password)
          if ("error" in result) {
            sendResponse(failure(result.error))
          } else {
            sendResponse(success({ session: result.session }))
          }
          break
        }
        case "SIGN_OUT": {
          await signOutExtension()
          sendResponse(success({ signedOut: true }))
          break
        }
        case "GET_BOARDS": {
          const boards = await fetchBoards()
          sendResponse(success({ boards }))
          break
        }
        case "GET_TAB_URL": {
          sendResponse(success(await getActiveTabInfo()))
          break
        }
        case "SAVE_URL": {
          const item = await saveUrl({
            url: message.url,
            viewport: message.viewport,
            boardId: message.boardId,
            tabTitle: message.tabTitle,
          })
          sendResponse(success({ item }))
          break
        }
        case "SAVE_IMAGE": {
          const { blob, filename } = await fetchImageBlob(message.imageUrl)
          const item = await saveImage({
            file: blob,
            filename,
            boardId: message.boardId,
            sourceName: message.sourceName ?? sourceNameFromImageUrl(message.imageUrl),
          })
          sendResponse(success({ item }))
          break
        }
        case "OPEN_CURATOR_SIGNED_IN": {
          const path = message.path.startsWith("/") ? message.path : `/${message.path}`
          const destinationUrl = curatorWebUrl(path)
          const webAuth = await getOpenCuratorTabAuthState()

          if (webAuth === "logged-in") {
            await chrome.tabs.create({ url: destinationUrl })
            sendResponse(success({ opened: true }))
            break
          }

          const session = await validateStoredSession()
          if (session && await writeSessionToCuratorCookies()) {
            await chrome.tabs.create({ url: destinationUrl })
            sendResponse(success({ opened: true }))
            break
          }

          const stored = await getStoredSession()
          const url = stored ? buildExtensionBridgeUrl(path, stored) : destinationUrl
          await chrome.tabs.create({ url })
          sendResponse(success({ opened: true }))
          break
        }
        case "MARK_CURATOR_PAGE_INSTALLED": {
          const tabId = sender.tab?.id
          if (tabId != null && sender.tab.url && isCuratorOrigin(sender.tab.url)) {
            await markCuratorTabInstalled(tabId)
          }
          sendResponse(success({ marked: true }))
          break
        }
        default:
          sendResponse(failure("Unknown message type"))
      }
    } catch (err) {
      sendResponse(failure(err instanceof Error ? err.message : "Unexpected error"))
    }
  })()

  return true
})

chrome.runtime.onInstalled.addListener(() => {
  void markAllOpenCuratorTabsInstalled()
})

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id) return
  await chrome.tabs.sendMessage(tab.id, { type: "TOGGLE_PANEL" }).catch(async () => {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id! },
      files: ["src/content/index.ts"],
    })
    await chrome.tabs.sendMessage(tab.id!, { type: "TOGGLE_PANEL" })
  })
})

// Allow content script on Curator tabs to expose session without full panel open
chrome.tabs.onUpdated.addListener((_tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.url && isCuratorOrigin(tab.url)) {
    // No-op for now — connect runs on demand when panel opens
  }
})

export {}
