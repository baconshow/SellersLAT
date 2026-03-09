'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { differenceInDays, differenceInWeeks, format, eachMonthOfInterval } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  CheckCircle2, Clock, XCircle, Circle, AlertCircle,
  ChevronRight, Send, LogIn, LogOut, X,
} from 'lucide-react'
import { getProjectBySlug, addDistributorCommentDoc, getDistributorComments } from '@/lib/firestore'
import { useAuth } from '@/contexts/AuthContext'
import { applyTheme } from '@/lib/theme'
import type { Project, Distributor, DistributorComment, PhaseStatus } from '@/types'
import ProjectTimeline from '@/components/timeline/ProjectTimeline'
import toast from 'react-hot-toast'

// \u2500\u2500\u2500 Status configs \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

const DIST_STATUS: Record<string, { color: string; Icon: any; label: string }> = {
  integrated:  { color: '#22c55e', Icon: CheckCircle2, label: 'Integrado'    },
  pending:     { color: '#f59e0b', Icon: Clock,        label: 'Pendente'     },
  blocked:     { color: '#ef4444', Icon: XCircle,      label: 'Bloqueado'    },
  not_started: { color: '#ffffff30', Icon: Circle,     label: 'N\u00e3o iniciado' },
}

const PHASE_STATUS: Record<PhaseStatus, { color: string; icon: any; label: string }> = {
  completed:   { color: '#10B981', icon: CheckCircle2, label: 'Conclu\u00edda'     },
  in_progress: { color: 'var(--color-brand, #00D4AA)', icon: Clock, label: 'Em Andamento' },
  blocked:     { color: '#EF4444', icon: AlertCircle,  label: 'Bloqueada'     },
  pending:     { color: '#64748B', icon: Circle,       label: 'Pendente'      },
}

const EMPTY_DISTRIBUTORS: Distributor[] = []

// \u2500\u2500\u2500 Main Page \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

