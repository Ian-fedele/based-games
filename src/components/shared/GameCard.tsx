'use client'

import Link from 'next/link'
import { useTheme } from '@/contexts/ThemeContext'

interface GameCardProps {
  href: string
  title: string
  description: string
  icon: string
  gradient: string
  glowColor: string
}

export default function GameCard({ href, title, description, icon, gradient, glowColor }: GameCardProps) {
  const { isDark } = useTheme()

  return (
    <Link
      href={href}
      className={`
        group relative block rounded-2xl overflow-hidden transition-all duration-300
        hover:scale-[1.02] hover:shadow-2xl
        ${isDark
          ? 'bg-white/5 border border-white/10 hover:border-white/20'
          : 'bg-white border border-gray-200 hover:border-gray-300 shadow-lg'}
      `}
      style={{ '--glow-color': glowColor } as React.CSSProperties}
    >
      {/* Glow effect on hover */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ boxShadow: `inset 0 0 60px ${glowColor}20, 0 0 40px ${glowColor}10` }}
      />

      <div className="relative p-8">
        <div className="text-5xl mb-4">{icon}</div>
        <h3 className={`text-2xl font-bold mb-2 bg-gradient-to-r ${gradient} bg-clip-text text-transparent`}>
          {title}
        </h3>
        <p className={`text-sm leading-relaxed mb-6 ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
          {description}
        </p>
        <span className={`
          inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg transition-colors
          bg-gradient-to-r ${gradient} text-white
          group-hover:opacity-90
        `}>
          Play Now
          <svg className="w-4 h-4 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </span>
      </div>
    </Link>
  )
}
