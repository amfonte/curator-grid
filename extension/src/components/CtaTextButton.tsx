import * as React from "react"
import { SmoothCorners } from "@lisse/react"
import { getExtensionCtaSmoothCornersProps } from "../lib/cta-smooth-corners"
import { cn } from "../lib/utils"

type CtaTextButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary"
}

const CTA_TEXT_BUTTON_BASE =
  "inline-flex h-[48px] min-h-[48px] items-center justify-center gap-2 whitespace-nowrap px-5 py-2.5 text-base font-medium cursor-pointer disabled:pointer-events-none"

export const CtaTextButton = React.forwardRef<HTMLButtonElement, CtaTextButtonProps>(
  ({ variant = "primary", className, type = "button", ...props }, ref) => {
    const ctaClass = variant === "secondary" ? "cta-secondary" : "cta-primary"

    return (
      <SmoothCorners asChild {...getExtensionCtaSmoothCornersProps(variant)}>
        <button
          ref={ref}
          type={type}
          className={cn(CTA_TEXT_BUTTON_BASE, ctaClass, className)}
          {...props}
        />
      </SmoothCorners>
    )
  },
)
CtaTextButton.displayName = "CtaTextButton"
