const BASE_SEPOLIA_CHAIN_ID = 84532
const BASE_MAINNET_CHAIN_ID = 8453

export const TARGET_CHAIN_ID = Number(process.env.NEXT_PUBLIC_BASE_CHAIN_ID || BASE_SEPOLIA_CHAIN_ID)

export const CHAIN_CONFIG: Record<number, {
  chainName: string
  nativeCurrency: { name: string; symbol: string; decimals: number }
  rpcUrls: string[]
  blockExplorerUrls: string[]
}> = {
  [BASE_MAINNET_CHAIN_ID]: {
    chainName: 'Base',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: ['https://mainnet.base.org'],
    blockExplorerUrls: ['https://basescan.org'],
  },
  [BASE_SEPOLIA_CHAIN_ID]: {
    chainName: 'Base Sepolia',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: ['https://sepolia.base.org'],
    blockExplorerUrls: ['https://sepolia.basescan.org'],
  },
}
