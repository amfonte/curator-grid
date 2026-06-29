/** Chrome Web Store listing for the Curator browser extension. */
export const CHROME_EXTENSION_STORE_URL =
  "https://chromewebstore.google.com/detail/curator/icmifajloddnboiedidaaadhaibgnbca"

export function getChromeExtensionStoreUrl(): string {
  return process.env.NEXT_PUBLIC_CHROME_EXTENSION_URL?.trim() || CHROME_EXTENSION_STORE_URL
}
