import { CURATOR_ORIGINS } from "./config"

/** Keep in sync with `lib/extension/promo-toast.ts`. */
const INSTALLED_EVENT = "curator-extension-installed"

/**
 * Mark the Curator web app in the page (MAIN) world so React can hear events and
 * read the dataset. Content scripts alone run in an isolated world.
 */
export async function markCuratorTabInstalled(tabId: number): Promise<void> {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      world: "MAIN",
      func: (eventName: string) => {
        document.documentElement.dataset.curatorExtension = "installed"
        document.dispatchEvent(new CustomEvent(eventName))
      },
      args: [INSTALLED_EVENT],
    })
  } catch {
    // Tab may be unavailable (e.g. chrome:// page, discarded tab).
  }
}

export async function markAllOpenCuratorTabsInstalled(): Promise<void> {
  const urlPatterns = CURATOR_ORIGINS.map((origin) => `${origin}/*`)
  const tabs = await chrome.tabs.query({ url: urlPatterns })

  await Promise.all(
    tabs.map((tab) => (tab.id != null ? markCuratorTabInstalled(tab.id) : Promise.resolve())),
  )
}
