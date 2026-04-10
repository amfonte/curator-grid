"use client"

import { useState, useCallback, useEffect, useLayoutEffect, useRef, useMemo } from "react"
import type { User } from "@supabase/supabase-js"
import type { Board } from "@/lib/types"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { TopNav } from "@/components/dashboard/top-nav"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"
import { getRandomQuote, getRandomQuoteOtherThan } from "@/lib/quotes"
import { CreateCollectionFolder } from "@/components/dashboard/create-collection-folder"
import { ScaledFolderFrame } from "@/components/dashboard/scaled-folder-frame"
import { parseFolderAppearance } from "@/lib/folder-customization"

const QUOTE_CYCLE_MS = 6000

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
const QUOTE_TRANSITION_MS = 450
const EXIT_MS = 400
const FOLDER_ENTER_DELAY_MS = 0
const FOLDER_ENTER_MS = 380
// Cancel flow: poof animation (30% faster than enter), then quotes fade in
const POOF_MS = 320
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
  const [quote, setQuote] = useState<ReturnType<typeof getRandomQuote> | null>(null)
  const [quoteTransitioning, setQuoteTransitioning] = useState(false)
  const [phase, setPhase] = useState<"idle" | "exiting" | "showing-folder" | "cancelling">("idle")
  const [folderVisible, setFolderVisible] = useState(false)
  const [quotesEnteringFromCancel, setQuotesEnteringFromCancel] = useState(false)
  const [quotesRevealed, setQuotesRevealed] = useState(false)
  const cycleTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
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

  // Initial quote and cycle to a new random quote on an interval
  useEffect(() => {
    setQuote(getRandomQuote())
  }, [])

  useEffect(() => {
    if (hasCollections || showCreateForm) return
    cycleTimerRef.current = setInterval(() => {
      setQuoteTransitioning(true)
      setTimeout(() => {
        setQuote((prev) => getRandomQuoteOtherThan(prev))
        setQuoteTransitioning(false)
      }, QUOTE_TRANSITION_MS)
    }, QUOTE_CYCLE_MS)
    return () => {
      if (cycleTimerRef.current) clearInterval(cycleTimerRef.current)
    }
  }, [hasCollections, showCreateForm])

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

    if (hasCollections) {
      cancelSnapHandledRef.current = false
      cancelFlipRef.current = true
      function doSnap() {
        if (cancelSnapHandledRef.current) return
        cancelSnapHandledRef.current = true
        if (cancelTimeoutRef.current) {
          clearTimeout(cancelTimeoutRef.current)
          cancelTimeoutRef.current = null
        }
        setShowCreateForm(false)
        setNewBoardName("")
        setPhase("idle")
      }
      cancelTimeoutRef.current = setTimeout(doSnap, POOF_MS)
    } else {
      cancelTimeoutRef.current = setTimeout(() => {
        setShowCreateForm(false)
        setNewBoardName("")
        setPhase("idle")
        setQuotesRevealed(false)
        setQuotesEnteringFromCancel(true)
        cancelTimeoutRef.current = null
      }, POOF_MS)
    }
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
      <TopNav
        search={dashboardSearch}
        onSearchChange={setDashboardSearch}
        columns={6}
        onColumnsChange={() => {}}
        onAddClick={() => setShowCreateForm(true)}
        filterType={null}
        onFilterTypeChange={() => {}}
        user={user}
        isCollectionView={false}
        showAddCollection={hasCollections}
      />

      <main className="flex-1 px-4 pb-4 pt-[144px]">
        {!hasCollections ? (
          <div
            className={`flex flex-col ${
              phase === "showing-folder" || phase === "cancelling"
                ? "min-h-0 items-start"
                : "min-h-[60vh] items-center justify-center"
            }`}
          >
            {/* Phase 1: quotes + CTA (idle or exiting). Fade out together when exiting; fade in when returning from cancel. */}
            {(phase === "idle" || phase === "exiting") && (
              <div
                className="w-full max-w-[690px] text-left space-y-10"
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
                <div
                  className="min-h-[10.75rem] w-full flex flex-col items-start justify-start"
                  style={{
                    transition: `opacity ${QUOTE_TRANSITION_MS}ms ease-out, filter ${QUOTE_TRANSITION_MS}ms ease-out, transform ${QUOTE_TRANSITION_MS}ms ease-out`,
                    opacity: quoteTransitioning ? 0 : 1,
                    filter: quoteTransitioning ? "blur(8px)" : "blur(0)",
                    transform: quoteTransitioning ? "translateY(8px)" : "translateY(0)",
                  }}
                >
                  {quote && (
                    <blockquote className="dashboard-quote-sm-only-pad text-[32px] text-foreground/90 font-medium">
                      <span className="block leading-[44px]">
                        <span
                          className="inline-block -ml-[0.4em] mr-[0.02em]"
                          aria-hidden="true"
                        >
                          &ldquo;
                        </span>
                        {quote.quote}&rdquo;
                      </span>
                      <footer
                        className="mt-4 text-base text-muted-foreground"
                        style={{
                          transition: `opacity ${QUOTE_TRANSITION_MS}ms ease-out, transform ${QUOTE_TRANSITION_MS}ms ease-out`,
                          transitionDelay: quoteTransitioning ? "0ms" : "100ms",
                          opacity: quoteTransitioning ? 0 : 1,
                          transform: quoteTransitioning ? "translateY(8px)" : "translateY(0)",
                        }}
                      >
                        — {quote.author}
                      </footer>
                    </blockquote>
                  )}
                </div>
                <Button
                  size="lg"
                  onClick={() => setShowCreateForm(true)}
                  className="self-start dashboard-first-cta-sm-docked"
                  disabled={phase === "exiting"}
                >
                  Create your first collection
                </Button>
              </div>
            )}

            {/* Phase 2: folder + form; when cancelling, folder graphic poofs (no slide out) */}
            {(phase === "showing-folder" || phase === "cancelling") && (
              <div
                className="w-full max-w-[335px] flex flex-col items-stretch self-start"
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
                  className="self-start w-full max-w-[335px]"
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
              className="min-w-0 flex-1"
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
                  className="grid"
                  style={{
                    gap: "20px",
                    gridTemplateColumns: "repeat(auto-fill, minmax(335px, 1fr))",
                  }}
                >
                  {showCreateForm && (phase === "showing-folder" || phase === "cancelling") && (
                    <li
                      ref={createSlotRef}
                      className="min-w-0 w-full"
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
    </div>
  )
}
