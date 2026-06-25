export function isAuthFailureMessage(error: string): boolean {
  const lower = error.toLowerCase()
  return (
    lower.includes("not authenticated") ||
    lower.includes("unauthorized") ||
    lower.includes("401")
  )
}
