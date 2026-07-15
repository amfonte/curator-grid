import { AnimatePresence, motion } from "motion/react"
import { useEffect, useRef } from "react"
import { CtaTextButton } from "../components/CtaTextButton"
import { cn } from "../lib/utils"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select"
import type { ExtensionBoard } from "../lib/messaging"
import { IMAGE_BORDER_RADIUS_PX } from "../lib/pick-border"
import type { SelectedImage } from "../lib/pick-mode"
import { EmptyCanvasBorder } from "./EmptyCanvasBorder"
import { FormField } from "./FormField"
import {
  PANEL_BLUR_FADE_TRANSITION,
  PANEL_EMPTY_CANVAS_VARIANTS,
  PANEL_IMAGE_POPULATED_VARIANTS,
  PANEL_SAVE_CONTROLS_ENTRANCE_VARIANTS,
} from "./panel-transitions"
import { SelectedImageStack } from "./SelectedImageStack"
import { TAB_CONTENT_HEIGHT_PX } from "./tab-layout"

type ImageTabShellProps = {
  selectedImages: SelectedImage[]
  boards: ExtensionBoard[]
  selectedBoard: string
  saving: boolean
  saveProgress: { current: number; total: number } | null
  saveError: string | null
  onBoardChange: (value: string) => void
  onRemoveImage: (url: string) => void
  onSave: () => void
}

export function ImageTabShell({
  selectedImages,
  boards,
  selectedBoard,
  saving,
  saveProgress,
  saveError,
  onBoardChange,
  onRemoveImage,
  onSave,
}: ImageTabShellProps) {
  const count = selectedImages.length
  const hasSelection = count > 0
  const selectableBoards = boards.filter((board) => board.name.toLowerCase() !== "unsorted")
  const canSave = hasSelection && Boolean(selectedBoard) && !saving

  const skipControlsEntranceRef = useRef(true)
  const animateControlsIn = hasSelection && !skipControlsEntranceRef.current

  useEffect(() => {
    skipControlsEntranceRef.current = false
  }, [])

  const saveLabel =
    count === 1 ? "Add item" : `Add items • ${count} selected`

  const savingLabel =
    saveProgress && saveProgress.total > 1
      ? `Saving ${saveProgress.current} of ${saveProgress.total}`
      : "Saving…"

  return (
    <div className="relative w-full">
      <AnimatePresence initial={false}>
        {!hasSelection ? (
          <motion.div
            key="empty-canvas"
            variants={PANEL_EMPTY_CANVAS_VARIANTS}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={PANEL_BLUR_FADE_TRANSITION}
            className="relative flex flex-col items-center justify-center gap-4 rounded-lg bg-card px-8 text-center"
            style={{ height: TAB_CONTENT_HEIGHT_PX }}
          >
            <EmptyCanvasBorder borderRadius={IMAGE_BORDER_RADIUS_PX} />
            <div className="relative z-[1] flex flex-col items-center">
              <p className="text-base font-normal leading-6 text-foreground">
                Select images and they will populate here.
              </p>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="image-populated"
            variants={PANEL_IMAGE_POPULATED_VARIANTS}
            initial={false}
            animate="animate"
            exit="exit"
            className="w-full"
          >
            <SelectedImageStack images={selectedImages} onRemoveImage={onRemoveImage} />

            <motion.div
              variants={PANEL_SAVE_CONTROLS_ENTRANCE_VARIANTS}
              initial={animateControlsIn ? "initial" : false}
              animate="animate"
              transition={PANEL_BLUR_FADE_TRANSITION}
              className="mt-5 flex w-full flex-col gap-5"
            >
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
                {saving ? savingLabel : saveLabel}
              </CtaTextButton>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
