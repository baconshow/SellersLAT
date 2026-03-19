'use client'
import { createContext, useContext, useState, useCallback, ReactNode } from 'react'

interface NavActionsContextValue {
  actions: ReactNode
  setActions: (node: ReactNode) => void
  clearActions: () => void
}

const NavActionsContext = createContext<NavActionsContextValue>({
  actions: null,
  setActions: () => {},
  clearActions: () => {},
})

export function NavActionsProvider({ children }: { children: ReactNode }) {
  const [actions, setActionsState] = useState<ReactNode>(null)
  const setActions = useCallback((node: ReactNode) => setActionsState(node), [])
  const clearActions = useCallback(() => setActionsState(null), [])
  return (
    <NavActionsContext.Provider value={{ actions, setActions, clearActions }}>
      {children}
    </NavActionsContext.Provider>
  )
}

export const useNavActions = () => useContext(NavActionsContext)
