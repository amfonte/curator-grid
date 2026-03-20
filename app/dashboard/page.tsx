import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { DashboardHome } from "@/components/dashboard/dashboard-home"

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const { data: boards } = await supabase
    .from("boards")
    .select("*, item_boards(count)")
    .order("created_at", { ascending: true })

  return (
    <DashboardHome
      user={user}
      initialBoards={(boards ?? []).map((b) => ({
        ...b,
        item_count: b.item_boards?.[0]?.count ?? 0,
      }))}
    />
  )
}
