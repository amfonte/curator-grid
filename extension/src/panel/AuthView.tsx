import { useState, type FormEvent } from "react"
import { curatorWebUrl } from "../lib/config"

type AuthViewProps = {
  error: string | null
  onSignIn: (email: string, password: string) => Promise<void>
}

export function AuthView({ error, onSignIn }: AuthViewProps) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    await onSignIn(email, password)
    setLoading(false)
  }

  return (
    <div className="flex flex-col items-center">
      <img
        src={chrome.runtime.getURL("assets/curator-logo-lockup.svg")}
        alt="Curator"
        className="h-[80px] w-[75px] object-contain"
      />

      <p className="mt-6 text-center text-base text-foreground">
        Sign in to your inspiration board
      </p>

      <form onSubmit={handleSubmit} className="mt-5 flex w-full flex-col gap-5">
        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
        )}

        <FormField label="Email" htmlFor="email">
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            autoComplete="email"
            className="form-field-input"
          />
        </FormField>

        <div className="flex flex-col gap-2">
          <FormField label="Password" htmlFor="password">
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your password"
              required
              autoComplete="current-password"
              className="form-field-input"
            />
          </FormField>
          <div className="flex justify-end">
            <a
              href={curatorWebUrl("/auth/forgot-password")}
              target="_blank"
              rel="noreferrer"
              className="link-wavy-underline text-base leading-6 text-foreground font-normal"
            >
              Forgot password?
            </a>
          </div>
        </div>

        <button type="submit" className="cta-primary w-full" disabled={loading}>
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p className="mt-5 text-center text-base leading-6 text-muted-foreground">
        {"Don't have an account? "}
        <a
          href={curatorWebUrl("/auth/sign-up")}
          target="_blank"
          rel="noreferrer"
          className="link-wavy-underline font-normal text-foreground"
        >
          Sign up
        </a>
      </p>
    </div>
  )
}

type FormFieldProps = {
  label: string
  htmlFor: string
  children: React.ReactNode
}

function FormField({ label, htmlFor, children }: FormFieldProps) {
  return (
    <div className="form-field flex flex-col gap-2">
      <label htmlFor={htmlFor} className="text-base font-normal leading-6 text-foreground">
        {label}
      </label>
      {children}
    </div>
  )
}
