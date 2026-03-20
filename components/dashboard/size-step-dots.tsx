"use client"

import { cn } from "@/lib/utils"

/** Dot positions for steps 1–6 (center in 40px box: 20,20). Each entry is [x,y] offset from center in px. */
const STEP_POSITIONS: Record<number, [number, number][]> = {
  1: [[0, 0]],
  2: [[-4, 0], [4, 0]],
  3: [[-4, -3], [4, -3], [0, 5]],
  4: [[-4, -4], [4, -4], [-4, 4], [4, 4]],
  5: [[-4, -7], [4, -7], [0, 1], [-4, 9], [4, 9]],
  6: [[-4, -7], [4, -7], [-4, 1], [4, 1], [-4, 9], [4, 9]],
}

export interface SizeStepDotsProps {
  /** Current step 1–6 */
  value: number
  /** Gradient variant: default (gray-80→100) or hover/pressed (gray-90→100) */
  variant?: "default" | "hover"
  className?: string
  /** Dot size in px (default 6 to match Figma) */
  dotSize?: number
}

/**
 * Renders the active size step as a dark circle with 1–6 white dots.
 * Styled as icon-only primary CTA: gradient, 2px border, glossy inset shadow.
 * Dots update instantly when `value` changes (no transition).
 */
export function SizeStepDots({ value, variant = "default", className, dotSize = 6 }: SizeStepDotsProps) {
  const step = Math.min(6, Math.max(1, value))
  const positions = STEP_POSITIONS[step] ?? STEP_POSITIONS[1]

  const gradient =
    variant === "hover"
      ? "linear-gradient(180deg, var(--gray-90) 0%, var(--gray-100) 100%)"
      : "linear-gradient(180deg, var(--gray-80) 0%, var(--gray-100) 100%)"

  return (
    <div
      className={cn(
        "relative flex size-10 shrink-0 items-center justify-center rounded-full transition-[background] duration-150 ease-out",
        className,
      )}
      style={{
        border: "2px solid var(--gray-100, #262626)",
        background: gradient,
        boxShadow:
          "inset 0 1.5px 0 0 rgba(255, 255, 255, 0.35), inset 0 8px 6px 0 var(--gray-100, #262626), inset 0 -6px 6px 0 rgba(255, 255, 255, 0.25)",
      }}
      aria-hidden
    >
      <div className="absolute inset-0 flex items-center justify-center rounded-[inherit]">
        {positions.map(([dx, dy], i) => (
          <span
            key={i}
            className="absolute rounded-full"
            style={{
              width: dotSize,
              height: dotSize,
              borderRadius: dotSize,
              background:
                "linear-gradient(180deg, var(--Surface-Secondary, #FFF) 0%, var(--Grayscale-40, #E6E6E6) 100%)",
              boxShadow: "0 0.5px 0.5px 0 #000",
              left: `calc(50% + ${dx}px)`,
              top: `calc(50% + ${dy}px)`,
              transform: "translate(-50%, -50%)",
            }}
          />
        ))}
      </div>
    </div>
  )
}
