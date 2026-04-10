"use client"

import { useEffect, useId, useMemo, useRef, useState } from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { Eraser, Pipette, X } from "lucide-react"
import { Dialog, DialogOverlay, DialogPortal } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ScaledFolderFrame } from "@/components/dashboard/scaled-folder-frame"
import type { FolderAppearance, FolderTheme } from "@/lib/folder-customization"
import { DEFAULT_FOLDER_APPEARANCE, getThemeGradient } from "@/lib/folder-customization"
import { cn } from "@/lib/utils"

interface CustomizeCollectionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  collectionName: string
  /** Items in this collection; >0 shows the filled folder (pages visible), matching the grid card. */
  itemCount?: number
  initialAppearance?: FolderAppearance
  onSave: (appearance: FolderAppearance) => Promise<void> | void
}

const PRESETS: { key: Exclude<FolderTheme, "custom"> }[] = [
  { key: "gray" },
  { key: "manila" },
  { key: "blue" },
  { key: "pink" },
  { key: "green" },
]

/** RGB→HSV gives h=0 for neutrals; use a stable hue for the SV plane + slider when S≈0. */
const THEME_HUE_HINT: Record<Exclude<FolderTheme, "custom">, number> = {
  gray: 220,
  manila: 38,
  blue: 205,
  pink: 335,
  green: 135,
}

const ACHROMATIC_S = 0.02

/** Rainbow fill for custom swatch idle (Figma “gradient” circle). */
const CUSTOM_SWATCH_IDLE =
  "conic-gradient(from 0deg, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)"

type HsvColor = {
  h: number
  s: number
  v: number
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value))
}

function hexToHsv(hex: string): HsvColor {
  const clean = hex.replace("#", "")
  const normalized =
    clean.length === 3
      ? `${clean[0]}${clean[0]}${clean[1]}${clean[1]}${clean[2]}${clean[2]}`
      : clean.padEnd(6, "0").slice(0, 6)
  const r = parseInt(normalized.slice(0, 2), 16) / 255
  const g = parseInt(normalized.slice(2, 4), 16) / 255
  const b = parseInt(normalized.slice(4, 6), 16) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const d = max - min
  let h = 0
  if (d !== 0) {
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60
    else if (max === g) h = ((b - r) / d + 2) * 60
    else h = ((r - g) / d + 4) * 60
  }
  const s = max === 0 ? 0 : d / max
  return { h, s, v: max }
}

function hsvToHex({ h, s, v }: HsvColor) {
  const c = v * s
  const hh = ((h % 360) + 360) % 360 / 60
  const x = c * (1 - Math.abs((hh % 2) - 1))
  let r = 0
  let g = 0
  let b = 0
  if (hh >= 0 && hh < 1) [r, g, b] = [c, x, 0]
  else if (hh < 2) [r, g, b] = [x, c, 0]
  else if (hh < 3) [r, g, b] = [0, c, x]
  else if (hh < 4) [r, g, b] = [0, x, c]
  else if (hh < 5) [r, g, b] = [x, 0, c]
  else [r, g, b] = [c, 0, x]
  const m = v - c
  const toHex = (n: number) => Math.round((n + m) * 255).toString(16).padStart(2, "0")
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase()
}

