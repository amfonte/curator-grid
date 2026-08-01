/** Smoky dissolve timing and layout bleed for collection cancel + extension toast dismiss. */
export const SMOKY_DISSOLVE_MS = 780

/** Fraction of timeline where element stays fully opaque while edges erode. */
export const SMOKY_DISSOLVE_OPACITY_HOLD = 0.38

/** Horizontal paint bleed per side — shell expands; inner content stays grid width. */
export const SMOKY_DISSOLVE_COLLECTION_BLEED_X_PERCENT = 14

/** Inner content width as % of expanded collection shell (100 / (100 + 2*bleed)). */
export const SMOKY_DISSOLVE_COLLECTION_CONTENT_WIDTH_PERCENT =
  (100 / (100 + SMOKY_DISSOLVE_COLLECTION_BLEED_X_PERCENT * 2)) * 100

/** Toast dismiss — slightly tighter horizontal bleed; vertical room for dismiss + drift. */
export const SMOKY_DISSOLVE_TOAST_BLEED_X_PERCENT = 12

/** Inner content width as % of expanded toast shell. */
export const SMOKY_DISSOLVE_TOAST_CONTENT_WIDTH_PERCENT =
  (100 / (100 + SMOKY_DISSOLVE_TOAST_BLEED_X_PERCENT * 2)) * 100

/** Fine fractal noise mask — higher frequency reads as granular particles. */
export const SMOKY_DISSOLVE_MASK_IMAGE =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='512' height='512'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.65' numOctaves='5' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.95'/%3E%3C/svg%3E\")"

export function smokyDissolveEaseOut(t: number): number {
  return 1 - Math.pow(1 - t, 3.2)
}

/** Opacity fade begins after edge erosion (see SMOKY_DISSOLVE_OPACITY_HOLD). */
export function smokyDissolveFade(progress: number): number {
  if (progress < SMOKY_DISSOLVE_OPACITY_HOLD) return 0
  const t = (progress - SMOKY_DISSOLVE_OPACITY_HOLD) / (1 - SMOKY_DISSOLVE_OPACITY_HOLD)
  return smokyDissolveEaseOut(t)
}
