import type { CSSProperties } from "react"
import { useId } from "react"
import { cn } from "@/lib/utils"

/** Native artboard size for the mark-only logo. */
export const CURATOR_LOGO_MARK_WIDTH = 52
export const CURATOR_LOGO_MARK_HEIGHT = 60

/** Native artboard size for the logo + wordmark lockup. */
export const CURATOR_LOGO_LOCKUP_WIDTH = 100
export const CURATOR_LOGO_LOCKUP_HEIGHT = 108

/** Paths synced with `public/logo/curator-logo.svg`. */
const LOGO_MARK_FILL_PATH =
  "M34 0C43.9411 2.57703e-07 52 8.05888 52 18V23.25C52 24.9069 50.6569 26.25 49 26.25H37.1719C35.515 26.25 34.1719 24.9069 34.1719 23.25V16.5C34.1719 15.6717 33.5001 15.0002 32.6719 15H19.3281C18.4999 15.0002 17.8281 15.6717 17.8281 16.5V43.3506C17.8281 44.6131 19.293 45.311 20.2734 44.5156L25.0547 40.6357C25.6055 40.1887 26.3945 40.1887 26.9453 40.6357L31.7266 44.5156C32.707 45.311 34.1719 44.6131 34.1719 43.3506V36.75C34.1719 35.0931 35.515 33.75 37.1719 33.75H49C50.6569 33.75 52 35.0931 52 36.75V42C52 51.9411 43.9411 60 34 60H18C8.05888 60 3.8658e-07 51.9411 0 42V18C3.8658e-07 8.05888 8.05888 2.57703e-07 18 0H34Z"

const LOGO_MARK_TOP_HIGHLIGHT_PATH =
  "M6.26416 6.44926C6.7913 6.00153 7.35185 5.59429 7.93123 5.22487C10.9602 3.32492 14.4883 2.25516 18 2.24407C18.34 2.24542 18.6801 2.24609 19.0201 2.24609C23.6523 2.24609 28.2844 2.24609 32.9166 2.24609C33.2777 2.24609 33.6389 2.24531 34 2.24375C37.4353 2.24366 40.9029 3.18345 43.8713 5.03206C44.4527 5.39839 45.0133 5.80438 45.5411 6.25209C45.0653 5.74939 44.5439 5.28442 43.9913 4.85993C41.1663 2.70925 37.5948 1.52596 34 1.49843C33.6389 1.49687 33.2777 1.49609 32.9166 1.49609C28.2844 1.49609 23.6523 1.49609 19.0201 1.49609C18.6801 1.49609 18.34 1.49676 18 1.49811C14.3058 1.53743 10.6933 2.85345 7.81185 5.05543C7.26168 5.48193 6.73997 5.94726 6.26416 6.44926Z"

const LOGO_MARK_BOTTOM_HIGHLIGHT_PATH =
  "M50.4758 37.0072C50.5112 36.734 50.4727 36.4369 50.3434 36.1646C50.1347 35.7073 49.64 35.334 49.0766 35.3074C49.0562 35.306 49.0358 35.3047 49.0153 35.3035C48.9429 35.299 48.8705 35.2957 48.798 35.2936C48.0451 35.2721 47.2923 35.2638 46.5394 35.2586C45.3805 35.2507 44.2217 35.2412 43.0629 35.2412C41.871 35.2412 40.679 35.2658 39.4871 35.2761C38.7069 35.2829 37.9266 35.285 37.1464 35.2936C37.114 35.294 37.0816 35.2951 37.0492 35.2969C36.5771 35.316 36.1779 35.6246 35.9399 35.9579C35.888 36.0284 35.8423 36.1022 35.8034 36.1786C35.6689 36.4408 35.6163 36.7333 35.65 37.0072C35.6823 36.7332 35.7944 36.4791 35.9646 36.286C36.0139 36.2298 36.0679 36.1787 36.1255 36.1335C36.4071 35.9128 36.7614 35.8958 37.0492 35.9191C37.0816 35.9209 37.114 35.922 37.1464 35.9224C37.9266 35.9311 38.7069 35.9331 39.4871 35.9399C40.679 35.9503 41.871 35.9749 43.0629 35.9749C44.2217 35.9749 45.3805 35.9653 46.5394 35.9574C47.2923 35.9522 48.0451 35.9439 48.798 35.9224C48.8705 35.9203 48.9429 35.917 49.0153 35.9126C49.0358 35.9113 49.0562 35.91 49.0766 35.9086C49.4343 35.8741 49.8436 35.9883 50.1402 36.3C50.3155 36.4829 50.4417 36.7326 50.4758 37.0072Z"

