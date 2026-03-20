"use client"

import Masonry from "react-masonry-css"
import type { Item } from "@/lib/types"
import { GridItem } from "@/components/dashboard/grid-item"

interface MasonryGridProps {
  items: (Item & { item_boards: { board_id: string }[] })[]
  columns: number
  selectedIds: Set<string>
  onToggleSelect: (id: string) => void
  onEditItem: (item: MasonryGridProps["items"][0]) => void
  onDeleteItem: (id: string) => void
}

export function MasonryGrid({
  items,
  columns,
  selectedIds,
  onToggleSelect,
  onEditItem,
  onDeleteItem,
}: MasonryGridProps) {
  return (
    <Masonry
      breakpointCols={columns}
      className={`masonry-grid masonry-grid--cols-${columns}`}
      columnClassName="masonry-grid-column"
    >
      {items.map((item) => (
        <GridItem
          key={item.id}
          columns={columns}
          item={item}
          selected={selectedIds.has(item.id)}
          onToggleSelect={() => onToggleSelect(item.id)}
          onEdit={() => onEditItem(item)}
          onDelete={() => onDeleteItem(item.id)}
        />
      ))}
    </Masonry>
  )
}
