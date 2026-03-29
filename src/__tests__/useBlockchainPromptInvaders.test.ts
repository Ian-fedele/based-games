import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useMintPromptInvadersNFT } from '@/hooks/useBlockchainPromptInvaders'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

// Silence expected console.error from the hook's error handling paths
vi.spyOn(console, 'error').mockImplementation(() => {})

describe('useMintPromptInvadersNFT', () => {
  const mockContract = {
    mintFee: vi.fn(),
    mintScore: vi.fn(),
    interface: {
      parseLog: vi.fn(),
    },
  }

  const getContract = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockReset()
    getContract.mockReset()
  })

  it('returns initial state', () => {
    const { result } = renderHook(() => useMintPromptInvadersNFT(getContract))

    expect(result.current.isMinting).toBe(false)
    expect(result.current.isUploading).toBe(false)
    expect(result.current.txHash).toBeNull()
    expect(result.current.tokenId).toBeNull()
    expect(result.current.error).toBeNull()
    expect(typeof result.current.mintPromptInvadersNFT).toBe('function')
    expect(typeof result.current.resetMint).toBe('function')
  })

  it('resetMint clears all state', async () => {
    const { result } = renderHook(() => useMintPromptInvadersNFT(getContract))

    // Trigger an error to set some state
    getContract.mockResolvedValue(null)
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ ipfsHash: 'QmImg' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ ipfsHash: 'QmMeta' }),
      })

    await act(async () => {
      await result.current.mintPromptInvadersNFT({
        imageBlob: new Blob(['test']),
        score: 100,
        wave: 1,
      })
    })

    expect(result.current.error).toBeTruthy()

    act(() => {
      result.current.resetMint()
    })

    expect(result.current.isMinting).toBe(false)
    expect(result.current.isUploading).toBe(false)
    expect(result.current.txHash).toBeNull()
    expect(result.current.tokenId).toBeNull()
    expect(result.current.error).toBeNull()
  })

  it('sets error when image upload fails', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      statusText: 'Bad Request',
      json: () => Promise.resolve({ error: 'Upload failed' }),
    })

    const { result } = renderHook(() => useMintPromptInvadersNFT(getContract))

    await act(async () => {
      await result.current.mintPromptInvadersNFT({
        imageBlob: new Blob(['test']),
        score: 100,
        wave: 1,
      })
    })

    expect(result.current.error).toBe('Upload failed')
    expect(result.current.isMinting).toBe(false)
    expect(result.current.isUploading).toBe(false)
  })

  it('sets error when metadata upload fails', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ ipfsHash: 'QmImg' }),
      })
      .mockResolvedValueOnce({
        ok: false,
        statusText: 'Server Error',
        json: () => Promise.resolve({ error: 'Metadata failed' }),
      })

    const { result } = renderHook(() => useMintPromptInvadersNFT(getContract))

    await act(async () => {
      await result.current.mintPromptInvadersNFT({
        imageBlob: new Blob(['test']),
        score: 200,
        wave: 3,
      })
    })

    expect(result.current.error).toBe('Metadata failed')
  })

  it('sets error when wallet not connected (getContract returns null)', async () => {
    getContract.mockResolvedValue(null)
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ ipfsHash: 'QmImg' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ ipfsHash: 'QmMeta' }),
      })

    const { result } = renderHook(() => useMintPromptInvadersNFT(getContract))

    await act(async () => {
      await result.current.mintPromptInvadersNFT({
        imageBlob: new Blob(['test']),
        score: 100,
        wave: 1,
      })
    })

    expect(result.current.error).toBe('Wallet not connected')
  })

  it('completes full mint flow successfully', async () => {
    const mockTx = {
      hash: '0xabc123',
      wait: vi.fn().mockResolvedValue({
        logs: [{
          topics: ['0xtopic'],
          data: '0xdata',
        }],
      }),
    }

    mockContract.mintFee.mockResolvedValue(BigInt(1000))
    mockContract.mintScore.mockResolvedValue(mockTx)
    mockContract.interface.parseLog
      .mockReturnValueOnce({ name: 'ScoreMinted', args: ['0xplayer', BigInt(42), BigInt(100), 'ipfs://QmMeta'] })
      .mockReturnValueOnce({ name: 'ScoreMinted', args: ['0xplayer', BigInt(42), BigInt(100), 'ipfs://QmMeta'] })

    getContract.mockResolvedValue(mockContract)

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ ipfsHash: 'QmImg123' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ ipfsHash: 'QmMeta456' }),
      })

    const { result } = renderHook(() => useMintPromptInvadersNFT(getContract))

    await act(async () => {
      await result.current.mintPromptInvadersNFT({
        imageBlob: new Blob(['image data']),
        score: 500,
        wave: 5,
      })
    })

    expect(result.current.txHash).toBe('0xabc123')
    expect(result.current.tokenId).toBe('42')
    expect(result.current.error).toBeNull()
    expect(result.current.isMinting).toBe(false)
    expect(result.current.isUploading).toBe(false)

    // Verify the contract was called with correct params
    expect(mockContract.mintScore).toHaveBeenCalledWith(
      'ipfs://QmMeta456',
      500,
      { value: BigInt(1000) }
    )
  })

  it('uploads image with correct form data', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      statusText: 'fail',
      json: () => Promise.resolve({}),
    })

    const { result } = renderHook(() => useMintPromptInvadersNFT(getContract))
    const blob = new Blob(['test'], { type: 'image/jpeg' })

    await act(async () => {
      await result.current.mintPromptInvadersNFT({
        imageBlob: blob,
        score: 999,
        wave: 7,
      })
    })

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [url, opts] = mockFetch.mock.calls[0]
    expect(url).toBe('/api/upload')
    expect(opts.method).toBe('POST')
    expect(opts.body).toBeInstanceOf(FormData)
  })

  it('builds correct ERC-721 metadata', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ ipfsHash: 'QmImgHash' }),
      })
      .mockResolvedValueOnce({
        ok: false,
        statusText: 'fail',
        json: () => Promise.resolve({}),
      })

    const { result } = renderHook(() => useMintPromptInvadersNFT(getContract))

    await act(async () => {
      await result.current.mintPromptInvadersNFT({
        imageBlob: new Blob(['test']),
        score: 750,
        wave: 3,
      })
    })

    // Second call is metadata upload
    const [, opts] = mockFetch.mock.calls[1]
    const body = JSON.parse(opts.body)
    expect(body.name).toBe('Prompt Invaders — Score 750')
    expect(body.description).toContain('750')
    expect(body.description).toContain('wave 3')
    expect(body.image).toBe('ipfs://QmImgHash')
    expect(body.attributes).toEqual([
      { trait_type: 'Score', value: 750 },
      { trait_type: 'Wave', value: 3 },
    ])
  })
})
