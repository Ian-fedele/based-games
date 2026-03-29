// Prompt Invaders NFT contract ABI & address for Base

export const PROMPT_INVADERS_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_PROMPT_INVADERS_CONTRACT_ADDRESS || ''

export const PROMPT_INVADERS_CONTRACT_ABI = [
  // NFT Minting (payable, with score param)
  {
    inputs: [
      { internalType: 'string', name: '_tokenURI', type: 'string' },
      { internalType: 'uint256', name: '_score', type: 'uint256' },
    ],
    name: 'mintScore',
    outputs: [{ internalType: 'uint256', name: 'tokenId', type: 'uint256' }],
    stateMutability: 'payable',
    type: 'function',
  },

  // View functions
  {
    inputs: [],
    name: 'mintFee',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'mintCooldown',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'lastMintTime',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },

  // Events
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'player', type: 'address' },
      { indexed: false, internalType: 'uint256', name: 'tokenId', type: 'uint256' },
      { indexed: false, internalType: 'uint256', name: 'score', type: 'uint256' },
      { indexed: false, internalType: 'string', name: 'tokenURI', type: 'string' },
    ],
    name: 'ScoreMinted',
    type: 'event',
  },
] as const
