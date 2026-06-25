import { TAB_CONTENT_HEIGHT_PX } from "./tab-layout"
import { Skeleton } from "./Skeleton"

export function ImageTabSkeleton() {
  return (
    <div
      className="relative flex flex-col items-center justify-center gap-4 rounded-lg bg-card px-8"
      style={{ height: TAB_CONTENT_HEIGHT_PX }}
      aria-busy="true"
      aria-label="Loading image picker"
    >
      <Skeleton className="h-5 w-56 max-w-full rounded-sm" />
      <Skeleton className="h-4 w-40 max-w-full rounded-sm" />
    </div>
  )
}
