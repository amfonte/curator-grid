import { Skeleton } from "./Skeleton"

export function NoCollectionsSkeleton() {
  return (
    <div
      className="flex min-h-[280px] flex-col justify-between gap-8"
      aria-busy="true"
      aria-label="Loading collections"
    >
      <div className="flex flex-col items-center gap-3">
        <Skeleton className="h-7 w-4/5 rounded-sm" />
        <Skeleton className="h-6 w-full rounded-sm" />
        <Skeleton className="h-6 w-11/12 rounded-sm" />
      </div>
      <Skeleton className="h-12 w-full rounded-[48px]" />
    </div>
  )
}
