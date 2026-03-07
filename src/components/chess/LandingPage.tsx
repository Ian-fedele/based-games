'use client'

import { useState, useMemo } from 'react'
import { useWallet } from '@/contexts/WalletContext'
import { useGame } from '@/contexts/GameContext'
import { useTheme } from '@/contexts/ThemeContext'
import Leaderboard from './Leaderboard'

const FLOATING_PIECES = [
  '/chess/pieces/fantasy/white/k.svg',
  '/chess/pieces/fantasy/black/q.svg',
  '/chess/pieces/fantasy/white/n.svg',
  '/chess/pieces/fantasy/black/r.svg',
  '/chess/pieces/fantasy/white/b.svg',
  '/chess/pieces/fantasy/black/p.svg',
  '/chess/pieces/fantasy/white/r.svg',
  '/chess/pieces/fantasy/black/n.svg',
  '/chess/pieces/fantasy/white/q.svg',
  '/chess/pieces/fantasy/black/b.svg',
  '/chess/pieces/fantasy/white/p.svg',
  '/chess/pieces/fantasy/black/k.svg',
]

// Deterministic pseudo-random from seed (keeps positions stable across renders)
function seededRandom(seed: number) {
  let s = seed
  return () => {
    s = (s * 16807 + 0) % 2147483647
    return (s - 1) / 2147483646
  }
}

