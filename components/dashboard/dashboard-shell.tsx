"use client"

import { useState, useCallback, useEffect, useLayoutEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import type { User } from "@supabase/supabase-js"
import type { Item, Board } from "@/lib/types"
import { motion } from "motion/react"
import { useDialKit } from "dialkit"
import { TopNav } from "@/components/dashboard/top-nav"
import { MasonryGrid } from "@/components/dashboard/masonry-grid"
import { AddItemDialog } from "@/components/dashboard/add-item-dialog"
import { EditItemDialog } from "@/components/dashboard/edit-item-dialog"
import { BulkBar } from "@/components/dashboard/bulk-bar"
import { SizeSlider } from "@/components/dashboard/size-slider"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"
import Link from "next/link"
import { ArrowLeftFromLine, Plus, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"

type DropzoneErrorType = "incorrect-file-type" | "too-much-inspiration"

const DEFAULT_COLLECTION_GRID_COLUMNS = 6
const MIN_COLLECTION_GRID_COLUMNS = 1
const MAX_COLLECTION_GRID_COLUMNS = 6

function clampCollectionGridColumns(n: number) {
  return Math.min(
    MAX_COLLECTION_GRID_COLUMNS,
    Math.max(MIN_COLLECTION_GRID_COLUMNS, Math.round(n)),
  )
}

function collectionGridColumnsStorageKey(boardId: string) {
  return `curator.collection.gridColumns:${boardId}`
}

function readStoredGridColumns(boardId: string): number | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(collectionGridColumnsStorageKey(boardId))
    if (raw == null) return null
    const parsed = parseInt(raw, 10)
    if (!Number.isFinite(parsed)) return null
    return clampCollectionGridColumns(parsed)
  } catch {
    return null
  }
}

interface DashboardShellProps {
  user: User
  initialBoards: Board[]
  initialItems: (Item & { item_boards: { board_id: string }[] })[]
  /** When set, shell is in collection view: show grid for this board, Add button, Back to dashboard */
  boardId: string | null
  /** Initial name for the active collection (board), used for the editable header title. */
  boardName?: string | null
  /** Persisted grid column count from the server when the column exists; omit if the API has no `grid_columns` yet. */
  initialGridColumns?: number
}

