"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { animate } from "motion"
import { motion, useMotionValue, useTransform } from "motion/react"
import * as SliderPrimitive from "@radix-ui/react-slider"
import { cn } from "@/lib/utils"
import { SizeStepDots } from "@/components/dashboard/size-step-dots"

const TRACK_DOT_COUNT = 6
const THUMB_SIZE_PX = 40
/** Click zone per step: 17px + 6px dot + 17px = 40px (matches thumb) */
const TRACK_STEP_ZONE_PX = 40
const TRACK_DOT_SIZE_PX = 6
/** Dots row: content width (248 - 21*2) and base gap between 6 dots */
const DOTS_CONTENT_WIDTH = 206
const PILL_WIDTH_PX = 248

/** Rubber-band physics (fine-tune here):
 *  - MAX_PX: Hard limit on how far the thumb/pill can stretch past position 1 or 6 (in pixels).
 *  - RESISTANCE: 0–1. How much pointer movement becomes stretch. offset = overdrag * RESISTANCE, then clamped to MAX_PX.
 *    Lower = easier to pull (less drag needed to reach max). Higher = stiffer (more drag to reach max).
 *    To hit max, user must drag at least MAX_PX / RESISTANCE px past the edge (e.g. 48/0.35 ≈ 137px).
 */
const RUBBER_BAND_MAX_PX = 16
const RUBBER_BAND_RESISTANCE = 0.08

const TRACK_WIDTH_PX = 240

export interface SizeSliderProps {
  value: number
  onValueChange: (value: number) => void
  min?: number
  max?: number
  className?: string
  "aria-label"?: string
}

/**
 * Size slider: pill track with 6 gray dots and a sliding SizeStepDots thumb.
 * Rubber-band: pill stretches (opposite edge stationary). Past 1: dots move left with thumb, right edge fixed.
 * Past 6: dots left edge fixed, only gap/width grow so right edge moves with pill and thumb.
 */
