'use client'

import { useRef, useEffect } from 'react'
import { useGame } from '@/contexts/GameContext'
import { useTheme } from '@/contexts/ThemeContext'

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function MoveHistory() {
  const { moveHistory } = useGame()
  const { isDark } = useTheme()
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom on new move
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [moveHistory])

  // Group moves into pairs (white, black)
  const pairs: { number: number; white: any; black: any }[] = []
  for (let i = 0; i < moveHistory.length; i += 2) {
    pairs.push({
      number: Math.floor(i / 2) + 1,
      white: moveHistory[i],
      black: moveHistory[i + 1] || null
    })
  }

  return (
    <div className={`
      rounded-xl h-full flex flex-col
      ${isDark ? 'bg-white/5 border border-white/10' : 'bg-white border border-gray-200 shadow-sm'}
    `}>
      {/* Header */}
      <div className={`
        px-4 py-2.5 border-b font-semibold text-sm
        ${isDark ? 'border-white/10 text-white/60' : 'border-gray-100 text-gray-500'}
      `}>
        Move History
      </div>

      {/* Moves List */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto custom-scrollbar p-2 min-h-0">
        {pairs.length === 0 ? (
          <p className={`text-center text-xs py-6 ${isDark ? 'text-white/20' : 'text-gray-300'}`}>
            No moves yet
          </p>
        ) : (
          pairs.map(({ number, white, black }) => (
            <div key={number} className="move-row flex items-center gap-1 px-2 py-1 rounded-md text-sm">
              <span className={`w-7 text-right text-xs font-mono ${isDark ? 'text-white/25' : 'text-gray-300'}`}>
                {number}.
              </span>
              <span className={`
                flex-1 px-1.5 py-0.5 rounded font-mono text-xs
                ${white?.san?.includes('#') ? 'text-red-500 font-bold' :
                  white?.san?.includes('+') ? 'text-amber-500' :
                  isDark ? 'text-white/80' : 'text-gray-700'}
              `}>
                {white?.san || ''}
              </span>
              <span className={`
                flex-1 px-1.5 py-0.5 rounded font-mono text-xs
                ${black?.san?.includes('#') ? 'text-red-500 font-bold' :
                  black?.san?.includes('+') ? 'text-amber-500' :
                  isDark ? 'text-white/60' : 'text-gray-500'}
              `}>
                {black?.san || ''}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
