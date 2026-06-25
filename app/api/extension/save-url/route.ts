import { NextResponse } from "next/server"
import { extensionUnauthorized, getExtensionAuth } from "@/lib/extension/auth"

const VALID_VIEWPORTS = new Set(["desktop", "tablet", "mobile"])

type SaveUrlBody = {
  url?: string
  viewport?: string
  boardId?: string | null
  tabTitle?: string
}

type UrlMetadata = {
  title?: string
  description?: string
  favicon?: string
  domain?: string
  iframeBlocked?: boolean
}

function normalizeUrl(url: string): string {
  const trimmed = url.trim()
  if (!trimmed) return trimmed
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
}

function isSaveableUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === "http:" || parsed.protocol === "https:"
  } catch {
    return false
  }
}

export async function POST(request: Request) {
  const auth = await getExtensionAuth(request)
  if (!auth) return extensionUnauthorized()

  let body: SaveUrlBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const { url: rawUrl, viewport = "desktop", boardId, tabTitle } = body

  if (!rawUrl || typeof rawUrl !== "string") {
    return NextResponse.json({ error: "URL is required" }, { status: 400 })
  }

  const normalizedUrl = normalizeUrl(rawUrl)
  if (!isSaveableUrl(normalizedUrl)) {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 })
  }

  if (!VALID_VIEWPORTS.has(viewport)) {
    return NextResponse.json({ error: "Invalid viewport" }, { status: 400 })
  }

  if (!boardId || typeof boardId !== "string") {
    return NextResponse.json({ error: "Collection is required" }, { status: 400 })
  }

  const { data: board, error: boardError } = await auth.supabase
    .from("boards")
    .select("id")
    .eq("id", boardId)
    .eq("user_id", auth.user.id)
    .maybeSingle()

  if (boardError) {
    return NextResponse.json({ error: boardError.message }, { status: 500 })
  }

  if (!board) {
    return NextResponse.json({ error: "Collection not found" }, { status: 404 })
  }

  let metadata: UrlMetadata = {}
  try {
    const origin = new URL(request.url).origin
    const metadataRes = await fetch(`${origin}/api/metadata`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: normalizedUrl }),
    })
    if (metadataRes.ok) {
      metadata = (await metadataRes.json()) as UrlMetadata
    }
  } catch {
    // Metadata extraction failed; continue with tab title fallback.
  }

  const title =
    metadata.title ||
    (typeof tabTitle === "string" && tabTitle.trim() ? tabTitle.trim() : null)

  const { data: item, error: insertError } = await auth.supabase
    .from("items")
    .insert({
      user_id: auth.user.id,
      type: "url",
      original_url: normalizedUrl,
      viewport_size: viewport,
      title,
      description: metadata.description || null,
      favicon_url: metadata.favicon || null,
      domain: metadata.domain || null,
      iframe_blocked: metadata.iframeBlocked ?? false,
      notes: null,
    })
    .select("id, type, original_url, title")
    .single()

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  const { error: linkError } = await auth.supabase.from("item_boards").insert({
    item_id: item.id,
    board_id: boardId,
  })

  if (linkError) {
    return NextResponse.json({ error: linkError.message }, { status: 500 })
  }

  return NextResponse.json({ item })
}
