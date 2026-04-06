"use client"

import type { User } from "@supabase/supabase-js"
import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { usePathname } from "next/navigation"
import { logout } from "@/app/auth/actions"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { Plus, Search, User as UserIcon, X } from "lucide-react"

interface TopNavProps {
  search: string
  onSearchChange: (value: string) => void
  columns: number
  onColumnsChange: (value: number) => void
  onAddClick: () => void
  filterType: string | null
  onFilterTypeChange: (value: string | null) => void
  user: User
  /** When true, show Add button and Back to dashboard; when false (dashboard home), hide Add */
  isCollectionView?: boolean
  /** When true (and !isCollectionView), show "Add collection" in header. Use after user has created their first collection. */
  showAddCollection?: boolean
}

/** Subpixel / rounding: below this, treat the page as non-scrollable so rubber-band
 *  and micro-movement on mobile do not drive the hide-on-scroll header. */
const SCROLL_OVERFLOW_THRESHOLD_PX = 8

function getDocumentMaxScrollY() {
  if (typeof document === "undefined") return 0
  const el = document.documentElement
  return Math.max(0, el.scrollHeight - window.innerHeight)
}

function documentHasScrollableOverflow() {
  return getDocumentMaxScrollY() > SCROLL_OVERFLOW_THRESHOLD_PX
}

