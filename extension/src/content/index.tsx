import { createRoot, type Root } from "react-dom/client"
import { isCuratorOrigin } from "../lib/config"
import { markExtensionInstalledOnPage } from "../lib/promo-toast"
import { resolveBootstrapHint } from "../lib/bootstrap-hint"
import { ensurePanelFonts, panelFontFaceCss } from "../lib/panel-fonts"
import { stopPickMode } from "../lib/pick-mode"
import { PanelApp } from "../panel/PanelApp"
import panelStyles from "../styles/panel.css?inline"

const PANEL_HOST_ID = "curator-extension-host"
const PANEL_FONT_STYLE_ID = "curator-extension-font-faces"

if (isCuratorOrigin(window.location.href)) {
  markExtensionInstalledOnPage()
}

let panelRoot: Root | null = null
let shadowHost: HTMLElement | null = null
let isOpen = false
let panelGeneration = 0

async function resolveInitialHint() {
  try {
    return await resolveBootstrapHint()
  } catch (error) {
    console.error("[Curator extension] Failed to resolve bootstrap hint:", error)
    return { skeleton: "auth" as const, cachedBoards: null }
  }
}

async function ensurePanelMounted() {
  if (shadowHost && panelRoot) return

  void ensurePanelFonts()

  const initialHint = await resolveInitialHint()

  if (!document.getElementById(PANEL_FONT_STYLE_ID)) {
    const documentFontStyle = document.createElement("style")
    documentFontStyle.id = PANEL_FONT_STYLE_ID
    documentFontStyle.textContent = panelFontFaceCss
    document.head.appendChild(documentFontStyle)
  }

  shadowHost = document.createElement("div")
  shadowHost.id = PANEL_HOST_ID
  shadowHost.style.cssText =
    "all:initial;position:fixed;inset:0;z-index:2147483647;pointer-events:none;"
  document.documentElement.appendChild(shadowHost)

  const shadow = shadowHost.attachShadow({ mode: "open" })

  const styleEl = document.createElement("style")
  styleEl.textContent = panelFontFaceCss + panelStyles
  shadow.appendChild(styleEl)

  const mountPoint = document.createElement("div")
  mountPoint.id = "curator-extension-panel-root"
  shadow.appendChild(mountPoint)

  panelRoot = createRoot(mountPoint)
  panelGeneration += 1
  panelRoot.render(
    <PanelApp
      key={panelGeneration}
      initialHint={initialHint}
      onClose={hidePanel}
    />,
  )
}

function hidePanel() {
  stopPickMode()
  if (shadowHost) {
    shadowHost.style.display = "none"
  }
  isOpen = false
}

async function showPanel() {
  if (!panelRoot) {
    await ensurePanelMounted()
  } else {
    const initialHint = await resolveInitialHint()
    panelGeneration += 1
    panelRoot.render(
      <PanelApp
        key={panelGeneration}
        initialHint={initialHint}
        onClose={hidePanel}
      />,
    )
  }

  if (!panelRoot) return

  isOpen = true
  if (shadowHost) {
    shadowHost.style.display = ""
  }
}

function togglePanel() {
  if (isOpen) {
    hidePanel()
    return
  }

  void showPanel()
}

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === "TOGGLE_PANEL") {
    togglePanel()
  }
  if (message?.type === "CLOSE_PANEL") {
    hidePanel()
  }
})

export {}
