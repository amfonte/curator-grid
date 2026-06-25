import { cn } from "../lib/utils"

type SkeletonProps = {
  className?: string
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-[var(--gray-30)]", className)}
      aria-hidden
    />
  )
}
