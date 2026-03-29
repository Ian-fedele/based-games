import { describe, it, expect } from 'vitest'
import {
  rectOverlap,
  createEnemies,
  createShields,
  createStars,
  spawnParticles,
  calculateEnemyScore,
  ENEMY_COLS,
  ENEMY_ROWS,
  ENEMY_W,
  ENEMY_H,
  SHIELD_COUNT,
  DEATH_MESSAGES,
  WAVE_NAMES,
  COLORS,
} from '@/components/prompt-invaders/gameLogic'
import type { Enemy, Particle } from '@/components/prompt-invaders/gameLogic'

// ─── rectOverlap ─────────────────────────────────────────────────────────────

describe('rectOverlap', () => {
  it('returns true for overlapping rectangles', () => {
    expect(rectOverlap(0, 0, 10, 10, 5, 5, 10, 10)).toBe(true)
  })

  it('returns false for non-overlapping rectangles (side by side)', () => {
    expect(rectOverlap(0, 0, 10, 10, 20, 0, 10, 10)).toBe(false)
  })

  it('returns false for non-overlapping rectangles (stacked)', () => {
    expect(rectOverlap(0, 0, 10, 10, 0, 20, 10, 10)).toBe(false)
  })

  it('returns true when one rectangle is inside another', () => {
    expect(rectOverlap(0, 0, 100, 100, 10, 10, 5, 5)).toBe(true)
  })

  it('returns false for adjacent rectangles (touching edges)', () => {
    // Touching but not overlapping: ax + aw === bx
    expect(rectOverlap(0, 0, 10, 10, 10, 0, 10, 10)).toBe(false)
  })

  it('returns true for partial overlap on one axis', () => {
    expect(rectOverlap(0, 0, 10, 10, 5, 0, 10, 10)).toBe(true)
  })

  it('handles zero-size rectangles', () => {
    expect(rectOverlap(5, 5, 0, 0, 5, 5, 0, 0)).toBe(false)
  })
})

// ─── createEnemies ───────────────────────────────────────────────────────────

describe('createEnemies', () => {
  const W = 1200
  const H = 800

  it('creates a standard grid of 55 enemies for a non-boss wave', () => {
    const enemies = createEnemies(1, W, H)
    expect(enemies).toHaveLength(ENEMY_COLS * ENEMY_ROWS) // 55
  })

  it('creates a single boss enemy on wave 5', () => {
    const enemies = createEnemies(5, W, H)
    expect(enemies).toHaveLength(1)
    expect(enemies[0].isBoss).toBe(true)
    expect(enemies[0].type).toBe('agi')
  })

  it('creates a boss on wave 10 with higher HP', () => {
    const enemies = createEnemies(10, W, H)
    expect(enemies).toHaveLength(1)
    expect(enemies[0].hp).toBe(80 + 10 * 10) // 180
    expect(enemies[0].maxHp).toBe(enemies[0].hp)
  })

  it('does not create a boss on wave 0', () => {
    const enemies = createEnemies(0, W, H)
    expect(enemies).toHaveLength(55)
  })

  it('assigns correct enemy types by row', () => {
    const enemies = createEnemies(1, W, H)
    // Row 0 = spam, rows 1-2 = vision, rows 3-4 = agi
    const row0 = enemies.slice(0, ENEMY_COLS)
    const row1 = enemies.slice(ENEMY_COLS, ENEMY_COLS * 2)
    const row3 = enemies.slice(ENEMY_COLS * 3, ENEMY_COLS * 4)

    expect(row0.every(e => e.type === 'spam')).toBe(true)
    expect(row1.every(e => e.type === 'vision')).toBe(true)
    expect(row3.every(e => e.type === 'agi')).toBe(true)
  })

  it('top row enemies have 2 HP, others have 1', () => {
    const enemies = createEnemies(1, W, H)
    const topRow = enemies.slice(0, ENEMY_COLS)
    const otherRows = enemies.slice(ENEMY_COLS)

    expect(topRow.every(e => e.hp === 2 && e.maxHp === 2)).toBe(true)
    expect(otherRows.every(e => e.hp === 1 && e.maxHp === 1)).toBe(true)
  })

  it('all enemies start alive', () => {
    const enemies = createEnemies(1, W, H)
    expect(enemies.every(e => e.alive)).toBe(true)
  })

  it('boss dimensions are 300x250', () => {
    const boss = createEnemies(5, W, H)[0]
    expect(boss.w).toBe(300)
    expect(boss.h).toBe(250)
  })

  it('standard enemies have ENEMY_W x ENEMY_H dimensions', () => {
    const enemies = createEnemies(1, W, H)
    expect(enemies.every(e => e.w === ENEMY_W && e.h === ENEMY_H)).toBe(true)
  })
})

