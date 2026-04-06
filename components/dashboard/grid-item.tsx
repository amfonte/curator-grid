"use client"

import { useState, useRef, useEffect } from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import type { Item } from "@/lib/types"
import { cn, getViewportDimensions } from "@/lib/utils"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Dialog, DialogOverlay, DialogPortal } from "@/components/ui/dialog"
import { Pencil, Trash2, Globe, Maximize2, ExternalLink, X } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

interface GridItemProps {
  columns: number
  item: Item & { item_boards: { board_id: string }[] }
  disableLiveEmbeds?: boolean
  selected: boolean
  onToggleSelect: () => void
  onEdit: () => void
  onDelete: () => void
}

// Many sites are slow/cold-start; keep this long enough to reduce "false blocked" fallbacks.
const IFRAME_LOAD_TIMEOUT_MS = 6000
const IFRAME_RETRY_DELAY_MS = 500

type UrlEmbedState = {
  policyBlocked: boolean
  hasSuccessfulLoad: boolean
}

type IframeDebugStatus =
  | "idle"
  | "loading"
  | "retrying"
  | "loaded"
  | "policy-blocked"
  | "timed-out"
  | "errored"

// Session-scoped cache so navigating away/back does not re-learn the same URL behavior.
const urlEmbedStateCache = new Map<string, UrlEmbedState>()
const iframePolicyResultCache = new Map<string, boolean>()
const iframePolicyPromiseCache = new Map<string, Promise<boolean>>()

