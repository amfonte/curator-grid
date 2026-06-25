import { IMAGE_STACK_HEIGHT_PX, IMAGE_STACK_MAX_WIDTH_PX } from "./image-stack"

/** Fit image natural dimensions inside max bounds, preserving aspect ratio. */
export function fitStackImageSize(
  naturalWidth: number,
  naturalHeight: number,
  maxWidth: number,
  maxHeight: number,
): { width: number; height: number } {
  let width = naturalWidth
  let height = naturalHeight

  if (width > maxWidth) {
    height = (height * maxWidth) / width
    width = maxWidth
  }
  if (height > maxHeight) {
    width = (width * maxHeight) / height
    height = maxHeight
  }

  return { width, height }
}

export type StackDisplaySize = { width: number; height: number }

/** Display size for a stack card; uses fallback width until the container is measured. */
export function getStackDisplaySize(
  naturalWidth: number,
  naturalHeight: number,
  containerWidth: number,
): StackDisplaySize {
  const safeWidth = naturalWidth > 0 ? naturalWidth : 1
  const safeHeight = naturalHeight > 0 ? naturalHeight : 1
  const maxWidth = containerWidth > 0 ? containerWidth : IMAGE_STACK_MAX_WIDTH_PX

  return fitStackImageSize(safeWidth, safeHeight, maxWidth, IMAGE_STACK_HEIGHT_PX)
}
