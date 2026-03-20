"use client"

import * as React from "react"
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu"
import { cn } from "@/lib/utils"

const DropdownMenu = DropdownMenuPrimitive.Root
const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger

const DropdownMenuContent = React.forwardRef<
  React.ComponentRef<typeof DropdownMenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>
>(({ className, sideOffset = 19, ...props }, ref) => (
  <DropdownMenuPrimitive.Portal>
    <DropdownMenuPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        "z-50 min-w-[8rem] overflow-visible rounded-[8px] bg-popover p-2 text-[color:var(--Text-BodyPrimary,#333)] font-[family-name:var(--font-family-All,'Host Grotesk')] text-[length:var(--font-size-Base,16px)] leading-[var(--font-line-height-Base,24px)] font-[var(--font-weight-Regular,400)] shadow-[0_25px_7px_0_rgba(0,0,0,0),0_16px_6px_0_rgba(0,0,0,0),0_9px_5px_0_rgba(0,0,0,0.01),0_4px_4px_0_rgba(0,0,0,0.02),0_1px_2px_0_rgba(0,0,0,0.02)] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 dropdown-popover",
        className,
      )}
      {...props}
    >
      {props.children}
    </DropdownMenuPrimitive.Content>
  </DropdownMenuPrimitive.Portal>
))
DropdownMenuContent.displayName = DropdownMenuPrimitive.Content.displayName

const DropdownMenuItem = React.forwardRef<
  React.ComponentRef<typeof DropdownMenuPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item> & { inset?: boolean }
>(({ className, inset, ...props }, ref) => (
  <DropdownMenuPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex cursor-default select-none items-center gap-2 rounded-sm px-4 py-3 text-[length:var(--font-size-Base,16px)] leading-[var(--font-line-height-Base,24px)] font-[var(--font-weight-Regular,400)] outline-none transition-colors hover:bg-[color:var(--Surface-Primary,#F5F5F5)] focus:bg-[color:var(--Surface-Primary,#F5F5F5)] data-[highlighted]:bg-[color:var(--Surface-Primary,#F5F5F5)] data-[highlighted]:text-[color:var(--Text-BodyPrimary,#333)] data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&>svg]:size-4 [&>svg]:shrink-0",
      inset && "pl-8",
      className,
    )}
    {...props}
  />
))
DropdownMenuItem.displayName = DropdownMenuPrimitive.Item.displayName

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
}
