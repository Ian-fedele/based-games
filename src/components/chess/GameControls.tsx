'use client'

import { useGame } from '@/contexts/GameContext'
import { useTheme } from '@/contexts/ThemeContext'

export default function GameControls() {
  const {
    difficulty,
    playerColor,
    undoMove,
    resign,
    exitGame,
    undosRemaining,
    isAiThinking,
    gameOver,
    game
  } = useGame()
  const { isDark } = useTheme()

  const statusText = () => {
    if (gameOver) return 'Game Over'
    if (isAiThinking) return 'AI is thinking...'
    if (game.inCheck()) return 'Check!'
    if (game.turn() === playerColor) return 'Your turn'
    return "Opponent's turn"
  }

  return (
    <div className={`
      rounded-xl p-4 space-y-4
      ${isDark ? 'bg-white/5 border border-white/10' : 'bg-white border border-gray-200 shadow-sm'}
    `}>
      {/* Game Status */}
      <div className="text-center">
        <p className={`text-xs uppercase tracking-wider mb-1 ${isDark ? 'text-white/30' : 'text-gray-400'}`}>
          Level {difficulty} · {playerColor === 'w' ? 'White' : 'Black'}
        </p>
        <p className={`
          text-sm font-semibold
          ${game.inCheck() && !gameOver ? 'text-red-500' :
            isAiThinking ? 'text-amber-500' :
            isDark ? 'text-white/80' : 'text-gray-700'}
        `}>
          {statusText()}
        </p>
      </div>

      {/* Action Buttons */}
      {!gameOver && (
        <div className="space-y-2">
          <button
            onClick={undoMove}
            disabled={isAiThinking || undosRemaining <= 0}
            className={`
              w-full py-2 rounded-lg text-sm font-medium transition-all duration-200
              ${(isAiThinking || undosRemaining <= 0)
                ? (isDark ? 'bg-white/5 text-white/20 cursor-not-allowed' : 'bg-gray-50 text-gray-300 cursor-not-allowed')
                : (isDark ? 'bg-white/10 text-white/70 hover:bg-white/15' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}
            `}
          >
            ↩ Undo ({undosRemaining} left)
          </button>

          <button
            onClick={resign}
            disabled={isAiThinking}
            className={`
              w-full py-2 rounded-lg text-sm font-medium transition-all duration-200
              ${isDark
                ? 'bg-red-500/15 text-red-400 hover:bg-red-500/25'
                : 'bg-red-50 text-red-500 hover:bg-red-100'}
            `}
          >
            🏳 Resign
          </button>
        </div>
      )}

      {/* Exit Button */}
      <button
        onClick={exitGame}
        className={`
          w-full py-2 rounded-lg text-sm font-medium transition-all duration-200
          ${isDark
            ? 'bg-white/5 text-white/50 hover:bg-white/10'
            : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}
        `}
      >
        ← Back to Menu
      </button>
    </div>
  )
}
