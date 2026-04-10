export const FOLDER_THEMES = ["gray", "manila", "blue", "pink", "green", "custom"] as const

export type FolderTheme = (typeof FOLDER_THEMES)[number]

export interface FolderPoint {
  x: number
  y: number
  t?: number
}

export interface FolderStroke {
  points: FolderPoint[]
  width: number
}

export interface FolderAppearance {
  theme: FolderTheme
  customColor: string | null
  drawing: FolderStroke[]
}

export const DEFAULT_FOLDER_APPEARANCE: FolderAppearance = {
  theme: "gray",
  customColor: null,
  drawing: [],
}

export interface FolderGradientTheme {
  frontTop: string
  frontBottom: string
  backPanel: string
}

export const PRESET_THEME_COLORS: Record<Exclude<FolderTheme, "custom">, FolderGradientTheme> = {
  gray: { frontTop: "#E6E6E6", frontBottom: "#DBDBDB", backPanel: "#DBDBDB" },
  manila: { frontTop: "#FAE9D4", frontBottom: "#FADEBB", backPanel: "#FADEBB" },
  blue: { frontTop: "#CCF1FF", frontBottom: "#B2EAFF", backPanel: "#B2EAFF" },
  pink: { frontTop: "#FFE5EE", frontBottom: "#FFCCDD", backPanel: "#FFCCDD" },
  green: { frontTop: "#C2F2CB", frontBottom: "#AAF2B7", backPanel: "#AAF2B7" },
}

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n))
}

function clampByte(n: number) {
  return Math.max(0, Math.min(255, Math.round(n)))
}

function normalizeHex(color: string): string {
  const c = color.trim().replace(/^#/, "")
  if (c.length === 3 && /^[0-9a-fA-F]{3}$/.test(c)) {
    return `#${c[0]}${c[0]}${c[1]}${c[1]}${c[2]}${c[2]}`.toUpperCase()
  }
  if (c.length === 6 && /^[0-9a-fA-F]{6}$/.test(c)) {
    return `#${c}`.toUpperCase()
  }
  return "#DBDBDB"
}

function hexToRgb(hex: string) {
  const normalized = normalizeHex(hex).slice(1)
  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  }
}

function rgbToHex(r: number, g: number, b: number) {
  return `#${clampByte(r).toString(16).padStart(2, "0")}${clampByte(g).toString(16).padStart(2, "0")}${clampByte(b).toString(16).padStart(2, "0")}`.toUpperCase()
}

function rgbToHsl(r: number, g: number, b: number) {
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const l = (max + min) / 2
  if (max === min) {
    return { h: 0, s: 0, l }
  }
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h = 0
  if (max === rn) h = (gn - bn) / d + (gn < bn ? 6 : 0)
  else if (max === gn) h = (bn - rn) / d + 2
  else h = (rn - gn) / d + 4
  h /= 6
  return { h, s, l }
}

function hue2rgb(p: number, q: number, t: number) {
  let tn = t
  if (tn < 0) tn += 1
  if (tn > 1) tn -= 1
  if (tn < 1 / 6) return p + (q - p) * 6 * tn
  if (tn < 1 / 2) return q
  if (tn < 2 / 3) return p + (q - p) * (2 / 3 - tn) * 6
  return p
}

