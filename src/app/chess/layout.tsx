'use client'

import { GameProvider } from '@/contexts/GameContext'

export default function ChessLayout({ children }: { children: React.ReactNode }) {
  return <GameProvider>{children}</GameProvider>
}
