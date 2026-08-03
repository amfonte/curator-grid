/** Max DPR for dissolve snapshots — keeps capture cost bounded on retina mobile. */
const SNAPSHOT_DPR_CAP = 2

/** Styles that affect raster output — skip the rest when inlining computed styles. */
const HTML_STYLE_PROPS = [
  "display",
  "position",
  "box-sizing",
  "width",
  "height",
  "min-width",
  "min-height",
  "max-width",
  "max-height",
  "top",
  "left",
  "right",
  "bottom",
  "margin",
  "padding",
  "border",
  "border-radius",
  "outline",
  "box-shadow",
  "background",
  "background-color",
  "background-image",
  "opacity",
  "visibility",
  "overflow",
  "transform",
  "transform-origin",
  "object-fit",
  "flex",
  "flex-direction",
  "flex-wrap",
  "flex-shrink",
  "flex-grow",
  "align-items",
  "justify-content",
  "align-self",
  "gap",
  "grid",
  "grid-template-columns",
  "grid-template-rows",
  "font",
  "font-family",
  "font-size",
  "font-weight",
  "font-style",
  "line-height",
  "letter-spacing",
  "text-align",
  "text-decoration",
  "color",
  "white-space",
  "aspect-ratio",
  "z-index",
  "-webkit-text-fill-color",
] as const

const SVG_STYLE_PROPS = ["fill", "stroke", "stroke-width", "opacity", "color", "transform"] as const

export interface PreparedSnapshot {
  dataUrl: string
  /** Pre-decoded image — ready to insert on dismiss without decode jank. */
  image: HTMLImageElement
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.decoding = "async"
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error("snapshot image load failed"))
    img.src = url
  })
}

function inlineComputedStyles(source: Element, target: Element): void {
  if (source instanceof HTMLElement && target instanceof HTMLElement) {
    const computed = getComputedStyle(source)
    for (const prop of HTML_STYLE_PROPS) {
      const value = computed.getPropertyValue(prop)
      if (value) {
        target.style.setProperty(prop, value, computed.getPropertyPriority(prop))
      }
    }
  }

  if (source instanceof SVGElement && target instanceof SVGElement) {
    const computed = getComputedStyle(source)
    for (const prop of SVG_STYLE_PROPS) {
      const value = computed.getPropertyValue(prop)
      if (value) target.style.setProperty(prop, value)
    }
    for (const attr of source.attributes) {
      if (attr.name === "class") continue
      target.setAttribute(attr.name, attr.value)
    }
  }

  const sourceChildren = source.children
  const targetChildren = target.children
  for (let i = 0; i < sourceChildren.length; i++) {
    const targetChild = targetChildren[i]
    if (targetChild) inlineComputedStyles(sourceChildren[i], targetChild)
  }
}

/**
 * Flatten the shell subtree to a PNG so filter/mask animate a single bitmap
 * instead of repainting live DOM (folder SVG, inputs, etc.) every frame.
 */
export async function captureElementSnapshot(element: HTMLElement): Promise<PreparedSnapshot | null> {
  const rect = element.getBoundingClientRect()
  const width = rect.width
  const height = rect.height
  if (width <= 0 || height <= 0) return null

  const dpr = Math.min(window.devicePixelRatio || 1, SNAPSHOT_DPR_CAP)
  const pixelWidth = Math.round(width * dpr)
  const pixelHeight = Math.round(height * dpr)

  const clone = element.cloneNode(true) as HTMLElement
  clone.querySelectorAll("script").forEach((node) => node.remove())
  inlineComputedStyles(element, clone)

  clone.style.width = `${width}px`
  clone.style.height = `${height}px`
  clone.style.margin = "0"
  clone.style.position = "relative"
  clone.style.boxSizing = "border-box"

  const serialized = new XMLSerializer().serializeToString(clone)
  const rootTag = clone.tagName.toLowerCase()
  const xhtml = serialized.includes('xmlns="http://www.w3.org/1999/xhtml"')
    ? serialized
    : serialized.replace(`<${rootTag}`, `<${rootTag} xmlns="http://www.w3.org/1999/xhtml"`)

  const svgMarkup = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${pixelWidth}" height="${pixelHeight}">`,
    `<foreignObject width="100%" height="100%" transform="scale(${dpr})">`,
    xhtml,
    "</foreignObject>",
    "</svg>",
  ].join("")

  const url = URL.createObjectURL(new Blob([svgMarkup], { type: "image/svg+xml;charset=utf-8" }))

  try {
    const svgImage = await loadImage(url)
    const canvas = document.createElement("canvas")
    canvas.width = pixelWidth
    canvas.height = pixelHeight
    const ctx = canvas.getContext("2d")
    if (!ctx) return null
    ctx.drawImage(svgImage, 0, 0, pixelWidth, pixelHeight)
    const dataUrl = canvas.toDataURL("image/png")

    const image = new Image()
    image.decoding = "sync"
    image.src = dataUrl
    if (!image.complete) {
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve()
        image.onerror = () => reject(new Error("snapshot decode failed"))
      })
    }

    return { dataUrl, image }
  } catch {
    return null
  } finally {
    URL.revokeObjectURL(url)
  }
}
