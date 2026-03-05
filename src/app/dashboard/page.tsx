'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Plus, TrendingUp, Users, Activity, FolderOpen } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { subscribeToProjects } from '@/lib/firestore'
import { resetTheme } from '@/lib/theme'
import type { Project } from '@/types'
import Sidebar from '@/components/layout/Sidebar'
import ProjectCard from '@/components/dashboard/ProjectCard'
import NewProjectModal from '@/components/dashboard/NewProjectModal'
import { cn } from '@/lib/utils'

export default function DashboardPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>([])
  const [showModal, setShowModal] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  useEffect(() => {
    if (!loading && !user) router.replace('/')
  }, [user, loading, router])

  useEffect(() => {
    resetTheme()
  }, [])

  useEffect(() => {
    if (!user) return
    return subscribeToProjects(user.uid, setProjects)
  }, [user])

  const totalDistributors = projects.reduce((acc, p) => {
    const latest = p.weeklyUpdates?.[p.weeklyUpdates.length - 1]
    return acc + (latest?.distributorsTotal ?? 0)
  }, 0)

  const totalIntegrated = projects.reduce((acc, p) => {
    const latest = p.weeklyUpdates?.[p.weeklyUpdates.length - 1]
    return acc + (latest?.distributorsIntegrated ?? 0)
  }, 0)

  const activeProjects = projects.filter(p => {
    const now = new Date()
    return new Date(p.startDate) <= now && new Date(p.endDate) >= now
  }).length

  return (
    <div className="min-h-screen bg-[#050508] flex">
      <Sidebar 
        collapsed={sidebarCollapsed} 
        setCollapsed={setSidebarCollapsed} 
      />

      {/* Main content */}
      <main 
        className={cn(
          "flex-1 min-h-screen transition-all duration-300 ease-in-out",
          sidebarCollapsed ? "ml-[72px]" : "ml-[240px]"
        )}
      >
        {/* Header */}
        <div className="sticky top-0 z-40 glass-strong border-b border-white/5">
          <div className="px-8 py-4 flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-white">Projetos</h1>
              <p className="text-xs text-white/40">Gerencie todos os projetos de implantação</p>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-black transition-all hover:opacity-90 hover:scale-105"
              style={{ background: 'linear-gradient(135deg, var(--color-brand), var(--color-brand-secondary))' }}
            >
              <Plus className="w-4 h-4" />
              Novo Projeto
            </button>
          </div>
        </div>

        <div className="px-8 py-6">
          {/* Global KPIs */}
          <div className="grid grid-cols-4 gap-4 mb-8">
            {[
              { icon: FolderOpen, label: 'Total de Projetos', value: projects.length, color: 'var(--color-brand)', suffix: '' },
              { icon: Activity, label: 'Projetos Ativos', value: activeProjects, color: '#10B981', suffix: '' },
              { icon: Users, label: 'Distribuidores', value: totalDistributors.toLocaleString(), color: '#F59E0B', suffix: '' },
              { icon: TrendingUp, label: 'Taxa de Integração', value: totalDistributors > 0 ? Math.round((totalIntegrated / totalDistributors) * 100) : 0, color: '#8B5CF6', suffix: '%' },
            ].map((kpi, i) => (
              <motion.div
                key={kpi.label}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="glass rounded-2xl p-5 relative overflow-hidden"
              >
                <div
                  className="absolute top-0 right-0 w-20 h-20 rounded-full opacity-10 -translate-y-4 translate-x-4"
                  style={{ background: kpi.color }}
                />
                <div className="relative z-10">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3"
                       style={{ background: `${kpi.color}22`, border: `1px solid ${kpi.color}33` }}>
                    <kpi.icon className="w-4.5 h-4.5" style={{ color: kpi.color, width: 18, height: 18 }} />
                  </div>
                  <p className="text-2xl font-bold text-white">{kpi.value}{kpi.suffix}</p>
                  <p className="text-xs text-white/40 mt-0.5">{kpi.label}</p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Projects grid */}
          {projects.length === 0 ? (
            <EmptyState onNew={() => setShowModal(true)} />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {projects.map((p, i) => (
                <ProjectCard key={p.id} project={p} index={i} />
              ))}
              {/* Add card */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: projects.length * 0.07 }}
                onClick={() => setShowModal(true)}
                className="rounded-2xl border border-dashed border-white/10 flex flex-col items-center justify-center gap-3 py-12 cursor-pointer
                           hover:border-white/20 hover:bg-white/2 transition-all group"
              >
                <div className="w-12 h-12 rounded-xl glass flex items-center justify-center group-hover:scale-110 transition-transform"
                     style={{ border: '1px solid var(--color-brand-soft)' }}>
                  <Plus className="w-5 h-5" style={{ color: 'var(--color-brand)' }} />
                </div>
                <p className="text-sm text-white/30 group-hover:text-white/60 transition-colors">Novo Projeto</p>
              </motion.div>
            </div>
          )}
        </div>
      </main>

      {showModal && (
        <NewProjectModal
          onClose={() => setShowModal(false)}
          onCreated={(id) => {
            setShowModal(false)
            router.push(`/project/${id}`)
          }}
        />
      )}
    </div>
  )
}

function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-24 text-center"
    >
      <div className="w-20 h-20 rounded-2xl glass flex items-center justify-center mb-6"
           style={{ border: '1px solid var(--color-brand-soft)' }}>
        <FolderOpen className="w-9 h-9" style={{ color: 'var(--color-brand)' }} />
      </div>
      <h3 className="text-xl font-bold text-white mb-2">Nenhum projeto ainda</h3>
      <p className="text-white/40 text-sm mb-6 max-w-xs">
        Crie seu primeiro projeto para começar a acompanhar implantações com estilo.
      </p>
      <button
        onClick={onNew}
        className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm text-black"
        style={{ background: 'linear-gradient(135deg, var(--color-brand), var(--color-brand-secondary))' }}
      >
        <Plus className="w-4 h-4" />
        Criar primeiro projeto
      </button>
    </motion.div>
  )
}
