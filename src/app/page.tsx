'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import Image from 'next/image'

export default function LandingPage() {
  const { user, loading, signInWithGoogle } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && user) router.push('/dashboard')
  }, [user, loading, router])

  if (loading) return (
    <div className="min-h-screen bg-[#050508] flex items-center justify-center">
      <Loader2 className="w-6 h-6 text-white/20 animate-spin" />
    </div>
  )

  return (
    <div className="relative min-h-screen w-full bg-[#050508] overflow-hidden flex flex-col select-none">

      {/* Overlays para profundidade no preto */}
      <div className="absolute inset-0 pointer-events-none z-1"
        style={{ background: 'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.02) 0%, transparent 100%)' }} />
      
      <div className="absolute inset-0 pointer-events-none opacity-[0.02] z-2"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")` }} />

      {/* ─── Header ─────────────────────────────────────── */}
      <header className="relative z-10 flex items-center justify-end px-10 py-7">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="w-6 h-6 relative opacity-25 hover:opacity-55 transition-opacity duration-300"
        >
          <Image src="/images/sellers-logo.png" alt="Sellers" fill className="object-contain invert" />
        </motion.div>
      </header>

      {/* ─── Main ───────────────────────────────────────── */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 -mt-12">

        {/* Sellers badge */}
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex items-center gap-2 mb-2"
        >
          <span className="font-mono text-[10px] tracking-[0.4em] text-white/30 uppercase font-bold">
            Sellers
          </span>
        </motion.div>

        {/* LAT wordmark */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="relative mb-2"
        >
          <div className="absolute inset-0 blur-[80px] scale-150 pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.05), transparent)' }} />

          <h1
            className="relative text-[min(10vw,6.5rem)] font-black leading-none text-white"
            style={{
              fontFamily: "'Conthrax', 'Arial Black', sans-serif",
              letterSpacing: '-0.02em',
              WebkitTextStroke: '1px rgba(255,255,255,0.08)',
              textShadow: '0 0 120px rgba(255,255,255,0.04)',
            }}
          >
            LAT
          </h1>

          <div className="absolute -bottom-1 left-0 right-0">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          </div>
        </motion.div>

        {/* Significado do Acrônimo */}
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mb-12"
        >
          <span className="font-mono text-[9px] tracking-[0.25em] text-white/20 uppercase text-center block">
            Live Autonomous Tracker
          </span>
        </motion.div>

        {/* Tagline / Slogan */}
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="text-white/40 text-sm font-medium tracking-[0.1em] mb-14 text-center max-w-sm leading-relaxed"
        >
          Autônomo por design.<br />
          Presente em cada etapa.
        </motion.p>

        {/* Google Sign In */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.7 }}
        >
          <button
            onClick={signInWithGoogle}
            className="group relative flex items-center gap-4 px-8 py-4 rounded transition-all duration-300"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.1)',
              backdropFilter: 'blur(12px)',
            }}
            onMouseEnter={e => {
              const el = e.currentTarget as HTMLButtonElement
              el.style.background = 'rgba(255,255,255,0.07)'
              el.style.borderColor = 'rgba(255,255,255,0.18)'
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLButtonElement
              el.style.background = 'rgba(255,255,255,0.04)'
              el.style.borderColor = 'rgba(255,255,255,0.1)'
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" className="flex-shrink-0">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>

            <div className="h-4 w-px bg-white/10" />

            <span className="text-sm font-semibold text-white/70 group-hover:text-white/90 transition-colors tracking-wide">
              Continuar com Google
            </span>

            <motion.div
              className="text-white/25 group-hover:text-white/50 transition-colors"
              animate={{ x: [0, 3, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </motion.div>
          </button>

          <p className="mt-4 text-center font-mono text-[10px] text-white/15 tracking-[0.2em] uppercase">
            Acesso restrito
          </p>
        </motion.div>
      </main>

      {/* ─── Footer ─────────────────────────────────────── */}
      <footer className="relative z-10 flex items-center justify-end px-10 py-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="flex items-center gap-1.5"
        >
          {[0, 1, 2].map(i => (
            <div key={i} className="w-1 h-1 rounded-full bg-white/10" />
          ))}
        </motion.div>
      </footer>
    </div>
  )
}
