/**
 * Keep event/dataset values in sync with `lib/extension/promo-toast.ts`.
 * Ask the background worker to mark the page in the MAIN world (see mark-curator-page-installed.ts).
 */
export function markExtensionInstalledOnPage(): void {
  void chrome.runtime.sendMessage({ type: "MARK_CURATOR_PAGE_INSTALLED" })
}
