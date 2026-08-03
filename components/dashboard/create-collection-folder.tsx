"use client"

import { useState, useRef, useEffect } from "react"
import { ScaledFolderFrame } from "@/components/dashboard/scaled-folder-frame"
import { SmokyDissolveShell } from "@/components/ui/smoky-dissolve-shell"
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
  /** Called after the poof animation finishes. */
  onPoofComplete?: () => void
  /** When true, the folder graphic plays a smoky dissolve dismiss animation (e.g. on cancel). */
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
  onPoofComplete,
  className,
  placeholder = "Untitled collection",
}: CreateCollectionFolderProps) {
  const [hover, setHover] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

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
      className={cn("relative flex w-full flex-col items-stretch overflow-visible", className)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <SmokyDissolveShell
        dissolving={poofing}
        variant="collection"
        className="relative flex flex-col overflow-visible"
        onComplete={onPoofComplete}
      >
        <div className="relative w-full overflow-visible">
          <ScaledFolderFrame
            wrapperClassName="w-full overflow-visible"
            type="Empty"
            state={hover && !poofing ? "Hover" : "Default"}
          />
          <button
            type="button"
            onPointerDown={() => inputRef.current?.blur()}
            onClick={onCancel}
            disabled={creating || poofing}
            className="absolute right-[-8px] top-[8px] flex size-[48px] items-center justify-center rounded-full cta-primary cta-icon disabled:pointer-events-none"
            aria-label="Cancel"
          >
            <X className="size-6 shrink-0" aria-hidden />
          </button>
        </div>

        <div className="mt-3 w-full px-2">
          <form onSubmit={handleFormSubmit} className="w-full">
            <input
              ref={inputRef}
              type="text"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={handleFocus}
              placeholder={placeholder}
              disabled={creating || poofing}
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
      </SmokyDissolveShell>
    </div>
  )
}
