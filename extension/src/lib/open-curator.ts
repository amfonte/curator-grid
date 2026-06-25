import { curatorWebUrl } from "./config"
import { sendBackgroundMessage } from "./messaging"

export async function openCuratorSignedIn(path: string): Promise<void> {
  const response = await sendBackgroundMessage({ type: "OPEN_CURATOR_SIGNED_IN", path })
  if (!response.ok) {
    chrome.tabs.create({ url: curatorWebUrl(path) })
  }
}
