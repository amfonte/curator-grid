"use client"

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react"
import { cn } from "@/lib/utils"
import { flushSync } from "react-dom"
import { getRandomQuote, getRandomQuoteOtherThan } from "@/lib/quotes"

/* ─────────────────────────────────────────────────────────
 * ANIMATION STORYBOARD — mask-reveal-up
 *
 * Layout-wrapped quote lines (text-wrap: balance) plus the author
 * are per-line units. Scaled site timing (0.72 speed, 0.58 y-travel).
 *
 *    0ms   first quote line: opacity 0→1, y 17.4→0, blur 6→0
 *  +65ms   each following quote line, then the author
 *  ~4.6s   hold visible phrase
 *    …     exit in the same stagger, y 0→-12.8, blur 0→6
 *  +35ms   micro-delay, replace copy
 *    …     enter next phrase; slot height eases with enter
 * ───────────────────────────────────────────────────────── */

const SPEED = 0.72
const Y_TRAVEL = 0.58
const HANG = "0.4em"

const ENTER = {
  duration: Math.round(760 * SPEED),
  stagger: Math.round(90 * SPEED),
  easing: "cubic-bezier(0.22, 1, 0.36, 1)",
  fromY: 30,
  fromOpacity: 0,
  fromBlur: 6,
  toY: 0,
  toOpacity: 1,
  toBlur: 0,
} as const

const EXIT = {
  duration: Math.round(520 * SPEED),
  stagger: Math.round(70 * SPEED),
  easing: "cubic-bezier(0.64, 0, 0.78, 0)",
  toY: -22,
  toOpacity: 0,
  toBlur: 6,
} as const

const PLAYBACK = {
  holdMs: 4600,
  microDelayMs: 35,
  gapMs: 320,
} as const

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
}

function frame(yPx: number, opacity: number, blurPx: number): Keyframe {
  return {
    opacity,
    filter: `blur(${blurPx}px)`,
    transform: `translate3d(0px, ${yPx * Y_TRAVEL}px, 0px)`,
  }
}

const ENTER_FROM = frame(ENTER.fromY, ENTER.fromOpacity, ENTER.fromBlur)
const ENTER_TO = frame(ENTER.toY, ENTER.toOpacity, ENTER.toBlur)
const EXIT_TO = frame(EXIT.toY, EXIT.toOpacity, EXIT.toBlur)

const UNIT_STYLE: CSSProperties = {
  backfaceVisibility: "hidden",
  transformOrigin: "50% 55%",
  willChange: "transform, opacity, filter",
  opacity: ENTER.fromOpacity,
  filter: `blur(${ENTER.fromBlur}px)`,
  transform: `translate3d(0px, ${ENTER.fromY * Y_TRAVEL}px, 0px)`,
}

function applyFrame(el: HTMLElement, keyframe: Keyframe) {
  if (keyframe.opacity != null) el.style.opacity = String(keyframe.opacity)
  if (typeof keyframe.filter === "string") el.style.filter = keyframe.filter
  if (typeof keyframe.transform === "string") el.style.transform = keyframe.transform
}

function sleep(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException("Aborted", "AbortError"))
      return
    }
    const id = window.setTimeout(resolve, ms)
    const onAbort = () => {
      window.clearTimeout(id)
      reject(new DOMException("Aborted", "AbortError"))
    }
    signal.addEventListener("abort", onAbort, { once: true })
  })
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError"
}

async function animateUnits(
  units: HTMLElement[],
  from: Keyframe,
  to: Keyframe,
  duration: number,
  stagger: number,
  easing: string,
  signal: AbortSignal,
) {
  const animations = units.map((el, index) => {
    applyFrame(el, from)
    return el.animate([from, to], {
      delay: index * stagger,
      duration,
      easing,
      fill: "forwards",
    })
  })

  const onAbort = () => {
    for (const animation of animations) animation.cancel()
  }
  signal.addEventListener("abort", onAbort, { once: true })

  try {
    await Promise.all(
      animations.map((animation) =>
        animation.finished.catch((error: unknown) => {
          if (signal.aborted || isAbortError(error)) return
          throw error
        }),
      ),
    )
    if (signal.aborted) throw new DOMException("Aborted", "AbortError")
    for (const el of units) applyFrame(el, to)
  } finally {
    signal.removeEventListener("abort", onAbort)
  }
}

