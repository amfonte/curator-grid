const BORDER_INSET = 1
export const DASH_LENGTH = 13
export const GAP_LENGTH = 8
/** Shifts the dash pattern along the perimeter (px). Negative = counter-clockwise. */
const DASH_PHASE_OFFSET = -6

type Rect = {
  x: number
  y: number
  w: number
  h: number
  r: number
  right: number
  bottom: number
}

type LineSegment = {
  kind: "line"
  x1: number
  y1: number
  x2: number
  y2: number
  length: number
}

type ArcSegment = {
  kind: "arc"
  cx: number
  cy: number
  radius: number
  startAngle: number
  endAngle: number
  clockwise: boolean
  length: number
}

type BorderSegment = LineSegment | ArcSegment

function getRect(width: number, height: number, borderRadius: number): Rect {
  const x = BORDER_INSET
  const y = BORDER_INSET
  const w = width - BORDER_INSET * 2
  const h = height - BORDER_INSET * 2
  const r = Math.min(borderRadius, w / 2, h / 2)

  return { x, y, w, h, r, right: x + w, bottom: y + h }
}

function arcLength(radius: number): number {
  return (Math.PI * radius) / 2
}

function pointOnArc(segment: ArcSegment, distance: number): { x: number; y: number } {
  const t = distance / segment.length
  const angle =
    segment.startAngle + (segment.endAngle - segment.startAngle) * t * (segment.clockwise ? 1 : -1)

  return {
    x: segment.cx + segment.radius * Math.cos(angle),
    y: segment.cy + segment.radius * Math.sin(angle),
  }
}

function buildClockwiseSegments(rect: Rect): BorderSegment[] {
  const { x, y, r, right, bottom } = rect
  const arc = arcLength(r)

  return [
    { kind: "line", x1: x + r, y1: y, x2: right - r, y2: y, length: right - r - (x + r) },
    {
      kind: "arc",
      cx: right - r,
      cy: y + r,
      radius: r,
      startAngle: -Math.PI / 2,
      endAngle: 0,
      clockwise: true,
      length: arc,
    },
    { kind: "line", x1: right, y1: y + r, x2: right, y2: bottom - r, length: bottom - r - (y + r) },
    {
      kind: "arc",
      cx: right - r,
      cy: bottom - r,
      radius: r,
      startAngle: 0,
      endAngle: Math.PI / 2,
      clockwise: true,
      length: arc,
    },
    { kind: "line", x1: right - r, y1: bottom, x2: x + r, y2: bottom, length: right - r - (x + r) },
    {
      kind: "arc",
      cx: x + r,
      cy: bottom - r,
      radius: r,
      startAngle: Math.PI / 2,
      endAngle: Math.PI,
      clockwise: true,
      length: arc,
    },
    { kind: "line", x1: x, y1: bottom - r, x2: x, y2: y + r, length: bottom - r - (y + r) },
    {
      kind: "arc",
      cx: x + r,
      cy: y + r,
      radius: r,
      startAngle: Math.PI,
      endAngle: (Math.PI * 3) / 2,
      clockwise: true,
      length: arc,
    },
  ]
}

function totalLength(segments: BorderSegment[]): number {
  return segments.reduce((sum, segment) => sum + segment.length, 0)
}

function normalizeDistance(distance: number, perimeter: number): number {
  let value = distance % perimeter
  if (value < 0) value += perimeter
  return value
}

function locate(segments: BorderSegment[], distance: number): {
  segmentIndex: number
  segmentOffset: number
} {
  let remaining = distance

  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index]
    if (remaining < segment.length) {
      return { segmentIndex: index, segmentOffset: remaining }
    }
    remaining -= segment.length
  }

  return { segmentIndex: 0, segmentOffset: 0 }
}

function pointAtDistance(segments: BorderSegment[], distance: number): { x: number; y: number } {
  const perimeter = totalLength(segments)
  const target = normalizeDistance(distance, perimeter)
  const { segmentIndex, segmentOffset } = locate(segments, target)
  const segment = segments[segmentIndex]

  if (segment.kind === "line") {
    const t = segment.length === 0 ? 0 : segmentOffset / segment.length
    return {
      x: segment.x1 + (segment.x2 - segment.x1) * t,
      y: segment.y1 + (segment.y2 - segment.y1) * t,
    }
  }

  return pointOnArc(segment, segmentOffset)
}

function appendArc(path: string[], segment: ArcSegment, fromOffset: number, toOffset: number) {
  const start = pointOnArc(segment, fromOffset)
  const end = pointOnArc(segment, toOffset)
  const sweep = segment.clockwise ? 1 : 0
  const largeArc = 0

  if (path.length === 0) {
    path.push(`M ${start.x} ${start.y}`)
  }

  path.push(`A ${segment.radius} ${segment.radius} 0 ${largeArc} ${sweep} ${end.x} ${end.y}`)
}

function appendLine(path: string[], segment: LineSegment, fromOffset: number, toOffset: number) {
  const startX = segment.x1 + ((segment.x2 - segment.x1) * fromOffset) / segment.length
  const startY = segment.y1 + ((segment.y2 - segment.y1) * fromOffset) / segment.length
  const endX = segment.x1 + ((segment.x2 - segment.x1) * toOffset) / segment.length
  const endY = segment.y1 + ((segment.y2 - segment.y1) * toOffset) / segment.length

  if (path.length === 0) {
    path.push(`M ${startX} ${startY}`)
  }

  path.push(`L ${endX} ${endY}`)
}

