'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { ArrowRight, Gamepad2, Zap, Users, ChevronRight, ExternalLink } from 'lucide-react'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/* eslint-disable @typescript-eslint/no-explicit-any */

gsap.registerPlugin(ScrollTrigger)

function cn(...inputs: any[]) {
  return twMerge(clsx(inputs))
}

// -----------------------------------------------------
// PARTICLE BACKGROUND
// -----------------------------------------------------
const ParticleBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const mouseRef = useRef({ x: 0, y: 0 })
  const particlesRef = useRef<any[]>([])
  const animFrameRef = useRef<number | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    let width = window.innerWidth
    let height = window.innerHeight

    canvas.width = width
    canvas.height = height

    const PARTICLE_COUNT = Math.min(80, Math.floor((width * height) / 15000))
    const CONNECTION_DISTANCE = 150
    const MOUSE_RADIUS = 200

    particlesRef.current = Array.from({ length: PARTICLE_COUNT }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      size: Math.random() * 3 + 1.5,
    }))

    const handleResize = () => {
      width = window.innerWidth
      height = window.innerHeight
      canvas.width = width
      canvas.height = height
    }

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY }
    }

    const animate = () => {
      ctx.clearRect(0, 0, width, height)
      const particles = particlesRef.current
      const mouse = mouseRef.current

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i]
        const dx = mouse.x - p.x
        const dy = mouse.y - p.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < MOUSE_RADIUS && dist > 0) {
          const force = (MOUSE_RADIUS - dist) / MOUSE_RADIUS
          p.vx -= (dx / dist) * force * 0.02
          p.vy -= (dy / dist) * force * 0.02
        }
        p.x += p.vx
        p.y += p.vy
        p.vx *= 0.99
        p.vy *= 0.99
        if (p.x < 0) p.x = width
        if (p.x > width) p.x = 0
        if (p.y < 0) p.y = height
        if (p.y > height) p.y = 0
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(59, 130, 246, 0.44)'
        ctx.fill()
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j]
          const cdx = p.x - p2.x
          const cdy = p.y - p2.y
          const cdist = Math.sqrt(cdx * cdx + cdy * cdy)
          if (cdist < CONNECTION_DISTANCE) {
            const opacity = (1 - cdist / CONNECTION_DISTANCE) * 0.165
            ctx.beginPath()
            ctx.moveTo(p.x, p.y)
            ctx.lineTo(p2.x, p2.y)
            ctx.strokeStyle = `rgba(59, 130, 246, ${opacity})`
            ctx.lineWidth = 1.2
            ctx.stroke()
          }
        }
      }
      animFrameRef.current = requestAnimationFrame(animate)
    }

    window.addEventListener('resize', handleResize)
    window.addEventListener('mousemove', handleMouseMove)
    animate()

    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('mousemove', handleMouseMove)
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    }
  }, [])

  return <canvas ref={canvasRef} id="particle-canvas" />
}

// -----------------------------------------------------
// MAGNETIC BUTTON
// -----------------------------------------------------
const MagneticButton = ({ children, className, href, linkTo, ...props }: any) => {
  const buttonRef = useRef<HTMLElement>(null)

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!buttonRef.current) return
    const { clientX, clientY } = e
    const { left, top, width, height } = buttonRef.current.getBoundingClientRect()
    const x = (clientX - left - width / 2) * 0.25
    const y = (clientY - top - height / 2) * 0.25
    gsap.to(buttonRef.current, { x, y, duration: 0.4, ease: 'power3.out' })
  }

  const handleMouseLeave = () => {
    if (!buttonRef.current) return
    gsap.to(buttonRef.current, { x: 0, y: 0, duration: 0.4, ease: 'power3.out' })
  }

  // Use Next.js Link for internal routes
  if (linkTo) {
    return (
      <Link
        ref={buttonRef as any}
        href={linkTo}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className={cn(
          'relative overflow-hidden group rounded-full font-heading font-semibold text-[17.5px] tracking-tight transition-all duration-300 hover:scale-[1.03]',
          className
        )}
        style={{ padding: '12px 36px' }}
        {...props}
      >
        <span className="relative z-10 flex items-center gap-2">{children}</span>
      </Link>
    )
  }

  const Tag = href ? 'a' : 'button'

  return (
    <Tag
      ref={buttonRef as any}
      href={href}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={cn(
        'relative overflow-hidden group rounded-full font-heading font-semibold text-[17.5px] tracking-tight transition-all duration-300 hover:scale-[1.03]',
        className
      )}
      style={{ padding: '12px 36px' }}
      {...props}
    >
      <span className="relative z-10 flex items-center gap-2">{children}</span>
    </Tag>
  )
}

