"use client"

import React from "react"

import { useState, useRef } from "react"
import dynamic from "next/dynamic"
import { motion } from "motion/react"
import { useDialKit } from "dialkit"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import type { Board, Item } from "@/lib/types"
import { createClient } from "@/lib/supabase/client"
import {
  Dialog,
  DialogPortal,
  DialogOverlay,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
import { Loader2, Link as LinkIcon, Image as ImageIcon, X } from "lucide-react"
import { cn } from "@/lib/utils"
import imageCompression from "browser-image-compression"
import { AddItemTabsIndicatorStatic } from "./add-item-tabs-indicator-static"

const AddItemTabsIndicatorDev = dynamic(
  () => import("./add-item-tabs-indicator-dev").then((m) => m.AddItemTabsIndicatorDev),
  { ssr: false, loading: () => null },
)

type DropzoneErrorType = "incorrect-file-type" | "too-much-inspiration"

function getErrorMessage(err: unknown): string {
  if (!err) return ""
  if (typeof err === "string") return err
  if (err instanceof Error) return err.message
  try {
    return JSON.stringify(err)
  } catch {
    return String(err)
  }
}

function classifyDropzoneError(err: unknown): DropzoneErrorType {
  // Incorrect file type is already filtered on selection, but certain runtime
  // paths (corrupt files, mismatched mime types) can still fail.
  const msg = getErrorMessage(err).toLowerCase()
  const looksLikeUnsupported =
    msg.includes("unsupported") ||
    msg.includes("not supported") ||
    msg.includes("invalid") ||
    msg.includes("decode") ||
    msg.includes("mime") ||
    msg.includes("format")

  if (looksLikeUnsupported) return "incorrect-file-type"
  return "too-much-inspiration"
}

/** Same shape as grid items so we can optimistically add to the list. */
type ItemWithBoards = Item & { item_boards: { board_id: string }[] }

interface CreateImageItemParams {
  file: File
  title: string
  notes: string
  boardIdToUse?: string
  supabase: ReturnType<typeof createClient>
}

async function createImageItem({
  file,
  title,
  notes,
  boardIdToUse,
  supabase,
}: CreateImageItemParams): Promise<ItemWithBoards> {
  // Compress to WebP (tuned to avoid hangs on huge images)
  const compressed = await imageCompression(file, {
    maxSizeMB: 0.75,
    maxWidthOrHeight: 1920,
    fileType: "image/webp",
    useWebWorker: true,
  })

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("Not authenticated")

  // Supabase Storage keys must not contain spaces or certain characters
  const rawName = compressed.name || "image.webp"
  const safeName =
    rawName
      .replace(/\.[^.]+$/, "") // strip extension (we use .webp below)
      .replace(/\s+/g, "-")
      .replace(/[^a-zA-Z0-9._-]/g, "")
      .slice(0, 80) || "image"
  const fileName = `${user.id}/${Date.now()}-${safeName}.webp`

  const { error: uploadError } = await supabase.storage
    .from("images")
    .upload(fileName, compressed, { contentType: "image/webp" })

  if (uploadError) throw uploadError

  const {
    data: { publicUrl },
  } = supabase.storage.from("images").getPublicUrl(fileName)

  // Store native dimensions so grid never upscales past original (downscale only)
  let width: number | null = null
  let height: number | null = null
  try {
    const bitmap = await createImageBitmap(compressed)
    width = bitmap.width
    height = bitmap.height
    bitmap.close()
  } catch {
    // ignore if we can't read dimensions (e.g. in some envs)
  }

  const { data: item, error: insertError } = await supabase
    .from("items")
    .insert({
      user_id: user.id,
      type: "image",
      file_url: publicUrl,
      file_size: compressed.size,
      mime_type: "image/webp",
      width,
      height,
      title: title || file.name.replace(/\.[^.]+$/, ""),
      notes: notes || null,
    })
    .select()
    .single()

  if (insertError) throw insertError

  if (boardIdToUse) {
    await supabase.from("item_boards").insert({
      item_id: item.id,
      board_id: boardIdToUse,
    })
  }

  const itemWithBoards: ItemWithBoards = {
    ...item,
    viewport_size: item.viewport_size ?? "desktop",
    iframe_blocked: item.iframe_blocked ?? false,
    item_boards: boardIdToUse ? [{ board_id: boardIdToUse }] : [],
  }

  return itemWithBoards
}

interface AddItemDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  boards: Board[]
  /** Called after a successful add. Pass the new item to show it immediately without waiting for refresh. */
  onItemAdded: (newItem?: ItemWithBoards) => void
  /** When set, pre-select this board when dialog opens (e.g. current collection) */
  defaultBoardId?: string
  /** Optional initial files when opening from the empty canvas dropzone. */
  initialFiles?: File[]
}

