import { AnimatePresence, motion } from "motion/react"
import type { ReactNode } from "react"
import type { PanelTab } from "../lib/messaging"
import { PANEL_BLUR_FADE_TRANSITION, PANEL_TAB_CROSSFADE_VARIANTS } from "./panel-transitions"

type PanelTabCrossfadeProps = {
  activeTab: PanelTab
  urlContent: ReactNode
  imageContent: ReactNode
}

export function PanelTabCrossfade({
  activeTab,
  urlContent,
  imageContent,
}: PanelTabCrossfadeProps) {
  return (
    <div className="relative w-full">
      <AnimatePresence initial={false}>
        <motion.div
          key={activeTab}
          className="w-full"
          variants={PANEL_TAB_CROSSFADE_VARIANTS}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={PANEL_BLUR_FADE_TRANSITION}
        >
          {activeTab === "url" ? urlContent : imageContent}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
