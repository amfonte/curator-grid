import type { BorderConfig } from "@lisse/react"

/** Figma-style squircle config for pill text CTAs (48px tall → 24px corner radius). */
export const CTA_SMOOTH_CORNERS = {
  smoothing: .6,
} as const

const CTA_PRIMARY_BORDER: BorderConfig = {
  width: 2,
  color: "#262626",
  opacity: 1,
}

const CTA_SECONDARY_BORDER: BorderConfig = {
  width: 2,
  color: "#dbdbdb",
  opacity: 1,
}

export function ctaTextCornerRadius(size?: "default" | "sm" | "lg" | "icon" | null) {
  return size === "sm" ? 20 : 24
}

export function usesCtaSmoothCorners(
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link" | null,
  size?: "default" | "sm" | "lg" | "icon" | null,
) {
  const effectiveVariant = variant ?? "default"
  return (effectiveVariant === "default" || effectiveVariant === "secondary") && size !== "icon"
}

export function getCtaSmoothCornersProps(
  variant: "default" | "secondary",
  size?: "default" | "sm" | "lg" | "icon" | null,
) {
  const isSecondary = variant === "secondary"

  return {
    corners: {
      radius: ctaTextCornerRadius(size),
      smoothing: CTA_SMOOTH_CORNERS.smoothing,
    },
    // middleBorder sits on the squircle edge (matches CSS border placement).
    middleBorder: isSecondary ? CTA_SECONDARY_BORDER : CTA_PRIMARY_BORDER,
    autoEffects: false as const,
  }
}

export function getExtensionCtaSmoothCornersProps(variant: "primary" | "secondary" = "primary") {
  return getCtaSmoothCornersProps(variant === "secondary" ? "secondary" : "default")
}
