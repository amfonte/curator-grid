"use client"

import React from "react"
import { useDialKit } from "dialkit"
import { motion } from "motion/react"

type ActiveTab = "url" | "image"

export function AddItemTabsIndicatorDev({ activeTab }: { activeTab: ActiveTab }) {
  const toggleDial = useDialKit("Add item toggle", {
    spring: {
      type: "spring",
      visualDuration: 0.2,
      bounce: 0.2,
    },
  })

  return (
    <motion.div
      initial={false}
      animate={{ x: activeTab === "url" ? 0 : "100%" }}
      transition={toggleDial.spring as never}
      className="pointer-events-none absolute inset-y-[6px] left-[6px] h-[48px] w-[calc(50%-6px)] rounded-[24px] bg-[var(--gray-10)]"
      style={{
        boxShadow:
          "0 2px 1px 0 #FFF inset, 0 6px 8px 0 #F5F5F5 inset, 0 -4px 4px 0 #FFF inset, 0 -8px 12px 0 #F5F5F5 inset, 0 4px 4px 0 rgba(0,0,0,0.05), 0 2px 2px 0 rgba(0,0,0,0.05), 0 8px 8px 0 rgba(0,0,0,0.05), 0 1px 1px 0 rgba(0,0,0,0.05), 0 0 0 1px rgba(0,0,0,0.05)",
      }}
    />
  )
}

