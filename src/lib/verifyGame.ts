const SUPABASE_FUNCTION_URL = process.env.NEXT_PUBLIC_SUPABASE_FUNCTION_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

interface VerifyGameParams {
  pgn: string
  result: string
  difficulty: number
  playerColor: string
  playerAddress: string
  action: 'recordGame' | 'mintNFT'
  resigned?: boolean
  boardImage?: string
}

interface VerifyGameResponse {
  signature: string
  nonce: string
  moveCount: number
  fen: string
  metadataURI?: string
}

export async function verifyGame(params: VerifyGameParams): Promise<VerifyGameResponse> {
  if (!SUPABASE_FUNCTION_URL) {
    throw new Error('NEXT_PUBLIC_SUPABASE_FUNCTION_URL is not configured')
  }

  const response = await fetch(SUPABASE_FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify(params),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Game verification failed' }))
    throw new Error(err.error || 'Game verification failed')
  }

  return response.json()
}
