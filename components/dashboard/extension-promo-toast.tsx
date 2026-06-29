"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  DASHBOARD_FLOATING_CONTROLS_BOTTOM_PX,
  DASHBOARD_FLOATING_CONTROLS_BOTTOM_TRANSITION,
} from "@/lib/dashboard/floating-controls"
import {
  EXTENSION_DATASET_ATTR,
  EXTENSION_INSTALLED_EVENT,
  EXTENSION_PROMO_DISMISSED_KEY,
  isExtensionPresentOnPage,
  isExtensionPromoDismissed,
} from "@/lib/extension/promo-toast"
import { getChromeExtensionStoreUrl } from "@/lib/extension/store-url"

const REVEAL_DELAY_MS = 650
const POOF_MS = 320
const DISMISS_SHOW_DELAY_MS = 120
const TOAST_MAX_WIDTH_PX = 363
const PAGE_MARGIN_PX = 16
const GAP_TO_FLOATING_CONTROLS_PX = 72
const FLOATING_CONTROLS_SELECTOR = "[data-dashboard-floating-controls]"

interface ExtensionPromoToastProps {
  bottom?: number
}

function isPromoSuppressed(): boolean {
  return isExtensionPromoDismissed() || isExtensionPresentOnPage()
}

function useToastMaxWidth(active: boolean) {
  const [maxWidth, setMaxWidth] = useState(TOAST_MAX_WIDTH_PX)

  useEffect(() => {
    if (!active) return

    const update = () => {
      const viewportWidth = window.innerWidth
      const controls = document.querySelector(FLOATING_CONTROLS_SELECTOR)

      if (!controls) {
        setMaxWidth(TOAST_MAX_WIDTH_PX)
        return
      }

      const controlsRight = controls.getBoundingClientRect().right
      const available =
        viewportWidth - PAGE_MARGIN_PX - (controlsRight + GAP_TO_FLOATING_CONTROLS_PX)
      setMaxWidth(Math.min(TOAST_MAX_WIDTH_PX, Math.max(0, available)))
    }

    update()
    window.addEventListener("resize", update)

    const controls = document.querySelector(FLOATING_CONTROLS_SELECTOR)
    const observer = controls ? new ResizeObserver(update) : null
    if (controls && observer) observer.observe(controls)

    return () => {
      window.removeEventListener("resize", update)
      observer?.disconnect()
    }
  }, [active])

  return maxWidth
}

