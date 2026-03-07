'use client'

import { createContext, useContext, useCallback, useRef, type ReactNode } from 'react'

interface NavGuardContextType {
  setGuard: (message: string | null) => void
  confirmNavigation: () => boolean
}

const NavGuardContext = createContext<NavGuardContextType>({
  setGuard: () => {},
  confirmNavigation: () => true,
})

export function NavGuardProvider({ children }: { children: ReactNode }) {
  const guardRef = useRef<string | null>(null)

  const setGuard = useCallback((message: string | null) => {
    guardRef.current = message
  }, [])

  const confirmNavigation = useCallback(() => {
    if (!guardRef.current) return true
    return window.confirm(guardRef.current)
  }, [])

  return (
    <NavGuardContext.Provider value={{ setGuard, confirmNavigation }}>
      {children}
    </NavGuardContext.Provider>
  )
}

export function useNavGuard() {
  return useContext(NavGuardContext)
}
