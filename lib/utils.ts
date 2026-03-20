import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Viewport dimensions in px for saved URL viewport_size (PRD: mobile 393x852, tablet 768x1024, desktop 1440x900). */
const VIEWPORT_SIZES: Record<string, { width: number; height: number }> = {
  mobile: { width: 393, height: 852 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1440, height: 900 },
}

/** Returns native width and height for a saved viewport_size. */
export function getViewportDimensions(viewportSize: string): { width: number; height: number } {
  return VIEWPORT_SIZES[viewportSize] ?? VIEWPORT_SIZES.desktop
}