export function SizeSlider({
  value,
  onValueChange,
  min = 1,
  max = 6,
  className,
  "aria-label": ariaLabel = "Columns per row",
}: SizeSliderProps) {
  const [isThumbHovered, setIsThumbHovered] = useState(false)
  const [isThumbPressed, setIsThumbPressed] = useState(false)
  const thumbInteractive = isThumbHovered || isThumbPressed

  const trackRef = useRef<HTMLDivElement>(null)
  const rubberBandX = useMotionValue(0)
  /** Pill stretches with one edge fixed; origin = opposite edge so that edge stays stationary. */
  const [stretchOrigin, setStretchOrigin] = useState<"left" | "right">("right")
  const stretchScaleX = useTransform(rubberBandX, (x) => {
    const extra = Math.min(Math.abs(x), RUBBER_BAND_MAX_PX)
    return 1 + extra / PILL_WIDTH_PX
  })

  /** Elastic spacing: only the gap between track dots changes; dot size stays fixed. */
  const dotsGap = useTransform(rubberBandX, (x) => {
    const extra = Math.min(Math.abs(x), RUBBER_BAND_MAX_PX)
    const gapPx = (DOTS_CONTENT_WIDTH - TRACK_DOT_COUNT * TRACK_DOT_SIZE_PX + extra) / (TRACK_DOT_COUNT - 1)
    return `${gapPx}px`
  })
  const dotsRowWidth = useTransform(rubberBandX, (x) => {
    const extra = Math.min(Math.abs(x), RUBBER_BAND_MAX_PX)
    return `${DOTS_CONTENT_WIDTH + extra}px`
  })
  /** Dots translate only when overdragging left (past 1); when overdragging right (past 6) left edge stays fixed. */
  const dotsX = useTransform(rubberBandX, (x) => (x <= 0 ? x : 0))

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isThumbPressed || !trackRef.current) return
      const rect = trackRef.current.getBoundingClientRect()
      const clientX = e.clientX
      const thumbCenterX = rect.left + ((value - min) / (max - min)) * rect.width
      let offset = 0
      if (value === min && clientX < thumbCenterX) {
        const overdrag = thumbCenterX - clientX
        offset = -Math.min(overdrag * RUBBER_BAND_RESISTANCE, RUBBER_BAND_MAX_PX)
        setStretchOrigin("right") // right edge stays fixed, pill stretches left
      } else if (value === max && clientX > thumbCenterX) {
        const overdrag = clientX - thumbCenterX
        offset = Math.min(overdrag * RUBBER_BAND_RESISTANCE, RUBBER_BAND_MAX_PX)
        setStretchOrigin("left") // left edge stays fixed, pill stretches right
      }
      rubberBandX.set(offset)
    },
    [isThumbPressed, value, min, max, rubberBandX],
  )

  const handlePointerUpOrCancel = useCallback(() => {
    setIsThumbPressed(false)
    setIsThumbHovered(false)
    animate(rubberBandX, 0, { type: "spring", stiffness: 400, damping: 35 })
  }, [rubberBandX])

  const prevPressedRef = useRef(isThumbPressed)
  useEffect(() => {
    if (prevPressedRef.current && !isThumbPressed) {
      animate(rubberBandX, 0, { type: "spring", stiffness: 400, damping: 35 })
    }
    prevPressedRef.current = isThumbPressed
  }, [isThumbPressed, rubberBandX])

  return (
    <div
      className={cn(
        "relative flex h-12 w-[248px] shrink-0 items-center overflow-visible",
        className,
      )}
    >
      {/* Pill: stays in place, stretches so opposite edge stays stationary */}
      <motion.div
        className="absolute inset-0 rounded-full bg-card"
        style={{
          transformOrigin: stretchOrigin === "left" ? "left center" : "right center",
          scaleX: stretchScaleX,
        }}
        aria-hidden
      />
      {/* Track dots: translate only when overdrag left; when overdrag right, left edge stays fixed */}
      <motion.div
        className="absolute left-[21px] top-1/2 -translate-y-1/2 flex h-12 items-center"
        style={{
          width: dotsRowWidth,
          gap: dotsGap,
          x: dotsX,
        }}
        aria-hidden
      >
        {Array.from({ length: TRACK_DOT_COUNT }, (_, i) => (
          <span
            key={i}
            className="shrink-0 rounded-full bg-muted-foreground/70"
            style={{
              width: TRACK_DOT_SIZE_PX,
              height: TRACK_DOT_SIZE_PX,
            }}
          />
        ))}
      </motion.div>
      {/* Only thumb (slider) translates with rubber-band so pill + thumb move; dots behave asymmetrically above */}
      <motion.div
        className="absolute left-0 top-0 flex h-12 w-[248px] items-center"
        style={{ x: rubberBandX }}
        aria-hidden
      >
        {/* Slider (track + thumb) */}
        <div
          ref={trackRef}
          className="absolute left-[4px] top-1/2 w-[240px] -translate-y-1/2 flex h-12 items-center"
        >
            <SliderPrimitive.Root
              value={[value]}
              onValueChange={([v]) => onValueChange(v)}
              min={min}
              max={max}
              step={1}
              className="size-slider-root relative h-full w-full touch-none select-none"
              style={{
                ["--thumb-left-px" as string]: `${(value - min) * TRACK_STEP_ZONE_PX}px`,
              }}
              aria-label={ariaLabel}
            >
            <SliderPrimitive.Track className="relative h-full min-h-12 w-full grow" />
            {/* Overlay behind thumb: 6 zones so track clicks work; thumb stays on top for dragging */}
            {(() => {
              return (
                <div
                  className="pointer-events-none absolute inset-0 flex"
                  style={{ width: TRACK_WIDTH_PX }}
                  aria-hidden
                >
                  {Array.from({ length: max - min + 1 }, (_, i) => {
                    const stepValue = min + i
                    return (
                      <button
                        key={stepValue}
                        type="button"
                        className="pointer-events-auto min-w-0 cursor-pointer touch-manipulation"
                        style={{ width: TRACK_STEP_ZONE_PX }}
                        onPointerDown={(e) => {
                          if (stepValue === value) {
                            e.stopPropagation()
                            return
                          }
                          e.stopPropagation()
                          onValueChange(stepValue)
                        }}
                        onClick={(e) => e.preventDefault()}
                        aria-label={`Set to ${stepValue} column${stepValue !== 1 ? "s" : ""}`}
                      />
                    )
                  })}
                </div>
              )
            })()}
            <SliderPrimitive.Thumb
              data-dragging={isThumbPressed}
              className={cn(
                "size-slider-thumb flex size-10 shrink-0 items-center justify-center rounded-full",
                "border-0 bg-transparent p-0 shadow-none outline-none",
                "focus-visible:outline-none",
                "disabled:pointer-events-none disabled:opacity-50",
              )}
              style={{ width: THUMB_SIZE_PX, height: THUMB_SIZE_PX }}
              onPointerEnter={() => setIsThumbHovered(true)}
              onPointerLeave={() => {
                setIsThumbHovered(false)
                setIsThumbPressed(false)
              }}
              onPointerDown={() => setIsThumbPressed(true)}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUpOrCancel}
              onPointerCancel={handlePointerUpOrCancel}
            >
              <motion.span
                className="size-slider-thumb-inner pointer-events-none flex size-10 shrink-0 items-center justify-center rounded-full"
                style={{
                  scale: isThumbPressed ? 0.96 : 1,
                }}
                transition={{ scale: { duration: 0.15 } }}
              >
                <SizeStepDots
                  value={value}
                  variant={thumbInteractive ? "hover" : "default"}
                  className="pointer-events-none"
                />
              </motion.span>
            </SliderPrimitive.Thumb>
          </SliderPrimitive.Root>
        </div>
      </motion.div>
    </div>
  )
}
