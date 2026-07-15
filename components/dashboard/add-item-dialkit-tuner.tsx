"use client"

import { useAddItemToggleDials } from "@/lib/dialkit/use-add-item-toggle-dials"

export function AddItemDialKitTuner() {
  // DialKit panels are registered via hooks; we keep this logic isolated so
  // production mounts don't pull DialKit UI.
  useAddItemToggleDials()

  return null
}
