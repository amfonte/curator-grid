import { FormField } from "./FormField"
import { Skeleton } from "./Skeleton"
import { TAB_CONTENT_HEIGHT_PX } from "./tab-layout"

export function UrlTabSkeleton() {
  return (
    <div
      className="flex flex-col gap-5"
      style={{ minHeight: TAB_CONTENT_HEIGHT_PX }}
      aria-busy="true"
      aria-label="Loading save form"
    >
      <div className="flex min-w-0 flex-col gap-[8px]">
        <Skeleton className="h-6 w-full rounded-sm" />
        <Skeleton className="h-4 w-2/3 rounded-sm" />
      </div>

      <FormField label="Viewport" className="gap-[8px]">
        <Skeleton className="h-[44px] w-full rounded-[24px]" />
      </FormField>

      <FormField label="Collection" className="gap-[8px]">
        <Skeleton className="h-[44px] w-full rounded-[24px]" />
      </FormField>

      <Skeleton className="h-12 w-full rounded-[48px]" />
    </div>
  )
}
