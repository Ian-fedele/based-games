'use client'

import { useState, useCallback } from 'react'
import { Contract } from 'ethers'

/* eslint-disable @typescript-eslint/no-explicit-any */

// ─── Types ─────────────────────────────────────────────────────

interface MintNFTState {
  isMinting: boolean
  isUploading: boolean
  txHash: string | null
  tokenId: string | null
  error: string | null
  mintPromptInvadersNFT: (params: MintParams) => Promise<void>
  resetMint: () => void
}

interface MintParams {
  imageBlob: Blob
  score: number
  wave: number
}

// ─── useMintPromptInvadersNFT ──────────────────────────────────
export function useMintPromptInvadersNFT(
  getContract: () => Promise<Contract | null>
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

  const mintPromptInvadersNFT = useCallback(
    async ({ imageBlob, score, wave }: MintParams) => {
      resetMint()

      try {
        setIsUploading(true)

        // Upload image via server-side API route
        const imgForm = new FormData()
        imgForm.append('file', imageBlob, 'prompt-invaders-score.jpg')
        imgForm.append('name', `PromptInvaders-Score-${score}`)

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
          name: `Prompt Invaders — Score ${score}`,
          description: `Scored ${score} points in Prompt Invaders, reaching wave ${wave}.`,
          image: imageURI,
          attributes: [
            { trait_type: 'Score', value: score },
            { trait_type: 'Wave', value: wave },
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
    [getContract, resetMint]
  )

  return {
    isMinting,
    isUploading,
    txHash,
    tokenId,
    error,
    mintPromptInvadersNFT,
    resetMint,
  }
}
