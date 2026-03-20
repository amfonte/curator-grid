"use client"

import { useId } from "react"
import { motion } from "motion/react"
import { cn } from "@/lib/utils"
import {
  FolderUnion,
  FolderRect1,
  FolderRect3,
  FolderRect4,
  FolderRect5,
  FolderRect6,
  FolderLine,
} from "@/components/dashboard/folder-assets"

/**
 * 1:1 recreation of the Curator Figma Folder component (node 52-313).
 * Uses inline SVG assets and motion for hover animation.
 */

const FOLDER_TRANSITION = {
  type: "spring" as const,
  stiffness: 700,
  damping: 17,
  mass: 1,
}

export type FolderState = "Default" | "Hover"
export type FolderType = "Filled" | "Empty"

export interface FolderProps {
  state?: FolderState
  type?: FolderType
  className?: string
}

export function Folder({
  className,
  state = "Default",
  type = "Empty",
}: FolderProps) {
  const idPrefix = useId()

  const isEmptyAndHover = type === "Empty" && state === "Hover"
  const isEmptyAndIsDefaultOrHover =
    type === "Empty" && (state === "Default" || state === "Hover")
  const isFilledAndDefault = type === "Filled" && state === "Default"
  const isFilledAndHover = type === "Filled" && state === "Hover"
  const isFilledAndIsDefaultOrHover =
    type === "Filled" && (state === "Default" || state === "Hover")

  return (
    <div
      className={cn("relative h-[232px] w-[335px]", className)}
      role="img"
      aria-label={type === "Empty" ? "Empty folder" : "Folder with contents"}
    >
      {/* Union (folder outline/shape) */}
      <div
        className="absolute z-0 h-[232px] left-[8px] right-[8px] top-0"
        data-name="Union"
      >
        <FolderUnion
          idPrefix={idPrefix}
          className="absolute block size-full"
          aria-hidden
        />
      </div>

      {/* Layer 1 - base rectangle:
          - Empty: simple panel that squashes slightly on hover (no extra gradient/clip animation)
          - Filled: rect3 positioned inside the folder */}
      <motion.div
        className={cn(
          "absolute z-10",
          isFilledAndIsDefaultOrHover && "h-[156px] w-[301px]",
          isEmptyAndIsDefaultOrHover && "origin-bottom"
        )}
        initial={false}
        animate={
          isFilledAndIsDefaultOrHover
            ? { left: 17, top: 28, height: 156, width: 301 }
            : isEmptyAndIsDefaultOrHover
              ? {
                  left: 0,
                  top: 40,
                  height: 192,
                  width: 335,
                  scaleY: isEmptyAndHover ? 0.95833 : 1,
                }
              : { left: 0, top: 40, height: 192, width: 335 }
        }
        transition={FOLDER_TRANSITION}
      >
        {isEmptyAndIsDefaultOrHover && (
          <FolderRect1
            idPrefix={idPrefix}
            className="absolute inset-0 block h-full w-full"
            aria-hidden
          />
        )}
        {isFilledAndIsDefaultOrHover && (
          <FolderRect3 idPrefix={idPrefix} className="absolute block size-full" aria-hidden />
        )}
      </motion.div>

      {/* Layer 2 */}
      <motion.div
        className="absolute z-10"
        initial={false}
        animate={
          isFilledAndHover
            ? { height: 152, left: 15, top: 35, width: 305 }
            : isFilledAndDefault
              ? { height: 152, left: 15, top: 32, width: 305 }
              : { height: 0, left: 24, top: 200, width: 287 }
        }
        transition={FOLDER_TRANSITION}
      >
        {isEmptyAndIsDefaultOrHover && (
          <div className="absolute inset-[-1px_0]">
            <FolderLine idPrefix={idPrefix} className="block size-full" aria-hidden />
          </div>
        )}
        {isFilledAndIsDefaultOrHover && (
          <FolderRect4 idPrefix={idPrefix} className="absolute block size-full" aria-hidden />
        )}
      </motion.div>

      {/* Layer 3 */}
      <motion.div
        className="absolute z-10"
        initial={false}
        animate={
          isFilledAndHover
            ? { height: 152, left: 13, top: 42, width: 309 }
            : isFilledAndDefault
              ? { height: 152, left: 13, top: 36, width: 309 }
              : { height: 0, left: 24, top: 208, width: 287 }
        }
        transition={FOLDER_TRANSITION}
      >
        {isEmptyAndIsDefaultOrHover && (
          <div className="absolute inset-[-1px_0]">
            <FolderLine idPrefix={idPrefix} className="block size-full" aria-hidden />
          </div>
        )}
        {isFilledAndIsDefaultOrHover && (
          <FolderRect5 idPrefix={idPrefix} className="absolute block size-full" aria-hidden />
        )}
      </motion.div>

      {/* Layer 4 (front flap) - scaleY only for filled; position for empty */}
      <motion.div
        className={cn(
          "absolute z-10 origin-bottom",
          isFilledAndIsDefaultOrHover && "bottom-0 left-0 right-0 top-[40px]"
        )}
        initial={false}
        animate={
          isFilledAndHover
            ? { scaleY: 0.95833 }
            : isFilledAndDefault
              ? { scaleY: 1 }
              : { scaleY: 1, height: 0, left: 24, top: 216, width: 287 }
        }
        transition={FOLDER_TRANSITION}
      >
        <div
          className={
            isFilledAndIsDefaultOrHover
              ? "absolute inset-[0_0.12%]"
              : "absolute inset-[-1px_0]"
          }
        >
          {isFilledAndIsDefaultOrHover ? (
            <FolderRect6 idPrefix={idPrefix} className="block size-full" aria-hidden />
          ) : (
            <FolderLine idPrefix={idPrefix} className="block size-full" aria-hidden />
          )}
        </div>
      </motion.div>

      {/* Filled state: extra line layers */}
      {isFilledAndIsDefaultOrHover && (
        <>
          <div className="absolute z-20 h-0 left-[24px] top-[200px] w-[287px]">
            <div className="absolute inset-[-1px_0]">
              <FolderLine idPrefix={idPrefix} className="block size-full" aria-hidden />
            </div>
          </div>
          <div className="absolute z-20 h-0 left-[24px] top-[208px] w-[287px]">
            <div className="absolute inset-[-1px_0]">
              <FolderLine idPrefix={idPrefix} className="block size-full" aria-hidden />
            </div>
          </div>
          <div className="absolute z-20 h-0 left-[24px] top-[216px] w-[287px]">
            <div className="absolute inset-[-1px_0]">
              <FolderLine idPrefix={idPrefix} className="block size-full" aria-hidden />
            </div>
          </div>
        </>
      )}
    </div>
  )
}
