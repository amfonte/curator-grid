"use client"

import { useEffect, useRef, useState, type ComponentProps } from "react"
import { Folder } from "@/components/dashboard/folder"
import { cn } from "@/lib/utils"

/** Design-time folder artboard (must match `Folder` internal layout). */
export const FOLDER_ARTBOARD_WIDTH = 335
export const FOLDER_ARTBOARD_HEIGHT = 232

export type ScaledFolderFrameProps = ComponentProps<typeof Folder> & {
  /** Classes on the aspect-ratio slot (e.g. `max-w-[393px] w-full`). */
  wrapperClassName?: string
}

/**
 * Renders `Folder` at a fixed 335×232 layout, then scales uniformly to fill the slot.
 * Use anywhere the grid card uses the same pattern so the graphic matches exactly.
 */
export function ScaledFolderFrame({ wrapperClassName, className, ...folderProps }: ScaledFolderFrameProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState({ x: 1, y: 1 })

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect
      setScale({
        x: width / FOLDER_ARTBOARD_WIDTH,
        y: height / FOLDER_ARTBOARD_HEIGHT,
      })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return (
    <div
      ref={containerRef}
      className={cn("relative w-full shrink-0 overflow-hidden", wrapperClassName)}
      style={{ aspectRatio: `${FOLDER_ARTBOARD_WIDTH} / ${FOLDER_ARTBOARD_HEIGHT}` }}
    >
      <div
        className="absolute left-0 top-0 origin-top-left"
        style={{
          width: FOLDER_ARTBOARD_WIDTH,
          height: FOLDER_ARTBOARD_HEIGHT,
          transform: `scale(${scale.x}, ${scale.y})`,
        }}
      >
        <Folder {...folderProps} className={cn("h-full w-full", className)} />
      </div>
    </div>
  )
}
