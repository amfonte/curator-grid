/** Height transitions — ease only, no spring overshoot. */
export const PANEL_LAYOUT_TRANSITION = {
  duration: 0.25,
  ease: [0.4, 0, 0.2, 1] as const,
}

/** Brief blur + fade for tab swaps and save-control reveal. */
export const PANEL_BLUR_PX = 3

export const PANEL_BLUR_FADE_DURATION_S = 0.12

export const PANEL_BLUR_FADE_TRANSITION = {
  opacity: {
    duration: PANEL_BLUR_FADE_DURATION_S,
    ease: [0.4, 0, 0.2, 1] as const,
  },
  filter: {
    duration: 0.1,
    ease: [0.4, 0, 0.2, 1] as const,
  },
}

export const PANEL_EXIT_BLUR_FADE_TRANSITION = {
  opacity: PANEL_BLUR_FADE_TRANSITION.opacity,
  filter: {
    duration: 0.05,
    ease: [0.4, 0, 0.2, 1] as const,
  },
}

/** Save controls entrance when the first image is added. */
export const PANEL_SAVE_CONTROLS_ENTRANCE_VARIANTS = {
  initial: { opacity: 0, filter: `blur(${PANEL_BLUR_PX}px)` },
  animate: { opacity: 1, filter: "blur(0px)" },
} as const

/** Populated image tab (stack + controls) exits in place while placeholder animates in. */
export const PANEL_IMAGE_POPULATED_VARIANTS = {
  animate: { opacity: 1, filter: "blur(0px)", position: "relative" as const },
  exit: {
    opacity: 0,
    filter: `blur(${PANEL_BLUR_PX}px)`,
    position: "absolute" as const,
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1,
    transition: PANEL_EXIT_BLUR_FADE_TRANSITION,
  },
} as const

/** Empty image tab ↔ stack: blur/fade placeholder in/out. */
export const PANEL_EMPTY_CANVAS_VARIANTS = {
  initial: { opacity: 0, filter: `blur(${PANEL_BLUR_PX}px)` },
  animate: { opacity: 1, filter: "blur(0px)", position: "relative" as const },
  exit: {
    opacity: 0,
    filter: `blur(${PANEL_BLUR_PX}px)`,
    position: "absolute" as const,
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1,
  },
} as const

/** Tab crossfade: exiting pane goes absolute so incoming tab drives height immediately. */
export const PANEL_TAB_CROSSFADE_VARIANTS = {
  initial: { opacity: 0, filter: `blur(${PANEL_BLUR_PX}px)` },
  animate: { opacity: 1, filter: "blur(0px)", position: "relative" as const, zIndex: 0 },
  exit: {
    opacity: 0,
    filter: `blur(${PANEL_BLUR_PX}px)`,
    position: "absolute" as const,
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1,
    transition: PANEL_EXIT_BLUR_FADE_TRANSITION,
  },
} as const
