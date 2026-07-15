import { useDialKit } from "dialkit"
import { dialkitDevOptions } from "@/lib/dialkit/dialkit-dev-options"

const EMPTY_CANVAS_DOCS_CONFIG = {
  usePhysics: false,
  enter: {
    type: "easing" as const,
    duration: 0.3,
    ease: [0.44, 0.24, 0.11, 1.77] as [number, number, number, number],
    __mode: "easing" as const,
  },
  leave: {
    type: "easing" as const,
    duration: 0.25,
    ease: [0.54, 0.01, 0.32, 1] as [number, number, number, number],
    __mode: "easing" as const,
  },
  physics: {
    type: "spring" as const,
    stiffness: 820,
    damping: 23,
    mass: 0.8,
    __mode: "advanced" as const,
  },
  frontDoc: {
    hoverX: -6,
    hoverY: 0,
    hoverRotate: -5,
  },
  backDoc: {
    hoverX: 5,
    hoverY: -15,
    hoverRotate: 10,
  },
}

export function useEmptyCanvasDocsDials() {
  return useDialKit("Empty canvas docs", EMPTY_CANVAS_DOCS_CONFIG, dialkitDevOptions("empty-canvas-docs"))
}
