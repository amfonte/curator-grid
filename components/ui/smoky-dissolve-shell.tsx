"use client"

import { useLayoutEffect, useRef, type CSSProperties, type ReactNode } from "react"
import { cn } from "@/lib/utils"
import {
  SMOKY_DISSOLVE_MASK_IMAGE,
  SMOKY_DISSOLVE_MS,
  smokyDissolveEaseOut,
  smokyDissolveFade,
} from "@/lib/animation/smoky-dissolve"

export type SmokyDissolveVariant = "default" | "toast" | "collection"

export interface SmokyDissolveShellProps {
  dissolving: boolean
  children: ReactNode
  className?: string
  style?: CSSProperties
  variant?: SmokyDissolveVariant
}

/**
 * rAF-driven dissolve — progress is tied to painted frames (not wall clock) so
 * main-thread stalls never skip the animation ahead mid-dissolve.
 */
export function SmokyDissolveShell({
  dissolving,
  children,
  className,
  style,
  variant = "default",
}: SmokyDissolveShellProps) {
  const ref = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    if (!dissolving || !ref.current) return

    const el = ref.current

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.style.opacity = "0"
      return () => {
        el.style.removeProperty("opacity")
      }
    }

    let raf = 0
    let start: number | null = null

    const tick = (now: number) => {
      if (start === null) start = now

      const linear = Math.min(1, (now - start) / SMOKY_DISSOLVE_MS)
      const spread = smokyDissolveEaseOut(linear)
      const fade = smokyDissolveFade(linear)

      el.style.setProperty("--smoky-spread", spread.toFixed(4))
      el.style.setProperty("--smoky-fade", fade.toFixed(4))

      if (linear < 1) {
        raf = requestAnimationFrame(tick)
      }
    }

    el.classList.add("smoky-dissolve-shell-active")
    el.style.setProperty("--smoky-spread", "0")
    el.style.setProperty("--smoky-fade", "0")
    raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      el.classList.remove("smoky-dissolve-shell-active")
      el.style.removeProperty("--smoky-spread")
      el.style.removeProperty("--smoky-fade")
      el.style.removeProperty("opacity")
    }
  }, [dissolving])

  return (
    <div
      ref={ref}
      className={cn(
        "smoky-dissolve-shell overflow-visible",
        variant === "toast" && "smoky-dissolve-shell--toast",
        variant === "collection" && "smoky-dissolve-shell--collection",
        className,
      )}
      style={
        {
          ...style,
          "--smoky-dissolve-mask": SMOKY_DISSOLVE_MASK_IMAGE,
        } as CSSProperties
      }
    >
      {variant === "collection" || variant === "toast" ? (
        <div className="smoky-dissolve-content">{children}</div>
      ) : (
        children
      )}
    </div>
  )
}
