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
import { SmokyDissolveShell } from "@/components/ui/smoky-dissolve-shell"
import { SMOKY_DISSOLVE_MAX_MS } from "@/lib/animation/smoky-dissolve"

const REVEAL_DELAY_MS = 650
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
  const [dissolving, setDissolving] = useState(false)
  const [dismissVisible, setDismissVisible] = useState(false)
  const dismissShowTimerRef = useRef<number | null>(null)
  const maxWidth = useToastMaxWidth(suppressed === false)

  const finishDismiss = useCallback(() => {
    try {
      localStorage.setItem(EXTENSION_PROMO_DISMISSED_KEY, "1")
    } catch {
      // Ignore storage failures; still hide for this session.
    }
    setSuppressed(true)
  }, [])

  const suppressPromo = useCallback(
    (options?: { animate?: boolean }) => {
      if (suppressed === true || dissolving) return

      const shouldDissolve = options?.animate && revealed
      if (shouldDissolve) {
        setDissolving(true)
        window.setTimeout(finishDismiss, SMOKY_DISSOLVE_MAX_MS)
        return
      }

      setSuppressed(true)
    },
    [dissolving, finishDismiss, revealed, suppressed],
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
    if (dissolving) return
    setDissolving(true)
    window.setTimeout(finishDismiss, SMOKY_DISSOLVE_MAX_MS)
  }, [dissolving, finishDismiss])

  if (suppressed !== false || maxWidth <= 0) return null

  return (
    <div
      className={cn(
        "pointer-events-none fixed right-4 z-[25] hidden overflow-visible md:block",
        dissolving && "z-[30]",
      )}
      style={{
        bottom,
        transition: DASHBOARD_FLOATING_CONTROLS_BOTTOM_TRANSITION,
      }}
    >
      <div
        className={cn(
          "extension-promo-toast pointer-events-auto relative overflow-visible",
          !dissolving && revealed && "extension-promo-toast-revealed",
          dissolving && "extension-promo-toast-dissolving",
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
        <SmokyDissolveShell
          dissolving={dissolving}
          variant="toast"
          className="relative overflow-visible"
          onComplete={finishDismiss}
        >
          <div className="relative pt-[48px]">
          <button
            type="button"
            onClick={handleDismiss}
            disabled={dissolving}
            tabIndex={dismissVisible ? 0 : -1}
            className={cn(
              "extension-promo-toast-dismiss absolute right-0 top-0 flex size-10 items-center justify-center rounded-full bg-card disabled:pointer-events-none",
              dismissVisible && !dissolving && "extension-promo-toast-dismiss-visible",
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
        </SmokyDissolveShell>
      </div>
    </div>
  )
}
