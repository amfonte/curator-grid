import {
  filenameFromImageUrl,
  isSaveableImageElement,
  resolveImageUrl,
} from "./image-url"
import { boundedStackEntranceDrift } from "./stack-image-bounds"
import {
  IMAGE_STACK_MAX_WIDTH_PX,
  randomStackEntranceDrift,
  randomStackRotation,
  stackScaleForNewImage,
} from "./image-stack"
import {
  buildPickBorderPath,
  PICK_BORDER_DASH_PERIOD,
  PICK_BORDER_GAP_LENGTH,
  PICK_BORDER_INSET_PX,
  PICK_BORDER_RADIUS_PX,
  PICK_BORDER_DASH_LENGTH,
  PICK_BADGE_BORDER_GAP_PX,
} from "./pick-border"

export type SelectedImage = {
  url: string
  filename: string
  /** Intrinsic pixels from the picked <img> (used for immediate stack sizing). */
  naturalWidth: number
  naturalHeight: number
  /** Stable stack order assigned when the image is first selected. */
  stackLayer: number
  /** Random tilt assigned when the image is first selected (-3.5° to 3.5°). */
  stackRotate: number
  /** Post-drop settle drift in px (assigned at pick). */
  stackEntranceDriftX: number
  stackEntranceDriftY: number
  /** Scale: 1.0 for the first image in the stack, then random (0.8–1.0). */
  stackScale: number
}

const PICK_STYLE_ID = "curator-extension-pick-styles"
const WRAP_CLASS = "curator-ext-pick-wrap"
const PICKABLE_CLASS = "curator-ext-pickable"
const HOVER_CLASS = "curator-ext-pick-hover"
const SELECTED_CLASS = "curator-ext-selected"

const CURATOR_ICON_PATH =
  "M15.2998 0C19.2763 0 22.5 3.22368 22.5 7.2002V9.30096C22.5 9.96371 21.9627 10.501 21.3 10.501H16.4998C15.8371 10.501 15.2998 9.96371 15.2998 9.30096V6.60059C15.2998 6.26921 15.0316 6.00098 14.7002 6.00098H9.2998C8.96858 6.00116 8.7002 6.26932 8.7002 6.60059V17.3486C8.70026 17.8522 9.28317 18.1317 9.67578 17.8164L11.624 16.25C11.8435 16.0736 12.1564 16.0737 12.376 16.25L14.3242 17.8164C14.7168 18.132 15.2997 17.8523 15.2998 17.3486V14.701C15.2998 14.0382 15.8371 13.501 16.4998 13.501H21.3C21.9627 13.501 22.5 14.0382 22.5 14.701V16.7998C22.5 20.7763 19.2763 24 15.2998 24H8.7002C4.72368 24 1.5 20.7763 1.5 16.7998V7.2002C1.5 3.22368 4.72368 0 8.7002 0H15.2998Z"

