import { filenameFromImageUrl } from "./image-url"

const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"])

function guessFilename(url: string, contentType: string | null): string {
  const fromUrl = filenameFromImageUrl(url)
  if (fromUrl !== "image") return fromUrl

  if (contentType === "image/png") return "image.png"
  if (contentType === "image/webp") return "image.webp"
  return "image.jpg"
}

function titleFromFilename(filename: string): string {
  return filename.replace(/\.[^.]+$/, "").trim() || "Image"
}

export async function fetchImageBlob(imageUrl: string): Promise<{ blob: Blob; filename: string }> {
  const response = await fetch(imageUrl)
  if (!response.ok) {
    throw new Error(`Could not download image (${response.status})`)
  }

  const blob = await response.blob()
  const contentType = blob.type || response.headers.get("content-type") || ""

  if (contentType && !contentType.startsWith("image/")) {
    throw new Error("Downloaded file is not an image")
  }

  if (contentType && !ALLOWED_IMAGE_TYPES.has(contentType)) {
    throw new Error("Unsupported image format. Use JPEG, PNG, or WebP.")
  }

  return {
    blob,
    filename: guessFilename(imageUrl, contentType),
  }
}

export function sourceNameFromImageUrl(imageUrl: string): string {
  return titleFromFilename(filenameFromImageUrl(imageUrl))
}
