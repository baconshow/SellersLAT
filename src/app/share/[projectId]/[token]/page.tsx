'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { differenceInDays, differenceInWeeks, format, eachMonthOfInterval } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  CheckCircle2, Clock, XCircle, Circle, AlertCircle,
  ChevronRight, Send, LogIn,
} from 'lucide-react'
import { getProjectByShareToken, addDistributorComment } from '@/lib/firestore'
import { useAuth } from '@/contexts/AuthContext'
import { applyTheme } from '@/lib/theme'
import type { Project, Distributor, DistributorComment, PhaseStatus } from '@/types'
import toast from 'react-hot-toast'

// ─── Status configs ──────────────────────────────────────────────────────────

const DIST_STATUS: Record<string, { color: string; Icon: any; label: string }> = {
  integrated:  { color: '#22c55e', Icon: CheckCircle2, label: 'Integrado'    },
  pending:     { color: '#f59e0b', Icon: Clock,        label: 'Pendente'     },
  blocked:     { color: '#ef4444', Icon: XCircle,      label: 'Bloqueado'    },
  not_started: { color: '#ffffff30', Icon: Circle,     label: 'Não iniciado' },
}

const PHASE_STATUS: Record<PhaseStatus, { color: string; icon: any; label: string }> = {
  completed:   { color: '#10B981', icon: CheckCircle2, label: 'Concluída'     },
  in_progress: { color: 'var(--color-brand, #00D4AA)', icon: Clock, label: 'Em Andamento' },
  blocked:     { color: '#EF4444', icon: AlertCircle,  label: 'Bloqueada'     },
  pending:     { color: '#64748B', icon: Circle,       label: 'Pendente'      },
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function SharePage() {
  const { projectId, token } = useParams<{ projectId: string; token: string }>()
  const { user, loading: authLoading, signInWithGoogle } = useAuth()

  const [project, setProject] = useState<Project | null>(null)
  const [status, setStatus]   = useState<'loading' | 'invalid' | 'need_login' | 'unauthorized' | 'ready'>('loading')

  // Fetch project by token
  useEffect(() => {
    if (!projectId || !token) return
    getProjectByShareToken(projectId, token).then(p => {
      if (!p) { setStatus('invalid'); return }
      setProject(p)
      applyTheme(p.clientColor, p.clientColorSecondary, p.clientColorRgb)
    })
  }, [projectId, token])

  // Resolve auth state
  useEffect(() => {
    if (!project) return
    if (authLoading) return

    if (!user) {
      setStatus('need_login')
      return
    }

    const email = user.email?.toLowerCase()
    const authorized = (project.authorizedEmails || []).map(e => e.toLowerCase())
    if (!email || !authorized.includes(email)) {
      setStatus('unauthorized')
      return
    }

    setStatus('ready')
  }, [project, user, authLoading])

  // ── Gate screens ──

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-5 h-5 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
      </div>
    )
  }

  if (status === 'invalid') {
    return (
      <GateScreen
        title="Link inativo ou expirado"
        subtitle="Este link de compartilhamento não existe ou foi desativado pelo responsável do projeto."
      />
    )
  }

  if (status === 'need_login') {
    return (
      <GateScreen
        title={`Acesse o projeto ${project?.clientName ?? ''}`}
        subtitle="Faça login com Google para visualizar as informações do projeto."
      >
        <button
          onClick={signInWithGoogle}
          className="flex items-center gap-2 px-6 py-3 rounded text-sm font-bold transition-all mt-6"
          style={{
            background: project?.clientColor ?? '#00D4AA',
            color: '#050508',
          }}
        >
          <LogIn style={{ width: 16, height: 16 }} />
          Entrar com Google para continuar
        </button>
      </GateScreen>
    )
  }

  if (status === 'unauthorized') {
    return (
      <GateScreen
        title="Acesso não autorizado"
        subtitle={`O email ${user?.email ?? ''} não tem permissão para acessar este projeto. Solicite acesso ao responsável.`}
      />
    )
  }

  // ── Ready — render project ──

  const distributors = project!.distributors || []
  const accent       = project!.clientColor || '#00D4AA'
  const weekNumber   = differenceInWeeks(new Date(), new Date(project!.startDate)) + 1

  const counts = {
    total:      distributors.length,
    integrated: distributors.filter(d => d.status === 'integrated').length,
    pending:    distributors.filter(d => d.status === 'pending').length,
    blocked:    distributors.filter(d => d.status === 'blocked').length,
  }

  // Group distributors: blocked → pending → not_started → integrated
  const grouped = [
    ...distributors.filter(d => d.status === 'blocked'),
    ...distributors.filter(d => d.status === 'pending'),
    ...distributors.filter(d => d.status === 'not_started'),
    ...distributors.filter(d => d.status === 'integrated'),
  ]

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-5xl mx-auto px-6 py-8 space-y-8"
    >
      {/* A) Header do projeto */}
      <div>
        <h1 className="text-2xl font-bold text-white">{project!.clientName}</h1>
        <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>
          Semana {weekNumber} · {differenceInDays(new Date(), new Date(project!.startDate))} dias de projeto
        </p>
      </div>

      {/* B) KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {([
          { label: 'Total',       value: counts.total,      color: 'rgba(255,255,255,0.6)' },
          { label: 'Integrados',  value: counts.integrated, color: '#22c55e' },
          { label: 'Pendentes',   value: counts.pending,    color: '#f59e0b' },
          { label: 'Bloqueados',  value: counts.blocked,    color: '#ef4444' },
        ] as const).map(kpi => (
          <div
            key={kpi.label}
            className="rounded p-4"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <p className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: 'rgba(255,255,255,0.3)' }}>
              {kpi.label}
            </p>
            <p className="text-2xl font-bold mt-1" style={{ color: kpi.color }}>
              {kpi.value}
            </p>
          </div>
        ))}
      </div>

      {/* C) Gantt read-only */}
      {project!.startDate && project!.endDate && (
        <SectionCard title="Timeline" accent={accent}>
          <ReadOnlyGantt project={project!} />
        </SectionCard>
      )}

      {/* D) Distribuidores */}
      <SectionCard title="Distribuidores" accent={accent}>
        <div className="space-y-2">
          {grouped.map(d => (
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
    </motion.div>
  )
}

// ─── Gate Screen ─────────────────────────────────────────────────────────────

function GateScreen({ title, subtitle, children }: { title: string; subtitle: string; children?: React.ReactNode }) {
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
      <h2 className="text-lg font-bold text-white">{title}</h2>
      <p className="text-sm mt-2 max-w-md" style={{ color: 'rgba(255,255,255,0.35)' }}>{subtitle}</p>
      {children}
    </div>
  )
}

