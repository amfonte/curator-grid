import { FormField } from "./FormField"
import { Skeleton } from "./Skeleton"

export function AuthSkeleton() {
  return (
    <div className="flex flex-col items-center" aria-busy="true" aria-label="Loading sign in">
      <img
        src={chrome.runtime.getURL("assets/curator-logo-lockup.svg")}
        alt=""
        className="curator-logo-vector h-[80px] w-[75px] shrink-0 object-contain"
        aria-hidden
      />

      <Skeleton className="mt-6 h-6 w-56 max-w-full rounded-sm" />

      <div className="mt-5 flex w-full flex-col gap-5">
        <FormField label="Email">
          <Skeleton className="h-[44px] w-full rounded-[24px]" />
        </FormField>

        <div className="flex flex-col gap-2">
          <FormField label="Password">
            <Skeleton className="h-[44px] w-full rounded-[24px]" />
          </FormField>
          <div className="flex justify-end">
            <Skeleton className="h-6 w-32 rounded-sm" />
          </div>
        </div>

        <Skeleton className="h-12 w-full rounded-[48px]" />
      </div>

      <Skeleton className="mt-5 h-6 w-48 max-w-full rounded-sm" />
    </div>
  )
}