export function TopNav(props: TopNavProps) {
  const {
    search,
    onSearchChange,
    onAddClick,
    user,
    isCollectionView = false,
    showAddCollection = false,
  } = props
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)
  const [isHidden, setIsHidden] = useState(false)
  const searchInputRef = useRef<HTMLInputElement | null>(null)
  const lastScrollYRef = useRef(0)
  const revealTimeoutRef = useRef<number | null>(null)

  useEffect(() => setMounted(true), [])

  useLayoutEffect(() => {
    lastScrollYRef.current = window.scrollY
    if (!documentHasScrollableOverflow()) {
      setIsHidden(false)
      if (revealTimeoutRef.current !== null) {
        window.clearTimeout(revealTimeoutRef.current)
        revealTimeoutRef.current = null
      }
    }
  }, [pathname])

  useEffect(() => {
    const handleScroll = () => {
      if (!documentHasScrollableOverflow()) {
        setIsHidden(false)
        lastScrollYRef.current = window.scrollY
        if (revealTimeoutRef.current !== null) {
          window.clearTimeout(revealTimeoutRef.current)
          revealTimeoutRef.current = null
        }
        return
      }

      const currentY = window.scrollY || 0
      const prevY = lastScrollYRef.current
      const delta = currentY - prevY

      if (currentY <= 0) {
        setIsHidden(false)
        if (revealTimeoutRef.current !== null) {
          window.clearTimeout(revealTimeoutRef.current)
          revealTimeoutRef.current = null
        }
      } else if (delta > 4) {
        setIsHidden(true)
        if (revealTimeoutRef.current !== null) {
          window.clearTimeout(revealTimeoutRef.current)
          revealTimeoutRef.current = null
        }
      } else if (delta < -4) {
        if (revealTimeoutRef.current === null) {
          revealTimeoutRef.current = window.setTimeout(() => {
            setIsHidden(false)
            revealTimeoutRef.current = null
          }, 400)
        }
      }

      lastScrollYRef.current = currentY
    }

    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => {
      window.removeEventListener("scroll", handleScroll)
      if (revealTimeoutRef.current !== null) {
        window.clearTimeout(revealTimeoutRef.current)
        revealTimeoutRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    const syncIfNoOverflow = () => {
      if (!documentHasScrollableOverflow()) {
        setIsHidden(false)
        if (revealTimeoutRef.current !== null) {
          window.clearTimeout(revealTimeoutRef.current)
          revealTimeoutRef.current = null
        }
      }
    }

    window.addEventListener("resize", syncIfNoOverflow)
    window.addEventListener("orientationchange", syncIfNoOverflow)
    const vv = window.visualViewport
    vv?.addEventListener("resize", syncIfNoOverflow)

    let resizeObserver: ResizeObserver | null = null
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => syncIfNoOverflow())
      resizeObserver.observe(document.documentElement)
    }

    syncIfNoOverflow()

    return () => {
      window.removeEventListener("resize", syncIfNoOverflow)
      window.removeEventListener("orientationchange", syncIfNoOverflow)
      vv?.removeEventListener("resize", syncIfNoOverflow)
      resizeObserver?.disconnect()
    }
  }, [])

  const isEmptyDashboard = !isCollectionView && !showAddCollection
  const isCollectionsDashboard = !isCollectionView && showAddCollection
  const hasSearch = search.trim().length > 0

  const headerBaseClasses =
    "fixed inset-x-0 top-0 z-30 transform transition-transform duration-200 ease-out will-change-transform"
  const headerVisibilityClasses = isHidden ? "-translate-y-full" : "translate-y-0"

  const userMenu = mounted ? (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="icon" className="cta-icon" aria-label="User menu">
          <span className="inline-flex">
            <UserIcon className="h-4 w-4" />
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          disabled
          className="cursor-default border-0 bg-transparent text-[color:var(--Text-BodyPrimary,#333)] opacity-100 data-[disabled]:opacity-100"
        >
          {user.email}
        </DropdownMenuItem>
        <DropdownMenuItem
          className="bg-transparent pt-0 hover:bg-transparent focus:bg-transparent data-[highlighted]:bg-transparent"
          onClick={() => logout()}
        >
          <Button
            type="button"
            variant="default"
            size="lg"
            className="w-full justify-center"
          >
            Sign out
          </Button>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ) : (
    <div className="h-8 w-8 shrink-0" aria-hidden />
  )

  if (isCollectionsDashboard) {
    return (
      <>
        <header
          className={cn(
            "flex shrink-0 items-center px-4 pt-6",
            headerBaseClasses,
            headerVisibilityClasses,
          )}
        >
          <div className="flex items-center">
            <img src="/logo/curator-logo.svg" alt="Curator" className="h-[60px] w-auto" />
          </div>

          <div className="flex min-w-0 flex-1 justify-center px-6">
            <div className="search-field min-w-0 w-full max-w-md">
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <Search className="h-4 w-4 text-icon" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={search}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder="Search"
                  className="min-w-0 flex-1 bg-transparent text-base leading-6 text-foreground placeholder:text-muted-foreground outline-none"
                />
              </div>

              {hasSearch && (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => {
                    onSearchChange("")
                    searchInputRef.current?.focus()
                  }}
                  className="ml-2 shrink-0 text-icon hover:opacity-80 focus-visible:outline-none"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          <div className="ml-auto flex items-center gap-6">
            <Button variant="default" size="lg" onClick={onAddClick} className="max-sm:hidden">
              Add collection
            </Button>
            {userMenu}
          </div>
        </header>
        <Button
          variant="default"
          size="lg"
          onClick={onAddClick}
          className="fixed bottom-8 left-1/2 z-40 hidden -translate-x-1/2 max-sm:inline-flex"
        >
          Add collection
        </Button>
      </>
    )
  }

  if (isEmptyDashboard) {
    return (
      <header
        className={cn(
          "flex shrink-0 items-center justify-between px-4 pt-6",
          headerBaseClasses,
          headerVisibilityClasses,
        )}
      >
        <div className="flex items-center">
          <img src="/logo/curator-logo.svg" alt="Curator" className="h-[60px] w-auto" />
        </div>

        <div className="flex items-center gap-6">{userMenu}</div>
      </header>
    )
  }

  if (isCollectionView) {
    return (
      <header
        className={cn(
          "flex shrink-0 items-center px-4 pt-6",
          headerBaseClasses,
          headerVisibilityClasses,
        )}
      >
        <div className="flex items-center">
          <img src="/logo/curator-logo.svg" alt="Curator" className="h-[60px] w-auto" />
        </div>

        <div className="flex min-w-0 flex-1 justify-center px-6">
          <div className="search-field min-w-0 w-full max-w-md">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <Search className="h-4 w-4 text-icon" />
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search"
                className="min-w-0 flex-1 bg-transparent text-base leading-6 text-foreground placeholder:text-muted-foreground outline-none"
              />
            </div>

            {hasSearch && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => {
                  onSearchChange("")
                  searchInputRef.current?.focus()
                }}
                className="ml-2 shrink-0 text-icon hover:opacity-80 focus-visible:outline-none"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        <div className="ml-auto flex items-center gap-6">{userMenu}</div>
      </header>
    )
  }

  return (
    <header
      className={cn(
        "flex h-14 shrink-0 items-center gap-3 px-4",
        "border-b border-border",
        headerBaseClasses,
        headerVisibilityClasses,
      )}
    >
      <h1 className="text-sm font-semibold text-foreground">Curated</h1>

      <div className="flex-1" />

      {!isCollectionView && showAddCollection && (
        <Button size="sm" onClick={onAddClick} className="h-8 gap-1.5">
          <Plus className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Add collection</span>
        </Button>
      )}

      {userMenu}
    </header>
  )
}
