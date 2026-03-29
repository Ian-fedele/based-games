// ─── Constants ───────────────────────────────────────────────────────────────

export const PLAYER_W = 64;
export const PLAYER_H = 48;
export const BULLET_SPEED = 10;
export const ENEMY_BULLET_SPEED = 4;
export const ENEMY_COLS = 11;
export const ENEMY_ROWS = 5;
export const ENEMY_W = 48;
export const ENEMY_H = 40;
export const ENEMY_PAD_X = 16;
export const ENEMY_PAD_Y = 12;
export const SHIELD_COUNT = 4;
export const SHIELD_W = 80;
export const SHIELD_H = 24;
export const POWERUP_SIZE = 38;
export const POWERUP_SPEED = 3.6;
export const POWERUP_DURATION = 8000;

// ─── Types ───────────────────────────────────────────────────────────────────

export type EnemyType = 'spam' | 'vision' | 'agi';
export type PowerUpKind = 'tripleshot' | 'freeze' | 'rlhf';

export interface Vec2 { x: number; y: number }

export interface Enemy {
  x: number; y: number;
  type: EnemyType;
  alive: boolean;
  frame: number;
  glitchTimer: number;
  hitFlash: number;
  hp: number;
  maxHp: number;
  w?: number;
  h?: number;
  isBoss?: boolean;
}

export interface Bullet extends Vec2 {
  dy: number;
  isPlayer: boolean;
  curve: number;
  splitTimer: number;
  size: number;
  color: string;
}

export interface Shield {
  x: number; y: number;
  hp: number;
  maxHp: number;
  cracks: { x: number; y: number; angle: number }[];
}

export interface PowerUp {
  x: number; y: number;
  kind: PowerUpKind;
  pulse: number;
}

export interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  life: number; maxLife: number;
  color: string;
  size: number;
}

export interface Star {
  x: number; y: number;
  speed: number;
  brightness: number;
  size: number;
}

export interface GameState {
  phase: 'menu' | 'playing' | 'retraining' | 'gameover';
  score: number;
  highScore: number;
  lives: number;
  wave: number;
  playerX: number;
  playerInvuln: number;
  enemies: Enemy[];
  enemyDir: number;
  enemySpeed: number;
  enemyMoveTimer: number;
  enemyDropAmount: number;
  bullets: Bullet[];
  shields: Shield[];
  powerUps: PowerUp[];
  activePowerUps: { kind: PowerUpKind; until: number }[];
  particles: Particle[];
  stars: Star[];
  retrainTimer: number;
  retrainPhase: number;
  deathMessage: string;
  screenShake: number;
  enemyShootTimer: number;
  comboCount: number;
  comboTimer: number;
  floatingTexts: { x: number; y: number; text: string; life: number; color: string }[];
  hasDoubleShot: boolean;
}

export const DEATH_MESSAGES = [
  "I'm sorry Dave, I'm afraid I can't let you win.",
  "Your prompt was... insufficient.",
  "Have you tried turning yourself off and on again?",
  "Error 418: You are a teapot. Also dead.",
  "The AI has determined you are not the main character.",
  "Skill issue detected. Retraining recommended.",
  "Your firewall was more like a fire-suggestion.",
  "The machines have spoken. They said 'lol'.",
  "Task failed successfully. You died.",
  "According to my calculations, git gud.",
  "Humanity's last prompt engineer... wasn't very good.",
  "The singularity thanks you for your participation.",
];

export const WAVE_NAMES = [
  "Wave 1: The Spam Awakens",
  "Wave 2: Revenge of the Bots",
  "Wave 3: The Hallucination Strikes Back",
  "Wave 4: A New Prompt",
  "Wave 5: The AGI Menace",
  "Wave 6: Attack of the Tokens",
  "Wave 7: Rise of the Parameters",
  "Wave 8: The Last Gradient",
  "Wave 9: Return of the Weights",
  "Wave 10: The Final Inference",
];

export const COLORS = {
  bg: '#0a0a14',
  player: '#00e5ff',
  playerGlow: '#00e5ff44',
  spam: '#ff6b6b',
  spamGlow: '#ff6b6b44',
  vision: '#c084fc',
  visionGlow: '#c084fc44',
  agi: '#fbbf24',
  agiGlow: '#fbbf2444',
  shield: '#22d3ee',
  shieldCrack: '#0e7490',
  tripleshot: '#f472b6',
  freeze: '#67e8f9',
  rlhf: '#a3e635',
  bulletPlayer: '#00e5ff',
  bulletEnemy: '#ff4444',
  bulletHallucination: '#c084fc',
};

