"use client"

import { useEffect } from "react"

/**
 * Next.js 16 dev overlay (or React DevTools) enumerates or spreads dynamic props
 * (params, searchParams) when building the component tree, which triggers
 * console errors because those are Promises. Our pages correctly await them;
 * this only suppresses those dev-only false positives.
 */
export function SuppressParamsEnumerationWarning() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return
    const original = console.error
    console.error = (...args: unknown[]) => {
      const msg = args[0]
      if (typeof msg === "string") {
        if (msg.includes("params are being enumerated")) return
        if (msg.includes("keys of `searchParams` were accessed directly")) return
        if (msg.includes("is a Promise and must be unwrapped with") && msg.includes("sync-dynamic-apis")) return
      }
      original.apply(console, args)
    }
    return () => {
      console.error = original
    }
  }, [])
  return null
}