export function ExtensionPromoToast({
  bottom = DASHBOARD_FLOATING_CONTROLS_BOTTOM_PX,
}: ExtensionPromoToastProps) {
  const storeUrl = getChromeExtensionStoreUrl()
  const [suppressed, setSuppressed] = useState<boolean | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [poofing, setPoofing] = useState(false)
  const [dismissVisible, setDismissVisible] = useState(false)
  const dismissShowTimerRef = useRef<number | null>(null)
  const maxWidth = useToastMaxWidth(suppressed === false)

  const suppressPromo = useCallback(
    (options?: { animate?: boolean }) => {
      if (suppressed === true || poofing) return

      const shouldPoof = options?.animate && revealed
      if (shouldPoof) {
        setPoofing(true)
        window.setTimeout(() => setSuppressed(true), POOF_MS)
        return
      }

      setSuppressed(true)
    },
    [poofing, revealed, suppressed],
  )

  useEffect(() => {
    setSuppressed(isPromoSuppressed())
  }, [])

  useEffect(() => {
    if (suppressed === true) return

    const checkExtension = () => {
      if (isExtensionPresentOnPage()) {
        suppressPromo({ animate: revealed })
      }
    }

    checkExtension()

    const onExtensionInstalled = () => {
      suppressPromo({ animate: true })
    }

    // Content scripts run in an isolated world — CustomEvents may not reach the page,
    // but DOM attribute writes are shared. Observe the marker and re-check on tab focus.
    const mutationObserver = new MutationObserver(checkExtension)
    mutationObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: [EXTENSION_DATASET_ATTR],
    })

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkExtension()
      }
    }

    document.addEventListener(EXTENSION_INSTALLED_EVENT, onExtensionInstalled)
    document.addEventListener("visibilitychange", onVisibilityChange)
    window.addEventListener("focus", checkExtension)

    return () => {
      document.removeEventListener(EXTENSION_INSTALLED_EVENT, onExtensionInstalled)
      document.removeEventListener("visibilitychange", onVisibilityChange)
      window.removeEventListener("focus", checkExtension)
      mutationObserver.disconnect()
    }
  }, [revealed, suppressPromo, suppressed])

  useEffect(() => {
    if (suppressed !== false) return

    const timer = window.setTimeout(() => {
      if (isExtensionPresentOnPage()) {
        setSuppressed(true)
        return
      }
      setRevealed(true)
    }, REVEAL_DELAY_MS)

    return () => window.clearTimeout(timer)
  }, [suppressed])

  useEffect(() => {
    return () => {
      if (dismissShowTimerRef.current) {
        window.clearTimeout(dismissShowTimerRef.current)
      }
    }
  }, [])

  const handleHostEnter = useCallback(() => {
    if (dismissShowTimerRef.current) {
      window.clearTimeout(dismissShowTimerRef.current)
    }
    dismissShowTimerRef.current = window.setTimeout(() => {
      setDismissVisible(true)
      dismissShowTimerRef.current = null
    }, DISMISS_SHOW_DELAY_MS)
  }, [])

  const handleHostLeave = useCallback(() => {
    if (dismissShowTimerRef.current) {
      window.clearTimeout(dismissShowTimerRef.current)
      dismissShowTimerRef.current = null
    }
    setDismissVisible(false)
  }, [])

  const handleDismiss = useCallback(() => {
    if (poofing) return
    setPoofing(true)
    window.setTimeout(() => {
      try {
        localStorage.setItem(EXTENSION_PROMO_DISMISSED_KEY, "1")
      } catch {
        // Ignore storage failures; still hide for this session.
      }
      setSuppressed(true)
    }, POOF_MS)
  }, [poofing])

  if (suppressed !== false || maxWidth <= 0) return null

  return (
    <div
      className="pointer-events-none fixed right-4 z-[25] hidden md:block"
      style={{
        bottom,
        transition: DASHBOARD_FLOATING_CONTROLS_BOTTOM_TRANSITION,
      }}
    >
      <div
        className={cn(
          "extension-promo-toast pointer-events-auto relative pt-[48px]",
          !poofing && revealed && "extension-promo-toast-revealed",
          poofing && "extension-promo-toast-poofing pointer-events-none",
        )}
        style={{ maxWidth, width: maxWidth }}
        onMouseEnter={handleHostEnter}
        onMouseLeave={handleHostLeave}
        onFocusCapture={handleHostEnter}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
            handleHostLeave()
          }
        }}
      >
        <button
          type="button"
          onClick={handleDismiss}
          disabled={poofing}
          tabIndex={dismissVisible ? 0 : -1}
          className={cn(
            "extension-promo-toast-dismiss absolute right-0 top-0 flex size-10 items-center justify-center rounded-full bg-card disabled:pointer-events-none",
            dismissVisible && !poofing && "extension-promo-toast-dismiss-visible",
          )}
          aria-label="Dismiss extension promotion"
          aria-hidden={!dismissVisible}
        >
          <X className="size-6 shrink-0 text-foreground" aria-hidden />
        </button>

        <div className="flex items-center gap-6 rounded-[48px] bg-card py-3 pl-8 pr-3">
          <p className="min-w-0 flex-1 text-base leading-6 text-foreground">
            Install the browser extension and save from anywhere
          </p>
          <Button asChild size="default" className="shrink-0 px-5 py-3">
            <a href={storeUrl} target="_blank" rel="noopener noreferrer">
              Install
            </a>
          </Button>
        </div>
      </div>
    </div>
  )
}
