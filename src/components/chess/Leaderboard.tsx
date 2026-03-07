'use client'

import { useState, useEffect, useCallback } from 'react'
import { useContracts } from '@/hooks/useContracts'
import { useWallet } from '@/contexts/WalletContext'
import { useTheme } from '@/contexts/ThemeContext'

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function Leaderboard() {
  const { leaderboardReader, leaderboardAddress } = useContracts()
  const { address } = useWallet()
  const { isDark } = useTheme()

  const [players, setPlayers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchLeaderboard = useCallback(async () => {
    if (!leaderboardReader) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      // Contract reverts on getTopPlayers() when no players exist
      const total = await leaderboardReader.totalPlayers()
      if (Number(total) === 0) {
        setPlayers([])
        return
      }

      const [addresses, points, gamesPlayed, wins] = await leaderboardReader.getTopPlayers()

      const data = addresses.map((addr: string, i: number) => ({
        address: addr,
        points: Number(points[i]),
        gamesPlayed: Number(gamesPlayed[i]),
        wins: Number(wins[i]),
        shortAddress: `${addr.slice(0, 6)}...${addr.slice(-4)}`
      }))

      data.sort((a: any, b: any) => b.points - a.points || b.wins - a.wins)
      setPlayers(data)
    } catch (err) {
      setError('Failed to load leaderboard')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [leaderboardReader])

  useEffect(() => {
    fetchLeaderboard()
  }, [fetchLeaderboard])

  if (!leaderboardAddress) return null

  const medals = ['🏆', '🥈', '🥉']

  return (
    <div className={`
      rounded-2xl overflow-hidden
      ${isDark ? 'bg-white/5 border border-white/10' : 'bg-white border border-gray-200 shadow-lg'}
    `}>
      {/* Header */}
      <div className={`
        flex items-center justify-between px-6 py-4 border-b
        ${isDark ? 'border-white/10' : 'border-gray-100'}
      `}>
        <h3 className="font-['Playfair_Display'] text-xl font-bold">
          <span className="bg-gradient-to-r from-amber-500 to-orange-600 bg-clip-text text-transparent">
            Leaderboard
          </span>
        </h3>
        <button
          onClick={fetchLeaderboard}
          disabled={loading}
          className={`text-xs font-medium transition-colors ${
            isDark ? 'text-amber-500 hover:text-amber-400' : 'text-amber-600 hover:text-amber-500'
          } disabled:opacity-50`}
        >
          Refresh
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className={`p-8 text-center text-sm ${isDark ? 'text-white/30' : 'text-gray-400'}`}>
          <svg className="animate-spin w-5 h-5 mx-auto mb-2" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Loading...
        </div>
      ) : error ? (
        <div className="p-8 text-center">
          <p className="text-red-400 text-sm mb-2">{error}</p>
          <button
            onClick={fetchLeaderboard}
            className={`text-xs font-medium transition-colors ${
              isDark ? 'text-amber-500 hover:text-amber-400' : 'text-amber-600 hover:text-amber-500'
            }`}
          >
            Try Again
          </button>
        </div>
      ) : players.length === 0 ? (
        <div className={`p-8 text-center text-sm ${isDark ? 'text-white/20' : 'text-gray-300'}`}>
          No games recorded yet. Be the first!
        </div>
      ) : (
        <div className={`divide-y ${isDark ? 'divide-white/5' : 'divide-gray-50'}`}>
          {players.slice(0, 20).map((p, i) => {
            const isCurrentUser = address && p.address.toLowerCase() === address.toLowerCase()
            return (
              <div
                key={p.address}
                className={`
                  flex items-center gap-3 px-6 py-3 transition-colors
                  ${isCurrentUser
                    ? (isDark ? 'bg-amber-500/10' : 'bg-amber-50')
                    : (isDark ? 'hover:bg-white/[0.03]' : 'hover:bg-gray-50')}
                `}
              >
                <span className="w-8 text-center text-sm font-mono">
                  {i < 3 ? medals[i] : (
                    <span className={isDark ? 'text-white/30' : 'text-gray-300'}>#{i + 1}</span>
                  )}
                </span>
                <span className={`
                  flex-1 text-sm font-mono truncate
                  ${isCurrentUser
                    ? 'text-amber-500 font-semibold'
                    : (isDark ? 'text-white/70' : 'text-gray-600')}
                `}>
                  {p.shortAddress}
                  {isCurrentUser && <span className="text-xs ml-1 opacity-60">(you)</span>}
                </span>
                <span className="text-sm font-bold text-amber-500">
                  {p.points} pts
                </span>
                <span className={`
                  text-xs hidden sm:block w-16 text-right
                  ${isDark ? 'text-white/30' : 'text-gray-400'}
                `}>
                  {p.wins}W / {p.gamesPlayed}G
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
