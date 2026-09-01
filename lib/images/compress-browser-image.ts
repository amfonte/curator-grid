import imageCompression from "browser-image-compression"

export async function compressBrowserImage(
  file: File,
  options: { maxSizeMB: number; maxWidthOrHeight: number },
): Promise<File> {
  // Main thread only. Web workers hang indefinitely in Cursor's in-IDE browser
  // (blob-worker URLs never resolve), which left Save stuck on "Saving...".
  return imageCompression(file, {
    maxSizeMB: options.maxSizeMB,
    maxWidthOrHeight: options.maxWidthOrHeight,
    fileType: "image/webp",
    useWebWorker: false,
  })
}