// -----------------------------------------------------
// NAVBAR
// -----------------------------------------------------
const Navbar = () => {
  const navRef = useRef(null)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        start: 'top -50',
        onUpdate: (self) => {
          setScrolled(self.scroll() > 50)
        },
      })
    }, navRef)
    return () => ctx.revert()
  }, [])

  return (
    <nav
      ref={navRef}
      className={cn(
        'fixed top-5 left-1/2 -translate-x-1/2 z-50 flex items-center justify-between px-6 py-3 transition-all duration-500 rounded-full w-[92%] max-w-5xl',
        scrolled
          ? 'bg-surface/80 backdrop-blur-xl border border-white/5 shadow-[0_0_15px_rgba(59,130,246,0.2),0_0_40px_rgba(59,130,246,0.08)]'
          : 'bg-transparent border-transparent'
      )}
    >
      <div className="font-heading font-extrabold text-xl tracking-tight text-primary" style={{ paddingLeft: '12px' }}>
        Based<span className="text-accent">Games</span>
      </div>

      <div className="hidden md:flex items-center gap-8 font-heading text-[17.5px] font-medium text-primary/70">
        {[
          ['About', '#about'],
          ['Games', '#games'],
          ['Roadmap', '#roadmap'],
          ['Community', '#community'],
        ].map(([label, href]) => (
          <a
            key={label}
            href={href}
            className="relative group overflow-hidden hover:text-accent transition-colors duration-300"
          >
            {label}
          </a>
        ))}
      </div>

      <MagneticButton
        linkTo="#games"
        className={cn(
          '',
          scrolled
            ? 'bg-accent text-background hover:bg-accentDark'
            : 'bg-white/5 backdrop-blur-md text-primary border border-white/10 hover:border-accent/50'
        )}
      >
        Play Now
      </MagneticButton>
    </nav>
  )
}

// -----------------------------------------------------
// HERO SECTION
// -----------------------------------------------------
const Hero = () => {
  const heroRef = useRef(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('.hero-elem', {
        y: 50,
        opacity: 0,
        duration: 1,
        stagger: 0.12,
        ease: 'power3.out',
        delay: 0.3,
      })
    }, heroRef)
    return () => ctx.revert()
  }, [])

  return (
    <section
      ref={heroRef}
      className="relative h-[100dvh] w-full flex items-center justify-center px-8"
    >
      <div className="relative z-10 text-center max-w-4xl">
        <div className="hero-elem inline-flex items-center gap-2 bg-accent/10 border border-accent/20 rounded-full px-4 py-1.5 mb-8 shadow-[0_0_15px_rgba(59,130,246,0.25),0_0_40px_rgba(59,130,246,0.1)]">
          <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
          <span className="font-mono text-xs text-accent tracking-wide uppercase">
            Now Live
          </span>
        </div>

        <h1 className="hero-elem font-heading font-black text-5xl md:text-7xl lg:text-8xl text-primary leading-[0.95] mb-6 tracking-tight">
          Based gaming
          <br />
          <span className="text-accent text-glow">starts here.</span>
        </h1>

        <p className="hero-elem font-sans text-slate text-base md:text-lg max-w-xl mx-auto mb-10 leading-relaxed">
          Web3 games built for players who want to own their experience.
          No fluff, just fun. Powered by the Base Network.
        </p>

        <div className="hero-elem flex items-center justify-center gap-4 flex-wrap">
          <MagneticButton href="#games" className="bg-accent text-background hover:bg-accentDark glow-orange">
            Explore Games <ArrowRight size={16} />
          </MagneticButton>
          <MagneticButton href="#about" className="bg-white/5 text-primary border border-white/10 hover:border-accent/40">
            Learn More
          </MagneticButton>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent z-10 pointer-events-none" />
    </section>
  )
}