export function GridItem({
  columns,
  item,
  disableLiveEmbeds = false,
  selected,
  onToggleSelect,
  onEdit,
  onDelete,
}: GridItemProps) {
  const supabase = createClient()
  const [iframeLoaded, setIframeLoaded] = useState(false)
  const [iframeLikelyBlocked, setIframeLikelyBlocked] = useState(false)
  const [faviconError, setFaviconError] = useState(false)
  // For image items without stored dimensions (legacy): measure on load so we never upscale (PRD).
  const [measuredImageSize, setMeasuredImageSize] = useState<{ width: number; height: number } | null>(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [containerSize, setContainerSize] = useState<{ width: number; height: number } | null>(null)
  const iframeLoadTimeoutRef = useRef<number | null>(null)
  const iframePolicyCheckedRef = useRef(false)
  const iframePolicyBlockedRef = useRef(false)
  const iframePolicyRequestRef = useRef<Promise<boolean> | null>(null)
  const [iframeInstanceKey, setIframeInstanceKey] = useState(0)
  const hasRetriedRef = useRef(false)
  const [iframeDebugStatus, setIframeDebugStatus] = useState<IframeDebugStatus>("idle")
  const isDev = process.env.NODE_ENV === "development"

  const isLargeDensity = columns <= 2

  // Actions column width when expanded (hover or selected).
  // Uses max-width so it takes *no* space when idle, then smoothly expands to just fit contents.
  const baseActionsWidthClass =
    "max-w-0 overflow-hidden opacity-0 transition-[max-width,opacity] duration-400 ease-[cubic-bezier(0.215,0.61,0.355,1)] group-hover:opacity-100"
  // Default (URL items): open-link + edit + delete + checkbox.
  // Large density (sizes 1-2) uses bigger buttons, so reserve more room.
  const actionsWidthClass = cn(
    baseActionsWidthClass,
    isLargeDensity ? "group-hover:max-w-[10rem]" : "group-hover:max-w-[8.75rem]",
  )
  const actionsWidthWhenSelected = selected
    ? isLargeDensity
      ? "max-w-[10rem] opacity-100"
      : "max-w-[8.75rem] opacity-100"
    : ""
  // Images: 3 icon buttons + checkbox, need more width so all actions are visible at smaller tile sizes.
  const imageActionsWidthClass = cn(baseActionsWidthClass, "group-hover:max-w-[11.5rem]")
  const imageActionsWidthWhenSelected = selected ? "max-w-[11.5rem] opacity-100" : ""
  const actionIconButtonClass = isLargeDensity
    ? "h-9 w-9 shrink-0 text-foreground hover:bg-accent hover:text-accent-foreground [&_svg]:size-6"
    : "h-7 w-7 shrink-0 text-foreground hover:bg-accent hover:text-accent-foreground [&_svg]:size-4"
  const hasScreenshot = !!(item.screenshot_url || item.file_url)
  const showIframe =
    !disableLiveEmbeds &&
    !hasScreenshot &&
    !item.iframe_blocked &&
    !iframePolicyBlockedRef.current &&
    !iframeLikelyBlocked

  useEffect(() => {
    const cacheKey = item.original_url || ""
    const cached = cacheKey ? urlEmbedStateCache.get(cacheKey) : undefined
    setIframeLoaded(false)
    setIframeLikelyBlocked(Boolean(item.iframe_blocked || cached?.policyBlocked))
    iframePolicyCheckedRef.current = false
    iframePolicyBlockedRef.current = Boolean(item.iframe_blocked || cached?.policyBlocked)
    iframePolicyRequestRef.current = null
    hasRetriedRef.current = false
    setIframeInstanceKey(0)
    setIframeDebugStatus(item.iframe_blocked || cached?.policyBlocked ? "policy-blocked" : "idle")
    if (iframeLoadTimeoutRef.current != null) {
      window.clearTimeout(iframeLoadTimeoutRef.current)
      iframeLoadTimeoutRef.current = null
    }
  }, [item.id, item.original_url, item.iframe_blocked])

  useEffect(() => {
    if (!showIframe || iframeLoaded) return
    setIframeDebugStatus((curr) => (curr === "retrying" ? curr : "loading"))
    if (iframeLoadTimeoutRef.current != null) {
      window.clearTimeout(iframeLoadTimeoutRef.current)
    }
    iframeLoadTimeoutRef.current = window.setTimeout(() => {
      // Allowed sites can still fail at runtime (network/timeouts/SSL/etc).
      // Keep metadata placeholder when iframe doesn't become visible in time.
      markIframeFailedWithRetry("timed-out")
    }, IFRAME_LOAD_TIMEOUT_MS)
    return () => {
      if (iframeLoadTimeoutRef.current != null) {
        window.clearTimeout(iframeLoadTimeoutRef.current)
        iframeLoadTimeoutRef.current = null
      }
    }
  }, [showIframe, iframeLoaded])

  useEffect(() => {
    return () => {
      if (iframeLoadTimeoutRef.current != null) {
        window.clearTimeout(iframeLoadTimeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (!showIframe || !containerRef.current) return
    const el = containerRef.current
    if (typeof ResizeObserver === "undefined") {
      const rect = el.getBoundingClientRect()
      setContainerSize(rect.width > 0 && rect.height > 0 ? { width: rect.width, height: rect.height } : null)
      return
    }
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0]?.contentRect ?? { width: 0, height: 0 }
      setContainerSize(width > 0 && height > 0 ? { width, height } : null)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [showIframe])

  if (item.type === "image") {
    // PRD: fill column width but never upscale past native resolution (downscale only)
    const nativeWidth = item.width ?? null
    const nativeHeight = item.height ?? null
    const hasNativeSize = nativeWidth != null && nativeHeight != null
    const capWidth = hasNativeSize ? nativeWidth : measuredImageSize?.width
    const capHeight = hasNativeSize ? nativeHeight : measuredImageSize?.height
    const imageStyle =
      capWidth != null && capHeight != null
        ? { maxWidth: `${capWidth}px`, maxHeight: `${capHeight}px` }
        : undefined

    return (
      <div
        className={cn("group mb-8 w-full", capWidth != null && "mx-auto")}
        style={capWidth != null ? { maxWidth: `${capWidth}px` } : undefined}
      >
        {/* Header for lg+: title truncates; actions reveal on hover/selected. */}
        <div className="hidden min-w-0 items-center justify-between gap-2 overflow-hidden pb-1 lg:flex">
          <span
            className={cn(
              "relative z-0 min-w-0 flex-1 truncate font-medium text-foreground pr-6",
              isLargeDensity ? "text-base leading-6" : "text-sm",
              "after:pointer-events-none after:absolute after:top-0 after:right-0 after:h-full after:w-6 after:bg-gradient-to-l after:from-background after:to-background/0 after:opacity-0 group-hover:after:opacity-100",
            )}
          >
            {item.title || "Untitled"}
          </span>
          <div className={cn("flex min-w-0 items-center gap-1", imageActionsWidthClass, imageActionsWidthWhenSelected)}>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className={actionIconButtonClass}
                onClick={onEdit}
                aria-label="Edit item"
              >
                <Pencil className="h-4 w-4" strokeWidth={2} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={actionIconButtonClass}
                onClick={onDelete}
                aria-label="Delete item"
              >
                <Trash2 className="h-4 w-4" strokeWidth={2} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={actionIconButtonClass}
                onClick={() => setIsPreviewOpen(true)}
                aria-label="Expand image"
              >
                <Maximize2 className="h-4 w-4" strokeWidth={2} />
              </Button>
            </div>
            <Checkbox
              checked={selected}
              onCheckedChange={onToggleSelect}
              aria-label={`Select ${item.title || "image"}`}
              className={cn(
                "ml-1 transition-opacity",
                isLargeDensity && "h-6 w-6 border-[2px] [&_svg]:h-4 [&_svg]:w-4",
                selected ? "opacity-100" : "opacity-0 group-hover:opacity-100",
              )}
            />
          </div>
        </div>
        {/* Header for sm/md: one-line title, then always-visible actions spanning full width. */}
        <div className="flex min-w-0 flex-col gap-1 pb-1 lg:hidden">
          <span className={cn("min-w-0 truncate font-medium text-foreground", isLargeDensity ? "text-base leading-6" : "text-sm")}>
            {item.title || "Untitled"}
          </span>
          <div className="flex w-full items-center justify-between gap-1 py-1">
            <Button
              variant="ghost"
              size="icon"
              className={actionIconButtonClass}
              onClick={onEdit}
              aria-label="Edit item"
            >
              <Pencil className="h-4 w-4" strokeWidth={2} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={actionIconButtonClass}
              onClick={onDelete}
              aria-label="Delete item"
            >
              <Trash2 className="h-4 w-4" strokeWidth={2} />
            </Button>
            <Checkbox
              checked={selected}
              onCheckedChange={onToggleSelect}
              aria-label={`Select ${item.title || "image"}`}
              className={cn("transition-opacity", isLargeDensity && "h-6 w-6 border-[2px] [&_svg]:h-4 [&_svg]:w-4")}
            />
          </div>
        </div>

        <img
          src={item.file_url || ""}
          alt={item.title || "Uploaded image"}
          className="block w-full"
          style={imageStyle}
          loading="lazy"
          decoding="async"
          onLoad={
            !hasNativeSize
              ? (e) => {
                  const img = e.currentTarget
                  if (img.naturalWidth > 0 && img.naturalHeight > 0)
                    setMeasuredImageSize({ width: img.naturalWidth, height: img.naturalHeight })
                }
              : undefined
          }
        />

        <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
          <DialogPortal>
            <DialogOverlay />
            <DialogPrimitive.Content
              className={cn(
                "fixed z-50 flex h-[calc(100vh-48px)] max-w-[calc(100vw-48px)] flex-col gap-4 overflow-hidden rounded-[24px] bg-card shadow-lg",
                "top-[24px] right-[24px] bottom-[24px]",
                "max-[767px]:left-0 max-[767px]:right-0 max-[767px]:top-auto max-[767px]:bottom-0",
                "max-[767px]:h-[90vh] max-[767px]:w-screen max-[767px]:max-w-none",
                "max-[767px]:rounded-t-[24px] max-[767px]:rounded-b-none",
                "p-[24px]",
                "data-[state=open]:animate-in data-[state=closed]:animate-out",
                "data-[state=open]:slide-in-from-right-full data-[state=closed]:slide-out-to-right-full",
                "max-[767px]:data-[state=open]:slide-in-from-bottom-full max-[767px]:data-[state=closed]:slide-out-to-bottom-full",
              )}
            >
              <div className="flex flex-shrink-0 items-start justify-between">
                <DialogPrimitive.Title className="text-lg font-medium leading-7 text-foreground">
                  {item.title || "Image preview"}
                </DialogPrimitive.Title>
                <DialogPrimitive.Close
                  className="rounded-sm text-foreground transition-opacity hover:opacity-80 focus:outline-none focus:ring-0 disabled:pointer-events-none"
                  aria-label="Close"
                >
                  <X className="h-6 w-6" />
                </DialogPrimitive.Close>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
                {/*
                  In the preview panel, always fit the image to the panel width
                  to avoid horizontal scrolling, while still respecting the
                  no-upscale cap from the measured/native size.
                */}
                <img
                  src={item.file_url || ""}
                  alt={item.title || "Uploaded image"}
                  className="mx-auto h-auto max-h-full max-w-full"
                  style={imageStyle}
                  decoding="async"
                />
              </div>
            </DialogPrimitive.Content>
          </DialogPortal>
        </Dialog>
      </div>
    )
  }

  // URL type
  const faviconSrc = !faviconError ? item.favicon_url : null

  const checkIframePolicy = async (): Promise<boolean> => {
    const url = item.original_url
    if (!url) return false
    const cachedResult = iframePolicyResultCache.get(url)
    if (typeof cachedResult === "boolean") {
      iframePolicyCheckedRef.current = true
      iframePolicyBlockedRef.current = cachedResult
      return cachedResult
    }
    if (iframePolicyCheckedRef.current) return iframePolicyBlockedRef.current
    if (iframePolicyRequestRef.current) return iframePolicyRequestRef.current
    const sharedPromise = iframePolicyPromiseCache.get(url)
    if (sharedPromise) {
      iframePolicyRequestRef.current = sharedPromise
      return sharedPromise
    }

    iframePolicyRequestRef.current = (async () => {
      try {
        const res = await fetch("/api/metadata", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        })
        if (!res.ok) return false
        const metadata = (await res.json()) as { iframeBlocked?: boolean }
        const blocked = Boolean(metadata.iframeBlocked)
        iframePolicyResultCache.set(url, blocked)
        urlEmbedStateCache.set(url, {
          policyBlocked: blocked,
          hasSuccessfulLoad: !blocked,
        })
        iframePolicyCheckedRef.current = true
        iframePolicyBlockedRef.current = blocked
        if (blocked) {
          void supabase
            .from("items")
            .update({ iframe_blocked: true, updated_at: new Date().toISOString() })
            .eq("id", item.id)
        }
        return blocked
      } catch {
        return false
      } finally {
        iframePolicyPromiseCache.delete(url)
        iframePolicyRequestRef.current = null
      }
    })()
    iframePolicyPromiseCache.set(url, iframePolicyRequestRef.current)

    return iframePolicyRequestRef.current
  }

  const markIframeFailedWithRetry = (reason: "timed-out" | "errored") => {
    if (iframeLoadTimeoutRef.current != null) {
      window.clearTimeout(iframeLoadTimeoutRef.current)
      iframeLoadTimeoutRef.current = null
    }
    // Avoid permanent false negatives from transient DNS/TLS/network hiccups.
    if (!hasRetriedRef.current) {
      hasRetriedRef.current = true
      setIframeDebugStatus("retrying")
      window.setTimeout(() => setIframeInstanceKey((k) => k + 1), IFRAME_RETRY_DELAY_MS)
      return
    }
    setIframeLoaded(false)
    setIframeLikelyBlocked(true)
    setIframeDebugStatus(reason)
  }

  const handleIframeError = () => {
    markIframeFailedWithRetry("errored")
  }

  const handleIframeLoad = () => {
    const iframeEl = iframeRef.current
    if (!iframeEl) {
      setIframeLoaded(true)
      return
    }

    // Some blocked embeds still trigger onLoad with an about:blank/error document.
    // Detect same-origin blank docs and keep fallback placeholder in that case.
    try {
      const href = iframeEl.contentWindow?.location?.href ?? ""
      const body = iframeEl.contentDocument?.body
      const bodyHtml = body?.innerHTML?.trim() ?? ""
      const isSameOriginBlank = href === "about:blank" && bodyHtml.length === 0
      if (isSameOriginBlank) {
        markIframeFailedWithRetry("errored")
        return
      }
    } catch {
      // Cross-origin pages throw when inspected; that's expected for valid embeds.
    }
    void (async () => {
      const blocked = await checkIframePolicy()
      if (blocked) {
        if (iframeLoadTimeoutRef.current != null) {
          window.clearTimeout(iframeLoadTimeoutRef.current)
          iframeLoadTimeoutRef.current = null
        }
        setIframeLoaded(false)
        setIframeLikelyBlocked(true)
        setIframeDebugStatus("policy-blocked")
        if (item.original_url) {
          urlEmbedStateCache.set(item.original_url, {
            policyBlocked: true,
            hasSuccessfulLoad: false,
          })
        }
        return
      }

      if (iframeLoadTimeoutRef.current != null) {
        window.clearTimeout(iframeLoadTimeoutRef.current)
        iframeLoadTimeoutRef.current = null
      }
      setIframeLoaded(true)
      setIframeLikelyBlocked(false)
      setIframeDebugStatus("loaded")
      if (item.original_url) {
        urlEmbedStateCache.set(item.original_url, {
          policyBlocked: false,
          hasSuccessfulLoad: true,
        })
      }
    })()
  }

  const nativeSize = getViewportDimensions(item.viewport_size ?? "desktop")
  const openInNewTab = () => {
    if (!item.original_url) return
    window.open(item.original_url, "_blank", "noopener,noreferrer")
  }
  // PRD: never upscale past imported viewport size (1440, 768, or 375px); downscale only
  const scale =
    containerSize && containerSize.width > 0 && containerSize.height > 0
      ? Math.min(1, containerSize.width / nativeSize.width, containerSize.height / nativeSize.height)
      : 1
  // At the largest density (1 column), keep additional side breathing room so users can
  // scroll the page without wheel events getting trapped by the website preview area.
  // This still allows full native width (e.g. 1440px desktop imports) on very wide viewports.
  const wrapperMaxWidth =
    columns === 1
      ? `min(${nativeSize.width}px, calc(100vw - clamp(2rem, 12vw, 12rem)))`
      : `${nativeSize.width}px`
  const iframePlaceholder = (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-muted p-4 text-center">
      {faviconSrc ? (
        <img
          src={faviconSrc || "/placeholder.svg"}
          alt=""
          className="h-8 w-8 rounded"
          loading="lazy"
          onError={() => setFaviconError(true)}
        />
      ) : (
        <Globe className="h-8 w-8 text-muted-foreground" />
      )}
      <div className="flex flex-col items-center gap-1">
        <div className="max-w-full text-center text-base font-normal leading-6 text-foreground break-words">
          {item.title || item.domain || item.original_url || "Untitled site"}
        </div>
      </div>
    </div>
  )

  return (
    <div
      className="group mb-8 w-full mx-auto"
      style={{ maxWidth: wrapperMaxWidth }}
    >
      {/* Header for lg+: title truncates; actions reveal on hover/selected. */}
      <div className="hidden min-w-0 items-center justify-between gap-2 overflow-hidden pb-1 lg:flex">
        <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden">
          {faviconSrc ? (
            <img
              src={faviconSrc || "/placeholder.svg"}
              alt=""
              className={cn("shrink-0 rounded-sm", isLargeDensity ? "h-6 w-6" : "h-3.5 w-3.5")}
              loading="lazy"
              onError={() => setFaviconError(true)}
            />
          ) : (
            <Globe
              className={cn(
                "shrink-0 text-muted-foreground",
                isLargeDensity ? "h-6 w-6" : "h-3.5 w-3.5",
              )}
            />
          )}
          <span
            className={cn(
              "relative z-0 min-w-0 truncate font-medium text-foreground pr-6",
              isLargeDensity ? "text-base leading-6" : "text-sm",
              "after:pointer-events-none after:absolute after:top-0 after:right-0 after:h-full after:w-6 after:bg-gradient-to-l after:from-background after:to-background/0 after:opacity-0 group-hover:after:opacity-100",
            )}
          >
            {item.title || item.domain || item.original_url || "Untitled"}
          </span>
          {isDev && (
            <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] leading-4 text-muted-foreground">
              {iframeDebugStatus}
            </span>
          )}
        </div>
        <div className={cn("flex min-w-0 items-center gap-1", actionsWidthClass, actionsWidthWhenSelected)}>
          <Button
            variant="ghost"
            size="icon"
            className={actionIconButtonClass}
            onClick={onEdit}
            aria-label="Edit item"
          >
            <Pencil className="h-4 w-4" strokeWidth={2} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={actionIconButtonClass}
            onClick={onDelete}
            aria-label="Delete item"
          >
            <Trash2 className="h-4 w-4" strokeWidth={2} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={actionIconButtonClass}
            onClick={openInNewTab}
            aria-label="Open in new tab"
          >
            <ExternalLink className="h-4 w-4" strokeWidth={2} />
          </Button>
          <Checkbox
            checked={selected}
            onCheckedChange={onToggleSelect}
            aria-label={`Select ${item.title || item.original_url || "url"}`}
            className={cn(
              "ml-1 shrink-0 transition-opacity",
              isLargeDensity && "h-6 w-6 border-[2px] [&_svg]:h-4 [&_svg]:w-4",
              selected ? "opacity-100" : "opacity-0 group-hover:opacity-100",
            )}
          />
        </div>
      </div>
      {/* Header for sm/md: one-line title, then always-visible actions spanning full width. */}
      <div className="flex min-w-0 flex-col gap-1 pb-1 lg:hidden">
        <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden">
          {faviconSrc ? (
            <img
              src={faviconSrc || "/placeholder.svg"}
              alt=""
              className={cn("shrink-0 rounded-sm", isLargeDensity ? "h-6 w-6" : "h-3.5 w-3.5")}
              loading="lazy"
              onError={() => setFaviconError(true)}
            />
          ) : (
            <Globe
              className={cn(
                "shrink-0 text-muted-foreground",
                isLargeDensity ? "h-6 w-6" : "h-3.5 w-3.5",
              )}
            />
          )}
          <span className={cn("min-w-0 truncate font-medium text-foreground", isLargeDensity ? "text-base leading-6" : "text-sm")}>
            {item.title || item.domain || item.original_url || "Untitled"}
          </span>
          {isDev && (
            <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] leading-4 text-muted-foreground">
              {iframeDebugStatus}
            </span>
          )}
        </div>
        <div className="flex w-full items-center justify-between gap-1 py-1">
          <Button
            variant="ghost"
            size="icon"
            className={actionIconButtonClass}
            onClick={onEdit}
            aria-label="Edit item"
          >
            <Pencil className="h-4 w-4" strokeWidth={2} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={actionIconButtonClass}
            onClick={onDelete}
            aria-label="Delete item"
          >
            <Trash2 className="h-4 w-4" strokeWidth={2} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={actionIconButtonClass}
            onClick={openInNewTab}
            aria-label="Open in new tab"
          >
            <ExternalLink className="h-4 w-4" strokeWidth={2} />
          </Button>
          <Checkbox
            checked={selected}
            onCheckedChange={onToggleSelect}
            aria-label={`Select ${item.title || item.original_url || "url"}`}
            className={cn("shrink-0", isLargeDensity && "h-6 w-6 border-[2px] [&_svg]:h-4 [&_svg]:w-4")}
          />
        </div>
      </div>

      <div
        ref={containerRef}
        className="relative w-full overflow-hidden"
        style={{ aspectRatio: `${nativeSize.width}/${nativeSize.height}` }}
      >
        {/* Base layer: screenshot if available, fallback only when iframe is not rendering */}
        {hasScreenshot ? (
          <img
            src={item.screenshot_url || item.file_url || "/placeholder.svg"}
            alt={item.title || item.domain || item.original_url || "Website screenshot"}
            className="h-full w-full object-cover"
            loading="lazy"
            decoding="async"
          />
        ) : (
          iframePlaceholder
        )}
        {showIframe && (
          <div
            className={cn(
              "absolute left-0 top-0 origin-top-left transition-opacity duration-150",
              iframeLoaded ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
            )}
            style={{
              width: nativeSize.width,
              height: nativeSize.height,
              transform: `scale(${scale})`,
            }}
          >
            <iframe
              key={`${item.id}-${iframeInstanceKey}`}
              ref={iframeRef}
              src={item.original_url || ""}
              title={item.title || item.original_url || "Website preview"}
              className="h-full w-full border-0"
              sandbox="allow-scripts allow-same-origin"
              loading="lazy"
              onLoad={handleIframeLoad}
              onError={handleIframeError}
              style={{ width: nativeSize.width, height: nativeSize.height }}
            />
          </div>
        )}
      </div>
    </div>
  )
}
