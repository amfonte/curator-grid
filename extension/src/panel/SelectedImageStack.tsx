import { motion, useMotionValue, useSpring, useTransform } from "motion/react"
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react"
import { IMAGE_BORDER_RADIUS_PX } from "../lib/pick-border"
import type { SelectedImage } from "../lib/pick-mode"
import { IMAGE_STACK_HEIGHT_PX, stackZIndex } from "../lib/image-stack"
import {
  clampBadgeCenterToCard,
  pointerToCardLocal,
} from "../lib/pointer-to-card-local"
import { resolveStackImageLayout } from "../lib/stack-image-bounds"
import {
  STACK_DRIFT_ENTRANCE,
  STACK_ENTRANCE_ORIGIN_OFFSET_Y_PX,
  STACK_FADE_ENTRANCE,
  STACK_ROTATE_ENTRANCE,
  STACK_SCALE_ENTRANCE,
  hasStackEntrancePlayed,
  markStackEntrancePlayed,
  stackEntranceStartRotate,
  stackEntranceStartScale,
} from "./stack-image-entrance"

type SelectedImageStackProps = {
  images: SelectedImage[]
  onRemoveImage: (url: string) => void
}

const CARD_SHADOW =
  "0 0 0 1px rgba(0,0,0,0.05), 0 2px 2px rgba(0,0,0,0.05), 0 4px 4px rgba(0,0,0,0.05), 0 8px 8px rgba(0,0,0,0.05), 0 16px 16px rgba(0,0,0,0.05)"

const cardEntranceTransition = {
  opacity: STACK_FADE_ENTRANCE,
  scale: STACK_SCALE_ENTRANCE,
  rotate: STACK_ROTATE_ENTRANCE,
  x: STACK_DRIFT_ENTRANCE,
  y: STACK_DRIFT_ENTRANCE,
}

const REMOVE_BADGE_SIZE_PX = 40
const REMOVE_BADGE_HALF_PX = REMOVE_BADGE_SIZE_PX / 2

/** Overdamped spring — subtle lag, no bounce or overshoot. */
const REMOVE_BADGE_FOLLOW_SPRING = {
  stiffness: 340,
  damping: 38,
  mass: 0.45,
}

const REMOVE_BADGE_FADE = {
  duration: 0.05,
  ease: [0, 0, 0.2, 1] as const,
}

/** Opacity-only exit when removing a non-last stack image. */
const STACK_REMOVE_FADE_TRANSITION = {
  duration: 0.12,
  ease: [0.4, 0, 0.2, 1] as const,
}

type StackRemoveBadgeProps = {
  x: ReturnType<typeof useTransform<number, number>>
  y: ReturnType<typeof useTransform<number, number>>
  scale: number
  visible: boolean
  onClick: () => void
}

function StackRemoveBadge({ x, y, scale, visible, onClick }: StackRemoveBadgeProps) {
  return (
    <motion.button
      type="button"
      initial={false}
      animate={{ opacity: visible ? 1 : 0 }}
      transition={REMOVE_BADGE_FADE}
      className="absolute left-0 top-0 z-10 flex size-10 items-center justify-center rounded-[24px] bg-white text-[var(--icon)] will-change-transform"
      style={{
        x,
        y,
        scale,
        boxShadow: CARD_SHADOW,
        pointerEvents: visible ? "auto" : "none",
      }}
      onClick={(event) => {
        event.stopPropagation()
        onClick()
      }}
      aria-label="Remove image"
    >
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M18 6 6 18" />
        <path d="m6 6 12 12" />
      </svg>
    </motion.button>
  )
}

function elementFromPointInRoot(container: HTMLElement, clientX: number, clientY: number) {
  const root = container.getRootNode()
  return root instanceof ShadowRoot
    ? root.elementFromPoint(clientX, clientY)
    : document.elementFromPoint(clientX, clientY)
}