// ─── createShields ───────────────────────────────────────────────────────────

describe('createShields', () => {
  const W = 1200
  const H = 800

  it('creates the correct number of shields', () => {
    const shields = createShields(W, H)
    expect(shields).toHaveLength(SHIELD_COUNT) // 4
  })

  it('all shields start with 6 HP', () => {
    const shields = createShields(W, H)
    expect(shields.every(s => s.hp === 6 && s.maxHp === 6)).toBe(true)
  })

  it('all shields start with empty cracks array', () => {
    const shields = createShields(W, H)
    expect(shields.every(s => s.cracks.length === 0)).toBe(true)
  })

  it('shields are evenly spaced horizontally', () => {
    const shields = createShields(W, H)
    const spacing = W / (SHIELD_COUNT + 1)
    for (let i = 0; i < shields.length; i++) {
      const expectedCenter = spacing * (i + 1)
      expect(shields[i].x).toBeCloseTo(expectedCenter - 40, 1) // SHIELD_W/2 = 40
    }
  })

  it('shields are positioned near bottom of screen', () => {
    const shields = createShields(W, H)
    expect(shields.every(s => s.y === H - 140)).toBe(true)
  })
})

// ─── createStars ─────────────────────────────────────────────────────────────

describe('createStars', () => {
  it('creates the requested number of stars', () => {
    const stars = createStars(100, 1200, 800)
    expect(stars).toHaveLength(100)
  })

  it('stars have valid position within bounds', () => {
    const stars = createStars(50, 1200, 800)
    for (const star of stars) {
      expect(star.x).toBeGreaterThanOrEqual(0)
      expect(star.x).toBeLessThan(1200)
      expect(star.y).toBeGreaterThanOrEqual(0)
      expect(star.y).toBeLessThan(800)
    }
  })

  it('stars have valid speed, brightness, and size ranges', () => {
    const stars = createStars(50, 1200, 800)
    for (const star of stars) {
      expect(star.speed).toBeGreaterThanOrEqual(0.2)
      expect(star.speed).toBeLessThan(1.0)
      expect(star.brightness).toBeGreaterThanOrEqual(0.3)
      expect(star.brightness).toBeLessThan(1.0)
      expect(star.size).toBeGreaterThanOrEqual(0.5)
      expect(star.size).toBeLessThan(2.5)
    }
  })

  it('handles zero count', () => {
    const stars = createStars(0, 1200, 800)
    expect(stars).toHaveLength(0)
  })
})

// ─── spawnParticles ──────────────────────────────────────────────────────────

