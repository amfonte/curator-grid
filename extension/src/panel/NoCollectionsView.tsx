import { useState } from "react"
import { CtaTextButton } from "../components/CtaTextButton"
import { openCuratorSignedIn } from "../lib/open-curator"
import { cn } from "../lib/utils"

export function NoCollectionsView() {
  const [opening, setOpening] = useState(false)

  async function handleOpenDashboard() {
    setOpening(true)
    try {
      await openCuratorSignedIn("/dashboard")
    } finally {
      setOpening(false)
    }
  }

  return (
    <div className="flex min-h-[280px] flex-col justify-between gap-8">
      <div className="flex flex-col gap-3 text-center">
        <p className="text-lg font-medium leading-7 text-foreground">
          You don&apos;t have any collections created yet.
        </p>
        <p className="text-base leading-6 text-foreground">
          To save URLs or images, you need to create a collection first.
        </p>
      </div>
      <CtaTextButton
        className={cn("w-full", opening && "cta-disabled-loading")}
        disabled={opening}
        onClick={() => void handleOpenDashboard()}
      >
        {opening ? "Opening Curator…" : "Create your first collection"}
      </CtaTextButton>
    </div>
  )
}
