import { useDialKit } from "dialkit"
import { dialkitDevOptions } from "@/lib/dialkit/dialkit-dev-options"

const ADD_ITEM_TOGGLE_CONFIG = {
  spring: {
    type: "spring" as const,
    visualDuration: 0.2,
    bounce: 0.2,
  },
}

export function useAddItemToggleDials() {
  return useDialKit("Add item toggle", ADD_ITEM_TOGGLE_CONFIG, dialkitDevOptions("add-item-toggle"))
}
