'use client'

import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { Chessboard } from 'react-chessboard'
import { toPng } from 'html-to-image'
import { useGame } from '@/contexts/GameContext'
import { useTheme } from '@/contexts/ThemeContext'
import { Chess } from 'chess.js'

/* eslint-disable @typescript-eslint/no-explicit-any */

// Map react-chessboard piece keys to fantasy SVG file paths.
const PIECE_TO_SVG: Record<string, string> = {
  wP: '/chess/pieces/fantasy/white/p.svg',
  wN: '/chess/pieces/fantasy/white/n.svg',
  wB: '/chess/pieces/fantasy/white/b.svg',
  wR: '/chess/pieces/fantasy/white/r.svg',
  wQ: '/chess/pieces/fantasy/white/q.svg',
  wK: '/chess/pieces/fantasy/white/k.svg',
  bP: '/chess/pieces/fantasy/black/p.svg',
  bN: '/chess/pieces/fantasy/black/n.svg',
  bB: '/chess/pieces/fantasy/black/b.svg',
  bR: '/chess/pieces/fantasy/black/r.svg',
  bQ: '/chess/pieces/fantasy/black/q.svg',
  bK: '/chess/pieces/fantasy/black/k.svg',
}

// 3D depth via layered contour-following drop-shadows.
const PIECE_3D_FILTER = [
  'drop-shadow(0px 3px 2px rgba(0,0,0,0.6))',
  'drop-shadow(0px 6px 6px rgba(0,0,0,0.3))',
  'drop-shadow(0px 10px 14px rgba(0,0,0,0.15))',
].join(' ')

// Build custom piece renderers using fantasy SVG images.
const fantasyPieces = Object.fromEntries(
  Object.entries(PIECE_TO_SVG).map(([key, src]) => [
    key,
    () => (
      <div
        style={{
          width: '100%',
          height: '100%',
          filter: PIECE_3D_FILTER,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <img
          src={src}
          alt={key}
          style={{ width: '92%', height: '92%', objectFit: 'contain', pointerEvents: 'none' }}
        />
      </div>
    ),
  ])
)

// Layered CSS gradients that simulate subtle wood grain.
const woodGrainLayers = [
  'repeating-linear-gradient(88deg, transparent 0px, transparent 4px, rgba(0,0,0,0.03) 4px, rgba(0,0,0,0.03) 5px)',
  'repeating-linear-gradient(93deg, transparent 0px, transparent 8px, rgba(0,0,0,0.02) 8px, rgba(0,0,0,0.02) 9px)',
  'repeating-linear-gradient(85deg, transparent 0px, transparent 14px, rgba(0,0,0,0.015) 14px, rgba(0,0,0,0.015) 16px)',
  'repeating-linear-gradient(90deg, transparent 0px, transparent 22px, rgba(0,0,0,0.018) 22px, rgba(0,0,0,0.018) 24px)',
].join(', ')

function findKingSquare(game: Chess, color: string): string | null {
  const board = game.board()
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const sq = board[r][c]
      if (sq && sq.type === 'k' && sq.color === color) {
        return sq.square
      }
    }
  }
  return null
}

