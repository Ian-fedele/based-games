"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { Play, RotateCcw, Zap, Palette, Wallet, Link2, Shield, Image as ImageIcon, Loader2, ExternalLink, CheckCircle2 } from "lucide-react";
import { useWallet } from '@/contexts/WalletContext';
import { useGameSeed, useMintNFT } from '@/hooks/useBlockchainSnake';
import { SNAKE_CONTRACT_ADDRESS, SNAKE_CONTRACT_ABI } from '@/lib/snakeContract';
import { CHAIN_CONFIG, TARGET_CHAIN_ID } from '@/lib/chainConfig';
import { Contract } from 'ethers';
/* eslint-disable @typescript-eslint/no-explicit-any */

const GRID_COLS_LANDSCAPE = 32;
const GRID_ROWS_LANDSCAPE = 18;
const GRID_COLS_PORTRAIT = 18;
const GRID_ROWS_PORTRAIT = 32;
const BASE_SPEED = 130;
const MIN_SPEED = 60;
const POINTS_PER_APPLE = 10;
const SPEED_DECREASE_PER_APPLE = 2;

interface SnakeTheme {
  name: string; primary: string; secondary: string; glow: string; headGlow: string;
  trailRgb: string; flashRgb: string;
  headR: number; headG: number; headB: number;
  tailR: number; tailG: number; tailB: number;
  label: string; swatch: string;
}

const THEMES: SnakeTheme[] = [
  { name: "neon-green", primary: "#00ff88", secondary: "#00cc6a", glow: "#00ff88", headGlow: "#00ffaa",
    trailRgb: "0,255,136", flashRgb: "0,255,136",
    headR: 80, headG: 255, headB: 136, tailR: 20, tailG: 140, tailB: 60,
    label: "Neon Green", swatch: "#00ff88" },
  { name: "cyber-blue", primary: "#00ccff", secondary: "#0099dd", glow: "#00ccff", headGlow: "#44ddff",
    trailRgb: "0,200,255", flashRgb: "0,180,255",
    headR: 60, headG: 200, headB: 255, tailR: 15, tailG: 100, tailB: 180,
    label: "Cyber Blue", swatch: "#00ccff" },
  { name: "electric-yellow", primary: "#ffee00", secondary: "#ccbb00", glow: "#ffee00", headGlow: "#ffff44",
    trailRgb: "255,238,0", flashRgb: "255,230,0",
    headR: 255, headG: 238, headB: 40, tailR: 160, tailG: 140, tailB: 10,
    label: "Electric Yellow", swatch: "#ffee00" },
  { name: "hot-pink", primary: "#ff3388", secondary: "#dd1166", glow: "#ff3388", headGlow: "#ff55aa",
    trailRgb: "255,50,136", flashRgb: "255,50,120",
    headR: 255, headG: 80, headB: 140, tailR: 160, tailG: 20, tailB: 80,
    label: "Hot Pink", swatch: "#ff3388" },
];

interface Particle { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; color: string; size: number; }
interface Sparkle { angle: number; dist: number; speed: number; size: number; opacity: number; color: string; }
interface Building { x: number; w: number; h: number; windowRows: number; windowCols: number; hue: number; lit: boolean[]; }
interface RainDrop { x: number; y: number; speed: number; len: number; opacity: number; }

