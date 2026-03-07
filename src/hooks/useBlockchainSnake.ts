'use client'

import { useState, useCallback, useRef } from 'react'
import { ethers, Contract, Signer } from 'ethers'
import { SNAKE_CONTRACT_ADDRESS, SNAKE_CONTRACT_ABI } from '@/lib/snakeContract'

/* eslint-disable @typescript-eslint/no-explicit-any */

// ─── Types ─────────────────────────────────────────────────────
interface GameSeedState {
  seed: string | null
  committed: boolean
  revealed: boolean
  commitSeed: () => Promise<void>
  revealSeed: () => Promise<void>
  getNextApple: (cols: number, rows: number, snake: number[][]) => number[]
}

interface MintNFTState {
  isMinting: boolean
  isUploading: boolean
  txHash: string | null
  tokenId: string | null
  error: string | null
  mintSnakeNFT: (params: MintParams) => Promise<void>
  resetMint: () => void
}

interface MintParams {
  imageBlob: Blob
  score: number
  snakeLength: number
  applesEaten: number
  theme: string
  seed: string | null
}

// ─── Helpers ───────────────────────────────────────────────────

/** Simple deterministic PRNG seeded by a string (xorshift32). */
function makeSeededRandom(seedStr: string) {
  let h = 0
  for (let i = 0; i < seedStr.length; i++) {
    h = (Math.imul(31, h) + seedStr.charCodeAt(i)) | 0
  }
  let state = h || 1
  return () => {
    state ^= state << 13
    state ^= state >> 17
    state ^= state << 5
    return (state >>> 0) / 4294967296
  }
}

