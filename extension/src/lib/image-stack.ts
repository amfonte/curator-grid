/** Stack viewport: full panel content width × 217px (Figma: 327 Fill × 217). */
export const IMAGE_STACK_HEIGHT_PX = 217
/** Panel content width before layout measurement (Figma: 327 Fill). */
export const IMAGE_STACK_MAX_WIDTH_PX = 327

export const IMAGE_STACK_ROTATION_RANGE_DEG = 3.5

/** Some images fill the container; others scale down for variety (0.8–1.0). */
export const IMAGE_STACK_SCALE_MIN = 0.8
export const IMAGE_STACK_SCALE_MAX = 1

export const STACK_ENTRANCE_DRIFT_MIN_PX = 10
export const STACK_ENTRANCE_DRIFT_MAX_PX = 20

/** Fixed +0.05 bump over each image's assigned stack scale. */
export const STACK_ENTRANCE_SCALE_BUMP = 0.05

/** Drop-in rotation offset magnitude (degrees). */
export const STACK_ENTRANCE_ROTATION_BUMP_DEG = 4

export function stackEntranceStartScale(targetScale: number): number {
  return targetScale + STACK_ENTRANCE_SCALE_BUMP
}

/** Negative finals start further negative; positive finals start further positive. */
export function stackEntranceStartRotate(targetRotate: number): number {
  if (targetRotate > 0) {
    return targetRotate + STACK_ENTRANCE_ROTATION_BUMP_DEG
  }
  return targetRotate - STACK_ENTRANCE_ROTATION_BUMP_DEG
}

export function randomStackRotation(): number {
  return Math.random() * IMAGE_STACK_ROTATION_RANGE_DEG * 2 - IMAGE_STACK_ROTATION_RANGE_DEG
}

export type StackEntranceDrift = {
  x: number
  y: number
}

function randomDriftPx(): number {
  return (
    STACK_ENTRANCE_DRIFT_MIN_PX +
    Math.random() * (STACK_ENTRANCE_DRIFT_MAX_PX - STACK_ENTRANCE_DRIFT_MIN_PX)
  )
}

/** Always drifts up 10–20px; horizontal 0 or ±10–20px for up / up-left / up-right. */
export function randomStackEntranceDrift(): StackEntranceDrift {
  const driftUp = randomDriftPx()
  const useHorizontal = Math.random() >= 0.25
  const driftX = useHorizontal ? randomDriftPx() * (Math.random() < 0.5 ? -1 : 1) : 0

  return {
    x: driftX,
    y: -driftUp,
  }
}

export function randomStackScale(): number {
  return IMAGE_STACK_SCALE_MIN + Math.random() * (IMAGE_STACK_SCALE_MAX - IMAGE_STACK_SCALE_MIN)
}

/** First image in the stack fills the container; later ones vary in size. */
export function stackScaleForNewImage(isFirstInStack: boolean): number {
  return isFirstInStack ? IMAGE_STACK_SCALE_MAX : randomStackScale()
}

export function stackZIndex(stackLayer: number): number {
  return stackLayer + 1
}
