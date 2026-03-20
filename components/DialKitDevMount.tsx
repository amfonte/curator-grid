"use client"

import dynamic from "next/dynamic"

const DialKitRootDev = dynamic(
  () => import("@/components/DialKitRoot").then((m) => m.DialKitRoot),
  { ssr: false, loading: () => null },
)

const DialogAnimationsDialKitDev = dynamic(
  () =>
    import("@/components/ui/dialog").then(
      (m) => m.DialogAnimationsDialKitDev,
    ),
  { ssr: false, loading: () => null },
)

const DialogAnimationsGlobalStyle = dynamic(
  () =>
    import("@/components/ui/dialog").then(
      (m) => m.DialogAnimationsGlobalStyle,
    ),
  { ssr: false, loading: () => null },
)

export function DialKitDevMount() {
  if (process.env.NODE_ENV !== "development") {
    return <DialogAnimationsGlobalStyle />
  }
  return (
    <>
      <DialogAnimationsGlobalStyle />
      <DialKitRootDev />
      <DialogAnimationsDialKitDev />
    </>
  )
}

