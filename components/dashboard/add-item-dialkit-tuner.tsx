"use client"

import { useDialKit } from "dialkit"

export function AddItemDialKitTuner() {
  // DialKit panels are registered via hooks; we keep this logic isolated so
  // production mounts don't pull DialKit UI.
  useDialKit("Add item toggle", {
    spring: {
      type: "spring",
      visualDuration: 0.2,
      bounce: 0.2,
    },
  })

  return null
}