export function DashboardShell({
  user,
  initialBoards,
  initialItems,
  boardId,
  boardName,
  initialGridColumns,
}: DashboardShellProps) {
  const router = useRouter()
  const supabase = createClient()

  const [boards, setBoards] = useState<Board[]>(initialBoards)
  const [items, setItems] = useState(initialItems)
  const [columns, setColumns] = useState(() => {
    if (typeof initialGridColumns === "number") {
      return clampCollectionGridColumns(initialGridColumns)
    }
    if (!boardId) return DEFAULT_COLLECTION_GRID_COLUMNS
    return clampCollectionGridColumns(
      readStoredGridColumns(boardId) ?? DEFAULT_COLLECTION_GRID_COLUMNS,
    )
  })
  const [search, setSearch] = useState("")
  const [filterType, setFilterType] = useState<string | null>(null)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<typeof items[0] | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkBarExiting, setBulkBarExiting] = useState(false)
  const [exitingSelectedCount, setExitingSelectedCount] = useState(0)
  const prevSelectedCountRef = useRef(0)
  const [mounted, setMounted] = useState(false)
  const [collectionName, setCollectionName] = useState(boardName ?? "")
  const [emptyCanvasDragActive, setEmptyCanvasDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [initialFiles, setInitialFiles] = useState<File[] | null>(null)
  const [dropzoneError, setDropzoneError] = useState<DropzoneErrorType | null>(null)
  const [dropzoneErrorJiggleNonce, setDropzoneErrorJiggleNonce] = useState(0)
  const [docIconHovered, setDocIconHovered] = useState(false)
  const [isSmOnlyViewport, setIsSmOnlyViewport] = useState(false)

  const emptyDropzoneInnerRef = useRef<HTMLDivElement | null>(null)
  const emptyDropzoneRef = useRef<HTMLDivElement | null>(null)
  const [clampEmptyDropzoneTop, setClampEmptyDropzoneTop] = useState(false)
  /** When the column slider changes layout, preserve window scroll (avoids focus/scroll-into-view jumps from fixed controls). */
  const columnsInteractionScrollYRef = useRef<number | null>(null)

  const filterBoard = boardId

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!boardId) return
    if (typeof initialGridColumns === "number") {
      setColumns(clampCollectionGridColumns(initialGridColumns))
      return
    }
    setColumns(
      clampCollectionGridColumns(
        readStoredGridColumns(boardId) ?? DEFAULT_COLLECTION_GRID_COLUMNS,
      ),
    )
  }, [boardId, initialGridColumns])

  const handleColumnsChange = useCallback(
    (value: number) => {
      const next = clampCollectionGridColumns(value)
      columnsInteractionScrollYRef.current = window.scrollY
      setColumns(next)
      if (!boardId) return
      void (async () => {
        const { error } = await supabase
          .from("boards")
          .update({ grid_columns: next })
          .eq("id", boardId)
        if (error) {
          const parts = [error.message, error.code, error.details, error.hint].filter(Boolean)
          console.error("Failed to save grid size:", parts.length ? parts.join(" | ") : error)
          try {
            localStorage.setItem(collectionGridColumnsStorageKey(boardId), String(next))
          } catch {
            /* ignore */
          }
          return
        }
        try {
          localStorage.removeItem(collectionGridColumnsStorageKey(boardId))
        } catch {
          /* ignore */
        }
        setBoards((prev) =>
          prev.map((board) => (board.id === boardId ? { ...board, grid_columns: next } : board)),
        )
      })()
    },
    [boardId, supabase],
  )

  useLayoutEffect(() => {
    const y = columnsInteractionScrollYRef.current
    if (y === null) return
    columnsInteractionScrollYRef.current = null
    window.scrollTo({ top: y, left: 0, behavior: "instant" })
  }, [columns])

  useEffect(() => {
    if (!bulkBarExiting) return
    const t = setTimeout(() => {
      setBulkBarExiting(false)
      setExitingSelectedCount(0)
    }, 350)
    return () => clearTimeout(t)
  }, [bulkBarExiting])

  /* When selection goes from having items to empty (uncheck all or Cancel), run slide-down exit */
  useEffect(() => {
    if (selectedIds.size > 0) {
      prevSelectedCountRef.current = selectedIds.size
      return
    }
    if (prevSelectedCountRef.current > 0) {
      setExitingSelectedCount(prevSelectedCountRef.current)
      setBulkBarExiting(true)
      prevSelectedCountRef.current = 0
    }
  }, [selectedIds.size])

  useEffect(() => {
    setCollectionName(boardName ?? "")
  }, [boardName])

  useEffect(() => {
    const update = () => {
      const width = window.innerWidth
      // Apply compact behavior to any viewport <= 767px.
      setIsSmOnlyViewport(width <= 767)
    }
    update()
    window.addEventListener("resize", update)
    return () => window.removeEventListener("resize", update)
  }, [])

  const filteredItems = items.filter((item) => {
    if (search) {
      const q = search.toLowerCase()
      const matchesTitle = item.title?.toLowerCase().includes(q)
      const matchesNotes = item.notes?.toLowerCase().includes(q)
      const matchesDomain = item.domain?.toLowerCase().includes(q)
      const matchesUrl = item.original_url?.toLowerCase().includes(q)
      if (!matchesTitle && !matchesNotes && !matchesDomain && !matchesUrl) return false
    }
    if (filterBoard) {
      if (!item.item_boards?.some((ib) => ib.board_id === filterBoard)) return false
    }
    if (filterType && item.type !== filterType) return false
    return true
  })

  useEffect(() => {
    // If the collection is no longer empty, clear any stale error state.
    if (filteredItems.length > 0) setDropzoneError(null)
  }, [filteredItems.length])

  const setDropzoneErrorWithJiggle = useCallback((err: DropzoneErrorType) => {
    setDropzoneError(err)
    setDropzoneErrorJiggleNonce((n) => n + 1)
  }, [])
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

  const docsAreSpread = emptyCanvasDragActive || docIconHovered
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

  const hasItemsInCurrentBoard =
    !!filterBoard && items.some((item) => item.item_boards?.some((ib) => ib.board_id === filterBoard))
  const effectiveColumns = isSmOnlyViewport ? 1 : columns
  // Avoid potential TDZ issues during hot reload/compilation by ensuring
  // the variable exists with a safe initial value.
  let isEmptyBoard = false
  isEmptyBoard = !!filterBoard && !hasItemsInCurrentBoard

  useLayoutEffect(() => {
    // Only relevant for the collection-view empty dropzone layout.
    if (!boardId || !isEmptyBoard) return
    const innerEl = emptyDropzoneInnerRef.current
    const dzEl = emptyDropzoneRef.current
    if (!innerEl || !dzEl) return

    const update = () => {
      const innerH = innerEl.clientHeight
      const dzH = dzEl.offsetHeight
      // If the dropzone doesn't fit inside the inner 85% region,
      // clamp it to the top instead of centering (which would push it down).
      setClampEmptyDropzoneTop(dzH >= innerH)
    }

    update()
    window.addEventListener("resize", update)
    return () => window.removeEventListener("resize", update)
  }, [boardId, isEmptyBoard, dropzoneErrorJiggleNonce])

  const refreshItems = useCallback(async () => {
    const { data } = await supabase
      .from("items")
      .select("*, item_boards(board_id)")
      .order("created_at", { ascending: false })
    if (data) setItems(data)
  }, [supabase])

  const refreshBoards = useCallback(async () => {
    const { data } = await supabase
      .from("boards")
      .select("*, item_boards(count)")
      .order("created_at", { ascending: true })
    if (data) {
      setBoards(
        data.map((b) => ({
          ...b,
          item_count: b.item_boards?.[0]?.count ?? 0,
        })),
      )
    }
  }, [supabase])

  const handleDeleteItem = useCallback(
    async (itemId: string) => {
      const item = items.find((i) => i.id === itemId)
      if (item?.type === "image" && item.file_url) {
        const path = item.file_url.split("/storage/v1/object/public/images/")[1]
        if (path) {
          await supabase.storage.from("images").remove([path])
        }
      }
      await supabase.from("items").delete().eq("id", itemId)
      setItems((prev) => prev.filter((i) => i.id !== itemId))
    },
    [items, supabase],
  )

  const handleBulkDelete = useCallback(async () => {
    const ids = Array.from(selectedIds)
    for (const id of ids) {
      await handleDeleteItem(id)
    }
    setSelectedIds(new Set())
  }, [selectedIds, handleDeleteItem])

  const handleBulkMove = useCallback(
    async (targetBoardId: string) => {
      const ids = Array.from(selectedIds)

      for (const itemId of ids) {
        // Treat this as a true "move": clear existing board links for the item,
        // then assign it only to the target board.
        await supabase.from("item_boards").delete().eq("item_id", itemId)
        await supabase.from("item_boards").insert({ item_id: itemId, board_id: targetBoardId })
      }

      await refreshItems()
      setSelectedIds(new Set())
    },
    [selectedIds, supabase, refreshItems],
  )

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const handleDeleteCollection = useCallback(async () => {
    if (!boardId) return
    if (!confirm("Delete this collection? Items in it will be unassigned from this collection but not deleted.")) return
    const { error } = await supabase.from("boards").delete().eq("id", boardId)
    if (error) {
      console.error("Failed to delete collection:", error)
      return
    }
    router.push("/dashboard")
  }, [boardId, supabase, router])

  const handleRenameCollection = useCallback(
    async (nextName: string) => {
      const trimmed = nextName.trim() || "Untitled collection"
      setCollectionName(trimmed)
      if (!boardId) return

      const { error } = await supabase.from("boards").update({ name: trimmed }).eq("id", boardId)
      if (error) {
        console.error("Failed to rename collection:", error)
        return
      }

      setBoards((prev) =>
        prev.map((board) => (board.id === boardId ? { ...board, name: trimmed } : board)),
      )
    },
    [boardId, supabase],
  )

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
    <div className="flex min-h-screen flex-col bg-background">
      {mounted ? (
        <TopNav
          search={search}
          onSearchChange={setSearch}
          columns={columns}
          onColumnsChange={handleColumnsChange}
          onAddClick={() => setAddDialogOpen(true)}
          filterType={filterType}
          onFilterTypeChange={setFilterType}
          user={user}
          isCollectionView={true}
        />
      ) : (
        <header
          className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-background px-4"
          aria-hidden
        >
          <h1 className="text-sm font-semibold text-foreground">Curated</h1>
          <div className="relative ml-2 flex-1 max-w-sm h-8 rounded-md border border-input bg-background" />
          <div className="h-8 w-[110px] shrink-0 rounded-md border border-input" />
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-24 h-6 rounded-md bg-muted" />
            <span className="w-4 text-center text-sm text-muted-foreground">6</span>
          </div>
          <div className="h-8 w-8 shrink-0" />
          <div className="h-8 w-8 shrink-0" />
          <div className="h-8 shrink-0 w-[60px] rounded-md bg-muted" />
          <div className="h-8 w-8 shrink-0 rounded-md border border-input" />
        </header>
      )}

      <div className="flex flex-1">
        <main className="flex flex-1 min-h-0 flex-col p-4 pt-[128px] [overflow-anchor:none]">
          {boardId && (
            <div className="mb-8">
              <div className="flex items-center justify-between md:hidden">
                <Button variant="secondary" size="icon" className="cta-icon" asChild>
                  <Link href="/dashboard" aria-label="Back to dashboard">
                    <ArrowLeftFromLine className="h-6 w-6" />
                  </Link>
                </Button>
                <Button variant="secondary" size="lg" onClick={handleDeleteCollection}>
                  Delete collection
                </Button>
              </div>

              <div className="mt-4 flex items-center justify-between md:mt-0">
                <div className="flex items-center gap-6">
                  <Button variant="secondary" size="icon" className="cta-icon hidden md:inline-flex" asChild>
                    <Link href="/dashboard" aria-label="Back to dashboard">
                      <ArrowLeftFromLine className="h-6 w-6" />
                    </Link>
                  </Button>
                  <h1
                    className="headline-primary editable-headline"
                    style={{
                      color: "var(--Text-Headlines, #333)",
                      fontFamily: 'var(--font-family-All, "Host Grotesk")',
                      fontSize: "var(--font-size-Large, 32px)",
                      fontStyle: "normal",
                      fontWeight: 800,
                      lineHeight: "var(--font-line-height-Large, 44px)",
                    }}
                    contentEditable
                    suppressContentEditableWarning
                    spellCheck={false}
                    onBlur={(event) => {
                      const next = event.currentTarget.textContent ?? ""
                      handleRenameCollection(next)
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault()
                        event.currentTarget.blur()
                      }
                    }}
                  >
                    {collectionName || "Untitled collection"}
                  </h1>
                </div>

                <Button variant="secondary" size="lg" className="hidden md:inline-flex" onClick={handleDeleteCollection}>
                  Delete collection
                </Button>
              </div>
            </div>
          )}
          {filteredItems.length === 0 ? (
            <div
              className={cn(
                search.trim() ? "flex min-h-[200px] items-center justify-center" : "flex min-h-0 flex-1",
                boardId && isEmptyBoard
                  ? "items-start justify-start"
                  : !search.trim() && "items-center justify-center -translate-y-14",
              )}
            >
              {boardId && isEmptyBoard ? (
                <div
                  ref={emptyDropzoneInnerRef}
                  className={cn(
                    "flex w-full",
                    clampEmptyDropzoneTop ? "items-start justify-start" : "items-center justify-center",
                  )}
                  style={{ height: "90%" }}
                >
                  <div
                    ref={emptyDropzoneRef}
                    key={dropzoneErrorJiggleNonce}
                    className={cn(
                      "empty-canvas-dropzone flex w-full items-center justify-center px-8 py-12 transition-colors",
                      dropzoneError && "dnd-dropzone-error-jiggle",
                      emptyCanvasDragActive && "empty-canvas-dropzone-active",
                    )}
                    onDragOver={(e) => {
                      e.preventDefault()
                      setEmptyCanvasDragActive(true)
                    }}
                    onDragEnter={(e) => {
                      e.preventDefault()
                      setEmptyCanvasDragActive(true)
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault()
                      setEmptyCanvasDragActive(false)
                    }}
                    onDrop={(e) => {
                      e.preventDefault()
                      setEmptyCanvasDragActive(false)
                      const files = Array.from(e.dataTransfer.files ?? [])
                      if (!files.length) return
                      const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"])
                      const valid = files.filter((f) => allowedTypes.has(f.type))
                      if (valid.length === 0) {
                        console.warn(
                          "No supported files dropped; only JPG, PNG, and WebP are supported right now.",
                        )
                        setDropzoneErrorWithJiggle("incorrect-file-type")
                        return
                      }

                      setDropzoneError(null)
                      setInitialFiles(valid)
                      setAddDialogOpen(true)
                    }}
                  >
                  {/* Mobile: dedicated 400×400 border so dashes aren't stretched */}
                  <svg
                    className="empty-canvas-border block sm:hidden max-[767px]:hidden"
                    viewBox="0 0 400 400"
                    preserveAspectRatio="none"
                    aria-hidden="true"
                  >
                    <rect
                      x="1"
                      y="1"
                      width="398"
                      height="398"
                      rx="24"
                      ry="24"
                      className="empty-canvas-border-rect"
                    />
                  </svg>

                  {/* Desktop & tablet: original 690×520 border */}
                  <svg
                    className="empty-canvas-border hidden sm:block max-[767px]:hidden"
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
                    className="pointer-events-auto flex max-w-lg flex-1 flex-col items-center gap-3 text-center"
                    onClick={() => fileInputRef.current?.click()}
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
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    multiple
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => {
                      const files = Array.from(e.target.files ?? [])
                      if (!files.length) return
                      const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"])
                      const valid = files.filter((f) => allowedTypes.has(f.type))
                      if (valid.length === 0) {
                        console.warn(
                          "No supported files selected; only JPG, PNG, and WebP are supported right now.",
                        )
                        setDropzoneErrorWithJiggle("incorrect-file-type")
                        return
                      }

                      setDropzoneError(null)
                      setInitialFiles(valid)
                      setAddDialogOpen(true)
                    }}
                  />
                  </div>
                </div>
              ) : (
                <div className="text-center space-y-4">
                  <p
                    className={cn(
                      search.trim() ? "headline-primary text-center" : "text-sm text-muted-foreground",
                    )}
                  >
                    {items.length === 0
                      ? "No items yet. Add your first inspiration."
                      : search.trim()
                        ? "No items match your search term."
                        : "No items match your filters."}
                  </p>
                  {boardId && !search.trim() && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive border-destructive/50 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/50"
                      onClick={handleDeleteCollection}
                    >
                      <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                      Delete collection
                    </Button>
                  )}
                </div>
              )}
            </div>
          ) : (
            <MasonryGrid
              items={filteredItems}
              columns={effectiveColumns}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelect}
            onEditItem={(item) => {
              setEditingItem(item)
              setEditDialogOpen(true)
            }}
              onDeleteItem={handleDeleteItem}
            />
          )}
        </main>
      </div>

      {(selectedIds.size > 0 || bulkBarExiting) && (
        <div
          className={`fixed inset-x-0 bottom-0 z-30 ${bulkBarExiting ? "animate-bulk-bar-out pointer-events-none" : "animate-bulk-bar-in"}`}
        >
          <BulkBar
            selectedCount={selectedIds.size > 0 ? selectedIds.size : exitingSelectedCount}
            boards={boards}
            onBulkMove={handleBulkMove}
            onBulkDelete={handleBulkDelete}
            onCancel={() => setSelectedIds(new Set())}
            currentBoardId={filterBoard}
          />
        </div>
      )}

      {boardId && (
        <div
          className="pointer-events-none fixed inset-x-0 z-20 flex justify-center"
          style={{
            bottom:
              selectedIds.size > 0 && !bulkBarExiting
                ? isSmOnlyViewport
                  ? 144
                  : 108
                : 32,
            transition: "bottom 0.35s cubic-bezier(0.33, 1, 0.68, 1)",
          }}
        >
          <div className="pointer-events-auto flex items-center gap-6">
            <SizeSlider
              value={columns}
              onValueChange={handleColumnsChange}
              min={MIN_COLLECTION_GRID_COLUMNS}
              max={MAX_COLLECTION_GRID_COLUMNS}
              aria-label="Columns per row"
              className="max-[767px]:hidden"
            />
            <Button
              size="icon"
              className="cta-icon"
              onClick={() => setAddDialogOpen(true)}
              aria-label="Add item"
            >
              <Plus className="h-6 w-6" />
            </Button>
          </div>
        </div>
      )}

      <AddItemDialog
        open={addDialogOpen}
        onOpenChange={(open) => {
          setAddDialogOpen(open)
          if (!open) {
            setInitialFiles(null)
          }
        }}
        boards={boards}
        defaultBoardId={filterBoard ?? undefined}
        onItemAdded={(newItem) => {
          if (newItem) {
            setItems((prev) => [newItem, ...prev])
          }
          refreshItems()
          refreshBoards()
        }}
        initialFiles={initialFiles ?? undefined}
      />

      {editingItem && (
        <EditItemDialog
          open={editDialogOpen}
          onOpenChange={(open) => {
            setEditDialogOpen(open)
            if (!open) {
              // Allow close animation to finish before unmounting
              window.setTimeout(() => {
                setEditingItem(null)
              }, 220)
            }
          }}
          item={editingItem}
          boards={boards}
          onItemUpdated={() => {
            refreshItems()
            refreshBoards()
          }}
          onItemDeleted={(id) => {
            handleDeleteItem(id)
            setEditDialogOpen(false)
            window.setTimeout(() => {
              setEditingItem(null)
            }, 220)
          }}
        />
      )}
    </div>
  )
}
