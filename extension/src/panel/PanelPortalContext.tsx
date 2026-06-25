import { createContext, useContext, type ReactNode } from "react"

const PanelPortalContext = createContext<HTMLElement | null>(null)

type PanelPortalProviderProps = {
  container: HTMLElement | null
  children: ReactNode
}

export function PanelPortalProvider({ container, children }: PanelPortalProviderProps) {
  return <PanelPortalContext.Provider value={container}>{children}</PanelPortalContext.Provider>
}

export function usePanelPortal() {
  return useContext(PanelPortalContext)
}
