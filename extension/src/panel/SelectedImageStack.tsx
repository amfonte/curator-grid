import { motion, useMotionValue, useSpring, useTransform } from "motion/react"
import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent } from "react"
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

type StackImageProps = {
  image: SelectedImage
  containerWidth: number
  onRemove: () => void
}

function StackImage({ image, containerWidth, onRemove }: StackImageProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [isHovered, setIsHovered] = useState(false)
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

  const { displaySize, driftX, driftY } = resolveStackImageLayout({
    naturalWidth: image.naturalWidth,
    naturalHeight: image.naturalHeight,
    containerWidth,
    targetScale,
    targetRotate,
    driftX: image.stackEntranceDriftX,
    driftY: image.stackEntranceDriftY,
  })

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

  const localPointer = (event: PointerEvent<HTMLDivElement>) => {
    const card = cardRef.current
    if (!card) {
      return clampCenter(displaySize.width / 2, displaySize.height / 2)
    }

    const { x, y } = pointerToCardLocal(
      event.clientX,
      event.clientY,
      card,
      targetScale,
      targetRotate,
    )
    return clampCenter(x, y)
  }

  const trackPointer = (event: PointerEvent<HTMLDivElement>) => {
    const { x, y } = localPointer(event)
    pointerX.set(x)
    pointerY.set(y)
  }

  const snapBadgeToPointer = (event: PointerEvent<HTMLDivElement>) => {
    const { x, y } = localPointer(event)
    pointerX.set(x)
    pointerY.set(y)
    badgeX.jump(x)
    badgeY.jump(y)
  }

  const handlePointerEnter = (event: PointerEvent<HTMLDivElement>) => {
    setIsHovered(true)
    snapBadgeToPointer(event)
  }

  const handlePointerLeave = () => {
    setIsHovered(false)
  }

  return (
    <motion.div
      className="absolute left-1/2 top-1/2"
      style={{
        zIndex: stackZIndex(image.stackLayer),
        x: "-50%",
        y: `calc(-50% + ${STACK_ENTRANCE_ORIGIN_OFFSET_Y_PX}px)`,
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
          opacity: 1,
          rotate: targetRotate,
          scale: targetScale,
          x: driftX,
          y: driftY,
        }}
        transition={cardEntranceTransition}
        onAnimationStart={() => {
          if (!skipEntrance) markStackEntrancePlayed(image.url)
        }}
      >
        <div
          ref={cardRef}
          className="relative leading-none"
          style={{
            width: displaySize.width,
            height: displaySize.height,
            boxShadow: CARD_SHADOW,
            borderRadius: IMAGE_BORDER_RADIUS_PX,
            overflow: "hidden",
          }}
          onPointerEnter={handlePointerEnter}
          onPointerLeave={handlePointerLeave}
          onPointerMove={trackPointer}
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
            visible={isHovered}
            onClick={onRemove}
          />
        </div>
      </motion.div>
    </motion.div>
  )
}

export function SelectedImageStack({ images, onRemoveImage }: SelectedImageStackProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(0)

  useLayoutEffect(() => {
    const el = containerRef.current
    if (!el) return

    const syncWidth = () => setContainerWidth(el.clientWidth)
    syncWidth()

    const observer = new ResizeObserver(syncWidth)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  if (images.length === 0) return null

  const stackedImages = [...images].sort((a, b) => a.stackLayer - b.stackLayer)

  return (
    <div
      ref={containerRef}
      className="relative w-full shrink-0 overflow-visible"
      style={{ height: IMAGE_STACK_HEIGHT_PX }}
    >
      {stackedImages.map((image) => (
        <StackImage
          key={image.url}
          image={image}
          containerWidth={containerWidth}
          onRemove={() => onRemoveImage(image.url)}
        />
      ))}
    </div>
  )
}