export default function SnakeGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const snakeRef = useRef<number[][]>([[16,9],[15,9],[14,9],[13,9]]);
  const foodRef = useRef<number[]>([20,10]);
  const dxRef = useRef(1); const dyRef = useRef(0);
  const prevDxRef = useRef(1); const prevDyRef = useRef(0);
  const scoreRef = useRef(0); const hiScoreRef = useRef(0);
  const applesEatenRef = useRef(0);
  const gameOverRef = useRef(false); const gameRunningRef = useRef(false);
  const dirQueueRef = useRef<{dx:number;dy:number}[]>([]);
  const lastTickTimeRef = useRef(0);
  const prevSnakeRef = useRef<number[][]>([[16,9],[15,9],[14,9],[13,9]]);
  const particlesRef = useRef<Particle[]>([]);
  const sparklesRef = useRef<Sparkle[]>([]);
  const screenShakeRef = useRef(0); const foodPulseRef = useRef(0); const eatFlashRef = useRef(0);
  const buildingsRef = useRef<Building[]>([]); const rainRef = useRef<RainDrop[]>([]); const bgInitRef = useRef(false);

  const [score, setScore] = useState(0);
  const [hiScore, setHiScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [gameRunning, setGameRunning] = useState(false);
  const [showIntro, setShowIntro] = useState(true);
  const [showReady, setShowReady] = useState(false);
  const showReadyRef = useRef(false);
  const readyStartTimeRef = useRef(0);
  const [themeIndex, setThemeIndex] = useState(0);
  const [showPicker, setShowPicker] = useState(false);
  const [showMintPanel, setShowMintPanel] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const gridColsRef = useRef(GRID_COLS_LANDSCAPE);
  const gridRowsRef = useRef(GRID_ROWS_LANDSCAPE);
  const nftCaptureRef = useRef(false);
  const nftCaptureResolveRef = useRef<((blob: Blob) => void) | null>(null);
  const themeRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setTimeout>|null>(null);
  const rafRef = useRef<number>(0); const timeRef = useRef(0);

  // ═══════════════════════════════════════════
  //  BLOCKCHAIN HOOKS
  // ═══════════════════════════════════════════
  const { address, isConnected, isConnecting, isCorrectNetwork, connect, switchToBase, getSigner } = useWallet();

  const getSnakeContract = useCallback(async (): Promise<Contract | null> => {
    const signer = await getSigner();
    if (!signer) return null;
    return new Contract(SNAKE_CONTRACT_ADDRESS, SNAKE_CONTRACT_ABI, signer);
  }, [getSigner]);

  const gameSeed = useGameSeed(getSnakeContract);
  const mint = useMintNFT(getSnakeContract, gameSeed.revealSeed);

  // ═══════════════════════════════════════════
  //  MOBILE / PORTRAIT DETECTION
  // ═══════════════════════════════════════════
  useEffect(() => {
    const checkMobile = () => {
      const portrait = window.innerHeight > window.innerWidth;
      setIsMobile(portrait);
      gridColsRef.current = portrait ? GRID_COLS_PORTRAIT : GRID_COLS_LANDSCAPE;
      gridRowsRef.current = portrait ? GRID_ROWS_PORTRAIT : GRID_ROWS_LANDSCAPE;
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const getCurrentSpeed = useCallback(() => Math.max(MIN_SPEED, BASE_SPEED - applesEatenRef.current * SPEED_DECREASE_PER_APPLE), []);

  const spawnParticles = useCallback((x:number,y:number,count:number,color:string,spread=3,life=40) => {
    for (let i=0;i<count;i++) {
      const angle=(Math.PI*2*i)/count+Math.random()*0.5;
      const spd=0.5+Math.random()*spread;
      particlesRef.current.push({x,y,vx:Math.cos(angle)*spd,vy:Math.sin(angle)*spd,life,maxLife:life,color,size:2+Math.random()*3});
    }
  },[]);

  const initSparkles = useCallback(() => {
    sparklesRef.current = Array.from({length:8},()=>({
      angle:Math.random()*Math.PI*2, dist:8+Math.random()*14, speed:0.8+Math.random()*1.5,
      size:1.5+Math.random()*2.5, opacity:0.4+Math.random()*0.6, color:Math.random()>0.5?"#ff66ff":"#ffaaff",
    }));
  },[]);

  const initCyberpunkBg = useCallback((w:number,h:number) => {
    if (bgInitRef.current) return;
    bgInitRef.current = true;
    const buildings:Building[] = []; let cx=0;
    while (cx<w+60) {
      const bw=30+Math.random()*60; const bh=40+Math.random()*(h*0.45);
      const wc=Math.max(1,Math.floor(bw/12)); const wr=Math.max(1,Math.floor(bh/14));
      buildings.push({x:cx,w:bw,h:bh,windowRows:wr,windowCols:wc,hue:180+Math.random()*80,lit:Array.from({length:wc*wr},()=>Math.random()>0.45)});
      cx+=bw+2+Math.random()*8;
    }
    buildingsRef.current = buildings;
    rainRef.current = Array.from({length:80},()=>({x:Math.random()*w,y:Math.random()*h,speed:2+Math.random()*4,len:8+Math.random()*16,opacity:0.08+Math.random()*0.15}));
  },[]);

  // ═══════════════════════════════════════════
  //  FOOD PLACEMENT (now blockchain-verifiable)
  // ═══════════════════════════════════════════
  const placeFood = useCallback(() => {
    const snake = snakeRef.current;
    const newFood = gameSeed.getNextApple(gridColsRef.current, gridRowsRef.current, snake);
    foodRef.current = newFood;
    initSparkles();
  },[initSparkles, gameSeed]);

  const endGame = useCallback(() => {
    const newHi=Math.max(hiScoreRef.current,scoreRef.current);
    hiScoreRef.current=newHi; gameOverRef.current=true; gameRunningRef.current=false;
    setHiScore(newHi); setGameOver(true); setGameRunning(false);
    screenShakeRef.current=15;
    const theme=THEMES[themeRef.current];
    for (const [sx,sy] of snakeRef.current) spawnParticles(sx,sy,4,theme.primary,2,50);
    try{localStorage.setItem("snakeHiScore",newHi.toString());}catch{}
    if(intervalRef.current){clearInterval(intervalRef.current);intervalRef.current=null;}

    // Show mint panel if wallet connected
    if (address) {
      setShowMintPanel(true);
    }
  },[spawnParticles, gameSeed, address]);

  const tick = useCallback(() => {
    if(!gameRunningRef.current||gameOverRef.current) return;
    prevSnakeRef.current=snakeRef.current.map(s=>[...s]);
    prevDxRef.current=dxRef.current; prevDyRef.current=dyRef.current;
    lastTickTimeRef.current=performance.now();
    if(dirQueueRef.current.length>0){
      const next=dirQueueRef.current.shift()!;
      if(!(dxRef.current===-next.dx&&dyRef.current===-next.dy)&&!(dxRef.current===next.dx&&dyRef.current===next.dy)){
        dxRef.current=next.dx; dyRef.current=next.dy;
      }
    }
    const snake=snakeRef.current;
    const head=[snake[0][0]+dxRef.current,snake[0][1]+dyRef.current];
    if(head[0]<0||head[0]>=gridColsRef.current||head[1]<0||head[1]>=gridRowsRef.current){endGame();return;}
    const newSnake=[...snake]; const tail=newSnake.pop()!;
    if(newSnake.some(([sx,sy])=>sx===head[0]&&sy===head[1])){newSnake.push(tail);snakeRef.current=newSnake;endGame();return;}
    newSnake.unshift(head);
    const food=foodRef.current;
    if(head[0]===food[0]&&head[1]===food[1]){
      newSnake.push(tail); applesEatenRef.current+=1; scoreRef.current+=POINTS_PER_APPLE;
      eatFlashRef.current=12; setScore(scoreRef.current);
      spawnParticles(food[0],food[1],16,"#ff00ff",4,35); spawnParticles(food[0],food[1],8,"#ffaaff",2,25);
      placeFood();
      if(intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current=setInterval(tick,getCurrentSpeed());
    }
    snakeRef.current=newSnake;
  },[endGame,placeFood,spawnParticles,getCurrentSpeed]);

  const startGame = useCallback(async () => {
    // If wallet is connected, commit a seed on-chain first
    if (address && isCorrectNetwork) {
      setIsCommitting(true);
      try {
        await gameSeed.commitSeed();
      } catch (err) {
        console.error("Seed commit failed, playing without verification:", err);
      }
      setIsCommitting(false);
    }

    const cx=Math.floor(gridColsRef.current/2), cy=Math.floor(gridRowsRef.current/2);
    const init=[[cx,cy],[cx-1,cy],[cx-2,cy],[cx-3,cy]];
    snakeRef.current=init; prevSnakeRef.current=init.map(s=>[...s]);
    dxRef.current=1;dyRef.current=0;prevDxRef.current=1;prevDyRef.current=0;
    dirQueueRef.current=[];scoreRef.current=0;applesEatenRef.current=0;
    gameOverRef.current=false;gameRunningRef.current=true;
    particlesRef.current=[];screenShakeRef.current=0;lastTickTimeRef.current=performance.now();
    placeFood();
    setScore(0);setGameOver(false);setShowIntro(false);setShowPicker(false);setShowMintPanel(false);
    mint.resetMint();
    if(intervalRef.current) clearInterval(intervalRef.current);

    // Show "READY" overlay for 1.5s before game starts
    showReadyRef.current=true;readyStartTimeRef.current=performance.now();
    setShowReady(true);setGameRunning(false);gameRunningRef.current=false;
    setTimeout(()=>{
      showReadyRef.current=false;setShowReady(false);
      setGameRunning(true);gameRunningRef.current=true;
      lastTickTimeRef.current=performance.now();
      intervalRef.current=setInterval(tick,getCurrentSpeed());
    },1500);
  },[placeFood,tick,getCurrentSpeed,address,isCorrectNetwork,gameSeed,mint]);

  const changeDirection = useCallback((ndx:number,ndy:number) => {
    const last=dirQueueRef.current.length>0?dirQueueRef.current[dirQueueRef.current.length-1]:{dx:dxRef.current,dy:dyRef.current};
    if(last.dx===-ndx&&last.dy===-ndy) return;
    if(last.dx===ndx&&last.dy===ndy) return;
    if(dirQueueRef.current.length<3) dirQueueRef.current.push({dx:ndx,dy:ndy});
  },[]);

  useEffect(()=>{
    try{
      const s=localStorage.getItem("snakeHiScore");
      if(s){const v=parseInt(s);hiScoreRef.current=v;setHiScore(v);}
      const st=localStorage.getItem("snakeTheme");
      if(st){const idx=parseInt(st);if(idx>=0&&idx<THEMES.length){themeRef.current=idx;setThemeIndex(idx);}}
    }catch{}
    initSparkles();
  },[initSparkles]);

  useEffect(()=>{
    const h=(e:KeyboardEvent)=>{
      if(!gameRunningRef.current&&!gameOverRef.current&&showIntro){
        if(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","KeyW","KeyA","KeyS","KeyD","Space"].includes(e.code)){e.preventDefault();startGame();return;}
      }
      switch(e.code){
        case"ArrowUp":case"KeyW":e.preventDefault();changeDirection(0,-1);break;
        case"ArrowDown":case"KeyS":e.preventDefault();changeDirection(0,1);break;
        case"ArrowLeft":case"KeyA":e.preventDefault();changeDirection(-1,0);break;
        case"ArrowRight":case"KeyD":e.preventDefault();changeDirection(1,0);break;
      }
    };
    document.addEventListener("keydown",h);
    return()=>document.removeEventListener("keydown",h);
  },[changeDirection,startGame,showIntro]);

  // === RENDER LOOP (unchanged from original) ===
  useEffect(()=>{
    const canvas=canvasRef.current; if(!canvas) return;
    const ctx=canvas.getContext("2d")!; if(!ctx) return;

    const resizeCanvas=()=>{
      const container=canvas.parentElement; if(!container) return;
      const maxW=container.clientWidth,maxH=container.clientHeight;
      const dpr=Math.min(window.devicePixelRatio||1,2);
      const portrait=window.innerHeight>window.innerWidth;
      let w:number, h:number;
      if(portrait){
        // Portrait: fill width first, then check height
        w=maxW; h=maxW*(16/9);
        if(h>maxH){h=maxH;w=maxH*(9/16);}
      } else {
        // Landscape: fill width first with 16:9
        w=maxW; h=maxW*(9/16);
        if(h>maxH){h=maxH;w=maxH*(16/9);}
      }
      canvas.width=Math.floor(w*dpr); canvas.height=Math.floor(h*dpr);
      canvas.style.width=`${Math.floor(w)}px`; canvas.style.height=`${Math.floor(h)}px`;
      ctx.setTransform(dpr,0,0,dpr,0,0); bgInitRef.current=false;
    };
    resizeCanvas(); window.addEventListener("resize",resizeCanvas);

    const lerp=(a:number,b:number,t:number)=>a+(b-a)*t;
    const drawRR=(c:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,r:number)=>{
      c.beginPath();c.moveTo(x+r,y);c.lineTo(x+w-r,y);c.quadraticCurveTo(x+w,y,x+w,y+r);
      c.lineTo(x+w,y+h-r);c.quadraticCurveTo(x+w,y+h,x+w-r,y+h);c.lineTo(x+r,y+h);
      c.quadraticCurveTo(x,y+h,x,y+h-r);c.lineTo(x,y+r);c.quadraticCurveTo(x,y,x+r,y);c.closePath();
    };

    const draw=(now:number)=>{
      const dpr=Math.min(window.devicePixelRatio||1,2);
      const w=canvas.width/dpr, h=canvas.height/dpr;
      if(w===0||h===0) return;
      const GRID_COLS=gridColsRef.current, GRID_ROWS=gridRowsRef.current;
      const dt=now-(timeRef.current||now); timeRef.current=now;
      const tileW=w/GRID_COLS, tileH=h/GRID_ROWS;
      const snake=snakeRef.current, prevSnake=prevSnakeRef.current, food=foodRef.current;
      const isOver=gameOverRef.current, isRunning=gameRunningRef.current;
      const curHi=hiScoreRef.current;
      const theme=THEMES[themeRef.current];
      const speed=getCurrentSpeed();
      const elapsed=now-lastTickTimeRef.current;
      const t=isRunning&&!isOver?Math.min(elapsed/speed,1):1;

      foodPulseRef.current+=dt*0.004;
      if(screenShakeRef.current>0) screenShakeRef.current*=0.88;
      if(screenShakeRef.current<0.3) screenShakeRef.current=0;
      if(eatFlashRef.current>0) eatFlashRef.current-=1;
      particlesRef.current=particlesRef.current.filter(p=>{p.x+=p.vx*(dt/16);p.y+=p.vy*(dt/16);p.vx*=0.96;p.vy*=0.96;p.life-=1;return p.life>0;});
      sparklesRef.current.forEach(s=>{s.angle+=s.speed*0.03;s.opacity=0.3+0.5*Math.sin(now*0.005+s.angle*2);});
      initCyberpunkBg(w,h);
      for(const drop of rainRef.current){drop.y+=drop.speed*(dt/16);if(drop.y>h){drop.y=-drop.len;drop.x=Math.random()*w;}}

      ctx.save();
      if(screenShakeRef.current>0.5) ctx.translate((Math.random()-0.5)*screenShakeRef.current*2,(Math.random()-0.5)*screenShakeRef.current*2);

      // BG
      const bg=ctx.createLinearGradient(0,0,0,h);
      bg.addColorStop(0,"#020812");bg.addColorStop(0.3,"#0a0520");bg.addColorStop(0.6,"#100828");bg.addColorStop(1,"#060414");
      ctx.fillStyle=bg; ctx.fillRect(-10,-10,w+20,h+20);

      // Horizon glow
      const hY=h*0.75;
      const hG=ctx.createRadialGradient(w/2,hY,0,w/2,hY,w*0.6);
      hG.addColorStop(0,"rgba(120,30,180,0.06)");hG.addColorStop(0.5,"rgba(60,10,120,0.03)");hG.addColorStop(1,"rgba(0,0,0,0)");
      ctx.fillStyle=hG;ctx.fillRect(0,0,w,h);

      // Buildings
      ctx.save();ctx.globalAlpha=0.16;
      for(const b of buildingsRef.current){
        const by=h-b.h;
        const bG=ctx.createLinearGradient(b.x,by,b.x,h);
        bG.addColorStop(0,`hsla(${b.hue},40%,8%,1)`);bG.addColorStop(1,`hsla(${b.hue},30%,4%,1)`);
        ctx.fillStyle=bG;ctx.fillRect(b.x,by,b.w,b.h);
        ctx.strokeStyle=`hsla(${b.hue},70%,40%,0.35)`;ctx.lineWidth=1;
        ctx.beginPath();ctx.moveTo(b.x,by);ctx.lineTo(b.x+b.w,by);ctx.stroke();
        const winW=(b.w-6)/b.windowCols, winH=(b.h-10)/b.windowRows;
        for(let row=0;row<b.windowRows;row++) for(let col=0;col<b.windowCols;col++){
          const idx=row*b.windowCols+col;
          if(b.lit[idx]){
            const flk=Math.sin(now*0.001+idx*1.7)>-0.3?1:0.3;
            ctx.fillStyle=`hsla(${40+(idx%20)},80%,70%,${0.6*flk})`;
            ctx.fillRect(b.x+3+col*winW+1,by+5+row*winH+1,winW-2,winH-2);
          }
        }
      }
      ctx.restore();

      // Scanlines
      ctx.save();ctx.globalAlpha=0.025;
      for(let sy=0;sy<h;sy+=3){ctx.fillStyle="#000";ctx.fillRect(0,sy,w,1);}
      ctx.restore();

      // Rain
      ctx.save();
      for(const drop of rainRef.current){
        ctx.strokeStyle=`rgba(100,140,255,${drop.opacity})`;ctx.lineWidth=0.5;
        ctx.beginPath();ctx.moveTo(drop.x,drop.y);ctx.lineTo(drop.x-0.5,drop.y+drop.len);ctx.stroke();
      }
      ctx.restore();

      // Grid
      ctx.strokeStyle=`rgba(${theme.trailRgb},0.03)`;ctx.lineWidth=0.5;
      for(let i=0;i<=GRID_COLS;i++){ctx.beginPath();ctx.moveTo(i*tileW,0);ctx.lineTo(i*tileW,h);ctx.stroke();}
      for(let i=0;i<=GRID_ROWS;i++){ctx.beginPath();ctx.moveTo(0,i*tileH);ctx.lineTo(w,i*tileH);ctx.stroke();}

      // Border
      const brd=ctx.createLinearGradient(0,0,w,0);
      brd.addColorStop(0,`rgba(${theme.trailRgb},0.12)`);brd.addColorStop(0.5,"rgba(100,60,255,0.08)");brd.addColorStop(1,"rgba(255,0,255,0.12)");
      ctx.strokeStyle=brd;ctx.lineWidth=1.5;ctx.strokeRect(1,1,w-2,h-2);

      // Moving scan beam
      ctx.save();ctx.globalAlpha=0.015;ctx.fillStyle=`rgba(${theme.trailRgb},1)`;
      const scanOff=(now*0.03)%h;
      ctx.fillRect(0,scanOff-2,w,2);ctx.fillRect(0,(scanOff+h*0.5)%h-2,w,2);
      ctx.restore();

      // === FOOD ===
      const fp=Math.sin(foodPulseRef.current)*0.15+1;
      const fx=food[0]*tileW+tileW/2, fy=food[1]*tileH+tileH/2;
      const fr=(Math.min(tileW,tileH)/2-1)*fp;

      const fGlow=ctx.createRadialGradient(fx,fy,0,fx,fy,fr*3);
      fGlow.addColorStop(0,"rgba(255,0,255,0.25)");fGlow.addColorStop(0.5,"rgba(255,0,255,0.08)");fGlow.addColorStop(1,"rgba(255,0,255,0)");
      ctx.fillStyle=fGlow;ctx.fillRect(fx-fr*3,fy-fr*3,fr*6,fr*6);

      for(const s of sparklesRef.current){
        const sx=fx+Math.cos(s.angle)*s.dist, sy=fy+Math.sin(s.angle)*s.dist;
        ctx.save();ctx.globalAlpha=s.opacity;ctx.strokeStyle=s.color;ctx.lineWidth=1;ctx.shadowBlur=6;ctx.shadowColor=s.color;
        ctx.beginPath();
        for(let i=0;i<4;i++){const a=(Math.PI/2)*i+now*0.003;ctx.moveTo(sx,sy);ctx.lineTo(sx+Math.cos(a)*s.size,sy+Math.sin(a)*s.size);}
        ctx.stroke();
        ctx.fillStyle=s.color;ctx.beginPath();ctx.arc(sx,sy,s.size*0.5,0,Math.PI*2);ctx.fill();
        ctx.restore();
      }

      ctx.save();ctx.shadowBlur=18;ctx.shadowColor="#ff00ff";
      const fG=ctx.createRadialGradient(fx-fr*0.3,fy-fr*0.3,0,fx,fy,fr);
      fG.addColorStop(0,"#ff88ff");fG.addColorStop(0.6,"#ff00ff");fG.addColorStop(1,"#cc00cc");
      ctx.fillStyle=fG;ctx.beginPath();ctx.arc(fx,fy,fr,0,Math.PI*2);ctx.fill();
      ctx.shadowBlur=0;ctx.fillStyle="rgba(255,255,255,0.4)";
      ctx.beginPath();ctx.arc(fx-fr*0.25,fy-fr*0.3,fr*0.35,0,Math.PI*2);ctx.fill();
      ctx.restore();

      // === SNAKE ===
      if(snake.length>0){
        const iSnake:{x:number;y:number}[]=[];
        for(let i=0;i<snake.length;i++){
          if(i<prevSnake.length){
            let px=prevSnake[i][0],py=prevSnake[i][1];
            const cx=snake[i][0],cy=snake[i][1];
            if(Math.abs(cx-px)>2) px=cx; if(Math.abs(cy-py)>2) py=cy;
            iSnake.push({x:lerp(px,cx,t)*tileW+tileW/2,y:lerp(py,cy,t)*tileH+tileH/2});
          } else {
            iSnake.push({x:snake[i][0]*tileW+tileW/2,y:snake[i][1]*tileH+tileH/2});
          }
        }
        const segW=tileW*0.82, segH=tileH*0.82;

        // Trail
        ctx.save();ctx.globalAlpha=0.12;
        for(let i=iSnake.length-1;i>=0;i--){
          const p=iSnake[i]; const alpha=0.05+0.1*(1-i/iSnake.length);
          const tg=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,tileW);
          tg.addColorStop(0,`rgba(${theme.trailRgb},${alpha})`);tg.addColorStop(1,`rgba(${theme.trailRgb},0)`);
          ctx.fillStyle=tg;ctx.fillRect(p.x-tileW,p.y-tileH,tileW*2,tileH*2);
        }
        ctx.restore();

        // Body
        ctx.save();ctx.shadowBlur=14;ctx.shadowColor=theme.glow;
        for(let i=iSnake.length-1;i>=0;i--){
          const p=iSnake[i];
          const ratio=1-i/Math.max(iSnake.length-1,1);
          const brt=0.7+0.3*ratio;
          const sr=Math.round(lerp(theme.tailR,theme.headR,ratio)*brt);
          const sg=Math.round(lerp(theme.tailG,theme.headG,ratio)*brt);
          const sb=Math.round(lerp(theme.tailB,theme.headB,ratio)*brt);
          const sr2=Math.round(lerp(theme.tailR*0.5,theme.headR*0.7,ratio)*brt);
          const sg2=Math.round(lerp(theme.tailG*0.5,theme.headG*0.7,ratio)*brt);
          const sb2=Math.round(lerp(theme.tailB*0.5,theme.headB*0.7,ratio)*brt);

          // Connectors
          if(i<iSnake.length-1){
            const next=iSnake[i+1];
            const mx=(p.x+next.x)/2,my=(p.y+next.y)/2;
            ctx.shadowBlur=8;ctx.fillStyle=`rgb(${sr2},${sg2},${sb2})`;
            const ddx=next.x-p.x,ddy=next.y-p.y;
            if(Math.abs(ddx)>Math.abs(ddy)){
              ctx.fillRect(Math.min(p.x,next.x)-segW*0.05,my-segH/2,Math.abs(ddx)+segW*0.1,segH);
            } else {
              ctx.fillRect(mx-segW/2,Math.min(p.y,next.y)-segH*0.05,segW,Math.abs(ddy)+segH*0.1);
            }
          }

          ctx.shadowBlur=i===0?18:10;ctx.shadowColor=i===0?theme.headGlow:theme.glow;
          const sG=ctx.createRadialGradient(p.x-segW*0.15,p.y-segH*0.15,0,p.x,p.y,segW*0.7);
          sG.addColorStop(0,`rgb(${sr},${sg},${sb})`);sG.addColorStop(1,`rgb(${sr2},${sg2},${sb2})`);
          ctx.fillStyle=sG;
          const r=Math.min(segW,segH)*0.3;
          drawRR(ctx,p.x-segW/2,p.y-segH/2,segW,segH,r);ctx.fill();
          ctx.shadowBlur=0;ctx.fillStyle=`rgba(255,255,255,${0.06+0.12*ratio})`;
          drawRR(ctx,p.x-segW*0.35,p.y-segH*0.38,segW*0.5,segH*0.3,r*0.8);ctx.fill();
        }

        // Eyes
        if(iSnake.length>0){
          const hd=iSnake[0]; const eyeR=Math.min(tileW,tileH)*0.1;
          const edx=dxRef.current,edy=dyRef.current;
          let e1x:number,e1y:number,e2x:number,e2y:number;
          const eOff=segW*0.22,eFwd=segH*0.12;
          if(edx===1){e1x=hd.x+eFwd;e1y=hd.y-eOff;e2x=hd.x+eFwd;e2y=hd.y+eOff;}
          else if(edx===-1){e1x=hd.x-eFwd;e1y=hd.y-eOff;e2x=hd.x-eFwd;e2y=hd.y+eOff;}
          else if(edy===-1){e1x=hd.x-eOff;e1y=hd.y-eFwd;e2x=hd.x+eOff;e2y=hd.y-eFwd;}
          else{e1x=hd.x-eOff;e1y=hd.y+eFwd;e2x=hd.x+eOff;e2y=hd.y+eFwd;}
          ctx.shadowBlur=4;ctx.shadowColor="#fff";ctx.fillStyle="#fff";
          ctx.beginPath();ctx.arc(e1x,e1y,eyeR,0,Math.PI*2);ctx.fill();
          ctx.beginPath();ctx.arc(e2x,e2y,eyeR,0,Math.PI*2);ctx.fill();
          ctx.shadowBlur=0;ctx.fillStyle="#001100";
          const po=eyeR*0.25;
          ctx.beginPath();ctx.arc(e1x+edx*po,e1y+edy*po,eyeR*0.55,0,Math.PI*2);ctx.fill();
          ctx.beginPath();ctx.arc(e2x+edx*po,e2y+edy*po,eyeR*0.55,0,Math.PI*2);ctx.fill();
        }
        ctx.restore();
      }

      // Particles
      ctx.save();
      for(const p of particlesRef.current){
        const alpha=p.life/p.maxLife;ctx.globalAlpha=alpha;ctx.shadowBlur=8;ctx.shadowColor=p.color;ctx.fillStyle=p.color;
        ctx.beginPath();ctx.arc(p.x*tileW+tileW/2,p.y*tileH+tileH/2,p.size*alpha,0,Math.PI*2);ctx.fill();
      }
      ctx.restore();

      // Eat flash
      if(eatFlashRef.current>0){ctx.save();ctx.globalAlpha=eatFlashRef.current/15;ctx.fillStyle=`rgba(${theme.flashRgb},0.08)`;ctx.fillRect(0,0,w,h);ctx.restore();}

      // NFT capture: snapshot the canvas NOW (before game-over overlay)
      if(nftCaptureRef.current && isOver){
        nftCaptureRef.current=false;
        if(nftCaptureResolveRef.current){
          canvas.toBlob((b)=>{
            if(b && nftCaptureResolveRef.current){
              nftCaptureResolveRef.current(b);
              nftCaptureResolveRef.current=null;
            }
          },"image/png");
        }
      }

      // Game Over overlay (skipped during NFT capture so the NFT is clean)
      if(isOver && !nftCaptureRef.current){
        const fadeIn=Math.min(1,(now-lastTickTimeRef.current)/600);
        ctx.save();ctx.globalAlpha=fadeIn*0.85;ctx.fillStyle="#000";ctx.fillRect(0,0,w,h);ctx.restore();
        ctx.save();ctx.globalAlpha=fadeIn;
        const fs=Math.min(tileW,tileH);
        ctx.shadowColor="#ff0044";ctx.shadowBlur=40;ctx.fillStyle="#fff";
        ctx.font=`bold ${fs*2}px 'Courier New',monospace`;ctx.textAlign="center";ctx.textBaseline="middle";
        ctx.fillText("GAME OVER",w/2,h/2-fs*0.8);
        ctx.shadowBlur=0;ctx.font=`bold ${fs}px 'Courier New',monospace`;
        ctx.fillStyle=theme.primary;ctx.fillText(`Score: ${scoreRef.current}`,w/2,h/2+fs*0.5);
        ctx.fillStyle="#ffcc00";ctx.fillText(`Best: ${curHi}`,w/2,h/2+fs*1.5);
        ctx.font=`${fs*0.55}px 'Courier New',monospace`;
        ctx.fillStyle=`rgba(255,255,255,${0.4+0.3*Math.sin(now*0.004)})`;
        ctx.fillText(address ? "Mint your score as NFT ↗" : "Press START to play again",w/2,h/2+fs*2.6);
        ctx.restore();
      }

      // Ready overlay
      if(showReadyRef.current){
        const elapsed=now-readyStartTimeRef.current;
        const fadeIn=Math.min(1,elapsed/300);
        const pulse=0.8+0.2*Math.sin(elapsed*0.008);
        ctx.save();ctx.globalAlpha=fadeIn*0.6;ctx.fillStyle="#000";ctx.fillRect(0,0,w,h);ctx.restore();
        ctx.save();ctx.globalAlpha=fadeIn*pulse;
        const fs=Math.min(tileW,tileH);
        ctx.shadowColor=theme.primary;ctx.shadowBlur=60;ctx.fillStyle=theme.primary;
        ctx.font=`bold ${fs*3}px 'Courier New',monospace`;ctx.textAlign="center";ctx.textBaseline="middle";
        ctx.fillText("READY",w/2,h/2);
        ctx.restore();
      }

      // Intro
      if(!isRunning&&!isOver&&!showReadyRef.current){
        ctx.save();ctx.fillStyle="rgba(0,0,0,0.45)";ctx.fillRect(0,0,w,h);
        const fs=Math.min(tileW,tileH);
        ctx.shadowColor=theme.primary;ctx.shadowBlur=50;ctx.fillStyle=theme.primary;
        ctx.font=`bold ${fs*2.5}px 'Courier New',monospace`;ctx.textAlign="center";ctx.textBaseline="middle";
        ctx.fillText("NEON SNAKE",w/2,h/2-fs);
        ctx.shadowBlur=0;ctx.font=`${fs*0.6}px 'Courier New',monospace`;
        ctx.fillStyle=`rgba(255,255,255,${0.5+0.4*Math.sin(now*0.003)})`;
        ctx.fillText("Press any key or tap START",w/2,h/2+fs*0.6);
        if(curHi>0){ctx.fillStyle="#ffcc00";ctx.font=`bold ${fs*0.7}px 'Courier New',monospace`;ctx.fillText(`Best: ${curHi}`,w/2,h/2+fs*1.8);}
        ctx.restore();
      }

      ctx.restore();
    };

    const renderLoop=(now:number)=>{draw(now);rafRef.current=requestAnimationFrame(renderLoop);};
    rafRef.current=requestAnimationFrame(renderLoop);
    return()=>{cancelAnimationFrame(rafRef.current);window.removeEventListener("resize",resizeCanvas);};
  },[getCurrentSpeed,initCyberpunkBg]);

  useEffect(()=>{return()=>{if(intervalRef.current) clearInterval(intervalRef.current);};},[]);

  const handleTouchStart = useCallback((e:React.TouchEvent)=>{
    if(!gameRunningRef.current&&!gameOverRef.current){startGame();return;}
    const touch=e.touches[0]; const sx=touch.clientX,sy=touch.clientY;
    const handleEnd=(endE:TouchEvent)=>{
      const ex=endE.changedTouches[0].clientX,ey=endE.changedTouches[0].clientY;
      const dx=ex-sx,dy=ey-sy;
      if(Math.abs(dx)<10&&Math.abs(dy)<10) return;
      if(Math.abs(dx)>Math.abs(dy)) changeDirection(dx>0?1:-1,0);
      else changeDirection(0,dy>0?1:-1);
    };
    canvasRef.current?.addEventListener("touchend",handleEnd,{once:true});
  },[changeDirection,startGame]);

  const selectTheme=(idx:number)=>{
    themeRef.current=idx;setThemeIndex(idx);setShowPicker(false);
    try{localStorage.setItem("snakeTheme",idx.toString());}catch{}
  };

  // ═══════════════════════════════════════════
  //  MINT HANDLER
  // ═══════════════════════════════════════════
  const handleMint = useCallback(() => {
    // Wait for one clean render frame (no game-over overlay) before capturing
    nftCaptureRef.current = true;
    new Promise<Blob>((resolve) => {
      nftCaptureResolveRef.current = resolve;
    }).then((blob) => {
      mint.mintSnakeNFT({
        imageBlob: blob,
        score: scoreRef.current,
        snakeLength: snakeRef.current.length,
        applesEaten: applesEatenRef.current,
        theme: THEMES[themeRef.current].name,
        seed: gameSeed.seed,
      });
    });
  }, [mint, gameSeed.seed]);

  // Hide the shared Header so it doesn't block game controls
  useEffect(() => {
    const header = document.querySelector('[data-shared-header]')
    if (header) (header as HTMLElement).style.display = 'none'
    return () => { if (header) (header as HTMLElement).style.display = '' }
  }, [])

  const ct=THEMES[themeIndex];
  const shortAddr = address
    ? `${address.slice(0,6)}...${address.slice(-4)}`
    : null;

  return (
    <div className={`h-screen bg-black flex flex-col items-center ${isMobile ? "p-1.5" : "p-3"} relative overflow-hidden select-none`}>
      {/* Background particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {Array.from({length:30}).map((_,i)=>(
          <div key={i} className="absolute rounded-full animate-pulse" style={{
            width:`${1+(i%3)}px`,height:`${1+(i%3)}px`,
            background:i%2===0?`rgba(${ct.trailRgb},0.2)`:"rgba(255,0,255,0.15)",
            left:`${(i*137.5)%100}%`,top:`${(i*251.3)%100}%`,
            animationDelay:`${i*0.15}s`,animationDuration:`${3+(i%4)}s`,
          }}/>
        ))}
      </div>

      <div className="relative z-10 flex flex-col items-center w-full h-full">
        {/* ═══ TOP BAR ═══ */}
        <div className={`flex items-center w-full max-w-7xl mb-2 flex-shrink-0 ${isMobile ? "flex-col gap-1.5" : "justify-between"}`}>
          <div className={`flex items-center ${isMobile ? "justify-between w-full" : ""}`}>
            <div className="flex items-center gap-3">
              <Link href="/" className={`${isMobile ? "text-xs px-2 py-1" : "text-sm px-3 py-1.5"} font-bold rounded-lg transition-all duration-200 border hover:opacity-80`}
                style={{fontFamily:"'Courier New',monospace",background:"rgba(120,60,255,0.08)",color:"#a78bfa",borderColor:"rgba(120,60,255,0.2)",textShadow:`0 0 10px ${ct.glow}60`}}>
                HOME
              </Link>
              <h1 className={`${isMobile ? "text-lg" : "text-2xl md:text-3xl"} font-bold tracking-widest`} style={{
                fontFamily:"'Courier New',monospace",color:ct.primary,
                textShadow:`0 0 20px ${ct.glow}80,0 0 40px ${ct.glow}40`,
              }}>NEON SNAKE</h1>
            </div>

            {isMobile && (
              <div className="flex gap-1.5 items-center">
                {!address ? (
                  <button onClick={connect} disabled={isConnecting}
                    className="flex items-center gap-1 px-2 py-1.5 font-bold rounded-lg transition-all duration-200 text-xs border hover:border-purple-500/40"
                    style={{fontFamily:"'Courier New',monospace",background:"rgba(120,60,255,0.08)",color:"#a78bfa",borderColor:"#ffffff15"}}>
                    <Wallet className="w-3 h-3"/>
                    {isConnecting ? "..." : "CONNECT"}
                  </button>
                ) : (
                  <div className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs border"
                    style={{fontFamily:"'Courier New',monospace",background:"rgba(120,60,255,0.08)",color:"#a78bfa",borderColor:"rgba(120,60,255,0.2)"}}>
                    <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"/>
                    <span>{shortAddr}</span>
                    {!isCorrectNetwork && (
                      <button onClick={switchToBase} className="ml-1 text-yellow-400 hover:text-yellow-300 text-[10px] underline">Switch</button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className={`${isMobile ? "text-xs" : "text-base md:text-lg"} font-bold tracking-wide`} style={{fontFamily:"'Courier New',monospace"}}>
            <span className="text-white/60">SCORE </span>
            <span style={{color:ct.primary,textShadow:`0 0 10px ${ct.glow}80`}}>{score}</span>
            <span className="text-white/30 mx-3">│</span>
            <span className="text-white/60">BEST </span>
            <span style={{color:"#ffcc00",textShadow:"0 0 10px rgba(255,204,0,0.4)"}}>{hiScore}</span>
            {applesEatenRef.current>0&&(
              <><span className="text-white/30 mx-3">│</span>
              <span className="text-white/40 text-sm">
                <Zap className="w-3 h-3 inline-block mb-0.5" style={{color:"#ff6600"}}/>{" "}{getCurrentSpeed()}ms
              </span></>
            )}
            {/* Verification badge */}
            {gameRunning && gameSeed.committed && (
              <><span className="text-white/30 mx-3">│</span>
              <span className="text-green-400/70 text-sm" title="Apple positions are committed on-chain">
                <Shield className="w-3 h-3 inline-block mb-0.5"/> Verified
              </span></>
            )}
          </div>

          {!isMobile && (
          <div className="flex gap-2 items-center">
            {/* Wallet Button */}
            {!address ? (
              <button onClick={connect} disabled={isConnecting}
                className="flex items-center gap-1.5 px-3 py-2 font-bold rounded-lg transition-all duration-200 text-sm border hover:border-purple-500/40"
                style={{fontFamily:"'Courier New',monospace",background:"rgba(120,60,255,0.08)",color:"#a78bfa",borderColor:"#ffffff15"}}>
                <Wallet className="w-3.5 h-3.5"/>
                {isConnecting ? "..." : "CONNECT"}
              </button>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border"
                style={{fontFamily:"'Courier New',monospace",background:"rgba(120,60,255,0.08)",color:"#a78bfa",borderColor:"rgba(120,60,255,0.2)"}}>
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"/>
                <span>{shortAddr}</span>
                {!isCorrectNetwork && (
                  <button onClick={switchToBase}
                    className="ml-1 text-yellow-400 hover:text-yellow-300 text-xs underline">
                    Switch Chain
                  </button>
                )}
              </div>
            )}

            {/* Theme Picker */}
            <div className="relative">
              <button onClick={()=>setShowPicker(!showPicker)}
                className="flex items-center gap-1.5 px-3 py-2 font-bold rounded-lg transition-all duration-200 text-sm border"
                style={{fontFamily:"'Courier New',monospace",background:"transparent",color:"#ffffff60",borderColor:"#ffffff15"}}>
                <div className="w-3 h-3 rounded-full" style={{background:ct.swatch,boxShadow:`0 0 8px ${ct.swatch}80`}}/>
                <Palette className="w-3.5 h-3.5"/>
              </button>
              {showPicker&&(
                <div className="absolute top-full right-0 mt-1 p-2 rounded-lg flex gap-2 z-50" style={{
                  background:"rgba(10,5,30,0.95)",border:"1px solid rgba(255,255,255,0.1)",
                  boxShadow:"0 8px 32px rgba(0,0,0,0.8)"}}>
                  {THEMES.map((th,idx)=>(
                    <button key={th.name} onClick={()=>selectTheme(idx)}
                      className="flex flex-col items-center gap-1 p-2 rounded-md transition-all duration-150 hover:scale-110"
                      style={{background:idx===themeIndex?"rgba(255,255,255,0.08)":"transparent",
                        border:idx===themeIndex?`1px solid ${th.swatch}40`:"1px solid transparent"}}>
                      <div className="w-5 h-5 rounded-full" style={{background:th.swatch,boxShadow:`0 0 12px ${th.swatch}80`}}/>
                      <span className="text-white/50 text-[9px] whitespace-nowrap" style={{fontFamily:"'Courier New',monospace"}}>{th.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button onClick={startGame} disabled={isCommitting}
              className="flex items-center gap-2 px-5 py-2 font-bold rounded-lg transition-all duration-200 transform hover:scale-105 text-sm tracking-wider"
              style={{fontFamily:"'Courier New',monospace",
                background: isCommitting ? "rgba(100,100,100,0.4)" : `linear-gradient(135deg,${ct.secondary},${ct.primary})`,
                color: isCommitting ? "#999" : "#000",boxShadow: isCommitting ? "none" : `0 0 20px ${ct.glow}50`}}>
              {isCommitting ? (
                <><Loader2 className="w-4 h-4 animate-spin"/> COMMITTING...</>
              ) : (
                <><Play className="w-4 h-4"/> {gameOver?"RETRY":gameRunning?"RESTART":"START"}</>
              )}
            </button>
            {gameOver&&(
              <button onClick={()=>{gameRunningRef.current=false;gameOverRef.current=false;setGameRunning(false);setGameOver(false);setShowIntro(true);setShowMintPanel(false);}}
                className="flex items-center gap-2 px-4 py-2 font-bold rounded-lg transition-all duration-200 transform hover:scale-105 text-sm tracking-wider border"
                style={{fontFamily:"'Courier New',monospace",background:"transparent",color:"#ffffff80",borderColor:"#ffffff20"}}>
                <RotateCcw className="w-4 h-4"/> MENU
              </button>
            )}
          </div>
          )}
        </div>

        {/* ═══ GAME CANVAS ═══ */}
        <div className="flex-1 w-full max-w-7xl flex items-center justify-center min-h-0 relative">
          <canvas ref={canvasRef}
            className="max-w-full max-h-full rounded-xl cursor-pointer touch-none"
            style={{border:`1px solid ${ct.glow}25`,boxShadow:`0 0 40px ${ct.glow}08,inset 0 0 60px rgba(0,0,0,0.5)`}}
            onTouchStart={handleTouchStart}/>

          {/* ═══ MINT NFT PANEL (overlay on game over) ═══ */}
          {showMintPanel && gameOver && address && (
            <div className={`absolute ${isMobile ? "bottom-2 left-2 right-2" : "bottom-4 left-1/2 -translate-x-1/2"} z-20`}
              style={{fontFamily:"'Courier New',monospace"}}>
              <div className={`rounded-xl ${isMobile ? "px-4 py-3" : "px-6 py-4"} flex flex-col items-center gap-3`}
                style={{
                  background:"rgba(10,5,30,0.92)",
                  border:"1px solid rgba(120,60,255,0.3)",
                  boxShadow:"0 8px 40px rgba(120,60,255,0.15), 0 0 80px rgba(120,60,255,0.05)",
                  backdropFilter:"blur(12px)",
                  minWidth: isMobile ? undefined : 320,
                }}>

                {/* Pre-mint state */}
                {!mint.txHash && !mint.isMinting && !mint.isUploading && !mint.error && (
                  <>
                    <div className="flex items-center gap-2 text-white/90 text-sm font-bold tracking-wider">
                      <ImageIcon className="w-4 h-4 text-purple-400"/>
                      MINT YOUR SCORE AS NFT
                    </div>
                    <div className="text-white/50 text-xs text-center">
                      Score: {score} · Length: {snakeRef.current.length} · Theme: {THEMES[themeRef.current].label}
                      {gameSeed.committed && <span className="text-green-400 ml-2">✓ Verified</span>}
                    </div>
                    <button onClick={handleMint}
                      className="flex items-center gap-2 px-6 py-2.5 font-bold rounded-lg text-sm tracking-wider transition-all hover:scale-105"
                      style={{background:"linear-gradient(135deg,#7c3aed,#a855f7)",color:"#fff",
                        boxShadow:"0 0 20px rgba(168,85,247,0.4)"}}>
                      <ImageIcon className="w-4 h-4"/> MINT (~$0.50 + gas)
                    </button>
                    <button onClick={()=>setShowMintPanel(false)}
                      className="text-white/30 hover:text-white/50 text-xs mt-1 transition-colors">
                      skip
                    </button>
                  </>
                )}

                {/* Uploading to IPFS */}
                {mint.isUploading && (
                  <div className="flex items-center gap-3 text-purple-300 text-sm py-2">
                    <Loader2 className="w-5 h-5 animate-spin"/>
                    <span>Uploading to IPFS via Pinata...</span>
                  </div>
                )}

                {/* Minting on chain */}
                {mint.isMinting && (
                  <div className="flex items-center gap-3 text-purple-300 text-sm py-2">
                    <Loader2 className="w-5 h-5 animate-spin"/>
                    <span>Minting on Base... confirm in wallet</span>
                  </div>
                )}

                {/* Success */}
                {mint.txHash && (
                  <div className="flex flex-col items-center gap-2 py-1">
                    <div className="flex items-center gap-2 text-green-400 text-sm font-bold">
                      <CheckCircle2 className="w-5 h-5"/> MINTED!
                      {mint.tokenId && <span className="text-white/60 font-normal">Token #{mint.tokenId}</span>}
                    </div>
                    <a href={`${CHAIN_CONFIG[TARGET_CHAIN_ID]?.blockExplorerUrls[0] || 'https://sepolia.basescan.org'}/tx/${mint.txHash}`}
                      target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 text-purple-400 hover:text-purple-300 text-xs transition-colors">
                      View on BaseScan <ExternalLink className="w-3 h-3"/>
                    </a>
                  </div>
                )}

                {/* Error */}
                {mint.error && (
                  <div className="flex flex-col items-center gap-2 py-1">
                    <div className="text-red-400 text-xs text-center max-w-xs">{mint.error}</div>
                    <button onClick={handleMint}
                      className="text-purple-400 hover:text-purple-300 text-xs underline">
                      Try again
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ═══ BOTTOM BAR ═══ */}
        {isMobile ? (
          <div className="flex flex-col items-center gap-2 mt-2 flex-shrink-0 w-full" style={{fontFamily:"'Courier New',monospace"}}>
            {/* Mobile action buttons */}
            <div className="flex gap-2 items-center">
              <button onClick={()=>setShowPicker(!showPicker)} className="relative flex items-center gap-1 px-2.5 py-1.5 font-bold rounded-lg text-xs border"
                style={{background:"transparent",color:"#ffffff60",borderColor:"#ffffff15"}}>
                <div className="w-2.5 h-2.5 rounded-full" style={{background:ct.swatch,boxShadow:`0 0 6px ${ct.swatch}80`}}/>
                <Palette className="w-3 h-3"/>
              </button>
              {showPicker&&(
                <div className="absolute bottom-16 left-1/2 -translate-x-1/2 p-2 rounded-lg flex gap-2 z-50" style={{
                  background:"rgba(10,5,30,0.95)",border:"1px solid rgba(255,255,255,0.1)",
                  boxShadow:"0 8px 32px rgba(0,0,0,0.8)"}}>
                  {THEMES.map((th,idx)=>(
                    <button key={th.name} onClick={()=>selectTheme(idx)}
                      className="flex flex-col items-center gap-1 p-1.5 rounded-md transition-all duration-150"
                      style={{background:idx===themeIndex?"rgba(255,255,255,0.08)":"transparent",
                        border:idx===themeIndex?`1px solid ${th.swatch}40`:"1px solid transparent"}}>
                      <div className="w-4 h-4 rounded-full" style={{background:th.swatch,boxShadow:`0 0 10px ${th.swatch}80`}}/>
                    </button>
                  ))}
                </div>
              )}
              <button onClick={startGame} disabled={isCommitting}
                className="flex items-center gap-1.5 px-4 py-1.5 font-bold rounded-lg text-xs tracking-wider"
                style={{fontFamily:"'Courier New',monospace",
                  background: isCommitting ? "rgba(100,100,100,0.4)" : `linear-gradient(135deg,${ct.secondary},${ct.primary})`,
                  color: isCommitting ? "#999" : "#000",boxShadow: isCommitting ? "none" : `0 0 15px ${ct.glow}50`}}>
                {isCommitting ? (
                  <><Loader2 className="w-3 h-3 animate-spin"/> WAIT...</>
                ) : (
                  <><Play className="w-3 h-3"/> {gameOver?"RETRY":gameRunning?"RESTART":"START"}</>
                )}
              </button>
              {gameOver&&(
                <button onClick={()=>{gameRunningRef.current=false;gameOverRef.current=false;setGameRunning(false);setGameOver(false);setShowIntro(true);setShowMintPanel(false);}}
                  className="flex items-center gap-1 px-3 py-1.5 font-bold rounded-lg text-xs tracking-wider border"
                  style={{fontFamily:"'Courier New',monospace",background:"transparent",color:"#ffffff80",borderColor:"#ffffff20"}}>
                  <RotateCcw className="w-3 h-3"/> MENU
                </button>
              )}
            </div>
            <div className="text-white/30 text-[10px]">Swipe to control · Tap canvas to start</div>
          </div>
        ) : (
          <div className="flex gap-8 mt-2 flex-shrink-0 text-center" style={{fontFamily:"'Courier New',monospace"}}>
            <div><span className="text-xs font-bold" style={{color:`${ct.primary}80`}}>↑↓←→</span><span className="text-xs text-white/40 ml-1">Arrows</span></div>
            <div><span className="text-xs font-bold" style={{color:`${ct.primary}80`}}>WASD</span><span className="text-xs text-white/40 ml-1">Keys</span></div>
            <div><span className="text-xs font-bold" style={{color:`${ct.primary}80`}}>👆</span><span className="text-xs text-white/40 ml-1">Swipe</span></div>
            {address && (
              <div className="flex items-center gap-1">
                <Link2 className="w-3 h-3" style={{color:"#a78bfa80"}}/>
                <span className="text-xs text-purple-400/60">Base</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
