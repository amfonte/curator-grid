"use client"

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react"
import { motion } from "motion/react"
import { cn } from "@/lib/utils"
import {
  FolderUnion,
  FolderRect1,
  FolderRect3,
  FolderRect4,
  FolderRect5,
  FolderRect6,
  FolderLine,
} from "@/components/dashboard/folder-assets"
import type {
  FolderAppearance,
  FolderGradientTheme,
  FolderStroke,
  FolderTheme,
} from "@/lib/folder-customization"
import {
  DEFAULT_FOLDER_APPEARANCE,
  darkenByTenLightnessPoints,
  getFolderInnerShadowAlphaScale,
  getFolderRidgeLineStyle,
  getInkColorForTheme,
  getThemeGradient,
} from "@/lib/folder-customization"

/**
 * 1:1 recreation of the Curator Figma Folder component (node 52-313).
 * Uses inline SVG assets and motion for hover animation.
 */

const FOLDER_TRANSITION = {
  type: "spring" as const,
  stiffness: 700,
  damping: 17,
  mass: 1,
}

export type FolderState = "Default" | "Hover"
export type FolderType = "Filled" | "Empty"

export interface FolderProps {
  state?: FolderState
  type?: FolderType
  className?: string
  appearance?: FolderAppearance
  disableHoverAnimation?: boolean
  drawMode?: boolean
  onDrawingChange?: (drawing: FolderStroke[]) => void
}

/** Outer hit/target box (matches layout). */
const FOLDER_WIDTH = 335
const FOLDER_HEIGHT = 232
const FRONT_PANEL_Y = 40
const FRONT_PANEL_HEIGHT = 192

function buildSurfaceVars(theme: FolderTheme, gradient: FolderGradientTheme): CSSProperties {
  if (theme === "gray") {
    return {
      ["--folder-union-top" as string]: "#DBDBDB",
      ["--folder-union-bottom" as string]: "#B3B3B3",
      ["--folder-front-top" as string]: "#E6E6E6",
      ["--folder-front-bottom" as string]: "#DBDBDB",
      ["--folder-back-top" as string]: "#FFFFFF",
      ["--folder-back-bottom" as string]: "#DBDBDB",
    } as CSSProperties
  }
  const backBase = gradient.backPanel
  const backShade = darkenByTenLightnessPoints(backBase)
  return {
    ["--folder-union-top" as string]: backBase,
    ["--folder-union-bottom" as string]: backShade,
    ["--folder-front-top" as string]: gradient.frontTop,
    ["--folder-front-bottom" as string]: gradient.frontBottom,
    ["--folder-back-top" as string]: "#FFFFFF",
    ["--folder-back-bottom" as string]: "#DBDBDB",
  } as CSSProperties
}

/** Path in front-panel local space (0…335 × 0…192) — use inside the animated front `motion.div`. */
function strokesToPathFrontLocal(stroke: FolderStroke) {
  if (stroke.points.length < 2) return ""
  const first = stroke.points[0]
  const startX = first.x * FOLDER_WIDTH
  const startY = first.y * FRONT_PANEL_HEIGHT
  const segments = stroke.points
    .slice(1)
    .map((point) => `L ${point.x * FOLDER_WIDTH} ${point.y * FRONT_PANEL_HEIGHT}`)
    .join(" ")
  return `M ${startX} ${startY} ${segments}`
}

function FolderFrontDrawingSvg({
  idPrefix,
  inkColor,
  strokes,
}: {
  idPrefix: string
  inkColor: string
  strokes: FolderStroke[]
}) {
  const clipId = `${idPrefix}-front-draw-clip`
  return (
    <svg
      className="pointer-events-none absolute inset-0 z-[6] h-full w-full"
      viewBox={`0 0 ${FOLDER_WIDTH} ${FRONT_PANEL_HEIGHT}`}
      preserveAspectRatio="none"
      aria-hidden
    >
      <defs>
        <clipPath id={clipId}>
          <rect x="0" y="0" width={FOLDER_WIDTH} height={FRONT_PANEL_HEIGHT} rx="8" ry="8" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>
        {strokes.map((stroke, index) => (
          <path
            key={`draw-${index}`}
            d={strokesToPathFrontLocal(stroke)}
            fill="none"
            stroke={inkColor}
            strokeWidth={Math.max(1.2, stroke.width * FRONT_PANEL_HEIGHT)}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.95}
          />
        ))}
      </g>
    </svg>
  )
}