export default function SlugSharePage() {
  // ============================================================
  // 1. ALL HOOKS — no exceptions, no conditionals before this
  // ============================================================
  const { slug } = useParams<{ slug: string }>()
  const { user, loading: authLoading, signInWithGoogle, logout } = useAuth()

  const [project, setProject]       = useState<Project | null>(null)
  const [status, setStatus]         = useState<'loading' | 'invalid' | 'need_login' | 'unauthorized' | 'ready'>('loading')
  const [distFilter, setDistFilter] = useState<string | null>(null)

  // ============================================================
  // 2. ALL EFFECTS — no exceptions
  // ============================================================

  // Fetch project by slug
  useEffect(() => {
    if (!slug) return
    getProjectBySlug(slug).then(p => {
      if (!p) { setStatus('invalid'); return }
      setProject(p)
      applyTheme(p.clientColor, p.clientColorSecondary, p.clientColorRgb)
    })
  }, [slug])

  // Resolve auth state
  useEffect(() => {
    if (!project) return
    if (authLoading) return

    if (!user) {
      setStatus('need_login')
      return
    }

    const email = user.email?.toLowerCase()
    const authorized = (project.authorizedEmails || []).map((e: string) => e.toLowerCase())
    if (!email || !authorized.includes(email)) {
      setStatus('unauthorized')
      return
    }

    setStatus('ready')
  }, [project, user, authLoading])

  // ============================================================
  // 3. ALL DERIVED DATA (useMemo, useCallback, computed values)
  // ============================================================

  const accent       = project?.clientColor ?? '#00D4AA'
  const distributors = project?.distributors ?? EMPTY_DISTRIBUTORS
  const weekNumber   = project ? differenceInWeeks(new Date(), new Date(project.startDate)) + 1 : 0
  const daysRunning  = project ? differenceInDays(new Date(), new Date(project.startDate)) : 0

  const counts = useMemo(() => ({
    total:      distributors.length,
    integrated: distributors.filter(d => d.status === 'integrated').length,
    pending:    distributors.filter(d => d.status === 'pending').length,
    blocked:    distributors.filter(d => d.status === 'blocked').length,
  }), [distributors])

  const integrationPct = counts.total > 0 ? Math.round((counts.integrated / counts.total) * 100) : 0

  const grouped = useMemo(() => [
    ...distributors.filter(d => d.status === 'blocked'),
    ...distributors.filter(d => d.status === 'pending'),
    ...distributors.filter(d => d.status === 'not_started'),
    ...distributors.filter(d => d.status === 'integrated'),
  ], [distributors])

  const scrollToDistributors = useCallback((s: string) => {
    setDistFilter(prev => prev === s ? null : s)
    setTimeout(() => {
      document.getElementById('distribuidores-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 50)
  }, [])

  // ============================================================
  // 4. CONDITIONAL RENDERS — only after ALL hooks above
  // ============================================================

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-5 h-5 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
      </div>
    )
  }

  if (status === 'invalid') {
    return (
      <GateScreen>
        <h2 className="text-lg font-bold text-white">Link inativo ou n\u00e3o encontrado</h2>
        <p className="text-sm mt-2 max-w-md" style={{ color: 'rgba(255,255,255,0.4)' }}>
          Este link de compartilhamento n\u00e3o existe ou foi desativado pelo respons\u00e1vel do projeto.
        </p>
      </GateScreen>
    )
  }

  if (status === 'need_login') {
    return (
      <GateScreen>
        <h2 className="text-2xl font-bold" style={{ color: accent }}>
          {project?.clientName}
        </h2>
        <p className="text-sm mt-3 max-w-md" style={{ color: 'rgba(255,255,255,0.4)' }}>
          Acesso restrito a convidados autorizados
        </p>
        <button
          onClick={signInWithGoogle}
          className="flex items-center gap-2 px-6 py-3 rounded text-sm font-bold transition-all mt-6"
          style={{ background: accent, color: '#050508' }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
        >
          <LogIn style={{ width: 16, height: 16 }} />
          Entrar com Google para continuar
        </button>
      </GateScreen>
    )
  }

  if (status === 'unauthorized') {
    return (
      <GateScreen>
        <h2 className="text-lg font-bold text-white">Acesso n\u00e3o autorizado</h2>
        <p className="text-sm mt-2 max-w-md" style={{ color: 'rgba(255,255,255,0.4)' }}>
          O email <span className="text-white/70 font-medium">{user?.email}</span> n\u00e3o tem
          permiss\u00e3o para acessar este projeto.
        </p>
        <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.25)' }}>
          Entre em contato com a Sellers para solicitar acesso.
        </p>
        <button
          onClick={logout}
          className="flex items-center gap-2 px-5 py-2.5 rounded text-xs font-bold transition-all mt-5"
          style={{ border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)' }}
          onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.5)')}
        >
          <LogOut style={{ width: 14, height: 14 }} />
          Sair
        </button>
      </GateScreen>
    )
  }

  // ============================================================
  // 5. MAIN RENDER — status === 'ready', project is guaranteed
  // ============================================================

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-5xl mx-auto px-6 py-8 space-y-8"
    >
      {/* A) Header do projeto */}
      <div>
        <h1 className="text-3xl font-bold" style={{ color: accent }}>
          {project!.clientName}
        </h1>
        <p className="text-sm mt-1.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
          Semana {weekNumber} · {daysRunning} dias de projeto
        </p>
        {/* Barra de progresso */}
        <div className="mt-4 flex items-center gap-3">
          <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${integrationPct}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="h-full rounded-full"
              style={{ background: `linear-gradient(90deg, ${accent}, ${project!.clientColorSecondary || accent})` }}
            />
          </div>
          <span className="text-xs font-bold shrink-0" style={{ color: accent }}>
            {integrationPct}%
          </span>
        </div>
        <p className="text-[10px] mt-1" style={{ color: 'rgba(255,255,255,0.2)' }}>
          {counts.integrated} de {counts.total} distribuidores integrados
        </p>
      </div>

      {/* B) KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Total */}
        <div
          className="group rounded p-4 relative overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div
            className="absolute top-0 right-0 w-32 h-32 opacity-10 rounded-full -translate-y-16 translate-x-16 blur-3xl transition-opacity group-hover:opacity-20"
            style={{ backgroundColor: accent }}
          />
          <p className="text-[10px] uppercase tracking-widest font-semibold relative z-10" style={{ color: 'rgba(255,255,255,0.3)' }}>
            Total
          </p>
          <p className="text-2xl font-bold mt-1 relative z-10" style={{ color: 'rgba(255,255,255,0.6)' }}>
            {counts.total}
          </p>
          <p className="text-[10px] mt-1 relative z-10" style={{ color: 'rgba(255,255,255,0.2)' }}>
            {weekNumber} semanas de projeto
          </p>
        </div>

        {/* Integrados */}
        <div
          className="group rounded p-4 relative overflow-hidden"
          style={{ background: 'rgba(34,197,94,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div
            className="absolute top-0 right-0 w-32 h-32 opacity-10 rounded-full -translate-y-16 translate-x-16 blur-3xl transition-opacity group-hover:opacity-20"
            style={{ backgroundColor: '#10B981' }}
          />
          <p className="text-[10px] uppercase tracking-widest font-semibold relative z-10" style={{ color: 'rgba(255,255,255,0.3)' }}>
            Integrados
          </p>
          <p className="text-2xl font-bold mt-1 relative z-10" style={{ color: '#22c55e' }}>
            {counts.integrated}
          </p>
          <p className="text-[10px] mt-1 relative z-10" style={{ color: '#10B981' }}>
            {integrationPct}% conclu\u00eddo
          </p>
        </div>

        {/* Pendentes */}
        <div
          className="group rounded p-4 relative overflow-hidden cursor-pointer transition-all hover:border-[#f59e0b]/20"
          style={{ background: 'rgba(245,158,11,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
          onClick={() => scrollToDistributors('pending')}
        >
          <div
            className="absolute top-0 right-0 w-32 h-32 opacity-10 rounded-full -translate-y-16 translate-x-16 blur-3xl transition-opacity group-hover:opacity-20"
            style={{ backgroundColor: '#F59E0B' }}
          />
          <p className="text-[10px] uppercase tracking-widest font-semibold relative z-10" style={{ color: 'rgba(255,255,255,0.3)' }}>
            Pendentes
          </p>
          <p className="text-2xl font-bold mt-1 relative z-10" style={{ color: '#f59e0b' }}>
            {counts.pending}
          </p>
          <ChevronRight
            className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ width: 14, height: 14, color: '#f59e0b' }}
          />
        </div>

        {/* Bloqueados */}
        <div
          className="group rounded p-4 relative overflow-hidden cursor-pointer transition-all hover:border-[#ef4444]/20"
          style={{ background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
          onClick={() => scrollToDistributors('blocked')}
        >
          <div
            className="absolute top-0 right-0 w-32 h-32 opacity-10 rounded-full -translate-y-16 translate-x-16 blur-3xl transition-opacity group-hover:opacity-20"
            style={{ backgroundColor: '#EF4444' }}
          />
          <p className="text-[10px] uppercase tracking-widest font-semibold relative z-10" style={{ color: 'rgba(255,255,255,0.3)' }}>
            Bloqueados
          </p>
          <p className="text-2xl font-bold mt-1 relative z-10" style={{ color: '#ef4444' }}>
            {counts.blocked}
          </p>
          <ChevronRight
            className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ width: 14, height: 14, color: '#ef4444' }}
          />
        </div>
      </div>

      {/* B2) Evolução das Integrações */}
      {(project!.weeklyUpdates?.length ?? 0) > 0 && (
        <section>
          <h3 style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.15em',
            color: 'rgba(255,255,255,0.3)',
            textTransform: 'uppercase',
            marginBottom: 16,
          }}>
            Evolução das Integrações
          </h3>
          <div style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 5,
            padding: 20,
          }}>
            <ProjectTimeline project={project!} />
          </div>
        </section>
      )}

      {/* C) Gantt read-only */}
      {project!.startDate && project!.endDate && project!.phases.length > 0 && (
        <SectionCard title="Timeline" accent={accent}>
          <ReadOnlyGantt project={project!} />
        </SectionCard>
      )}

      {/* D) Distribuidores */}
      <div id="distribuidores-section">
        <SectionCard title="Distribuidores" accent={accent}>
          {/* Filter pills */}
          {distFilter && (
            <div className="flex items-center gap-2 -mt-2 mb-1">
              <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>Filtro:</span>
              <button
                onClick={() => setDistFilter(null)}
                className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold transition-all"
                style={{
                  background: `${DIST_STATUS[distFilter]?.color ?? '#fff'}20`,
                  color: DIST_STATUS[distFilter]?.color ?? '#fff',
                  border: `1px solid ${DIST_STATUS[distFilter]?.color ?? '#fff'}40`,
                }}
              >
                {DIST_STATUS[distFilter]?.label}
                <X style={{ width: 10, height: 10 }} />
              </button>
            </div>
          )}
          <div className="space-y-2">
            {(distFilter ? grouped.filter(d => d.status === distFilter) : grouped).map(d => (
              <DistributorRow
                key={d.id}
                distributor={d}
                projectId={project!.id}
                accent={accent}
                userEmail={user?.email ?? ''}
                userName={user?.displayName ?? ''}
              />
            ))}
            {grouped.length === 0 && (
              <p className="text-xs text-center py-8" style={{ color: 'rgba(255,255,255,0.2)' }}>
                Nenhum distribuidor cadastrado.
              </p>
            )}
          </div>
        </SectionCard>
      </div>
    </motion.div>
  )
}

