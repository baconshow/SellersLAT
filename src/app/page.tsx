'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Briefcase, ArrowRight, ShieldCheck, Sparkles, Zap, Loader2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

export default function LandingPage() {
  const { user, loading, signInWithGoogle, skipLogin } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard')
    }
  }, [user, loading, router])

  if (loading) return (
    <div className="min-h-screen bg-[#050508] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-10 h-10 text-brand animate-spin" />
        <p className="text-xs font-bold uppercase tracking-widest text-white/40">Sincronizando...</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#050508] text-white selection:bg-brand/30">
      {/* Header */}
      <nav className="fixed top-0 w-full z-50 glass border-b border-white/5 px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br from-brand to-brand-secondary shadow-[0_0_15px_var(--color-brand-glow)]">
            <Briefcase className="w-5 h-5 text-black" />
          </div>
          <span className="font-bold text-lg tracking-tight">Sellers Pulse</span>
        </div>
        <div className="flex items-center gap-6">
          <button 
            onClick={skipLogin}
            className="text-[10px] font-bold text-white/40 hover:text-white transition-colors uppercase tracking-[0.2em]"
          >
            Modo Visitante
          </button>
          <button 
            onClick={signInWithGoogle}
            className="px-5 py-2 rounded-xl bg-white text-black font-bold text-sm hover:scale-105 transition-all flex items-center gap-2.5 shadow-xl"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Entrar
          </button>
        </div>
      </nav>

      {/* Hero */}
      <main className="pt-32 pb-20 px-8">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand/10 border border-brand/20 text-brand text-[10px] font-bold mb-8 uppercase tracking-[0.25em]"
          >
            <Sparkles className="w-3 h-3" />
            Empowering Field Sales
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-6xl md:text-8xl font-black mb-8 leading-[1.05]"
          >
            Sua jornada de <span className="text-brand-gradient">Deploy</span> simplificada.
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-white/50 text-xl md:text-2xl mb-12 max-w-2xl mx-auto leading-relaxed"
          >
            Acompanhe a evolução, analise riscos com IA e apresente resultados com estilo. Tudo em um só lugar.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-6"
          >
            <button 
              onClick={signInWithGoogle}
              className="group relative w-full sm:w-auto px-10 py-5 rounded-2xl bg-white text-black font-black text-xl flex items-center justify-center gap-4 hover:scale-105 transition-all shadow-[0_20px_40px_rgba(255,255,255,0.15)]"
            >
              <svg className="w-6 h-6" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Começar Agora
              <ArrowRight className="w-5 h-5 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
            </button>
          </motion.div>
        </div>

        {/* Features grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto mt-40">
          {[
            { icon: Zap, title: "Real-time Sync", desc: "Sua equipe sempre alinhada com dados atualizados via Firestore." },
            { icon: Sparkles, title: "Sellers AI", desc: "Geração automática de apresentações e resumos executivos inteligentes." },
            { icon: ShieldCheck, title: "Enterprise Ready", desc: "Segurança de nível bancário com Security Rules granulares." }
          ].map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + (i * 0.1) }}
              className="glass p-10 rounded-[2.5rem] border-white/5 hover:border-brand/20 transition-all group"
            >
              <div className="w-14 h-14 rounded-2xl bg-brand/10 flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
                <f.icon className="w-7 h-7 text-brand" />
              </div>
              <h3 className="text-2xl font-bold mb-4">{f.title}</h3>
              <p className="text-white/40 leading-relaxed text-lg">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-16 px-8">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8 opacity-20 grayscale hover:opacity-50 transition-opacity">
          <div className="flex items-center gap-3">
            <Briefcase className="w-5 h-5" />
            <span className="font-bold text-lg">Sellers Pulse</span>
          </div>
          <p className="text-sm">© 2024 Sellers Pulse. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