function emptyFrontMotion(
  isHover: boolean,
): { left: number; top: number; height: number; width: number; scaleY: number } {
  return {
    left: 0,
    top: FRONT_PANEL_Y,
    height: FRONT_PANEL_HEIGHT,
    width: FOLDER_WIDTH,
    scaleY: isHover ? 0.95833 : 1,
  }
}

export function Folder({
  className,
  state = "Default",
  type = "Empty",
  appearance = DEFAULT_FOLDER_APPEARANCE,
  disableHoverAnimation = false,
  drawMode = false,
  onDrawingChange,
}: FolderProps) {
  const idPrefix = useId()
  const [pointerState, setPointerState] = useState<"inside" | "outside">("inside")
  const drawingRef = useRef<FolderStroke[]>(appearance.drawing)
  const activeStrokeRef = useRef<FolderStroke | null>(null)
  const [localDrawing, setLocalDrawing] = useState<FolderStroke[]>(appearance.drawing)

  useEffect(() => {
    setLocalDrawing(appearance.drawing)
    drawingRef.current = appearance.drawing
  }, [appearance.drawing])

  const gradient = getThemeGradient(appearance.theme, appearance.customColor)
  const inkColor = getInkColorForTheme(appearance.theme, appearance.customColor)

  const { lineThemeStyle, lineShadowOpacity, innerShadowAlphaScale } = useMemo(() => {
    const { stroke, strokeOpacity, lineShadowOpacity: shadowA } = getFolderRidgeLineStyle(
      appearance.theme,
      appearance.customColor,
    )
    return {
      lineThemeStyle: {
        ["--folder-line-stroke" as string]: stroke,
        ["--folder-line-stroke-opacity" as string]: String(strokeOpacity),
      } as CSSProperties,
      lineShadowOpacity: shadowA,
      innerShadowAlphaScale: getFolderInnerShadowAlphaScale(appearance.theme, appearance.customColor),
    }
  }, [appearance.customColor, appearance.theme])

  const surfaceThemeStyle = useMemo(
    () => buildSurfaceVars(appearance.theme, gradient),
    [appearance.theme, gradient],
  )

  const fullThemeStyle = useMemo(
    () => ({ ...surfaceThemeStyle, ...lineThemeStyle } as CSSProperties),
    [lineThemeStyle, surfaceThemeStyle],
  )

  const effectiveState = disableHoverAnimation ? "Default" : state
  const isEmptyAndHover = type === "Empty" && effectiveState === "Hover"
  const isEmptyAndIsDefaultOrHover =
    type === "Empty" && (effectiveState === "Default" || effectiveState === "Hover")
  const isFilledAndDefault = type === "Filled" && effectiveState === "Default"
  const isFilledAndHover = type === "Filled" && effectiveState === "Hover"
  const isFilledAndIsDefaultOrHover =
    type === "Filled" && (effectiveState === "Default" || effectiveState === "Hover")

  function commitDrawing(next: FolderStroke[]) {
    drawingRef.current = next
    setLocalDrawing(next)
    onDrawingChange?.(next)
  }

  function appendPoint(point: { x: number; y: number; t: number }) {
    const active = activeStrokeRef.current
    if (!active) return
    active.points.push({ x: Math.max(0, Math.min(1, point.x)), y: Math.max(0, Math.min(1, point.y)), t: point.t })
    const current = drawingRef.current
    if (!current.length) return
    const next = [...current.slice(0, -1), { ...active, points: [...active.points] }]
    commitDrawing(next)
  }

  function startStroke(point: { x: number; y: number; t: number }) {
    const stroke: FolderStroke = {
      width: 0.016,
      points: [{ x: Math.max(0, Math.min(1, point.x)), y: Math.max(0, Math.min(1, point.y)), t: point.t }],
    }
    activeStrokeRef.current = stroke
    commitDrawing([...drawingRef.current, stroke])
  }

  function endStroke() {
    const active = activeStrokeRef.current
    if (!active) return
    activeStrokeRef.current = null
    if (active.points.length < 2) {
      commitDrawing(drawingRef.current.slice(0, -1))
    }
  }

  function pointFromEvent(el: HTMLElement, event: ReactPointerEvent<HTMLDivElement>) {
    const rect = el.getBoundingClientRect()
    const px = ((event.clientX - rect.left) / rect.width) * FOLDER_WIDTH
    const py = ((event.clientY - rect.top) / rect.height) * FOLDER_HEIGHT
    const inside =
      px >= 0 &&
      px <= FOLDER_WIDTH &&
      py >= FRONT_PANEL_Y &&
      py <= FRONT_PANEL_Y + FRONT_PANEL_HEIGHT
    return {
      inside,
      x: px / FOLDER_WIDTH,
      y: (py - FRONT_PANEL_Y) / FRONT_PANEL_HEIGHT,
      t: performance.now(),
    }
  }

  const rootStyle = isFilledAndIsDefaultOrHover ? fullThemeStyle : lineThemeStyle

  return (
    <div
      className={cn("relative isolate h-[232px] w-[335px] touch-none", className)}
      style={rootStyle}
      role="img"
      aria-label={type === "Empty" ? "Empty folder" : "Folder with contents"}
      onPointerMove={(event) => {
        if (!drawMode) return
        const point = pointFromEvent(event.currentTarget, event)
        setPointerState(point.inside ? "inside" : "outside")
        if (activeStrokeRef.current && point.inside) appendPoint(point)
      }}
      onPointerDown={(event) => {
        if (!drawMode) return
        const point = pointFromEvent(event.currentTarget, event)
        if (!point.inside) return
        event.currentTarget.setPointerCapture(event.pointerId)
        startStroke(point)
      }}
      onPointerUp={endStroke}
      onPointerCancel={endStroke}
    >
      {isEmptyAndIsDefaultOrHover ? (
        <div className="absolute inset-0" style={surfaceThemeStyle}>
          <div className="absolute top-0 right-[8px] left-[8px] z-0 h-[232px]" data-name="Union">
            <FolderUnion idPrefix={`${idPrefix}u`} className="absolute block size-full" aria-hidden />
          </div>
          <motion.div
            className={cn("absolute z-10 origin-bottom")}
            initial={false}
            animate={emptyFrontMotion(isEmptyAndHover)}
            transition={FOLDER_TRANSITION}
          >
            <FolderRect1
              idPrefix={`${idPrefix}r1`}
              className="absolute inset-0 block h-full w-full"
              innerShadowAlphaScale={innerShadowAlphaScale}
              aria-hidden
            />
            <FolderFrontDrawingSvg idPrefix={`${idPrefix}-empty-front`} inkColor={inkColor} strokes={localDrawing} />
          </motion.div>
        </div>
      ) : null}

      {isFilledAndIsDefaultOrHover ? (
        <>
          <div className="absolute top-0 right-[8px] left-[8px] z-0 h-[232px]" data-name="Union">
            <FolderUnion idPrefix={`${idPrefix}u`} className="absolute block size-full" aria-hidden />
          </div>
          <motion.div
            className={cn("absolute z-10 h-[156px] w-[301px]")}
            initial={false}
            animate={{ left: 17, top: 28, height: 156, width: 301 }}
            transition={FOLDER_TRANSITION}
          >
            <FolderRect3 idPrefix={`${idPrefix}r3`} className="absolute block size-full" aria-hidden />
          </motion.div>
        </>
      ) : null}

      {/* Layer 2 */}
      <motion.div
        className="absolute z-10"
        initial={false}
        animate={isFilledAndHover ? { height: 152, left: 15, top: 35, width: 305 } : isFilledAndDefault ? { height: 152, left: 15, top: 32, width: 305 } : { height: 0, left: 24, top: 200, width: 287 }}
        transition={FOLDER_TRANSITION}
      >
        {isEmptyAndIsDefaultOrHover && (
          <div className="absolute inset-[-1px_0]">
            <FolderLine
              idPrefix={`${idPrefix}l2`}
              className="block size-full"
              lineShadowOpacity={lineShadowOpacity}
              aria-hidden
            />
          </div>
        )}
        {isFilledAndIsDefaultOrHover && <FolderRect4 idPrefix={`${idPrefix}r4`} className="absolute block size-full" aria-hidden />}
      </motion.div>
      {/* Layer 3 */}
      <motion.div
        className="absolute z-10"
        initial={false}
        animate={isFilledAndHover ? { height: 152, left: 13, top: 42, width: 309 } : isFilledAndDefault ? { height: 152, left: 13, top: 36, width: 309 } : { height: 0, left: 24, top: 208, width: 287 }}
        transition={FOLDER_TRANSITION}
      >
        {isEmptyAndIsDefaultOrHover && (
          <div className="absolute inset-[-1px_0]">
            <FolderLine
              idPrefix={`${idPrefix}l3`}
              className="block size-full"
              lineShadowOpacity={lineShadowOpacity}
              aria-hidden
            />
          </div>
        )}
        {isFilledAndIsDefaultOrHover && <FolderRect5 idPrefix={`${idPrefix}r5`} className="absolute block size-full" aria-hidden />}
      </motion.div>
      {/* Layer 4 */}
      <motion.div
        className={cn("absolute z-10 origin-bottom", isFilledAndIsDefaultOrHover && "top-[40px] right-0 bottom-0 left-0")}
        initial={false}
        animate={
          isFilledAndHover
            ? { scaleY: 0.95833 }
            : isFilledAndDefault
              ? { scaleY: 1 }
              : { scaleY: 1, height: 0, left: 24, top: 216, width: 287 }
        }
        transition={FOLDER_TRANSITION}
      >
        <div className={isFilledAndIsDefaultOrHover ? "absolute inset-[0_0.12%]" : "absolute inset-[-1px_0]"}>
          {isFilledAndIsDefaultOrHover ? (
            <FolderRect6
              idPrefix={`${idPrefix}r6`}
              className="block size-full"
              innerShadowAlphaScale={innerShadowAlphaScale}
              aria-hidden
            />
          ) : (
            <FolderLine
              idPrefix={`${idPrefix}l4`}
              className="block size-full"
              lineShadowOpacity={lineShadowOpacity}
              aria-hidden
            />
          )}
        </div>
        {isFilledAndIsDefaultOrHover ? (
          <FolderFrontDrawingSvg idPrefix={`${idPrefix}-filled-front`} inkColor={inkColor} strokes={localDrawing} />
        ) : null}
      </motion.div>
      {isFilledAndIsDefaultOrHover && (
        <>
          <div className="absolute top-[200px] left-[24px] z-20 h-0 w-[287px]">
            <div className="absolute inset-[-1px_0]">
              <FolderLine
                idPrefix={`${idPrefix}lf1`}
                className="block size-full"
                lineShadowOpacity={lineShadowOpacity}
                aria-hidden
              />
            </div>
          </div>
          <div className="absolute top-[208px] left-[24px] z-20 h-0 w-[287px]">
            <div className="absolute inset-[-1px_0]">
              <FolderLine
                idPrefix={`${idPrefix}lf2`}
                className="block size-full"
                lineShadowOpacity={lineShadowOpacity}
                aria-hidden
              />
            </div>
          </div>
          <div className="absolute top-[216px] left-[24px] z-20 h-0 w-[287px]">
            <div className="absolute inset-[-1px_0]">
              <FolderLine
                idPrefix={`${idPrefix}lf3`}
                className="block size-full"
                lineShadowOpacity={lineShadowOpacity}
                aria-hidden
              />
            </div>
          </div>
        </>
      )}

      {drawMode && (
        <div
          className={cn(
            "absolute inset-0 z-40",
            pointerState === "inside" ? "cursor-crosshair" : "cursor-not-allowed",
          )}
          aria-hidden
        />
      )}
    </div>
  )
}
