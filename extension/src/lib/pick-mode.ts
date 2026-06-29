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
  PICK_BADGE_BORDER_GAP_PX,
  PICK_BORDER_DASH_LENGTH,
  PICK_BORDER_DASH_PERIOD,
  PICK_BORDER_GAP_LENGTH,
  PICK_BORDER_INSET_PX,
  PICK_BORDER_RADIUS_PX,
} from "./pick-border"

export type SelectedImage = {
  url: string
  filename: string
  naturalWidth: number
  naturalHeight: number
  stackLayer: number
  stackRotate: number
  stackEntranceDriftX: number
  stackEntranceDriftY: number
  stackScale: number
}

const PICK_STYLE_ID = "curator-extension-pick-styles"
const EXTENSION_HOST_ID = "curator-extension-host"
const PICKABLE_CLASS = "curator-ext-pickable"
const SELECTED_CLASS = "curator-ext-selected"

const CURATOR_ICON_PATH =
  "M15.2998 0C19.2763 0 22.5 3.22368 22.5 7.2002V9.30096C22.5 9.96371 21.9627 10.501 21.3 10.501H16.4998C15.8371 10.501 15.2998 9.96371 15.2998 9.30096V6.60059C15.2998 6.26921 15.0316 6.00098 14.7002 6.00098H9.2998C8.96858 6.00116 8.7002 6.26932 8.7002 6.60059V17.3486C8.70026 17.8522 9.28317 18.1317 9.67578 17.8164L11.624 16.25C11.8435 16.0736 12.1564 16.0737 12.376 16.25L14.3242 17.8164C14.7168 18.132 15.2997 17.8523 15.2998 17.3486V14.701C15.2998 14.0382 15.8371 13.501 16.4998 13.501H21.3C21.9627 13.501 22.5 14.0382 22.5 14.701V16.7998C22.5 20.7763 19.2763 24 15.2998 24H8.7002C4.72368 24 1.5 20.7763 1.5 16.7998V7.2002C1.5 3.22368 4.72368 0 8.7002 0H15.2998Z"

const pickStyles = `
  .curator-ext-pick-overlay {
    position: absolute;
    pointer-events: none;
    box-sizing: border-box;
    overflow: visible;
  }
  .curator-ext-pick-border-svg {
    position: absolute;
    inset: ${PICK_BORDER_INSET_PX}px;
    width: calc(100% - ${PICK_BORDER_INSET_PX * 2}px);
    height: calc(100% - ${PICK_BORDER_INSET_PX * 2}px);
    pointer-events: none;
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
  root: HTMLDivElement
  borderSvg: SVGSVGElement
  path: SVGPathElement
  badge: HTMLDivElement
}

type SelectedEntry = {
  img: HTMLImageElement
}

let active = false
let hoveredImg: HTMLImageElement | null = null
const selectedByUrl = new Map<string, SelectedImage>()
const selectedEntries = new Map<string, SelectedEntry>()
const overlays = new Map<HTMLImageElement, ImageOverlay>()
const listeners = new Set<SelectionListener>()
let nextStackLayer = 0
let pointerRaf = 0
let syncRaf = 0
let lastPointerX = 0
let lastPointerY = 0

function notifyListeners() {
  for (const listener of listeners) {
    listener(Array.from(selectedByUrl.values()))
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

function isCuratorUiElement(element: Element): boolean {
  const root = element.getRootNode()
  if (root instanceof ShadowRoot && root.host.id === EXTENSION_HOST_ID) {
    return true
  }

  return element.closest(`#${EXTENSION_HOST_ID}`) != null
}

function isPointerOverCuratorUi(x: number, y: number): boolean {
  const host = document.getElementById(EXTENSION_HOST_ID)
  if (!host || host.style.display === "none") return false

  for (const node of document.elementsFromPoint(x, y)) {
    if (node instanceof Element && isCuratorUiElement(node)) {
      return true
    }
  }
  return false
}

function isImageSelected(img: HTMLImageElement): boolean {
  const url = resolveImageUrl(img)
  return url != null && selectedByUrl.has(url)
}

function pointInRect(x: number, y: number, rect: DOMRect): boolean {
  return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom
}

function shouldShowOverlay(img: HTMLImageElement): boolean {
  return hoveredImg === img || isImageSelected(img)
}

