'use client'

import { useGame } from '@/contexts/GameContext'
import GamePage from '@/components/chess/GamePage'
import LandingPage from '@/components/chess/LandingPage'

export default function ChessPage() {
  const { gameStarted } = useGame()

  return gameStarted ? <GamePage /> : <LandingPage />
}