function splitElementIntoLines(el: HTMLElement): string[] {
  const lines: string[] = []
  let current = ""
  let lastTop: number | null = null

  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
  while (walker.nextNode()) {
    const node = walker.currentNode as Text
    const value = node.data
    for (let i = 0; i < value.length; i++) {
      const range = document.createRange()
      range.setStart(node, i)
      range.setEnd(node, i + 1)
      const rect = range.getBoundingClientRect()
      if (rect.width === 0 && rect.height === 0) continue
      if (lastTop !== null && Math.abs(rect.top - lastTop) > 2) {
        lines.push(current)
        current = ""
      }
      current += value[i]
      lastTop = rect.top
    }
  }
  if (current) lines.push(current)
  return lines.map((line) => line.replace(/\s+$/g, "")).filter(Boolean)
}

function linesEqual(a: string[], b: string[]) {
  return a.length === b.length && a.every((line, i) => line === b[i])
}

function MaskedLine({
  className,
  hanging,
  children,
}: {
  className?: string
  hanging?: boolean
  children: ReactNode
}) {
  return (
    <span className={cn("relative block", className)}>
      <span className="invisible block whitespace-nowrap" aria-hidden="true">
        {children}
      </span>
      <span
        className="absolute overflow-hidden"
        style={{
          top: 0,
          right: 0,
          bottom: 0,
          left: hanging ? `-${HANG}` : 0,
          paddingLeft: hanging ? HANG : 0,
        }}
      >
        <span data-mask-unit className="relative block whitespace-nowrap" style={UNIT_STYLE}>
          {hanging ? (
            <span
              className="absolute top-0"
              aria-hidden="true"
              style={{ right: "100%", marginRight: "0.02em" }}
            >
              &ldquo;
            </span>
          ) : null}
          {children}
        </span>
      </span>
    </span>
  )
}

interface EmptyStateQuoteProps {
  startDelayMs?: number
}