function syncOverlayState(img: HTMLImageElement) {
  const overlay = overlays.get(img)
  if (!overlay) return

  const visible = shouldShowOverlay(img)
  const hovered = visible && hoveredImg === img
  overlay.borderSvg.classList.toggle("is-visible", visible)
  overlay.borderSvg.classList.toggle("is-hovered", hovered)
  overlay.badge.classList.toggle("is-visible", visible)
}

function updateOverlayGeometry(overlay: ImageOverlay) {
  const { img, root, borderSvg, path } = overlay
  const rect = img.getBoundingClientRect()
  const width = rect.width - PICK_BORDER_INSET_PX * 2
  const height = rect.height - PICK_BORDER_INSET_PX * 2

  if (width <= 0 || height <= 0) {
    root.hidden = true
    borderSvg.classList.remove("is-visible", "is-hovered")
    overlay.badge.classList.remove("is-visible")
    return
  }

  root.hidden = false
  root.style.top = `${rect.top + window.scrollY}px`
  root.style.left = `${rect.left + window.scrollX}px`
  root.style.width = `${rect.width}px`
  root.style.height = `${rect.height}px`
  borderSvg.setAttribute("viewBox", `0 0 ${width} ${height}`)
  path.setAttribute("d", buildPickBorderPath(width, height, PICK_BORDER_RADIUS_PX))
  syncOverlayState(img)
}

function createOverlay(img: HTMLImageElement): ImageOverlay {
  const root = document.createElement("div")
  root.className = "curator-ext-pick-overlay"

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

  root.appendChild(borderSvg)
  root.appendChild(badge)
  document.body.appendChild(root)

  const overlay = { img, root, borderSvg, path, badge }
  overlays.set(img, overlay)
  updateOverlayGeometry(overlay)
  return overlay
}

function ensureOverlay(img: HTMLImageElement): ImageOverlay {
  const overlay = overlays.get(img)
  if (overlay) {
    updateOverlayGeometry(overlay)
    return overlay
  }
  return createOverlay(img)
}

function removeOverlay(img: HTMLImageElement) {
  const overlay = overlays.get(img)
  if (!overlay) return

  overlay.root.remove()
  overlays.delete(img)
}

function imageUnderPointer(x: number, y: number): HTMLImageElement | null {
  if (isPointerOverCuratorUi(x, y)) return null

  if (hoveredImg && pointInRect(x, y, hoveredImg.getBoundingClientRect())) {
    if (document.contains(hoveredImg) && isSaveableImageElement(hoveredImg)) {
      return hoveredImg
    }
  }

  for (const entry of selectedEntries.values()) {
    if (!document.contains(entry.img)) continue
    if (!pointInRect(x, y, entry.img.getBoundingClientRect())) continue
    if (isSaveableImageElement(entry.img)) return entry.img
  }

  const stack = document.elementsFromPoint(x, y).filter(
    (node): node is Element =>
      node instanceof Element && !isCuratorUiElement(node),
  )

  for (const node of stack) {
    if (node instanceof HTMLImageElement && isSaveableImageElement(node)) {
      return node
    }
  }

  let current: Element | null = stack[0] ?? null
  while (
    current &&
    current !== document.body &&
    current !== document.documentElement
  ) {
    for (const img of current.querySelectorAll("img")) {
      if (!(img instanceof HTMLImageElement)) continue
      if (!pointInRect(x, y, img.getBoundingClientRect())) continue
      if (isSaveableImageElement(img)) return img
    }
    current = current.parentElement
  }

  return null
}

function clearHoverState() {
  const previousHoveredImg = hoveredImg
  hoveredImg = null

  if (previousHoveredImg) {
    previousHoveredImg.classList.remove(PICKABLE_CLASS)
    if (isImageSelected(previousHoveredImg)) {
      syncOverlayState(previousHoveredImg)
    } else {
      removeOverlay(previousHoveredImg)
    }
  }
}

function setHoveredImage(img: HTMLImageElement | null) {
  if (img === hoveredImg) {
    return
  }

  clearHoverState()
  if (!img || !active) return

  img.classList.add(PICKABLE_CLASS)
  hoveredImg = img
  ensureOverlay(img)
  syncOverlayState(img)
}

function updateHoverFromPointer() {
  pointerRaf = 0
  if (!active) return

  const img = imageUnderPointer(lastPointerX, lastPointerY)
  if (!img) {
    clearHoverState()
    return
  }

  setHoveredImage(img)
}

function handlePointerMove(event: PointerEvent) {
  if (!active) return
  lastPointerX = event.clientX
  lastPointerY = event.clientY
  if (pointerRaf) return
  pointerRaf = requestAnimationFrame(updateHoverFromPointer)
}