export default function ChessBoard({ boardSize = 560 }: { boardSize?: number }) {
  const { game, playerColor, makeMove, isAiThinking, lastMove, gameOver, setCapturedBoardImage } = useGame()
  const { isDark } = useTheme()
  const [moveFrom, setMoveFrom] = useState<string | null>(null)
  const [optionSquares, setOptionSquares] = useState<Record<string, any>>({})
  const gameRef = useRef(game)
  gameRef.current = game
  const boardRef = useRef<HTMLDivElement>(null)

  // Capture board as PNG when game ends
  useEffect(() => {
    if (!gameOver || !boardRef.current) return
    const timer = setTimeout(() => {
      toPng(boardRef.current!, { cacheBust: true, pixelRatio: 2, skipFonts: true })
        .then((dataUrl) => setCapturedBoardImage(dataUrl))
        .catch((err: any) => console.warn('Board capture failed:', err))
    }, 500)
    return () => clearTimeout(timer)
  }, [gameOver, setCapturedBoardImage])

  const isPlayerTurn = game.turn() === playerColor && !gameOver

  // Legal move indicators
  const showMoveOptions = useCallback((square: string) => {
    const g = gameRef.current
    const moves = g.moves({ square: square as any, verbose: true })
    if (moves.length === 0) {
      setOptionSquares({})
      return false
    }

    const options: Record<string, any> = {}
    moves.forEach((move: any) => {
      const isCapture = g.get(move.to) && g.get(move.to).color !== g.get(square as any).color
      options[move.to] = {
        background: isCapture
          ? 'radial-gradient(circle, rgba(220, 38, 38, 0.4) 85%, transparent 85%)'
          : 'radial-gradient(circle, rgba(0, 0, 0, 0.18) 22%, transparent 22%)',
        borderRadius: '50%'
      }
    })
    options[square] = { background: 'rgba(99, 102, 241, 0.4)' }
    setOptionSquares(options)
    return true
  }, [])

  const onSquareClick = useCallback(({ square }: any) => {
    if (!isPlayerTurn || isAiThinking) return

    if (moveFrom) {
      const success = makeMove(moveFrom, square)
      setMoveFrom(null)
      setOptionSquares({})
      if (success) return
    }

    const g = gameRef.current
    const boardPiece = g.get(square)
    if (boardPiece && boardPiece.color === playerColor) {
      setMoveFrom(square)
      showMoveOptions(square)
    } else {
      setMoveFrom(null)
      setOptionSquares({})
    }
  }, [isPlayerTurn, isAiThinking, moveFrom, makeMove, playerColor, showMoveOptions])

  const onPieceDrag = useCallback(({ square }: any) => {
    if (!isPlayerTurn || isAiThinking) return
    showMoveOptions(square)
  }, [isPlayerTurn, isAiThinking, showMoveOptions])

  const onPieceDrop = useCallback(({ sourceSquare, targetSquare }: any) => {
    if (!isPlayerTurn || isAiThinking) return false
    const success = makeMove(sourceSquare, targetSquare)
    setMoveFrom(null)
    setOptionSquares({})
    return success
  }, [isPlayerTurn, isAiThinking, makeMove])

  const canDragPiece = useCallback(({ piece }: any) => {
    return isPlayerTurn && !isAiThinking && piece.pieceType[0] === playerColor
  }, [isPlayerTurn, isAiThinking, playerColor])

  const squareStyles = useMemo(() => {
    const styles: Record<string, any> = {}

    // 1. Last move highlights (lowest priority — applied first)
    if (lastMove) {
      const fromBg = isDark ? 'rgba(245, 158, 11, 0.25)' : 'rgba(245, 158, 11, 0.35)'
      const toBg = isDark ? 'rgba(245, 158, 11, 0.35)' : 'rgba(245, 158, 11, 0.45)'
      styles[lastMove.from] = { background: fromBg }
      styles[lastMove.to] = { background: toBg }
    }

    // 2. Legal move indicators (higher priority — composite with lastMove)
    for (const [sq, style] of Object.entries(optionSquares)) {
      if (styles[sq]?.background && style.background) {
        styles[sq] = { ...styles[sq], ...style, background: `${style.background}, ${styles[sq].background}` }
      } else {
        styles[sq] = { ...styles[sq], ...style }
      }
    }

    // 3. Selected piece highlight
    if (moveFrom) {
      styles[moveFrom] = { ...styles[moveFrom], background: 'rgba(99, 102, 241, 0.4)' }
    }

    // 4. Check indicator (highest priority)
    if (game.inCheck()) {
      const kingSquare = findKingSquare(game, game.turn())
      if (kingSquare) {
        styles[kingSquare] = {
          ...styles[kingSquare],
          background: 'radial-gradient(circle, rgba(220, 38, 38, 0.6) 0%, rgba(220, 38, 38, 0.2) 60%, transparent 70%)'
        }
      }
    }

    return styles
  }, [optionSquares, lastMove, moveFrom, game, isDark])

  const darkSquareStyle = useMemo(() => ({
    backgroundColor: '#b58863',
    backgroundImage: woodGrainLayers,
  }), [])

  const lightSquareStyle = useMemo(() => ({
    backgroundColor: '#e8d4a2',
    backgroundImage: woodGrainLayers,
  }), [])

  return (
    <div ref={boardRef} className="relative chess-board">
      <Chessboard
        options={{
          id: 'main-board',
          pieces: fantasyPieces,
          position: game.fen(),
          onPieceDrop,
          onPieceDrag,
          onSquareClick,
          canDragPiece,
          boardOrientation: playerColor === 'w' ? 'white' : 'black',
          squareStyles,
          darkSquareStyle,
          lightSquareStyle,
          animationDurationInMs: 200,
          boardStyle: { width: `${boardSize}px`, height: `${boardSize}px` },
        }}
      />

      {isAiThinking && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className={`
            px-4 py-2 rounded-full text-sm font-medium animate-pulse
            ${isDark ? 'bg-black/60 text-white/80' : 'bg-white/80 text-gray-700 shadow-md'}
          `}>
            <span className="flex items-center gap-2">
              <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              AI is thinking...
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
