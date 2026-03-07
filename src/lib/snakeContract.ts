// Snake NFT contract ABI & address for Base Sepolia

export const SNAKE_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_SNAKE_CONTRACT_ADDRESS || '0x71Ed40b929FA9Cb8690ba8536BBAD01494218f04'

export const SNAKE_CONTRACT_ABI = [
  // Seed commit/reveal
  {
    inputs: [{ internalType: 'bytes32', name: 'hash', type: 'bytes32' }],
    name: 'commitSeed',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'cancelCommit',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'string', name: 'seed', type: 'string' }],
    name: 'revealSeed',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'player', type: 'address' }],
    name: 'getSeedCommit',
    outputs: [{ internalType: 'bytes32', name: '', type: 'bytes32' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'hasRevealed',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },

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
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'player', type: 'address' },
      { indexed: false, internalType: 'bytes32', name: 'commitHash', type: 'bytes32' },
    ],
    name: 'SeedCommitted',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'player', type: 'address' },
      { indexed: false, internalType: 'string', name: 'seed', type: 'string' },
    ],
    name: 'SeedRevealed',
    type: 'event',
  },
] as const
