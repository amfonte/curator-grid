import { API_BASE_URL } from "./config"
import { getValidAccessToken } from "./auth"
import type { ExtensionBoard } from "./messaging"
import { normalizeUrl } from "./url"
import type { ViewportSize } from "./viewports"

export type UrlMetadata = {
  title?: string
  description?: string
  favicon?: string
  domain?: string
  iframeBlocked?: boolean
}

export type SavedUrlItem = {
  id: string
  type: "url"
  original_url: string
  title: string | null
}

export type SavedImageItem = {
  id: string
  type: "image"
  file_url: string
  title: string | null
}

export async function fetchBoards(): Promise<ExtensionBoard[]> {
  const token = await getValidAccessToken()
  if (!token) {
    throw new Error("Not authenticated")
  }

  const response = await fetch(`${API_BASE_URL}/api/extension/boards`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null
    throw new Error(body?.error ?? `Failed to load collections (${response.status})`)
  }

  const data = (await response.json()) as { boards: ExtensionBoard[] }
  return data.boards
}

export async function fetchUrlMetadata(url: string): Promise<UrlMetadata> {
  const normalizedUrl = normalizeUrl(url)
  if (!normalizedUrl) return {}

  const response = await fetch(`${API_BASE_URL}/api/metadata`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: normalizedUrl }),
  })

  if (!response.ok) return {}
  return (await response.json()) as UrlMetadata
}

export async function saveUrl(params: {
  url: string
  viewport: ViewportSize
  boardId: string
  tabTitle?: string
}): Promise<SavedUrlItem> {
  const token = await getValidAccessToken()
  if (!token) {
    throw new Error("Not authenticated")
  }

  const response = await fetch(`${API_BASE_URL}/api/extension/save-url`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url: params.url,
      viewport: params.viewport,
      boardId: params.boardId,
      tabTitle: params.tabTitle,
    }),
  })

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null
    throw new Error(body?.error ?? `Failed to save URL (${response.status})`)
  }

  const data = (await response.json()) as { item: SavedUrlItem }
  return data.item
}

export async function saveImage(params: {
  file: Blob
  filename: string
  boardId: string
  sourceName?: string
}): Promise<SavedImageItem> {
  const token = await getValidAccessToken()
  if (!token) {
    throw new Error("Not authenticated")
  }

  const formData = new FormData()
  formData.append("file", params.file, params.filename)
  formData.append("boardId", params.boardId)
  if (params.sourceName) {
    formData.append("sourceName", params.sourceName)
  }

  const response = await fetch(`${API_BASE_URL}/api/extension/save-image`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  })

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null
    throw new Error(body?.error ?? `Failed to save image (${response.status})`)
  }

  const data = (await response.json()) as { item: SavedImageItem }
  return data.item
}
