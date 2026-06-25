/** Shared dash metrics — match panel EmptyCanvasBorder / Figma img placeholder. */
export const PICK_BORDER_DASH_LENGTH = 13
export const PICK_BORDER_GAP_LENGTH = 8
export const PICK_BORDER_DASH_PERIOD = PICK_BORDER_DASH_LENGTH + PICK_BORDER_GAP_LENGTH

/** Inset between image edge and dashed border (Figma 395:1068 img placeholder). */
export const PICK_BORDER_INSET_PX = 8
export const PICK_BORDER_RADIUS_PX = 8

/** Gap between dashed pick border and badge outer edge. */
export const PICK_BADGE_BORDER_GAP_PX = 16

const STROKE_INSET = 1

/**
 * Clockwise rounded-rect path for SVG stroke (marching-ants animation).
 */
export function buildPickBorderPath(width: number, height: number, radius: number): string {
  const x = STROKE_INSET
  const y = STROKE_INSET
  const w = Math.max(0, width - STROKE_INSET * 2)
  const h = Math.max(0, height - STROKE_INSET * 2)
  const r = Math.min(radius, w / 2, h / 2)

  if (w <= 0 || h <= 0) return ""

  return [
    `M ${x + r} ${y}`,
    `H ${x + w - r}`,
    `A ${r} ${r} 0 0 1 ${x + w} ${y + r}`,
    `V ${y + h - r}`,
    `A ${r} ${r} 0 0 1 ${x + w - r} ${y + h}`,
    `H ${x + r}`,
    `A ${r} ${r} 0 0 1 ${x} ${y + h - r}`,
    `V ${y + r}`,
    `A ${r} ${r} 0 0 1 ${x + r} ${y}`,
    "Z",
  ].join(" ")
}
