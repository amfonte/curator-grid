import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select"
import { CtaTextButton } from "../components/CtaTextButton"
import type { ExtensionBoard } from "../lib/messaging"
import { cn } from "../lib/utils"
import { isSaveableTabUrl } from "../lib/url"
import { VIEWPORT_OPTIONS, type ViewportSize } from "../lib/viewports"
import { FormField } from "./FormField"
import { TAB_CONTENT_HEIGHT_PX } from "./tab-layout"

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
    <div className="flex flex-col gap-5" style={{ minHeight: TAB_CONTENT_HEIGHT_PX }}>
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

      <CtaTextButton
        className={cn("w-full", saving && "cta-disabled-loading")}
        disabled={!canSave}
        onClick={onSave}
      >
        {saving ? "Saving…" : "Add URL"}
      </CtaTextButton>
    </div>
  )
}
