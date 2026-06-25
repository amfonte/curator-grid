import { useState, type ReactNode } from "react"
import { PanelPortalProvider } from "./PanelPortalContext"

type PanelShellProps = {
  onClose: () => void
  children: ReactNode
  /** Gap between the close row and content: 16px (main), 24px (auth), or 32px (no collections). */
  contentTopGap?: 16 | 24 | 32
  /** Small Curator mark in the header, opposite the close button. */
  showBranding?: boolean
}

export function PanelShell({
  onClose,
  children,
  contentTopGap = 24,
  showBranding = false,
}: PanelShellProps) {
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null)

  return (
    <PanelPortalProvider container={portalContainer}>
      <div className="curator-panel fixed top-4 right-4 z-[2147483647] w-[375px] max-w-[calc(100vw-32px)]">
        {/* Dropdown menus portal here so they stack above panel content */}
        <div
          ref={setPortalContainer}
          id="curator-extension-portal-root"
          className="panel-portal-layer pointer-events-none absolute inset-0 overflow-visible"
          aria-hidden
        />
        <div
          className="relative flex flex-col overflow-hidden rounded-3xl bg-card px-6 pb-6 pt-6 shadow-panel"
          role="dialog"
          aria-modal="true"
        >
          <div
            className={
              showBranding
                ? "flex h-6 shrink-0 items-center justify-between"
                : "flex h-6 shrink-0 items-center justify-end"
            }
          >
            {showBranding ? (
              <img
                src={chrome.runtime.getURL("assets/curator-extension-icon.svg")}
                alt=""
                className="h-6 w-auto"
                aria-hidden
              />
            ) : null}
            <button
              type="button"
              onClick={onClose}
              className="rounded-sm text-foreground transition-opacity hover:opacity-80 focus:outline-none"
              aria-label="Close"
            >
              <CloseIcon />
            </button>
          </div>
          <div
            className={
              contentTopGap === 16 ? "mt-4" : contentTopGap === 32 ? "mt-8" : "mt-6"
            }
          >
            {children}
          </div>
        </div>
      </div>
    </PanelPortalProvider>
  )
}

function CloseIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  )
}
