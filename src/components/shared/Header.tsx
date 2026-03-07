'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useTheme } from '@/contexts/ThemeContext'
import { useWallet } from '@/contexts/WalletContext'
import { useNavGuard } from '@/contexts/NavGuardContext'

const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/chess', label: 'Chess' },
  { href: '/snake', label: 'Snake' },
]

export default function Header() {
  const { isDark, toggle } = useTheme()
  const { isConnected, shortAddress, isConnecting, connect, disconnect } = useWallet()
  const { confirmNavigation } = useNavGuard()
  const router = useRouter()
  const pathname = usePathname()

  return (
    <header data-shared-header className="fixed top-0 left-0 right-0 z-50 glass">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
        {/* Logo + Nav */}
        <div className="flex items-center gap-6">
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault()
              if (pathname === '/') return
              if (confirmNavigation()) router.push('/')
            }}
            className="flex items-center gap-2 cursor-pointer"
          >
            <span className="text-xl sm:text-2xl">🎮</span>
            <span className="font-[var(--font-playfair)] text-lg sm:text-xl font-bold tracking-tight">
              <span className="bg-gradient-to-r from-amber-500 via-purple-500 to-emerald-400 bg-clip-text text-transparent">
                basedgames
              </span>
              <span className={isDark ? 'text-white/50' : 'text-gray-400'}>.io</span>
            </span>
          </a>

          <nav className="hidden sm:flex items-center gap-1">
            {NAV_LINKS.map(({ href, label }) => {
              const isActive = pathname === href || (href !== '/' && pathname.startsWith(href))
              return (
                <a
                  key={href}
                  href={href}
                  onClick={(e) => {
                    e.preventDefault()
                    if (pathname === href) return
                    if (confirmNavigation()) router.push(href)
                  }}
                  className={`
                    px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer
                    ${isActive
                      ? (isDark ? 'bg-white/10 text-white' : 'bg-black/5 text-gray-900')
                      : (isDark ? 'text-white/50 hover:text-white/80 hover:bg-white/5' : 'text-gray-500 hover:text-gray-800 hover:bg-black/5')}
                  `}
                >
                  {label}
                </a>
              )
            })}
          </nav>
        </div>

        {/* Right Side Controls */}
        <div className="flex items-center gap-3">
          {/* Theme Toggle */}
          <button
            onClick={toggle}
            className={`
              relative w-14 h-7 rounded-full transition-colors duration-300
              ${isDark ? 'bg-indigo-600' : 'bg-amber-400'}
            `}
            aria-label="Toggle theme"
          >
            <span className={`
              absolute top-0.5 w-6 h-6 rounded-full transition-all duration-300
              flex items-center justify-center text-xs
              ${isDark ? 'left-7 bg-indigo-200' : 'left-0.5 bg-white'}
            `}>
              {isDark ? '🌙' : '☀️'}
            </span>
          </button>

          {/* Wallet */}
          {isConnected ? (
            <div className="flex items-center gap-2">
              <span className={`
                hidden sm:inline text-xs font-mono px-2.5 py-1 rounded-full
                ${isDark ? 'bg-white/10 text-white/70' : 'bg-black/5 text-gray-600'}
              `}>
                {shortAddress}
              </span>
              <button
                onClick={disconnect}
                className={`
                  text-xs px-3 py-1.5 rounded-lg font-medium transition-all
                  ${isDark
                    ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                    : 'bg-red-50 text-red-600 hover:bg-red-100'}
                `}
              >
                Disconnect
              </button>
            </div>
          ) : (
            <button
              onClick={connect}
              disabled={isConnecting}
              className="text-xs px-3 py-1.5 rounded-lg font-medium bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {isConnecting ? 'Connecting...' : 'Connect Wallet'}
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
