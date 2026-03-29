import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AudioSynth } from '@/components/prompt-invaders/AudioSynth'

describe('AudioSynth', () => {
  let synth: AudioSynth

  beforeEach(() => {
    synth = new AudioSynth()
  })

  describe('init', () => {
    it('creates AudioContext on first call', () => {
      synth.init()
      // Should not throw
    })

    it('is idempotent - calling init twice does not throw', () => {
      synth.init()
      synth.init()
      // No error
    })
  })

  describe('sound methods before init', () => {
    it('playShoot does nothing before init', () => {
      expect(() => synth.playShoot()).not.toThrow()
    })

    it('playEnemyShoot does nothing before init', () => {
      expect(() => synth.playEnemyShoot()).not.toThrow()
    })

    it('playExplosion does nothing before init', () => {
      expect(() => synth.playExplosion()).not.toThrow()
    })

    it('playPowerup does nothing before init', () => {
      expect(() => synth.playPowerup()).not.toThrow()
    })

    it('playDamage does nothing before init', () => {
      expect(() => synth.playDamage()).not.toThrow()
    })
  })

  describe('sound methods after init', () => {
    beforeEach(() => {
      synth.init()
    })

    it('playShoot does not throw', () => {
      expect(() => synth.playShoot()).not.toThrow()
    })

    it('playEnemyShoot does not throw', () => {
      expect(() => synth.playEnemyShoot()).not.toThrow()
    })

    it('playExplosion (small) does not throw', () => {
      expect(() => synth.playExplosion(false)).not.toThrow()
    })

    it('playExplosion (large) does not throw', () => {
      expect(() => synth.playExplosion(true)).not.toThrow()
    })

    it('playPowerup does not throw', () => {
      expect(() => synth.playPowerup()).not.toThrow()
    })

    it('playDamage does not throw', () => {
      expect(() => synth.playDamage()).not.toThrow()
    })
  })
})
