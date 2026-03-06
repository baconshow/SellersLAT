'use client'
import { useState, useEffect } from 'react'
import TopNav from '@/components/layout/TopNav'
import { getProject } from '@/lib/firestore'
import type { Project } from '@/types'

export default function ProjectLayoutClient({
  children, projectId,
}: { children: React.ReactNode; projectId: string }) {
  const [project, setProject] = useState<Project | null>(null)

  useEffect(() => {
    getProject(projectId).then(setProject).catch(() => null)
  }, [projectId])

  return (
    <div className="min-h-screen" style={{ background: '#050508' }}>
      <TopNav
        projectId={projectId}
        clientName={project?.clientName ?? 'LAT'}
        brandColor={project?.clientColor ?? '#00D4AA'}
        project={project}
      />
      <main className="flex flex-col min-h-screen pt-16">
        {children}
      </main>
    </div>
  )
}