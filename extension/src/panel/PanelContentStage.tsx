import { motion } from "motion/react"
import { useLayoutEffect, useRef, useState, type ReactNode } from "react"
import { PANEL_LAYOUT_TRANSITION } from "./panel-transitions"
import { TAB_CONTENT_HEIGHT_PX } from "./tab-layout"

type PanelContentStageProps = {
  isSuccess: boolean
  form: ReactNode
  success: ReactNode
  targetHeight?: number
  /** Re-measure when form layout may change (e.g. tab switch). */
  formMeasureKey?: string
}

export function PanelContentStage({
  isSuccess,
  form,
  success,
  targetHeight,
  formMeasureKey,
}: PanelContentStageProps) {
  const contentRef = useRef<HTMLDivElement>(null)
  const [height, setHeight] = useState(TAB_CONTENT_HEIGHT_PX)

  useLayoutEffect(() => {
    if (targetHeight != null) {
      setHeight((prev) => (prev === targetHeight ? prev : targetHeight))
      return
    }

    const el = contentRef.current
    if (!el) return

    const applyMeasuredHeight = () => {
      const measured = el.offsetHeight
      if (measured <= 0) return
      setHeight((prev) => (prev === measured ? prev : measured))
    }

    applyMeasuredHeight()

    const observer = new ResizeObserver(applyMeasuredHeight)
    observer.observe(el)
    return () => observer.disconnect()
  }, [isSuccess, formMeasureKey, targetHeight])

  return (
    <motion.div
      initial={false}
      animate={{ height }}
      transition={PANEL_LAYOUT_TRANSITION}
      className="relative -mx-1 overflow-visible px-1"
    >
      <div
        ref={contentRef}
        style={{ minHeight: isSuccess ? undefined : targetHeight ?? TAB_CONTENT_HEIGHT_PX }}
      >
        {isSuccess ? success : form}
      </div>
    </motion.div>
  )
}
