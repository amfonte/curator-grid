import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js"

export type ExtensionAuthContext = {
  user: User
  supabase: SupabaseClient
  accessToken: string
}

export async function getExtensionAuth(
  request: Request,
): Promise<ExtensionAuthContext | null> {
  const authHeader = request.headers.get("Authorization")
  if (!authHeader?.startsWith("Bearer ")) return null

  const accessToken = authHeader.slice("Bearer ".length).trim()
  if (!accessToken) return null

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    },
  )

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(accessToken)

  if (error || !user) return null

  return { user, supabase, accessToken }
}

export function extensionUnauthorized() {
  return Response.json({ error: "Unauthorized" }, { status: 401 })
}
