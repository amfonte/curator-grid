export const VIEWPORT_OPTIONS = [
  { value: "desktop", label: "Desktop (1440×900)" },
  { value: "tablet", label: "Tablet (768×1024)" },
  { value: "mobile", label: "Mobile (393×852)" },
] as const

export type ViewportSize = (typeof VIEWPORT_OPTIONS)[number]["value"]

export function getViewportLabel(value: string) {
  return VIEWPORT_OPTIONS.find((option) => option.value === value)?.label ?? value
}
