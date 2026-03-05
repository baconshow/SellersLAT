'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BarChart3, GanttChart, Presentation, Sparkles,
  Plus, MessageSquare, RefreshCw, ChevronDown
} from 'lucide-react'
import { subscribeToProject } from '@/lib/firestore'
import { applyTheme } from '@/lib/theme'
import { useAuth } from '@/contexts/AuthContext'
import type { Project } from '@/types'
import Sidebar from '@/components/layout/Sidebar'
import KPICards from '@/components/kpi/KPICards'
import GanttChartComponent from '@/components/gantt/GanttChart'
import SlidesDeck from '@/components/presentation/SlidesDeck'
import AIChat from '@/components/ai/AIChat'
import WeeklyUpdateDrawer from '@/components/ui/WeeklyUpdateDrawer'
import { cn } from '@/lib/utils'

type ActiveView = 'dashboard' | 'gantt' | 'slides' | 'ai'

export default function ProjectPage() {
  const { id } = useParams<{ id: string }>()
  const { user, loading } = useAuth()
  const router = useRouter()
  const [project, setProject] = useState<Project | null>(null)
  const [projectLoading, setProjectLoading] = useState(true)
  const [activeView, setActiveView] = useState<ActiveView>('dashboard')
  const [showUpdateDrawer, setShowUpdateDrawer] = useState(false)
  const [showAIPanel, setShowAIPanel] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

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

  if (projectLoading) return <ProjectSkeleton />
  if (!project) return <NotFound />

  const VIEW_LABELS: Record<ActiveView, string> = {
    dashboard: 'Dashboard',
    gantt: 'Gantt',
    slides: 'Apresentação',
    ai: 'IA',
  }

  return (
    <div className="min-h-screen bg-void flex">
      <Sidebar 
        projectId={id} 
        collapsed={sidebarCollapsed} 
        setCollapsed={setSidebarCollapsed} 
      />

      <main 
        className={cn(
          "flex-1 flex flex-col min-h-screen transition-all duration-300 ease-in-out",
          sidebarCollapsed ? "ml-[72px]" : "ml-[240px]"
        )}
      >
        {/* Project header bar */}
        <div className="sticky top-0 z-40 glass-strong border-b border-white/5">
          <div className="px-8 py-3 flex items-center justify-between">
            {/* Client identity */}
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
                <p className="text-[11px] text-white/35">
                  {project.phases.find(p => p.status === 'in_progress')?.name ?? 'Projeto concluído'}
                </p>
              </div>
            </div>

            {/* View tabs */}
            <div className="flex items-center gap-1 glass rounded-xl p-1">
              {(['dashboard', 'gantt', 'slides', 'ai'] as ActiveView[]).map(view => (
                <button
                  key={view}
                  onClick={() => setActiveView(view)}
                  className="px-4 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={activeView === view ? {
                    background: 'var(--color-brand-soft)',
                    color: 'var(--color-brand)',
                    boxShadow: '0 0 8px var(--color-brand-glow)',
                  } : { color: 'rgba(255,255,255,0.45)' }}
                >
                  {VIEW_LABELS[view]}
                </button>
              ))}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAIPanel(p => !p)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
                style={{ background: 'var(--color-brand-soft)', color: 'var(--color-brand)' }}
              >
                <Sparkles style={{ width: 12, height: 12 }} />
                IA
              </button>
              <button
                onClick={() => setShowUpdateDrawer(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-black transition-all hover:opacity-90"
                style={{ background: 'linear-gradient(135deg, var(--color-brand), var(--color-brand-secondary))' }}
              >
                <Plus style={{ width: 12, height: 12 }} />
                Atualizar Semana
              </button>
            </div>
          </div>

          {/* Brand accent line */}
          <div className="h-0.5" style={{ background: `linear-gradient(90deg, ${project.clientColor}, ${project.clientColorSecondary}, transparent)` }} />
        </div>

        {/* Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Main view */}
          <div className={`flex-1 overflow-y-auto p-8 transition-all ${showAIPanel ? 'mr-[380px]' : ''}`}>
            <AnimatePresence mode="wait">
              {activeView === 'dashboard' && (
                <motion.div key="dashboard" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
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
              )}

              {activeView === 'gantt' && (
                <motion.div key="gantt" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <div className="mb-6">
                    <h2 className="text-2xl font-black text-white">Cronograma</h2>
                    <p className="text-white/40 text-sm mt-1">Clique duplo no nome para editar · hover para mudar status</p>
                  </div>
                  <GanttChartComponent project={project} />
                </motion.div>
              )}

              {activeView === 'slides' && (
                <motion.div key="slides" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="h-[calc(100vh-140px)]">
                  <SlidesDeck project={project} />
                </motion.div>
              )}

              {activeView === 'ai' && (
                <motion.div key="ai" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="h-[calc(100vh-140px)]">
                  <AIChat project={project} embedded />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* AI Panel — floating */}
          <AnimatePresence>
            {showAIPanel && (
              <motion.div
                initial={{ x: 380, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 380, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 35 }}
                className="fixed right-0 top-[73px] bottom-0 w-[380px] glass-strong border-l border-white/5 z-30"
              >
                <AIChat project={project} onClose={() => setShowAIPanel(false)} embedded />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {showUpdateDrawer && (
        <WeeklyUpdateDrawer project={project} onClose={() => setShowUpdateDrawer(false)} />
      )}
    </div>
  )
}

function ProjectSkeleton() {
  return (
    <div className="min-h-screen bg-void flex">
      <div className="w-[240px] glass-strong" />
      <div className="flex-1 p-8 space-y-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-20 rounded-2xl shimmer" />
        ))}
      </div>
    </div>
  )
}

function NotFound() {
  const router = useRouter()
  return (
    <div className="min-h-screen bg-void flex items-center justify-center">
      <div className="text-center">
        <p className="text-6xl mb-4">🔍</p>
        <h2 className="text-xl font-bold text-white mb-2">Projeto não encontrado</h2>
        <button onClick={() => router.push('/dashboard')} className="text-sm" style={{ color: 'var(--color-brand)' }}>
          Voltar ao Dashboard
        </button>
      </div>
    </div>
  )
}