// \u2500\u2500\u2500 Gate Screen \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

function GateScreen({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
      <div
        className="w-14 h-14 rounded flex items-center justify-center mb-5"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <span
          style={{
            fontFamily: 'Conthrax, Orbitron, "Share Tech Mono", monospace',
            fontSize: 14,
            fontWeight: 700,
            color: '#00D4AA',
            letterSpacing: 2,
          }}
        >
          LAT
        </span>
      </div>
      {children}
    </div>
  )
}

// \u2500\u2500\u2500 Section Card \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

function SectionCard({ title, accent, children }: { title: string; accent: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded p-5 space-y-4"
      style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      <div className="flex items-center gap-2 pb-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <span style={{ color: accent, fontSize: 10 }}>\u25cf</span>
        <p className="text-xs font-bold tracking-wide text-white">{title}</p>
      </div>
      {children}
    </div>
  )
}

// \u2500\u2500\u2500 Read-only Gantt \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

function ReadOnlyGantt({ project }: { project: Project }) {
  const projectStart = new Date(project.startDate)
  const projectEnd   = new Date(project.endDate)
  const totalDays    = differenceInDays(projectEnd, projectStart) || 1
  const today        = new Date()
  const months       = eachMonthOfInterval({ start: projectStart, end: projectEnd })
  const isActive     = today >= projectStart && today <= projectEnd
  const LABEL_WIDTH  = 180

  const pct      = (d: Date) => Math.min(100, Math.max(0, (differenceInDays(d, projectStart) / totalDays) * 100))
  const widthPct = (s: Date, e: Date) => Math.max(1, (differenceInDays(e, s) / totalDays) * 100)
  const todayPct = pct(today)

  return (
    <div className="w-full overflow-x-auto">
      <div className="min-w-[600px]">
        {/* Legend */}
        <div className="flex items-center justify-end gap-5 mb-3 px-1">
          {Object.entries(PHASE_STATUS).map(([s, cfg]) => (
            <span key={s} className="flex items-center gap-1.5 text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
              <cfg.icon style={{ width: 10, height: 10, color: cfg.color }} />
              {cfg.label}
            </span>
          ))}
        </div>

        {/* Month labels */}
        <div className="relative mb-4 h-5" style={{ marginLeft: LABEL_WIDTH }}>
          {months.map(month => (
            <span
              key={month.toISOString()}
              className="absolute text-[11px] uppercase tracking-widest font-semibold"
              style={{ left: `${pct(month < projectStart ? projectStart : month)}%`, color: 'rgba(255,255,255,0.2)' }}
            >
              {format(month, 'MMM', { locale: ptBR })}
            </span>
          ))}
        </div>

        {/* Phase rows */}
        <div className="space-y-2 relative">
          {/* Today line */}
          {isActive && (
            <div
              className="absolute top-0 bottom-0 w-px pointer-events-none"
              style={{
                left: `calc(${LABEL_WIDTH}px + ${todayPct / 100} * (100% - ${LABEL_WIDTH}px))`,
                background: 'var(--color-brand, #00D4AA)',
                opacity: 0.7,
                zIndex: 10,
              }}
            >
              <div
                className="absolute -top-6 left-1/2 -translate-x-1/2 text-[9px] font-black px-2 py-0.5 rounded whitespace-nowrap"
                style={{ background: 'var(--color-brand, #00D4AA)', color: '#050508', borderRadius: 5 }}
              >
                HOJE
              </div>
            </div>
          )}

          {project.phases.map((phase, index) => {
            const pStart = new Date(phase.startDate)
            const pEnd   = new Date(phase.endDate)
            const left   = pct(pStart)
            const width  = widthPct(pStart, pEnd)
            const active = phase.status === 'in_progress'
            const cfg    = PHASE_STATUS[phase.status]

            const barStyle = (() => {
              switch (phase.status) {
                case 'completed':
                  return { background: `linear-gradient(90deg, ${cfg.color}cc, ${cfg.color}55)`, borderRadius: 5 }
                case 'in_progress':
                  return {
                    background: 'linear-gradient(90deg, var(--color-brand,#00D4AA), var(--color-brand-secondary,#8B5CF6))',
                    boxShadow: '0 0 18px var(--color-brand-glow, rgba(0,212,170,0.35))',
                    borderRadius: 5,
                  }
                case 'blocked':
                  return { background: `linear-gradient(90deg, ${cfg.color}bb, ${cfg.color}66)`, borderRadius: 5 }
                default:
                  return { background: `linear-gradient(90deg, ${cfg.color}55, ${cfg.color}25)`, border: `1px solid ${cfg.color}60`, borderRadius: 5 }
              }
            })()

            return (
              <motion.div
                key={phase.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.04 }}
                className="flex items-center h-10"
              >
                <div className="flex-shrink-0 flex items-center gap-2 pr-4" style={{ width: LABEL_WIDTH }}>
                  <cfg.icon style={{ width: 13, height: 13, color: cfg.color, flexShrink: 0 }} />
                  <span
                    className="text-xs truncate"
                    style={{ color: active ? '#fff' : 'rgba(255,255,255,0.5)', fontWeight: active ? 600 : 400 }}
                  >
                    {phase.name}
                  </span>
                </div>
                <div className="flex-1 relative h-full flex items-center">
                  <div
                    style={{
                      position: 'absolute',
                      left: `${left}%`,
                      width: `${width}%`,
                      height: 30,
                      ...barStyle,
                    }}
                  >
                    {width > 8 && (
                      <div className="absolute inset-0 flex items-center justify-between px-2.5">
                        <span style={{ fontSize: 10, fontWeight: 500, color: active ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.5)' }}>
                          {format(pStart, 'dd/MM')}
                        </span>
                        {width > 15 && (
                          <span style={{ fontSize: 10, fontWeight: 500, color: active ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.5)' }}>
                            {format(pEnd, 'dd/MM')}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// \u2500\u2500\u2500 Distributor Row \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

function DistributorRow({
  distributor,
  projectId,
  accent,
  userEmail,
  userName,
}: {
  distributor: Distributor
  projectId: string
  accent: string
  userEmail: string
  userName: string
}) {
  // All hooks at top of this sub-component
  const [expanded, setExpanded]   = useState(false)
  const [comments, setComments]   = useState<DistributorComment[]>([])
  const [loadingComments, setLoadingComments] = useState(false)
  const [comment, setComment]     = useState('')
  const [sending, setSending]     = useState(false)

  // Derived
  const cfg = DIST_STATUS[distributor.status] ?? DIST_STATUS.not_started
  const canComment = distributor.status === 'blocked' || distributor.status === 'pending'

  // Functions
  const loadComments = async () => {
    setLoadingComments(true)
    try {
      const c = await getDistributorComments(projectId, distributor.id)
      setComments(c)
    } catch { setComments([]) }
    finally { setLoadingComments(false) }
  }

  const toggleExpand = () => {
    const next = !expanded
    setExpanded(next)
    if (next) loadComments()
  }

  const handleSend = async () => {
    if (!comment.trim()) return
    setSending(true)
    try {
      await addDistributorCommentDoc(projectId, distributor.id, {
        name: userName,
        email: userEmail,
        text: comment.trim(),
      })
      setComment('')
      toast.success('Coment\u00e1rio enviado.')
      await loadComments()
    } catch {
      toast.error('Erro ao enviar coment\u00e1rio.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div
      className="rounded overflow-hidden"
      style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      {/* Main row */}
      <div className="flex items-center gap-3 px-4 py-3">
        <cfg.Icon style={{ width: 14, height: 14, color: cfg.color, flexShrink: 0 }} />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-white truncate">{distributor.name}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px]" style={{ color: cfg.color }}>{cfg.label}</span>
            {distributor.connectionType && (
              <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.2)' }}>{distributor.connectionType}</span>
            )}
          </div>
        </div>
        {canComment && (
          <button
            onClick={toggleExpand}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded text-[10px] font-medium transition-all"
            style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)' }}
          >
            <ChevronRight
              style={{
                width: 10, height: 10,
                transform: expanded ? 'rotate(90deg)' : 'none',
                transition: 'transform 150ms',
              }}
            />
            Comentar
          </button>
        )}
      </div>

      {/* Blocker description */}
      {canComment && distributor.blockerDescription && (
        <div className="px-4 pb-2">
          <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.25)' }}>
            {distributor.blockerDescription}
          </p>
        </div>
      )}

      {/* Expandable comments panel */}
      <AnimatePresence>
        {expanded && canComment && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ borderTop: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}
          >
            <div className="px-4 py-3 space-y-3">
              {/* Existing comments from subcollection */}
              {loadingComments ? (
                <div className="flex items-center justify-center py-3">
                  <div className="w-4 h-4 border-2 border-white/10 border-t-white/40 rounded-full animate-spin" />
                </div>
              ) : comments.length > 0 ? (
                <div
                  className="space-y-2 max-h-48 overflow-y-auto"
                  style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}
                >
                  {comments.map((c: DistributorComment) => (
                    <div
                      key={c.id}
                      className="flex items-start gap-3 px-3 py-2.5 rounded"
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 5 }}
                    >
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold"
                        style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }}
                      >
                        {c.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-semibold text-white/70">{c.name}</span>
                          <span className="text-[9px]" style={{ color: 'rgba(255,255,255,0.2)' }}>
                            {format(new Date(c.timestamp), "dd/MM '\u00e0s' HH:mm", { locale: ptBR })}
                          </span>
                        </div>
                        <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.5)' }}>{c.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}

              {/* New comment input */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  placeholder="Digite seu coment\u00e1rio..."
                  onKeyDown={e => { if (e.key === 'Enter') handleSend() }}
                  className="flex-1 text-xs outline-none"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 5,
                    color: 'rgba(255,255,255,0.85)',
                    padding: '8px 12px',
                  }}
                />
                <button
                  onClick={handleSend}
                  disabled={sending || !comment.trim()}
                  className="flex items-center gap-1.5 px-3 py-2 rounded text-[11px] font-bold transition-all disabled:opacity-30"
                  style={{ background: `${accent}20`, color: accent }}
                >
                  Enviar
                  <Send style={{ width: 12, height: 12 }} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
