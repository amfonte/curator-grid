import Link from "next/link"

export default function AuthErrorPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm text-center">
        <h1 className="text-lg font-semibold mb-2 text-foreground">Something went wrong</h1>
        <p className="text-sm text-muted-foreground mb-6">
          There was an error with your authentication request. Please try again.
        </p>
        <Link 
          href="/auth/login" 
          className="inline-block w-full py-2.5 px-4 border border-input bg-background text-foreground rounded-md text-sm font-medium hover:bg-accent text-center link-wavy-underline"
        >
          Back to sign in
        </Link>
      </div>
    </main>
  )
}
