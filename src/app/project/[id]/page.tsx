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
import ProjectTimeline from '@/components/timeline/ProjectTimeline'
import LATIntelligence from '@/components/intelligence/LATIntelligence'
import TopNav from '@/components/layout/TopNav'

export default function ProjectDashboardPage() {
  const { id } = useParams<{ id: string }>()
  const { user, loading } = useAuth()
  const router = useRouter()
  const [project,        setProject]        = useState<Project | null>(null)
  const [projectLoading, setProjectLoading] = useState(true)
  const [showAI,         setShowAI]         = useState(false)

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
    <div className="p-8 pt-24 space-y-4">
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

  return (
    <div className="flex-1 flex flex-col min-h-screen relative">

      <TopNav
        projectId={id}
        clientName={project.clientName}
        brandColor={project.clientColor}
        project={project}
        onToggleLAT={() => setShowAI(v => !v)}
        showLAT={showAI}
      />

      <div className="flex-1 pt-20">
        <div className={`transition-all duration-300 px-8 pb-8 ${showAI ? 'mr-[400px]' : ''}`}>
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>

            <KPICards project={project} />

            <div className="mt-6">
              <ProjectTimeline project={project} />
            </div>

            <div className="mt-6">
              <GanttChartComponent project={project} />
            </div>

          </motion.div>
        </div>
      </div>

      {/* Painel LAT Intelligence */}
      <AnimatePresence>
        {showAI && (
          <motion.div
            initial={{ x: 400, opacity: 0 }}
            animate={{ x: 0,   opacity: 1 }}
            exit={{   x: 400, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 32 }}
            className="fixed right-0 top-[64px] bottom-0 w-[400px] z-30 flex flex-col"
            style={{
              background:     'rgba(10,10,16,0.98)',
              backdropFilter: 'blur(20px)',
              borderLeft:     '1px solid rgba(255,255,255,0.07)',
              boxShadow:      '-20px 0 60px rgba(0,0,0,0.4)',
            }}
          >
            <LATIntelligence project={project} onClose={() => setShowAI(false)} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}