import { NextResponse } from "next/server"
import { extensionUnauthorized, getExtensionAuth } from "@/lib/extension/auth"

export async function GET(request: Request) {
  const auth = await getExtensionAuth(request)
  if (!auth) return extensionUnauthorized()

  const { data: boards, error } = await auth.supabase
    .from("boards")
    .select("id, name")
    .order("created_at", { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ boards: boards ?? [] })
}
