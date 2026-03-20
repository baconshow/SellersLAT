'use client'
import { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import TopNav from '@/components/layout/TopNav'
import LATIntelligence from '@/components/intelligence/LATIntelligence'
import { subscribeToProject, subscribeToDistributorsCollection } from '@/lib/firestore'
import { applyTheme } from '@/lib/theme'
import type { Project, Distributor } from '@/types'

export default function ProjectLayoutClient({
  children,
  projectId,
}: {
  children:  React.ReactNode
  projectId: string
}) {
  const [project,      setProject]      = useState<Project | null>(null)
  const [distributors, setDistributors] = useState<Distributor[]>([])
  const [showAI,       setShowAI]       = useState(false)

  useEffect(() => {
    const unsub = subscribeToProject(projectId, p => {
      setProject(p)
      if (p) applyTheme(p.clientColor, p.clientColorSecondary, p.clientColorRgb)
    })
    return unsub
  }, [projectId])

  useEffect(() => {
    return subscribeToDistributorsCollection(projectId, setDistributors)
  }, [projectId])

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-bg)' }}>

      <TopNav
        projectId={projectId}
        clientName={project?.clientName ?? ''}
        brandColor={project?.clientColor ?? '#00D4AA'}
        project={project}
        onToggleLAT={() => setShowAI(v => !v)}
        showLAT={showAI}
      />

      {/* Conteúdo empurra quando LAT abre */}
      <main
        className="flex flex-col min-h-screen pt-20 transition-all duration-300"
        style={{ marginRight: showAI ? 400 : 0 }}
      >
        {children}
      </main>

      {/* Painel LAT Intelligence */}
      <AnimatePresence>
        {showAI && project && (
          <motion.div
            initial={{ x: 400, opacity: 0 }}
            animate={{ x: 0,   opacity: 1 }}
            exit={{   x: 400, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 32 }}
            className="fixed right-0 top-[64px] bottom-0 w-[400px] z-30 flex flex-col"
            style={{
              background:     'var(--nav-bg)',
              backdropFilter: 'blur(20px)',
              borderLeft:     '1px solid var(--color-border)',
              boxShadow:      '-20px 0 60px rgba(0,0,0,0.4)',
            }}
          >
            <LATIntelligence project={project} distributors={distributors} onClose={() => setShowAI(false)} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
