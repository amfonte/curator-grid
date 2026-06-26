import { NextResponse } from "next/server"
import { extensionUnauthorized, getExtensionAuth } from "@/lib/extension/auth"
import { createImageItem, toErrorMessage } from "@/lib/images/create-image-item"

export const maxDuration = 60

export async function POST(request: Request) {
  const auth = await getExtensionAuth(request)
  if (!auth) return extensionUnauthorized()

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 })
  }

  const fileEntry = formData.get("file")
  const boardId = formData.get("boardId")
  const sourceName = formData.get("sourceName")

  if (!(fileEntry instanceof File) || fileEntry.size === 0) {
    return NextResponse.json({ error: "Image file is required" }, { status: 400 })
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

  const title =
    typeof sourceName === "string" && sourceName.trim() ? sourceName.trim() : undefined

  try {
    const item = await createImageItem({
      file: fileEntry,
      title,
      boardId,
      supabase: auth.supabase,
      user: auth.user,
    })

    return NextResponse.json({ item })
  } catch (err) {
    const message = toErrorMessage(err)
    console.error("[extension/save-image]", message, err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