// -----------------------------------------------------
// ABOUT SECTION
// -----------------------------------------------------
const About = () => {
  const sectionRef = useRef(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo('.about-elem',
        { y: 40, opacity: 0 },
        {
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 80%',
          },
          y: 0,
          opacity: 1,
          duration: 0.8,
          stagger: 0.15,
          ease: 'power3.out',
        }
      )
    }, sectionRef)

    const fallback = setTimeout(() => {
      document.querySelectorAll('.about-elem').forEach((el) => {
        const htmlEl = el as HTMLElement
        if (parseFloat(getComputedStyle(htmlEl).opacity) === 0) {
          htmlEl.style.opacity = '1'
          htmlEl.style.transform = 'translateY(0)'
        }
      })
    }, 2000)

    return () => { ctx.revert(); clearTimeout(fallback) }
  }, [])

  const features = [
    {
      icon: Gamepad2,
      title: 'Play to Own',
      desc: 'Your achievements are yours forever. Mint your wins on-chain.',
    },
    {
      icon: Zap,
      title: 'Instant Access',
      desc: 'Connect your wallet and play. No accounts, no passwords.',
    },
    {
      icon: Users,
      title: 'Community First',
      desc: 'Built by gamers, for gamers. Every decision is player-driven.',
    },
  ]

  return (
    <section id="about" ref={sectionRef} className="relative py-32 px-8 md:px-16 z-10 w-full flex justify-center" style={{ scrollMarginTop: '100px' }}>
      <div className="max-w-6xl w-full">
        <div className="about-elem text-center mb-16 flex flex-col items-center">
          <h2 className="font-heading font-bold text-3xl md:text-5xl text-primary mb-4">
            Gaming the way it <span className="text-accent">should be.</span>
          </h2>
          <p className="font-sans text-slate max-w-2xl">
            Based Games is a collection of web3-enabled games where you actually
            own your progress. Connect a wallet, play, and take your wins with you.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mx-auto" style={{ marginBottom: '96px' }}>
          {features.map((f) => (
            <div
              key={f.title}
              className="about-elem group bg-surface/50 backdrop-blur-sm border border-white/5 rounded-2xl p-8 hover:border-accent/20 transition-all duration-500 text-center flex flex-col items-center"
            >
              <div className="w-12 h-12 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center mb-5 group-hover:bg-accent/20 transition-colors duration-300">
                <f.icon size={22} className="text-accent" />
              </div>
              <h3 className="font-heading font-bold text-lg text-primary mb-2">
                {f.title}
              </h3>
              <p className="font-sans text-slate text-sm leading-relaxed">
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// -----------------------------------------------------
// GAME CAROUSEL
// -----------------------------------------------------
const GAMES = [
  {
    id: 'neonsnake',
    title: 'NeonSnake',
    tag: 'Web3 Arcade',
    description:
      'Slither, strategize, own. NeonSnake is a twist on the classic Snake game with the option to own your high score forever. Verifiably random apple placement. Mint an optional NFT at the end of the game with your highest score to show off to your friends!',
    color: '#22C55E',
    features: ['On-chain high scores', 'Optional NFT minting', 'Classic gameplay'],
    route: '/snake',
    image: '/SnakeNFT.png',
  },
  {
    id: 'chessai',
    title: 'ChessAI',
    tag: 'Strategy',
    description:
      'ChessAI is your opportunity to play the timeless game of Chess against an AI opponent with a difficulty slider from 1 to 10 — dial it up to 10 if you dare. No need to log in with a username or password, your Web3 wallet handles that automatically!',
    color: '#8B5CF6',
    features: ['Adjustable difficulty', 'Online leaderboards', 'Strategy game'],
    route: '/chess',
    image: '/chess-scrnshot.png',
  },
  {
    id: 'promptinvaders',
    title: 'Prompt Invaders',
    tag: 'Arcade Shooter',
    description:
      'Rogue chatbots have escaped the cloud — defend your inbox! Blast waves of spam bots, vision AIs, and AGI overlords in this satirical Space Invaders tribute. Grab power-ups like Triple Shot, Fact Check freeze, and RLHF Boost to survive the onslaught.',
    color: '#00e5ff',
    features: ['Wave-based combat', 'Power-up system', 'AI humor & satire'],
    route: '/prompt-invaders',
    image: '/images/prompt-invaders/cover.png',
  },
]

const GameCard = ({ game, index }: { game: typeof GAMES[number]; index: number }) => {
  const cardRef = useRef(null)
  const isEven = index % 2 === 0

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(cardRef.current,
        { y: 60, opacity: 0 },
        {
          scrollTrigger: {
            trigger: cardRef.current,
            start: 'top 85%',
          },
          y: 0,
          opacity: 1,
          duration: 0.8,
          ease: 'power3.out',
        }
      )
    }, cardRef)

    const fallback = setTimeout(() => {
      const el = cardRef.current as HTMLElement | null
      if (el && parseFloat(getComputedStyle(el).opacity) === 0) {
        el.style.opacity = '1'
        el.style.transform = 'translateY(0)'
      }
    }, 2000)

    return () => { ctx.revert(); clearTimeout(fallback) }
  }, [])

  return (
    <div ref={cardRef} className="bg-surface/60 backdrop-blur-sm border border-white/5 rounded-3xl overflow-hidden">
      <div className={cn('flex flex-col', isEven ? 'lg:flex-row' : 'lg:flex-row-reverse')}>
        {/* Game screenshot */}
        <Link
          href={game.route}
          className="w-full lg:w-1/2 h-64 lg:h-auto min-h-[400px] relative block cursor-pointer hover:opacity-90 transition-opacity"
          style={{ background: `linear-gradient(135deg, ${game.color}15, ${game.color}05)` }}
        >
          <Image
            src={game.image}
            alt={`${game.title} screenshot`}
            fill
            className="object-contain p-4"
          />
        </Link>

        {/* Info */}
        <div className="w-full lg:w-1/2 p-8 lg:p-12 flex flex-col justify-center items-center text-center lg:items-start lg:text-left">
          <div
            className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-mono tracking-wide uppercase mb-4 w-fit"
            style={{
              background: `${game.color}15`,
              color: game.color,
              border: `1px solid ${game.color}30`,
            }}
          >
            {game.tag}
          </div>

          <h3 className="font-heading font-bold text-3xl md:text-4xl text-primary mb-4">
            {game.title}
          </h3>

          <p className="font-sans text-slate leading-relaxed mb-6">
            {game.description}
          </p>

          <div className="flex flex-wrap justify-center lg:justify-start gap-2 mb-8">
            {game.features.map((f) => (
              <span key={f} className="bg-white/5 border border-white/5 rounded-full text-primary/70 font-mono" style={{ fontSize: '14.4px', padding: '6px 16px' }}>
                {f}
              </span>
            ))}
          </div>

          <div className="flex items-center justify-center lg:justify-start gap-3">
            <MagneticButton linkTo={game.route} className="bg-accent text-background hover:bg-accentDark">
              Play {game.title} <ExternalLink size={14} />
            </MagneticButton>
          </div>
        </div>
      </div>
    </div>
  )
}

