"use client"

import { useLayoutEffect, useRef, type CSSProperties, type ReactNode } from "react"
import { cn } from "@/lib/utils"
import {
  SMOKY_DISSOLVE_FRAMES,
  SMOKY_DISSOLVE_MASK_IMAGE,
  SMOKY_DISSOLVE_MAX_MS,
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
  /** Fires once the dissolve finishes (frame-based, not wall-clock). */
  onComplete?: () => void
}

function applyDissolveStyles(
  el: HTMLElement,
  spread: number,
  fade: number,
  fxSpread: number,
) {
  const spreadText = spread.toFixed(4)
  const fadeText = fade.toFixed(4)
  const fxSpreadText = fxSpread.toFixed(4)

  el.style.setProperty("--smoky-spread-display", spreadText)
  el.style.setProperty("--smoky-fade", fadeText)
  el.style.setProperty("--smoky-spread", fxSpreadText)
}

/**
 * Frame-based dissolve — each rAF advances one step so a slow filter paint
 * cannot skip the animation ahead to mid-dissolve.
 */
export function SmokyDissolveShell({
  dissolving,
  children,
  className,
  style,
  variant = "default",
  onComplete,
}: SmokyDissolveShellProps) {
  const ref = useRef<HTMLDivElement>(null)
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete

  useLayoutEffect(() => {
    if (!dissolving || !ref.current) return

    const el = ref.current
    const active = document.activeElement
    if (active instanceof HTMLElement && el.contains(active)) {
      active.blur()
    }

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.style.opacity = "0"
      onCompleteRef.current?.()
      return () => {
        el.style.removeProperty("opacity")
      }
    }

    const coarse = window.matchMedia("(pointer: coarse)").matches
    const fxStride = coarse ? 2 : 1

    let raf = 0
    let frame = 0
    let fxSpread = 0
    let completed = false
    const startedAt = performance.now()

    const finish = () => {
      if (completed) return
      completed = true
      onCompleteRef.current?.()
    }

    const tick = () => {
      if (performance.now() - startedAt > SMOKY_DISSOLVE_MAX_MS) {
        finish()
        return
      }

      frame += 1
      const linear = Math.min(1, frame / SMOKY_DISSOLVE_FRAMES)
      const spread = smokyDissolveEaseOut(linear)
      const fade = smokyDissolveFade(linear)

      if (frame % fxStride === 0 || linear >= 1) {
        fxSpread = spread
      }

      applyDissolveStyles(el, spread, fade, fxSpread)

      if (linear < 1) {
        raf = requestAnimationFrame(tick)
      } else {
        finish()
      }
    }

    el.classList.add("smoky-dissolve-shell-active")
    applyDissolveStyles(el, 0, 0, 0)
    raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      el.classList.remove("smoky-dissolve-shell-active")
      el.style.removeProperty("--smoky-spread")
      el.style.removeProperty("--smoky-spread-display")
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
