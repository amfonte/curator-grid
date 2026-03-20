"use client"

import * as React from "react"
import { useDialKit } from "dialkit"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

const Dialog = DialogPrimitive.Root
const DialogTrigger = DialogPrimitive.Trigger
const DialogPortal = DialogPrimitive.Portal
const DialogClose = DialogPrimitive.Close

const DialogOverlay = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-overlay/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className,
    )}
    {...props}
  />
))
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

const DialogContent = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          // Use surface/secondary token (card) for modal background per design system
          "dialkit-dialog-content fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border border-border bg-card p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg",
          className,
        )}
        {...props}
      >
      {children}
      <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm text-foreground ring-offset-background transition-opacity hover:opacity-80 focus:outline-none focus:ring-0 disabled:pointer-events-none data-[state=open]:bg-transparent data-[state=open]:text-foreground">
        <X className="h-6 w-6" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
))
DialogContent.displayName = DialogPrimitive.Content.displayName

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col space-y-1.5 text-center sm:text-left", className)} {...props} />
)
DialogHeader.displayName = "DialogHeader"

const DialogTitle = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn("text-lg font-semibold leading-[28px] tracking-tight", className)}
    {...props}
  />
))
DialogTitle.displayName = DialogPrimitive.Title.displayName

// Dev-only DialKit tuner that drives Tailwind animate-in/out duration and easing
// via CSS variables.
export function DialogAnimationsDialKitDev() {
  const dial = useDialKit("Dialog animations", {
    enter: {
      type: "easing",
      duration: 0.45,
      ease: [0.7, 0.3, 0.3, 0.9], // CSS `ease`
      __mode: "easing",
    },
    exit: {
      type: "easing",
      duration: 0.3,
      ease: [0.7, 0.3, 0.3, 0.91], // CSS `ease`
      __mode: "easing",
    },
    "enter.__mode": "easing",
    "exit.__mode": "easing",
  })

  const enterSeconds = (dial.enter.type === "easing" ? dial.enter.duration : 0.2).toFixed(3).replace(/\.?0+$/, "")
  const exitSeconds = (dial.exit.type === "easing" ? dial.exit.duration : 0.15).toFixed(3).replace(/\.?0+$/, "")

  const toCubicBezier = (ease: unknown, fallback: [number, number, number, number]) => {
    if (Array.isArray(ease) && ease.length === 4) {
      const nums = ease.map((v) => (typeof v === "number" ? v : NaN))
      if (nums.every((n) => Number.isFinite(n))) {
        const [x1, y1, x2, y2] = nums
        return `cubic-bezier(${x1},${y1},${x2},${y2})`
      }
    }
    const [x1, y1, x2, y2] = fallback
    return `cubic-bezier(${x1},${y1},${x2},${y2})`
  }

  const enterEase = toCubicBezier(
    dial.enter.type === "easing" ? dial.enter.ease : undefined,
    [0.25, 0.1, 0.25, 1],
  )
  const exitEase = toCubicBezier(
    dial.exit.type === "easing" ? dial.exit.ease : undefined,
    [0.25, 0.1, 0.25, 1],
  )

  const enterDurationMs = dial.enter.type === "easing" ? dial.enter.duration * 1000 : 200
  const exitDurationMs = dial.exit.type === "easing" ? dial.exit.duration * 1000 : 150

  return (
    <style>
      {`
        /* DialKit select dropdown is portaled within the DialKit root. */
        /* Your DialKit panel has overflow-y:auto; that can clip the */
        /* dropdown list so it looks "empty" even when open.        */
        .dialkit-panel,
        .dialkit-panel-inner {
          overflow: visible !important;
        }

        :root {
          --dialkit-dialog-enter-duration: ${enterDurationMs}ms;
          --dialkit-dialog-exit-duration: ${exitDurationMs}ms;
          --dialkit-dialog-enter-ease: ${enterEase};
          --dialkit-dialog-exit-ease: ${exitEase};
        }

        /* Your app raises the panel z-index in app/globals.css,
           which can visually cover DialKit's portaled dropdown.
           Force the dropdown above everything in the DialKit stack. */
        .dialkit-select-dropdown {
          z-index: 200000 !important;
        }
        .dialkit-select-option {
          position: relative;
          z-index: 200001;
        }

        /* Apply vars directly to the dialog panel shown by Radix:
           role="dialog" + data-state="open|closed". */
        [role="dialog"][data-state="open"] {
          --tw-animation-duration: var(--dialkit-dialog-enter-duration);
          --tw-duration: ${enterSeconds}s;
          --tw-ease: var(--dialkit-dialog-enter-ease);
          /* Also override the computed animation props directly so we
             don't depend on Tailwind's internal variable plumbing. */
          animation-duration: var(--dialkit-dialog-enter-duration) !important;
          animation-timing-function: var(--dialkit-dialog-enter-ease) !important;
        }

        [role="dialog"][data-state="closed"] {
          --tw-animation-duration: var(--dialkit-dialog-exit-duration);
          --tw-duration: ${exitSeconds}s;
          --tw-ease: var(--dialkit-dialog-exit-ease);
          animation-duration: var(--dialkit-dialog-exit-duration) !important;
          animation-timing-function: var(--dialkit-dialog-exit-ease) !important;
        }

        /* Overlay backdrop (Radix DialogPrimitive.Overlay). We identify it
           by the existing Tailwind class "bg-overlay/80" on that element. */
        *[data-state="open"][class*="bg-overlay/80"] {
          --tw-animation-duration: var(--dialkit-dialog-exit-duration);
          --tw-duration: ${exitSeconds}s;
          --tw-ease: var(--dialkit-dialog-enter-ease);
          animation-duration: var(--dialkit-dialog-exit-duration) !important;
          animation-timing-function: var(--dialkit-dialog-enter-ease) !important;
        }

        *[data-state="closed"][class*="bg-overlay/80"] {
          --tw-animation-duration: var(--dialkit-dialog-enter-duration);
          --tw-duration: ${enterSeconds}s;
          --tw-ease: var(--dialkit-dialog-exit-ease);
          animation-duration: var(--dialkit-dialog-enter-duration) !important;
          animation-timing-function: var(--dialkit-dialog-exit-ease) !important;
        }
      `}
    </style>
  )
}

