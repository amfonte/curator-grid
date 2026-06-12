import { cn } from "@/lib/utils"

const BORDER_INSET = 1
const BORDER_RADIUS = 23

function roundedRectBorderPath(viewBoxWidth: number, viewBoxHeight: number): string {
  const x = BORDER_INSET
  const y = BORDER_INSET
  const w = viewBoxWidth - BORDER_INSET * 2
  const h = viewBoxHeight - BORDER_INSET * 2
  const r = Math.min(BORDER_RADIUS, w / 2, h / 2)
  const right = x + w
  const bottom = y + h
  const midX = x + w / 2

  // Start at top-center so the closed-path seam avoids corner-heavy regions.
  return [
    `M ${midX} ${y}`,
    `H ${right - r}`,
    `A ${r} ${r} 0 0 1 ${right} ${y + r}`,
    `V ${bottom - r}`,
    `A ${r} ${r} 0 0 1 ${right - r} ${bottom}`,
    `H ${x + r}`,
    `A ${r} ${r} 0 0 1 ${x} ${bottom - r}`,
    `V ${y + r}`,
    `A ${r} ${r} 0 0 1 ${x + r} ${y}`,
    `H ${midX}`,
    "Z",
  ].join(" ")
}

interface EmptyCanvasBorderProps {
  viewBoxWidth: number
  viewBoxHeight: number
  className?: string
}

export function EmptyCanvasBorder({
  viewBoxWidth,
  viewBoxHeight,
  className,
}: EmptyCanvasBorderProps) {
  return (
    <svg
      className={cn("empty-canvas-border max-[767px]:hidden", className)}
      viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path
        d={roundedRectBorderPath(viewBoxWidth, viewBoxHeight)}
        className="empty-canvas-border-rect"
      />
    </svg>
  )
}
