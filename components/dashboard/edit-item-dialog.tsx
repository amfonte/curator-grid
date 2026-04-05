"use client"

import { useEffect, useRef, useState } from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { motion } from "motion/react"
import { useDialKit } from "dialkit"
import type { Item, Board } from "@/lib/types"
import { createClient } from "@/lib/supabase/client"
import { Dialog, DialogPortal, DialogOverlay } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { FormField } from "@/components/ui/form-field"
import { Loader2, X } from "lucide-react"
import { cn } from "@/lib/utils"
import imageCompression from "browser-image-compression"

interface EditItemDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: Item & { item_boards: { board_id: string }[] }
  boards: Board[]
  onItemUpdated: () => void
  onItemDeleted: (id: string) => void
}

export function EditItemDialog({
  open,
  onOpenChange,
  item,
  boards,
  onItemUpdated,
  onItemDeleted,
}: EditItemDialogProps) {
  const supabase = createClient()
  const initialTitle = item.title || ""
  const initialNotes = item.notes || ""
  const initialBoard = item.item_boards?.[0]?.board_id || ""
  const [loading, setLoading] = useState(false)
  const [title, setTitle] = useState(initialTitle)
  const [notes, setNotes] = useState(initialNotes)
  const [selectedBoard, setSelectedBoard] = useState(initialBoard)
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null)
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null)
  const [isDragActive, setIsDragActive] = useState(false)
  const [docIconHovered, setDocIconHovered] = useState(false)
  const [dropzoneError, setDropzoneError] = useState<"incorrect-file-type" | null>(null)
  const [dropzoneErrorJiggleNonce, setDropzoneErrorJiggleNonce] = useState(0)
  const [isDropzoneErrorJiggling, setIsDropzoneErrorJiggling] = useState(false)
  const screenshotInputRef = useRef<HTMLInputElement | null>(null)
  const dropzoneErrorJiggleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const docsDial = useDialKit("Empty canvas docs", {
    usePhysics: false,
    enter: {
      type: "easing",
      duration: 0.3,
      ease: [0.44, 0.24, 0.11, 1.77],
      __mode: "easing",
    },
    leave: {
      type: "easing",
      duration: 0.25,
      ease: [0.54, 0.01, 0.32, 1],
      __mode: "easing",
    },
    physics: {
      type: "spring",
      stiffness: 820,
      damping: 23,
      mass: 0.8,
      __mode: "advanced",
    },
    frontDoc: {
      hoverX: -6,
      hoverY: 0,
      hoverRotate: -5,
    },
    backDoc: {
      hoverX: 5,
      hoverY: -8,
      hoverRotate: 10,
    },
  })
  const docsAreSpread = isDragActive || docIconHovered
  const docsTransition = docsDial.usePhysics
    ? {
        type: "spring" as const,
        stiffness: (docsDial.physics as { stiffness?: number }).stiffness ?? 820,
        damping: (docsDial.physics as { damping?: number }).damping ?? 23,
        mass: (docsDial.physics as { mass?: number }).mass ?? 0.8,
      }
    : {
        type: "tween" as const,
        duration:
          docsAreSpread && docsDial.enter.type === "easing"
            ? docsDial.enter.duration
            : !docsAreSpread && docsDial.leave.type === "easing"
              ? docsDial.leave.duration
              : 0.2,
        ease:
          docsAreSpread && docsDial.enter.type === "easing"
            ? docsDial.enter.ease
            : !docsAreSpread && docsDial.leave.type === "easing"
              ? docsDial.leave.ease
              : [0.2, 0.8, 0.4, 1],
      }

  function setDropzoneErrorWithJiggle(err: "incorrect-file-type") {
    setDropzoneError(err)
    setDropzoneErrorJiggleNonce((n) => n + 1)
    setIsDropzoneErrorJiggling(true)

    if (dropzoneErrorJiggleTimeoutRef.current) {
      clearTimeout(dropzoneErrorJiggleTimeoutRef.current)
    }
    dropzoneErrorJiggleTimeoutRef.current = setTimeout(() => {
      setIsDropzoneErrorJiggling(false)
    }, 340)
  }

  useEffect(() => {
    if (!open) return
    setTitle(initialTitle)
    setNotes(initialNotes)
    setSelectedBoard(initialBoard)
    setScreenshotFile(null)
    setScreenshotPreview(null)
    setDropzoneError(null)
  }, [open, item.id, initialTitle, initialNotes, initialBoard])

  useEffect(() => {
    return () => {
      if (dropzoneErrorJiggleTimeoutRef.current) {
        clearTimeout(dropzoneErrorJiggleTimeoutRef.current)
      }
    }
  }, [])

  const hasChanges =
    title !== initialTitle ||
    notes !== initialNotes ||
    selectedBoard !== initialBoard ||
    screenshotFile !== null

  function handleScreenshotFileSelected(nextFile: File | null) {
    if (!nextFile) {
      setScreenshotFile(null)
      setScreenshotPreview(null)
      setDropzoneError(null)
      return
    }

    const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"])
    if (!allowedTypes.has(nextFile.type)) {
      setScreenshotFile(null)
      setScreenshotPreview(null)
      setDropzoneErrorWithJiggle("incorrect-file-type")
      return
    }

    setScreenshotFile(nextFile)
    const reader = new FileReader()
    reader.onload = (event) => {
      setScreenshotPreview((event.target?.result as string) || null)
    }
    reader.onerror = () => {
      setScreenshotPreview(null)
    }
    reader.readAsDataURL(nextFile)
    setDropzoneError(null)
  }

  async function handleScreenshotUpload(): Promise<string | null> {
    if (!screenshotFile) return null

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("Not authenticated")

    const compressed = await imageCompression(screenshotFile, {
      maxSizeMB: 1,
      maxWidthOrHeight: 4096,
      fileType: "image/webp",
      useWebWorker: true,
    })

    const rawName = compressed.name || "screenshot.webp"
    const safeName = rawName
      .replace(/\.[^.]+$/, "")
      .replace(/\s+/g, "-")
      .replace(/[^a-zA-Z0-9._-]/g, "")
      .slice(0, 80) || "screenshot"
    const fileName = `${user.id}/${Date.now()}-${safeName}.webp`

    const { error: uploadError } = await supabase.storage
      .from("images")
      .upload(fileName, compressed, { contentType: "image/webp" })

    if (uploadError) throw uploadError

    const { data: { publicUrl } } = supabase.storage
      .from("images")
      .getPublicUrl(fileName)

    return publicUrl || null
  }

  async function handleSave() {
    if (!hasChanges || loading) return
    setLoading(true)
    try {
      let screenshotUrl: string | null | undefined = undefined

      if (screenshotFile && item.type === "url") {
        screenshotUrl = await handleScreenshotUpload()
      }

      await supabase
        .from("items")
        .update({
          title: title || null,
          notes: notes || null,
          ...(screenshotUrl !== undefined ? { file_url: screenshotUrl } : {}),
          updated_at: new Date().toISOString(),
        })
        .eq("id", item.id)

      // Update board
      await supabase.from("item_boards").delete().eq("item_id", item.id)
      if (selectedBoard) {
        await supabase
          .from("item_boards")
          .insert({ item_id: item.id, board_id: selectedBoard })
      }

      onItemUpdated()
      onOpenChange(false)
    } catch (err) {
      console.error("Failed to update item:", err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay />
        <DialogPrimitive.Content
          className={cn(
            "add-item-panel fixed z-50 flex h-[calc(100vh-48px)] w-[575px] max-w-[calc(100vw-48px)] flex-col gap-8 overflow-hidden rounded-[24px] bg-card shadow-lg",
            "top-[24px] right-[24px] bottom-[24px]",
            "max-[767px]:left-0 max-[767px]:right-0 max-[767px]:top-auto max-[767px]:bottom-0",
            "max-[767px]:h-[90vh] max-[767px]:w-screen max-[767px]:max-w-none",
            "max-[767px]:rounded-t-[24px] max-[767px]:rounded-b-none",
            "p-[24px]",
            isDropzoneErrorJiggling && "add-item-panel-overflow-visible",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=open]:slide-in-from-right-full data-[state=closed]:slide-out-to-right-full",
          )}
        >
          <div className="flex flex-shrink-0 items-start justify-between">
            <DialogPrimitive.Title className="text-lg font-medium leading-7 text-foreground">
              Edit item
            </DialogPrimitive.Title>
            <DialogPrimitive.Close
              className="rounded-sm text-foreground transition-opacity hover:opacity-80 focus:outline-none focus:ring-0 disabled:pointer-events-none"
              aria-label="Close"
            >
              <X className="h-6 w-6" />
            </DialogPrimitive.Close>
          </div>

          <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col gap-5 overflow-auto px-1 -mx-1">
            <div className="flex w-full min-w-0 flex-col gap-5">
              <FormField label="Title (optional)" htmlFor="edit-title" className="gap-[8px]">
                <div className="flex flex-col gap-2">
                  <Input
                    id="edit-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Give it a name"
                  />
                  {item.type === "url" && item.original_url && (
                    <p className="truncate px-1 text-sm text-muted-foreground">
                      {item.original_url}
                    </p>
                  )}
                </div>
              </FormField>

              <FormField label="Notes (optional)" htmlFor="edit-notes" className="gap-[8px]">
                <Textarea
                  id="edit-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add notes or a description"
                  rows={3}
                />
              </FormField>

              {item.type === "url" && (
                <div className="flex flex-col gap-2">
                  <FormField
                    label="Screenshot (optional)"
                    htmlFor="edit-screenshot"
                    className="gap-[8px]"
                  >
                    <div
                      className={cn(
                        "empty-canvas-dropzone relative flex w-full cursor-pointer items-center justify-center px-4 py-3 transition-colors",
                        isDragActive && "empty-canvas-dropzone-active",
                        dropzoneError && "dnd-dropzone-error-jiggle",
                      )}
                      key={dropzoneErrorJiggleNonce}
                      style={{ height: "150px" }}
                      onDragOver={(e) => {
                        e.preventDefault()
                        if (!loading) setIsDragActive(true)
                      }}
                      onDragEnter={(e) => {
                        e.preventDefault()
                        if (!loading) setIsDragActive(true)
                      }}
                      onDragLeave={(e) => {
                        e.preventDefault()
                        setIsDragActive(false)
                      }}
                      onDrop={(e) => {
                        e.preventDefault()
                        setIsDragActive(false)
                        if (loading) return
                        const droppedFile = e.dataTransfer.files?.[0] || null
                        handleScreenshotFileSelected(droppedFile)
                      }}
                      onClick={() => {
                        if (loading) return
                        screenshotInputRef.current?.click()
                      }}
                    >
                      {!screenshotPreview && (
                        <svg
                          className="empty-canvas-border pointer-events-none absolute inset-0 max-[767px]:hidden"
                          viewBox="0 0 527 150"
                          preserveAspectRatio="xMidYMid meet"
                          aria-hidden="true"
                        >
                          <rect
                            x="1"
                            y="1"
                            width="525"
                            height="148"
                            rx="24"
                            ry="24"
                            className="empty-canvas-border-rect"
                            vectorEffect="non-scaling-stroke"
                            shapeRendering="geometricPrecision"
                          />
                        </svg>
                      )}
                      <button
                        type="button"
                        className="pointer-events-auto relative z-[1] flex w-full flex-col items-center gap-2 text-center"
                        onMouseEnter={() => setDocIconHovered(true)}
                        onMouseLeave={() => setDocIconHovered(false)}
                        onFocus={() => setDocIconHovered(true)}
                        onBlur={() => setDocIconHovered(false)}
                      >
                        {screenshotPreview ? (
                          <img
                            src={screenshotPreview}
                            alt="Screenshot preview"
                            className="h-[130px] w-auto max-w-full object-contain"
                          />
                        ) : dropzoneError ? (
                          <>
                            <div
                              className="empty-canvas-documents-icon dnd-documents-icon"
                              style={{ width: "64px", height: "50px" }}
                              aria-hidden="true"
                            >
                              <motion.img
                                src="/figma-assets/dnd-doc-error.svg"
                                alt=""
                                className="empty-canvas-doc empty-canvas-doc-front"
                                draggable={false}
                                animate={{
                                  x: docsAreSpread ? docsDial.frontDoc.hoverX : 0,
                                  y: docsAreSpread ? docsDial.frontDoc.hoverY : 0,
                                  rotate: docsAreSpread ? docsDial.frontDoc.hoverRotate : 0,
                                }}
                                transition={docsTransition as never}
                              />
                              <motion.img
                                src="/figma-assets/dnd-doc-error.svg"
                                alt=""
                                className="empty-canvas-doc empty-canvas-doc-back"
                                draggable={false}
                                animate={{
                                  x: docsAreSpread ? docsDial.backDoc.hoverX : 0,
                                  y: docsAreSpread ? docsDial.backDoc.hoverY : 0,
                                  rotate: docsAreSpread ? docsDial.backDoc.hoverRotate : 0,
                                }}
                                transition={docsTransition as never}
                              />
                            </div>
                            <p
                              className="text-center"
                              style={{
                                color: "var(--Text-BodyPrimary, #333)",
                                fontFamily: 'var(--font-family-All, "Host Grotesk")',
                                fontSize: "var(--font-size-Base, 16px)",
                                fontStyle: "normal",
                                fontWeight: 500,
                                lineHeight: "var(--font-line-height-Base, 24px)",
                              }}
                            >
                              Incorrect file type
                            </p>
                            <p className="max-w-full text-center text-xs text-muted-foreground">
                              Only PNG, JPG, or WebP formats are supported at this time.
                            </p>
                          </>
                        ) : (
                          <>
                            <div
                              className="empty-canvas-documents-icon dnd-documents-icon"
                              style={{ width: "64px", height: "50px" }}
                              aria-hidden="true"
                            >
                              <motion.img
                                src="/figma-assets/dnd-doc-1.svg"
                                alt=""
                                className="empty-canvas-doc empty-canvas-doc-front"
                                draggable={false}
                                animate={{
                                  x: docsAreSpread ? docsDial.frontDoc.hoverX : 0,
                                  y: docsAreSpread ? docsDial.frontDoc.hoverY : 0,
                                  rotate: docsAreSpread ? docsDial.frontDoc.hoverRotate : 0,
                                }}
                                transition={docsTransition as never}
                              />
                              <motion.img
                                src="/figma-assets/dnd-doc-2.svg"
                                alt=""
                                className="empty-canvas-doc empty-canvas-doc-back"
                                draggable={false}
                                animate={{
                                  x: docsAreSpread ? docsDial.backDoc.hoverX : 0,
                                  y: docsAreSpread ? docsDial.backDoc.hoverY : 0,
                                  rotate: docsAreSpread ? docsDial.backDoc.hoverRotate : 0,
                                }}
                                transition={docsTransition as never}
                              />
                            </div>
                            <p
                              className="text-center"
                              style={{
                                color: "var(--Text-BodyPrimary, #333)",
                                fontFamily: 'var(--font-family-All, "Host Grotesk")',
                                fontSize: "var(--font-size-Base, 16px)",
                                fontStyle: "normal",
                                fontWeight: 500,
                                lineHeight: "var(--font-line-height-Base, 24px)",
                              }}
                            >
                              Drag and drop or upload screenshot
                            </p>
                            <p
                              className="text-center"
                              style={{
                                color: "var(--Text-BodySecondary, #6F6F6F)",
                                fontFamily: 'var(--font-family-All, "Host Grotesk")',
                                fontSize: "var(--font-size-Small, 12px)",
                                fontStyle: "normal",
                                fontWeight: 400,
                                lineHeight: "var(--font-line-height-Small, 16px)",
                              }}
                            >
                              PNG, JPG, and WebP formats
                            </p>
                          </>
                        )}
                      </button>
                      <input
                        ref={screenshotInputRef}
                        id="edit-screenshot"
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0] || null
                          handleScreenshotFileSelected(file)
                        }}
                      />
                    </div>
                  </FormField>
                  <p className="px-1 text-xs text-muted-foreground">
                    Upload a screenshot for sites that don&apos;t preview nicely.
                  </p>
                </div>
              )}

              <FormField label="Collection" className="gap-[8px]">
                <Select value={selectedBoard} onValueChange={setSelectedBoard}>
                  <SelectTrigger>
                    <SelectValue placeholder="&lt;Collection title&gt;" />
                  </SelectTrigger>
                  <SelectContent>
                    {boards
                      .filter((b) => b.name.toLowerCase() !== "unsorted")
                      .map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </FormField>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button
              className="w-full rounded-[48px] px-5 py-3 disabled:!opacity-50"
              onClick={handleSave}
              disabled={loading || !hasChanges}
            >
              {loading && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
              Save changes
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="rounded-[48px] px-5 py-3"
              onClick={() => onItemDeleted(item.id)}
            >
              Delete item
            </Button>
          </div>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  )
}