// ─── Section Card ────────────────────────────────────────────────────────────

function SectionCard({ title, accent, children }: { title: string; accent: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded p-5 space-y-4"
      style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      <p className="text-xs font-bold tracking-wide text-white pb-3"
         style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        {title}
      </p>
      {children}
    </div>
  )
}

// ─── Read-only Gantt ─────────────────────────────────────────────────────────

function ReadOnlyGantt({ project }: { project: Project }) {
  if (!project.startDate || !project.endDate) return null

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

// ─── Distributor Row ─────────────────────────────────────────────────────────

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
  const [expanded, setExpanded]   = useState(false)
  const [comment, setComment]     = useState('')
  const [sending, setSending]     = useState(false)
  const cfg = DIST_STATUS[distributor.status] ?? DIST_STATUS.not_started
  const canComment = distributor.status === 'blocked' || distributor.status === 'pending'

  const handleSend = async () => {
    if (!comment.trim()) return
    setSending(true)
    try {
      await addDistributorComment(projectId, distributor.id, {
        name: userName,
        email: userEmail,
        text: comment.trim(),
      })
      setComment('')
      toast.success('Comentário enviado.')
    } catch {
      toast.error('Erro ao enviar comentário.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div
      className="rounded overflow-hidden"
      style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
    >
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
            onClick={() => setExpanded(!expanded)}
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
            {(distributor.comments?.length ?? 0) > 0
              ? `${distributor.comments!.length} comentário${distributor.comments!.length > 1 ? 's' : ''}`
              : 'Comentar'}
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
              {/* Existing comments */}
              {(distributor.comments || []).length > 0 && (
                <div className="space-y-2 max-h-48 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}>
                  {distributor.comments!.map((c: DistributorComment) => (
                    <div key={c.id} className="px-3 py-2 rounded" style={{ background: 'rgba(255,255,255,0.03)' }}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[11px] font-semibold text-white/70">{c.name}</span>
                        <span className="text-[9px]" style={{ color: 'rgba(255,255,255,0.2)' }}>
                          {format(new Date(c.timestamp), "dd/MM 'às' HH:mm", { locale: ptBR })}
                        </span>
                      </div>
                      <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>{c.text}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* New comment input */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  placeholder="Escreva um comentário..."
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
                  className="flex items-center justify-center w-9 h-9 rounded transition-all disabled:opacity-30"
                  style={{ background: `${accent}20`, color: accent }}
                >
                  <Send style={{ width: 14, height: 14 }} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
