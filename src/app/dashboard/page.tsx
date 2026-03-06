'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Plus, TrendingUp, Users, Activity, FolderOpen, LogOut } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { subscribeToProjects } from '@/lib/firestore'
import { resetTheme } from '@/lib/theme'
import type { Project } from '@/types'
import ProjectCard from '@/components/dashboard/ProjectCard'
import NewProjectModal from '@/components/dashboard/NewProjectModal'
import Image from 'next/image'

export default function DashboardPage() {
  const { user, loading, logout } = useAuth()
  const router = useRouter()
  const [projects, setProjects]   = useState<Project[]>([])
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    if (!loading && !user) router.replace('/')
  }, [user, loading, router])

  useEffect(() => { resetTheme() }, [])

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

  const kpis = [
    { icon: FolderOpen, label: 'Total de Projetos',  value: projects.length,   color: '#00D4AA', suffix: ''  },
    { icon: Activity,   label: 'Projetos Ativos',    value: activeProjects,    color: '#10B981', suffix: ''  },
    { icon: Users,      label: 'Distribuidores',     value: totalDistributors, color: '#F59E0B', suffix: ''  },
    {
      icon: TrendingUp, label: 'Taxa de Integração',
      value: totalDistributors > 0 ? Math.round((totalIntegrated / totalDistributors) * 100) : 0,
      color: '#8B5CF6', suffix: '%',
    },
  ]

  return (
    <div className="min-h-screen bg-[#050508]">

      {/* ── Header ─────────────────────────────────────────────── */}
      <header
        className="fixed top-0 left-0 right-0 z-50 pointer-events-none"
        style={{ height: 100 }}
      >
        <div className="absolute inset-0" style={{
          background: `linear-gradient(to bottom,
            rgba(5,5,8,0.97) 0%,
            rgba(5,5,8,0.82) 45%,
            rgba(5,5,8,0.20) 78%,
            transparent      100%
          )`,
        }} />

        <div
          className="relative z-10 flex items-center justify-between px-8 pointer-events-auto"
          style={{ height: 64 }}
        >
          <span className="font-semibold text-white/80 text-sm tracking-wide">
            PROJETOS
          </span>

          <div className="flex items-center gap-3">
            {user?.photoURL ? (
              <Image
                src={user.photoURL} alt={user.displayName || ''}
                width={28} height={28} className="rounded-full"
                style={{ boxShadow: '0 0 0 1.5px rgba(255,255,255,0.15)' }}
              />
            ) : (
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold bg-white/10 text-white/60">
                {user?.displayName?.[0] ?? 'U'}
              </div>
            )}
            <button
              onClick={logout}
              className="flex items-center justify-center w-7 h-7 rounded-md transition-all"
              style={{ color: 'rgba(255,255,255,0.18)' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.55)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.18)')}
            >
              <LogOut style={{ width: 14, height: 14 }} />
            </button>
          </div>
        </div>
      </header>

      {/* ── Content ────────────────────────────────────────────── */}
      <main className="pt-20 px-8 pb-12">

        
        {/* Global KPIs */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {kpis.map((kpi, i) => (
            <motion.div
              key={kpi.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="rounded-md p-5 relative overflow-hidden"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border:     '1px solid rgba(255,255,255,0.06)',
              }}
            >
              {/* Blob */}
              <div
                className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-10 -translate-y-6 translate-x-6 blur-2xl pointer-events-none"
                style={{ background: kpi.color }}
              />
              <div className="relative z-10">
                <div
                  className="w-9 h-9 rounded-md flex items-center justify-center mb-3"
                  style={{ background: `${kpi.color}18`, border: `1px solid ${kpi.color}28` }}
                >
                  <kpi.icon style={{ color: kpi.color, width: 18, height: 18 }} />
                </div>
                <p className="text-2xl font-bold text-white">{kpi.value}{kpi.suffix}</p>
                <p className="text-xs text-white/35 mt-0.5">{kpi.label}</p>
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
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: projects.length * 0.07 }}
              onClick={() => setShowModal(true)}
              className="rounded-md flex flex-col items-center justify-center gap-3 py-12
                         cursor-pointer hover:bg-white/[0.03] transition-all group"
              style={{
                background: 'rgba(255,255,255,0.02)',
                border:     '1px solid rgba(255,255,255,0.05)',
              }}
            >
              <div
                className="w-12 h-12 rounded-md flex items-center justify-center
                           transition-transform group-hover:scale-110"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                <Plus className="w-5 h-5 text-white/30 group-hover:text-white/60 transition-colors" />
              </div>
              <p className="text-sm text-white/25 group-hover:text-white/50 transition-colors">
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
        className="w-20 h-20 rounded-md flex items-center justify-center mb-6"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <FolderOpen className="w-9 h-9 text-white/25" />
      </div>
      <h3 className="text-xl font-bold text-white mb-2">Nenhum projeto ainda</h3>
      <p className="text-white/35 text-sm mb-6 max-w-xs">
        Crie seu primeiro projeto para começar a acompanhar implantações.
      </p>
      <button
        onClick={onNew}
        className="flex items-center gap-2 px-6 py-3 rounded-md font-semibold text-sm transition-all"
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