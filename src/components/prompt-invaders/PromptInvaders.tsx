'use client';

import React, { useRef, useEffect, useCallback, useState } from 'react';
import { Contract } from 'ethers';
import { useWallet } from '@/contexts/WalletContext';
import { useMintPromptInvadersNFT } from '@/hooks/useBlockchainPromptInvaders';
import { PROMPT_INVADERS_CONTRACT_ADDRESS, PROMPT_INVADERS_CONTRACT_ABI } from '@/lib/promptInvadersContract';
import { CHAIN_CONFIG, TARGET_CHAIN_ID } from '@/lib/chainConfig';
import { audioSynth } from './AudioSynth';
import {
  PLAYER_W, PLAYER_H, BULLET_SPEED, ENEMY_BULLET_SPEED,
  ENEMY_COLS, ENEMY_ROWS, ENEMY_W, ENEMY_H, ENEMY_PAD_X, ENEMY_PAD_Y,
  SHIELD_COUNT, SHIELD_W, SHIELD_H, POWERUP_SIZE, POWERUP_SPEED, POWERUP_DURATION,
  COLORS, WAVE_TINTS, DEATH_MESSAGES, WAVE_NAMES,
  createStars, createEnemies, createShields, spawnParticles, rectOverlap,
} from './gameLogic';
import type {
  EnemyType, PowerUpKind, Enemy, Bullet, Shield, PowerUp, Particle, Star, GameState,
} from './gameLogic';

// ─── Constants ───────────────────────────────────────────────────────────────

let BASE_W = 1200;
let BASE_H = 800;

// ─── Drawing helpers ─────────────────────────────────────────────────────────

function drawPlayer(ctx: CanvasRenderingContext2D, x: number, y: number, invuln: number, time: number, images: any) {
  if (!images || !images.player) return;
  ctx.save();
  const alpha = invuln > 0 ? 0.4 + 0.3 * Math.sin(time * 12) : 1;
  ctx.globalAlpha = alpha;

  ctx.shadowColor = '#00e5ff';
  ctx.shadowBlur = 15;
  ctx.drawImage(images.player, x, y, PLAYER_W, PLAYER_H);
  ctx.shadowBlur = 0;

  // Thruster glow
  ctx.globalCompositeOperation = 'lighter';
  const thrusterPulse = 0.7 + 0.3 * Math.sin(time * 8);
  const tGrad = ctx.createRadialGradient(x + PLAYER_W / 2, y + PLAYER_H - 5, 2, x + PLAYER_W / 2, y + PLAYER_H + 15, 20);
  tGrad.addColorStop(0, `rgba(0, 229, 255, ${0.8 * thrusterPulse})`);
  tGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = tGrad;
  ctx.fillRect(x + PLAYER_W / 2 - 20, y + PLAYER_H - 10, 40, 30);
  
  ctx.restore();
}

function drawEnemy(ctx: CanvasRenderingContext2D, enemy: Enemy, time: number, images: any) {
  const { x, y, type, frame, hitFlash } = enemy;
  ctx.save();

  if (hitFlash > 0) {
    ctx.globalAlpha = 0.5 + 0.5 * Math.sin(hitFlash * 20);
  }

  const bob = Math.sin(time * 2 + x * 0.05) * 2;
  const dy = y + bob;

  if (images) {
    const img = type === 'spam' ? images.spam : type === 'vision' ? images.vision : images.agi;
    if (img) {
      const ew = enemy.w || ENEMY_W;
      const eh = enemy.h || ENEMY_H;
      ctx.drawImage(img, x, dy, ew, eh);

      if (hitFlash > 0) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = hitFlash;
        ctx.drawImage(img, x, dy, ew, eh);
        ctx.globalAlpha = 1;
      }
    }
  }

  ctx.restore();
}
function drawEnemyDamage(ctx: CanvasRenderingContext2D, enemy: Enemy, time: number) {
  const { x, y } = enemy;
  const ew = enemy.w || ENEMY_W;
  const eh = enemy.h || ENEMY_H;
  ctx.save();
  ctx.strokeStyle = '#ff4444';
  ctx.lineWidth = enemy.isBoss ? 4 : 2;
  ctx.shadowColor = '#ff4444';
  ctx.shadowBlur = enemy.isBoss ? 12 : 6;

  ctx.beginPath();
  ctx.moveTo(x + ew*0.2, y + eh*0.1);
  ctx.lineTo(x + ew/2 - 4, y + eh/2);
  ctx.lineTo(x + ew/2 + 6, y + eh/2 - 3);
  ctx.lineTo(x + ew - 10, y + eh - 6);
  ctx.stroke();

  ctx.lineWidth = enemy.isBoss ? 3 : 1.5;
  ctx.beginPath();
  ctx.moveTo(x + ew - 6, y + 8);
  ctx.lineTo(x + ew/2 + 2, y + eh/2 + 2);
  ctx.lineTo(x + 12, y + eh - 4);
  ctx.stroke();

  ctx.shadowBlur = 0;

  if (Math.sin(time * 12) > 0.3) {
    ctx.fillStyle = '#ff6b6b';
    const sparkX = x + ew/2 + Math.sin(time * 8) * (enemy.isBoss ? 20 : 8);
    const sparkY = y + eh/2 + Math.cos(time * 10) * (enemy.isBoss ? 15 : 6);
    ctx.beginPath();
    ctx.arc(sparkX, sparkY, enemy.isBoss ? 5 : 2, 0, Math.PI * 2);
    ctx.fill();
  }

  if (!enemy.isBoss) {
    ctx.globalAlpha = 0.15 + 0.05 * Math.sin(time * 8);
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(x - 2, y - 2, ew + 4, eh + 4);
  }

  ctx.restore();
}

function drawEnemyHpBar(ctx: CanvasRenderingContext2D, enemy: Enemy) {
  if (enemy.maxHp <= 1) return;
  const { x, y, hp, maxHp, isBoss } = enemy;
  const ew = enemy.w || ENEMY_W;
  
  if (isBoss) {
    // Large boss HP bar at top of screen
    const barW = BASE_W - 200;
    const barH = 12;
    const barX = 100;
    const barY = 20;
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(barX - 2, barY - 2, barW + 4, barH + 4);
    
    const ratio = hp / maxHp;
    const grad = ctx.createLinearGradient(barX, barY, barX + barW, barY);
    grad.addColorStop(0, '#ff4444');
    grad.addColorStop(0.5, '#fbbf24');
    grad.addColorStop(1, '#4ade80');
    
    ctx.fillStyle = ratio > 0.3 ? grad : '#ff4444';
    ctx.fillRect(barX, barY, barW * ratio, barH);
    
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.strokeRect(barX - 2, barY - 2, barW + 4, barH + 4);
    
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('AGI OVERLORD BOSS', BASE_W / 2, barY + 10);
    ctx.textAlign = 'left';
  } else {
    const barW = ew * 0.6;
    const barH = 3;
    const barX = x + (ew - barW) / 2;
    const barY = y - 6;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);

    const ratio = hp / maxHp;
    ctx.fillStyle = ratio > 0.5 ? '#4ade80' : '#ff4444';
    ctx.fillRect(barX, barY, barW * ratio, barH);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(barX - 1, barY - 1, barW + 2, barH + 2);
  }
}

