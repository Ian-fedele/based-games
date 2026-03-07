'use client'

import { useWallet } from '@/contexts/WalletContext'
import { useTheme } from '@/contexts/ThemeContext'

export default function NetworkGuard() {
  const { isConnected, isCorrectNetwork, isSwitchingChain, switchToBase } = useWallet()
  const { isDark } = useTheme()

  if (!isConnected || isCorrectNetwork) return null

  return (
    <div className="fixed top-16 left-1/2 -translate-x-1/2 z-40 animate-slide-up">
      <div className={`
        flex items-center gap-3 px-5 py-2.5 rounded-xl text-sm shadow-lg
        ${isDark ? 'bg-orange-500/90 text-white' : 'bg-orange-500 text-white'}
      `}>
        <span>Wrong network</span>
        <button
          onClick={switchToBase}
          disabled={isSwitchingChain}
          className="underline font-semibold disabled:opacity-50"
        >
          {isSwitchingChain ? 'Switching...' : 'Switch to Base'}
        </button>
      </div>
    </div>
  )
}
