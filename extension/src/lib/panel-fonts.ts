import font400 from "@fontsource/host-grotesk/files/host-grotesk-latin-400-normal.woff2?inline"
import font500 from "@fontsource/host-grotesk/files/host-grotesk-latin-500-normal.woff2?inline"

export const PANEL_FONT_FAMILY = '"Host Grotesk", ui-sans-serif, system-ui, sans-serif'

/** Quoted data URLs — unquoted semicolons in data: URIs break @font-face parsing. */
export const panelFontFaceCss = `
@font-face {
  font-family: "Host Grotesk";
  font-style: normal;
  font-display: swap;
  font-weight: 400;
  src: url("${font400}") format("woff2");
}
@font-face {
  font-family: "Host Grotesk";
  font-style: normal;
  font-display: swap;
  font-weight: 500;
  src: url("${font500}") format("woff2");
}
`

let fontsReady: Promise<void> | null = null

/** Register fonts on the document so they apply inside shadow DOM. */
export function ensurePanelFonts(): Promise<void> {
  if (!fontsReady) {
    fontsReady = loadPanelFonts()
  }
  return fontsReady
}

async function loadPanelFonts(): Promise<void> {
  const faces = [
    new FontFace("Host Grotesk", `url("${font400}")`, { weight: "400", style: "normal" }),
    new FontFace("Host Grotesk", `url("${font500}")`, { weight: "500", style: "normal" }),
  ]

  await Promise.all(
    faces.map(async (face) => {
      const loaded = await face.load()
      document.fonts.add(loaded)
    }),
  )
}
