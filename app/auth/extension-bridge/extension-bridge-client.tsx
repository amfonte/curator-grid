"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

function safeNextPath(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/dashboard"
  }
  return value
}

export function ExtensionBridgeClient() {
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const nextPath = safeNextPath(searchParams.get("next"))
    const hash = window.location.hash.startsWith("#")
      ? window.location.hash.slice(1)
      : window.location.hash
    const params = new URLSearchParams(hash)
    const accessToken = params.get("access_token")
    const refreshToken = params.get("refresh_token")
    const supabase = createClient()

    if (!accessToken || !refreshToken) {
      void supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) {
          window.location.replace(nextPath)
          return
        }
        setError("Missing extension session. Open Curator from the extension again.")
      })
      return
    }

    void supabase.auth
      .setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      })
      .then(({ error: sessionError }) => {
        window.history.replaceState(null, "", `/auth/extension-bridge?next=${encodeURIComponent(nextPath)}`)

        if (sessionError) {
          setError(sessionError.message)
          return
        }

        window.location.replace(nextPath)
      })
  }, [searchParams])

  if (error) {
    return (
      <div className="w-full max-w-[375px] rounded-3xl bg-card px-6 py-8 text-center shadow-panel">
        <p className="text-base text-foreground">{error}</p>
      </div>
    )
  }

  return (
    <div className="w-full max-w-[375px] rounded-3xl bg-card px-6 py-8 text-center shadow-panel">
      <p className="text-base text-muted-foreground">Signing you in to Curator…</p>
    </div>
  )
}
