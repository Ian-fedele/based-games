'use client'

import dynamic from 'next/dynamic'

const SnakeGame = dynamic(() => import('@/components/snake/SnakeGame'), {
  ssr: false,
  loading: () => (
    <div className="h-screen bg-black flex items-center justify-center">
      <div className="text-green-400 font-mono text-lg animate-pulse">Loading Neon Snake...</div>
    </div>
  ),
})

export default function SnakePage() {
  return <SnakeGame />
}
