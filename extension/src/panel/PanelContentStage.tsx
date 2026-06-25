import { motion } from "motion/react"
import { useLayoutEffect, useRef, useState, type ReactNode } from "react"
import { PANEL_LAYOUT_SPRING } from "./panel-transitions"
import { TAB_CONTENT_HEIGHT_PX } from "./tab-layout"

type PanelContentStageProps = {
  isSuccess: boolean
  form: ReactNode
  success: ReactNode
  /** Re-measure when form layout may change (e.g. tab switch). */
  formMeasureKey?: string
}

export function PanelContentStage({
  isSuccess,
  form,
  success,
  formMeasureKey,
}: PanelContentStageProps) {
  const contentRef = useRef<HTMLDivElement>(null)
  const [height, setHeight] = useState(TAB_CONTENT_HEIGHT_PX)

  useLayoutEffect(() => {
    const el = contentRef.current
    if (!el) return

    const applyMeasuredHeight = () => {
      const measured = el.offsetHeight
      if (measured <= 0) return
      setHeight(measured)
    }

    applyMeasuredHeight()

    const observer = new ResizeObserver(applyMeasuredHeight)
    observer.observe(el)
    return () => observer.disconnect()
  }, [isSuccess, formMeasureKey])

  return (
    <motion.div
      initial={false}
      animate={{ height }}
      transition={PANEL_LAYOUT_SPRING}
      className="relative -mx-1 overflow-visible px-1"
    >
      <div
        ref={contentRef}
        style={{ minHeight: isSuccess ? undefined : TAB_CONTENT_HEIGHT_PX }}
      >
        {isSuccess ? success : form}
      </div>
    </motion.div>
  )
}
