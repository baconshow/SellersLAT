'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  differenceInDays, format, eachMonthOfInterval
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  CheckCircle2, Clock, AlertCircle, Circle, Edit2, Check, X
} from 'lucide-react'
import type { Project, ProjectPhase, PhaseStatus } from '@/types'
import { updateProject } from '@/lib/firestore'
import toast from 'react-hot-toast'

interface Props { project: Project }

const STATUS_CONFIG: Record<PhaseStatus, {
  color: string
  icon: React.ElementType
  label: string
}> = {
  completed:   { color: '#10B981', icon: CheckCircle2, label: 'Concluída'     },
  in_progress: { color: 'var(--color-brand, #00D4AA)', icon: Clock, label: 'Em Andamento' },
  blocked:     { color: '#EF4444', icon: AlertCircle,  label: 'Bloqueada'     },
  pending:     { color: 'rgba(255,255,255,0.2)', icon: Circle, label: 'Pendente' },
}

export default function GanttChart({ project }: Props) {
  const [hoveredPhase, setHoveredPhase]   = useState<string | null>(null)
  const [editingPhase, setEditingPhase]   = useState<string | null>(null)
  const [editValue,    setEditValue]      = useState('')

  const projectStart = new Date(project.startDate)
  const projectEnd   = new Date(project.endDate)
  const totalDays    = differenceInDays(projectEnd, projectStart) || 1
  const today        = new Date()

  const months = eachMonthOfInterval({ start: projectStart, end: projectEnd })

  const pct = (date: Date) =>
    Math.min(100, Math.max(0, (differenceInDays(date, projectStart) / totalDays) * 100))

  const widthPct = (start: Date, end: Date) =>
    Math.max(1, (differenceInDays(end, start) / totalDays) * 100)

  const todayPct       = pct(today)
  const isActiveProject = today >= projectStart && today <= projectEnd

  const LABEL_WIDTH = 200

  /* ── inline rename ── */
  const startEdit = (phase: ProjectPhase) => {
    setEditingPhase(phase.id)
    setEditValue(phase.name)
  }

  const saveEdit = async (phaseId: string) => {
    if (!editValue.trim()) { setEditingPhase(null); return }
    const updated = project.phases.map(p =>
      p.id === phaseId ? { ...p, name: editValue.trim() } : p
    )
    try {
      await updateProject(project.id, { phases: updated })
      toast.success('Fase renomeada')
    } catch {
      toast.error('Erro ao salvar')
    }
    setEditingPhase(null)
  }

  /* ── status toggle ── */
  const changeStatus = async (phaseId: string, status: PhaseStatus) => {
    const updated = project.phases.map(p =>
      p.id === phaseId ? { ...p, status } : p
    )
    try {
      await updateProject(project.id, {
        phases: updated,
        ...(status === 'in_progress' ? { currentPhaseId: phaseId } : {}),
      })
    } catch {
      toast.error('Erro ao atualizar status')
    }
  }

  return (
    <div className="w-full rounded-2xl overflow-hidden"
         style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>

      {/* ── Header ── */}
      <div className="px-6 py-4 flex items-center justify-between"
           style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div>
          <h2 className="text-base font-bold text-white">Cronograma</h2>
          <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
            {format(projectStart, "d MMM yyyy", { locale: ptBR })}
            {' → '}
            {format(projectEnd,   "d MMM yyyy", { locale: ptBR })}
          </p>
        </div>
        <div className="flex items-center gap-4">
          {Object.entries(STATUS_CONFIG).map(([s, cfg]) => (
            <span key={s} className="flex items-center gap-1.5 text-sm"
                  style={{ color: 'rgba(255,255,255,0.35)' }}>
              <cfg.icon style={{ width: 12, height: 12, color: cfg.color }} />
              {cfg.label}
            </span>
          ))}
        </div>
      </div>

      <div className="p-6 overflow-x-auto">
        <div className="min-w-[800px]">
          {/* ── Month labels ── */}
          <div className="relative mb-4 h-5" style={{ marginLeft: `${LABEL_WIDTH}px` }}>
            {months.map(month => {
              const left = pct(month < projectStart ? projectStart : month)
              return (
                <span
                  key={month.toISOString()}
                  className="absolute text-[12px] uppercase tracking-widest font-medium"
                  style={{ left: `${left}%`, color: 'rgba(255,255,255,0.25)' }}
                >
                  {format(month, 'MMM', { locale: ptBR })}
                </span>
              )
            })}
          </div>

          {/* ── Rows ── */}
          <div className="space-y-2 relative">

            {/* Today marker */}
            {isActiveProject && (
              <div
                className="absolute top-0 bottom-0 w-px z-20 pointer-events-none"
                style={{
                  left: `calc(${LABEL_WIDTH}px + ${todayPct / 100} * (100% - ${LABEL_WIDTH}px))`,
                  background: 'var(--color-brand, #00D4AA)',
                  boxShadow: '0 0 8px var(--color-brand-glow, rgba(0,212,170,0.4))',
                  opacity: 0.8,
                }}
              >
                <div
                  className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-black px-1.5 py-0.5 rounded-md whitespace-nowrap"
                  style={{ background: 'var(--color-brand, #00D4AA)', color: '#050508' }}
                >
                  HOJE
                </div>
              </div>
            )}

            {project.phases.map((phase, index) => {
              const pStart  = new Date(phase.startDate)
              const pEnd    = new Date(phase.endDate)
              const left    = pct(pStart)
              const width   = widthPct(pStart, pEnd)
              const isActive  = phase.status === 'in_progress'
              const isHovered = hoveredPhase === phase.id
              const cfg       = STATUS_CONFIG[phase.status]

              return (
                <motion.div
                  key={phase.id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center h-11 relative group"
                  onMouseEnter={() => setHoveredPhase(phase.id)}
                  onMouseLeave={() => setHoveredPhase(null)}
                >
                  {/* Phase name col */}
                  <div className="flex-shrink-0 flex items-center gap-2 pr-4" style={{ width: `${LABEL_WIDTH}px` }}>
                    {editingPhase === phase.id ? (
                      <div className="flex items-center gap-1 flex-1">
                        <input
                          value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter')  saveEdit(phase.id)
                            if (e.key === 'Escape') setEditingPhase(null)
                          }}
                          autoFocus
                          className="flex-1 rounded-lg px-2 py-1 text-sm text-white outline-none min-w-0"
                          style={{
                            background: 'rgba(255,255,255,0.1)',
                            border: '1px solid rgba(255,255,255,0.2)',
                          }}
                        />
                        <button onClick={() => saveEdit(phase.id)}
                          className="p-1 rounded text-emerald-400 hover:bg-white/10">
                          <Check style={{ width: 14, height: 14 }} />
                        </button>
                        <button onClick={() => setEditingPhase(null)}
                          className="p-1 rounded text-red-400 hover:bg-white/10">
                          <X style={{ width: 14, height: 14 }} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <cfg.icon style={{ width: 15, height: 15, color: cfg.color, flexShrink: 0 }} />
                        <span className="text-sm truncate flex-1"
                              style={{ color: isActive ? '#fff' : 'rgba(255,255,255,0.55)',
                                       fontWeight: isActive ? 600 : 400 }}>
                          {phase.name}
                        </span>
                        <button
                          onClick={() => startEdit(phase)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-white/10"
                          style={{ color: 'rgba(255,255,255,0.3)' }}
                        >
                          <Edit2 style={{ width: 12, height: 12 }} />
                        </button>
                      </>
                    )}
                  </div>

                  {/* Bar track */}
                  <div className="flex-1 relative h-full flex items-center">
                    <motion.div
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{ delay: index * 0.05 + 0.1, duration: 0.5, ease: 'easeOut' }}
                      style={{
                        position: 'absolute',
                        left:   `${left}%`,
                        width:  `${width}%`,
                        originX: 0,
                        height: 36,
                        borderRadius: 6,
                        overflow: 'hidden',
                        cursor: 'pointer',
                      }}
                    >
                      {/* Bar fill */}
                      <div
                        className="w-full h-full relative"
                        style={
                          phase.status === 'completed'
                            ? { background: `linear-gradient(90deg, ${cfg.color}dd, ${cfg.color}88)` }
                            : phase.status === 'in_progress'
                            ? { background: 'linear-gradient(90deg, var(--color-brand,#00D4AA), var(--color-brand-secondary,#8B5CF6))',
                                boxShadow: '0 0 16px var(--color-brand-glow, rgba(0,212,170,0.4))' }
                            : phase.status === 'blocked'
                            ? { background: `linear-gradient(90deg, ${cfg.color}55, ${cfg.color}22)` }
                            : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)' }
                        }
                      >
                        {/* Top Highlight Highlight */}
                        <div className="absolute top-0 left-0 right-0 h-[1px] bg-white/15 rounded-[inherit]" />

                        {/* Shimmer on active */}
                        {isActive && (
                          <div
                            className="absolute inset-0"
                            style={{
                              background: 'linear-gradient(90deg,transparent 0%,rgba(255,255,255,0.12) 50%,transparent 100%)',
                              backgroundSize: '200% 100%',
                              animation: 'shimmer 2s linear infinite',
                            }}
                          />
                        )}

                        {/* Bottom glow edge */}
                        {isActive && (
                          <div
                            className="absolute bottom-0 left-0 right-0"
                            style={{
                              height: 3,
                              background: 'linear-gradient(90deg, var(--color-brand,#00D4AA), transparent)',
                              animation: 'pulse-glow 2.5s ease-in-out infinite',
                            }}
                          />
                        )}

                        {/* Dates inside bar */}
                        {width > 12 && (
                          <div className="absolute inset-0 flex items-center justify-between px-3">
                            <span className="text-[11px] font-medium"
                                  style={{ color: isActive ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.5)' }}>
                              {format(pStart, 'dd/MM')}
                            </span>
                            <span className="text-[11px] font-medium"
                                  style={{ color: isActive ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.5)' }}>
                              {format(pEnd, 'dd/MM')}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* "Estamos Aqui" badge */}
                      {isActive && (
                        <motion.div
                          animate={{ y: [0, -4, 0] }}
                          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                          style={{
                            position: 'absolute',
                            top: -28,
                            left: '50%',
                            transform: 'translateX(-50%)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            pointerEvents: 'none',
                          }}
                        >
                          <div
                            className="text-[10px] font-black px-2 py-0.5 rounded-full whitespace-nowrap"
                            style={{ background: 'var(--color-brand,#00D4AA)', color: '#050508' }}
                          >
                            📍 ESTAMOS AQUI
                          </div>
                          <div style={{ width: 1, height: 6, background: 'var(--color-brand,#00D4AA)', marginTop: 2 }} />
                        </motion.div>
                      )}
                    </motion.div>

                    {/* Hover tooltip */}
                    <AnimatePresence>
                      {isHovered && (
                        <motion.div
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 4 }}
                          style={{
                            position: 'absolute',
                            bottom: '100%',
                            left: `${left}%`,
                            marginBottom: 8,
                            zIndex: 30,
                            pointerEvents: 'none',
                            background: 'rgba(22,22,34,0.98)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: 12,
                            padding: '12px 16px',
                            minWidth: 200,
                          }}
                        >
                          <p className="font-semibold text-white text-sm mb-1">{phase.name}</p>
                          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.45)' }}>
                            {format(pStart, "d MMM", { locale: ptBR })}
                            {' → '}
                            {format(pEnd, "d MMM yyyy", { locale: ptBR })}
                          </p>
                          <div className="flex items-center gap-1 mt-1.5">
                            <cfg.icon style={{ width: 12, height: 12, color: cfg.color }} />
                            <span className="text-sm" style={{ color: cfg.color }}>{cfg.label}</span>
                          </div>

                          {/* Status buttons */}
                          <div className="flex gap-1 mt-2 pt-2"
                               style={{ borderTop: '1px solid rgba(255,255,255,0.08)', pointerEvents: 'auto' }}>
                            {(['pending','in_progress','completed','blocked'] as PhaseStatus[]).map(s => {
                              const c = STATUS_CONFIG[s]
                              return (
                                <button
                                  key={s}
                                  onClick={() => changeStatus(phase.id, s)}
                                  title={c.label}
                                  className="p-2 rounded-lg transition-all hover:scale-110"
                                  style={{
                                    background: phase.status === s ? `${c.color}33` : 'rgba(255,255,255,0.05)',
                                  }}
                                >
                                  <c.icon style={{ width: 14, height: 14, color: c.color }} />
                                </button>
                              )
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