const LOGO_MARK_STROKE_PATH =
  "M34 0C43.9411 2.57703e-07 52 8.05888 52 18V23.25L51.9961 23.4043C51.9184 24.9383 50.6883 26.1684 49.1543 26.2461L49 26.25H37.1719C35.5668 26.25 34.2561 24.9894 34.1758 23.4043L34.1719 23.25V16.5C34.1719 15.6717 33.5001 15.0002 32.6719 15H19.3281C18.4999 15.0002 17.8281 15.6717 17.8281 16.5V43.3506C17.8281 44.6131 19.293 45.311 20.2734 44.5156L25.0547 40.6357C25.6055 40.1887 26.3945 40.1887 26.9453 40.6357L31.7266 44.5156C32.707 45.311 34.1719 44.6131 34.1719 43.3506V36.75C34.1719 35.0931 35.515 33.75 37.1719 33.75H49L49.1543 33.7539C50.7394 33.8342 52 35.1449 52 36.75V42C52 51.9411 43.9411 60 34 60H18C8.05888 60 3.8658e-07 51.9411 0 42V18C3.8658e-07 8.05888 8.05888 2.57703e-07 18 0H34ZM18 1.5C8.8873 1.5 1.5 8.8873 1.5 18V42C1.5 51.1127 8.8873 58.5 18 58.5H34C43.1127 58.5 50.5 51.1127 50.5 42V36.75C50.5 35.9216 49.8284 35.25 49 35.25H37.1719C36.3434 35.25 35.6719 35.9216 35.6719 36.75V43.3506C35.6719 45.8758 32.7421 47.2713 30.7812 45.6807L26 41.8008L21.2188 45.6807C19.258 47.2713 16.3281 45.8758 16.3281 43.3506V16.5C16.3281 14.8429 17.6723 13.5005 19.3281 13.5H32.6719C34.3278 13.5005 35.6719 14.8429 35.6719 16.5V23.25C35.6719 24.0784 36.3434 24.75 37.1719 24.75H49C49.8284 24.75 50.5 24.0784 50.5 23.25V18C50.5 8.8873 43.1127 1.5 34 1.5H18Z"

const LOGO_LOCKUP_SRC = "/logo/curator-logo-lockup.svg"

type CuratorLogoMarkSvgProps = {
  className?: string
  style?: CSSProperties
  alt?: string
}

/** Inline mark SVG — stays vector-sharp inside CSS transforms on iOS Safari. */
function CuratorLogoMarkSvg({ className, style, alt = "Curator" }: CuratorLogoMarkSvgProps) {
  const id = useId().replace(/:/g, "")
  const clipId = `${id}-clip`
  const fillId = `${id}-fill`

  return (
    <svg
      viewBox="0 0 52 60"
      width={CURATOR_LOGO_MARK_WIDTH}
      height={CURATOR_LOGO_MARK_HEIGHT}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("curator-logo-vector block shrink-0", className)}
      style={style}
      role="img"
      aria-label={alt}
      shapeRendering="geometricPrecision"
    >
      <defs>
        <linearGradient id={fillId} x1="26" y1="0" x2="26" y2="60" gradientUnits="userSpaceOnUse">
          <stop stopColor="#595959" />
          <stop offset="1" stopColor="#262626" />
        </linearGradient>
        <clipPath id={clipId}>
          <rect width="52" height="60" fill="white" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>
        <path d={LOGO_MARK_FILL_PATH} fill={`url(#${fillId})`} />
        <path d={LOGO_MARK_TOP_HIGHLIGHT_PATH} fill="white" opacity={0.6} />
        <path d={LOGO_MARK_BOTTOM_HIGHLIGHT_PATH} fill="white" opacity={0.6} />
        <path d={LOGO_MARK_STROKE_PATH} fill="#262626" fillRule="evenodd" clipRule="evenodd" />
      </g>
    </svg>
  )
}

type CuratorLogoProps = {
  className?: string
  /** Display height in CSS pixels. Width follows the native 52:60 aspect ratio. */
  height?: number
  alt?: string
}

/** Mark-only Curator logo. Inline SVG for crisp rendering in animated nav headers. */
export function CuratorLogo({ className, height = CURATOR_LOGO_MARK_HEIGHT, alt = "Curator" }: CuratorLogoProps) {
  const width = Math.round((height * CURATOR_LOGO_MARK_WIDTH) / CURATOR_LOGO_MARK_HEIGHT)

  return <CuratorLogoMarkSvg className={className} style={{ width, height }} alt={alt} />
}

type CuratorLogoLockupProps = {
  className?: string
  width?: number
  height?: number
  alt?: string
}

/** Logo mark + "Curator" wordmark. Reads from `public/logo/curator-logo-lockup.svg`. */
export function CuratorLogoLockup({
  className,
  width = CURATOR_LOGO_LOCKUP_WIDTH,
  height = CURATOR_LOGO_LOCKUP_HEIGHT,
  alt = "Curator",
}: CuratorLogoLockupProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- Figma exports live in /public/logo for easy replacement.
    <img
      src={LOGO_LOCKUP_SRC}
      alt={alt}
      width={width}
      height={height}
      className={cn("curator-logo-vector block shrink-0", className)}
      style={{ width, height }}
    />
  )
}
