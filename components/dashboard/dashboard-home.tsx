"use client"

import { useState, useCallback, useEffect, useLayoutEffect, useRef, useMemo } from "react"
import type { User } from "@supabase/supabase-js"
import type { Board } from "@/lib/types"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { TopNav } from "@/components/dashboard/top-nav"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"
import { EmptyStateQuote } from "@/components/dashboard/empty-state-quote"
import { CreateCollectionFolder } from "@/components/dashboard/create-collection-folder"
import { ExtensionPromoToast } from "@/components/dashboard/extension-promo-toast"
import { ScaledFolderFrame } from "@/components/dashboard/scaled-folder-frame"
import { parseFolderAppearance } from "@/lib/folder-customization"
import { SMOKY_DISSOLVE_MS } from "@/lib/animation/smoky-dissolve"
import { cn } from "@/lib/utils"
import { DASHBOARD_FLOATING_CONTROLS_BOTTOM_PX } from "@/lib/dashboard/floating-controls"
import { primeMobileKeyboard } from "@/lib/dashboard/mobile-keyboard"

/** Grid slide: duration when opening (grid slides right). */
const GRID_SLIDE_MS = 260
/** Grid slide: duration when cancelling (grid slides back); longer for a more graceful finish. */
const GRID_SLIDE_MS_CANCEL = 400
/** Easing when opening (grid slides right). */
const GRID_SLIDE_EASE_OPEN = "cubic-bezier(0.33, 1, 0.68, 1)"
/** Easing when cancelling (grid slides back): stronger ease-out for a more graceful finish. */
const GRID_SLIDE_EASE_CANCEL = "cubic-bezier(0.16, 1, 0.3, 1)"

function CollectionCard({ board }: { board: Board }) {
  const [hover, setHover] = useState(false)
  const appearance = useMemo(
    () =>
      parseFolderAppearance({
        folder_theme: board.folder_theme,
        folder_custom_color: board.folder_custom_color,
        folder_drawing: board.folder_drawing,
      }),
    [board.folder_custom_color, board.folder_drawing, board.folder_theme],
  )
  const itemCount = board.item_count ?? 0
  const folderType = itemCount > 0 ? "Filled" as const : "Empty" as const

  return (
    <li className="min-w-0 w-full" data-board-id={String(board.id)}>
      <Link
        href={`/dashboard/collections/${board.id}`}
        className="group relative flex w-full flex-col items-stretch"
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
      >
        {/* Container sizes to cell; folder graphic scales to fill it */}
        <ScaledFolderFrame
          wrapperClassName="w-full"
          type={folderType}
          state={hover ? "Hover" : "Default"}
          appearance={appearance}
        />
        {/* Body/base-reg label row: title left, item count right */}
        <div className="mt-3 flex w-full items-baseline justify-between px-2">
          <p className="truncate text-left text-base font-normal leading-6 text-foreground">
            {board.name}
          </p>
          <span
            className="whitespace-nowrap text-right text-[12px] font-normal leading-4"
            style={{
              color: "var(--Text-BodySecondary, #6F6F6F)",
              fontFamily: 'var(--font-family-All, "Host Grotesk")',
              lineHeight: "var(--font-line-height-Small, 16px)",
            }}
          >
            {itemCount} {itemCount === 1 ? "item" : "items"}
          </span>
        </div>
      </Link>
    </li>
  )
}
const EXIT_MS = 400
const FOLDER_ENTER_DELAY_MS = 0
const FOLDER_ENTER_MS = 380
// Cancel flow: smoky dissolve, then quotes fade in
const QUOTES_ENTER_MS = Math.round(EXIT_MS * 0.7)

interface DashboardHomeProps {
  user: User
  initialBoards: Board[]
}