/** One hovered card — topmost by stack layer at the pointer. */
function resolveTopCardUrlUnderPointer(
  container: HTMLElement,
  clientX: number,
  clientY: number,
  images: SelectedImage[],
  cardRefs: Map<string, HTMLDivElement>,
  exitingUrls: Set<string>,
): string | null {
  const hit = elementFromPointInRoot(container, clientX, clientY)
  if (!hit) return null

  const sorted = [...images].sort((a, b) => b.stackLayer - a.stackLayer)
  for (const image of sorted) {
    if (exitingUrls.has(image.url)) continue

    const card = cardRefs.get(image.url)
    if (!card) continue
    if (card === hit || card.contains(hit)) return image.url
  }

  return null
}

type StackImageProps = {
  image: SelectedImage
  containerWidth: number
  isExiting: boolean
  isHovered: boolean
  hoverSnapPoint: { clientX: number; clientY: number } | null
  registerCardRef: (url: string, element: HTMLDivElement | null) => void
  onHoverStart: (url: string, clientX: number, clientY: number) => void
  onHoverEnd: (url: string) => void
  onPointerActivity: (clientX: number, clientY: number) => void
  onRemove: () => void
  onExitComplete: () => void
}

function StackImage({
  image,
  containerWidth,
  isExiting,
  isHovered,
  hoverSnapPoint,
  registerCardRef,
  onHoverStart,
  onHoverEnd,
  onPointerActivity,
  onRemove,
  onExitComplete,
}: StackImageProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const targetScale = image.stackScale ?? 1
  const targetRotate = image.stackRotate
  const startScale = stackEntranceStartScale(targetScale)
  const startRotate = stackEntranceStartRotate(targetRotate)
  const skipEntrance = hasStackEntrancePlayed(image.url)

  useEffect(() => {
    if (skipEntrance) return
    const id = window.setTimeout(() => markStackEntrancePlayed(image.url), 450)
    return () => window.clearTimeout(id)
  }, [skipEntrance, image.url])

  const setCardRef = (element: HTMLDivElement | null) => {
    cardRef.current = element
    registerCardRef(image.url, element)
  }

  const { displaySize, driftX, driftY } = resolveStackImageLayout({
    naturalWidth: image.naturalWidth,
    naturalHeight: image.naturalHeight,
    containerWidth,
    targetScale,
    targetRotate,
    driftX: image.stackEntranceDriftX,
    driftY: image.stackEntranceDriftY,
  })

  const restPose = {
    rotate: targetRotate,
    scale: targetScale,
    x: driftX,
    y: driftY,
  }

  const pointerX = useMotionValue(displaySize.width / 2)
  const pointerY = useMotionValue(displaySize.height / 2)
  const badgeX = useSpring(pointerX, REMOVE_BADGE_FOLLOW_SPRING)
  const badgeY = useSpring(pointerY, REMOVE_BADGE_FOLLOW_SPRING)
  const clampCenter = (x: number, y: number) =>
    clampBadgeCenterToCard(
      x,
      y,
      displaySize.width,
      displaySize.height,
      REMOVE_BADGE_HALF_PX,
    )
  const badgeOffsetX = useTransform([badgeX, badgeY], ([x, y]) => {
    const clamped = clampCenter(x as number, y as number)
    return clamped.x - REMOVE_BADGE_HALF_PX
  })
  const badgeOffsetY = useTransform([badgeX, badgeY], ([x, y]) => {
    const clamped = clampCenter(x as number, y as number)
    return clamped.y - REMOVE_BADGE_HALF_PX
  })

  const localPointer = (clientX: number, clientY: number) => {
    const card = cardRef.current
    if (!card) {
      return clampCenter(displaySize.width / 2, displaySize.height / 2)
    }

    const { x, y } = pointerToCardLocal(clientX, clientY, card, targetScale, targetRotate)
    return clampCenter(x, y)
  }

  const syncBadgeToClientPoint = useCallback(
    (clientX: number, clientY: number, jump = false) => {
      const { x, y } = localPointer(clientX, clientY)
      pointerX.set(x)
      pointerY.set(y)
      if (jump) {
        badgeX.jump(x)
        badgeY.jump(y)
      }
    },
    [badgeX, badgeY, pointerX, pointerY, targetRotate, targetScale, displaySize.width, displaySize.height],
  )

  useLayoutEffect(() => {
    if (!isHovered || isExiting || !hoverSnapPoint) return
    syncBadgeToClientPoint(hoverSnapPoint.clientX, hoverSnapPoint.clientY, true)
  }, [hoverSnapPoint, isExiting, isHovered, syncBadgeToClientPoint])

  const handlePointerEnter = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (isExiting) return
    onPointerActivity(event.clientX, event.clientY)
    onHoverStart(image.url, event.clientX, event.clientY)
    syncBadgeToClientPoint(event.clientX, event.clientY, true)
  }

  const handlePointerLeave = () => {
    onHoverEnd(image.url)
  }

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    onPointerActivity(event.clientX, event.clientY)
    if (!isHovered) return
    syncBadgeToClientPoint(event.clientX, event.clientY)
  }

  return (
    <motion.div
      className="absolute left-1/2 top-1/2"
      style={{
        zIndex: stackZIndex(image.stackLayer),
        x: "-50%",
        y: `calc(-50% + ${STACK_ENTRANCE_ORIGIN_OFFSET_Y_PX}px)`,
        pointerEvents: isExiting ? "none" : "auto",
      }}
    >
      <motion.div
        initial={
          skipEntrance
            ? false
            : {
                opacity: 0,
                rotate: startRotate,
                scale: startScale,
                x: 0,
                y: 0,
              }
        }
        animate={{
          opacity: isExiting ? 0 : 1,
          ...restPose,
        }}
        transition={isExiting ? STACK_REMOVE_FADE_TRANSITION : cardEntranceTransition}
        onAnimationStart={() => {
          if (!skipEntrance && !isExiting) markStackEntrancePlayed(image.url)
        }}
        onAnimationComplete={() => {
          if (isExiting) onExitComplete()
        }}
      >
        <div
          ref={setCardRef}
          className="relative leading-none"
          style={{
            width: displaySize.width,
            height: displaySize.height,
            boxShadow: CARD_SHADOW,
            borderRadius: IMAGE_BORDER_RADIUS_PX,
            overflow: "hidden",
            cursor: isHovered && !isExiting ? "pointer" : undefined,
          }}
          onPointerEnter={handlePointerEnter}
          onPointerLeave={handlePointerLeave}
          onPointerMove={handlePointerMove}
        >
          <div className="relative h-full w-full pointer-events-none">
            <img
              src={image.url}
              alt=""
              className="block h-full w-full"
              width={displaySize.width}
              height={displaySize.height}
              draggable={false}
            />
          </div>
          <StackRemoveBadge
            x={badgeOffsetX}
            y={badgeOffsetY}
            scale={1 / targetScale}
            visible={isHovered && !isExiting}
            onClick={onRemove}
          />
        </div>
      </motion.div>
    </motion.div>
  )
}