const pickStyles = `
  .${WRAP_CLASS} {
    position: relative;
    display: inline-block;
    line-height: 0;
    vertical-align: top;
    max-width: 100%;
    isolation: isolate;
  }
  .${WRAP_CLASS} > img.${PICKABLE_CLASS} {
    display: block;
    max-width: 100%;
  }
  .curator-ext-pick-border-svg {
    position: absolute;
    inset: ${PICK_BORDER_INSET_PX}px;
    width: calc(100% - ${PICK_BORDER_INSET_PX * 2}px);
    height: calc(100% - ${PICK_BORDER_INSET_PX * 2}px);
    pointer-events: none;
    z-index: 2;
    overflow: visible;
    display: none;
    mix-blend-mode: difference;
  }
  .curator-ext-pick-border-svg.is-visible {
    display: block;
  }
  .curator-ext-pick-border-path {
    fill: none;
    stroke: #ffffff;
    stroke-width: 2;
    stroke-linecap: butt;
    stroke-linejoin: round;
    stroke-dasharray: ${PICK_BORDER_DASH_LENGTH} ${PICK_BORDER_GAP_LENGTH};
    stroke-dashoffset: 0;
  }
  .curator-ext-pick-border-svg.is-hovered .curator-ext-pick-border-path {
    animation: curator-pick-march 0.65s linear infinite;
  }
  @keyframes curator-pick-march {
    to {
      stroke-dashoffset: -${PICK_BORDER_DASH_PERIOD}px;
    }
  }
  .curator-ext-pick-badge {
    position: absolute;
    top: ${PICK_BORDER_INSET_PX + PICK_BADGE_BORDER_GAP_PX}px;
    right: ${PICK_BORDER_INSET_PX + PICK_BADGE_BORDER_GAP_PX}px;
    width: 40px;
    height: 40px;
    border-radius: 24px;
    background: #ffffff;
    display: none;
    align-items: center;
    justify-content: center;
    pointer-events: none;
    z-index: 3;
    filter: none !important;
    mix-blend-mode: normal !important;
    opacity: 1 !important;
    visibility: visible !important;
    box-shadow:
      0 0 0 1px rgba(0, 0, 0, 0.05),
      0 2px 2px rgba(0, 0, 0, 0.05),
      0 4px 4px rgba(0, 0, 0, 0.05),
      0 8px 8px rgba(0, 0, 0, 0.05),
      0 16px 16px rgba(0, 0, 0, 0.05);
  }
  .curator-ext-pick-badge.is-visible {
    display: flex;
  }
  .curator-ext-pick-badge svg {
    width: 20px !important;
    height: 20px !important;
    display: block !important;
    flex-shrink: 0 !important;
    filter: none !important;
    mix-blend-mode: normal !important;
    opacity: 1 !important;
    visibility: visible !important;
  }
  .curator-ext-pick-badge svg path {
    fill: #262626 !important;
  }
  img.${PICKABLE_CLASS} {
    cursor: pointer !important;
  }
`

type SelectionListener = (selection: SelectedImage[]) => void

type ImageOverlay = {
  img: HTMLImageElement
  wrapper: HTMLDivElement
  borderSvg: SVGSVGElement
  path: SVGPathElement
  badge: HTMLDivElement
}

let active = false
let observer: MutationObserver | null = null
let trackedImages = new Set<HTMLImageElement>()
const overlays = new Map<HTMLImageElement, ImageOverlay>()
const hoveredImages = new Set<HTMLImageElement>()
const selectedByUrl = new Map<string, SelectedImage>()
const listeners = new Set<SelectionListener>()
let nextStackLayer = 0

function notifyListeners() {
  const selection = Array.from(selectedByUrl.values())
  for (const listener of listeners) {
    listener(selection)
  }
}

function ensureStyles() {
  if (document.getElementById(PICK_STYLE_ID)) return
  const style = document.createElement("style")
  style.id = PICK_STYLE_ID
  style.textContent = pickStyles
  document.head.appendChild(style)
}

function removeStyles() {
  document.getElementById(PICK_STYLE_ID)?.remove()
}

function isImageSelected(img: HTMLImageElement): boolean {
  const url = resolveImageUrl(img)
  return url != null && selectedByUrl.has(url)
}

function shouldShowOverlay(img: HTMLImageElement): boolean {
  return hoveredImages.has(img) || isImageSelected(img)
}

function syncOverlayState(img: HTMLImageElement) {
  const overlay = overlays.get(img)
  if (!overlay) return

  const visible = shouldShowOverlay(img)
  const hovered = visible && hoveredImages.has(img)

  overlay.borderSvg.classList.toggle("is-visible", visible)
  overlay.borderSvg.classList.toggle("is-hovered", hovered)
  overlay.badge.classList.toggle("is-visible", visible)
}

function updateOverlayGeometry(overlay: ImageOverlay) {
  const { img, borderSvg, path } = overlay
  const width = img.clientWidth - PICK_BORDER_INSET_PX * 2
  const height = img.clientHeight - PICK_BORDER_INSET_PX * 2

  if (width <= 0 || height <= 0) {
    borderSvg.classList.remove("is-visible", "is-hovered")
    overlay.badge.classList.remove("is-visible")
    return
  }

  borderSvg.setAttribute("viewBox", `0 0 ${width} ${height}`)
  path.setAttribute("d", buildPickBorderPath(width, height, PICK_BORDER_RADIUS_PX))
  syncOverlayState(img)
}

