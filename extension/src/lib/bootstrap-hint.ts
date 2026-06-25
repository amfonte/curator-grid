import { clearCachedBoards, getCachedBoards, getCachedHasCollections, setCachedBoards } from "./boards-cache"
import { sendBackgroundMessage, type ExtensionBoard } from "./messaging"

export type BootstrapSkeleton = "auth" | "main" | "no-collections"

export type BootstrapHint = {
  skeleton: BootstrapSkeleton
  cachedBoards: ExtensionBoard[] | null
}

export function canHydrateFromHint(hint: BootstrapHint): boolean {
  return hint.skeleton !== "auth" && hint.cachedBoards !== null
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

  const [cachedBoards, cachedCollections] = await Promise.all([
    getCachedBoards(),
    getCachedHasCollections(),
  ])

  const isAuthenticated =
    authResponse.ok && authResponse.data.status === "authenticated"

  if (!isAuthenticated) {
    if (cachedBoards !== null) {
      await clearCachedBoards()
    }
    return { skeleton: "auth", cachedBoards: null }
  }

  if (cachedCollections === false) {
    return { skeleton: "no-collections", cachedBoards }
  }

  if (cachedCollections === true) {
    return { skeleton: "main", cachedBoards }
  }

  // Authenticated but no cached boards — fetch once so skeleton matches account state.
  const boardsResponse = await sendBackgroundMessage({ type: "GET_BOARDS" })
  if (boardsResponse.ok) {
    await setCachedBoards(boardsResponse.data.boards)
    return {
      skeleton: bootstrapSkeletonFromBoards(boardsResponse.data.boards),
      cachedBoards: boardsResponse.data.boards,
    }
  }

  return { skeleton: "main", cachedBoards: null }
}
