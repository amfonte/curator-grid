import type { ExtensionBoard } from "./messaging"

const BOARDS_CACHE_KEY = "curator_extension_boards_cache"

export function hasSelectableCollections(boards: ExtensionBoard[]): boolean {
  return boards.some((board) => board.name.toLowerCase() !== "unsorted")
}

export async function getCachedBoards(): Promise<ExtensionBoard[] | null> {
  const result = await chrome.storage.local.get(BOARDS_CACHE_KEY)
  const raw = result[BOARDS_CACHE_KEY]
  if (!Array.isArray(raw)) return null

  const boards = raw.filter(
    (board): board is ExtensionBoard =>
      typeof board === "object" &&
      board !== null &&
      typeof board.id === "string" &&
      typeof board.name === "string",
  )

  return boards
}

export async function setCachedBoards(boards: ExtensionBoard[]): Promise<void> {
  await chrome.storage.local.set({ [BOARDS_CACHE_KEY]: boards })
}

export async function clearCachedBoards(): Promise<void> {
  await chrome.storage.local.remove(BOARDS_CACHE_KEY)
}

export async function getCachedHasCollections(): Promise<boolean | null> {
  const boards = await getCachedBoards()
  if (boards === null) return null
  return hasSelectableCollections(boards)
}