function drawShield(ctx: CanvasRenderingContext2D, shield: Shield, time: number) {
  ctx.save();
  const { x, y, hp, maxHp, cracks } = shield;
  const ratio = hp / maxHp;

  // CAPTCHA wall appearance
  const grad = ctx.createLinearGradient(x, y, x + SHIELD_W, y + SHIELD_H);
  grad.addColorStop(0, `rgba(34, 211, 238, ${0.3 + ratio * 0.5})`);
  grad.addColorStop(1, `rgba(14, 116, 144, ${0.3 + ratio * 0.5})`);
  ctx.fillStyle = grad;
  roundRect(ctx, x, y, SHIELD_W, SHIELD_H, 4);
  ctx.fill();

  // Border
  ctx.strokeStyle = `rgba(34, 211, 238, ${0.5 + ratio * 0.5})`;
  ctx.lineWidth = 1.5;
  roundRect(ctx, x, y, SHIELD_W, SHIELD_H, 4);
  ctx.stroke();

  // CAPTCHA text
  ctx.fillStyle = `rgba(255,255,255, ${0.4 + ratio * 0.4})`;
  ctx.font = 'bold 9px monospace';
  ctx.textAlign = 'center';
  const captchaTexts = ['NOT A BOT', 'HUMAN OK', 'VERIFIED', 'CAPTCHA'];
  ctx.fillText(captchaTexts[Math.floor(x / 100) % captchaTexts.length], x + SHIELD_W / 2, y + SHIELD_H / 2 + 3);
  ctx.textAlign = 'left';

  // Cracks
  ctx.strokeStyle = COLORS.shieldCrack;
  ctx.lineWidth = 1;
  for (const crack of cracks) {
    ctx.beginPath();
    ctx.moveTo(crack.x, crack.y);
    const len = 8 + Math.random() * 6;
    ctx.lineTo(crack.x + Math.cos(crack.angle) * len, crack.y + Math.sin(crack.angle) * len);
    ctx.stroke();
  }

  // Glitch flicker when low HP
  if (ratio < 0.4 && Math.sin(time * 15) > 0.7) {
    ctx.fillStyle = 'rgba(255, 100, 100, 0.2)';
    roundRect(ctx, x, y, SHIELD_W, SHIELD_H, 4);
    ctx.fill();
  }

  // Glow
  ctx.shadowColor = COLORS.shield;
  ctx.shadowBlur = 8 * ratio;
  ctx.strokeStyle = `rgba(34, 211, 238, ${0.2 * ratio})`;
  roundRect(ctx, x, y, SHIELD_W, SHIELD_H, 4);
  ctx.stroke();
  ctx.shadowBlur = 0;

  ctx.restore();
}