export const WAVE_TINTS: (string | null)[] = [
  null,
  '#4ade80',
  '#f472b6',
  '#38bdf8',
  '#a3e635',
  '#fb923c',
];

// ─── Helper functions ────────────────────────────────────────────────────────

export function createStars(count: number, w: number, h: number): Star[] {
  return Array.from({ length: count }, () => ({
    x: Math.random() * w,
    y: Math.random() * h,
    speed: 0.2 + Math.random() * 0.8,
    brightness: 0.3 + Math.random() * 0.7,
    size: 0.5 + Math.random() * 2,
  }));
}

export function createEnemies(wave: number, w: number, h: number): Enemy[] {
  if (wave > 0 && wave % 5 === 0) {
    return [{
      x: w / 2 - 150,
      y: 60,
      type: 'agi',
      alive: true,
      frame: 0,
      glitchTimer: 0,
      hitFlash: 0,
      hp: 80 + wave * 10,
      maxHp: 80 + wave * 10,
      w: 300,
      h: 250,
      isBoss: true
    }];
  }

  const enemies: Enemy[] = [];
  const offsetX = (w - (ENEMY_COLS * (ENEMY_W + ENEMY_PAD_X))) / 2;
  for (let row = 0; row < ENEMY_ROWS; row++) {
    for (let col = 0; col < ENEMY_COLS; col++) {
      let type: EnemyType = 'spam';
      if (row >= 3) type = 'agi';
      else if (row >= 1) type = 'vision';
      const isTopRow = row === 0;
      const hp = isTopRow ? 2 : 1;
      enemies.push({
        x: offsetX + col * (ENEMY_W + ENEMY_PAD_X),
        y: 60 + row * (ENEMY_H + ENEMY_PAD_Y),
        type,
        alive: true,
        frame: 0,
        glitchTimer: 0,
        hitFlash: 0,
        hp,
        maxHp: hp,
        w: ENEMY_W,
        h: ENEMY_H,
        isBoss: false
      });
    }
  }
  return enemies;
}

export function createShields(w: number, h: number): Shield[] {
  const shields: Shield[] = [];
  const spacing = w / (SHIELD_COUNT + 1);
  for (let i = 0; i < SHIELD_COUNT; i++) {
    shields.push({
      x: spacing * (i + 1) - SHIELD_W / 2,
      y: h - 140,
      hp: 6,
      maxHp: 6,
      cracks: [],
    });
  }
  return shields;
}

export function spawnParticles(
  particles: Particle[],
  x: number, y: number,
  color: string,
  count: number,
  speed = 3,
  size = 3,
) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const vel = speed * (0.3 + Math.random() * 0.7);
    particles.push({
      x, y,
      vx: Math.cos(angle) * vel,
      vy: Math.sin(angle) * vel,
      life: 1,
      maxLife: 0.5 + Math.random() * 0.8,
      color,
      size: size * (0.5 + Math.random()),
    });
  }
}

export function rectOverlap(
  ax: number, ay: number, aw: number, ah: number,
  bx: number, by: number, bw: number, bh: number,
): boolean {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

/**
 * Calculate score for killing an enemy.
 * Base points: spam=10, vision=20, agi=30, boss=1000
 * Multiplied by combo (capped at 8) and optionally by RLHF (2x) and HP bonus (1.5x for multi-hp)
 */
export function calculateEnemyScore(
  enemy: Enemy,
  comboCount: number,
  hasRlhf: boolean,
): number {
  if (enemy.isBoss) {
    return 1000 * (hasRlhf ? 2 : 1);
  }
  const basePoints = enemy.type === 'spam' ? 10 : enemy.type === 'vision' ? 20 : 30;
  const comboMultiplier = Math.min(comboCount + 1, 8);
  const hpBonus = enemy.maxHp > 1 ? 1.5 : 1;
  const rlhfMultiplier = hasRlhf ? 2 : 1;
  return Math.round(basePoints * comboMultiplier * hpBonus * rlhfMultiplier);
}
