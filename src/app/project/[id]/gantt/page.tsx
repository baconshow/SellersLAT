'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { subscribeToProject } from '@/lib/firestore'
import { applyTheme } from '@/lib/theme'
import type { Project } from '@/types'
import GanttChart from '@/components/gantt/GanttChart'
import { motion } from 'framer-motion'

export default function GanttPage() {
  const { id } = useParams<{ id: string }>()
  const [project, setProject] = useState<Project | null>(null)

  useEffect(() => {
    if (!id) return
    return subscribeToProject(id, p => {
      setProject(p)
      if (p) applyTheme(p.clientColor, p.clientColorSecondary, p.clientColorRgb)
    })
  }, [id])

  if (!project) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 rounded-full border-2 border-transparent animate-spin"
           style={{ borderTopColor: 'var(--color-brand,#00D4AA)' }} />
    </div>
  )

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-8"
    >
      <div className="mb-6">
        <h2 className="text-2xl font-black text-white">Cronograma</h2>
        <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
          Clique no lápis para editar · hover na barra para mudar status
        </p>
      </div>
      <GanttChart project={project} />
    </motion.div>
  )
}