function pathBetween(segments: BorderSegment[], startDistance: number, endDistance: number): string {
  const perimeter = totalLength(segments)
  const path: string[] = []

  let distance = startDistance
  const target = endDistance < startDistance ? endDistance + perimeter : endDistance

  while (distance < target - 1e-6) {
    const normalized = normalizeDistance(distance, perimeter)
    const { segmentIndex, segmentOffset } = locate(segments, normalized)
    const segment = segments[segmentIndex]
    const remainingInSegment = segment.length - segmentOffset
    const step = Math.min(remainingInSegment, target - distance)

    if (step <= 1e-9) {
      break
    }

    if (segment.kind === "line") {
      appendLine(path, segment, segmentOffset, segmentOffset + step)
    } else {
      appendArc(path, segment, segmentOffset, segmentOffset + step)
    }

    distance += step
  }

  return path.join(" ")
}

function lineDashes(x1: number, y1: number, x2: number, y2: number): string[] {
  const dx = x2 - x1
  const dy = y2 - y1
  const length = Math.hypot(dx, dy)
  if (length <= 0) return []

  const unitX = dx / length
  const unitY = dy / length
  const dashCount = Math.max(1, Math.round(length / (DASH_LENGTH + GAP_LENGTH)))
  const gap = (length - dashCount * DASH_LENGTH) / dashCount

  const paths: string[] = []
  let offset = 0

  for (let index = 0; index < dashCount; index += 1) {
    paths.push(
      `M ${x1 + unitX * offset} ${y1 + unitY * offset} L ${x1 + unitX * (offset + DASH_LENGTH)} ${y1 + unitY * (offset + DASH_LENGTH)}`,
    )
    offset += DASH_LENGTH + gap
  }

  return paths
}

function cornerApexDistance(segments: BorderSegment[], corner: "tr" | "br" | "bl" | "tl"): number {
  let distance = 0

  for (const segment of segments) {
    if (segment.kind === "arc") {
      const isTopRight =
        corner === "tr" &&
        segment.startAngle === -Math.PI / 2 &&
        segment.endAngle === 0
      const isBottomRight =
        corner === "br" && segment.startAngle === 0 && segment.endAngle === Math.PI / 2
      const isBottomLeft =
        corner === "bl" && segment.startAngle === Math.PI / 2 && segment.endAngle === Math.PI
      const isTopLeft =
        corner === "tl" && segment.startAngle === Math.PI && segment.endAngle === (Math.PI * 3) / 2

      if (isTopRight || isBottomRight || isBottomLeft || isTopLeft) {
        return distance + segment.length / 2
      }
    }

    distance += segment.length
  }

  return 0
}

function cornerPairPaths(segments: BorderSegment[], apexDistance: number): [string, string] {
  const perimeter = totalLength(segments)
  const start = apexDistance - DASH_LENGTH
  const mid = apexDistance
  const end = apexDistance + DASH_LENGTH

  return [
    pathBetween(segments, start, mid),
    pathBetween(segments, mid, end),
  ]
}

function straightBetween(
  segments: BorderSegment[],
  startDistance: number,
  endDistance: number,
): string[] {
  const perimeter = totalLength(segments)
  const start = normalizeDistance(startDistance, perimeter)
  let end = normalizeDistance(endDistance, perimeter)

  if (end <= start) {
    end += perimeter
  }

  const startPoint = pointAtDistance(segments, start)
  const endPoint = pointAtDistance(segments, end)

  return lineDashes(startPoint.x, startPoint.y, endPoint.x, endPoint.y)
}

/** 13px dashes / 8px gaps on straights; at each corner, two 13px dashes with no gap between. */
export function buildDashedBorderPaths(
  width: number,
  height: number,
  borderRadius: number,
): string[] {
  const rect = getRect(width, height, borderRadius)
  const segments = buildClockwiseSegments(rect)
  const perimeter = totalLength(segments)

  const phase = (distance: number) => normalizeDistance(distance + DASH_PHASE_OFFSET, perimeter)

  const trApex = phase(cornerApexDistance(segments, "tr"))
  const brApex = phase(cornerApexDistance(segments, "br"))
  const blApex = phase(cornerApexDistance(segments, "bl"))
  const tlApex = phase(cornerApexDistance(segments, "tl"))

  const paths: string[] = [
    ...cornerPairPaths(segments, trApex),
    ...cornerPairPaths(segments, brApex),
    ...cornerPairPaths(segments, blApex),
    ...cornerPairPaths(segments, tlApex),
    ...straightBetween(segments, tlApex + DASH_LENGTH, trApex - DASH_LENGTH),
    ...straightBetween(segments, trApex + DASH_LENGTH, brApex - DASH_LENGTH),
    ...straightBetween(segments, brApex + DASH_LENGTH, blApex - DASH_LENGTH),
    ...straightBetween(segments, blApex + DASH_LENGTH, tlApex - DASH_LENGTH),
  ]

  return paths.filter(Boolean)
}
