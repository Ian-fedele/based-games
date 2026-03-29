import { describe, it, expect } from 'vitest'
import {
  PROMPT_INVADERS_CONTRACT_ABI,
} from '@/lib/promptInvadersContract'

describe('promptInvadersContract', () => {
  it('ABI includes mintScore function', () => {
    const mintScore = PROMPT_INVADERS_CONTRACT_ABI.find(
      (entry) => entry.type === 'function' && entry.name === 'mintScore'
    )
    expect(mintScore).toBeDefined()
    expect(mintScore!.stateMutability).toBe('payable')
    expect(mintScore!.inputs).toHaveLength(2)
  })

  it('ABI includes mintFee view function', () => {
    const mintFee = PROMPT_INVADERS_CONTRACT_ABI.find(
      (entry) => entry.type === 'function' && entry.name === 'mintFee'
    )
    expect(mintFee).toBeDefined()
    expect(mintFee!.stateMutability).toBe('view')
  })

  it('ABI includes mintCooldown view function', () => {
    const mintCooldown = PROMPT_INVADERS_CONTRACT_ABI.find(
      (entry) => entry.type === 'function' && entry.name === 'mintCooldown'
    )
    expect(mintCooldown).toBeDefined()
  })

  it('ABI includes lastMintTime view function', () => {
    const lastMintTime = PROMPT_INVADERS_CONTRACT_ABI.find(
      (entry) => entry.type === 'function' && entry.name === 'lastMintTime'
    )
    expect(lastMintTime).toBeDefined()
    expect(lastMintTime!.inputs).toHaveLength(1)
  })

  it('ABI includes ScoreMinted event', () => {
    const event = PROMPT_INVADERS_CONTRACT_ABI.find(
      (entry) => entry.type === 'event' && entry.name === 'ScoreMinted'
    )
    expect(event).toBeDefined()
    expect(event!.inputs).toHaveLength(4)
    // player should be indexed
    expect(event!.inputs[0].indexed).toBe(true)
    expect(event!.inputs[0].name).toBe('player')
  })

  it('mintScore has tokenURI and score inputs', () => {
    const mintScore = PROMPT_INVADERS_CONTRACT_ABI.find(
      (entry) => entry.type === 'function' && entry.name === 'mintScore'
    )!
    expect(mintScore.inputs[0].name).toBe('_tokenURI')
    expect(mintScore.inputs[0].type).toBe('string')
    expect(mintScore.inputs[1].name).toBe('_score')
    expect(mintScore.inputs[1].type).toBe('uint256')
  })
})
