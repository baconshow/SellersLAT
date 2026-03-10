'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Plus, TrendingUp, Users, Activity, FolderOpen } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { subscribeToProjects, subscribeToDistributorsCollection } from '@/lib/firestore'
import { resetTheme } from '@/lib/theme'
import type { Project, Distributor } from '@/types'
import ProjectCard from '@/components/dashboard/ProjectCard'
import NewProjectModal from '@/components/dashboard/NewProjectModal'
import TopNav from '@/components/layout/TopNav'

export default function DashboardPage() {
  const { user, loading, logout } = useAuth()
  const router = useRouter()
  const [projects,  setProjects]  = useState<Project[]>([])
  const [distMap,   setDistMap]   = useState<Record<string, Distributor[]>>({})
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    if (!loading && !user) router.replace('/')
  }, [user, loading, router])

  useEffect(() => { resetTheme() }, [])

  useEffect(() => {
    if (!user) return
    return subscribeToProjects(user.uid, user.email ?? null, setProjects)
  }, [user])

  // Subscribe to distributors for each project
  useEffect(() => {
    const unsubs = projects.map(p =>
      subscribeToDistributorsCollection(p.id, dists => {
        setDistMap(prev => ({ ...prev, [p.id]: dists }))
      })
    )
    return () => unsubs.forEach(u => u())
  }, [projects.map(p => p.id).join(',')])

  const totalDistributors = Object.values(distMap).reduce((acc, dists) => acc + dists.length, 0)
  const totalIntegrated = Object.values(distMap).reduce(
    (acc, dists) => acc + dists.filter(d => d.status === 'integrated').length, 0
  )

  const activeProjects = projects.filter(p => {
    const now = new Date()
    return new Date(p.startDate) <= now && new Date(p.endDate) >= now
  }).length

  const kpis = [
    { icon: FolderOpen, label: 'Total de Projetos',  value: projects.length,   color: '#00D4AA', suffix: ''  },
    { icon: Activity,   label: 'Projetos Ativos',    value: activeProjects,    color: '#10B981', suffix: ''  },
    { icon: Users,      label: 'Distribuidores',     value: totalDistributors, color: '#F59E0B', suffix: ''  },
    {
      icon: TrendingUp, label: 'Taxa de Integração',
      value: totalDistributors > 0
        ? Math.round((totalIntegrated / totalDistributors) * 100)
        : 0,
      color: '#8B5CF6', suffix: '%',
    },
  ]

  return (
    <div className="min-h-screen bg-[#050508]">

      <TopNav
        isDashboard
        onNewProject={() => setShowModal(true)}
      />

      <main className="pt-20 px-8 pb-12">

        {/* KPIs globais */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {kpis.map((kpi, i) => (
            <motion.div
              key={kpi.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="rounded p-5 relative overflow-hidden"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border:     '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <div
                className="absolute -bottom-6 -left-6 w-20 h-20 rounded-full blur-2xl opacity-15 pointer-events-none"
                style={{ background: kpi.color }}
              />
              <div className="relative z-10">
                <div
                  className="w-9 h-9 rounded flex items-center justify-center mb-3"
                  style={{ background: `${kpi.color}18`, border: `1px solid ${kpi.color}28` }}
                >
                  <kpi.icon style={{ color: kpi.color, width: 18, height: 18 }} />
                </div>
                <p className="text-2xl font-bold text-white" style={{ fontFamily: 'var(--font-outfit)', fontVariantNumeric: 'tabular-nums' }}>{kpi.value}{kpi.suffix}</p>
                <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>{kpi.label}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Grid de projetos */}
        {projects.length === 0 ? (
          <EmptyState onNew={() => setShowModal(true)} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {projects.map((p, i) => (
              <ProjectCard
                key={p.id}
                project={p}
                distributors={distMap[p.id] ?? []}
                currentUserEmail={user?.email ?? ''}
                currentUserName={user?.displayName ?? 'Sellers'}
                index={i}
                onEnter={() => router.push(`/project/${p.id}`)}
              />
            ))}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: projects.length * 0.07 }}
              onClick={() => setShowModal(true)}
              className="rounded flex flex-col items-center justify-center gap-3 py-12
                         cursor-pointer transition-all group"
              style={{
                background: 'rgba(255,255,255,0.02)',
                border:     '1px solid rgba(255,255,255,0.05)',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
            >
              <div
                className="w-12 h-12 rounded flex items-center justify-center transition-transform group-hover:scale-110"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                <Plus className="w-5 h-5 text-white/30 group-hover:text-white/60 transition-colors" />
              </div>
              <p className="text-sm transition-colors" style={{ color: 'rgba(255,255,255,0.25)' }}>
                Novo Projeto
              </p>
            </motion.div>
          </div>
        )}
      </main>

      {showModal && <NewProjectModal onClose={() => setShowModal(false)} />}
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
      <div
        className="w-20 h-20 rounded flex items-center justify-center mb-6"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <FolderOpen className="w-9 h-9 text-white/25" />
      </div>
      <h3 className="text-xl font-bold text-white mb-2">Nenhum projeto ainda</h3>
      <p className="text-sm mb-6 max-w-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
        Crie seu primeiro projeto para começar a acompanhar implantações.
      </p>
      <button
        onClick={onNew}
        className="flex items-center gap-2 px-6 py-3 rounded font-semibold text-sm transition-all"
        style={{
          background: 'rgba(255,255,255,0.05)',
          border:     '1px solid rgba(255,255,255,0.10)',
          color:      'rgba(255,255,255,0.65)',
        }}
      >
        <Plus className="w-4 h-4" />
        Criar primeiro projeto
      </button>
    </motion.div>
  )
}