function hslToRgb(h: number, s: number, l: number) {
  if (s === 0) {
    const v = clampByte(l * 255)
    return { r: v, g: v, b: v }
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  return {
    r: clampByte(hue2rgb(p, q, h + 1 / 3) * 255),
    g: clampByte(hue2rgb(p, q, h) * 255),
    b: clampByte(hue2rgb(p, q, h - 1 / 3) * 255),
  }
}

export function darkenByTenLightnessPoints(hex: string) {
  const { r, g, b } = hexToRgb(hex)
  const hsl = rgbToHsl(r, g, b)
  const nextL = Math.max(0, hsl.l - 0.1)
  const rgb = hslToRgb(hsl.h, hsl.s, nextL)
  return rgbToHex(rgb.r, rgb.g, rgb.b)
}

export function getThemeGradient(theme: FolderTheme, customColor?: string | null): FolderGradientTheme {
  if (theme !== "custom") return PRESET_THEME_COLORS[theme]
  const base = normalizeHex(customColor ?? "#DBDBDB")
  const darker = darkenByTenLightnessPoints(base)
  return { frontTop: base, frontBottom: darker, backPanel: darker }
}

function toLinearChannel(c: number) {
  const n = c / 255
  return n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4
}

export function getRelativeLuminance(hex: string) {
  const { r, g, b } = hexToRgb(hex)
  return 0.2126 * toLinearChannel(r) + 0.7152 * toLinearChannel(g) + 0.0722 * toLinearChannel(b)
}

export function getInkColorForTheme(theme: FolderTheme, customColor?: string | null) {
  const gradient = getThemeGradient(theme, customColor)
  // Use the midpoint color between top/bottom as readability surface proxy.
  const top = hexToRgb(gradient.frontTop)
  const bottom = hexToRgb(gradient.frontBottom)
  const mid = rgbToHex((top.r + bottom.r) / 2, (top.g + bottom.g) / 2, (top.b + bottom.b) / 2)
  return getRelativeLuminance(mid) > 0.55 ? "#1F1F1F" : "#F5F5F5"
}

/** Midpoint of the front-panel gradient — same surface proxy as ink / ridge stroke. */
function folderFrontMidHex(theme: FolderTheme, customColor?: string | null) {
  const g = getThemeGradient(theme, customColor)
  const top = hexToRgb(g.frontTop)
  const bottom = hexToRgb(g.frontBottom)
  return rgbToHex((top.r + bottom.r) / 2, (top.g + bottom.g) / 2, (top.b + bottom.b) / 2)
}

const ADAPTIVE_SHADOW_L_THRESHOLD = 0.42

function folderFrontSurfaceLuminance(theme: FolderTheme, customColor?: string | null) {
  return getRelativeLuminance(folderFrontMidHex(theme, customColor))
}

/** Same luminance curve as ridge-line shadow; pick max/min to match each SVG filter. */
function adaptiveShadowStrength(L: number, maxA: number, minA: number) {
  if (L >= ADAPTIVE_SHADOW_L_THRESHOLD) return maxA
  return minA + (maxA - minA) * (L / ADAPTIVE_SHADOW_L_THRESHOLD)
}

/**
 * White drop-shadow under ridge lines (SVG feColorMatrix alpha). Strong on light folders, softer on dark
 * so navy/custom dark colors don’t get a harsh etched groove.
 */
function lineDropShadowOpacityForSurface(theme: FolderTheme, customColor?: string | null) {
  return adaptiveShadowStrength(folderFrontSurfaceLuminance(theme, customColor), 0.8, 0.14)
}

/**
 * Scales inner-shadow alpha (feColorMatrix row 4) on the front panel. Light surfaces stay at full strength;
 * dark surfaces soften — same luminance logic as ridge lines, with max 1 so presets don’t flatten.
 */
export function getFolderInnerShadowAlphaScale(theme: FolderTheme, customColor?: string | null) {
  // min chosen so (min/1) ≈ (0.14/0.8) relative to the line shadow floor
  return adaptiveShadowStrength(folderFrontSurfaceLuminance(theme, customColor), 1, 0.175)
}

/** Ridge-line stroke derived from the front gradient (DOM blend modes don’t composite reliably here). */
export function getFolderRidgeLineStyle(
  theme: FolderTheme,
  customColor?: string | null,
): { stroke: string; strokeOpacity: number; lineShadowOpacity: number } {
  const lineShadowOpacity = lineDropShadowOpacityForSurface(theme, customColor)
  const g = getThemeGradient(theme, customColor)
  const top = hexToRgb(g.frontTop)
  const bot = hexToRgb(g.frontBottom)
  const r = top.r * 0.22 + bot.r * 0.78
  const gv = top.g * 0.22 + bot.g * 0.78
  const b = top.b * 0.22 + bot.b * 0.78
  const onSurface = rgbToHex(r, gv, b)
  const stroke = darkenByTenLightnessPoints(onSurface)
  return { stroke, strokeOpacity: 1, lineShadowOpacity }
}

function isTheme(v: unknown): v is FolderTheme {
  return typeof v === "string" && (FOLDER_THEMES as readonly string[]).includes(v)
}

function parsePoint(input: unknown): FolderPoint | null {
  if (!input || typeof input !== "object") return null
  const value = input as Record<string, unknown>
  const x = typeof value.x === "number" ? value.x : NaN
  const y = typeof value.y === "number" ? value.y : NaN
  const t = typeof value.t === "number" ? value.t : undefined
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null
  return { x: clamp01(x), y: clamp01(y), t }
}

function parseStroke(input: unknown): FolderStroke | null {
  if (!input || typeof input !== "object") return null
  const value = input as Record<string, unknown>
  if (!Array.isArray(value.points)) return null
  const points = value.points.map(parsePoint).filter((p): p is FolderPoint => p !== null)
  if (points.length < 2) return null
  const width = typeof value.width === "number" && Number.isFinite(value.width) ? value.width : 0.016
  return { points, width: Math.max(0.002, Math.min(0.08, width)) }
}

export function sanitizeDrawing(input: unknown, maxStrokes = 120, maxPointsPerStroke = 700): FolderStroke[] {
  if (!Array.isArray(input)) return []
  const parsed = input
    .map(parseStroke)
    .filter((stroke): stroke is FolderStroke => stroke !== null)
    .slice(0, maxStrokes)
    .map((stroke) => ({
      ...stroke,
      points: stroke.points.slice(0, maxPointsPerStroke),
    }))
  return parsed
}

export function parseFolderAppearance(input: {
  folder_theme?: unknown
  folder_custom_color?: unknown
  folder_drawing?: unknown
}): FolderAppearance {
  const theme = isTheme(input.folder_theme) ? input.folder_theme : "gray"
  const customColor =
    typeof input.folder_custom_color === "string" && input.folder_custom_color.trim().length > 0
      ? normalizeHex(input.folder_custom_color)
      : null
  const drawing = sanitizeDrawing(input.folder_drawing)
  return { theme, customColor, drawing }
}
