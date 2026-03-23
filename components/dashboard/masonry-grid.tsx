"use client"

import { useEffect, useRef, useState } from "react"
import type { Item } from "@/lib/types"
import { cn } from "@/lib/utils"
import { GridItem } from "@/components/dashboard/grid-item"

interface MasonryGridProps {
  items: (Item & { item_boards: { board_id: string }[] })[]
  columns: number
  selectedIds: Set<string>
  onToggleSelect: (id: string) => void
  onEditItem: (item: MasonryGridProps["items"][0]) => void
  onDeleteItem: (id: string) => void
}

const INITIAL_RENDER_COUNT = 36
const RENDER_CHUNK_SIZE = 24
const ACTIVATION_ROOT_MARGIN_DESKTOP = "450px 0px"
const ACTIVATION_ROOT_MARGIN_MOBILE = "220px 0px"
const LOAD_MORE_ROOT_MARGIN_DESKTOP = "700px 0px"
const LOAD_MORE_ROOT_MARGIN_MOBILE = "320px 0px"

function GridItemPlaceholder({
  item,
  columns,
}: {
  item: MasonryGridProps["items"][0]
  columns: number
}) {
  const isImage = item.type === "image"
  const aspectRatio = isImage
    ? item.width && item.height
      ? `${item.width}/${item.height}`
      : "4/3"
    : item.viewport_size === "mobile"
      ? "375/812"
      : item.viewport_size === "tablet"
        ? "768/1024"
        : "16/10"
  const isLargeDensity = columns <= 2

  return (
    <div className="mb-8 w-full">
      <div className="flex min-w-0 items-center justify-between gap-2 overflow-hidden pb-1">
        <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden">
          <div className={cn("shrink-0 rounded bg-muted", isLargeDensity ? "h-6 w-6" : "h-3.5 w-3.5")} />
          <span
            className={cn(
              "truncate text-muted-foreground/80",
              isLargeDensity ? "text-base leading-6" : "text-sm",
            )}
          >
            {item.title || item.domain || "Loading preview..."}
          </span>
        </div>
      </div>
      <div
        className="w-full animate-pulse rounded bg-muted/80"
        style={{ aspectRatio }}
        aria-hidden="true"
      />
    </div>
  )
}

function LazyGridCell({
  item,
  columns,
  selected,
  onToggleSelect,
  onEdit,
  onDelete,
}: {
  item: MasonryGridProps["items"][0]
  columns: number
  selected: boolean
  onToggleSelect: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const [isNearViewport, setIsNearViewport] = useState(false)
  const [hasActivated, setHasActivated] = useState(false)
  const itemRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const element = itemRef.current
    if (!element) return
    if (typeof IntersectionObserver === "undefined") {
      setIsNearViewport(true)
      setHasActivated(true)
      return
    }
    const isMobileViewport = typeof window !== "undefined" && window.innerWidth <= 767
    const activationRootMargin = isMobileViewport ? ACTIVATION_ROOT_MARGIN_MOBILE : ACTIVATION_ROOT_MARGIN_DESKTOP
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (!entry) return
        if (entry.isIntersecting) {
          setIsNearViewport(true)
          setHasActivated(true)
        } else {
          setIsNearViewport(false)
        }
      },
      { rootMargin: activationRootMargin },
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  const shouldRenderActiveCard = hasActivated || isNearViewport

  return (
    <div ref={itemRef}>
      {shouldRenderActiveCard ? (
        <GridItem
          columns={columns}
          item={item}
          selected={selected}
          onToggleSelect={onToggleSelect}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ) : (
        <GridItemPlaceholder item={item} columns={columns} />
      )}
    </div>
  )
}

export function MasonryGrid({
  items,
  columns,
  selectedIds,
  onToggleSelect,
  onEditItem,
  onDeleteItem,
}: MasonryGridProps) {
  const [renderCount, setRenderCount] = useState(INITIAL_RENDER_COUNT)
  const loadMoreRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    setRenderCount((current) => {
      const minRequired = Math.min(INITIAL_RENDER_COUNT, items.length)
      return current < minRequired ? minRequired : current
    })
  }, [items.length])

  useEffect(() => {
    const element = loadMoreRef.current
    if (!element) return
    if (typeof IntersectionObserver === "undefined") {
      setRenderCount(items.length)
      return
    }
    const isMobileViewport = typeof window !== "undefined" && window.innerWidth <= 767
    const loadMoreRootMargin = isMobileViewport ? LOAD_MORE_ROOT_MARGIN_MOBILE : LOAD_MORE_ROOT_MARGIN_DESKTOP
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (!entry?.isIntersecting) return
        setRenderCount((current) => Math.min(current + RENDER_CHUNK_SIZE, items.length))
      },
      { rootMargin: loadMoreRootMargin },
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [items.length])

  const visibleItems = items.slice(0, Math.min(renderCount, items.length))
  const safeColumns = Math.max(columns, 1)
  const itemsByColumn: typeof visibleItems[] = Array.from({ length: safeColumns }, () => [])
  // Strict chronological ordering across columns: left-to-right, top-to-bottom.
  visibleItems.forEach((item, index) => {
    const columnIndex = index % safeColumns
    itemsByColumn[columnIndex]?.push(item)
  })

  return (
    <>
      <div className={`masonry-grid masonry-grid--cols-${columns}`}>
        {itemsByColumn.map((columnItems, columnIndex) => (
          <div
            key={columnIndex}
            className="masonry-grid-column"
            style={{ width: `${100 / safeColumns}%` }}
          >
            {columnItems.map((item) => (
              <LazyGridCell
                key={item.id}
                columns={columns}
                item={item}
                selected={selectedIds.has(item.id)}
                onToggleSelect={() => onToggleSelect(item.id)}
                onEdit={() => onEditItem(item)}
                onDelete={() => onDeleteItem(item.id)}
              />
            ))}
          </div>
        ))}
      </div>
      {visibleItems.length < items.length && <div ref={loadMoreRef} className="h-4 w-full" aria-hidden="true" />}
    </>
  )
}
