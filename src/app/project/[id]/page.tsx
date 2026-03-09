'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { subscribeToProject } from '@/lib/firestore'
import { useAuth } from '@/contexts/AuthContext'
import type { Project } from '@/types'
import KPICards from '@/components/kpi/KPICards'
import GanttChartComponent from '@/components/gantt/GanttChart'
import ProjectTimeline from '@/components/timeline/ProjectTimeline'

export default function ProjectDashboardPage() {
  const { id } = useParams<{ id: string }>()
  const { user, loading } = useAuth()
  const router = useRouter()
  const [project,        setProject]        = useState<Project | null>(null)
  const [projectLoading, setProjectLoading] = useState(true)

  useEffect(() => {
    if (!loading && !user) router.replace('/')
  }, [user, loading, router])

  useEffect(() => {
    if (!id) return
    const unsub = subscribeToProject(id, p => {
      setProject(p)
      setProjectLoading(false)
    })
    return unsub
  }, [id])

  if (projectLoading) return (
    <div className="p-8 space-y-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="h-32 rounded shimmer" />
      ))}
    </div>
  )

  if (!project) return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center">
        <p className="text-5xl mb-4">🔍</p>
        <h2 className="text-lg font-bold text-white mb-2">Projeto não encontrado</h2>
        <button onClick={() => router.push('/dashboard')}
          className="text-sm" style={{ color: 'var(--color-brand)' }}>
          Voltar ao Dashboard
        </button>
      </div>
    </div>
  )

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="px-8 pb-8 pt-4"
    >
      <KPICards project={project} />

      <div className="mt-6">
        <ProjectTimeline project={project} />
      </div>

      <div className="mt-6">
        <GanttChartComponent project={project} />
      </div>
    </motion.div>
  )
}