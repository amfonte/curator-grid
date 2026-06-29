/** Default bottom offset for floating dashboard controls (px). */
export const DASHBOARD_FLOATING_CONTROLS_BOTTOM_PX = 32

/** Bottom offset when the bulk edit bar is visible on desktop (px). */
export const DASHBOARD_FLOATING_CONTROLS_BULK_BOTTOM_PX = 108

export const DASHBOARD_FLOATING_CONTROLS_BOTTOM_TRANSITION =
  "bottom 0.35s cubic-bezier(0.33, 1, 0.68, 1)"

export function dashboardFloatingControlsBottomPx(
  batchEditActive: boolean,
  bulkBarExiting: boolean,
): number {
  if (batchEditActive && !bulkBarExiting) {
    return DASHBOARD_FLOATING_CONTROLS_BULK_BOTTOM_PX
  }
  return DASHBOARD_FLOATING_CONTROLS_BOTTOM_PX
}
