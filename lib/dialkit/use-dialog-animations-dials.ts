import { useDialKit } from "dialkit"

const DIALOG_ANIMATIONS_CONFIG = {
  enter: {
    type: "easing" as const,
    duration: 0.45,
    ease: [0.7, 0.3, 0.3, 0.9] as [number, number, number, number],
    __mode: "easing" as const,
  },
  exit: {
    type: "easing" as const,
    duration: 0.3,
    ease: [0.7, 0.3, 0.3, 0.91] as [number, number, number, number],
    __mode: "easing" as const,
  },
  "enter.__mode": "easing" as const,
  "exit.__mode": "easing" as const,
}

export function useDialogAnimationsDials() {
  return useDialKit("Dialog animations", DIALOG_ANIMATIONS_CONFIG, {
    id: "dialog-animations",
    persist: true,
  })
}
