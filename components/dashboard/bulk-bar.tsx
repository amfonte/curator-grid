'use client'

import type { Board } from "@/lib/types"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface BulkBarProps {
  selectedCount: number
  boards: Board[]
  onBulkMove: (boardId: string) => void
  onBulkDelete: () => void
  onCancel: () => void
  /** When set, hide this collection from the Move to collection list. */
  currentBoardId?: string | null
}

export function BulkBar({
  selectedCount,
  boards,
  onBulkMove,
  onBulkDelete,
  onCancel,
  currentBoardId,
}: BulkBarProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 border-0 border-transparent px-4 py-4 bg-[var(--card)] md:flex-row md:gap-6">
      <span className="order-2 text-base text-foreground md:order-1">
        {selectedCount} selected
      </span>

      <div className="order-1 flex flex-nowrap items-center justify-center gap-6 md:order-2">
        {/* Primary action: Move to collection (text-only primary button) */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm">
              Move to collection
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {boards
              .filter((board) => board.name.toLowerCase() !== "unsorted")
              .filter((board) => !currentBoardId || board.id !== currentBoardId)
              .map((board) => (
                <DropdownMenuItem key={board.id} onClick={() => onBulkMove(board.id)}>
                  {board.name}
                </DropdownMenuItem>
              ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Secondary action: Delete (Secondary Button text, no icon) */}
        <Button variant="secondary" size="sm" onClick={onBulkDelete}>
          Delete
        </Button>

        {/* Tertiary action: Cancel (text link, same styling as auth page links) */}
        <button
          type="button"
          onClick={onCancel}
          className="text-foreground font-normal link-wavy-underline cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

