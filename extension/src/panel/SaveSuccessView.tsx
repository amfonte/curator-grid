import { useState } from "react"
import { openCuratorSignedIn } from "../lib/open-curator"
import type { PanelTab } from "../lib/messaging"

type SaveSuccessViewProps = {
  boardName: string
  boardId: string
  saveType: PanelTab
  imageCount?: number
}

function formatSuccessMessage(
  saveType: PanelTab,
  boardName: string,
  imageCount?: number,
): string {
  if (saveType === "url") {
    return `URL saved to ${boardName}`
  }

  const count = imageCount ?? 1
  const noun = count === 1 ? "image" : "images"
  return `${count} ${noun} saved to ${boardName}`
}

export function SaveSuccessView({
  boardName,
  boardId,
  saveType,
  imageCount,
}: SaveSuccessViewProps) {
  const [opening, setOpening] = useState(false)

  async function handleOpenCollection() {
    setOpening(true)
    try {
      await openCuratorSignedIn(`/dashboard/collections/${boardId}`)
    } finally {
      setOpening(false)
    }
  }

  return (
    <div className="flex w-full flex-col items-center gap-5">
      <p className="text-center text-lg font-medium leading-7 text-foreground">
        {formatSuccessMessage(saveType, boardName, imageCount)}
      </p>
      <button
        type="button"
        className="cta-secondary w-full"
        disabled={opening}
        onClick={() => void handleOpenCollection()}
      >
        {opening ? "Opening Curator…" : "View on Curator"}
      </button>
    </div>
  )
}
