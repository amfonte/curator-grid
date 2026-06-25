import * as React from "react"
import * as SelectPrimitive from "@radix-ui/react-select"
import { Check, ChevronDown } from "lucide-react"
import { cn } from "../../lib/utils"
import { usePanelPortal } from "../../panel/PanelPortalContext"

const Select = SelectPrimitive.Root
const SelectGroup = SelectPrimitive.Group
const SelectValue = SelectPrimitive.Value

const SelectTrigger = React.forwardRef<
  React.ComponentRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      "form-field-input flex items-center justify-between whitespace-nowrap border-[2px] [&>span]:line-clamp-1 [&_[data-select-chevron]]:transition-transform [&_[data-select-chevron]]:duration-200 [&[data-state=open]_[data-select-chevron]]:rotate-180",
      className,
    )}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon asChild>
      <ChevronDown data-select-chevron className="h-6 w-6 text-foreground" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
))
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName

const SelectContent = React.forwardRef<
  React.ComponentRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = "popper", onCloseAutoFocus, ...props }, ref) => {
  const portalContainer = usePanelPortal()

  if (!portalContainer) {
    return null
  }

  return (
    <SelectPrimitive.Portal container={portalContainer}>
      <SelectPrimitive.Content
        ref={ref}
        className={cn(
          "select-content pointer-events-auto relative z-[2] min-w-[8rem] rounded-[24px] border-[2px] border-border bg-card text-foreground",
          position === "popper" &&
            "data-[side=bottom]:translate-y-1 data-[side=bottom]:mt-[4px] data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
          className,
        )}
        position={position}
        sideOffset={4}
        onCloseAutoFocus={(event) => {
          event.preventDefault()
          onCloseAutoFocus?.(event)
        }}
        {...props}
      >
        <SelectPrimitive.Viewport className="select-content-viewport py-0">
          {children}
        </SelectPrimitive.Viewport>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  )
})
SelectContent.displayName = SelectPrimitive.Content.displayName

const SelectItem = React.forwardRef<
  React.ComponentRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      "select-item relative flex w-full cursor-default select-none items-center px-1 py-0 text-base leading-6 text-foreground outline-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className,
    )}
    {...props}
  >
    <div className="select-item-inner flex w-full items-center gap-2 rounded-[24px] px-3.5 py-2">
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
      <span className="ml-auto flex h-6 w-6 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <Check className="h-6 w-6 text-icon" />
        </SelectPrimitive.ItemIndicator>
      </span>
    </div>
  </SelectPrimitive.Item>
))
SelectItem.displayName = SelectPrimitive.Item.displayName

export { Select, SelectGroup, SelectValue, SelectTrigger, SelectContent, SelectItem }
