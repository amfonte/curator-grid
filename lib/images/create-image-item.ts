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

function detectMimeType(buffer: Buffer, filename: string): string | null {
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return "image/jpeg"
  }

  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return "image/png"
  }

  if (
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "image/webp"
  }

  const lower = filename.toLowerCase()
  if (lower.endsWith(".png")) return "image/png"
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg"
  if (lower.endsWith(".webp")) return "image/webp"

  return null
}

function resolveMimeType(file: File, buffer: Buffer): string {
  if (file.type && ALLOWED_MIME_TYPES.has(file.type)) {
    return file.type
  }

  const detected = detectMimeType(buffer, file.name || "")
  if (detected) return detected

  throw new Error("Unsupported image format. Use JPEG, PNG, or WebP.")
}

function toErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  if (
    typeof err === "object" &&
    err !== null &&
    "message" in err &&
    typeof (err as { message: unknown }).message === "string"
  ) {
    return (err as { message: string }).message
  }
  return "Failed to save image"
}

async function compressImage(
  file: File,
): Promise<{ buffer: Buffer; width: number; height: number }> {
  const inputBuffer = Buffer.from(await file.arrayBuffer())
  resolveMimeType(file, inputBuffer)

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
  const { buffer, width, height } = await compressImage(file)

  const safeName = sanitizeStorageName(file.name || "image.webp")
  const fileName = `${user.id}/${Date.now()}-${safeName}.webp`

  const { error: uploadError } = await supabase.storage
    .from("images")
    .upload(fileName, buffer, { contentType: "image/webp" })

  if (uploadError) {
    throw new Error(uploadError.message)
  }

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

  if (insertError) {
    throw new Error(insertError.message)
  }

  if (boardId) {
    const { error: linkError } = await supabase.from("item_boards").insert({
      item_id: item.id,
      board_id: boardId,
    })
    if (linkError) {
      throw new Error(linkError.message)
    }
  }

  return item
}

export { toErrorMessage }