// Production-safe baseline so dialog animation tuning is applied even when
// DialKit controls are not mounted.
export function DialogAnimationsGlobalStyle() {
  const enterDurationMs = 450
  const exitDurationMs = 300
  const enterSeconds = "0.45"
  const exitSeconds = "0.3"
  const enterEase = "cubic-bezier(0.7,0.3,0.3,0.9)"
  const exitEase = "cubic-bezier(0.7,0.3,0.3,0.91)"

  return (
    <style>
      {`
        :root {
          --dialkit-dialog-enter-duration: ${enterDurationMs}ms;
          --dialkit-dialog-exit-duration: ${exitDurationMs}ms;
          --dialkit-dialog-enter-ease: ${enterEase};
          --dialkit-dialog-exit-ease: ${exitEase};
        }

        [role="dialog"][data-state="open"] {
          --tw-animation-duration: var(--dialkit-dialog-enter-duration);
          --tw-duration: ${enterSeconds}s;
          --tw-ease: var(--dialkit-dialog-enter-ease);
          animation-duration: var(--dialkit-dialog-enter-duration) !important;
          animation-timing-function: var(--dialkit-dialog-enter-ease) !important;
        }

        [role="dialog"][data-state="closed"] {
          --tw-animation-duration: var(--dialkit-dialog-exit-duration);
          --tw-duration: ${exitSeconds}s;
          --tw-ease: var(--dialkit-dialog-exit-ease);
          animation-duration: var(--dialkit-dialog-exit-duration) !important;
          animation-timing-function: var(--dialkit-dialog-exit-ease) !important;
        }

        *[data-state="open"][class*="bg-overlay/80"] {
          --tw-animation-duration: var(--dialkit-dialog-exit-duration);
          --tw-duration: ${exitSeconds}s;
          --tw-ease: var(--dialkit-dialog-enter-ease);
          animation-duration: var(--dialkit-dialog-exit-duration) !important;
          animation-timing-function: var(--dialkit-dialog-enter-ease) !important;
        }

        *[data-state="closed"][class*="bg-overlay/80"] {
          --tw-animation-duration: var(--dialkit-dialog-enter-duration);
          --tw-duration: ${enterSeconds}s;
          --tw-ease: var(--dialkit-dialog-exit-ease);
          animation-duration: var(--dialkit-dialog-enter-duration) !important;
          animation-timing-function: var(--dialkit-dialog-exit-ease) !important;
        }
      `}
    </style>
  )
}

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
}
