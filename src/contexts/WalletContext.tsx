'use client'

import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react'
import { BrowserProvider, type Signer } from 'ethers'
import { TARGET_CHAIN_ID, CHAIN_CONFIG } from '@/lib/chainConfig'

interface WalletContextType {
  address: string | null
  shortAddress: string | null
  chainId: number | null
  isConnected: boolean
  isCorrectNetwork: boolean
  isConnecting: boolean
  isSwitchingChain: boolean
  error: string | null
  getProvider: () => BrowserProvider | null
  getSigner: () => Promise<Signer | null>
  connect: () => Promise<void>
  disconnect: () => void
  switchToBase: () => Promise<void>
  clearError: () => void
  targetChainId: number
}

const WalletContext = createContext<WalletContextType | null>(null)

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null)
  const [chainId, setChainId] = useState<number | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isSwitchingChain, setIsSwitchingChain] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const providerRef = useRef<BrowserProvider | null>(null)
  const signerRef = useRef<Signer | null>(null)

  const getProvider = useCallback(() => providerRef.current, [])

  const getSigner = useCallback(async (): Promise<Signer | null> => {
    if (signerRef.current) return signerRef.current
    if (!providerRef.current) return null
    try {
      signerRef.current = await providerRef.current.getSigner()
      return signerRef.current
    } catch {
      return null
    }
  }, [])

  const refreshSigner = useCallback(async () => {
    if (!providerRef.current) return
    try {
      signerRef.current = await providerRef.current.getSigner()
    } catch {
      signerRef.current = null
    }
  }, [])

  const refreshChainId = useCallback(async () => {
    if (typeof window === 'undefined' || !window.ethereum) return
    try {
      const hex = await window.ethereum.request({ method: 'eth_chainId' })
      setChainId(parseInt(hex as string, 16))
    } catch { /* ignore */ }
  }, [])

  // Restore previous session
  useEffect(() => {
    if (typeof window === 'undefined' || !window.ethereum) return
    const saved = localStorage.getItem('basedgames_wallet_address')
    if (!saved) return
    window.ethereum.request({ method: 'eth_accounts' }).then(async (result: unknown) => {
      const accounts = result as string[]
      if (accounts.length > 0 && accounts[0].toLowerCase() === saved.toLowerCase()) {
        providerRef.current = new BrowserProvider(window.ethereum!)
        await refreshSigner()
        await refreshChainId()
        setAddress(accounts[0])
      } else {
        localStorage.removeItem('basedgames_wallet_address')
      }
    }).catch(() => {
      localStorage.removeItem('basedgames_wallet_address')
    })
  }, [refreshSigner, refreshChainId])

  // Listen for account changes
  useEffect(() => {
    if (typeof window === 'undefined' || !window.ethereum) return
    const handleAccountsChanged = async (...args: unknown[]) => {
      const accounts = args[0] as string[]
      if (accounts.length === 0) {
        disconnect()
      } else {
        setAddress(accounts[0])
        localStorage.setItem('basedgames_wallet_address', accounts[0])
        await refreshSigner()
      }
    }
    window.ethereum.on('accountsChanged', handleAccountsChanged)
    return () => { window.ethereum?.removeListener('accountsChanged', handleAccountsChanged) }
  }, [refreshSigner])

  // Listen for chain changes
  useEffect(() => {
    if (typeof window === 'undefined' || !window.ethereum) return
    const handleChainChanged = async (...args: unknown[]) => {
      const chainHex = args[0] as string
      setChainId(parseInt(chainHex, 16))
      if (providerRef.current) {
        providerRef.current = new BrowserProvider(window.ethereum!)
        await refreshSigner()
      }
    }
    window.ethereum.on('chainChanged', handleChainChanged)
    return () => { window.ethereum?.removeListener('chainChanged', handleChainChanged) }
  }, [refreshSigner])

  const connect = useCallback(async () => {
    setError(null)
    setIsConnecting(true)
    try {
      if (typeof window === 'undefined' || !window.ethereum) {
        throw new Error('No Web3 wallet detected. Please install MetaMask or another Ethereum wallet.')
      }
      const provider = new BrowserProvider(window.ethereum)
      const accounts = await provider.send('eth_requestAccounts', [])
      if (accounts.length === 0) {
        throw new Error('No accounts found. Please unlock your wallet.')
      }
      providerRef.current = provider
      signerRef.current = await provider.getSigner()
      setAddress(accounts[0])
      localStorage.setItem('basedgames_wallet_address', accounts[0])
      await refreshChainId()
    } catch (err: unknown) {
      const e = err as { code?: number; message?: string }
      if (e.code === 4001) {
        setError('Connection rejected. Please approve the wallet request.')
      } else {
        setError(e.message || 'Failed to connect wallet.')
      }
    } finally {
      setIsConnecting(false)
    }
  }, [refreshChainId])

  const disconnect = useCallback(() => {
    setAddress(null)
    setChainId(null)
    setError(null)
    providerRef.current = null
    signerRef.current = null
    localStorage.removeItem('basedgames_wallet_address')
  }, [])

  const switchToBase = useCallback(async () => {
    if (typeof window === 'undefined' || !window.ethereum) return
    setIsSwitchingChain(true)
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${TARGET_CHAIN_ID.toString(16)}` }],
      })
    } catch (err: unknown) {
      const e = err as { code?: number }
      if (e.code === 4902) {
        const config = CHAIN_CONFIG[TARGET_CHAIN_ID]
        await window.ethereum?.request({
          method: 'wallet_addEthereumChain',
          params: [{ chainId: `0x${TARGET_CHAIN_ID.toString(16)}`, ...config }],
        })
      } else {
        setError('Failed to switch network.')
      }
    } finally {
      setIsSwitchingChain(false)
    }
  }, [])

  const shortAddress = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : null
  const isCorrectNetwork = chainId === TARGET_CHAIN_ID

  return (
    <WalletContext.Provider value={{
      address,
      shortAddress,
      chainId,
      isConnected: !!address,
      isCorrectNetwork,
      isConnecting,
      isSwitchingChain,
      error,
      getProvider,
      getSigner,
      connect,
      disconnect,
      switchToBase,
      clearError: () => setError(null),
      targetChainId: TARGET_CHAIN_ID,
    }}>
      {children}
    </WalletContext.Provider>
  )
}

export function useWallet() {
  const ctx = useContext(WalletContext)
  if (!ctx) throw new Error('useWallet must be used within WalletProvider')
  return ctx
}

// Global type for window.ethereum
declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
      on: (event: string, handler: (...args: unknown[]) => void) => void
      removeListener: (event: string, handler: (...args: unknown[]) => void) => void
    }
  }
}
