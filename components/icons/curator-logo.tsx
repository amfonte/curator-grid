import { cn } from "@/lib/utils"

/** Native artboard size for the mark-only logo. */
export const CURATOR_LOGO_MARK_WIDTH = 52
export const CURATOR_LOGO_MARK_HEIGHT = 60

/** Native artboard size for the logo + wordmark lockup. */
export const CURATOR_LOGO_LOCKUP_WIDTH = 100
export const CURATOR_LOGO_LOCKUP_HEIGHT = 108

const LOGO_MARK_SRC = "/logo/curator-logo.svg"
const LOGO_LOCKUP_SRC = "/logo/curator-logo-lockup.svg"

type CuratorLogoProps = {
  className?: string
  /** Display height in CSS pixels. Width follows the native 52:60 aspect ratio. */
  height?: number
  alt?: string
}

/** Mark-only Curator logo. Reads from `public/logo/curator-logo.svg`. */
export function CuratorLogo({ className, height = CURATOR_LOGO_MARK_HEIGHT, alt = "Curator" }: CuratorLogoProps) {
  const width = Math.round((height * CURATOR_LOGO_MARK_WIDTH) / CURATOR_LOGO_MARK_HEIGHT)

  return (
    // eslint-disable-next-line @next/next/no-img-element -- Figma exports live in /public/logo for easy replacement.
    <img
      src={LOGO_MARK_SRC}
      alt={alt}
      width={width}
      height={height}
      className={cn("curator-logo-vector block shrink-0", className)}
      style={{ width, height }}
    />
  )
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