export function DashboardHome({ user, initialBoards }: DashboardHomeProps) {
  const router = useRouter()
  const supabase = createClient()
  const [boards, setBoards] = useState<Board[]>(initialBoards)
  const [dashboardSearch, setDashboardSearch] = useState("")
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newBoardName, setNewBoardName] = useState("")
  const [creating, setCreating] = useState(false)
  const [phase, setPhase] = useState<"idle" | "exiting" | "showing-folder" | "cancelling">("idle")
  const [folderVisible, setFolderVisible] = useState(false)
  const [quotesEnteringFromCancel, setQuotesEnteringFromCancel] = useState(false)
  const [quotesRevealed, setQuotesRevealed] = useState(false)
  const exitTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const cancelTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const cancelGridSlideRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const gridWrapperRef = useRef<HTMLDivElement>(null)
  const gridListRef = useRef<HTMLUListElement>(null)
  /** FLIP: previous getBoundingClientRect() per board id for layout animation */
  const flipPositionsRef = useRef<Map<string, DOMRect>>(new Map())
  /** When true, next FLIP run uses cancel duration/easing (set in handleCancelCreate) */
  const cancelFlipRef = useRef(false)
  const createSlotRef = useRef<HTMLLIElement | null>(null)
  const cancelSnapHandledRef = useRef(false)
  /** Opens the mobile keyboard synchronously on Add-collection tap (iOS gesture chain). */
  const createKeyboardPrimeRef = useRef<HTMLInputElement>(null)

  const handleStartCreate = useCallback(() => {
    primeMobileKeyboard(createKeyboardPrimeRef.current)
    setShowCreateForm(true)
  }, [])

  useLayoutEffect(() => {
    if (typeof window === "undefined") return

    // On first dashboard paint (especially after auth redirects on mobile),
    // browsers may restore a stale scroll position. Force top-of-page so the
    // collections view starts from a consistent state.
    window.scrollTo({ top: 0, left: 0, behavior: "instant" })
    const frame = window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [])

  // Create-folder cancel (+ FLIP slide) can widen scrollWidth briefly; mobile
  // browsers then pan horizontally and the fixed header looks shifted. Lock x
  // overflow/scroll while the form is open — folder size and cancel position
  // stay unchanged; content still fits within the existing px-4 gutters.
  useLayoutEffect(() => {
    if (!showCreateForm) return

    const html = document.documentElement
    const body = document.body
    const prevHtmlOverflowX = html.style.overflowX
    const prevBodyOverflowX = body.style.overflowX

    const lockScrollX = () => {
      if (window.scrollX !== 0) {
        window.scrollTo({ left: 0, top: window.scrollY, behavior: "instant" })
      }
    }

    html.style.overflowX = "hidden"
    body.style.overflowX = "hidden"
    lockScrollX()

    const vv = window.visualViewport
    vv?.addEventListener("resize", lockScrollX)
    vv?.addEventListener("scroll", lockScrollX)

    return () => {
      html.style.overflowX = prevHtmlOverflowX
      body.style.overflowX = prevBodyOverflowX
      vv?.removeEventListener("resize", lockScrollX)
      vv?.removeEventListener("scroll", lockScrollX)
    }
  }, [showCreateForm])

  // Do not show or count the legacy "Unsorted" default board — treat as no collections.
  const allUserBoards = useMemo(
    () =>
      boards
        .filter((b) => b.name !== "Unsorted")
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [boards],
  )

  // Filtered view based on dashboard search.
  const userBoards = useMemo(
    () =>
      dashboardSearch
        ? allUserBoards.filter((b) =>
            b.name.toLowerCase().includes(dashboardSearch.toLowerCase()),
          )
        : allUserBoards,
    [allUserBoards, dashboardSearch],
  )

  const hasCollections = allUserBoards.length > 0

  // FLIP layout animation: when grid content changes (create slot added/removed), animate each card from previous position to new.
  useLayoutEffect(() => {
    const list = gridListRef.current
    if (!list || userBoards.length === 0) return

    const cards = list.querySelectorAll<HTMLElement>("[data-board-id]")
    const newPositions = new Map<string, DOMRect>()
    cards.forEach((el) => {
      const id = el.getAttribute("data-board-id")
      if (id) newPositions.set(id, el.getBoundingClientRect())
    })

    const prev = flipPositionsRef.current
    if (phase === "cancelling") {
      flipPositionsRef.current = newPositions
      return
    }

    const useCancelTiming = cancelFlipRef.current
    if (useCancelTiming) cancelFlipRef.current = false

    const duration = useCancelTiming ? GRID_SLIDE_MS_CANCEL : GRID_SLIDE_MS
    const easing = useCancelTiming ? GRID_SLIDE_EASE_CANCEL : GRID_SLIDE_EASE_OPEN

    newPositions.forEach((newRect, id) => {
      const oldRect = prev.get(id)
      if (!oldRect) return
      const dx = oldRect.left - newRect.left
      const dy = oldRect.top - newRect.top
      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return

      const el = list.querySelector<HTMLElement>(`[data-board-id="${id}"]`)
      if (!el) return
      el.animate(
        [
          { transform: `translate(${dx}px, ${dy}px)` },
          { transform: "translate(0, 0)" },
        ],
        { duration, easing, fill: "backwards" }
      )
    })

    flipPositionsRef.current = newPositions
  }, [userBoards, showCreateForm, phase])

  // When user clicks CTA: go to exiting, then after EXIT_MS switch to showing-folder (no boards); or go straight to showing-folder (has boards).
  useEffect(() => {
    if (!showCreateForm) {
      setPhase("idle")
      setFolderVisible(false)
      setQuotesEnteringFromCancel(false)
      setQuotesRevealed(false)
      if (cancelTimeoutRef.current) {
        clearTimeout(cancelTimeoutRef.current)
        cancelTimeoutRef.current = null
      }
      if (cancelGridSlideRef.current) {
        clearTimeout(cancelGridSlideRef.current)
        cancelGridSlideRef.current = null
      }
      return
    }
    if (hasCollections) {
      setPhase("showing-folder")
      setFolderVisible(false)
      return
    }
    const id = requestAnimationFrame(() => setPhase("exiting"))
    exitTimeoutRef.current = setTimeout(() => {
      setPhase("showing-folder")
      exitTimeoutRef.current = null
    }, EXIT_MS)
    return () => {
      cancelAnimationFrame(id)
      if (exitTimeoutRef.current) {
        clearTimeout(exitTimeoutRef.current)
        exitTimeoutRef.current = null
      }
    }
  }, [showCreateForm, hasCollections])

  // When cancelling: trigger quotes fade-in after folder exit (rAF so transition runs)
  useEffect(() => {
    if (!quotesEnteringFromCancel) return
    const id = requestAnimationFrame(() => setQuotesRevealed(true))
    return () => cancelAnimationFrame(id)
  }, [quotesEnteringFromCancel])

  // Clear quotes-enter state after fade-in completes
  useEffect(() => {
    if (!quotesEnteringFromCancel || !quotesRevealed) return
    const t = setTimeout(() => {
      setQuotesEnteringFromCancel(false)
    }, QUOTES_ENTER_MS)
    return () => clearTimeout(t)
  }, [quotesEnteringFromCancel, quotesRevealed])

  // Stagger: trigger folder enter animation after it mounts (phase === showing-folder)
  useEffect(() => {
    if (phase !== "showing-folder") return
    // Use rAF when delay is 0 so we still get one frame with initial state for the transition to run
    if (FOLDER_ENTER_DELAY_MS === 0) {
      const id = requestAnimationFrame(() => setFolderVisible(true))
      return () => cancelAnimationFrame(id)
    }
    const t = setTimeout(() => setFolderVisible(true), FOLDER_ENTER_DELAY_MS)
    return () => clearTimeout(t)
  }, [phase])

  const refreshBoards = useCallback(async () => {
    const { data } = await supabase
      .from("boards")
      .select("*, item_boards(count)")
      .order("created_at", { ascending: true })
    if (data) {
      setBoards(
        data.map((b) => ({
          ...b,
          item_count: b.item_boards?.[0]?.count ?? 0,
        })),
      )
    }
  }, [supabase])

  function handleCancelCreate() {
    setPhase("cancelling")
    if (cancelTimeoutRef.current) clearTimeout(cancelTimeoutRef.current)
    cancelTimeoutRef.current = null
    if (cancelGridSlideRef.current) {
      clearTimeout(cancelGridSlideRef.current)
      cancelGridSlideRef.current = null
    }

    cancelSnapHandledRef.current = false

    function doSnap() {
      if (cancelSnapHandledRef.current) return
      cancelSnapHandledRef.current = true
      if (cancelTimeoutRef.current) {
        clearTimeout(cancelTimeoutRef.current)
        cancelTimeoutRef.current = null
      }
      cancelFlipRef.current = true
      setShowCreateForm(false)
      setNewBoardName("")
      setPhase("idle")
      if (!hasCollections) {
        setQuotesRevealed(false)
        setQuotesEnteringFromCancel(true)
      }
    }

    cancelTimeoutRef.current = setTimeout(doSnap, SMOKY_DISSOLVE_MS)
  }

  async function handleCreateBoard() {
    const name = newBoardName.trim() || "Untitled collection"
    setCreating(true)
    try {
      const { data: board, error } = await supabase
        .from("boards")
        .insert({ name, user_id: user.id })
        .select()
        .single()
      if (error) throw error
      await refreshBoards()
      setNewBoardName("")
      setShowCreateForm(false)
      if (board) router.push(`/dashboard/collections/${board.id}`)
    } catch (err) {
      console.error("Failed to create collection:", err)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="flex flex-col bg-background">
      <input
        ref={createKeyboardPrimeRef}
        type="text"
        tabIndex={-1}
        aria-hidden="true"
        defaultValue=""
        className="pointer-events-none fixed left-0 top-0 h-px w-px opacity-0"
      />
      <TopNav
        search={dashboardSearch}
        onSearchChange={setDashboardSearch}
        columns={6}
        onColumnsChange={() => {}}
        onAddClick={handleStartCreate}
        filterType={null}
        onFilterTypeChange={() => {}}
        user={user}
        isCollectionView={false}
        showAddCollection={hasCollections}
        hideMobileFloatingAdd={showCreateForm}
      />

      {!hasCollections && (phase === "idle" || phase === "exiting") && (
        <div
          className="pointer-events-none fixed inset-x-0 z-40 flex justify-center sm:hidden"
          style={{
            bottom: DASHBOARD_FLOATING_CONTROLS_BOTTOM_PX,
            transition: `opacity ${phase === "exiting" ? EXIT_MS : QUOTES_ENTER_MS}ms ease-out`,
            opacity:
              phase === "exiting"
                ? 0
                : quotesEnteringFromCancel
                  ? (quotesRevealed ? 1 : 0)
                  : 1,
          }}
          data-dashboard-floating-controls
        >
          <Button
            size="lg"
            onClick={handleStartCreate}
            className="pointer-events-auto"
            disabled={phase === "exiting"}
          >
            Create your first collection
          </Button>
        </div>
      )}

      <main className="flex-1 px-4 pb-4 pt-[128px] md:pt-[156px]">
        {!hasCollections ? (
          <div
            className={`flex flex-col ${
              phase === "showing-folder" || phase === "cancelling"
                ? "min-h-0 items-start"
                : "min-h-[60vh] w-full items-center justify-start pt-16 sm:pt-24"
            }`}
          >
            {/* Phase 1: quotes + CTA (idle or exiting). Fade out together when exiting; fade in when returning from cancel. */}
            {(phase === "idle" || phase === "exiting") && (
              <div
                className="w-full max-w-[690px] text-left"
                style={{
                  transition: `opacity ${phase === "exiting" ? EXIT_MS : QUOTES_ENTER_MS}ms ease-out`,
                  opacity:
                    phase === "exiting"
                      ? 0
                      : quotesEnteringFromCancel
                        ? (quotesRevealed ? 1 : 0)
                        : 1,
                }}
              >
                <div className="mb-0 sm:mb-10 w-full">
                  <EmptyStateQuote
                    startDelayMs={quotesEnteringFromCancel ? QUOTES_ENTER_MS : 0}
                  />
                </div>
                <div className="hidden sm:block self-start">
                  <Button
                    size="lg"
                    onClick={handleStartCreate}
                    disabled={phase === "exiting"}
                  >
                    Create your first collection
                  </Button>
                </div>
              </div>
            )}

            {/* Phase 2: folder + form; when cancelling, folder graphic poofs (no slide out) */}
            {(phase === "showing-folder" || phase === "cancelling") && (
              <div
                className={cn(
                  "w-full flex flex-col items-stretch overflow-visible sm:max-w-[335px]",
                  phase === "cancelling" && "relative z-10",
                )}
                style={{
                  transition:
                    phase === "cancelling"
                      ? "none"
                      : `opacity ${FOLDER_ENTER_MS}ms ease-out ${FOLDER_ENTER_DELAY_MS}ms, transform ${FOLDER_ENTER_MS}ms ease-out ${FOLDER_ENTER_DELAY_MS}ms`,
                  opacity: folderVisible ? 1 : 0,
                  transform: folderVisible ? "translateY(0)" : "translateY(14px)",
                }}
              >
                <CreateCollectionFolder
                  value={newBoardName}
                  onChange={setNewBoardName}
                  onSubmit={handleCreateBoard}
                  onCancel={handleCancelCreate}
                  creating={creating || phase === "cancelling"}
                  poofing={phase === "cancelling"}
                  className="w-full"
                  placeholder="Untitled collection"
                  submitLabel="Create"
                  cancelLabel="Cancel"
                />
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-start gap-5" style={{ gap: 20 }}>
            <div
              key="collections-grid"
              ref={gridWrapperRef}
              className={cn("min-w-0 flex-1", showCreateForm && "overflow-visible")}
            >
              {userBoards.length === 0 && dashboardSearch ? (
                <div className="flex min-h-[200px] items-center justify-center">
                  <p className="headline-primary text-center">
                    No collections match your search term.
                  </p>
                </div>
              ) : (
                <ul
                  ref={gridListRef}
                  className={cn("grid", showCreateForm && "overflow-visible")}
                  style={{
                    gap: "20px",
                    gridTemplateColumns: "repeat(auto-fill, minmax(335px, 1fr))",
                  }}
                >
                  {showCreateForm && (phase === "showing-folder" || phase === "cancelling") && (
                    <li
                      ref={createSlotRef}
                      className={cn(
                        "min-w-0 w-full overflow-visible",
                        phase === "cancelling" && "relative z-10",
                      )}
                      style={{
                        transition:
                          phase === "cancelling"
                            ? "none"
                            : `opacity ${FOLDER_ENTER_MS}ms ease-out ${FOLDER_ENTER_DELAY_MS}ms, transform ${FOLDER_ENTER_MS}ms ease-out ${FOLDER_ENTER_DELAY_MS}ms`,
                        opacity: folderVisible ? 1 : 0,
                        transform: folderVisible ? "translateY(0)" : "translateY(14px)",
                        pointerEvents: phase === "cancelling" ? "none" : undefined,
                      }}
                    >
                      <CreateCollectionFolder
                        value={newBoardName}
                        onChange={setNewBoardName}
                        onSubmit={handleCreateBoard}
                        onCancel={handleCancelCreate}
                        creating={creating || phase === "cancelling"}
                        poofing={phase === "cancelling"}
                        className="w-full"
                        placeholder="Untitled collection"
                        submitLabel="Create"
                        cancelLabel="Cancel"
                      />
                    </li>
                  )}
                  {userBoards.map((board) => (
                    <CollectionCard key={board.id} board={board} />
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </main>

      <ExtensionPromoToast />
    </div>
  )
}
