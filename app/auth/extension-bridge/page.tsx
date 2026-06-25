import { Suspense } from "react"
import { ExtensionBridgeClient } from "./extension-bridge-client"

export default function ExtensionBridgePage() {
  return (
    <Suspense
      fallback={
        <div className="w-full max-w-[375px] rounded-3xl bg-card px-6 py-8 text-center shadow-panel">
          <p className="text-base text-muted-foreground">Signing you in to Curator…</p>
        </div>
      }
    >
      <ExtensionBridgeClient />
    </Suspense>
  )
}
