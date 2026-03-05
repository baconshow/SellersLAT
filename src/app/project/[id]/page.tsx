'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles, Plus
} from 'lucide-react'
import { subscribeToProject } from '@/lib/firestore'
import { applyTheme } from '@/lib/theme'
import { useAuth } from '@/contexts/AuthContext'
import type { Project } from '@/types'
import KPICards from '@/components/kpi/KPICards'
import GanttChartComponent from '@/components/gantt/GanttChart'
import WeeklyUpdateDrawer from '@/components/ui/WeeklyUpdateDrawer'
import AIChat from '@/components/ai/AIChat'

export default function ProjectDashboardPage() {
  const { id } = useParams<{ id: string }>()
  const { user, loading } = useAuth()
  const router = useRouter()
  const [project, setProject] = useState<Project | null>(null)
  const [projectLoading, setProjectLoading] = useState(true)
  const [showUpdateDrawer, setShowUpdateDrawer] = useState(false)
  const [showAIPanel, setShowAIPanel] = useState(false)

  useEffect(() => {
    if (!loading && !user) router.replace('/')
  }, [user, loading, router])

  useEffect(() => {
    if (!id) return
    const unsub = subscribeToProject(id, p => {
      setProject(p)
      setProjectLoading(false)
      if (p) applyTheme(p.clientColor, p.clientColorSecondary, p.clientColorRgb)
    })
    return unsub
  }, [id])

  if (projectLoading) return (
    <div className="p-8 space-y-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="h-32 rounded-2xl shimmer" />
      ))}
    </div>
  )

  if (!project) return (
    <div className="min-h-screen bg-[#050508] flex items-center justify-center">
      <div className="text-center">
        <p className="text-6xl mb-4">🔍</p>
        <h2 className="text-xl font-bold text-white mb-2">Projeto não encontrado</h2>
        <button onClick={() => router.push('/dashboard')} className="text-sm" style={{ color: 'var(--color-brand)' }}>
          Voltar ao Dashboard
        </button>
      </div>
    </div>
  )

  const activePhaseName = project.phases.find(p => p.status === 'in_progress')?.name ?? 'Projeto concluído'

  return (
    <div className="flex-1 flex flex-col min-h-screen relative">
      <header className="sticky top-0 z-40 glass-strong border-b border-white/5">
        <div className="px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black"
              style={{
                background: `linear-gradient(135deg, ${project.clientColor}33, ${project.clientColorSecondary}22)`,
                border: `1px solid ${project.clientColor}55`,
                color: project.clientColor,
              }}
            >
              {project.clientName.charAt(0)}
            </div>
            <div>
              <h1 className="text-sm font-bold text-white">{project.clientName}</h1>
              <p className="text-[11px] text-white/35">{activePhaseName}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAIPanel(p => !p)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
              style={{ background: 'var(--color-brand-soft)', color: 'var(--color-brand)' }}
            >
              <Sparkles className="w-3 h-3" />
              IA
            </button>
            <button
              onClick={() => setShowUpdateDrawer(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-black transition-all hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, var(--color-brand), var(--color-brand-secondary))' }}
            >
              <Plus className="w-3 h-3" />
              Atualizar Semana
            </button>
          </div>
        </div>
        <div className="h-0.5" style={{ background: `linear-gradient(90deg, ${project.clientColor}, ${project.clientColorSecondary}, transparent)` }} />
      </header>

      <div className="flex-1 p-8">
        <div className={`transition-all duration-300 ${showAIPanel ? 'mr-[380px]' : ''}`}>
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <div className="mb-8">
              <h2 className="text-2xl font-black text-white">
                Semana <span className="text-brand-gradient">{project.weeklyUpdates?.slice(-1)[0]?.weekNumber ?? '-'}</span>
              </h2>
              <p className="text-white/40 text-sm mt-1">Visão geral do projeto {project.clientName}</p>
            </div>
            <KPICards project={project} />
            <div className="mt-8">
              <GanttChartComponent project={project} />
            </div>
          </motion.div>
        </div>
      </div>

      <AnimatePresence>
        {showAIPanel && (
          <motion.div
            initial={{ x: 380, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 380, opacity: 0 }}
            className="fixed right-0 top-[60px] bottom-0 w-[380px] glass-strong border-l border-white/5 z-30"
          >
            <AIChat project={project} onClose={() => setShowAIPanel(false)} embedded />
          </motion.div>
        )}
      </AnimatePresence>

      {showUpdateDrawer && (
        <WeeklyUpdateDrawer project={project} onClose={() => setShowUpdateDrawer(false)} />
      )}
    </div>
  )
}