/** Generates a random hex seed string. */
function generateSeed(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

// ─── useGameSeed ───────────────────────────────────────────────
export function useGameSeed(
  getContract: () => Promise<Contract | null>
): GameSeedState {
  const [committed, setCommitted] = useState(false)
  const [revealed, setRevealed] = useState(false)
  const seedRef = useRef<string | null>(null)
  const rngRef = useRef<(() => number) | null>(null)
  const appleIndexRef = useRef(0)

  const commitSeed = useCallback(async () => {
    const seed = generateSeed()
    seedRef.current = seed

    rngRef.current = makeSeededRandom(seed)
    appleIndexRef.current = 0

    const contract = await getContract()
    if (contract) {
      try {
        const existingCommit = await contract.getSeedCommit(
          await (contract.runner as Signer)?.getAddress()
        )
        if (existingCommit !== ethers.ZeroHash) {
          try {
            const cancelTx = await contract.cancelCommit()
            await cancelTx.wait()
          } catch {
            console.warn('Could not cancel stale commit (time-lock). Playing unverified.')
            setCommitted(false)
            return
          }
        }

        const hash = ethers.keccak256(ethers.toUtf8Bytes(seed))
        const tx = await contract.commitSeed(hash)
        await tx.wait()
        setCommitted(true)
      } catch (err) {
        console.error('On-chain commit failed:', err)
        setCommitted(false)
      }
    }
  }, [getContract])

  const revealSeed = useCallback(async () => {
    if (!seedRef.current || !committed) return
    const contract = await getContract()
    if (contract) {
      try {
        const tx = await contract.revealSeed(seedRef.current)
        await tx.wait()
        setRevealed(true)
      } catch (err) {
        console.error('Seed reveal failed:', err)
      }
    }
  }, [getContract, committed])

  const getNextApple = useCallback(
    (cols: number, rows: number, snake: number[][]): number[] => {
      const rng = rngRef.current ?? Math.random
      const occupied = new Set(snake.map(([x, y]) => `${x},${y}`))

      for (let attempt = 0; attempt < 100; attempt++) {
        const x = Math.floor(rng() * cols)
        const y = Math.floor(rng() * rows)
        if (!occupied.has(`${x},${y}`)) {
          appleIndexRef.current++
          return [x, y]
        }
      }

      for (let x = 0; x < cols; x++) {
        for (let y = 0; y < rows; y++) {
          if (!occupied.has(`${x},${y}`)) return [x, y]
        }
      }
      return [0, 0]
    },
    []
  )

  return {
    seed: seedRef.current,
    committed,
    revealed,
    commitSeed,
    revealSeed,
    getNextApple,
  }
}

// ─── useMintNFT ────────────────────────────────────────────────
export function useMintNFT(
  getContract: () => Promise<Contract | null>,
  revealSeed: () => Promise<void>
): MintNFTState {
  const [isMinting, setIsMinting] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [txHash, setTxHash] = useState<string | null>(null)
  const [tokenId, setTokenId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const resetMint = useCallback(() => {
    setIsMinting(false)
    setIsUploading(false)
    setTxHash(null)
    setTokenId(null)
    setError(null)
  }, [])

  const mintSnakeNFT = useCallback(
    async ({ imageBlob, score, snakeLength, applesEaten, theme, seed }: MintParams) => {
      resetMint()

      try {
        setIsUploading(true)

        // Upload image via server-side API route
        const imgForm = new FormData()
        imgForm.append('file', imageBlob, 'neon-snake-score.png')
        imgForm.append('name', `NeonSnake-Score-${score}`)

        const imgRes = await fetch('/api/upload', {
          method: 'POST',
          body: imgForm,
        })

        if (!imgRes.ok) {
          const errData = await imgRes.json().catch(() => ({}))
          throw new Error(errData.error || `Image upload failed: ${imgRes.statusText}`)
        }
        const imgData = await imgRes.json()
        const imageURI = `ipfs://${imgData.ipfsHash}`

        // Build & upload ERC-721 metadata JSON
        const metadata = {
          name: `Neon Snake — Score ${score}`,
          description: `Scored ${score} points in Neon Snake (${applesEaten} apples, length ${snakeLength}). Theme: ${theme}.${seed ? ` Verified seed: ${seed.slice(0, 16)}…` : ''}`,
          image: imageURI,
          attributes: [
            { trait_type: 'Score', value: score },
            { trait_type: 'Snake Length', value: snakeLength },
            { trait_type: 'Apples Eaten', value: applesEaten },
            { trait_type: 'Theme', value: theme },
            { trait_type: 'Verified', value: seed ? 'Yes' : 'No' },
          ],
        }

        const metaRes = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(metadata),
        })

        if (!metaRes.ok) {
          const errData = await metaRes.json().catch(() => ({}))
          throw new Error(errData.error || `Metadata upload failed: ${metaRes.statusText}`)
        }
        const metaData = await metaRes.json()
        const tokenURI = `ipfs://${metaData.ipfsHash}`
        setIsUploading(false)

        // Reveal the seed on-chain
        await revealSeed()

        // Mint NFT
        setIsMinting(true)
        const contract = await getContract()
        if (!contract) throw new Error('Wallet not connected')

        const mintFee = await contract.mintFee()
        const tx = await contract.mintScore(tokenURI, score, { value: mintFee })
        setTxHash(tx.hash)

        const receipt = await tx.wait()

        const mintEvent = receipt?.logs?.find((log: any) => {
          try {
            const parsed = contract.interface.parseLog({
              topics: log.topics,
              data: log.data,
            })
            return parsed?.name === 'ScoreMinted'
          } catch {
            return false
          }
        })

        if (mintEvent) {
          const parsed = contract.interface.parseLog({
            topics: mintEvent.topics,
            data: mintEvent.data,
          })
          if (parsed) {
            setTokenId(parsed.args[1].toString())
          }
        }

        setIsMinting(false)
      } catch (err: any) {
        console.error('Mint failed:', err)
        setError(err?.message || 'Minting failed. Please try again.')
        setIsMinting(false)
        setIsUploading(false)
      }
    },
    [getContract, revealSeed, resetMint]
  )

  return {
    isMinting,
    isUploading,
    txHash,
    tokenId,
    error,
    mintSnakeNFT,
    resetMint,
  }
}