export function CustomizeCollectionDialog({
  open,
  onOpenChange,
  collectionName,
  itemCount = 0,
  initialAppearance = DEFAULT_FOLDER_APPEARANCE,
  onSave,
}: CustomizeCollectionDialogProps) {
  const [loading, setLoading] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [drawMode, setDrawMode] = useState(false)
  const [customColorPopoverOpen, setCustomColorPopoverOpen] = useState(false)
  const [draft, setDraft] = useState<FolderAppearance>(initialAppearance)
  const [customBaseColor, setCustomBaseColor] = useState("#DBDBDB")
  const [customHsv, setCustomHsv] = useState<HsvColor>(() => hexToHsv("#DBDBDB"))
  const customColorTriggerRef = useRef<HTMLButtonElement | null>(null)
  const svFieldRef = useRef<HTMLDivElement | null>(null)
  /** When S≈0, RGB→HSV hue is meaningless; keep the last chromatic hue so the hue slider + SV plane don’t jump. */
  const hueWhileDesaturatedRef = useRef<number | null>(null)
  const [eyeDropperSupported, setEyeDropperSupported] = useState(false)
  const customSwatchBlurFilterId = `custom-swatch-blur-${useId().replace(/:/g, "")}`

  useEffect(() => {
    setEyeDropperSupported(typeof window !== "undefined" && "EyeDropper" in window)
  }, [])

  function seedHueLockFromHsv(hsv: HsvColor, theme: FolderTheme) {
    if (hsv.s >= ACHROMATIC_S) {
      hueWhileDesaturatedRef.current = hsv.h
    } else if (theme !== "custom") {
      hueWhileDesaturatedRef.current = THEME_HUE_HINT[theme]
    } else {
      hueWhileDesaturatedRef.current = 210
    }
  }

  useEffect(() => {
    if (!open) return
    setSaveError(null)
    setDraft(initialAppearance)
    setDrawMode(false)
    const gradient = getThemeGradient(initialAppearance.theme, initialAppearance.customColor)
    const hsv = hexToHsv(gradient.frontTop)
    setCustomBaseColor(gradient.frontTop)
    setCustomHsv(hsv)
    seedHueLockFromHsv(hsv, initialAppearance.theme)
  }, [open, initialAppearance])

  const hasChanges = useMemo(() => {
    return JSON.stringify(draft) !== JSON.stringify(initialAppearance)
  }, [draft, initialAppearance])

  const pickerHue = useMemo(() => {
    if (customHsv.s >= ACHROMATIC_S) return customHsv.h
    return (
      hueWhileDesaturatedRef.current ??
      (draft.theme !== "custom" ? THEME_HUE_HINT[draft.theme] : 210)
    )
  }, [customHsv.h, customHsv.s, draft.theme])

  const svFieldBaseHex = useMemo(() => hsvToHex({ h: pickerHue, s: 1, v: 1 }), [pickerHue])


  const customControlActive = customColorPopoverOpen || draft.theme === "custom"

  const folderType = itemCount > 0 ? ("Filled" as const) : ("Empty" as const)

  function setPresetTheme(theme: Exclude<FolderTheme, "custom">) {
    setDraft((prev) => ({
      ...prev,
      theme,
      customColor: prev.customColor,
    }))
  }

  function setCustomColor(nextHex: string) {
    const nextHsv = hexToHsv(nextHex)
    if (nextHsv.s >= ACHROMATIC_S) {
      hueWhileDesaturatedRef.current = nextHsv.h
    }
    setCustomBaseColor(nextHex)
    setCustomHsv(nextHsv)
    setDraft((prev) => ({
      ...prev,
      theme: "custom",
      customColor: nextHex,
    }))
  }

  function applyCustomHsv(nextHsv: HsvColor) {
    const nextHex = hsvToHex(nextHsv)
    if (nextHsv.s >= ACHROMATIC_S) {
      hueWhileDesaturatedRef.current = nextHsv.h
    }
    setCustomHsv(nextHsv)
    setCustomBaseColor(nextHex)
    setDraft((prev) => ({
      ...prev,
      theme: "custom",
      customColor: nextHex,
    }))
  }

  function applyHueSlider(nextH: number) {
    const nextS =
      customHsv.s < ACHROMATIC_S ? Math.max(customHsv.s, 0.2) : customHsv.s
    applyCustomHsv({ ...customHsv, h: nextH, s: nextS })
  }

  async function pickColorFromScreen() {
    if (typeof window === "undefined" || !("EyeDropper" in window)) return
    const EyeDropperCtor = (
      window as Window & {
        EyeDropper: new () => { open: () => Promise<{ sRGBHex: string }> }
      }
    ).EyeDropper
    try {
      const eyeDropper = new EyeDropperCtor()
      const result = await eyeDropper.open()
      if (result?.sRGBHex) {
        setCustomColor(result.sRGBHex.toUpperCase())
      }
    } catch {
      // User cancelled the picker or the environment blocked it.
    }
  }

  function updateFromSvPointer(clientX: number, clientY: number) {
    const el = svFieldRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const s = clamp01((clientX - rect.left) / rect.width)
    const v = clamp01(1 - (clientY - rect.top) / rect.height)
    const h =
      customHsv.s >= ACHROMATIC_S
        ? customHsv.h
        : (hueWhileDesaturatedRef.current ?? customHsv.h)
    applyCustomHsv({ h, s, v })
  }

  async function handleSave() {
    if (!hasChanges || loading) return
    setSaveError(null)
    try {
      setLoading(true)
      await onSave(draft)
      onOpenChange(false)
    } catch (err) {
      const msg =
        err instanceof Error && err.message.trim().length > 0
          ? err.message
          : "Could not save changes. Try again."
      setSaveError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay />
        <DialogPrimitive.Content
          className={cn(
            "add-item-panel fixed z-50 flex h-[calc(100vh-48px)] w-[575px] max-w-[calc(100vw-48px)] flex-col justify-between gap-4 overflow-hidden rounded-[24px] bg-card shadow-lg",
            "top-[24px] right-[24px] bottom-[24px]",
            "max-[767px]:left-0 max-[767px]:right-0 max-[767px]:top-auto max-[767px]:bottom-0",
            "max-[767px]:h-[90vh] max-[767px]:w-screen max-[767px]:max-w-none",
            "max-[767px]:rounded-t-[24px] max-[767px]:rounded-b-none",
            "p-[24px]",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=open]:slide-in-from-right-full data-[state=closed]:slide-out-to-right-full",
          )}
        >
          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
            <div className="flex min-h-0 flex-1 flex-col items-center gap-4 overflow-y-auto">
              <div className="flex w-full shrink-0 flex-col gap-8">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <DialogPrimitive.Title className="text-[24px] font-medium leading-[28px] text-[var(--gray-90)]">
                      Customize your collection
                    </DialogPrimitive.Title>
                    <DialogPrimitive.Description className="sr-only">
                      {collectionName}
                    </DialogPrimitive.Description>
                  </div>
                  <DialogPrimitive.Close
                    className="shrink-0 rounded-sm text-foreground transition-opacity hover:opacity-80 focus:outline-none focus:ring-0 disabled:pointer-events-none"
                    aria-label="Close"
                  >
                    <X className="size-6" />
                  </DialogPrimitive.Close>
                </div>

                <div
                  className={cn(
                    "flex w-full shrink-0 flex-col items-center rounded-[24px] bg-[var(--gray-20)] px-4",
                    draft.drawing.length > 0 ? "gap-5 pb-4 pt-[84px]" : "py-[84px]",
                  )}
                >
                  <ScaledFolderFrame
                    wrapperClassName="w-full max-w-[393px]"
                    type={folderType}
                    state="Default"
                    appearance={draft}
                    disableHoverAnimation
                    drawMode={drawMode}
                    onDrawingChange={(drawing) => setDraft((prev) => ({ ...prev, drawing }))}
                  />
                  {draft.drawing.length > 0 ? (
                    <div className="flex w-full justify-end">
                      <Button
                        type="button"
                        variant="secondary"
                        size="icon"
                        className={cn(
                          "cta-secondary cta-icon size-12 shrink-0 rounded-full border-2 border-[var(--gray-50)]",
                        )}
                        aria-label="Undo last mark"
                        onClick={() =>
                          setDraft((prev) => ({
                            ...prev,
                            drawing: prev.drawing.slice(0, -1),
                          }))
                        }
                      >
                        <Eraser className="size-6" />
                      </Button>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="flex w-fit max-w-full shrink-0 flex-wrap items-start gap-2 self-center rounded-[32px] bg-[var(--gray-20)] p-2">
                {PRESETS.map((preset) => {
                  const gradient = getThemeGradient(preset.key)
                  const selected = draft.theme === preset.key && !customColorPopoverOpen
                  return (
                    <button
                      key={preset.key}
                      type="button"
                      onClick={() => setPresetTheme(preset.key)}
                      aria-label={`Folder color ${preset.key}`}
                      className={cn(
                        "relative size-12 shrink-0 rounded-full transition after:pointer-events-none after:absolute after:inset-0 after:rounded-full after:border-4 after:border-[var(--gray-10)] after:content-['']",
                        selected &&
                          "outline outline-2 outline-[var(--gray-90)] outline-offset-0",
                      )}
                      style={{
                        background: `linear-gradient(180deg, ${gradient.frontTop} 0%, ${gradient.frontBottom} 100%)`,
                      }}
                    />
                  )
                })}

                <DropdownMenu
                  open={customColorPopoverOpen}
                  onOpenChange={(nextOpen) => {
                    setCustomColorPopoverOpen(nextOpen)
                    if (nextOpen) {
                      const effectiveBaseColor = getThemeGradient(
                        draft.theme,
                        draft.customColor,
                      ).frontTop
                      const hsv = hexToHsv(effectiveBaseColor)
                      setCustomBaseColor(effectiveBaseColor)
                      setCustomHsv(hsv)
                      seedHueLockFromHsv(hsv, draft.theme)
                    } else {
                      // Radix returns focus to the trigger on Escape; blur to avoid a temporary focus ring.
                      customColorTriggerRef.current?.blur()
                    }
                  }}
                >
                  <DropdownMenuTrigger asChild>
                    <button
                      ref={customColorTriggerRef}
                      type="button"
                      aria-label="Custom folder color"
                      className={cn(
                        "relative size-12 shrink-0 rounded-[24px] bg-[var(--gray-10)] transition focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring after:pointer-events-none after:absolute after:inset-0 after:rounded-[24px] after:border-4 after:border-[var(--gray-10)] after:content-['']",
                        customControlActive &&
                          "outline outline-2 outline-[var(--gray-90)] outline-offset-0",
                      )}
                    >
                      <svg
                        width={0}
                        height={0}
                        className="pointer-events-none absolute"
                        aria-hidden
                      >
                        <defs>
                          <filter
                            id={customSwatchBlurFilterId}
                            x="-100%"
                            y="-100%"
                            width="300%"
                            height="300%"
                            colorInterpolationFilters="sRGB"
                          >
                            <feGaussianBlur in="SourceGraphic" stdDeviation="4" />
                          </filter>
                        </defs>
                      </svg>
                      <span
                        className="absolute left-1 top-1 isolate size-10"
                        style={{
                          clipPath: "circle(50% at 50% 50%)",
                          WebkitClipPath: "circle(50% at 50% 50%)",
                        }}
                      >
                        <span
                          className="absolute inset-0 z-0 rounded-full"
                          style={{ background: CUSTOM_SWATCH_IDLE }}
                          aria-hidden
                        />
                        <span
                          className="pointer-events-none absolute left-1/2 top-1/2 z-[1] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#ffffff]"
                          style={{
                            width: 24,
                            height: 24,
                            filter: `url(#${customSwatchBlurFilterId})`,
                          }}
                          aria-hidden
                        />
                      </span>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="center"
                    side="top"
                    sideOffset={12}
                    onCloseAutoFocus={(event) => {
                      event.preventDefault()
                      customColorTriggerRef.current?.blur()
                    }}
                    className="h-fit w-[220px] leading-none rounded-[24px] p-3 shadow-[0px_16px_16px_0px_rgba(0,0,0,0.05),0px_8px_8px_0px_rgba(0,0,0,0.05),0px_4px_4px_0px_rgba(0,0,0,0.05),0px_2px_2px_0px_rgba(0,0,0,0.05),0px_1px_1px_0px_rgba(0,0,0,0.05),0px_0px_0px_1px_rgba(0,0,0,0.05)]"
                  >
                    <div className="flex w-full shrink-0 flex-col gap-3">
                      <div
                        ref={svFieldRef}
                        role="slider"
                        aria-label="Saturation and value"
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={Math.round(customHsv.s * 100)}
                        className="relative isolate h-[126px] w-full cursor-crosshair overflow-hidden rounded-[14px]"
                        onPointerDown={(event) => {
                          event.currentTarget.setPointerCapture(event.pointerId)
                          updateFromSvPointer(event.clientX, event.clientY)
                        }}
                        onPointerMove={(event) => {
                          if ((event.buttons & 1) === 0) return
                          updateFromSvPointer(event.clientX, event.clientY)
                        }}
                      >
                        {/* HSV plane: pure hue, then S (white L→R), then V (black B→T). Stacked divs avoid backgroundImage parsing/compositing issues. */}
                        <div
                          className="pointer-events-none absolute inset-0 z-0"
                          style={{ backgroundColor: svFieldBaseHex }}
                          aria-hidden
                        />
                        <div
                          className="pointer-events-none absolute inset-0 z-[1]"
                          style={{
                            background:
                              "linear-gradient(to right, rgb(255, 255, 255), rgba(255, 255, 255, 0))",
                          }}
                          aria-hidden
                        />
                        <div
                          className="pointer-events-none absolute inset-0 z-[2]"
                          style={{
                            background:
                              "linear-gradient(to top, rgb(0, 0, 0), rgba(0, 0, 0, 0))",
                          }}
                          aria-hidden
                        />
                        <span
                          className="pointer-events-none absolute z-[3] box-border size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-solid border-[#ffffff] shadow-[0_2px_6px_rgba(0,0,0,0.35)]"
                          style={{
                            left: `${customHsv.s * 100}%`,
                            top: `${(1 - customHsv.v) * 100}%`,
                          }}
                        />
                      </div>

                      <div className="grid shrink-0 grid-cols-[24px_1fr] items-center gap-2">
                        <button
                          type="button"
                          className={cn(
                            "flex size-6 shrink-0 items-center justify-center rounded-md text-[var(--gray-90)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                            !eyeDropperSupported && "cursor-not-allowed opacity-40",
                          )}
                          aria-label="Pick color from screen"
                          title={
                            eyeDropperSupported
                              ? "Pick color from screen"
                              : "Screen color picker is not available in this browser"
                          }
                          disabled={!eyeDropperSupported}
                          onClick={() => void pickColorFromScreen()}
                        >
                          <Pipette className="size-6" aria-hidden />
                        </button>
                        <div className="relative h-4">
                          <div className="absolute inset-0 rounded-full bg-[linear-gradient(90deg,#FF0000_0%,#FFFF00_16.6%,#00FF00_33.3%,#00FFFF_50%,#0000FF_66.6%,#FF00FF_83.3%,#FF0000_100%)]" />
                          <input
                            type="range"
                            min={0}
                            max={360}
                            step={1}
                            aria-label="Hue"
                            className="absolute inset-0 m-0 h-full w-full cursor-pointer appearance-none bg-transparent p-0 [&::-webkit-slider-runnable-track]:h-4 [&::-webkit-slider-runnable-track]:bg-transparent [&::-webkit-slider-thumb]:mt-0 [&::-webkit-slider-thumb]:box-border [&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-[3px] [&::-webkit-slider-thumb]:border-solid [&::-webkit-slider-thumb]:border-[#ffffff] [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-[0_2px_6px_rgba(0,0,0,0.35)] [&::-moz-range-track]:h-4 [&::-moz-range-track]:bg-transparent [&::-moz-range-thumb]:box-border [&::-moz-range-thumb]:size-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-[3px] [&::-moz-range-thumb]:border-solid [&::-moz-range-thumb]:border-[#ffffff] [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:shadow-[0_2px_6px_rgba(0,0,0,0.35)]"
                            value={Math.round(pickerHue)}
                            onChange={(event) => {
                              applyHueSlider(Number(event.target.value))
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>

                <div className="flex items-center gap-4 pl-2">
                  <div className="h-8 w-0.5 shrink-0 rounded-full bg-[#B3B3B3]" aria-hidden />
                  <button
                    type="button"
                    aria-label={drawMode ? "Drawing on" : "Drawing off"}
                    aria-pressed={drawMode}
                    className={cn(
                      "relative size-12 shrink-0 rounded-[24px] bg-[var(--gray-10)] transition focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring after:pointer-events-none after:absolute after:inset-0 after:rounded-[24px] after:border-4 after:border-[var(--gray-10)] after:content-['']",
                      drawMode && "outline outline-2 outline-[var(--gray-90)] outline-offset-0",
                    )}
                    onClick={() => setDrawMode((prev) => !prev)}
                  >
                    <span
                      className="absolute left-1 top-1 size-10 rounded-full bg-[var(--surface-tertiary)]"
                      aria-hidden
                    />
                    <img
                      src="/figma-assets/Brush.svg"
                      alt=""
                      aria-hidden
                      className="absolute left-1/2 top-1/2 z-10 size-6 -translate-x-1/2 -translate-y-1/2"
                    />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="shrink-0">
            <Button
              variant="default"
              className={cn(
                "cta-primary w-full rounded-[48px] px-5 py-2.5",
                !hasChanges && !loading && "!opacity-50",
              )}
              disabled={loading || !hasChanges}
              onClick={handleSave}
            >
              {loading ? "Saving..." : "Save changes"}
            </Button>
            {saveError ? (
              <p className="mt-2 text-center text-sm text-destructive" role="alert">
                {saveError}
              </p>
            ) : null}
          </div>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  )
}
