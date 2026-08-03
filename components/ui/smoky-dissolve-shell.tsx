"use client"

import { useEffect, useLayoutEffect, useRef, type CSSProperties, type ReactNode } from "react"
import { cn } from "@/lib/utils"
import {
  captureElementSnapshot,
  type PreparedSnapshot,
} from "@/lib/animation/smoky-dissolve-capture"
import { SMOKY_DISSOLVE_MASK_IMAGE, SMOKY_DISSOLVE_MS } from "@/lib/animation/smoky-dissolve"

export type SmokyDissolveVariant = "default" | "toast" | "collection"

export interface SmokyDissolveShellProps {
  dissolving: boolean
  children: ReactNode
  className?: string
  style?: CSSProperties
  variant?: SmokyDissolveVariant
}

function scheduleIdle(task: () => void): () => void {
  if (typeof requestIdleCallback !== "undefined") {
    const id = requestIdleCallback(task, { timeout: 2500 })
    return () => cancelIdleCallback(id)
  }
  const id = window.setTimeout(task, 200)
  return () => window.clearTimeout(id)
}

function startDissolveAnimation(el: HTMLElement) {
  el.classList.add("smoky-dissolve-shell-active")
  el.style.setProperty("--smoky-spread", "0")
  el.style.setProperty("--smoky-fade", "0")
  void el.offsetHeight
  el.classList.add("smoky-dissolve-shell-animating")
}

function mountSnapshot(el: HTMLElement, liveLayer: HTMLElement, prepared: PreparedSnapshot): HTMLImageElement {
  const snapshot = prepared.image.cloneNode(true) as HTMLImageElement
  snapshot.alt = ""
  snapshot.decoding = "sync"
  snapshot.className = "smoky-dissolve-snapshot pointer-events-none absolute inset-0 h-full w-full"
  snapshot.setAttribute("aria-hidden", "true")

  liveLayer.style.visibility = "hidden"
  liveLayer.setAttribute("aria-hidden", "true")
  el.insertBefore(snapshot, el.firstChild)
  return snapshot
}

function cleanupDissolve(el: HTMLElement, liveLayer: HTMLElement | null, snapshot: HTMLImageElement | null) {
  el.classList.remove("smoky-dissolve-shell-active", "smoky-dissolve-shell-animating")
  el.style.removeProperty("--smoky-spread")
  el.style.removeProperty("--smoky-fade")
  el.style.removeProperty("opacity")

  if (liveLayer) {
    liveLayer.style.removeProperty("visibility")
    liveLayer.removeAttribute("aria-hidden")
  }

  snapshot?.remove()
}

/**
 * Dissolve shell — idle-pre-captures a bitmap so dismiss starts instantly;
 * falls back to live DOM if the cache isn't ready yet.
 */
export function SmokyDissolveShell({
  dissolving,
  children,
  className,
  style,
  variant = "default",
}: SmokyDissolveShellProps) {
  const ref = useRef<HTMLDivElement>(null)
  const liveRef = useRef<HTMLDivElement>(null)
  const snapshotCacheRef = useRef<PreparedSnapshot | null>(null)
  const captureGenerationRef = useRef(0)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    el.classList.add("smoky-dissolve-shell-primed")

    const runCapture = () => {
      const generation = ++captureGenerationRef.current
      void captureElementSnapshot(el).then((prepared) => {
        if (generation !== captureGenerationRef.current) return
        snapshotCacheRef.current = prepared
      })
    }

    let cancelIdle = scheduleIdle(runCapture)

    const invalidateCache = () => {
      snapshotCacheRef.current = null
      cancelIdle()
      cancelIdle = scheduleIdle(runCapture)
    }

    const ro = new ResizeObserver(invalidateCache)
    ro.observe(el)

    el.addEventListener("input", invalidateCache, true)
    el.addEventListener("change", invalidateCache, true)

    const mo = new MutationObserver(invalidateCache)
    mo.observe(el, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["class", "style"],
    })

    return () => {
      el.classList.remove("smoky-dissolve-shell-primed")
      cancelIdle()
      ro.disconnect()
      mo.disconnect()
      el.removeEventListener("input", invalidateCache, true)
      el.removeEventListener("change", invalidateCache, true)
      captureGenerationRef.current++
    }
  }, [])

  useLayoutEffect(() => {
    if (!dissolving || !ref.current) return

    const el = ref.current
    const liveLayer = liveRef.current
    let snapshot: HTMLImageElement | null = null

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.style.opacity = "0"
      return () => {
        el.style.removeProperty("opacity")
      }
    }

    const cached = snapshotCacheRef.current
    if (cached && liveLayer) {
      snapshot = mountSnapshot(el, liveLayer, cached)
    }

    startDissolveAnimation(el)

    return () => {
      cleanupDissolve(el, liveLayer, snapshot)
    }
  }, [dissolving])

  const content =
    variant === "collection" || variant === "toast" ? (
      <div ref={liveRef} className="smoky-dissolve-content">
        {children}
      </div>
    ) : (
      <div ref={liveRef} className="contents">
        {children}
      </div>
    )

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
          "--smoky-dissolve-ms": `${SMOKY_DISSOLVE_MS}ms`,
        } as CSSProperties
      }
    >
      {content}
    </div>
  )
}
