"use client"

import { useCallback, useEffect, useRef, useState } from "react"

const REVEAL_RADIUS_INNER = 100
const REVEAL_RADIUS_OUTER = 320
const REVEAL_RADIUS_INNER_FOCUSED = 180
const REVEAL_RADIUS_OUTER_FOCUSED = 520

const MOVE_DURATION_MS = 400
const PAUSE_DURATION_MS = 1600
const LERP_SPEED_MOUSE = 0.18
const LERP_MAX_PER_FRAME = 0.2

function randomPosition() {
  if (typeof window === "undefined") return { x: 400, y: 300 }
  return {
    x: Math.random() * window.innerWidth,
    y: Math.random() * window.innerHeight,
  }
}

export function AuthLogoPatternReveal() {
  const [position, setPosition] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  })
  const [isMouseActive, setIsMouseActive] = useState(false)
  const [isFormFocused, setIsFormFocused] = useState(false)
  const mouseRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
  const targetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
  const phaseRef = useRef<"moving" | "paused">("moving")
  const phaseStartRef = useRef(0)
  const moveStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
  const rafRef = useRef<number | null>(null)
  const positionRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
  const initializedRef = useRef(false)

  const handleMouseEnter = useCallback(() => {
    setIsMouseActive(true)
  }, [])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    mouseRef.current = { x: e.clientX, y: e.clientY }
  }, [])

  const handleMouseLeave = useCallback(() => {
    setIsMouseActive(false)
    phaseRef.current = "moving"
    phaseStartRef.current = performance.now()
    targetRef.current = randomPosition()
    moveStartRef.current = { ...positionRef.current }
  }, [])

  const checkFormFocus = useCallback(() => {
    const authCard = document.getElementById("auth-card")
    const active = document.activeElement
    const focused =
      authCard &&
      active &&
      (active instanceof HTMLInputElement ||
        active instanceof HTMLTextAreaElement ||
        active instanceof HTMLSelectElement) &&
      authCard.contains(active)
    setIsFormFocused(!!focused)
  }, [])

  useEffect(() => {
    const el = document.documentElement
    el.addEventListener("mouseenter", handleMouseEnter)
    el.addEventListener("mousemove", handleMouseMove, { passive: true })
    el.addEventListener("mouseleave", handleMouseLeave)
    return () => {
      el.removeEventListener("mouseenter", handleMouseEnter)
      el.removeEventListener("mousemove", handleMouseMove)
      el.removeEventListener("mouseleave", handleMouseLeave)
    }
  }, [handleMouseEnter, handleMouseMove, handleMouseLeave])

  useEffect(() => {
    checkFormFocus()
    document.addEventListener("focusin", checkFormFocus)
    document.addEventListener("focusout", checkFormFocus)
    return () => {
      document.removeEventListener("focusin", checkFormFocus)
      document.removeEventListener("focusout", checkFormFocus)
    }
  }, [checkFormFocus])

  useEffect(() => {
    let lastTime = 0
    const animate = (now: number) => {
      rafRef.current = requestAnimationFrame(animate)
      if (!initializedRef.current) {
        initializedRef.current = true
        const p = randomPosition()
        moveStartRef.current = { ...p }
        targetRef.current = randomPosition()
        phaseStartRef.current = now
        positionRef.current = p
        setPosition(p)
      }
      const dt = Math.min((now - lastTime) / 1000, 0.1)
      lastTime = now

      const authCard = document.getElementById("auth-card")
      const formCenter =
        authCard && isFormFocused
          ? (() => {
              const r = authCard.getBoundingClientRect()
              return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
            })()
          : null

      if (isFormFocused && formCenter) {
        targetRef.current = formCenter
        const rawLerp = 1 - Math.pow(1 - LERP_SPEED_MOUSE, dt * 60)
        const lerp = Math.min(rawLerp, LERP_MAX_PER_FRAME)
        setPosition((p) => {
          const next = {
            x: p.x + (targetRef.current.x - p.x) * lerp,
            y: p.y + (targetRef.current.y - p.y) * lerp,
          }
          positionRef.current = next
          return next
        })
      } else if (isMouseActive) {
        targetRef.current = { ...mouseRef.current }
        const rawLerp = 1 - Math.pow(1 - LERP_SPEED_MOUSE, dt * 60)
        const lerp = Math.min(rawLerp, LERP_MAX_PER_FRAME)
        setPosition((p) => {
          const next = {
            x: p.x + (targetRef.current.x - p.x) * lerp,
            y: p.y + (targetRef.current.y - p.y) * lerp,
          }
          positionRef.current = next
          return next
        })
      } else {
        const elapsed = now - phaseStartRef.current
        if (phaseRef.current === "moving") {
          const t = Math.min(elapsed / MOVE_DURATION_MS, 1)
          const eased = 1 - (1 - t) * (1 - t)
          const start = moveStartRef.current
          const target = targetRef.current
          const next = {
            x: start.x + (target.x - start.x) * eased,
            y: start.y + (target.y - start.y) * eased,
          }
          positionRef.current = next
          setPosition(next)
          if (t >= 1) {
            positionRef.current = { x: target.x, y: target.y }
            setPosition({ x: target.x, y: target.y })
            phaseRef.current = "paused"
            phaseStartRef.current = now
          }
        } else {
          if (elapsed >= PAUSE_DURATION_MS) {
            phaseRef.current = "moving"
            phaseStartRef.current = now
            moveStartRef.current = { ...positionRef.current }
            targetRef.current = randomPosition()
          }
        }
      }
    }
    rafRef.current = requestAnimationFrame(animate)
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
      }
    }
  }, [isMouseActive, isFormFocused])

  const isFocused = isFormFocused
  const innerRadius = isFocused ? REVEAL_RADIUS_INNER_FOCUSED : REVEAL_RADIUS_INNER
  const outerRadius = isFocused ? REVEAL_RADIUS_OUTER_FOCUSED : REVEAL_RADIUS_OUTER

  const maskStyle = {
    maskImage: `radial-gradient(circle ${outerRadius}px at ${position.x}px ${position.y}px, black ${innerRadius}px, transparent ${outerRadius}px)`,
    WebkitMaskImage: `radial-gradient(circle ${outerRadius}px at ${position.x}px ${position.y}px, black ${innerRadius}px, transparent ${outerRadius}px)`,
    maskRepeat: "no-repeat" as const,
    WebkitMaskRepeat: "no-repeat" as const,
  }

  return (
    <div
      className="auth-logo-pattern auth-logo-pattern-reveal z-0"
      style={maskStyle}
      aria-hidden
    >
      <div className="auth-logo-grid">
        {Array.from({ length: 30 }).map((_, rowIndex) => (
          <div
            key={rowIndex}
            className={`auth-logo-row ${
              rowIndex % 2 === 0 ? "auth-logo-row--left" : "auth-logo-row--right"
            }`}
          >
            <div className="auth-logo-row-inner" />
          </div>
        ))}
      </div>
    </div>
  )
}
