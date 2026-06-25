/* ─────────────────────────────────────────────────────────
 * STACK IMAGE ENTRANCE
 *
 *   0ms     fade, scale, rotate, drift begin (origin 20px below center)
 * 260ms     fade + scale complete
 * 420ms     rotate + drift at rest (10–20px up, optional 10–20px horizontal)
 * ───────────────────────────────────────────────────────── */

export {
  STACK_ENTRANCE_ROTATION_BUMP_DEG,
  STACK_ENTRANCE_SCALE_BUMP,
  stackEntranceStartRotate,
  stackEntranceStartScale,
} from "../lib/image-stack"

/** Drop-in anchor sits below the stack's vertical center (screen Y+). */
export const STACK_ENTRANCE_ORIGIN_OFFSET_Y_PX = 20

export const STACK_FADE_ENTRANCE = {
  duration: 0.26,
  delay: 0,
  ease: [0, 0, 0.2, 1] as const,
}

/** Paired with fade so both finish together. */
export const STACK_SCALE_ENTRANCE = STACK_FADE_ENTRANCE

export const STACK_ROTATE_ENTRANCE = {
  duration: 0.42,
  delay: 0,
  ease: [0, 0, 0.2, 1] as const,
}

/** Drift extends with rotation. */
export const STACK_DRIFT_ENTRANCE = STACK_ROTATE_ENTRANCE

const playedStackEntranceUrls = new Set<string>()

export function hasStackEntrancePlayed(url: string): boolean {
  return playedStackEntranceUrls.has(url)
}

export function markStackEntrancePlayed(url: string): void {
  playedStackEntranceUrls.add(url)
}

/** Drop URLs no longer in the selection so re-picked images can animate again. */
export function syncStackEntrancePlayedUrls(activeUrls: string[]): void {
  const active = new Set(activeUrls)
  for (const url of playedStackEntranceUrls) {
    if (!active.has(url)) {
      playedStackEntranceUrls.delete(url)
    }
  }
}
