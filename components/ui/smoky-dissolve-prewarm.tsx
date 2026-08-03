"use client"

import { useEffect } from "react"
import { prewarmSmokyDissolveFilter } from "@/lib/animation/smoky-dissolve"

function scheduleIdle(task: () => void): () => void {
  if (typeof requestIdleCallback !== "undefined") {
    const id = requestIdleCallback(task, { timeout: 1500 })
    return () => cancelIdleCallback(id)
  }
  const id = window.setTimeout(task, 0)
  return () => window.clearTimeout(id)
}

/** Compiles filter, mask, and @property animation after first paint. */
export function SmokyDissolvePrewarm() {
  useEffect(() => {
    return scheduleIdle(prewarmSmokyDissolveFilter)
  }, [])

  return null
}
