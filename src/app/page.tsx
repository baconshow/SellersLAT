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
            className="px-5 py-2 rounded-xl bg-white text-black font-bold text-sm hover:opacity-90 transition-all"
          >
            Entrar
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
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-primary to-purple-600 text-black font-black text-lg flex items-center justify-center gap-2 hover:scale-105 transition-all shadow-[0_0_40px_rgba(0,212,170,0.3)]"
            >
              Começar Agora
              <ArrowRight className="w-5 h-5" />
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
