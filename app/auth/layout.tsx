import type { ReactNode } from "react"
import { AuthLogoPatternReveal } from "@/components/auth/auth-logo-pattern-reveal"

export default function AuthLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <main className="relative flex h-dvh max-h-dvh items-center justify-center overflow-hidden overscroll-none bg-surface-tertiary px-4">
      <AuthLogoPatternReveal />
      <div className="relative z-10 w-full flex items-center justify-center">
        {children}
      </div>
    </main>
  )
}
