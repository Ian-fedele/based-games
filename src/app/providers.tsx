'use client'

import { ThemeProvider } from '@/contexts/ThemeContext'
import { WalletProvider } from '@/contexts/WalletContext'
import { NavGuardProvider } from '@/contexts/NavGuardContext'
import type { ReactNode } from 'react'

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <WalletProvider>
        <NavGuardProvider>
          {children}
        </NavGuardProvider>
      </WalletProvider>
    </ThemeProvider>
  )
}