function drawPowerUp(ctx: CanvasRenderingContext2D, pu: PowerUp, time: number) {
  ctx.save();
  const { x, y, kind, pulse } = pu;
  const bob = Math.sin(time * 4 + pulse) * 3;
  const py = y + bob;
  const cx = x + POWERUP_SIZE / 2;
  const cy = py + POWERUP_SIZE / 2;

  let color: string;
  let label: string;
  if (kind === 'tripleshot') { color = COLORS.tripleshot; label = '3x'; }
  else if (kind === 'freeze') { color = COLORS.freeze; label = '❄'; }
  else { color = COLORS.rlhf; label = 'RL'; }

  // Glow
  const glow = ctx.createRadialGradient(cx, cy, 4, cx, cy, POWERUP_SIZE);
  glow.addColorStop(0, color + '88');
  glow.addColorStop(1, 'transparent');
  ctx.fillStyle = glow;
  ctx.fillRect(x - 8, py - 8, POWERUP_SIZE + 16, POWERUP_SIZE + 16);

  // Diamond shape
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(cx, py);
  ctx.lineTo(cx + POWERUP_SIZE / 2, cy);
  ctx.lineTo(cx, py + POWERUP_SIZE);
  ctx.lineTo(cx - POWERUP_SIZE / 2, cy);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Label - dark background for contrast
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.beginPath();
  ctx.arc(cx, cy, POWERUP_SIZE * 0.28, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowColor = '#fff';
  ctx.shadowBlur = 4;
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 14px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(label, cx, cy + 5);
  ctx.shadowBlur = 0;
  ctx.textAlign = 'left';

  ctx.restore();
}

function drawBullet(ctx: CanvasRenderingContext2D, bullet: Bullet, time: number) {
  ctx.save();
  const { x, y, isPlayer, color, size, curve } = bullet;

  // Trail
  const trailGrad = ctx.createLinearGradient(x, y, x, y + (isPlayer ? 16 : -16));
  trailGrad.addColorStop(0, color + 'cc');
  trailGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = trailGrad;
  ctx.fillRect(x - size / 2, y + (isPlayer ? 0 : -16), size, 16);

  // Bullet body
  ctx.shadowColor = color;
  ctx.shadowBlur = 10;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, size, 0, Math.PI * 2);
  ctx.fill();

  // Core
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(x, y, size * 0.4, 0, Math.PI * 2);
  ctx.fill();

  // Hallucination visual - swirl
  if (Math.abs(curve) > 0) {
    ctx.strokeStyle = COLORS.bulletHallucination + '66';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < 12; i++) {
      const angle = time * 6 + (i / 12) * Math.PI * 2;
      const r = size + 2 + i * 0.5;
      const px = x + Math.cos(angle) * r;
      const py2 = y + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(px, py2);
      else ctx.lineTo(px, py2);
    }
    ctx.stroke();
  }

  ctx.shadowBlur = 0;
  ctx.restore();
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function PromptInvaders() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState | null>(null);
  const keysRef = useRef<Set<string>>(new Set());
  const mouseDownRef = useRef(false);
  const timeRef = useRef(0);
  const lastFrameRef = useRef(0);
  const rafRef = useRef<number>(0);
  const [, forceUpdate] = useState(0);

  const imagesRef = useRef<any>(null);
  const [imagesLoaded, setImagesLoaded] = useState(false);

  // ─── NFT minting state ──────────────────────────────────────────
  const [showMintPanel, setShowMintPanel] = useState(false);
  const showMintPanelRef = useRef(false);
  const nftCaptureRef = useRef(false);
  const nftCaptureResolveRef = useRef<((blob: Blob) => void) | null>(null);
  const prevPhaseRef = useRef<string>('menu');
  const addressRef = useRef<string | null>(null);
  const mintRef = useRef<{ resetMint: () => void } | null>(null);

  const { address, isConnecting, isCorrectNetwork, connect, switchToBase, getSigner } = useWallet();

  const getPromptInvadersContract = useCallback(async (): Promise<Contract | null> => {
    if (!PROMPT_INVADERS_CONTRACT_ADDRESS) return null;
    const signer = await getSigner();
    if (!signer) return null;
    return new Contract(PROMPT_INVADERS_CONTRACT_ADDRESS, PROMPT_INVADERS_CONTRACT_ABI, signer);
  }, [getSigner]);

  const mint = useMintPromptInvadersNFT(getPromptInvadersContract);

  // Keep refs in sync so gameLoop doesn't need these as dependencies
  useEffect(() => { addressRef.current = address; }, [address]);
  useEffect(() => { mintRef.current = mint; }, [mint]);

  useEffect(() => {
    const assetSources = {
      player: '/images/prompt-invaders/player_ship.png',
      spam: '/images/prompt-invaders/enemy_spam.png',
      vision: '/images/prompt-invaders/enemy_vision.png',
      agi: '/images/prompt-invaders/enemy_agi.png',
      bg: '/images/prompt-invaders/background_nebula.png',
    };
    
    let loadedCount = 0;
    const toLoad = Object.keys(assetSources).length;
    const imgs: any = {};
    
    for (const [key, src] of Object.entries(assetSources)) {
      const img = new Image();
      img.src = src;
      img.onload = () => {
        if (key !== 'bg') {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imgData.data;
            for (let i = 0; i < data.length; i += 4) {
              const r = data[i];
              const g = data[i + 1];
              const b = data[i + 2];
              // Background transparency check
              if (r < 40 && g < 40 && b < 40) {
                // smooth alpha mapping for soft edges
                const maxVal = Math.max(r, g, b);
                data[i + 3] = (maxVal / 40) * 255;
              } else {
                // Ensure non-background pixels are fully opaque
                data[i + 3] = 255;
              }
            }
            ctx.putImageData(imgData, 0, 0);
            imgs[key] = canvas; // Can just draw offscreen canvas directly in Canvas2D
          } else {
            imgs[key] = img;
          }
        } else {
          imgs[key] = img;
        }

        loadedCount++;
        if (loadedCount === toLoad) {
          imagesRef.current = imgs;
          setImagesLoaded(true);
        }
      };
      img.onerror = () => {
        console.warn('Failed to load asset', src);
        loadedCount++;
        if (loadedCount === toLoad) {
          imagesRef.current = imgs;
          setImagesLoaded(true);
        }
      };
    }
  }, []);

  // ─── Initialize state ──────────────────────────────────────────────────

  const initState = useCallback((): GameState => {
    const hs = typeof window !== 'undefined'
      ? parseInt(localStorage.getItem('prompt_invaders_hs') || '0', 10)
      : 0;
    return {
      phase: 'menu',
      score: 0,
      highScore: hs,
      lives: 3,
      wave: 1,
      playerX: BASE_W / 2 - PLAYER_W / 2,
      playerInvuln: 0,
      enemies: createEnemies(1, BASE_W, BASE_H),
      enemyDir: 1,
      enemySpeed: 0.6,
      enemyMoveTimer: 0,
      enemyDropAmount: 0,
      bullets: [],
      shields: createShields(BASE_W, BASE_H),
      powerUps: [],
      activePowerUps: [],
      particles: [],
      stars: createStars(120, BASE_W, BASE_H),
      retrainTimer: 0,
      retrainPhase: 0,
      deathMessage: '',
      screenShake: 0,
      enemyShootTimer: 0,
      comboCount: 0,
      comboTimer: 0,
      floatingTexts: [],
      hasDoubleShot: false,
    };
  }, []);

  // ─── Start game ────────────────────────────────────────────────────────

  const startGame = useCallback(() => {
    const gs = stateRef.current!;
    gs.phase = 'playing';
    gs.score = 0;
    gs.lives = 3;
    gs.wave = 1;
    gs.playerX = BASE_W / 2 - PLAYER_W / 2;
    gs.playerInvuln = 0;
    gs.enemies = createEnemies(1, BASE_W, BASE_H);
    gs.enemyDir = 1;
    gs.enemySpeed = 0.6;
    gs.enemyMoveTimer = 0;
    gs.enemyDropAmount = 0;
    gs.bullets = [];
    gs.shields = createShields(BASE_W, BASE_H);
    gs.powerUps = [];
    gs.activePowerUps = [];
    gs.particles = [];
    gs.comboCount = 0;
    gs.comboTimer = 0;
    gs.floatingTexts = [];
    gs.screenShake = 0;
    gs.hasDoubleShot = false;
    setShowMintPanel(false);
    showMintPanelRef.current = false;
    mint.resetMint();
    forceUpdate(n => n + 1);
    audioSynth.init();
  }, [mint]);

  // ─── Mint handler ─────────────────────────────────────────────────────

  const handleMint = useCallback(() => {
    if (!isCorrectNetwork) {
      switchToBase();
      return;
    }
    nftCaptureRef.current = true;
    new Promise<Blob>((resolve) => {
      nftCaptureResolveRef.current = resolve;
    }).then((blob) => {
      const gs = stateRef.current;
      mint.mintPromptInvadersNFT({
        imageBlob: blob,
        score: gs?.score ?? 0,
        wave: gs?.wave ?? 1,
      });
    });
  }, [mint, isCorrectNetwork, switchToBase]);

  // ─── Start next wave ──────────────────────────────────────────────────

  const startNextWave = useCallback((gs: GameState) => {
    gs.wave++;
    gs.enemies = createEnemies(gs.wave, BASE_W, BASE_H);
    gs.enemyDir = 1;
    gs.enemySpeed = 0.6 + gs.wave * 0.1;
    gs.enemyMoveTimer = 0;
    gs.enemyDropAmount = 0;
    gs.bullets = [];
    gs.powerUps = [];
    gs.shields = createShields(BASE_W, BASE_H);
    gs.phase = 'retraining';
    gs.retrainTimer = 3;
    gs.retrainPhase = 0;
  }, []);

  // ─── Shoot ─────────────────────────────────────────────────────────────

  const shootCooldownRef = useRef(0);

  const playerShoot = useCallback((gs: GameState) => {
    const now = performance.now();
    if (now - shootCooldownRef.current < 200) return;
    shootCooldownRef.current = now;
    audioSynth.playShoot();

    const hasTriple = gs.activePowerUps.some(p => p.kind === 'tripleshot');
    const hasRlhf = gs.activePowerUps.some(p => p.kind === 'rlhf');
    const size = hasRlhf ? 5 : 3;
    const cx = gs.playerX + PLAYER_W / 2;
    const py = BASE_H - 60;
    const baseColor = hasRlhf ? COLORS.rlhf : COLORS.bulletPlayer;

    if (hasTriple) {
      // Triple shot: center + two angled
      gs.bullets.push({
        x: cx, y: py, dy: -BULLET_SPEED, isPlayer: true,
        curve: 0, splitTimer: 0, size, color: baseColor,
      });
      gs.bullets.push({
        x: cx - 14, y: py + 4, dy: -BULLET_SPEED, isPlayer: true,
        curve: -0.8, splitTimer: 0, size, color: COLORS.tripleshot,
      });
      gs.bullets.push({
        x: cx + 14, y: py + 4, dy: -BULLET_SPEED, isPlayer: true,
        curve: 0.8, splitTimer: 0, size, color: COLORS.tripleshot,
      });
    } else if (gs.hasDoubleShot) {
      // Permanent double shot: two parallel bullets
      gs.bullets.push({
        x: cx - 8, y: py, dy: -BULLET_SPEED, isPlayer: true,
        curve: 0, splitTimer: 0, size, color: baseColor,
      });
      gs.bullets.push({
        x: cx + 8, y: py, dy: -BULLET_SPEED, isPlayer: true,
        curve: 0, splitTimer: 0, size, color: baseColor,
      });
    } else {
      // Single shot
      gs.bullets.push({
        x: cx, y: py, dy: -BULLET_SPEED, isPlayer: true,
        curve: 0, splitTimer: 0, size, color: baseColor,
      });
    }
  }, []);

  // ─── Update loop ───────────────────────────────────────────────────────

  const update = useCallback((dt: number, now: number) => {
    const gs = stateRef.current!;
    const keys = keysRef.current;
    const time = timeRef.current;

    // Stars always scroll
    for (const star of gs.stars) {
      star.y += star.speed * 30 * dt;
      if (star.y > BASE_H) {
        star.y = 0;
        star.x = Math.random() * BASE_W;
      }
    }

    // Particles always update
    for (let i = gs.particles.length - 1; i >= 0; i--) {
      const p = gs.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.05; // gravity
      p.life -= dt / p.maxLife;
      if (p.life <= 0) gs.particles.splice(i, 1);
    }

    // Floating texts
    for (let i = gs.floatingTexts.length - 1; i >= 0; i--) {
      const ft = gs.floatingTexts[i];
      ft.y -= 40 * dt;
      ft.life -= dt;
      if (ft.life <= 0) gs.floatingTexts.splice(i, 1);
    }

    if (gs.screenShake > 0) gs.screenShake -= dt * 8;

    if (gs.phase === 'menu' || gs.phase === 'gameover') return;

    if (gs.phase === 'retraining') {
      gs.retrainTimer -= dt;
      gs.retrainPhase = 1 - gs.retrainTimer / 3;
      // Glitch enemies during retraining
      for (const e of gs.enemies) {
        e.glitchTimer = gs.retrainPhase;
      }
      // Pause power-up timers during retraining
      const dtMs = dt * 1000;
      for (const ap of gs.activePowerUps) {
        ap.until += dtMs;
      }
      if (gs.retrainTimer <= 0) {
        gs.phase = 'playing';
        for (const e of gs.enemies) e.glitchTimer = 0;
      }
      return;
    }

    // ─── Player movement ─────────────────────────────────────────────

    const speed = 450 * dt;
    if (keys.has('ArrowLeft') || keys.has('a')) gs.playerX -= speed;
    if (keys.has('ArrowRight') || keys.has('d')) gs.playerX += speed;
    gs.playerX = Math.max(0, Math.min(BASE_W - PLAYER_W, gs.playerX));

    if (gs.playerInvuln > 0) gs.playerInvuln -= dt;

    // Auto-shoot while holding space or mouse
    if (keys.has(' ') || mouseDownRef.current) playerShoot(gs);

    // Combo timer
    if (gs.comboTimer > 0) {
      gs.comboTimer -= dt;
      if (gs.comboTimer <= 0) gs.comboCount = 0;
    }

    // Active power-up expiry - tripleshot downgrades to permanent double shot
    const expiring = gs.activePowerUps.filter(p => p.until <= now);
    for (const p of expiring) {
      if (p.kind === 'tripleshot' && !gs.hasDoubleShot) {
        gs.hasDoubleShot = true;
        gs.floatingTexts.push({
          x: gs.playerX + PLAYER_W / 2, y: BASE_H - 80,
          text: '2x LASERS PERMANENT!',
          life: 2,
          color: '#f472b6',
        });
      }
    }
    gs.activePowerUps = gs.activePowerUps.filter(p => p.until > now);

    const isFrozen = gs.activePowerUps.some(p => p.kind === 'freeze');
    const hasRlhf = gs.activePowerUps.some(p => p.kind === 'rlhf');

    // ─── Enemy hit flash decay ──────────────────────────────────────
    for (const e of gs.enemies) {
      if (e.hitFlash > 0) e.hitFlash -= dt * 2;
    }

    // ─── Enemy movement ──────────────────────────────────────────────

    const hasBoss = gs.enemies.length === 1 && gs.enemies[0].isBoss;

    if (!isFrozen) {
      if (hasBoss) {
        // Boss: smooth continuous movement - side to side + vertical sweep
        const boss = gs.enemies[0];
        if (boss.alive) {
          const bossSpeed = 120 + gs.wave * 8;
          boss.x += gs.enemyDir * bossSpeed * dt;
          const bw = boss.w || ENEMY_W;
          if (boss.x + bw >= BASE_W - 20) { boss.x = BASE_W - bw - 20; gs.enemyDir = -1; }
          if (boss.x <= 20) { boss.x = 20; gs.enemyDir = 1; }

          // Sinusoidal vertical movement: top=40, bottom=BASE_H/2 - boss height
          const vertRange = (BASE_H / 2 - (boss.h || ENEMY_H)) - 40;
          boss.y = 40 + vertRange * (0.5 + 0.5 * Math.sin(time * 0.6));
          boss.frame++;
        }
      } else {
        // Normal enemies: step-based grid movement
        gs.enemyMoveTimer += dt;
        const moveInterval = 1 / gs.enemySpeed;
        if (gs.enemyMoveTimer >= moveInterval) {
          gs.enemyMoveTimer = 0;

          let hitEdge = false;
          for (const e of gs.enemies) {
            if (!e.alive) continue;
            if (gs.enemyDir > 0 && e.x + (e.w || ENEMY_W) + 12 >= BASE_W) hitEdge = true;
            if (gs.enemyDir < 0 && e.x - 12 <= 0) hitEdge = true;
          }

          if (hitEdge) {
            gs.enemyDir *= -1;
            gs.enemyDropAmount += 12 + gs.wave * 2;
          }

          for (const e of gs.enemies) {
            if (!e.alive) continue;
            e.x += gs.enemyDir * (16 + gs.wave * 1.5);
            if (gs.enemyDropAmount > 0) e.y += gs.enemyDropAmount;
            e.frame++;
          }
          gs.enemyDropAmount = 0;

          // Speed up as fewer enemies remain
          const alive = gs.enemies.filter(e => e.alive).length;
          gs.enemySpeed = (0.6 + gs.wave * 0.1) * (1 + (1 - alive / (ENEMY_COLS * ENEMY_ROWS)) * 2);
        }
      }
    }

    // ─── Enemy shooting ──────────────────────────────────────────────

    if (!isFrozen) {
      gs.enemyShootTimer -= dt;
      if (gs.enemyShootTimer <= 0) {
        gs.enemyShootTimer = hasBoss ? Math.max(0.3, 0.8 - gs.wave * 0.03) : Math.max(0.4, 1.5 - gs.wave * 0.08);
        const aliveEnemies = gs.enemies.filter(e => e.alive);
        if (aliveEnemies.length > 0) {
          // Pick a random bottom-row enemy in each column
          const cols = new Map<number, Enemy>();
          for (const e of aliveEnemies) {
            const colKey = Math.round(e.x / (ENEMY_W + ENEMY_PAD_X));
            if (!cols.has(colKey) || e.y > cols.get(colKey)!.y) {
              cols.set(colKey, e);
            }
          }
          const shooters = Array.from(cols.values());
          const shooter = shooters[Math.floor(Math.random() * shooters.length)];

          // Hallucination chance increases with wave
          const isHallucination = Math.random() < Math.min(0.05 + gs.wave * 0.04, 0.4);
          audioSynth.playEnemyShoot();
          
          if (shooter.isBoss) {
            // Boss shoots 5 spread bullets
            for (let i = -2; i <= 2; i++) {
              gs.bullets.push({
                x: shooter.x + (shooter.w || ENEMY_W) / 2 + i * 20,
                y: shooter.y + (shooter.h || ENEMY_H) - 20,
                dy: ENEMY_BULLET_SPEED + gs.wave * 0.3,
                isPlayer: false,
                curve: i * 1.5,
                splitTimer: 0,
                size: 6,
                color: COLORS.agi,
              });
            }
          } else {
            gs.bullets.push({
              x: shooter.x + (shooter.w || ENEMY_W) / 2,
              y: shooter.y + ENEMY_H,
              dy: ENEMY_BULLET_SPEED + gs.wave * 0.3,
              isPlayer: false,
              curve: isHallucination ? (Math.random() - 0.5) * 4 : 0,
              splitTimer: isHallucination && Math.random() > 0.5 ? 0.5 + Math.random() * 0.5 : 0,
              size: shooter.type === 'agi' ? 4 : 3,
              color: isHallucination ? COLORS.bulletHallucination : COLORS.bulletEnemy,
            });
          }
        }
      }
    }

    // ─── Bullet updates ──────────────────────────────────────────────

    for (let i = gs.bullets.length - 1; i >= 0; i--) {
      const b = gs.bullets[i];
      b.y += b.dy * (isFrozen && !b.isPlayer ? 0.3 : 1);
      b.x += b.curve;

      // Hallucination split
      if (b.splitTimer > 0 && !b.isPlayer) {
        b.splitTimer -= dt;
        if (b.splitTimer <= 0) {
          gs.bullets.push({
            x: b.x - 8, y: b.y, dy: b.dy, isPlayer: false,
            curve: -1.5, splitTimer: 0, size: b.size * 0.8,
            color: COLORS.bulletHallucination,
          });
          gs.bullets.push({
            x: b.x + 8, y: b.y, dy: b.dy, isPlayer: false,
            curve: 1.5, splitTimer: 0, size: b.size * 0.8,
            color: COLORS.bulletHallucination,
          });
        }
      }

      // Off screen
      if (b.y < -20 || b.y > BASE_H + 20 || b.x < -20 || b.x > BASE_W + 20) {
        gs.bullets.splice(i, 1);
        continue;
      }

      // Player bullets hitting enemies
      if (b.isPlayer) {
        for (const e of gs.enemies) {
          if (!e.alive) continue;
          if (rectOverlap(b.x - b.size, b.y - b.size, b.size * 2, b.size * 2,
            e.x, e.y, e.w || ENEMY_W, e.h || ENEMY_H)) {
            gs.bullets.splice(i, 1);
            e.hp--;
            e.hitFlash = 0.3;

            const col = e.type === 'agi' ? COLORS.agi : e.type === 'vision' ? COLORS.vision : COLORS.spam;

            if (e.hp <= 0) {
              // Enemy destroyed
              e.alive = false;

              // Score - bonus for multi-hp enemies
              const baseScore = e.isBoss ? 1000 : e.type === 'agi' ? 30 : e.type === 'vision' ? 20 : 10;
              const hpBonus = e.maxHp > 1 ? 1.5 : 1;
              gs.comboCount++;
              gs.comboTimer = 2;
              audioSynth.playExplosion(e.maxHp > 1);
              const multiplier = Math.min(gs.comboCount, 8) * (hasRlhf ? 2 : 1);
              const points = Math.round(baseScore * multiplier * hpBonus);
              gs.score += points;

              // Floating text
              gs.floatingTexts.push({
                x: e.x + ENEMY_W / 2, y: e.y,
                text: `+${points}${gs.comboCount > 1 ? ` x${gs.comboCount}` : ''}`,
                life: 1,
                color: col,
              });

              // Death explosion - bigger for multi-hp enemies
              const particleCount = e.isBoss ? 200 : e.maxHp > 1 ? 20 : 12;
              const spd = e.isBoss ? 15 : 5;
              const sz = e.isBoss ? 8 : 4;
              spawnParticles(gs.particles, e.x + (e.w || ENEMY_W) / 2, e.y + (e.h || ENEMY_H) / 2, col, particleCount, spd, sz);
              spawnParticles(gs.particles, e.x + (e.w || ENEMY_W) / 2, e.y + (e.h || ENEMY_H) / 2, '#fff', e.isBoss ? 50 : 6, spd - 2, sz - 2);

              if (e.isBoss) {
                 gs.screenShake = 1.0;
                 gs.floatingTexts.push({
                   x: BASE_W / 2, y: BASE_H / 2,
                   text: 'BOSS DEFEATED!',
                   life: 3,
                   color: '#fbbf24',
                 });
                 // Big shockwave
                 spawnParticles(gs.particles, e.x + (e.w || ENEMY_W) / 2, e.y + (e.h || ENEMY_H) / 2, '#fbbf24', 100, 20, 10);
              } else {
                 gs.screenShake = e.maxHp > 1 ? 0.25 : 0.15;
              }

              // Power-up drop
              if (Math.random() < 0.08) {
                const kinds: PowerUpKind[] = ['tripleshot', 'freeze', 'rlhf'];
                gs.powerUps.push({
                  x: e.x + (e.w || ENEMY_W) / 2 - POWERUP_SIZE / 2,
                  y: e.y,
                  kind: kinds[Math.floor(Math.random() * kinds.length)],
                  pulse: Math.random() * Math.PI * 2,
                });
              }
            } else {
              audioSynth.playDamage();
              // Damaged but not destroyed - show hit feedback
              spawnParticles(gs.particles, e.x + (e.w || ENEMY_W) / 2, e.y + (e.h || ENEMY_H) / 2, col, 6, 3, 2);
              gs.floatingTexts.push({
                x: e.x + ENEMY_W / 2, y: e.y,
                text: 'CRACK!',
                life: 0.6,
                color: '#ff6b6b',
              });
              gs.screenShake = 0.1;
            }
            break;
          }
        }
      } else {
        // Enemy bullets hitting player
        const px = gs.playerX;
        const py = BASE_H - 56;
        if (gs.playerInvuln <= 0 && rectOverlap(
          b.x - b.size, b.y - b.size, b.size * 2, b.size * 2,
          px + 8, py + 4, PLAYER_W - 16, PLAYER_H - 8)) {
          gs.bullets.splice(i, 1);
          gs.lives--;
          audioSynth.playExplosion(true);
          gs.playerInvuln = 2;
          gs.screenShake = 0.5;
          spawnParticles(gs.particles, px + PLAYER_W / 2, py + PLAYER_H / 2, COLORS.player, 20, 5, 4);

          if (gs.lives <= 0) {
            gs.phase = 'gameover';
            gs.deathMessage = DEATH_MESSAGES[Math.floor(Math.random() * DEATH_MESSAGES.length)];
            if (gs.score > gs.highScore) {
              gs.highScore = gs.score;
              localStorage.setItem('prompt_invaders_hs', String(gs.score));
            }
            spawnParticles(gs.particles, px + PLAYER_W / 2, py + PLAYER_H / 2, '#ff4444', 40, 6, 5);
          }
          continue;
        }

        // Enemy bullets hitting shields
        for (const s of gs.shields) {
          if (s.hp <= 0) continue;
          if (rectOverlap(b.x - b.size, b.y - b.size, b.size * 2, b.size * 2,
            s.x, s.y, SHIELD_W, SHIELD_H)) {
            gs.bullets.splice(i, 1);
            s.hp--;
            audioSynth.playDamage();
            s.cracks.push({
              x: b.x, y: b.y,
              angle: Math.random() * Math.PI * 2,
            });
            spawnParticles(gs.particles, b.x, b.y, COLORS.shield, 4, 2, 2);
            break;
          }
        }
      }
    }

    // Player bullets also hit shields (from below - friendly fire)
    // Skip this for better gameplay

    // ─── Power-up movement & collection ──────────────────────────────

    for (let i = gs.powerUps.length - 1; i >= 0; i--) {
      const pu = gs.powerUps[i];
      pu.y += POWERUP_SPEED;
      if (pu.y > BASE_H) {
        gs.powerUps.splice(i, 1);
        continue;
      }
      // Collect
      if (rectOverlap(pu.x, pu.y, POWERUP_SIZE, POWERUP_SIZE,
        gs.playerX, BASE_H - 56, PLAYER_W, PLAYER_H)) {
        gs.powerUps.splice(i, 1);
        gs.activePowerUps.push({ kind: pu.kind, until: now + POWERUP_DURATION });
        audioSynth.playPowerup();
        spawnParticles(gs.particles, pu.x + POWERUP_SIZE / 2, pu.y + POWERUP_SIZE / 2,
          pu.kind === 'tripleshot' ? COLORS.tripleshot : pu.kind === 'freeze' ? COLORS.freeze : COLORS.rlhf,
          10, 3, 3);

        const labels = { tripleshot: 'TRIPLE SHOT!', freeze: 'FACT CHECK!', rlhf: 'RLHF BOOST!' };
        gs.floatingTexts.push({
          x: pu.x, y: pu.y - 10,
          text: labels[pu.kind],
          life: 1.5,
          color: '#fff',
        });
        gs.screenShake = 0.1;
      }
    }

    // ─── Enemy reaching bottom → lose life ───────────────────────────

    for (const e of gs.enemies) {
      if (e.alive && e.y + ENEMY_H > BASE_H - 70) {
        gs.lives = 0;
        gs.phase = 'gameover';
        gs.deathMessage = "The bots have breached your inbox. Game over.";
        if (gs.score > gs.highScore) {
          gs.highScore = gs.score;
          localStorage.setItem('prompt_invaders_hs', String(gs.score));
        }
        spawnParticles(gs.particles, gs.playerX + PLAYER_W / 2, BASE_H - 32, '#ff4444', 40, 6, 5);
        return;
      }
    }

    // ─── Wave clear check ────────────────────────────────────────────

    if (gs.enemies.every(e => !e.alive)) {
      startNextWave(gs);
    }
  }, [playerShoot, startNextWave]);

  // ─── Draw ──────────────────────────────────────────────────────────────

  const draw = useCallback((ctx: CanvasRenderingContext2D) => {
    const gs = stateRef.current!;
    const time = timeRef.current;
    const images = imagesRef.current;

    ctx.save();

    // Screen shake
    if (gs.screenShake > 0) {
      const shakeX = (Math.random() - 0.5) * gs.screenShake * 12;
      const shakeY = (Math.random() - 0.5) * gs.screenShake * 12;
      ctx.translate(shakeX, shakeY);
    }

    // Background
    if (images && images.bg) {
      const scrollSpeed = 20;
      const bgOffset = (time * scrollSpeed) % BASE_H;
      ctx.drawImage(images.bg, 0, bgOffset, BASE_W, BASE_H);
      ctx.drawImage(images.bg, 0, bgOffset - BASE_H, BASE_W, BASE_H);
      
      // Dark sci-fi overlay for deep space tint (skip during NFT capture for full brightness)
      const isCapturing = nftCaptureRef.current && gs.phase === 'gameover';
      if (!isCapturing) {
        const overGrad = ctx.createLinearGradient(0, 0, 0, BASE_H);
        overGrad.addColorStop(0, 'rgba(6, 4, 16, 0.85)');
        overGrad.addColorStop(0.5, 'rgba(12, 8, 28, 0.75)');
        overGrad.addColorStop(1, 'rgba(6, 4, 16, 0.85)');
        ctx.fillStyle = overGrad;
        ctx.fillRect(0, 0, BASE_W, BASE_H);

        // Vignette to darken edges
        const vigGrad = ctx.createRadialGradient(BASE_W / 2, BASE_H / 2, BASE_H * 0.2, BASE_W / 2, BASE_H / 2, BASE_W * 0.7);
        vigGrad.addColorStop(0, 'transparent');
        vigGrad.addColorStop(1, 'rgba(0, 0, 0, 0.8)');
        ctx.fillStyle = vigGrad;
        ctx.fillRect(0, 0, BASE_W, BASE_H);
      }
    } else {
      const bgGrad = ctx.createLinearGradient(0, 0, 0, BASE_H);
      bgGrad.addColorStop(0, '#06060e');
      bgGrad.addColorStop(0.5, '#0a0a18');
      bgGrad.addColorStop(1, '#0d0d20');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, BASE_W, BASE_H);
    }

    // Stars
    for (const star of gs.stars) {
      const pulse = star.brightness * (0.7 + 0.3 * Math.sin(time * 2 + star.x));
      ctx.fillStyle = `rgba(180, 200, 255, ${pulse})`;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fill();
    }

    // Grid lines (subtle)
    ctx.strokeStyle = 'rgba(30, 40, 80, 0.3)';
    ctx.lineWidth = 0.5;
    for (let gx = 0; gx < BASE_W; gx += 80) {
      ctx.beginPath();
      ctx.moveTo(gx, 0);
      ctx.lineTo(gx, BASE_H);
      ctx.stroke();
    }
    for (let gy = 0; gy < BASE_H; gy += 80) {
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.lineTo(BASE_W, gy);
      ctx.stroke();
    }

    // ─── Shields ─────────────────────────────────────────────────────

    for (const s of gs.shields) {
      if (s.hp > 0) drawShield(ctx, s, time);
    }

    // ─── Enemies ─────────────────────────────────────────────────────

    const isFrozen = gs.activePowerUps.some(p => p.kind === 'freeze');
    const waveTint = WAVE_TINTS[(gs.wave - 1) % WAVE_TINTS.length];

    for (const e of gs.enemies) {
      if (!e.alive) continue;

      ctx.save();
      // Glitch during retraining
      if (e.glitchTimer > 0) {
        const g = e.glitchTimer;
        ctx.translate(
          (Math.random() - 0.5) * 20 * g,
          (Math.random() - 0.5) * 10 * g,
        );
        if (Math.random() < g * 0.3) {
          ctx.globalAlpha = 0.3;
        }
      }
      drawEnemy(ctx, e, time, images);

      // Wave color tint overlay (hue shift per wave)
      if (waveTint && !e.isBoss) {
        ctx.globalCompositeOperation = 'color';
        ctx.globalAlpha = 0.45;
        ctx.fillStyle = waveTint;
        ctx.fillRect(e.x - 4, e.y - 6, (e.w || ENEMY_W) + 8, (e.h || ENEMY_H) + 12);
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
      }

      // Damage cracks for multi-hp enemies that have been hit
      if (e.hp < e.maxHp && e.hp > 0) {
        drawEnemyDamage(ctx, e, time);
      }

      // HP bar for multi-hp enemies
      drawEnemyHpBar(ctx, e);

      // Freeze tint - dark overlay instead of expensive filter
      if (isFrozen && !e.isBoss) {
        ctx.globalAlpha = 0.45;
        ctx.fillStyle = '#0a1428';
        ctx.fillRect(e.x - 2, e.y - 4, (e.w || ENEMY_W) + 4, (e.h || ENEMY_H) + 8);
      }
      ctx.restore();
    }

    // ─── Power-ups ───────────────────────────────────────────────────

    for (const pu of gs.powerUps) {
      drawPowerUp(ctx, pu, time);
    }

    // ─── Bullets ─────────────────────────────────────────────────────

    for (const b of gs.bullets) {
      drawBullet(ctx, b, time);
    }

    // ─── Player ──────────────────────────────────────────────────────

    if (gs.phase === 'playing' || gs.phase === 'retraining') {
      drawPlayer(ctx, gs.playerX, BASE_H - 56, gs.playerInvuln, time, images);
    }

    // ─── Particles ───────────────────────────────────────────────────

    for (const p of gs.particles) {
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // ─── Floating texts ──────────────────────────────────────────────

    for (const ft of gs.floatingTexts) {
      ctx.globalAlpha = Math.min(1, ft.life * 2);
      ctx.fillStyle = ft.color;
      ctx.font = 'bold 16px monospace';
      ctx.textAlign = 'center';
      ctx.shadowColor = ft.color;
      ctx.shadowBlur = 6;
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.shadowBlur = 0;
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';

    // ─── HUD ─────────────────────────────────────────────────────────

    if (gs.phase !== 'menu') {
      const hudTop = 52; // offset below wallet status bar

      // Score
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 20px monospace';
      ctx.fillText(`SCORE: ${gs.score}`, 20, hudTop);

      // High score
      ctx.fillStyle = '#888';
      ctx.font = '14px monospace';
      ctx.fillText(`HI: ${gs.highScore}`, 20, hudTop + 18);

      // Lives
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 16px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`LIVES: ${'❤'.repeat(gs.lives)}`, BASE_W - 20, hudTop);

      // Wave
      ctx.textAlign = 'center';
      ctx.fillStyle = '#aaa';
      ctx.font = '14px monospace';
      ctx.fillText(`WAVE ${gs.wave}`, BASE_W / 2, hudTop);
      ctx.textAlign = 'left';

      // Active power-ups display
      let puY = hudTop + 22;
      for (const ap of gs.activePowerUps) {
        const remaining = Math.max(0, (ap.until - performance.now()) / 1000);
        let label: string;
        let col: string;
        if (ap.kind === 'tripleshot') { label = `TRIPLE SHOT ${remaining.toFixed(1)}s`; col = COLORS.tripleshot; }
        else if (ap.kind === 'freeze') { label = `FACT CHECK ${remaining.toFixed(1)}s`; col = COLORS.freeze; }
        else { label = `RLHF BOOST ${remaining.toFixed(1)}s`; col = COLORS.rlhf; }
        ctx.fillStyle = col;
        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'right';
        ctx.fillText(label, BASE_W - 20, puY);
        puY += 16;
      }

      // Permanent double shot indicator
      if (gs.hasDoubleShot && !gs.activePowerUps.some(p => p.kind === 'tripleshot')) {
        ctx.fillStyle = COLORS.tripleshot;
        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'right';
        ctx.fillText('2x LASERS', BASE_W - 20, puY);
        puY += 16;
      }
      ctx.textAlign = 'left';

      // Combo
      if (gs.comboCount > 1) {
        ctx.fillStyle = '#fbbf24';
        ctx.font = 'bold 14px monospace';
        ctx.fillText(`COMBO x${gs.comboCount}`, 20, hudTop + 36);
      }
    }

    // ─── Retraining overlay ──────────────────────────────────────────

    if (gs.phase === 'retraining') {
      ctx.fillStyle = `rgba(0, 0, 0, ${0.3 + 0.2 * Math.sin(time * 6)})`;
      ctx.fillRect(0, 0, BASE_W, BASE_H);

      // Glitch lines
      for (let i = 0; i < 8; i++) {
        const ly = Math.random() * BASE_H;
        ctx.fillStyle = `rgba(${Math.random() > 0.5 ? '255,100,100' : '100,200,255'}, ${0.1 + Math.random() * 0.2})`;
        ctx.fillRect(0, ly, BASE_W, 1 + Math.random() * 3);
      }

      ctx.textAlign = 'center';
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 36px monospace';
      ctx.shadowColor = '#00e5ff';
      ctx.shadowBlur = 20;
      const waveName = WAVE_NAMES[Math.min(gs.wave - 1, WAVE_NAMES.length - 1)] || `Wave ${gs.wave}`;
      ctx.fillText(waveName, BASE_W / 2, BASE_H / 2 - 20);

      ctx.font = '18px monospace';
      ctx.fillStyle = '#aaa';
      ctx.shadowBlur = 0;
      ctx.fillText('Re-training in progress...', BASE_W / 2, BASE_H / 2 + 20);

      // Progress bar
      const barW = 300;
      const barH = 8;
      const barX = BASE_W / 2 - barW / 2;
      const barY = BASE_H / 2 + 44;
      ctx.fillStyle = '#222';
      roundRect(ctx, barX, barY, barW, barH, 4);
      ctx.fill();
      ctx.fillStyle = '#00e5ff';
      roundRect(ctx, barX, barY, barW * gs.retrainPhase, barH, 4);
      ctx.fill();

      ctx.textAlign = 'left';
    }

    // ─── Menu overlay ────────────────────────────────────────────────

    if (gs.phase === 'menu') {
      // Darken
      ctx.fillStyle = 'rgba(6, 6, 14, 0.7)';
      ctx.fillRect(0, 0, BASE_W, BASE_H);

      ctx.textAlign = 'center';

      // Title
      ctx.shadowColor = '#00e5ff';
      ctx.shadowBlur = 30;
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 56px monospace';
      ctx.fillText('PROMPT INVADERS', BASE_W / 2, BASE_H / 2 - 100);

      // Tagline
      ctx.shadowBlur = 10;
      ctx.fillStyle = '#00e5ff';
      ctx.font = '18px monospace';
      ctx.fillText('Rogue chatbots have escaped the cloud. Defend your inbox!', BASE_W / 2, BASE_H / 2 - 55);

      ctx.shadowBlur = 0;

      // Instructions
      ctx.fillStyle = '#888';
      ctx.font = '15px monospace';
      ctx.fillText('← → or A/D to move  |  SPACE or CLICK to shoot (hold for auto-fire)', BASE_W / 2, BASE_H / 2 + 10);

      // Power-up legend
      ctx.font = '13px monospace';
      ctx.fillStyle = COLORS.tripleshot;
      ctx.fillText('◆ 3x = Triple Shot → 2x', BASE_W / 2 - 180, BASE_H / 2 + 50);
      ctx.fillStyle = COLORS.freeze;
      ctx.fillText('◆ ❄ = Fact Check (Freeze)', BASE_W / 2, BASE_H / 2 + 50);
      ctx.fillStyle = COLORS.rlhf;
      ctx.fillText('◆ RL = RLHF Boost', BASE_W / 2 + 200, BASE_H / 2 + 50);

      // Start prompt
      const pulse = 0.5 + 0.5 * Math.sin(time * 3);
      ctx.fillStyle = `rgba(255, 255, 255, ${pulse})`;
      ctx.font = 'bold 22px monospace';
      ctx.fillText('Press SPACE, ENTER, or CLICK to start', BASE_W / 2, BASE_H / 2 + 110);

      // High score
      if (gs.highScore > 0) {
        ctx.fillStyle = '#fbbf24';
        ctx.font = '16px monospace';
        ctx.fillText(`High Score: ${gs.highScore}`, BASE_W / 2, BASE_H / 2 + 150);
      }

      ctx.textAlign = 'left';
    }

    // ─── NFT capture: snapshot before game-over overlay ──────────────
    if (nftCaptureRef.current && gs.phase === 'gameover') {
      nftCaptureRef.current = false;
      const srcCanvas = ctx.canvas;
      // Scale to 1600px wide, JPEG at 95% quality
      const maxW = 1600;
      const scale = Math.min(1, maxW / srcCanvas.width);
      const w = Math.round(srcCanvas.width * scale);
      const h = Math.round(srcCanvas.height * scale);
      const offscreen = document.createElement('canvas');
      offscreen.width = w;
      offscreen.height = h;
      const offCtx = offscreen.getContext('2d');
      if (offCtx) {
        offCtx.drawImage(srcCanvas, 0, 0, w, h);
        offscreen.toBlob((b) => {
          if (b && nftCaptureResolveRef.current) {
            nftCaptureResolveRef.current(b);
            nftCaptureResolveRef.current = null;
          }
        }, 'image/jpeg', 0.95);
      }
    }

    // ─── Game over overlay ───────────────────────────────────────────

    if (gs.phase === 'gameover') {
      ctx.fillStyle = 'rgba(6, 6, 14, 0.8)';
      ctx.fillRect(0, 0, BASE_W, BASE_H);

      ctx.textAlign = 'center';

      ctx.shadowColor = '#ff4444';
      ctx.shadowBlur = 20;
      ctx.fillStyle = '#ff4444';
      ctx.font = 'bold 48px monospace';
      ctx.fillText('GAME OVER', BASE_W / 2, BASE_H / 2 - 80);
      ctx.shadowBlur = 0;

      // Death message
      ctx.fillStyle = '#ccc';
      ctx.font = 'italic 16px monospace';
      ctx.fillText(`"${gs.deathMessage}"`, BASE_W / 2, BASE_H / 2 - 30);

      // Score
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 24px monospace';
      ctx.fillText(`Score: ${gs.score}`, BASE_W / 2, BASE_H / 2 + 20);

      ctx.fillStyle = '#fbbf24';
      ctx.font = '18px monospace';
      ctx.fillText(`Wave: ${gs.wave}  |  High Score: ${gs.highScore}`, BASE_W / 2, BASE_H / 2 + 55);

      // Restart
      const pulse = 0.5 + 0.5 * Math.sin(time * 3);
      ctx.fillStyle = `rgba(255, 255, 255, ${pulse})`;
      ctx.font = 'bold 20px monospace';
      ctx.fillText('Press SPACE, ENTER, or CLICK to play again', BASE_W / 2, BASE_H / 2 + 110);

      ctx.textAlign = 'left';
    }

    // Freeze overlay tint
    if (isFrozen && gs.phase === 'playing') {
      ctx.fillStyle = 'rgba(100, 230, 255, 0.04)';
      ctx.fillRect(0, 0, BASE_W, BASE_H);
    }

    ctx.restore();
  }, []);

  // ─── Game loop ─────────────────────────────────────────────────────────

  const gameLoop = useCallback((timestamp: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (!stateRef.current) stateRef.current = initState();

    const dt = Math.min((timestamp - lastFrameRef.current) / 1000, 0.05);
    lastFrameRef.current = timestamp;
    timeRef.current += dt;

    const phaseBefore = stateRef.current.phase;
    update(dt, performance.now());
    const phaseAfter = stateRef.current.phase;

    draw(ctx);

    // Detect transition to gameover → show mint panel
    if (phaseBefore !== 'gameover' && phaseAfter === 'gameover') {
      if (addressRef.current) {
        setShowMintPanel(true);
        showMintPanelRef.current = true;
        mintRef.current?.resetMint();
      }
    }
    prevPhaseRef.current = phaseAfter;

    rafRef.current = requestAnimationFrame(gameLoop);
  }, [initState, update, draw]);

  // ─── Effects ───────────────────────────────────────────────────────────

  useEffect(() => {
    stateRef.current = initState();
    lastFrameRef.current = performance.now();
    rafRef.current = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [initState, gameLoop]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const key = e.key;
      const gs = stateRef.current;
      if (!gs) return;

      if (gs.phase === 'menu' && (key === ' ' || key === 'Enter')) {
        e.preventDefault();
        startGame();
        return;
      }
      if (gs.phase === 'gameover' && (key === ' ' || key === 'Enter')) {
        e.preventDefault();
        if (!showMintPanelRef.current) startGame();
        return;
      }
      if (key === ' ') e.preventDefault();
      keysRef.current.add(key);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key);
    };

    const handleMouseDown = (e: MouseEvent) => {
      e.preventDefault();
      const gs = stateRef.current;
      if (!gs) return;
      if (gs.phase === 'menu') {
        startGame();
        return;
      }
      if (gs.phase === 'gameover') {
        if (!showMintPanelRef.current) startGame();
        return;
      }
      mouseDownRef.current = true;
    };

    const handleMouseUp = () => {
      mouseDownRef.current = false;
    };

    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      const gs = stateRef.current;
      if (!gs) return;
      if (gs.phase === 'menu') {
        startGame();
        return;
      }
      if (gs.phase === 'gameover') {
        if (!showMintPanelRef.current) startGame();
        return;
      }
      mouseDownRef.current = true;
    };

    const handleTouchEnd = () => {
      mouseDownRef.current = false;
    };

    window.addEventListener('keydown', handleKey);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    
    // Touch movement logic
    let touchStartX = 0;
    let shipStartX = 0;
    const handleTouchStartWithMove = (e: TouchEvent) => {
      handleTouchStart(e);
      touchStartX = e.touches[0].clientX;
      const gs = stateRef.current;
      if (gs) shipStartX = gs.playerX;
    };
    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const gs = stateRef.current;
      if (!gs || gs.phase === 'menu' || gs.phase === 'gameover') return;
      const currentX = e.touches[0].clientX;
      const deltaX = currentX - touchStartX;
      gs.playerX = Math.max(0, Math.min(BASE_W - PLAYER_W, shipStartX + deltaX * 2)); // multiply by 2 for sensitivity
    };

    window.addEventListener('touchstart', handleTouchStartWithMove, { passive: false });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });

    window.addEventListener('touchend', handleTouchEnd);
    return () => {
      window.removeEventListener('keydown', handleKey);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchstart', handleTouchStartWithMove);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [startGame]);

  // ─── Canvas sizing ────────────────────────────────────────────────────

  const [canvasSize, setCanvasSize] = useState({ w: 1200, h: 800 });

  useEffect(() => {
    const resize = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      BASE_W = vw;
      BASE_H = vh;
      setCanvasSize({ w: vw, h: vh });
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  // ─── Render ────────────────────────────────────────────────────────────

  const shortAddr = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : null;

  return (
    <div
      className="flex items-center justify-center w-screen h-screen font-sans overflow-hidden relative"
      style={{ background: '#06060e' }}
    >
      {!imagesLoaded && (
        <div style={{ position: 'absolute', color: '#00e5ff', fontSize: '24px', fontFamily: 'monospace', animation: 'pulse 2s infinite' }}>
          INITIALIZING ASSETS...
        </div>
      )}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes pulse { 0%, 100% {opacity: 1} 50% {opacity: 0.5} }
        @keyframes mintGlow { 0%, 100% { box-shadow: 0 0 20px rgba(0,229,255,0.3); } 50% { box-shadow: 0 0 40px rgba(0,229,255,0.5); } }
      `}} />
      <canvas
        ref={canvasRef}
        width={canvasSize.w}
        height={canvasSize.h}
        style={{
          width: canvasSize.w,
          height: canvasSize.h,
          imageRendering: 'auto',
        }}
        tabIndex={0}
      />

      {/* ═══ Wallet connect button (top-right) ═══ */}
      <div className="absolute top-3 right-3 z-30" style={{ fontFamily: "'Courier New', monospace" }}>
        {!address ? (
          <button onClick={connect} disabled={isConnecting}
            className="flex items-center gap-2 px-3 py-1.5 font-bold rounded-lg text-xs border transition-all hover:border-cyan-500/40"
            style={{ background: 'rgba(0,229,255,0.08)', color: '#00e5ff', borderColor: '#ffffff15' }}>
            {isConnecting ? '...' : 'CONNECT WALLET'}
          </button>
        ) : (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs border"
            style={{ background: 'rgba(0,229,255,0.08)', color: '#00e5ff', borderColor: 'rgba(0,229,255,0.2)' }}>
            <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span>{shortAddr}</span>
            {!isCorrectNetwork && (
              <button onClick={switchToBase} className="ml-1 text-yellow-400 hover:text-yellow-300 text-[10px] underline">Switch</button>
            )}
          </div>
        )}
      </div>

      {/* ═══ MINT NFT PANEL (overlay on game over) ═══ */}
      {showMintPanel && address && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30"
          style={{ fontFamily: "'Courier New', monospace" }}>
          <div className="rounded-xl px-6 py-4 flex flex-col items-center gap-3"
            style={{
              background: 'rgba(6,6,14,0.92)',
              border: '1px solid rgba(0,229,255,0.3)',
              boxShadow: '0 8px 40px rgba(0,229,255,0.15), 0 0 80px rgba(0,229,255,0.05)',
              backdropFilter: 'blur(12px)',
              minWidth: 320,
            }}>

            {/* Pre-mint state */}
            {!mint.txHash && !mint.isMinting && !mint.isUploading && !mint.error && (
              <>
                <div className="flex items-center gap-2 text-white/90 text-sm font-bold tracking-wider">
                  MINT YOUR SCORE AS NFT
                </div>
                <div className="text-white/50 text-xs text-center">
                  Score: {stateRef.current?.score ?? 0} · Wave: {stateRef.current?.wave ?? 1}
                </div>
                <button onClick={handleMint}
                  className="flex items-center gap-2 px-6 py-2.5 font-bold rounded-lg text-sm tracking-wider transition-all hover:scale-105"
                  style={{
                    background: isCorrectNetwork
                      ? 'linear-gradient(135deg, #00b4d8, #00e5ff)'
                      : 'linear-gradient(135deg, #eab308, #facc15)',
                    color: '#000',
                    animation: 'mintGlow 2s ease-in-out infinite',
                  }}>
                  {isCorrectNetwork ? 'MINT (~$0.50 + gas)' : 'SWITCH TO BASE'}
                </button>
                <button onClick={() => { setShowMintPanel(false); showMintPanelRef.current = false; }}
                  className="text-white/30 hover:text-white/50 text-xs mt-1 transition-colors">
                  skip
                </button>
              </>
            )}

            {/* Uploading to IPFS */}
            {mint.isUploading && (
              <div className="flex items-center gap-3 text-cyan-300 text-sm py-2">
                <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31.4 31.4" strokeLinecap="round"/></svg>
                <span>Uploading to IPFS...</span>
              </div>
            )}

            {/* Minting on chain */}
            {mint.isMinting && (
              <div className="flex items-center gap-3 text-cyan-300 text-sm py-2">
                <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31.4 31.4" strokeLinecap="round"/></svg>
                <span>Minting on Base... confirm in wallet</span>
              </div>
            )}

            {/* Success */}
            {mint.txHash && !mint.isMinting && (
              <div className="flex flex-col items-center gap-2 py-1">
                <div className="flex items-center gap-2 text-green-400 text-sm font-bold">
                  MINTED!
                  {mint.tokenId && <span className="text-white/60 font-normal">Token #{mint.tokenId}</span>}
                </div>
                <a href={`${CHAIN_CONFIG[TARGET_CHAIN_ID]?.blockExplorerUrls[0] || 'https://basescan.org'}/tx/${mint.txHash}`}
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 text-xs transition-colors">
                  View on BaseScan
                </a>
                <button onClick={() => { setShowMintPanel(false); showMintPanelRef.current = false; }}
                  className="text-white/30 hover:text-white/50 text-xs mt-1 transition-colors">
                  close
                </button>
              </div>
            )}

            {/* Error */}
            {mint.error && (
              <div className="flex flex-col items-center gap-2 py-1">
                <div className="text-red-400 text-xs text-center max-w-xs">{mint.error}</div>
                <button onClick={handleMint}
                  className="text-cyan-400 hover:text-cyan-300 text-xs underline">
                  Try again
                </button>
                <button onClick={() => { setShowMintPanel(false); showMintPanelRef.current = false; }}
                  className="text-white/30 hover:text-white/50 text-xs mt-1 transition-colors">
                  skip
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
