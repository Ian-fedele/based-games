'use client'

import { useState, useEffect } from 'react'
import { formatEther } from 'ethers'
import confetti from 'canvas-confetti'
import { useGame } from '@/contexts/GameContext'
import { useWallet } from '@/contexts/WalletContext'
import { useContracts } from '@/hooks/useContracts'
import { useTheme } from '@/contexts/ThemeContext'
import { verifyGame } from '@/lib/verifyGame'
import { CHAIN_CONFIG, TARGET_CHAIN_ID } from '@/lib/chainConfig'

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function GameOverModal() {
  const { gameOver, playerColor, startGame, exitGame, difficulty, completedGame, capturedBoardImage } = useGame()
  const { isConnected, isCorrectNetwork, switchToBase, address } = useWallet()
  const { getNFTWriter, nftAddress, nftReader } = useContracts()
  const { isDark } = useTheme()

  const [mintState, setMintState] = useState<'idle' | 'minting' | 'success' | 'error'>('idle')
  const [mintTxHash, setMintTxHash] = useState<string | null>(null)
  const [mintError, setMintError] = useState<string | null>(null)
  const [mintPriceWei, setMintPriceWei] = useState<bigint | null>(null)

  const playerWon = gameOver?.winner === playerColor
  const isDraw = gameOver?.winner === null

  // Reset mint state when a new game ends
  useEffect(() => {
    if (gameOver) {
      setMintState('idle')
      setMintTxHash(null)
      setMintError(null)
    }
  }, [gameOver])

  // Fetch mint price when modal opens
  useEffect(() => {
    if (!gameOver || !nftReader) return
    nftReader.mintPrice()
      .then(setMintPriceWei)
      .catch((err: any) => console.warn('Failed to fetch mint price:', err))
  }, [gameOver, nftReader])

  // Fire confetti on player win
  useEffect(() => {
    if (!gameOver || !playerWon) return

    const duration = 3000
    const end = Date.now() + duration
    let rafId: number

    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.7 },
        colors: ['#f59e0b', '#8b5cf6', '#ec4899']
      })
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.7 },
        colors: ['#f59e0b', '#8b5cf6', '#ec4899']
      })

      if (Date.now() < end) rafId = requestAnimationFrame(frame)
    }

    frame()
    return () => cancelAnimationFrame(rafId)
  }, [gameOver, playerWon])

  if (!gameOver) return null

  const handleMint = async () => {
    if (!completedGame || !address) return
    setMintState('minting')
    setMintError(null)

    try {
      const contract = await getNFTWriter()
      if (!contract) throw new Error('Contract not available')

      // Step 1: Verify game with backend + upload board image to IPFS
      const verification = await verifyGame({
        pgn: completedGame.pgn,
        result: completedGame.result,
        difficulty: completedGame.difficulty,
        playerColor: completedGame.playerColor,
        playerAddress: address,
        action: 'mintNFT',
        resigned: completedGame.resigned || false,
        boardImage: capturedBoardImage,
      })

      const colorString = completedGame.playerColor === 'w' ? 'white' : 'black'
      const mintValue = mintPriceWei || 0n

      const mintArgs = [
        completedGame.pgn,
        completedGame.fen,
        completedGame.result,
        completedGame.difficulty,
        colorString,
        verification.moveCount,
        verification.metadataURI,
        verification.nonce,
        verification.signature,
      ]

      // Step 2: Estimate gas to catch errors before wallet popup
      try {
        await contract.mintGameNFT.estimateGas(...mintArgs, { value: mintValue })
      } catch (gasErr: any) {
        throw new Error(`Transaction would fail: ${gasErr.reason || gasErr.message}`)
      }

      // Step 3: Send actual transaction
      const tx = await contract.mintGameNFT(...mintArgs, { value: mintValue })

      setMintTxHash(tx.hash)
      await tx.wait()
      setMintState('success')
    } catch (err: any) {
      setMintError(err.reason || err.message || 'Minting failed')
      setMintState('error')
    }
  }

  const title = playerWon
    ? 'Victory!'
    : isDraw
      ? 'Draw'
      : 'Defeat'

  const subtitle: Record<string, string> = {
    checkmate: playerWon ? 'Checkmate — you won!' : 'Checkmate — you lost.',
    stalemate: 'The game ended in stalemate.',
    repetition: 'Draw by threefold repetition.',
    insufficient: 'Draw by insufficient material.',
    draw: 'The game ended in a draw.',
    resignation: 'You resigned the game.'
  }

  const emoji = playerWon ? '🏆' : isDraw ? '🤝' : '😔'

  const explorerBase = CHAIN_CONFIG[TARGET_CHAIN_ID]?.blockExplorerUrls[0] || 'https://basescan.org'

  const mintPriceDisplay = mintPriceWei != null
    ? mintPriceWei === 0n ? 'Free' : `${formatEther(mintPriceWei)} ETH`
    : null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-fade-in">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal Card */}
      <div className={`
        relative rounded-2xl p-8 max-w-sm w-full text-center animate-slide-up
        ${isDark ? 'bg-gray-900 border border-white/10' : 'bg-white shadow-2xl'}
      `}>
        <div className="text-5xl mb-4">{emoji}</div>

        <h2 className={`
          text-3xl font-['Playfair_Display'] font-bold mb-2
          ${playerWon
            ? 'bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent'
            : isDraw
              ? (isDark ? 'text-white/80' : 'text-gray-600')
              : 'text-red-500'}
        `}>
          {title}
        </h2>

        <p className={`text-sm mb-6 ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
          {subtitle[gameOver.type]}
        </p>

        {/* NFT Mint Section */}
        {isConnected && nftAddress && completedGame && (
          <div className={`mb-6 pt-4 border-t ${isDark ? 'border-white/10' : 'border-gray-100'}`}>
            {!isCorrectNetwork ? (
              <button
                onClick={switchToBase}
                className={`
                  w-full py-2.5 rounded-xl text-sm font-medium transition-all duration-200
                  ${isDark
                    ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30'
                    : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}
                `}
              >
                Switch to Base to Mint NFT
              </button>
            ) : mintState === 'success' ? (
              <a
                href={`${explorerBase}/tx/${mintTxHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className={`
                  block w-full py-2.5 rounded-xl text-sm font-medium text-center
                  ${isDark
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-emerald-50 text-emerald-600'}
                `}
              >
                NFT Minted! View on Basescan
              </a>
            ) : mintState === 'error' ? (
              <div className="space-y-2">
                <p className="text-red-400 text-xs">{mintError}</p>
                <button
                  onClick={handleMint}
                  className={`
                    w-full py-2.5 rounded-xl text-sm font-medium transition-all duration-200
                    ${isDark
                      ? 'bg-white/10 text-white/70 hover:bg-white/15'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}
                  `}
                >
                  Retry Mint
                </button>
              </div>
            ) : (
              <button
                onClick={handleMint}
                disabled={mintState === 'minting'}
                className={`
                  w-full py-2.5 rounded-xl text-sm font-medium transition-all duration-200
                  ${mintState === 'minting'
                    ? 'opacity-50 cursor-wait'
                    : ''}
                  ${isDark
                    ? 'bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30'
                    : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'}
                `}
              >
                {mintState === 'minting' ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Minting...
                  </span>
                ) : mintPriceDisplay
                  ? `Mint Game as NFT (${mintPriceDisplay})`
                  : 'Mint Game as NFT'}
              </button>
            )}
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={() => startGame(playerColor, difficulty)}
            className="w-full py-3 rounded-xl font-semibold text-white gradient-bg-gold hover:shadow-lg hover:shadow-amber-500/25 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
          >
            ⚔ Play Again
          </button>
          <button
            onClick={exitGame}
            className={`
              w-full py-3 rounded-xl font-medium transition-all duration-200
              ${isDark
                ? 'bg-white/10 text-white/70 hover:bg-white/15'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}
            `}
          >
            Change Settings
          </button>
        </div>
      </div>
    </div>
  )
}
