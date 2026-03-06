'use client'
import { motion } from 'framer-motion'
import { Calendar, Users, ChevronRight, Activity } from 'lucide-react'
import Link from 'next/link'
import type { Project } from '@/types'
import { formatDate } from '@/lib/utils'

interface Props {
  project: Project
  index: number
}

export default function ProjectCard({ project, index }: Props) {
  const latestUpdate = project.weeklyUpdates?.[project.weeklyUpdates.length - 1]
  const integratedCount = latestUpdate?.distributorsIntegrated ?? 0
  const totalCount = latestUpdate?.distributorsTotal ?? 0
  const progress = totalCount > 0 ? Math.round((integratedCount / totalCount) * 100) : 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Link href={`/project/${project.id}`}>
        <div className="glass rounded-md p-6 group cursor-pointer hover:border-white/20 transition-all relative overflow-hidden">
          {/* Brand Accent */}
          <div 
            className="absolute top-0 right-0 w-32 h-32 opacity-10 rounded-full -translate-y-16 translate-x-16 blur-3xl transition-opacity group-hover:opacity-20"
            style={{ backgroundColor: project.clientColor }}
          />

          <div className="flex items-start justify-between mb-4 relative z-10">
            <div className="flex items-center gap-3">
              <div 
                className="w-12 h-12 rounded-md flex items-center justify-center text-lg font-black"
                style={{ 
                  background: `${project.clientColor}22`, 
                  border: `1px solid ${project.clientColor}44`,
                  color: project.clientColor
                }}
              >
                {project.clientName.charAt(0)}
              </div>
              <div>
                <h3 className="text-base font-bold text-white group-hover:text-brand transition-colors">
                  {project.clientName}
                </h3>
                <div className="flex items-center gap-1.5 text-[10px] text-white/30 uppercase tracking-widest font-bold">
                  <Activity className="w-2.5 h-2.5" />
                  {project.phases.find(p => p.status === 'in_progress')?.name ?? 'Concluído'}
                </div>
              </div>
            </div>
            <div className="w-8 h-8 rounded-md glass flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
              <ChevronRight className="w-4 h-4 text-white/40" />
            </div>
          </div>

          <div className="space-y-4 relative z-10">
            {/* Progress Bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-[10px] font-bold uppercase tracking-tight">
                <span className="text-white/40">Integração</span>
                <span style={{ color: project.clientColor }}>{progress}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  className="h-full rounded-full"
                  style={{ backgroundColor: project.clientColor }}
                />
              </div>
            </div>

            {/* Meta */}
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-white/20" />
                  <span className="text-[11px] text-white/40">{formatDate(project.endDate)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-white/20" />
                  <span className="text-[11px] text-white/40">{totalCount} distr.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  )
}