const GamesSection = () => {
  const sectionRef = useRef(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo('.games-title',
        { y: 40, opacity: 0 },
        {
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 80%',
          },
          y: 0,
          opacity: 1,
          duration: 0.8,
          ease: 'power3.out',
        }
      )
    }, sectionRef)

    const fallback = setTimeout(() => {
      document.querySelectorAll('.games-title').forEach((el) => {
        const htmlEl = el as HTMLElement
        if (parseFloat(getComputedStyle(htmlEl).opacity) === 0) {
          htmlEl.style.opacity = '1'
          htmlEl.style.transform = 'translateY(0)'
        }
      })
    }, 2000)

    return () => { ctx.revert(); clearTimeout(fallback) }
  }, [])

  return (
    <section id="games" ref={sectionRef} className="relative py-32 px-8 md:px-16 z-10 w-full flex justify-center" style={{ scrollMarginTop: '100px' }}>
      <div className="max-w-6xl w-full">
        <div className="games-title text-center mb-12">
          <h2 className="font-heading font-bold text-3xl md:text-5xl text-primary mb-2">
            Our <span className="text-accent">Games</span>
          </h2>
          <p className="font-sans text-slate">Play now. Own forever.</p>
        </div>

        <div className="flex flex-col gap-8">
          {GAMES.map((game, i) => (
            <GameCard key={game.id} game={game} index={i} />
          ))}
        </div>
      </div>
    </section>
  )
}

