'use client'

import { useState, useEffect } from 'react'
import ChessBoard from './ChessBoard'
import MoveHistory from './MoveHistory'
import GameControls from './GameControls'
import GameOverModal from './GameOverModal'

const HEADER_HEIGHT = 100

function calcBoardSize(headerHeight: number) {
  if (typeof window === 'undefined') return 560
  const vw = window.innerWidth
  const vh = window.innerHeight
  const pad = 32

  const availH = vh - headerHeight - pad

  if (vw < 480) {
    return Math.min(vw - pad, availH)
  }
  if (vw < 1024) {
    return Math.min(vw - pad, availH)
  }

  const sidebarSpace = 300
  const availW = vw - sidebarSpace - pad
  return Math.min(availW, availH)
}

export default function GamePage() {
  const [boardSize, setBoardSize] = useState(() => calcBoardSize(HEADER_HEIGHT))
  const [isDesktop, setIsDesktop] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 1024)

  useEffect(() => {
    const onResize = () => {
      setBoardSize(calcBoardSize(HEADER_HEIGHT))
      setIsDesktop(window.innerWidth >= 1024)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  return (
    <div
      className="w-full overflow-hidden px-4"
      style={{ height: '100vh', paddingTop: `${HEADER_HEIGHT + 12}px` }}
    >
      <div className="h-full mx-auto flex flex-col lg:flex-row items-center lg:items-start justify-center gap-4 lg:gap-6">
        {/* Board Area */}
        <div className="animate-slide-up flex items-center justify-center">
          <ChessBoard boardSize={boardSize} />
        </div>

        {/* Sidebar: controls + history — height matches board on desktop */}
        <div
          className="w-full lg:w-64 flex flex-col gap-4 animate-slide-up flex-shrink-0 overflow-hidden"
          style={{ height: isDesktop ? `${boardSize}px` : 'auto' }}
        >
          <GameControls />
          <div className="flex-1 min-h-0 hidden lg:flex lg:flex-col">
            <MoveHistory />
          </div>
        </div>

        {/* Mobile move history (below board) */}
        <div className="w-full lg:hidden h-40 flex-shrink-0 animate-slide-up">
          <MoveHistory />
        </div>
      </div>

      <GameOverModal />
    </div>
  )
}
