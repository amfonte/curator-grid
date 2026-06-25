import {
  IMAGE_STACK_MAX_WIDTH_PX,
  stackEntranceStartRotate,
  stackEntranceStartScale,
} from "./image-stack"
import type { StackDisplaySize } from "./stack-image-size"
import { getStackDisplaySize } from "./stack-image-size"

/** Room for layered card box-shadow outside the image bounds. */
export const STACK_HORIZONTAL_SHADOW_INSET_PX = 12

type StackPose = {
  scale: number
  rotateDeg: number
  driftX: number
}

/** Axis-aligned half-width of a rectangle rotated about its center. */
export function rotatedHorizontalHalfExtent(
  width: number,
  height: number,
  rotateDeg: number,
): number {
  const rad = (Math.abs(rotateDeg) * Math.PI) / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  const halfW = width / 2
  const halfH = height / 2
  return halfW * cos + halfH * sin
}

function horizontalReach(
  cardWidth: number,
  cardHeight: number,
  pose: StackPose,
): number {
  return (
    rotatedHorizontalHalfExtent(
      cardWidth * pose.scale,
      cardHeight * pose.scale,
      pose.rotateDeg,
    ) + Math.abs(pose.driftX)
  )
}

function fitsWithinHorizontalBounds(
  cardWidth: number,
  cardHeight: number,
  containerWidth: number,
  poses: StackPose[],
  insetPx: number,
): boolean {
  const maxReach = containerWidth / 2 - insetPx
  if (maxReach <= 0) return false
  return poses.every(
    (pose) => horizontalReach(cardWidth, cardHeight, pose) <= maxReach,
  )
}

export function stackEntrancePoses(
  targetScale: number,
  targetRotate: number,
  driftX: number,
): StackPose[] {
  return [
    {
      scale: stackEntranceStartScale(targetScale),
      rotateDeg: stackEntranceStartRotate(targetRotate),
      driftX: 0,
    },
    {
      scale: targetScale,
      rotateDeg: targetRotate,
      driftX,
    },
  ]
}

/** Shrink display size until entrance + resting poses stay inside horizontal bounds. */
export function constrainStackDisplaySize(
  size: StackDisplaySize,
  containerWidth: number,
  poses: StackPose[],
  insetPx = STACK_HORIZONTAL_SHADOW_INSET_PX,
): StackDisplaySize {
  if (containerWidth <= 0) return size

  let { width, height } = size
  if (fitsWithinHorizontalBounds(width, height, containerWidth, poses, insetPx)) {
    return { width, height }
  }

  for (let i = 0; i < 48; i += 1) {
    width *= 0.98
    height *= 0.98
    if (fitsWithinHorizontalBounds(width, height, containerWidth, poses, insetPx)) {
      return { width, height }
    }
  }

  return { width, height }
}

export function clampStackDriftX(
  driftX: number,
  containerWidth: number,
  cardWidth: number,
  cardHeight: number,
  pose: StackPose,
  insetPx = STACK_HORIZONTAL_SHADOW_INSET_PX,
): number {
  if (containerWidth <= 0) return driftX

  const maxReach = containerWidth / 2 - insetPx
  const halfWithoutDrift = rotatedHorizontalHalfExtent(
    cardWidth * pose.scale,
    cardHeight * pose.scale,
    pose.rotateDeg,
  )
  const maxAbsDrift = maxReach - halfWithoutDrift

  if (maxAbsDrift <= 0) return 0
  return Math.max(-maxAbsDrift, Math.min(maxAbsDrift, driftX))
}

export type StackImageLayout = {
  displaySize: StackDisplaySize
  driftX: number
  driftY: number
}

export function resolveStackImageLayout({
  naturalWidth,
  naturalHeight,
  containerWidth,
  targetScale,
  targetRotate,
  driftX,
  driftY,
}: {
  naturalWidth: number
  naturalHeight: number
  containerWidth: number
  targetScale: number
  targetRotate: number
  driftX: number
  driftY: number
}): StackImageLayout {
  const safeContainerWidth =
    containerWidth > 0 ? containerWidth : IMAGE_STACK_MAX_WIDTH_PX
  const baseSize = getStackDisplaySize(naturalWidth, naturalHeight, safeContainerWidth)
  const poses = stackEntrancePoses(targetScale, targetRotate, driftX)
  let displaySize = constrainStackDisplaySize(baseSize, safeContainerWidth, poses)
  let clampedDriftX = clampStackDriftX(
    driftX,
    safeContainerWidth,
    displaySize.width,
    displaySize.height,
    poses[1],
  )

  if (Math.abs(clampedDriftX - driftX) > 0.5) {
    const adjustedPoses = stackEntrancePoses(targetScale, targetRotate, clampedDriftX)
    displaySize = constrainStackDisplaySize(baseSize, safeContainerWidth, adjustedPoses)
    clampedDriftX = clampStackDriftX(
      clampedDriftX,
      safeContainerWidth,
      displaySize.width,
      displaySize.height,
      adjustedPoses[1],
    )
  }

  return {
    displaySize,
    driftX: clampedDriftX,
    driftY,
  }
}

export function clampStackEntranceDrift(
  drift: { x: number; y: number },
  naturalWidth: number,
  naturalHeight: number,
  containerWidth: number,
  targetScale: number,
  targetRotate: number,
): { x: number; y: number } {
  const layout = resolveStackImageLayout({
    naturalWidth,
    naturalHeight,
    containerWidth,
    targetScale,
    targetRotate,
    driftX: drift.x,
    driftY: drift.y,
  })

  return { x: layout.driftX, y: layout.driftY }
}

/** Clamp pick-time drift against conservative panel content width. */
export function boundedStackEntranceDrift(
  drift: { x: number; y: number },
  naturalWidth: number,
  naturalHeight: number,
  stackRotate: number,
  stackScale: number,
  containerWidth = IMAGE_STACK_MAX_WIDTH_PX,
): { x: number; y: number } {
  return clampStackEntranceDrift(
    drift,
    naturalWidth,
    naturalHeight,
    containerWidth,
    stackScale,
    stackRotate,
  )
}