export function SelectedImageStack({ images, onRemoveImage }: SelectedImageStackProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const lastPointerRef = useRef<{ clientX: number; clientY: number } | null>(null)
  const prevImagesRef = useRef(images)
  const [containerWidth, setContainerWidth] = useState(0)
  const [exitingUrls, setExitingUrls] = useState<Set<string>>(() => new Set())
  /** Images removed on the page before the stack exit animation finishes. */
  const [orphanedExitingImages, setOrphanedExitingImages] = useState<
    Map<string, SelectedImage>
  >(() => new Map())
  const [hoveredUrl, setHoveredUrl] = useState<string | null>(null)

  const registerCardRef = useCallback((url: string, element: HTMLDivElement | null) => {
    if (element) cardRefs.current.set(url, element)
    else cardRefs.current.delete(url)
  }, [])

  const syncHoveredUrlFromPointer = useCallback(
    (stackImages: SelectedImage[], activeExitingUrls: Set<string>) => {
      const container = containerRef.current
      const last = lastPointerRef.current
      if (!container || !last) {
        setHoveredUrl(null)
        return
      }

      const url = resolveTopCardUrlUnderPointer(
        container,
        last.clientX,
        last.clientY,
        stackImages,
        cardRefs.current,
        activeExitingUrls,
      )
      setHoveredUrl(url)
    },
    [],
  )

  const prevImages = prevImagesRef.current
  const currentUrls = new Set(images.map((image) => image.url))
  const externallyRemoved = prevImages.filter((image) => !currentUrls.has(image.url))

  const displayImagesByUrl = new Map<string, SelectedImage>()
  for (const image of images) displayImagesByUrl.set(image.url, image)
  for (const image of externallyRemoved) {
    if (!displayImagesByUrl.has(image.url)) displayImagesByUrl.set(image.url, image)
  }
  for (const [url, image] of orphanedExitingImages) {
    if (!displayImagesByUrl.has(url)) displayImagesByUrl.set(url, image)
  }
  const displayImages = [...displayImagesByUrl.values()]

  const effectiveExitingUrls = new Set(exitingUrls)
  for (const image of externallyRemoved) effectiveExitingUrls.add(image.url)

  // Persist page-body removals so orphans stay mounted through the exit animation.
  useLayoutEffect(() => {
    if (externallyRemoved.length === 0) {
      prevImagesRef.current = images
      return
    }

    setExitingUrls((current) => {
      const next = new Set(current)
      let changed = false
      for (const image of externallyRemoved) {
        if (!next.has(image.url)) {
          next.add(image.url)
          changed = true
        }
      }
      return changed ? next : current
    })

    setOrphanedExitingImages((current) => {
      const next = new Map(current)
      let changed = false
      for (const image of externallyRemoved) {
        if (!next.has(image.url)) {
          next.set(image.url, image)
          changed = true
        }
      }
      return changed ? next : current
    })

    prevImagesRef.current = images
  }, [images, externallyRemoved])

  const hoverSyncKey = `${displayImages.map((image) => image.url).join("|")}|${[...effectiveExitingUrls].join("|")}`

  useLayoutEffect(() => {
    syncHoveredUrlFromPointer(displayImages, effectiveExitingUrls)
  }, [hoverSyncKey, syncHoveredUrlFromPointer, displayImages, effectiveExitingUrls])

  useLayoutEffect(() => {
    const el = containerRef.current
    if (!el) return

    const syncWidth = () => setContainerWidth(el.clientWidth)
    syncWidth()

    const observer = new ResizeObserver(syncWidth)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  if (displayImages.length === 0) return null

  const stackedImages = displayImages.sort((a, b) => a.stackLayer - b.stackLayer)

  const handleRemove = (url: string) => {
    if (images.length <= 1) {
      onRemoveImage(url)
      return
    }

    setExitingUrls((current) => new Set(current).add(url))
  }

  const handleExitComplete = (url: string) => {
    setExitingUrls((current) => {
      const next = new Set(current)
      next.delete(url)
      return next
    })
    setOrphanedExitingImages((current) => {
      if (!current.has(url)) return current
      const next = new Map(current)
      next.delete(url)
      return next
    })

    // Stack-initiated remove: still in selection until exit finishes.
    if (images.some((image) => image.url === url)) {
      onRemoveImage(url)
    }
  }

  const handleHoverStart = (url: string, clientX: number, clientY: number) => {
    lastPointerRef.current = { clientX, clientY }
    setHoveredUrl(url)
  }

  const handleHoverEnd = (url: string) => {
    if (hoveredUrl !== url) return
    syncHoveredUrlFromPointer(displayImages, effectiveExitingUrls)
  }

  const handlePointerActivity = (clientX: number, clientY: number) => {
    lastPointerRef.current = { clientX, clientY }
  }

  const handleContainerPointerLeave = () => {
    lastPointerRef.current = null
    setHoveredUrl(null)
  }

  const lastPointer = lastPointerRef.current

  return (
    <div
      ref={containerRef}
      className="relative w-full shrink-0 overflow-visible"
      style={{ height: IMAGE_STACK_HEIGHT_PX }}
      onPointerLeave={handleContainerPointerLeave}
    >
      {stackedImages.map((image) => (
        <StackImage
          key={image.url}
          image={image}
          containerWidth={containerWidth}
          isExiting={effectiveExitingUrls.has(image.url)}
          isHovered={hoveredUrl === image.url}
          hoverSnapPoint={hoveredUrl === image.url ? lastPointer : null}
          registerCardRef={registerCardRef}
          onHoverStart={handleHoverStart}
          onHoverEnd={handleHoverEnd}
          onPointerActivity={handlePointerActivity}
          onRemove={() => handleRemove(image.url)}
          onExitComplete={() => handleExitComplete(image.url)}
        />
      ))}
    </div>
  )
}
