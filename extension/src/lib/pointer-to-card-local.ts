/** Map viewport pointer coords to a stack card's local space (top-left origin). */
export function pointerToCardLocal(
  clientX: number,
  clientY: number,
  card: HTMLElement,
  scale: number,
  rotateDeg: number,
): { x: number; y: number } {
  const width = card.offsetWidth
  const height = card.offsetHeight
  if (width <= 0 || height <= 0) {
    return { x: 0, y: 0 }
  }

  const safeScale = scale > 0 ? scale : 1
  const rect = card.getBoundingClientRect()
  const centerX = rect.left + rect.width / 2
  const centerY = rect.top + rect.height / 2

  const dx = clientX - centerX
  const dy = clientY - centerY

  const rad = (-rotateDeg * Math.PI) / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  const localDx = (dx * cos - dy * sin) / safeScale
  const localDy = (dx * sin + dy * cos) / safeScale

  return {
    x: localDx + width / 2,
    y: localDy + height / 2,
  }
}

/** Keep a badge centered at (x, y) fully inside the card. */
export function clampBadgeCenterToCard(
  x: number,
  y: number,
  cardWidth: number,
  cardHeight: number,
  badgeHalfSizePx: number,
): { x: number; y: number } {
  if (cardWidth <= 0 || cardHeight <= 0) {
    return { x: 0, y: 0 }
  }

  if (cardWidth <= badgeHalfSizePx * 2 || cardHeight <= badgeHalfSizePx * 2) {
    return { x: cardWidth / 2, y: cardHeight / 2 }
  }

  const minX = badgeHalfSizePx
  const maxX = cardWidth - badgeHalfSizePx
  const minY = badgeHalfSizePx
  const maxY = cardHeight - badgeHalfSizePx

  return {
    x: Math.max(minX, Math.min(maxX, x)),
    y: Math.max(minY, Math.min(maxY, y)),
  }
}