export default function LandingPage() {
  const { isConnected, connect, isConnecting, error, clearError } = useWallet()
  const { startGame, getGameHistory, engineReady, engineError } = useGame()
  const { isDark } = useTheme()
  const [selectedColor, setSelectedColor] = useState('w')
  const [selectedDifficulty, setSelectedDifficulty] = useState(5)

  const history = isConnected ? getGameHistory() : []
  const wins = history.filter((h: { result: string }) => h.result === 'win').length
  const losses = history.filter((h: { result: string }) => h.result === 'loss').length
  const draws = history.filter((h: { result: string }) => h.result === 'draw').length

  const floatingPieces = useMemo(() => {
    const rand = seededRandom(42)
    return FLOATING_PIECES.map((src) => ({
      src,
      left: `${rand() * 90 + 5}%`,
      top: `${rand() * 85 + 5}%`,
      size: Math.round(40 + rand() * 50),
      rotation: Math.round(rand() * 40 - 20),
      duration: 6 + rand() * 8,
      delay: -(rand() * 10),
    }))
  }, [])

  return (
    <div className="min-h-screen pt-28 pb-10 px-4 flex flex-col items-center justify-center relative overflow-hidden">
      {/* Floating chess pieces background */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        {floatingPieces.map((piece, i) => (
          <img
            key={i}
            src={piece.src}
            alt=""
            className="absolute floating-piece"
            style={{
              left: piece.left,
              top: piece.top,
              width: `${piece.size}px`,
              height: `${piece.size}px`,
              '--piece-rotate': `${piece.rotation}deg`,
              opacity: isDark ? 0.14 : 0.16,
              animationDuration: `${piece.duration}s`,
              animationDelay: `${piece.delay}s`,
            } as React.CSSProperties}
          />
        ))}
      </div>

      {/* Hero Section */}
      <div className="text-center mb-14 animate-slide-up">
        <div className="text-8xl sm:text-9xl mb-6 animate-float">♔</div>
        <h2 className="font-['Playfair_Display'] text-5xl sm:text-7xl font-bold mb-4">
          <span className="bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 bg-clip-text text-transparent">
            Chess AI
          </span>
        </h2>
        <p className={`text-lg sm:text-2xl max-w-lg mx-auto ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
          {isConnected
            ? 'Choose your army. Checkmate the machine.'
            : 'Connect your Web3 wallet to play chess against AI.'}
        </p>
      </div>

      {!isConnected ? (
        /* Wallet Connect Card */
        <div className="animate-slide-up w-full max-w-lg">
          <div className={`
            rounded-3xl p-12 text-center
            ${isDark ? 'bg-white/5 border border-white/10' : 'bg-white border border-gray-200 shadow-lg'}
          `}>
            <div className="w-24 h-24 mx-auto mb-7 rounded-3xl gradient-bg flex items-center justify-center">
              <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </div>
            <h3 className="text-2xl font-semibold mb-3">Connect Wallet</h3>
            <p className={`text-base mb-8 ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
              Sign in with MetaMask or any Ethereum wallet to start playing.
            </p>

            <button
              onClick={connect}
              disabled={isConnecting}
              className={`
                w-full py-4.5 px-8 rounded-xl font-semibold text-lg text-white transition-all duration-300
                ${isConnecting
                  ? 'opacity-50 cursor-wait'
                  : 'gradient-bg hover:shadow-lg hover:shadow-purple-500/25 hover:scale-[1.02] active:scale-[0.98]'}
              `}
            >
              {isConnecting ? (
                <span className="flex items-center justify-center gap-3">
                  <svg className="animate-spin w-6 h-6" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Connecting...
                </span>
              ) : 'Connect Wallet'}
            </button>

            {error && (
              <div className="mt-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                <p className="text-red-400 text-sm">{error}</p>
                <button onClick={clearError} className="text-red-300 text-sm underline mt-1">Dismiss</button>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Game Setup Card */
        <div className="animate-slide-up w-full max-w-xl space-y-8">
          {/* Stats Row */}
          {history.length > 0 && (
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'Wins', value: wins, color: 'text-emerald-500' },
                { label: 'Losses', value: losses, color: 'text-red-500' },
                { label: 'Draws', value: draws, color: 'text-amber-500' }
              ].map(({ label, value, color }) => (
                <div key={label} className={`
                  text-center py-5 rounded-xl
                  ${isDark ? 'bg-white/5' : 'bg-white shadow-sm border border-gray-100'}
                `}>
                  <span className={`text-3xl font-bold ${color}`}>{value}</span>
                  <p className={`text-sm mt-1 ${isDark ? 'text-white/40' : 'text-gray-400'}`}>{label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Setup Card */}
          <div className={`
            rounded-3xl p-9
            ${isDark ? 'bg-white/5 border border-white/10' : 'bg-white border border-gray-200 shadow-lg'}
          `}>
            {/* Color Selection */}
            <h3 className={`text-base font-semibold mb-4 uppercase tracking-wider ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
              Play As
            </h3>
            <div className="grid grid-cols-2 gap-4 mb-8">
              {[
                { value: 'w', label: 'White', icon: '♔' },
                { value: 'b', label: 'Black', icon: '♚' }
              ].map(({ value, label, icon }) => (
                <button
                  key={value}
                  onClick={() => setSelectedColor(value)}
                  className={`
                    py-5 rounded-xl text-lg font-medium transition-all duration-200 flex items-center justify-center gap-3
                    ${selectedColor === value
                      ? (isDark
                          ? 'bg-amber-500/20 border-2 border-amber-500/50 text-amber-400'
                          : 'bg-amber-50 border-2 border-amber-400 text-amber-700')
                      : (isDark
                          ? 'bg-white/5 border-2 border-transparent text-white/60 hover:bg-white/10'
                          : 'bg-gray-50 border-2 border-transparent text-gray-500 hover:bg-gray-100')}
                  `}
                >
                  <span className="text-3xl">{icon}</span>
                  {label}
                </button>
              ))}
            </div>

            {/* Difficulty Selection */}
            <h3 className={`text-base font-semibold mb-4 uppercase tracking-wider ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
              Difficulty
            </h3>
            <div className="mb-8">
              <div className="flex items-center justify-between mb-3">
                <span className={`text-sm ${isDark ? 'text-white/40' : 'text-gray-400'}`}>1</span>
                <span className={`text-base font-semibold ${isDark ? 'text-white/80' : 'text-gray-700'}`}>
                  Level {selectedDifficulty}
                </span>
                <span className={`text-sm ${isDark ? 'text-white/40' : 'text-gray-400'}`}>10</span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                step="1"
                value={selectedDifficulty}
                onChange={(e) => setSelectedDifficulty(Number(e.target.value))}
                className="difficulty-slider w-full"
              />
              <p className={`text-sm text-center mt-3 ${isDark ? 'text-white/30' : 'text-gray-400'}`}>
                {selectedDifficulty <= 3 ? 'Beginner friendly' : selectedDifficulty <= 6 ? 'Intermediate challenge' : 'Expert level'}
              </p>
            </div>

            {/* Play Button */}
            <button
              onClick={() => startGame(selectedColor, selectedDifficulty)}
              disabled={!engineReady || engineError}
              className={`
                w-full py-5 rounded-xl font-bold text-white text-2xl transition-all duration-300
                ${engineError
                  ? 'bg-red-800 cursor-not-allowed'
                  : engineReady
                    ? 'gradient-bg-gold hover:shadow-lg hover:shadow-amber-500/25 hover:scale-[1.02] active:scale-[0.98]'
                    : 'bg-gray-400 cursor-wait'}
              `}
            >
              {engineError ? (
                <span className="flex items-center justify-center gap-2 text-red-200">
                  Engine failed to load. Please refresh the page.
                </span>
              ) : engineReady ? '⚔ Start Game' : (
                <span className="flex items-center justify-center gap-3">
                  <svg className="animate-spin w-6 h-6" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Loading Engine...
                </span>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Leaderboard */}
      <div className="w-full max-w-xl mt-10 animate-slide-up">
        <Leaderboard />
      </div>
    </div>
  )
}
