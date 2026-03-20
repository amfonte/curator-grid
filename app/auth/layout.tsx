import type { ReactNode } from "react"
import { AuthLogoPatternReveal } from "@/components/auth/auth-logo-pattern-reveal"

export default function AuthLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <main className="relative flex min-h-screen items-center justify-center bg-surface-tertiary px-4 overflow-hidden">
      <AuthLogoPatternReveal />
      <div className="relative z-10 w-full flex items-center justify-center">
        {children}
      </div>
    </main>
  )
}
