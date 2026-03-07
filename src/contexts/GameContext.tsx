'use client'

import { createContext, useContext, useState, useCallback, useRef, useEffect, type ReactNode } from 'react'
import { Chess } from 'chess.js'
import { useWallet } from './WalletContext'
import { useNavGuard } from './NavGuardContext'
import { useContracts } from '@/hooks/useContracts'
import { verifyGame } from '@/lib/verifyGame'

/* eslint-disable @typescript-eslint/no-explicit-any */

const GameContext = createContext<any>(null)

function getDifficultySettings(level: number) {
  const clamped = Math.max(1, Math.min(10, level))
  const depth = Math.round(1 + ((clamped - 1) / 9) * 14.25)
  const moveTime = Math.round(500 + ((clamped - 1) / 9) * 1875)
  return { depth, moveTime }
}

export function GameProvider({ children }: { children: ReactNode }) {
  const { address, isConnected, isCorrectNetwork } = useWallet()
  const { setGuard } = useNavGuard()
  const { getLeaderboardWriter } = useContracts()
  const [game, setGame] = useState(() => new Chess())
  const [gameStarted, setGameStarted] = useState(false)
  const [playerColor, setPlayerColor] = useState('w')
  const [difficulty, setDifficulty] = useState(5)
  const [moveHistory, setMoveHistory] = useState<any[]>([])
  const [gameOver, setGameOver] = useState<any>(null)
  const [isAiThinking, setIsAiThinking] = useState(false)
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null)
  const [undosRemaining, setUndosRemaining] = useState(3)
  const engineRef = useRef<Worker | null>(null)
  const [engineReady, setEngineReady] = useState(false)
  const [completedGame, setCompletedGame] = useState<any>(null)
  const [capturedBoardImage, setCapturedBoardImage] = useState<string | null>(null)

  const gameRef = useRef(game)
  gameRef.current = game
  const playerColorRef = useRef(playerColor)
  playerColorRef.current = playerColor
  const difficultyRef = useRef(difficulty)
  difficultyRef.current = difficulty

  const [engineError, setEngineError] = useState(false)

  const aiTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const aiListenerRef = useRef<((e: MessageEvent) => void) | null>(null)

  // Helper to cancel any pending AI move
  const cancelPendingAi = useCallback(() => {
    if (aiTimerRef.current) {
      clearTimeout(aiTimerRef.current)
      aiTimerRef.current = null
    }
    if (aiListenerRef.current && engineRef.current) {
      engineRef.current.removeEventListener('message', aiListenerRef.current)
      aiListenerRef.current = null
    }
    setIsAiThinking(false)
  }, [])

  // Set navigation guard when game is in progress
  useEffect(() => {
    if (gameStarted && !gameOver) {
      setGuard('You have a game in progress. Are you sure you want to leave? All progress will be lost.')
    } else {
      setGuard(null)
    }
    return () => setGuard(null)
  }, [gameStarted, gameOver, setGuard])

  // Initialize Stockfish web worker
  useEffect(() => {
    let worker: Worker
    try {
      worker = new Worker('/chess/stockfish.js')
    } catch {
      setEngineError(true)
      return
    }
    engineRef.current = worker

    worker.onmessage = (e) => {
      const msg = e.data
      if (msg === 'uciok') worker.postMessage('isready')
      if (msg === 'readyok') setEngineReady(true)
    }

    worker.onerror = () => setEngineError(true)
    worker.postMessage('uci')

    return () => {
      if (aiTimerRef.current) clearTimeout(aiTimerRef.current)
      worker.terminate()
      engineRef.current = null
    }
  }, [])

  const recordOnChain = useCallback(async (result: string, pgn: string, resigned = false) => {
    if (!isConnected || !isCorrectNetwork || !address) return
    try {
      const verification = await verifyGame({
        pgn,
        result,
        difficulty: difficultyRef.current,
        playerColor: playerColorRef.current,
        playerAddress: address,
        action: 'recordGame',
        resigned,
      })

      const contract = await getLeaderboardWriter()
      if (!contract) return
      const won = result === 'win'
      await contract.recordGame(
        difficultyRef.current,
        won,
        verification.nonce,
        verification.signature
      )
    } catch (err: any) {
      console.warn('Leaderboard recording failed:', err.message)
    }
  }, [isConnected, isCorrectNetwork, address, getLeaderboardWriter])

  const saveGameResult = useCallback((result: string, g?: Chess) => {
    if (!address) return
    const currentGame = g || gameRef.current
    const moveCount = currentGame.history().length
    const key = `chess_history_${address.toLowerCase()}`
    let history: any[] = []
    try { history = JSON.parse(localStorage.getItem(key) || '[]') } catch { /* corrupted data */ }
    history.push({
      result,
      difficulty: difficultyRef.current,
      playerColor: playerColorRef.current,
      date: new Date().toISOString(),
      moves: moveCount,
    })
    localStorage.setItem(key, JSON.stringify(history))

    setCompletedGame({
      pgn: currentGame.pgn(),
      fen: currentGame.fen(),
      result,
      difficulty: difficultyRef.current,
      playerColor: playerColorRef.current,
      moveCount,
    })

    recordOnChain(result, currentGame.pgn())
  }, [address, recordOnChain])

  const checkGameOver = useCallback((g: Chess) => {
    if (g.isCheckmate()) {
      const winner = g.turn() === 'w' ? 'b' : 'w'
      setGameOver({ type: 'checkmate', winner })
      saveGameResult(winner === playerColorRef.current ? 'win' : 'loss', g)
    } else if (g.isDraw()) {
      let reason = 'draw'
      if (g.isStalemate()) reason = 'stalemate'
      else if (g.isThreefoldRepetition()) reason = 'repetition'
      else if (g.isInsufficientMaterial()) reason = 'insufficient'
      setGameOver({ type: reason, winner: null })
      saveGameResult('draw', g)
    }
  }, [saveGameResult])

  const requestAiMove = useCallback((fen: string) => {
    if (!engineRef.current) return
    setIsAiThinking(true)

    const settings = getDifficultySettings(difficultyRef.current)
    const worker = engineRef.current

    if (aiListenerRef.current) {
      worker.removeEventListener('message', aiListenerRef.current)
      aiListenerRef.current = null
    }
    if (aiTimerRef.current) {
      clearTimeout(aiTimerRef.current)
      aiTimerRef.current = null
    }

    const startTime = Date.now()

    const handleMessage = (e: MessageEvent) => {
      const msg = e.data
      if (typeof msg === 'string' && msg.startsWith('bestmove')) {
        worker.removeEventListener('message', handleMessage)
        aiListenerRef.current = null
        const bestMove = msg.split(' ')[1]

        if (bestMove && bestMove !== '(none)') {
          const elapsed = Date.now() - startTime
          const remaining = Math.max(0, settings.moveTime - elapsed)

          aiTimerRef.current = setTimeout(() => {
            aiTimerRef.current = null
            const current = gameRef.current
            const g = new Chess()
            g.loadPgn(current.pgn())
            const from = bestMove.slice(0, 2)
            const to = bestMove.slice(2, 4)
            const promotion = bestMove[4] || undefined
            const result = g.move({ from, to, promotion })
            if (result) {
              setGame(g)
              setMoveHistory((h) => [...h, result])
              setLastMove({ from, to })
              checkGameOver(g)
            }
            setIsAiThinking(false)
          }, remaining)
        } else {
          setIsAiThinking(false)
        }
      }
    }

    aiListenerRef.current = handleMessage
    worker.addEventListener('message', handleMessage)
    worker.postMessage(`position fen ${fen}`)
    worker.postMessage(`go depth ${settings.depth}`)
  }, [checkGameOver])

  const makeMove = useCallback((from: string, to: string, promotion = 'q') => {
    if (from === to) return false
    const current = gameRef.current
    const g = new Chess()
    g.loadPgn(current.pgn())
    let move
    try {
      move = g.move({ from, to, promotion })
    } catch {
      return false
    }
    if (!move) return false

    setGame(g)
    setMoveHistory((prev) => [...prev, move])
    setLastMove({ from, to })
    checkGameOver(g)

    if (!g.isGameOver()) {
      requestAiMove(g.fen())
    }

    return true
  }, [checkGameOver, requestAiMove])

  const startGame = useCallback((color = 'w', diff = 5) => {
    cancelPendingAi()
    const g = new Chess()
    setGame(g)
    setPlayerColor(color)
    setDifficulty(diff)
    setMoveHistory([])
    setGameOver(null)
    setLastMove(null)
    setUndosRemaining(3)
    setCompletedGame(null)
    setCapturedBoardImage(null)
    setGameStarted(true)

    if (color === 'b') {
      setTimeout(() => requestAiMove(g.fen()), 500)
    }
  }, [requestAiMove, cancelPendingAi])

  const undoMove = useCallback(() => {
    if (undosRemaining <= 0 || isAiThinking) return false
    const current = gameRef.current
    const g = new Chess()
    g.loadPgn(current.pgn())

    const undone1 = g.undo()
    const undone2 = g.undo()
    if (!undone1 && !undone2) return false

    const undoneCount = (undone1 ? 1 : 0) + (undone2 ? 1 : 0)
    setGame(g)
    setMoveHistory((prev) => prev.slice(0, -undoneCount))
    setUndosRemaining((prev) => prev - 1)
    setLastMove(null)

    // If it's now the AI's turn after undo, request AI move
    if (g.turn() !== playerColorRef.current && !g.isGameOver()) {
      requestAiMove(g.fen())
    }
    return true
  }, [undosRemaining, isAiThinking, requestAiMove])

  const resign = useCallback(() => {
    const winner = playerColorRef.current === 'w' ? 'b' : 'w'
    setGameOver({ type: 'resignation', winner })
    const currentGame = gameRef.current
    const moveCount = currentGame.history().length

    if (address) {
      const key = `chess_history_${address.toLowerCase()}`
      let history: any[] = []
      try { history = JSON.parse(localStorage.getItem(key) || '[]') } catch { /* corrupted data */ }
      history.push({
        result: 'loss',
        difficulty: difficultyRef.current,
        playerColor: playerColorRef.current,
        date: new Date().toISOString(),
        moves: moveCount,
      })
      localStorage.setItem(key, JSON.stringify(history))
    }

    setCompletedGame({
      pgn: currentGame.pgn(),
      fen: currentGame.fen(),
      result: 'loss',
      difficulty: difficultyRef.current,
      playerColor: playerColorRef.current,
      moveCount,
      resigned: true,
    })

    recordOnChain('loss', currentGame.pgn(), true)
  }, [address, recordOnChain])

  const exitGame = useCallback(() => {
    cancelPendingAi()
    setGameStarted(false)
    setGame(new Chess())
    setMoveHistory([])
    setGameOver(null)
    setLastMove(null)
    setCompletedGame(null)
    setCapturedBoardImage(null)
  }, [cancelPendingAi])

  const getGameHistory = useCallback(() => {
    if (!address) return []
    const key = `chess_history_${address.toLowerCase()}`
    try { return JSON.parse(localStorage.getItem(key) || '[]') } catch { return [] }
  }, [address])

  return (
    <GameContext.Provider value={{
      game,
      gameStarted,
      playerColor,
      difficulty,
      moveHistory,
      gameOver,
      isAiThinking,
      lastMove,
      undosRemaining,
      engineReady,
      engineError,
      completedGame,
      capturedBoardImage,
      setCapturedBoardImage,
      startGame,
      makeMove,
      undoMove,
      resign,
      exitGame,
      getGameHistory,
      setDifficulty,
    }}>
      {children}
    </GameContext.Provider>
  )
}

export function useGame() {
  const ctx = useContext(GameContext)
  if (!ctx) throw new Error('useGame must be used within GameProvider')
  return ctx
}