describe('spawnParticles', () => {
  it('adds the correct number of particles', () => {
    const particles: Particle[] = []
    spawnParticles(particles, 100, 200, '#ff0000', 10)
    expect(particles).toHaveLength(10)
  })

  it('particles originate at the specified position', () => {
    const particles: Particle[] = []
    spawnParticles(particles, 50, 75, '#00ff00', 5)
    expect(particles.every(p => p.x === 50 && p.y === 75)).toBe(true)
  })

  it('particles have the specified color', () => {
    const particles: Particle[] = []
    spawnParticles(particles, 0, 0, '#ff6b6b', 3)
    expect(particles.every(p => p.color === '#ff6b6b')).toBe(true)
  })

  it('particles start with life=1', () => {
    const particles: Particle[] = []
    spawnParticles(particles, 0, 0, '#fff', 5)
    expect(particles.every(p => p.life === 1)).toBe(true)
  })

  it('appends to existing particle array', () => {
    const particles: Particle[] = [{
      x: 0, y: 0, vx: 0, vy: 0, life: 1, maxLife: 1, color: '#000', size: 1
    }]
    spawnParticles(particles, 100, 100, '#fff', 3)
    expect(particles).toHaveLength(4)
  })

  it('particles have non-zero velocity', () => {
    const particles: Particle[] = []
    spawnParticles(particles, 0, 0, '#fff', 20)
    // With 20 particles, statistically all should have some velocity
    const hasVelocity = particles.every(p => p.vx !== 0 || p.vy !== 0)
    expect(hasVelocity).toBe(true)
  })
})

// ─── calculateEnemyScore ─────────────────────────────────────────────────────

describe('calculateEnemyScore', () => {
  const makeEnemy = (overrides: Partial<Enemy> = {}): Enemy => ({
    x: 0, y: 0, type: 'spam', alive: true, frame: 0,
    glitchTimer: 0, hitFlash: 0, hp: 1, maxHp: 1,
    ...overrides,
  })

  it('returns 10 base points for spam', () => {
    expect(calculateEnemyScore(makeEnemy({ type: 'spam' }), 0, false)).toBe(10)
  })

  it('returns 20 base points for vision', () => {
    expect(calculateEnemyScore(makeEnemy({ type: 'vision' }), 0, false)).toBe(20)
  })

  it('returns 30 base points for agi', () => {
    expect(calculateEnemyScore(makeEnemy({ type: 'agi' }), 0, false)).toBe(30)
  })

  it('returns 1000 for boss', () => {
    expect(calculateEnemyScore(makeEnemy({ isBoss: true }), 0, false)).toBe(1000)
  })

  it('applies combo multiplier (capped at 8x)', () => {
    // combo 3 → multiplier 4
    expect(calculateEnemyScore(makeEnemy({ type: 'spam' }), 3, false)).toBe(40)
    // combo 10 → capped at 8
    expect(calculateEnemyScore(makeEnemy({ type: 'spam' }), 10, false)).toBe(80)
  })

  it('applies RLHF 2x multiplier', () => {
    expect(calculateEnemyScore(makeEnemy({ type: 'spam' }), 0, true)).toBe(20)
  })

  it('applies HP bonus (1.5x) for multi-HP enemies', () => {
    expect(calculateEnemyScore(makeEnemy({ type: 'spam', maxHp: 2 }), 0, false)).toBe(15)
  })

  it('stacks all multipliers together', () => {
    // spam=10, combo=3 → x4, HP bonus x1.5, RLHF x2 → 10*4*1.5*2 = 120
    expect(calculateEnemyScore(makeEnemy({ type: 'spam', maxHp: 2 }), 3, true)).toBe(120)
  })

  it('boss ignores combo and HP bonus, only applies RLHF', () => {
    expect(calculateEnemyScore(makeEnemy({ isBoss: true, maxHp: 100 }), 7, true)).toBe(2000)
  })
})

// ─── Constants sanity checks ─────────────────────────────────────────────────

describe('game constants', () => {
  it('has 12 death messages', () => {
    expect(DEATH_MESSAGES).toHaveLength(12)
  })

  it('has 10 wave names', () => {
    expect(WAVE_NAMES).toHaveLength(10)
  })

  it('COLORS has all required keys', () => {
    const requiredKeys = [
      'bg', 'player', 'spam', 'vision', 'agi',
      'shield', 'tripleshot', 'freeze', 'rlhf',
      'bulletPlayer', 'bulletEnemy',
    ]
    for (const key of requiredKeys) {
      expect(COLORS).toHaveProperty(key)
    }
  })
})