// -----------------------------------------------------
// ROADMAP SECTION
// -----------------------------------------------------
const RoadmapCard = ({ phase, title, desc, status }: { phase: string; title: string; desc: string; status: string }) => {
  return (
    <div className="roadmap-card w-full h-screen flex items-center justify-center bg-background sticky top-0">
      <div className="max-w-4xl w-full px-8 text-center mx-auto flex flex-col items-center">
        <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-6 bg-accent/10 border border-accent/20">
          <span className="font-mono text-xs text-accent tracking-wide uppercase">{phase}</span>
        </div>

        <h3 className="font-heading font-bold text-4xl md:text-6xl text-primary mb-6">{title}</h3>

        <p className="font-sans text-slate text-lg max-w-xl mx-auto leading-relaxed mb-8">{desc}</p>

        <div
          className={cn(
            'inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-mono',
            status === 'live'
              ? 'bg-green-500/10 text-green-400 border border-green-500/20'
              : status === 'building'
                ? 'bg-accent/10 text-accent border border-accent/20'
                : 'bg-white/5 text-slate border border-white/10'
          )}
        >
          <div
            className={cn(
              'w-2 h-2 rounded-full',
              status === 'live'
                ? 'bg-green-400 animate-pulse'
                : status === 'building'
                  ? 'bg-accent animate-pulse'
                  : 'bg-slate/50'
            )}
          />
          {status === 'live' ? 'Live Now' : status === 'building' ? 'In Progress' : 'Coming Soon'}
        </div>
      </div>
    </div>
  )
}

const Roadmap = () => {
  const containerRef = useRef(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      const cards = gsap.utils.toArray('.roadmap-card') as HTMLElement[]

      cards.forEach((card, i) => {
        if (i < cards.length - 1) {
          ScrollTrigger.create({
            trigger: card,
            start: 'top top',
            endTrigger: cards[i + 1],
            end: 'top top',
            pin: true,
            pinSpacing: false,
            animation: gsap.to(card, {
              scale: 0.92,
              opacity: 0.3,
              filter: 'blur(8px)',
              ease: 'none',
            }),
            scrub: true,
          })
        }
      })
    }, containerRef)
    return () => ctx.revert()
  }, [])

  return (
    <section id="roadmap" ref={containerRef} className="relative w-full z-10">
      <RoadmapCard phase="Phase 01" title="Launch Games" desc="NeonSnake, ChessAI, and Prompt Invaders are live. Play now, connect your wallet, and start building your on-chain gaming identity." status="live" />
      <RoadmapCard phase="Phase 02" title="Expand the Library" desc="More games are coming. Each one designed to be fun first, with optional web3 features that add real ownership without getting in the way." status="building" />
      <RoadmapCard phase="Phase 03" title="Community & Tournaments" desc="Leaderboards, tournaments, and community events. Compete with players worldwide and earn rewards for your skills." status="upcoming" />
    </section>
  )
}

