'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { subscribeToProject } from '@/lib/firestore'
import { applyTheme } from '@/lib/theme'
import { useAuth } from '@/contexts/AuthContext'
import type { Project } from '@/types'
import KPICards from '@/components/kpi/KPICards'
import GanttChartComponent from '@/components/gantt/GanttChart'
import AIChat from '@/components/ai/AIChat'

export default function ProjectDashboardPage() {
  const { id } = useParams<{ id: string }>()
  const { user, loading } = useAuth()
  const router = useRouter()
  const [project, setProject] = useState<Project | null>(null)
  const [projectLoading, setProjectLoading] = useState(true)
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
        <div key={i} className="h-32 rounded-md shimmer" />
      ))}
    </div>
  )

  if (!project) return (
    <div className="min-h-screen bg-[#050508] flex items-center justify-center">
      <div className="text-center">
        <p className="text-6xl mb-4">🔍</p>
        <h2 className="text-xl font-bold text-white mb-2">Projeto não encontrado</h2>
        <button onClick={() => router.push('/dashboard')}
          className="text-sm" style={{ color: 'var(--color-brand)' }}>
          Voltar ao Dashboard
        </button>
      </div>
    </div>
  )

  const currentWeek = project.startDate
    ? Math.max(1, Math.ceil(
        (new Date().getTime() - new Date(project.startDate).getTime())
        / (1000 * 60 * 60 * 24 * 7)
      ))
    : (project.weeklyUpdates?.slice(-1)[0]?.weekNumber ?? 1)

  return (
    <div className="flex-1 flex flex-col min-h-screen relative">
      <div className="flex-1 p-8">
        <div className={`transition-all duration-300 ${showAIPanel ? 'mr-[380px]' : ''}`}>
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-white">
                Semana{' '}
                <span style={{ color: 'var(--color-brand)' }}>{currentWeek}</span>
              </h2>
              <p className="text-white/35 text-xs mt-0.5">
                Visão geral do projeto {project.clientName}
              </p>
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
            className="fixed right-0 top-[64px] bottom-0 w-[380px] glass-strong border-l border-white/5 z-30"
          >
            <AIChat project={project} onClose={() => setShowAIPanel(false)} embedded />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}