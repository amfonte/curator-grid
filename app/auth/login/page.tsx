"use client"

import React from "react"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { login } from "@/app/auth/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FormField } from "@/components/ui/form-field"

// Local logo assets from /public
const LOGO_LOCKUP_SRC = "/logo/curator-logo-lockup.svg"

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const formData = new FormData(e.currentTarget)
    const result = await login(formData)
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
  }

  return (
    <>
      <div id="auth-card" className="relative z-10 w-full max-w-[454px] flex flex-col gap-6 items-center bg-card rounded-3xl px-8 py-12 max-sm:px-5 max-sm:py-8 shadow-[0px_16px_16px_0px_rgba(0,0,0,0.05),0px_8px_8px_0px_rgba(0,0,0,0.05),0px_4px_4px_0px_rgba(0,0,0,0.05),0px_2px_2px_0px_rgba(0,0,0,0.05),0px_1px_1px_0px_rgba(0,0,0,0.05),0px_0px_0px_1px_rgba(0,0,0,0.05)]">
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
          <p className="text-base text-center text-foreground">Sign in to your inspiration board</p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full">
            {error && (
              <div className="p-3 bg-destructive/10 text-destructive rounded-md text-sm">{error}</div>
            )}

            <FormField label="Email" htmlFor="email">
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                required
                autoComplete="email"
              />
            </FormField>

            <FormField label="Password" htmlFor="password">
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Your password"
                required
                autoComplete="current-password"
              />
            </FormField>

            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>

          <p className="text-center text-base leading-6 text-muted-foreground">
            {"Don't have an account? "}
            <Link href="/auth/sign-up" className="text-foreground font-normal link-wavy-underline">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </>
  )
}