// -----------------------------------------------------
// COMMUNITY SECTION
// -----------------------------------------------------
const Community = () => {
  const sectionRef = useRef(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo('.community-elem',
        { y: 40, opacity: 0 },
        {
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 90%',
          },
          y: 0,
          opacity: 1,
          duration: 0.8,
          stagger: 0.15,
          ease: 'power3.out',
        }
      )
    }, sectionRef)

    // Fallback: ensure elements are visible if ScrollTrigger doesn't fire
    const fallback = setTimeout(() => {
      document.querySelectorAll('.community-elem').forEach((el) => {
        const htmlEl = el as HTMLElement
        if (parseFloat(getComputedStyle(htmlEl).opacity) === 0) {
          htmlEl.style.opacity = '1'
          htmlEl.style.transform = 'translateY(0)'
        }
      })
    }, 2000)

    return () => { ctx.revert(); clearTimeout(fallback) }
  }, [])

  return (
    <section id="community" ref={sectionRef} className="relative py-32 px-8 md:px-16 z-10 w-full flex justify-center">
      <div className="max-w-4xl w-full flex flex-col items-center text-center">
        <h2 className="community-elem font-heading font-bold text-3xl md:text-5xl text-primary mb-4">
          Join the <span className="text-accent">community.</span>
        </h2>
        <p className="community-elem font-sans text-slate max-w-xl mb-10">
          Follow our public build of Based Games. Updates, new game
          announcements, and community discussion.
        </p>

        <div className="community-elem" style={{ paddingTop: '8px', paddingBottom: '8px' }}>
          <MagneticButton
            href="https://x.com/BasedGamesIO"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-accent text-background hover:bg-accentDark glow-orange inline-flex"
          >
            Follow on X (Twitter) <ChevronRight size={16} />
          </MagneticButton>
        </div>
      </div>
    </section>
  )
}

// -----------------------------------------------------
// FOOTER
// -----------------------------------------------------
const FooterSection = () => {
  return (
    <footer className="relative border-t border-white/5 py-12 px-8 md:px-16 z-10 w-full flex justify-center">
      <div className="max-w-6xl w-full flex flex-col md:flex-row justify-between items-center gap-6 text-center md:text-left">
        <div className="font-heading font-extrabold text-lg text-primary">
          Based<span className="text-accent">Games</span>
          <span className="text-slate text-sm font-normal ml-3">
            &copy; 2026
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-mono text-[15px] text-primary/50">Donate (ETH / Base):</span>
          <code className="font-mono text-[15px] text-primary/70 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5 select-all">
            0xCEcF57f9d2758a75eB0a657E96C73766cf34B0F1
          </code>
        </div>
      </div>
    </footer>
  )
}

// -----------------------------------------------------
// MAIN PAGE
// -----------------------------------------------------
export default function Home() {
  // Hide the shared Header on the landing page
  useEffect(() => {
    const header = document.querySelector('[data-shared-header]')
    if (header) (header as HTMLElement).style.display = 'none'
    return () => {
      if (header) (header as HTMLElement).style.display = ''
    }
  }, [])

  return (
    <div className="bg-background min-h-screen relative w-full">
      <ParticleBackground />
      <Navbar />
      <Hero />
      <About />
      <GamesSection />
      <Roadmap />
      <Community />
      <FooterSection />
    </div>
  )
}
