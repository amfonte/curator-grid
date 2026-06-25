import { useLayoutEffect, useMemo, useRef, useState } from "react"
import { buildDashedBorderPaths } from "./dashed-border-paths"

type EmptyCanvasBorderProps = {
  borderRadius: number
}

export function EmptyCanvasBorder({ borderRadius }: EmptyCanvasBorderProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [size, setSize] = useState({ width: 327, height: 316 })

  const paths = useMemo(
    () => buildDashedBorderPaths(size.width, size.height, borderRadius),
    [size.width, size.height, borderRadius],
  )

  useLayoutEffect(() => {
    const svg = svgRef.current
    if (!svg) return

    const syncSize = () => {
      const { width, height } = svg.getBoundingClientRect()
      const roundedWidth = Math.round(width)
      const roundedHeight = Math.round(height)

      if (roundedWidth <= 0 || roundedHeight <= 0) return

      setSize((current) =>
        current.width === roundedWidth && current.height === roundedHeight
          ? current
          : { width: roundedWidth, height: roundedHeight },
      )
    }

    syncSize()

    const observer = new ResizeObserver(syncSize)
    observer.observe(svg)

    return () => observer.disconnect()
  }, [])

  return (
    <svg
      ref={svgRef}
      className="empty-canvas-border"
      viewBox={`0 0 ${size.width} ${size.height}`}
      aria-hidden="true"
    >
      {paths.map((path, index) => (
        <path key={index} d={path} className="empty-canvas-border-segment" />
      ))}
    </svg>
  )
}
