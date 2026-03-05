// src/components/gantt/GanttChart.tsx
'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { differenceInDays, format, eachMonthOfInterval } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CheckCircle2, Clock, AlertCircle, Circle, Edit2, Check, X } from 'lucide-react'
import type { Project, ProjectPhase, PhaseStatus } from '@/types'
import { updateProject } from '@/lib/firestore'
import toast from 'react-hot-toast'

interface Props { project: Project }

// FIX 1: pending agora tem cor visível (cinza azulado), blocked mais sólido
const STATUS_CONFIG: Record<PhaseStatus, { color: string; icon: React.ElementType; label: string }> = {
  completed:   { color: '#10B981',  icon: CheckCircle2, label: 'Concluída'     },
  in_progress: { color: 'var(--color-brand, #00D4AA)', icon: Clock, label: 'Em Andamento' },
  blocked:     { color: '#EF4444',  icon: AlertCircle,  label: 'Bloqueada'     },
  pending:     { color: '#64748B',  icon: Circle,       label: 'Pendente'      },
}

export default function GanttChart({ project }: Props) {
  const [hoveredPhase, setHoveredPhase] = useState<string | null>(null)
  const [editingPhase, setEditingPhase] = useState<string | null>(null)
  const [editValue, setEditValue]       = useState('')

  if (!project?.startDate || !project?.endDate) return null

  const projectStart    = new Date(project.startDate)
  const projectEnd      = new Date(project.endDate)
  const totalDays       = differenceInDays(projectEnd, projectStart) || 1
  const today           = new Date()
  const months          = eachMonthOfInterval({ start: projectStart, end: projectEnd })
  const isActiveProject = today >= projectStart && today <= projectEnd
  const LABEL_WIDTH     = 200

  const pct      = (d: Date) => Math.min(100, Math.max(0, (differenceInDays(d, projectStart) / totalDays) * 100))
  const widthPct = (s: Date, e: Date) => Math.max(1, (differenceInDays(e, s) / totalDays) * 100)
  const todayPct = pct(today)

  const startEdit = (phase: ProjectPhase) => { setEditingPhase(phase.id); setEditValue(phase.name) }

  const saveEdit = async (phaseId: string) => {
    if (!editValue.trim()) { setEditingPhase(null); return }
    const updated = project.phases.map(p => p.id === phaseId ? { ...p, name: editValue.trim() } : p)
    try { await updateProject(project.id, { phases: updated }); toast.success('Fase renomeada') }
    catch { toast.error('Erro ao salvar') }
    setEditingPhase(null)
  }

  const changeStatus = async (phaseId: string, status: PhaseStatus) => {
    const updated = project.phases.map(p => p.id === phaseId ? { ...p, status } : p)
    try {
      await updateProject(project.id, {
        phases: updated,
        ...(status === 'in_progress' ? { currentPhaseId: phaseId } : {}),
      })
    } catch { toast.error('Erro ao atualizar status') }
  }

  return (
    <div className="w-full overflow-x-auto">
      <div className="min-w-[700px]">

        {/* Legend */}
        <div className="flex items-center justify-end gap-5 mb-4 px-1">
          {Object.entries(STATUS_CONFIG).map(([s, cfg]) => (
            <span key={s} className="flex items-center gap-1.5 text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
              <cfg.icon style={{ width: 11, height: 11, color: cfg.color }} />
              {cfg.label}
            </span>
          ))}
        </div>

        {/* Month labels */}
        <div className="relative mb-4 h-5" style={{ marginLeft: `${LABEL_WIDTH}px` }}>
          {months.map(month => (
            <span
              key={month.toISOString()}
              className="absolute text-[11px] uppercase tracking-widest font-semibold"
              style={{
                left: `${pct(month < projectStart ? projectStart : month)}%`,
                color: 'rgba(255,255,255,0.2)',
              }}
            >
              {format(month, 'MMM', { locale: ptBR })}
            </span>
          ))}
        </div>

        {/* Phase rows */}
        <div className="space-y-2 relative">

          {/* Today line */}
          {isActiveProject && (
            <div
              className="absolute top-0 bottom-0 w-px pointer-events-none"
              style={{
                left: `calc(${LABEL_WIDTH}px + ${todayPct / 100} * (100% - ${LABEL_WIDTH}px))`,
                background: 'var(--color-brand, #00D4AA)',
                opacity: 0.7,
                zIndex: 10, // abaixo do tooltip mas acima das barras
              }}
            >
              <div
                className="absolute -top-6 left-1/2 -translate-x-1/2 text-[9px] font-black px-2 py-0.5 rounded whitespace-nowrap"
                style={{ background: 'var(--color-brand, #00D4AA)', color: '#050508' }}
              >
                HOJE
              </div>
            </div>
          )}

          {project.phases.map((phase, index) => {
            const pStart    = new Date(phase.startDate)
            const pEnd      = new Date(phase.endDate)
            const left      = pct(pStart)
            const width     = widthPct(pStart, pEnd)
            const isActive  = phase.status === 'in_progress'
            const cfg       = STATUS_CONFIG[phase.status]

            // FIX 2: cada status tem cor distinta e visível
            const barStyle = (() => {
              switch (phase.status) {
                case 'completed':
                  return {
                    background: `linear-gradient(90deg, ${cfg.color}cc, ${cfg.color}55)`,
                  }
                case 'in_progress':
                  return {
                    background: 'linear-gradient(90deg, var(--color-brand,#00D4AA), var(--color-brand-secondary,#8B5CF6))',
                    boxShadow:  '0 0 18px var(--color-brand-glow, rgba(0,212,170,0.35))',
                  }
                case 'blocked':
                  return {
                    background: `linear-gradient(90deg, ${cfg.color}bb, ${cfg.color}66)`,
                    boxShadow:  `0 0 10px ${cfg.color}44`,
                  }
                case 'pending':
                default:
                  return {
                    background: `linear-gradient(90deg, ${cfg.color}55, ${cfg.color}25)`,
                    border:     `1px solid ${cfg.color}60`,
                  }
              }
            })()

            return (
              <motion.div
                key={phase.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.04 }}
                className="flex items-center h-11 relative group"
                onMouseEnter={() => setHoveredPhase(phase.id)}
                onMouseLeave={() => setHoveredPhase(null)}
              >
                {/* Label */}
                <div className="flex-shrink-0 flex items-center gap-2 pr-4" style={{ width: LABEL_WIDTH }}>
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
                        className="flex-1 rounded px-2 py-1 text-sm text-white outline-none min-w-0"
                        style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)' }}
                      />
                      <button onClick={() => saveEdit(phase.id)}    className="p-1 rounded text-emerald-400 hover:bg-white/10"><Check style={{ width: 12, height: 12 }} /></button>
                      <button onClick={() => setEditingPhase(null)} className="p-1 rounded text-red-400   hover:bg-white/10"><X     style={{ width: 12, height: 12 }} /></button>
                    </div>
                  ) : (
                    <>
                      <cfg.icon style={{ width: 14, height: 14, color: cfg.color, flexShrink: 0 }} />
                      <span
                        className="text-sm truncate flex-1"
                        style={{ color: isActive ? '#fff' : 'rgba(255,255,255,0.55)', fontWeight: isActive ? 600 : 400 }}
                      >
                        {phase.name}
                      </span>
                      <button
                        onClick={() => startEdit(phase)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-white/10"
                        style={{ color: 'rgba(255,255,255,0.3)' }}
                      >
                        <Edit2 style={{ width: 11, height: 11 }} />
                      </button>
                    </>
                  )}
                </div>

                {/* Bar track */}
                <div className="flex-1 relative h-full flex items-center">
                  <motion.div
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ delay: index * 0.04 + 0.1, duration: 0.45, ease: 'easeOut' }}
                    style={{
                      position:     'absolute',
                      left:         `${left}%`,
                      width:        `${width}%`,
                      originX:      0,
                      height:       34,
                      borderRadius: 5,
                      overflow:     'hidden',
                      cursor:       'pointer',
                      zIndex:       5,
                    }}
                  >
                    <div className="w-full h-full relative" style={barStyle}>
                      {/* Top gloss */}
                      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'rgba(255,255,255,0.15)' }} />

                      {isActive && (
                        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg,transparent 0%,rgba(255,255,255,0.1) 50%,transparent 100%)', backgroundSize: '200% 100%', animation: 'shimmer 2s linear infinite' }} />
                      )}
                      {isActive && (
                        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, var(--color-brand,#00D4AA), transparent)', animation: 'pulse-glow 2.5s ease-in-out infinite' }} />
                      )}

                      {width > 8 && (
                        <div className="absolute inset-0 flex items-center justify-between px-2.5">
                          <span style={{ fontSize: 11, fontWeight: 500, color: isActive ? 'rgba(0,0,0,0.65)' : 'rgba(255,255,255,0.55)' }}>
                            {format(pStart, 'dd/MM')}
                          </span>
                          {width > 15 && (
                            <span style={{ fontSize: 11, fontWeight: 500, color: isActive ? 'rgba(0,0,0,0.65)' : 'rgba(255,255,255,0.55)' }}>
                              {format(pEnd, 'dd/MM')}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* 📍 ESTAMOS AQUI badge */}
                    {isActive && (
                      <motion.div
                        animate={{ y: [0, -4, 0] }}
                        transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                        style={{ position: 'absolute', top: -26, left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', pointerEvents: 'none' }}
                      >
                        <div style={{ fontSize: 9, fontWeight: 900, padding: '2px 8px', borderRadius: 4, background: 'var(--color-brand,#00D4AA)', color: '#050508', whiteSpace: 'nowrap' }}>
                          📍 ESTAMOS AQUI
                        </div>
                        <div style={{ width: 1, height: 6, background: 'var(--color-brand,#00D4AA)', marginTop: 2 }} />
                      </motion.div>
                    )}
                  </motion.div>

                  {/* FIX 3: Tooltip com z-index 9999 — garante ficar acima de qualquer header sticky */}
                  <AnimatePresence>
                    {hoveredPhase === phase.id && (
                      <motion.div
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 6 }}
                        style={{
                          position:     'fixed', // ← mudou de absolute para fixed
                          zIndex:       9999,    // ← acima de tudo
                          background:   'rgba(14,14,22,0.98)',
                          border:       '1px solid rgba(255,255,255,0.12)',
                          borderRadius: 10,
                          padding:      '10px 14px',
                          minWidth:     200,
                          pointerEvents:'none',
                          // posição calculada pelo mouse via onMouseEnter não está disponível aqui,
                          // mas fixed + transform centraliza bem sobre a barra
                          bottom: 'auto',
                          top:    'auto',
                        }}
                        // Reposicionamento: usamos um wrapper data-attr para capturar coords
                        // Aqui a abordagem mais simples: tooltip flutua abaixo do cursor via ref
                        ref={(el) => {
                          if (!el) return
                          // Posiciona em relação ao elemento pai no DOM
                          const row = el.closest('.gantt-phase-row') as HTMLElement
                          if (!row) return
                          const rect = row.getBoundingClientRect()
                          el.style.top  = `${rect.top - el.offsetHeight - 12}px`
                          el.style.left = `${rect.left + LABEL_WIDTH}px`
                        }}
                      >
                        <p className="font-semibold text-white text-sm mb-1">{phase.name}</p>
                        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                          {format(pStart, 'd MMM', { locale: ptBR })} → {format(pEnd, 'd MMM yyyy', { locale: ptBR })}
                        </p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <cfg.icon style={{ width: 11, height: 11, color: cfg.color }} />
                          <span className="text-xs" style={{ color: cfg.color }}>{cfg.label}</span>
                        </div>
                        <div
                          className="flex gap-1 mt-2 pt-2"
                          style={{ borderTop: '1px solid rgba(255,255,255,0.07)', pointerEvents: 'auto' }}
                        >
                          {(['pending','in_progress','completed','blocked'] as PhaseStatus[]).map(s => {
                            const c = STATUS_CONFIG[s]
                            return (
                              <button
                                key={s}
                                onClick={() => changeStatus(phase.id, s)}
                                title={c.label}
                                className="p-1.5 rounded transition-all hover:scale-110"
                                style={{ background: phase.status === s ? `${c.color}33` : 'rgba(255,255,255,0.04)' }}
                              >
                                <c.icon style={{ width: 12, height: 12, color: c.color }} />
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
  )
}