function syncOverlayPositions() {
  for (const [img, overlay] of overlays) {
    if (document.contains(img)) {
      updateOverlayGeometry(overlay)
    } else {
      removeOverlay(img)
    }
  }
}

function scheduleOverlaySync() {
  if (syncRaf) return
  syncRaf = requestAnimationFrame(() => {
    syncRaf = 0
    if (!active) return
    syncOverlayPositions()
  })
}

function mountSelectedOverlay(url: string, img: HTMLImageElement) {
  img.classList.add(SELECTED_CLASS)
  ensureOverlay(img)
  syncOverlayState(img)
  selectedEntries.set(url, { img })
}

function removeSelectedOverlay(url: string) {
  const entry = selectedEntries.get(url)
  if (!entry) return
  entry.img.classList.remove(SELECTED_CLASS)
  if (hoveredImg === entry.img) {
    syncOverlayState(entry.img)
  } else {
    removeOverlay(entry.img)
  }
  selectedEntries.delete(url)
}

function handleClick(event: MouseEvent) {
  if (!active) return

  const img = imageUnderPointer(event.clientX, event.clientY)
  if (!img || !isSaveableImageElement(img)) return

  event.preventDefault()
  event.stopPropagation()

  const url = resolveImageUrl(img)
  if (!url) return

  if (selectedByUrl.has(url)) {
    selectedByUrl.delete(url)
    removeSelectedOverlay(url)
  } else {
    const isFirstInStack = selectedByUrl.size === 0
    const stackRotate = randomStackRotation()
    const stackScale = stackScaleForNewImage(isFirstInStack)
    const entranceDrift = boundedStackEntranceDrift(
      randomStackEntranceDrift(),
      img.naturalWidth || img.clientWidth,
      img.naturalHeight || img.clientHeight,
      stackRotate,
      stackScale,
      IMAGE_STACK_MAX_WIDTH_PX,
    )
    selectedByUrl.set(url, {
      url,
      filename: filenameFromImageUrl(url),
      naturalWidth: img.naturalWidth || img.clientWidth,
      naturalHeight: img.naturalHeight || img.clientHeight,
      stackLayer: nextStackLayer++,
      stackRotate,
      stackEntranceDriftX: entranceDrift.x,
      stackEntranceDriftY: entranceDrift.y,
      stackScale,
    })
    mountSelectedOverlay(url, img)
  }

  notifyListeners()
}

export function subscribeToImageSelection(listener: SelectionListener): () => void {
  listeners.add(listener)
  listener(Array.from(selectedByUrl.values()))
  return () => listeners.delete(listener)
}

export function getSelectedImages(): SelectedImage[] {
  return Array.from(selectedByUrl.values())
}

export function clearImageSelection() {
  for (const url of [...selectedByUrl.keys()]) removeSelectedOverlay(url)
  selectedByUrl.clear()
  nextStackLayer = 0
  notifyListeners()
}

export function removeImageFromSelection(url: string) {
  if (!selectedByUrl.has(url)) return
  selectedByUrl.delete(url)
  removeSelectedOverlay(url)
  notifyListeners()
}

export function startPickMode() {
  if (active) return

  active = true
  ensureStyles()

  document.addEventListener("pointermove", handlePointerMove, true)
  document.addEventListener("click", handleClick, true)
  window.addEventListener("scroll", scheduleOverlaySync, true)
  window.addEventListener("resize", scheduleOverlaySync, true)

  for (const [url, entry] of selectedEntries) {
    if (!selectedByUrl.has(url) || !document.contains(entry.img)) continue
    mountSelectedOverlay(url, entry.img)
  }

  notifyListeners()
}

export function stopPickMode() {
  if (!active) return

  active = false
  document.removeEventListener("pointermove", handlePointerMove, true)
  document.removeEventListener("click", handleClick, true)
  window.removeEventListener("scroll", scheduleOverlaySync, true)
  window.removeEventListener("resize", scheduleOverlaySync, true)

  if (pointerRaf) cancelAnimationFrame(pointerRaf)
  if (syncRaf) cancelAnimationFrame(syncRaf)
  pointerRaf = 0
  syncRaf = 0

  clearHoverState()

  for (const entry of selectedEntries.values()) {
    entry.img.classList.remove(SELECTED_CLASS)
    removeOverlay(entry.img)
  }

  removeStyles()
}

export function isPickModeActive(): boolean {
  return active
}
