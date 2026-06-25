import sharp from "sharp"
import type { SupabaseClient, User } from "@supabase/supabase-js"

const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"])

const MAX_DIMENSION = 1920
const WEBP_QUALITY = 85

export type CreateImageItemResult = {
  id: string
  type: "image"
  file_url: string
  title: string | null
}

function sanitizeStorageName(rawName: string): string {
  return (
    rawName
      .replace(/\.[^.]+$/, "")
      .replace(/\s+/g, "-")
      .replace(/[^a-zA-Z0-9._-]/g, "")
      .slice(0, 80) || "image"
  )
}

function titleFromFilename(filename: string): string {
  const base = filename.replace(/\.[^.]+$/, "").trim()
  return base || "Image"
}

async function compressImage(
  file: File,
): Promise<{ buffer: Buffer; width: number; height: number }> {
  const inputBuffer = Buffer.from(await file.arrayBuffer())
  const { data, info } = await sharp(inputBuffer)
    .rotate()
    .resize(MAX_DIMENSION, MAX_DIMENSION, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: WEBP_QUALITY })
    .toBuffer({ resolveWithObject: true })

  return { buffer: data, width: info.width, height: info.height }
}

export async function createImageItem({
  file,
  title,
  boardId,
  supabase,
  user,
}: {
  file: File
  title?: string | null
  boardId?: string | null
  supabase: SupabaseClient
  user: User
}): Promise<CreateImageItemResult> {
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    throw new Error("Unsupported image format. Use JPEG, PNG, or WebP.")
  }

  const { buffer, width, height } = await compressImage(file)

  const safeName = sanitizeStorageName(file.name || "image.webp")
  const fileName = `${user.id}/${Date.now()}-${safeName}.webp`

  const { error: uploadError } = await supabase.storage
    .from("images")
    .upload(fileName, buffer, { contentType: "image/webp" })

  if (uploadError) throw uploadError

  const {
    data: { publicUrl },
  } = supabase.storage.from("images").getPublicUrl(fileName)

  const resolvedTitle = title?.trim() || titleFromFilename(file.name)

  const { data: item, error: insertError } = await supabase
    .from("items")
    .insert({
      user_id: user.id,
      type: "image",
      file_url: publicUrl,
      file_size: buffer.length,
      mime_type: "image/webp",
      width,
      height,
      title: resolvedTitle,
      notes: null,
    })
    .select("id, type, file_url, title")
    .single()

  if (insertError) throw insertError

  if (boardId) {
    const { error: linkError } = await supabase.from("item_boards").insert({
      item_id: item.id,
      board_id: boardId,
    })
    if (linkError) throw linkError
  }

  return item
}
