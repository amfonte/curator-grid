import * as React from "react"
import { SmoothCorners } from "@lisse/react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { getCtaSmoothCornersProps, usesCtaSmoothCorners } from "@/lib/cta-smooth-corners"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 cursor-pointer",
  {
    variants: {
      variant: {
        default: "cta-primary px-5 py-2.5 text-base",
        destructive: "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90 rounded-md transition-colors",
        outline: "border border-input bg-transparent shadow-sm hover:bg-accent hover:text-accent-foreground rounded-md transition-colors",
        secondary: "cta-secondary px-5 py-2.5 text-base",
        ghost: "hover:bg-accent hover:text-accent-foreground rounded-md transition-colors",
        link: "text-primary underline underline-offset-4 rounded-md transition-colors",
      },
      size: {
        default: "h-[48px] min-h-[48px]",
        sm: "h-auto min-h-[40px] px-4 py-2 text-sm",
        lg: "h-[48px] min-h-[48px] px-5 py-2.5 text-base",
        icon: "cta-icon h-12 w-12 rounded-full p-3 [&_img]:size-6 [&_svg]:size-6",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    const element = (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    )

    if (!usesCtaSmoothCorners(variant, size)) {
      return element
    }

    const smoothVariant = (variant ?? "default") === "secondary" ? "secondary" : "default"

    return (
      <SmoothCorners asChild {...getCtaSmoothCornersProps(smoothVariant, size)}>
        {element}
      </SmoothCorners>
    )
  },
)
Button.displayName = "Button"

export { Button, buttonVariants }