function wrapImage(img: HTMLImageElement): HTMLDivElement {
  const existing = img.parentElement
  if (existing?.classList.contains(WRAP_CLASS)) {
    return existing
  }

  const wrapper = document.createElement("div")
  wrapper.className = WRAP_CLASS

  const parent = img.parentNode
  if (!parent) return wrapper

  parent.insertBefore(wrapper, img)
  wrapper.appendChild(img)
  return wrapper
}

function unwrapImage(img: HTMLImageElement) {
  const wrapper = img.parentElement
  if (!wrapper?.classList.contains(WRAP_CLASS)) return

  wrapper.parentNode?.insertBefore(img, wrapper)
  wrapper.remove()
}

function createOverlay(img: HTMLImageElement): ImageOverlay {
  const wrapper = wrapImage(img)

  const borderSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg")
  borderSvg.classList.add("curator-ext-pick-border-svg")
  borderSvg.setAttribute("aria-hidden", "true")

  const path = document.createElementNS("http://www.w3.org/2000/svg", "path")
  path.classList.add("curator-ext-pick-border-path")
  borderSvg.appendChild(path)

  const badge = document.createElement("div")
  badge.className = "curator-ext-pick-badge"
  const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg")
  icon.setAttribute("viewBox", "0 0 24 24")
  icon.setAttribute("aria-hidden", "true")
  const iconPath = document.createElementNS("http://www.w3.org/2000/svg", "path")
  iconPath.setAttribute("d", CURATOR_ICON_PATH)
  icon.appendChild(iconPath)
  badge.appendChild(icon)

  wrapper.appendChild(borderSvg)
  wrapper.appendChild(badge)

  const overlay = { img, wrapper, borderSvg, path, badge }
  overlays.set(img, overlay)
  updateOverlayGeometry(overlay)
  return overlay
}

function removeOverlay(img: HTMLImageElement) {
  const overlay = overlays.get(img)
  if (!overlay) return

  overlay.borderSvg.remove()
  overlay.badge.remove()
  unwrapImage(img)
  overlays.delete(img)
}

function markPickable(img: HTMLImageElement) {
  if (!isSaveableImageElement(img)) return
  img.classList.add(PICKABLE_CLASS)
  trackedImages.add(img)
  if (!overlays.has(img)) {
    createOverlay(img)
  }
}

function unmarkPickable(img: HTMLImageElement) {
  img.classList.remove(PICKABLE_CLASS, HOVER_CLASS, SELECTED_CLASS)
  trackedImages.delete(img)
  hoveredImages.delete(img)
  removeOverlay(img)
}

function scanImages(root: ParentNode = document) {
  if (!active) return
  root.querySelectorAll("img").forEach((node) => {
    if (node instanceof HTMLImageElement) {
      markPickable(node)
    }
  })
}

function syncSelectedClasses() {
  for (const img of trackedImages) {
    img.classList.toggle(SELECTED_CLASS, isImageSelected(img))
    syncOverlayState(img)
  }
}

function handleMouseOver(event: MouseEvent) {
  if (!active) return
  const target = event.target
  if (!(target instanceof HTMLImageElement)) return
  if (!target.classList.contains(PICKABLE_CLASS)) return
  target.classList.add(HOVER_CLASS)
  hoveredImages.add(target)
  syncOverlayState(target)
}

function handleMouseOut(event: MouseEvent) {
  const target = event.target
  if (!(target instanceof HTMLImageElement)) return
  target.classList.remove(HOVER_CLASS)
  hoveredImages.delete(target)
  syncOverlayState(target)
}

