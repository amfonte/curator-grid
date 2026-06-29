import { clearCachedBoards, getCachedBoards, setCachedBoards } from "./boards-cache"
import { sendBackgroundMessage, type ExtensionBoard } from "./messaging"

export type BootstrapSkeleton = "auth" | "main" | "no-collections"

export type BootstrapHint = {
  skeleton: BootstrapSkeleton
  cachedBoards: ExtensionBoard[] | null
}

export function bootstrapSkeletonFromBoards(
  boards: { name: string }[],
): "main" | "no-collections" {
  const hasCollections = boards.some((board) => board.name.toLowerCase() !== "unsorted")
  return hasCollections ? "main" : "no-collections"
}

/** Fast local checks — uses live auth state so stale cache never skips the auth screen. */
export async function resolveBootstrapHint(): Promise<BootstrapHint> {
  let authResponse: Awaited<ReturnType<typeof sendBackgroundMessage<"GET_AUTH_STATE">>>
  try {
    authResponse = await sendBackgroundMessage({ type: "GET_AUTH_STATE" })
  } catch {
    return { skeleton: "auth", cachedBoards: null }
  }

  const cachedBoards = await getCachedBoards()

  const isAuthenticated =
    authResponse.ok && authResponse.data.status === "authenticated"

  if (!isAuthenticated) {
    if (cachedBoards !== null) {
      await clearCachedBoards()
    }
    return { skeleton: "auth", cachedBoards: null }
  }

  // Always show the main save skeleton while loading — never flash "no collections"
  // from stale cache before fresh boards arrive.
  if (cachedBoards !== null) {
    return { skeleton: "main", cachedBoards }
  }

  const boardsResponse = await sendBackgroundMessage({ type: "GET_BOARDS" })
  if (boardsResponse.ok) {
    await setCachedBoards(boardsResponse.data.boards)
    return {
      skeleton: "main",
      cachedBoards: boardsResponse.data.boards,
    }
  }

  return { skeleton: "main", cachedBoards: null }
}