export function AddItemDialog({
  open,
  onOpenChange,
  boards,
  onItemAdded,
  defaultBoardId,
  initialFiles,
}: AddItemDialogProps) {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)

  const [activeTab, setActiveTab] = useState<"url" | "image">("url")

  // Image state
  const [file, setFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [currentFileIndex, setCurrentFileIndex] = useState(0)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [isDragActive, setIsDragActive] = useState(false)
  const [dropzoneError, setDropzoneError] = useState<DropzoneErrorType | null>(null)
  const [dropzoneErrorJiggleNonce, setDropzoneErrorJiggleNonce] = useState(0)
  const [isDropzoneErrorJiggling, setIsDropzoneErrorJiggling] = useState(false)
  const [docIconHovered, setDocIconHovered] = useState(false)
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
      hoverY: -15,
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

  function setDropzoneErrorWithJiggle(err: DropzoneErrorType) {
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

  React.useEffect(() => {
    return () => {
      if (dropzoneErrorJiggleTimeoutRef.current) {
        clearTimeout(dropzoneErrorJiggleTimeoutRef.current)
      }
    }
  }, [])

  // URL state
  const [url, setUrl] = useState("")
  const [viewport, setViewport] = useState("desktop")

  // Common state
  const [title, setTitle] = useState("")
  const [notes, setNotes] = useState("")
  const [selectedBoard, setSelectedBoard] = useState<string>("")

  // When dialog opens with a default board, pre-select it
  React.useEffect(() => {
    if (open && defaultBoardId && boards.some((b) => b.id === defaultBoardId)) {
      setSelectedBoard(defaultBoardId)
    }
    if (!open) setSelectedBoard("")
  }, [open, defaultBoardId, boards])

  // When opened with initial files (e.g. from empty canvas dropzone), seed wizard state.
  React.useEffect(() => {
    if (!open || !initialFiles || initialFiles.length === 0) return
    handleFilesSelected(initialFiles)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialFiles])

  function resetForm() {
    setFile(null)
    setImagePreview(null)
    setPendingFiles([])
    setCurrentFileIndex(0)
    setDropzoneError(null)
    setUrl("")
    setViewport("desktop")
    setTitle("")
    setNotes("")
    setSelectedBoard("")
  }

  function loadPreview(nextFile: File | null) {
    if (!nextFile) {
      setImagePreview(null)
      return
    }
    const reader = new FileReader()
    reader.onload = (ev) => setImagePreview(ev.target?.result as string)
    reader.onerror = () => {
      // If the file can't be read for preview, treat it as a generic upload issue.
      // (This can happen with corrupt images even if their mime type is allowed.)
      setDropzoneErrorWithJiggle("too-much-inspiration")
      setFile(null)
      setImagePreview(null)
      setPendingFiles([])
      setCurrentFileIndex(0)
    }
    reader.readAsDataURL(nextFile)
  }

  function handleFilesSelected(files: File[]) {
    const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"])
    const valid = files.filter((f) => allowedTypes.has(f.type))
    if (valid.length === 0) {
      console.warn("No supported files in selection; only JPG, PNG, and WebP are supported right now.")
      setDropzoneErrorWithJiggle("incorrect-file-type")
      setActiveTab("image")
      setFile(null)
      setImagePreview(null)
      setPendingFiles([])
      setCurrentFileIndex(0)
      return
    }

    setDropzoneError(null)

    // Multi-file wizard mode
    if (valid.length > 1) {
      setPendingFiles(valid)
      setCurrentFileIndex(0)
      setFile(valid[0])
      loadPreview(valid[0])
      setActiveTab("image")
      return
    }

    // Single file
    const nextFile = valid[0]
    setPendingFiles([])
    setCurrentFileIndex(0)
    setFile(nextFile)
    loadPreview(nextFile)
    setActiveTab("image")
  }

  async function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    handleFilesSelected(files)
  }

  const isMultiMode = pendingFiles.length > 0
  const currentFile = isMultiMode ? pendingFiles[currentFileIndex] : file
  const totalFiles = isMultiMode ? pendingFiles.length : currentFile ? 1 : 0
  // After selecting images via drag/drop, the dialog should switch into a "save stage"
  // where upload source controls (URL/Image toggle + drag/drop) are hidden.
  const inImageSaveStage = activeTab === "image" && Boolean(currentFile)

  async function handleSubmitImage() {
    if (!currentFile) return
    setLoading(true)

    try {
      const boardIdToUse = selectedBoard || defaultBoardId
      const itemWithBoards = await createImageItem({
        file: currentFile,
        title,
        notes,
        boardIdToUse,
        supabase,
      })

      onItemAdded(itemWithBoards)

      if (isMultiMode) {
        const nextIndex = currentFileIndex + 1
        if (nextIndex < pendingFiles.length) {
          // Advance to next file in wizard mode
          const nextFile = pendingFiles[nextIndex]
          setCurrentFileIndex(nextIndex)
          setFile(nextFile)
          loadPreview(nextFile)
          setTitle("")
          setNotes("")
        } else {
          // Finished all files
          resetForm()
          onOpenChange(false)
        }
      } else {
        resetForm()
        onOpenChange(false)
      }
    } catch (err) {
      console.error("Failed to upload image:", err)
      const nextError = classifyDropzoneError(err)
      // If the upload fails (overload, timeouts, compression issues, etc.),
      // reset back to the dropzone UI so the user can retry.
      setDropzoneErrorWithJiggle(nextError)
      setFile(null)
      setImagePreview(null)
      setPendingFiles([])
      setCurrentFileIndex(0)
      setIsDragActive(false)
      setTitle("")
      setNotes("")
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmitUrl() {
    if (!url.trim()) return

    const normalizedUrl = (() => {
      const trimmed = url.trim()
      if (!trimmed) return trimmed
      return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
    })()

    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      // Extract metadata via API route
      let metadata: { title?: string; description?: string; favicon?: string; domain?: string } = {}
      try {
        const res = await fetch("/api/metadata", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: normalizedUrl }),
        })
        if (res.ok) {
          metadata = await res.json()
        }
      } catch {
        // Metadata extraction failed, continue without it
      }

      const { data: item, error: insertError } = await supabase
        .from("items")
        .insert({
          user_id: user.id,
          type: "url",
          original_url: normalizedUrl,
          viewport_size: viewport,
          title: title || metadata.title || null,
          description: metadata.description || null,
          favicon_url: metadata.favicon || null,
          domain: metadata.domain || null,
          notes: notes || null,
        })
        .select()
        .single()

      if (insertError) throw insertError

      const boardIdToUse = selectedBoard || defaultBoardId
      if (boardIdToUse) {
        await supabase.from("item_boards").insert({
          item_id: item.id,
          board_id: boardIdToUse,
        })
      }

      const itemWithBoards: ItemWithBoards = {
        ...item,
        viewport_size: item.viewport_size ?? viewport,
        iframe_blocked: item.iframe_blocked ?? false,
        item_boards: boardIdToUse ? [{ board_id: boardIdToUse }] : [],
      }
      resetForm()
      onItemAdded(itemWithBoards)
      onOpenChange(false)
    } catch (err) {
      console.error("Failed to save URL:", err)
    } finally {
      setLoading(false)
    }
  }

  const renderDocumentsIcon = (frontSrc: string, backSrc: string) => (
    <div className="empty-canvas-documents-icon mb-4" aria-hidden="true">
      <motion.img
        src={frontSrc}
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
        src={backSrc}
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
  )

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) resetForm()
        onOpenChange(o)
      }}
    >
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
          onPointerDownOutside={(event) => {
            // DialKit lives outside the Radix <Content />, so Radix would normally
            // treat panel clicks as "outside" dismissals. Ignore those so the
            // Add dialog doesn't close while tuning.
            const nativeEventTarget =
              event?.detail?.originalEvent?.target ?? event?.target
            const el = nativeEventTarget as HTMLElement | null
            if (el?.closest?.(".dialkit-panel, .dialkit-panel-inner, .dialkit-root")) {
              event.preventDefault()
            }
          }}
          onInteractOutside={(event) => {
            const nativeEventTarget =
              event?.detail?.originalEvent?.target ?? event?.target
            const el = nativeEventTarget as HTMLElement | null
            if (el?.closest?.(".dialkit-panel, .dialkit-panel-inner, .dialkit-root")) {
              event.preventDefault()
            }
          }}
        >
          {/* Header: 32px gap to toggle per Figma */}
          <div className="flex flex-shrink-0 items-start justify-between">
            <DialogPrimitive.Title className="text-lg font-medium leading-7 text-foreground">
              {isMultiMode
                ? loading
                  ? "Uploading files..."
                  : `Add item • ${currentFileIndex + 1} of ${totalFiles}`
                : "Add item"}
            </DialogPrimitive.Title>
            <DialogPrimitive.Close
              className="rounded-sm text-foreground transition-opacity hover:opacity-80 focus:outline-none focus:ring-0 disabled:pointer-events-none"
              aria-label="Close"
            >
              <X className="h-6 w-6" />
            </DialogPrimitive.Close>
          </div>

          {/* Content: gap-8 (32px) per Figma between sections */}
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as "url" | "image")}
            className="flex min-h-0 flex-1 flex-col gap-8"
          >
            {!inImageSaveStage && (
              <TabsList
                className="relative flex h-[60px] w-full items-center justify-between rounded-[30px] bg-[var(--gray-20)] p-[6px] text-muted-foreground"
              >
                {process.env.NODE_ENV === "development" ? (
                  <AddItemTabsIndicatorDev activeTab={activeTab} />
                ) : (
                  <AddItemTabsIndicatorStatic activeTab={activeTab} />
                )}
                <TabsTrigger
                  value="url"
                  className="relative z-10 flex h-[48px] w-1/2 items-center justify-center gap-1.5 rounded-[24px] border-none bg-transparent text-base font-medium text-foreground shadow-none data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-foreground data-[state=inactive]:text-foreground data-[state=active]:outline-none"
                >
                  <LinkIcon className="h-5 w-5 text-foreground" />
                  URL
                </TabsTrigger>
                <TabsTrigger
                  value="image"
                  className="relative z-10 flex h-[48px] w-1/2 items-center justify-center gap-1.5 rounded-[24px] border-none bg-transparent text-base font-medium text-foreground shadow-none data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-foreground data-[state=inactive]:text-foreground data-[state=active]:outline-none"
                >
                  <ImageIcon className="h-5 w-5 text-foreground" />
                  Image
                </TabsTrigger>
              </TabsList>
            )}

            {/* Form fields: gap-6 (24px) between groups; px-1 gives focus ring room so it isn't clipped */}
            <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-auto px-1 -mx-1">
              <TabsContent value="url" className="m-0 flex flex-col gap-6">
                <FormField label="Website link" htmlFor="url" className="gap-[8px]">
                  <Input
                    id="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://example.com"
                    type="url"
                  />
                </FormField>
                <FormField label="Viewport" htmlFor="viewport" className="gap-[8px]">
                  <Select value={viewport} onValueChange={setViewport}>
                    <SelectTrigger id="viewport">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mobile">Mobile (393×852)</SelectItem>
                      <SelectItem value="tablet">Tablet (768×1024)</SelectItem>
                      <SelectItem value="desktop">Desktop (1440×900)</SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>
              </TabsContent>

              <TabsContent
                value="image"
                className={cn(
                  "m-0 flex min-h-0 flex-col gap-6",
                  !inImageSaveStage && "flex-1",
                  inImageSaveStage && "rounded-[24px] bg-[var(--Surface-Primary,#F5F5F5)]",
                )}
              >
                <div className={cn("flex-1", inImageSaveStage && "hidden")}>
                  {!inImageSaveStage && (
                    <div
                      className={cn(
                        "empty-canvas-dropzone relative flex w-full items-center justify-center px-10 py-8 transition-colors",
                        isDragActive && "empty-canvas-dropzone-active",
                        dropzoneError && "dnd-dropzone-error-jiggle",
                      )}
                      key={dropzoneErrorJiggleNonce}
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
                        const files = Array.from(e.dataTransfer.files ?? [])
                        if (!files.length) return
                        handleFilesSelected(files)
                      }}
                      onClick={() => {
                        if (loading) return
                        fileInputRef.current?.click()
                      }}
                    >
                      <svg
                        className="empty-canvas-border pointer-events-none absolute inset-0 max-[767px]:hidden"
                        viewBox="0 0 690 520"
                        preserveAspectRatio="none"
                        aria-hidden="true"
                      >
                        <rect
                          x="1"
                          y="1"
                          width="688"
                          height="518"
                          rx="24"
                          ry="24"
                          className="empty-canvas-border-rect"
                        />
                      </svg>
                      <button
                        type="button"
                        className={cn(
                          "pointer-events-auto relative z-[1] flex max-w-lg flex-1 flex-col items-center gap-3 px-8 py-10 text-center",
                          // The outer dropzone handles the jiggle so it doesn't get clipped.
                        )}
                        onMouseEnter={() => setDocIconHovered(true)}
                        onMouseLeave={() => setDocIconHovered(false)}
                        onFocus={() => setDocIconHovered(true)}
                        onBlur={() => setDocIconHovered(false)}
                      >
                        {dropzoneError ? (
                          <>
                            {/* Render error docs with the same front/back layers so hover spread works. */}
                            {renderDocumentsIcon("/figma-assets/dnd-doc-error.svg", "/figma-assets/dnd-doc-error.svg")}
                            <p
                              className="text-center"
                              style={{
                                color: "var(--Text-BodyPrimary, #333)",
                                fontFamily: 'var(--font-family-All, "Host Grotesk")',
                                fontSize: "var(--font-size-Medium, 24px)",
                                fontStyle: "normal",
                                fontWeight: 500,
                                lineHeight: "var(--font-line-height-Medium, 28px)",
                              }}
                            >
                              {dropzoneError === "too-much-inspiration"
                                ? "Too much inspiration"
                                : "Incorrect file type"}
                            </p>
                            <p
                              className="text-center"
                              style={{
                                color: "var(--Text-BodySecondary, #6F6F6F)",
                                fontFamily: 'var(--font-family-All, "Host Grotesk")',
                                fontSize: "var(--font-size-Base, 16px)",
                                fontStyle: "normal",
                                fontWeight: 400,
                                lineHeight: "var(--font-line-height-Base, 24px)",
                              }}
                            >
                              {dropzoneError === "too-much-inspiration"
                                ? "There was an error uploading your items. Please try again."
                                : "Only PNG, JPG, or WebP formats are supported at this time."}
                            </p>
                          </>
                        ) : (
                          <>
                            {renderDocumentsIcon("/figma-assets/dnd-doc-1.svg", "/figma-assets/dnd-doc-2.svg")}
                            <p
                              className="text-center"
                              style={{
                                color: "var(--Text-BodyPrimary, #333)",
                                fontFamily: 'var(--font-family-All, "Host Grotesk")',
                                fontSize: "var(--font-size-Medium, 24px)",
                                fontStyle: "normal",
                                fontWeight: 500,
                                lineHeight: "var(--font-line-height-Medium, 28px)",
                              }}
                            >
                              Drag and drop or upload files
                            </p>
                            <p
                              className="text-center"
                              style={{
                                color: "var(--Text-BodySecondary, #6F6F6F)",
                                fontFamily: 'var(--font-family-All, "Host Grotesk")',
                                fontSize: "var(--font-size-Base, 16px)",
                                fontStyle: "normal",
                                fontWeight: 400,
                                lineHeight: "var(--font-line-height-Base, 24px)",
                              }}
                            >
                              PNG, JPG, and WebP formats
                            </p>
                          </>
                        )}
                        {isMultiMode && totalFiles > 1 && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            {loading
                              ? `Uploading ${currentFileIndex + 1} of ${totalFiles}`
                              : `Ready to add ${totalFiles} files — currently editing ${currentFileIndex + 1}`}
                          </p>
                        )}
                      </button>
                      <input
                        ref={fileInputRef}
                        id="image"
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        multiple
                        className="hidden"
                        onChange={handleImageSelect}
                      />
                    </div>
                  )}
                </div>
                {imagePreview && (
                  <img
                    src={imagePreview || "/placeholder.svg"}
                    alt="Preview"
                    className={cn(
                      "mt-4 max-h-48 w-full object-contain",
                      inImageSaveStage ? "mb-4" : "rounded-md border border-border",
                    )}
                  />
                )}
              </TabsContent>

              {/* Common fields — same 24px gap */}
              {(activeTab === "url" || (activeTab === "image" && currentFile)) && (
                <div className="flex flex-col gap-6">
                  <FormField label="Title (optional)" htmlFor="title" className="gap-[8px]">
                    <Input
                      id="title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Give it a name"
                    />
                  </FormField>
                  <FormField label="Notes (optional)" htmlFor="notes" className="gap-[8px]">
                    <Textarea
                      id="notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Add notes or a description"
                      rows={3}
                    />
                  </FormField>
                </div>
              )}
            </div>

            {/* Footer button: shown only when we can actually "Save"/submit. */}
            {activeTab === "url" || inImageSaveStage ? (
              <Button
                className="w-full rounded-[48px] px-5 py-3"
                disabled={loading || (activeTab === "url" ? !url.trim() : !currentFile)}
                onClick={() => {
                  if (activeTab === "url") {
                    if (url.trim()) {
                      handleSubmitUrl()
                    }
                  } else if (activeTab === "image") {
                    if (currentFile) {
                      handleSubmitImage()
                    }
                  }
                }}
              >
                {loading && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                {loading
                  ? isMultiMode
                    ? `Saving ${currentFileIndex + 1} of ${totalFiles}`
                    : "Saving..."
                  : isMultiMode && activeTab === "image" && inImageSaveStage
                    ? `Add item • ${currentFileIndex + 1} of ${totalFiles}`
                    : activeTab === "url"
                      ? "Add URL"
                      : isMultiMode
                        ? currentFileIndex + 1 === totalFiles
                          ? "Save last item"
                          : "Save & next"
                        : "Save item"}
              </Button>
            ) : null}
          </Tabs>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  )
}