function handleClick(event: MouseEvent) {
  if (!active) return
  const target = event.target
  if (!(target instanceof HTMLImageElement)) return
  if (!target.classList.contains(PICKABLE_CLASS)) return

  event.preventDefault()
  event.stopPropagation()

  const url = resolveImageUrl(target)
  if (!url) return

  if (selectedByUrl.has(url)) {
    selectedByUrl.delete(url)
    target.classList.remove(SELECTED_CLASS)
  } else {
    const isFirstInStack = selectedByUrl.size === 0
    const stackRotate = randomStackRotation()
    const stackScale = stackScaleForNewImage(isFirstInStack)
    const entranceDrift = boundedStackEntranceDrift(
      randomStackEntranceDrift(),
      target.naturalWidth || target.clientWidth,
      target.naturalHeight || target.clientHeight,
      stackRotate,
      stackScale,
      IMAGE_STACK_MAX_WIDTH_PX,
    )
    selectedByUrl.set(url, {
      url,
      filename: filenameFromImageUrl(url),
      naturalWidth: target.naturalWidth || target.clientWidth,
      naturalHeight: target.naturalHeight || target.clientHeight,
      stackLayer: nextStackLayer++,
      stackRotate,
      stackEntranceDriftX: entranceDrift.x,
      stackEntranceDriftY: entranceDrift.y,
      stackScale,
    })
    target.classList.add(SELECTED_CLASS)
  }

  syncOverlayState(target)
  notifyListeners()
}

function handleScroll() {
  for (const overlay of overlays.values()) {
    updateOverlayGeometry(overlay)
  }
}

function handleResize() {
  for (const overlay of overlays.values()) {
    updateOverlayGeometry(overlay)
  }
}

export function subscribeToImageSelection(listener: SelectionListener): () => void {
  listeners.add(listener)
  listener(Array.from(selectedByUrl.values()))
  return () => {
    listeners.delete(listener)
  }
}

export function getSelectedImages(): SelectedImage[] {
  return Array.from(selectedByUrl.values())
}

export function clearImageSelection() {
  selectedByUrl.clear()
  nextStackLayer = 0
  for (const img of trackedImages) {
    img.classList.remove(SELECTED_CLASS)
    syncOverlayState(img)
  }
  notifyListeners()
}

export function removeImageFromSelection(url: string) {
  if (!selectedByUrl.has(url)) return

  selectedByUrl.delete(url)
  for (const img of trackedImages) {
    if (resolveImageUrl(img) === url) {
      img.classList.remove(SELECTED_CLASS)
      syncOverlayState(img)
    }
  }
  notifyListeners()
}

export function startPickMode() {
  if (active) {
    scanImages()
    syncSelectedClasses()
    return
  }

  active = true
  ensureStyles()
  scanImages()

  document.addEventListener("mouseover", handleMouseOver, true)
  document.addEventListener("mouseout", handleMouseOut, true)
  document.addEventListener("click", handleClick, true)
  window.addEventListener("scroll", handleScroll, true)
  window.addEventListener("resize", handleResize, true)

  observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      mutation.addedNodes.forEach((node) => {
        if (node instanceof HTMLImageElement) {
          markPickable(node)
          syncSelectedClasses()
        } else if (node instanceof HTMLElement) {
          scanImages(node)
          syncSelectedClasses()
        }
      })
      mutation.removedNodes.forEach((node) => {
        if (node instanceof HTMLImageElement) {
          unmarkPickable(node)
        } else if (node instanceof HTMLElement) {
          node.querySelectorAll("img").forEach((img) => {
            if (img instanceof HTMLImageElement && !document.contains(img)) {
              unmarkPickable(img)
            }
          })
        }
      })
    }
  })

  observer.observe(document.documentElement, { childList: true, subtree: true })
  notifyListeners()
}

export function stopPickMode() {
  if (!active) return

  active = false
  document.removeEventListener("mouseover", handleMouseOver, true)
  document.removeEventListener("mouseout", handleMouseOut, true)
  document.removeEventListener("click", handleClick, true)
  window.removeEventListener("scroll", handleScroll, true)
  window.removeEventListener("resize", handleResize, true)
  observer?.disconnect()
  observer = null

  for (const img of [...trackedImages]) {
    unmarkPickable(img)
  }
  trackedImages = new Set()
  hoveredImages.clear()
  overlays.clear()
  removeStyles()
}

export function isPickModeActive(): boolean {
  return active
}
