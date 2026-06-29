export const EXTENSION_PROMO_DISMISSED_KEY = "curator.extensionPromo.dismissed"

/** Dispatched on `document` when the Curator extension content script loads on this page. */
export const EXTENSION_INSTALLED_EVENT = "curator-extension-installed"

export const EXTENSION_DATASET_KEY = "curatorExtension"
export const EXTENSION_DATASET_VALUE = "installed"
/** HTML attribute written by the extension content script (`dataset.curatorExtension`). */
export const EXTENSION_DATASET_ATTR = "data-curator-extension"

export function isExtensionPromoDismissed(): boolean {
  if (typeof window === "undefined") return false
  try {
    return localStorage.getItem(EXTENSION_PROMO_DISMISSED_KEY) === "1"
  } catch {
    return false
  }
}

/** True when the extension content script has marked this page (current tab only). */
export function isExtensionPresentOnPage(): boolean {
  if (typeof document === "undefined") return false
  return document.documentElement.dataset[EXTENSION_DATASET_KEY] === EXTENSION_DATASET_VALUE
}

export function shouldShowExtensionPromoToast(): boolean {
  return !isExtensionPromoDismissed() && !isExtensionPresentOnPage()
}
