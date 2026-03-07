'use client'

import { useMemo, useCallback } from 'react'
import { Contract, JsonRpcProvider } from 'ethers'
import { useWallet } from '@/contexts/WalletContext'
import ChessLeaderboardABI from '@/abi/ChessLeaderboard.json'
import ChessGameNFTABI from '@/abi/ChessGameNFT.json'

const LEADERBOARD_ADDRESS = process.env.NEXT_PUBLIC_LEADERBOARD_ADDRESS
const NFT_ADDRESS = process.env.NEXT_PUBLIC_NFT_ADDRESS
const BASE_RPC = process.env.NEXT_PUBLIC_BASE_RPC_URL || 'https://mainnet.base.org'

export function useContracts() {
  const { getSigner, isConnected, isCorrectNetwork } = useWallet()

  // Always use dedicated RPC for reads so they work regardless of wallet network
  const readProvider = useMemo(() => new JsonRpcProvider(BASE_RPC), [])

  const leaderboardReader = useMemo(() => {
    if (!LEADERBOARD_ADDRESS) return null
    return new Contract(LEADERBOARD_ADDRESS, ChessLeaderboardABI.abi, readProvider)
  }, [readProvider])

  const nftReader = useMemo(() => {
    if (!NFT_ADDRESS) return null
    return new Contract(NFT_ADDRESS, ChessGameNFTABI.abi, readProvider)
  }, [readProvider])

  const getLeaderboardWriter = useCallback(async () => {
    const signer = await getSigner()
    if (!signer || !isConnected || !isCorrectNetwork || !LEADERBOARD_ADDRESS) return null
    return new Contract(LEADERBOARD_ADDRESS, ChessLeaderboardABI.abi, signer)
  }, [getSigner, isConnected, isCorrectNetwork])

  const getNFTWriter = useCallback(async () => {
    const signer = await getSigner()
    if (!signer || !isConnected || !isCorrectNetwork || !NFT_ADDRESS) return null
    return new Contract(NFT_ADDRESS, ChessGameNFTABI.abi, signer)
  }, [getSigner, isConnected, isCorrectNetwork])

  return {
    leaderboardReader,
    nftReader,
    getLeaderboardWriter,
    getNFTWriter,
    leaderboardAddress: LEADERBOARD_ADDRESS,
    nftAddress: NFT_ADDRESS,
  }
}
