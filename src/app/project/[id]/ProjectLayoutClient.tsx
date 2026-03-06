'use client'
import { useState, useEffect } from 'react'
import TopNav from '@/components/layout/TopNav'
import { getProject } from '@/lib/firestore'
import type { Project } from '@/types'

interface ProjectLayoutClientProps {
  children:  React.ReactNode
  projectId: string
}

export default function ProjectLayoutClient({
  children,
  projectId,
}: ProjectLayoutClientProps) {
  const [project, setProject] = useState<Project | null>(null)

  useEffect(() => {
    getProject(projectId).then(setProject).catch(() => null)
  }, [projectId])

  const brandColor          = project?.clientColor          ?? '#00D4AA'
  const brandColorSecondary = project?.clientColorSecondary ?? '#8B5CF6'

  return (
    <div className="min-h-screen" style={{ background: '#050508' }}>
      <TopNav
        projectId={projectId}
        brandColor={brandColor}
        brandColorSecondary={brandColorSecondary}
      />
      {/* pt-16 compensa a altura do header fixo (64px) */}
      <main className="flex flex-col min-h-screen pt-16">
        {children}
      </main>
    </div>
  )
}