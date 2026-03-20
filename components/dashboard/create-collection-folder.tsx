"use client"

import { useState, useRef, useEffect } from "react"
import { Folder } from "@/components/dashboard/folder"
import { cn } from "@/lib/utils"
import { X } from "lucide-react"

export interface CreateCollectionFolderProps {
  /** Current value for the collection name. */
  value: string
  /** Called when the name changes. */
  onChange: (value: string) => void
  /** Called when the user submits (e.g. Enter). */
  onSubmit: () => void
  /** Called when the user cancels (X or Escape). */
  onCancel: () => void
  /** Whether a create request is in progress. */
  creating?: boolean
  /** When true, the folder graphic plays a "poof" disappear animation (e.g. on cancel). */
  poofing?: boolean
  /** Optional class name for the root element. */
  className?: string
  /** Placeholder when name is empty (Figma: "Untitled collection"). */
  placeholder?: string
  /** @deprecated No longer used; cancel is the top-right icon. */
  submitLabel?: string
  /** @deprecated No longer used; cancel is the top-right icon. */
  cancelLabel?: string
}

const FOLDER_HEIGHT_PX = 232
const CARD_WIDTH_PX = 335

/**
 * Create-collection UI matching Figma 1:1: Folder (Empty) with cancel icon (24px) in top-right,
 * and body/base-reg "Untitled collection" below, highlighted and ready to edit. No form field or Create/Cancel CTAs.
 * Design: https://www.figma.com/design/dR0mlOdDlNmSqNg7sYl9BJ/Curator?node-id=52-313
 * Folder graphic scales with container (same as collection cards) so sizes match when side-by-side.
 */
export function CreateCollectionFolder({
  value,
  onChange,
  onSubmit,
  onCancel,
  creating = false,
  poofing = false,
  className,
  placeholder = "Untitled collection",
}: CreateCollectionFolderProps) {
  const [hover, setHover] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState({ x: 1, y: 1 })

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect
      setScale({
        x: width / CARD_WIDTH_PX,
        y: height / FOLDER_HEIGHT_PX,
      })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    inputRef.current?.focus()
    if (value === "") {
      onChange(placeholder)
      const t = setTimeout(() => inputRef.current?.select(), 10)
      return () => clearTimeout(t)
    } else {
      inputRef.current?.select()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount to focus and inject placeholder for selection
  }, [])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault()
      onSubmit()
    }
    if (e.key === "Escape") {
      e.preventDefault()
      onCancel()
    }
  }

  function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSubmit()
  }

  function handleFocus() {
    if (value === "") {
      onChange(placeholder)
      setTimeout(() => inputRef.current?.select(), 0)
    } else {
      inputRef.current?.select()
    }
  }

  return (
    <div
      className={cn("relative flex w-full flex-col items-stretch", className)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {/* Card: folder scales with container so it matches grid collection cards */}
      <div className="relative flex w-full flex-col">
        <div
          ref={containerRef}
          className="relative w-full overflow-visible"
          style={{ aspectRatio: `${CARD_WIDTH_PX} / ${FOLDER_HEIGHT_PX}` }}
        >
          {/* Outer: poof animation (scale 1→0.4); inner: responsive scale so size matches viewport */}
          <div
            className={cn("absolute left-0 top-0 origin-top-left", poofing && "animate-poof")}
            style={{ width: CARD_WIDTH_PX, height: FOLDER_HEIGHT_PX }}
          >
            <div
              className="absolute left-0 top-0 origin-top-left"
              style={{
                width: CARD_WIDTH_PX,
                height: FOLDER_HEIGHT_PX,
                transform: `scale(${scale.x}, ${scale.y})`,
              }}
            >
              <Folder
                type="Empty"
                state={hover && !poofing ? "Hover" : "Default"}
                className="h-full w-full"
              />
            </div>
          </div>

          {/* Cancel: 24px icon in top-right, 48px Icon-Only Primary CTA (Figma: right-[-8px] top-[8px]) */}
          <button
            type="button"
            onClick={onCancel}
            disabled={creating || poofing}
            className={cn(
              "absolute right-[-8px] top-[8px] flex size-[48px] items-center justify-center rounded-full cta-primary cta-icon disabled:pointer-events-none",
              poofing && "animate-poof"
            )}
            aria-label="Cancel"
          >
            <X className="size-6 shrink-0" aria-hidden />
          </button>
        </div>

        {/* Body/base-reg label below folder: "Untitled collection", highlighted and ready to edit. Enter submits. */}
        <div
          className="w-full px-2 pt-3"
          style={{
            transition: poofing ? "opacity 200ms ease-out" : undefined,
            opacity: poofing ? 0 : 1,
          }}
        >
          <form onSubmit={handleFormSubmit} className="w-full">
            <input
              ref={inputRef}
              type="text"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={handleFocus}
              placeholder={placeholder}
              disabled={creating}
              className={cn(
                "w-full bg-transparent text-base font-normal leading-6 text-foreground",
                "placeholder:text-foreground",
                "border-0 p-0 outline-none focus:ring-0 focus:ring-offset-0",
                "selection:bg-primary/20",
                "disabled:cursor-not-allowed disabled:opacity-70"
              )}
              aria-label="Collection name"
            />
          </form>
        </div>
      </div>
    </div>
  )
}
