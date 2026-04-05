import { createClient } from "@/lib/supabase/server"
import { redirect, notFound } from "next/navigation"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"

interface PageProps {
  params: Promise<{ id: string }>
}

/** params is awaited before use. The "params are being enumerated" console warning
 * in dev comes from the Next.js overlay inspecting props, not from this component. */
export default async function CollectionPage({ params }: PageProps) {
  const { id: boardId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const [{ data: boards }, { data: items }, { data: board }] = await Promise.all([
    supabase.from("boards").select("*, item_boards(count)").order("created_at", { ascending: true }),
    supabase.from("items").select("*, item_boards(board_id)").order("created_at", { ascending: false }),
    supabase.from("boards").select("*").eq("id", boardId).single(),
  ])

  if (!board || board.user_id !== user.id) notFound()

  return (
    <DashboardShell
      user={user}
      boardName={board.name}
      initialGridColumns={
        typeof board.grid_columns === "number" && Number.isFinite(board.grid_columns)
          ? board.grid_columns
          : undefined
      }
      initialBoards={(boards ?? []).map((b) => ({
        ...b,
        item_count: b.item_boards?.[0]?.count ?? 0,
      }))}
      initialItems={items ?? []}
      boardId={boardId}
    />
  )
}
