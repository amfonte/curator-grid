import { Image as ImageIcon, Link as LinkIcon } from "lucide-react"
import { motion } from "motion/react"
import type { PanelTab } from "../lib/messaging"

const TOGGLE_INDICATOR_SHADOW =
  "0 2px 1px 0 #FFF inset, 0 6px 8px 0 #F5F5F5 inset, 0 -4px 4px 0 #FFF inset, 0 -8px 12px 0 #F5F5F5 inset, 0 4px 4px 0 rgba(0,0,0,0.05), 0 2px 2px 0 rgba(0,0,0,0.05), 0 8px 8px 0 rgba(0,0,0,0.05), 0 1px 1px 0 rgba(0,0,0,0.05), 0 0 0 1px rgba(0,0,0,0.05)"

const TOGGLE_SPRING_TRANSITION = {
  type: "spring" as const,
  visualDuration: 0.2,
  bounce: 0.2,
}

type UrlImageToggleProps = {
  activeTab: PanelTab
  onChange: (tab: PanelTab) => void
  hidden?: boolean
}

export function UrlImageToggle({ activeTab, onChange, hidden = false }: UrlImageToggleProps) {
  if (hidden) return null

  return (
    <div
      className="relative flex h-[60px] w-full items-center justify-between rounded-[30px] bg-[var(--gray-20)] p-[6px] text-muted-foreground"
      role="tablist"
      aria-label="Save type"
    >
      <motion.div
        initial={false}
        animate={{ x: activeTab === "url" ? 0 : "100%" }}
        transition={TOGGLE_SPRING_TRANSITION}
        className="pointer-events-none absolute inset-y-[6px] left-[6px] h-[48px] w-[calc(50%-6px)] rounded-[24px] bg-[var(--gray-10)]"
        style={{ boxShadow: TOGGLE_INDICATOR_SHADOW }}
        aria-hidden
      />
      <button
        type="button"
        role="tab"
        aria-selected={activeTab === "url"}
        className="relative z-10 flex h-[48px] w-1/2 items-center justify-center gap-1.5 rounded-[24px] border-none bg-transparent text-base font-medium text-foreground shadow-none outline-none"
        onClick={() => onChange("url")}
      >
        <LinkIcon className="h-5 w-5 text-foreground" aria-hidden />
        URL
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={activeTab === "image"}
        className="relative z-10 flex h-[48px] w-1/2 items-center justify-center gap-1.5 rounded-[24px] border-none bg-transparent text-base font-medium text-foreground shadow-none outline-none"
        onClick={() => onChange("image")}
      >
        <ImageIcon className="h-5 w-5 text-foreground" aria-hidden />
        Image
      </button>
    </div>
  )
}
