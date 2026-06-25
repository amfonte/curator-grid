import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select"
import type { ExtensionBoard } from "../lib/messaging"
import { isSaveableTabUrl } from "../lib/url"
import { VIEWPORT_OPTIONS, type ViewportSize } from "../lib/viewports"
import { FormField } from "./FormField"

type UrlTabShellProps = {
  url: string
  title: string
  metadataTitle?: string
  boards: ExtensionBoard[]
  viewport: ViewportSize
  selectedBoard: string
  saving: boolean
  saveError: string | null
  onViewportChange: (value: ViewportSize) => void
  onBoardChange: (value: string) => void
  onSave: () => void
}

export function UrlTabShell({
  url,
  title,
  metadataTitle,
  boards,
  viewport,
  selectedBoard,
  saving,
  saveError,
  onViewportChange,
  onBoardChange,
  onSave,
}: UrlTabShellProps) {
  const displayUrl = url || "No URL available on this tab"
  const subtitle = metadataTitle || title
  const selectableBoards = boards.filter((board) => board.name.toLowerCase() !== "unsorted")
  const canSave = isSaveableTabUrl(url) && Boolean(selectedBoard) && !saving

  return (
    <div className="flex flex-col gap-5">
      <div className="flex min-w-0 flex-col gap-[8px]">
        <p className="truncate text-base font-normal leading-6 text-foreground">{displayUrl}</p>
        {subtitle ? (
          <p className="truncate text-sm text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>

      <FormField label="Viewport" htmlFor="viewport" className="gap-[8px]">
        <Select value={viewport} onValueChange={(value) => onViewportChange(value as ViewportSize)}>
          <SelectTrigger id="viewport">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {VIEWPORT_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>

      <FormField label="Collection" className="gap-[8px]">
        <Select value={selectedBoard} onValueChange={onBoardChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select" />
          </SelectTrigger>
          <SelectContent>
            {selectableBoards.map((board) => (
              <SelectItem key={board.id} value={board.id}>
                {board.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>

      {saveError ? (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{saveError}</div>
      ) : null}

      <button type="button" className="cta-primary w-full" disabled={!canSave} onClick={onSave}>
        {saving ? "Saving…" : "Add URL"}
      </button>
    </div>
  )
}
