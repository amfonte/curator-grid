"use client"

import React from "react"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FormField } from "@/components/ui/form-field"

const LOGO_LOCKUP_SRC = "/logo/curator-logo-lockup.svg"

type GateStatus = "loading" | "ready" | "invalid"

export default function ResetPasswordPage() {
  const router = useRouter()
  const [gate, setGate] = useState<GateStatus>("loading")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    let cancelled = false

    function onSession(session: { access_token: string } | null) {
      if (cancelled) return
      if (session) {
        clearTimeout(timeout)
        setGate("ready")
      }
    }

    const timeout = setTimeout(() => {
      void supabase.auth.getSession().then(({ data: { session } }) => {
        if (!cancelled && !session) {
          setGate("invalid")
        }
      })
    }, 12000)

    void supabase.auth.getSession().then(({ data: { session } }) => onSession(session))

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => onSession(session))

    return () => {
      cancelled = true
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, [])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const form = e.currentTarget
    const data = new FormData(form)
    const password = (data.get("password") as string) ?? ""
    const confirm = (data.get("confirm") as string) ?? ""
    if (password !== confirm) {
      setError("Passwords do not match")
      setLoading(false)
      return
    }
    const supabase = createClient()
    const { error: updateError } = await supabase.auth.updateUser({ password })
    if (updateError) {
      setError(updateError.message)
      setLoading(false)
      return
    }
    router.push("/dashboard")
    router.refresh()
  }

  return (
    <>
      <div
        id="auth-card"
        className="relative z-10 w-full max-w-[454px] flex flex-col gap-6 items-center bg-card rounded-3xl px-8 py-12 max-sm:px-5 max-sm:py-8 shadow-[0px_16px_16px_0px_rgba(0,0,0,0.05),0px_8px_8px_0px_rgba(0,0,0,0.05),0px_4px_4px_0px_rgba(0,0,0,0.05),0px_2px_2px_0px_rgba(0,0,0,0.05),0px_1px_1px_0px_rgba(0,0,0,0.05),0px_0px_0px_1px_rgba(0,0,0,0.05)]"
      >
        <div className="relative w-[100px] h-[107px] shrink-0">
          <Image
            src={LOGO_LOCKUP_SRC}
            alt="Curator"
            fill
            className="object-contain object-center"
            unoptimized
          />
        </div>
        <div className="flex flex-col gap-5 items-center w-full">
          {gate === "loading" && (
            <p className="text-base text-center text-muted-foreground">Verifying reset link…</p>
          )}

          {gate === "invalid" && (
            <>
              <p className="text-base text-center text-foreground">
                This reset link is invalid or has expired.
              </p>
              <p className="text-center text-base leading-6 text-muted-foreground">
                <Link
                  href="/auth/forgot-password"
                  className="text-foreground font-normal link-wavy-underline"
                >
                  Request a new link
                </Link>
                {" · "}
                <Link href="/auth/login" className="text-foreground font-normal link-wavy-underline">
                  Sign in
                </Link>
              </p>
            </>
          )}

          {gate === "ready" && (
            <>
              <p className="text-base text-center text-foreground">Choose a new password</p>

              <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full">
                {error && (
                  <div className="p-3 bg-destructive/10 text-destructive rounded-md text-sm">{error}</div>
                )}

                <FormField label="New password" htmlFor="password">
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="Min 6 characters"
                    required
                    minLength={6}
                    autoComplete="new-password"
                  />
                </FormField>

                <FormField label="Confirm password" htmlFor="confirm">
                  <Input
                    id="confirm"
                    name="confirm"
                    type="password"
                    placeholder="Re-enter password"
                    required
                    minLength={6}
                    autoComplete="new-password"
                  />
                </FormField>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Updating…" : "Update password"}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </>
  )
}