export function EmptyStateQuote({ startDelayMs = 0 }: EmptyStateQuoteProps) {
  const [quote, setQuote] = useState(() => getRandomQuote())
  const [lines, setLines] = useState<string[]>([])
  const [slotHeight, setSlotHeight] = useState<number | null>(null)
  const [heightTransition, setHeightTransition] = useState("none")
  const slotRef = useRef<HTMLQuoteElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)
  const measureRef = useRef<HTMLDivElement>(null)
  const slotHeightRef = useRef<number | null>(null)
  const slotWidthRef = useRef<number | null>(null)
  const hasLines = lines.length > 0

  const captureLines = () => {
    if (!measureRef.current) return []
    return splitElementIntoLines(measureRef.current)
  }

  const units = () => {
    if (!slotRef.current) return []
    return Array.from(slotRef.current.querySelectorAll<HTMLElement>("[data-mask-unit]"))
  }

  useLayoutEffect(() => {
    const apply = () => {
      const next = captureLines()
      if (!next.length) return
      setLines((prev) => (linesEqual(prev, next) ? prev : next))
    }

    apply()
    void document.fonts.ready.then(apply)

    const slot = slotRef.current
    if (!slot) return
    slotWidthRef.current = slot.getBoundingClientRect().width
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width
      if (width == null) return
      if (slotWidthRef.current != null && Math.abs(slotWidthRef.current - width) < 0.5) return
      slotWidthRef.current = width
      apply()
    })
    observer.observe(slot)
    return () => observer.disconnect()
  }, [quote])

  useEffect(() => {
    if (!hasLines) return

    const controller = new AbortController()
    const { signal } = controller

    async function runLoop() {
      if (startDelayMs > 0) await sleep(startDelayMs, signal)

      if (prefersReducedMotion()) {
        for (const el of units()) applyFrame(el, ENTER_TO)
        while (!signal.aborted) {
          await sleep(PLAYBACK.holdMs, signal)
          setQuote((prev) => getRandomQuoteOtherThan(prev))
        }
        return
      }

      await animateUnits(
        units(),
        ENTER_FROM,
        ENTER_TO,
        ENTER.duration,
        ENTER.stagger,
        ENTER.easing,
        signal,
      )

      while (!signal.aborted) {
        await sleep(PLAYBACK.holdMs, signal)
        await animateUnits(
          units(),
          ENTER_TO,
          EXIT_TO,
          EXIT.duration,
          EXIT.stagger,
          EXIT.easing,
          signal,
        )

        flushSync(() => {
          setQuote((prev) => getRandomQuoteOtherThan(prev))
        })
        flushSync(() => {
          const next = captureLines()
          if (next.length) setLines(next)
        })

        await sleep(PLAYBACK.microDelayMs, signal)

        await animateUnits(
          units(),
          ENTER_FROM,
          ENTER_TO,
          ENTER.duration,
          ENTER.stagger,
          ENTER.easing,
          signal,
        )
        await sleep(PLAYBACK.gapMs, signal)
      }
    }

    runLoop().catch((error: unknown) => {
      if (isAbortError(error)) return
      throw error
    })

    return () => controller.abort()
  }, [hasLines, startDelayMs])

  useLayoutEffect(() => {
    const inner = innerRef.current
    if (!inner || lines.length === 0) return

    const nextHeight = inner.getBoundingClientRect().height
    const prevHeight = slotHeightRef.current
    const reduceMotion = prefersReducedMotion()

    if (prevHeight == null || Math.abs(prevHeight - nextHeight) < 0.5 || reduceMotion) {
      slotHeightRef.current = nextHeight
      setHeightTransition("none")
      setSlotHeight(nextHeight)
      return
    }

    // Keep the previous pixel height for this paint, then ease to the new
    // height on the following frame so the CSS transition actually runs.
    setHeightTransition("none")
    setSlotHeight(prevHeight)

    let followFrame = 0
    const startFrame = requestAnimationFrame(() => {
      followFrame = requestAnimationFrame(() => {
        slotHeightRef.current = nextHeight
        setHeightTransition(`height ${ENTER.duration}ms ${ENTER.easing}`)
        setSlotHeight(nextHeight)
      })
    })

    return () => {
      cancelAnimationFrame(startFrame)
      cancelAnimationFrame(followFrame)
    }
  }, [quote, lines])

  return (
    <blockquote
      ref={slotRef}
      className="dashboard-quote-sm-only-pad relative w-full overflow-hidden text-[32px] text-foreground/90 font-medium"
      style={{
        perspective: "900px",
        transformStyle: "preserve-3d",
        height: slotHeight != null ? `${slotHeight}px` : undefined,
        transition: heightTransition,
      }}
    >
      <div ref={innerRef} style={{ paddingLeft: HANG }}>
        <div className="relative">
          <div
            ref={measureRef}
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 text-[32px] font-medium leading-[44px]"
            style={{ visibility: "hidden", textWrap: "balance" }}
          >
            {quote.quote}&rdquo;
          </div>

          {lines.map((line, index) => (
            <MaskedLine
              key={`${quote.author}-${index}-${line}`}
              hanging={index === 0}
              className="leading-[44px]"
            >
              {line}
            </MaskedLine>
          ))}
          <MaskedLine className="mt-4 text-base font-normal text-muted-foreground">
            — {quote.author}
          </MaskedLine>
        </div>
      </div>
    </blockquote>
  )
}
