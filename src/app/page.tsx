
'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Briefcase, ArrowRight, ShieldCheck, Sparkles, Zap } from 'lucide-react'
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
      <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen bg-[#050508] text-white selection:bg-primary/30">
      {/* Header */}
      <nav className="fixed top-0 w-full z-50 glass border-b border-white/5 px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br from-primary to-purple-500">
            <Briefcase className="w-5 h-5 text-black" />
          </div>
          <span className="font-bold text-lg tracking-tight">Sellers Pulse</span>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={skipLogin}
            className="text-xs font-semibold text-white/40 hover:text-white transition-colors uppercase tracking-widest"
          >
            Modo Dev
          </button>
          <button 
            onClick={signInWithGoogle}
            className="px-5 py-2 rounded-xl bg-white text-black font-bold text-sm hover:scale-105 transition-all flex items-center gap-2"
          >
            <img src="https://www.gstatic.com/firebase/anonymous-scan.png" className="w-4 h-4 hidden" alt="" />
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Entrar com Google
          </button>
        </div>
      </nav>

      {/* Hero */}
      <main className="pt-32 pb-20 px-8">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold mb-8 uppercase tracking-widest"
          >
            <Sparkles className="w-3 h-3" />
            Nova Geração de Deploy
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl md:text-7xl font-black mb-6 leading-[1.1]"
          >
            Acompanhe suas <span className="text-brand-gradient">Implantações</span> com Estilo.
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-white/40 text-lg md:text-xl mb-12 max-w-2xl mx-auto leading-relaxed"
          >
            A Sellers Pulse oferece uma visão em tempo real, dashboards inteligentes e cronogramas interativos para garantir o sucesso de cada novo cliente.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <button 
              onClick={signInWithGoogle}
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-white text-black font-black text-lg flex items-center justify-center gap-3 hover:scale-105 transition-all shadow-[0_0_40px_rgba(255,255,255,0.1)]"
            >
              <svg className="w-6 h-6" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Entrar com Google
            </button>
            <button 
              onClick={skipLogin}
              className="w-full sm:w-auto px-8 py-4 rounded-2xl glass border-white/10 text-white font-bold text-lg hover:bg-white/5 transition-all"
            >
              Explorar como Guest
            </button>
          </motion.div>
        </div>

        {/* Features grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto mt-32">
          {[
            { icon: Zap, title: "Velocidade", desc: "Sincronização em tempo real com Firestore para dados sempre atualizados." },
            { icon: ShieldCheck, title: "Segurança", desc: "Controle de acesso granular baseado em posse de projeto via Security Rules." },
            { icon: Sparkles, title: "AI Assistant", desc: "Gere resumos e analise riscos automaticamente com Sellers AI." }
          ].map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + (i * 0.1) }}
              className="glass p-8 rounded-3xl border-white/5 hover:border-primary/20 transition-colors"
            >
              <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mb-6">
                <f.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-3">{f.title}</h3>
              <p className="text-white/40 leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-12 px-8">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6 opacity-30 grayscale text-sm">
          <div className="flex items-center gap-2">
            <Briefcase className="w-4 h-4" />
            <span className="font-bold">Sellers Pulse 2024</span>
          </div>
          <p>© Todos os direitos reservados. Projeto Sellers Pulse.</p>
        </div>
      </footer>
    </div>
  )
}
