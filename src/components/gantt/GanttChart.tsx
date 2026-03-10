'use client'
import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { differenceInDays, format, eachMonthOfInterval } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CheckCircle2, Clock, AlertCircle, Circle, X, Trash2, Check } from 'lucide-react'
import type { Project, ProjectPhase, PhaseStatus } from '@/types'
import { updateProject } from '@/lib/firestore'
import DatePicker from '@/components/ui/DatePicker'
import toast from 'react-hot-toast'

interface Props { project: Project }

const STATUS_CONFIG: Record<PhaseStatus, { color: string; icon: React.ElementType; label: string }> = {
  completed:   { color: '#10B981',                     icon: CheckCircle2, label: 'Concluída'    },
  in_progress: { color: 'var(--color-brand, #00D4AA)', icon: Clock,        label: 'Em Andamento' },
  blocked:     { color: '#EF4444',                     icon: AlertCircle,  label: 'Bloqueada'    },
  pending:     { color: 'rgba(255,255,255,0.22)',       icon: Circle,       label: 'Pendente'     },
}

const BAR_STYLE: Record<PhaseStatus, React.CSSProperties> = {
  completed:   { background: 'linear-gradient(90deg,#10B981cc,#10B98155)', borderRadius: 5 },
  in_progress: { background: 'linear-gradient(90deg,var(--color-brand,#00D4AA),var(--color-brand-secondary,#8B5CF6))', boxShadow: '0 0 20px var(--color-brand-glow,rgba(0,212,170,0.28))', borderRadius: 5 },
  blocked:     { background: 'linear-gradient(90deg,#EF4444bb,#EF444455)', boxShadow: '0 0 12px rgba(239,68,68,0.28)', borderRadius: 5 },
  pending:     { background: 'linear-gradient(90deg,rgba(255,255,255,0.07),rgba(255,255,255,0.03))', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 5 },
}

interface EditPanel { phase: ProjectPhase; x: number; y: number }

export default function GanttChart({ project }: Props) {
  const [editPanel, setEditPanel] = useState<EditPanel | null>(null)
  const [editName,  setEditName]  = useState('')
  const [editStart, setEditStart] = useState('')
  const [editEnd,   setEditEnd]   = useState('')
  const [saved,     setSaved]     = useState(false)
  const panelRef  = useRef<HTMLDivElement>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  if (!project?.startDate || !project?.endDate) return null

  const projectStart = new Date(project.startDate)
  const projectEnd   = new Date(project.endDate)
  const totalDays    = differenceInDays(projectEnd, projectStart) || 1
  const today        = new Date()
  const months       = eachMonthOfInterval({ start: projectStart, end: projectEnd })
  const isActive     = today >= projectStart && today <= projectEnd
  const LABEL_W      = 220

  const pct      = (d: Date) => Math.min(100, Math.max(0, (differenceInDays(d, projectStart) / totalDays) * 100))
  const widthPct = (s: Date, e: Date) => Math.max(1.5, (differenceInDays(e, s) / totalDays) * 100)
  const todayPct = pct(today)

  const phaseProgress = (phase: ProjectPhase): number => {
    if (phase.status === 'completed') return 100
    if (phase.status === 'pending')   return 0
    const total   = differenceInDays(new Date(phase.endDate), new Date(phase.startDate)) || 1
    const elapsed = differenceInDays(today, new Date(phase.startDate))
    return Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)))
  }

  // Fecha ao clicar fora
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setEditPanel(null)
      }
    }
    if (editPanel) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [editPanel])

  // Fecha com ESC
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setEditPanel(null) }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  // Auto-save com debounce 800ms
  const triggerAutoSave = (name: string, start: string, end: string, phaseId: string) => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      if (!name.trim()) return
      const updated = project.phases.map(p =>
        p.id === phaseId ? { ...p, name: name.trim(), startDate: start, endDate: end } : p
      )
      try {
        await updateProject(project.id, { phases: updated })
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      } catch {
        toast.error('Erro ao salvar')
      }
    }, 800)
  }

  const openEditPanel = (e: React.MouseEvent, phase: ProjectPhase) => {
    e.preventDefault()
    e.stopPropagation()
    setEditName(phase.name)
    setEditStart(phase.startDate.slice(0, 10))
    setEditEnd(phase.endDate.slice(0, 10))
    setSaved(false)
    const panelW = 280
    const panelH = 280
    const x = Math.min(e.clientX + 8, window.innerWidth  - panelW - 16)
    const y = Math.min(e.clientY + 8, window.innerHeight - panelH - 16)
    setEditPanel({ phase, x, y })
  }

  const changeStatus = async (phaseId: string, status: PhaseStatus) => {
    const updated = project.phases.map(p => p.id === phaseId ? { ...p, status } : p)
    try {
      await updateProject(project.id, {
        phases: updated,
        ...(status === 'in_progress' ? { currentPhaseId: phaseId } : {}),
      })
      if (editPanel?.phase.id === phaseId) {
        setEditPanel(prev => prev ? { ...prev, phase: { ...prev.phase, status } } : null)
      }
    } catch { toast.error('Erro ao atualizar') }
  }

  const deletePhase = async (phaseId: string) => {
    const updated = project.phases.filter(p => p.id !== phaseId)
    try { await updateProject(project.id, { phases: updated }); toast.success('Fase removida') }
    catch { toast.error('Erro ao remover') }
    setEditPanel(null)
  }

  return (
    <>
      <div className="w-full overflow-x-auto select-none">
        <div style={{ minWidth: 700 }}>

          {/* Legend */}
          <div className="flex items-center justify-end gap-5 mb-5 px-1">
            {Object.entries(STATUS_CONFIG).map(([s, cfg]) => (
              <span key={s} className="flex items-center gap-1.5 text-[11px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
                <cfg.icon style={{ width: 11, height: 11, color: cfg.color }} />
                {cfg.label}
              </span>
            ))}
            <span className="text-[10px] ml-1" style={{ color: 'rgba(255,255,255,0.15)' }}>· clique direito para editar</span>
          </div>

          {/* Month labels */}
          <div className="relative mb-3 h-5" style={{ marginLeft: LABEL_W }}>
            {months.map(month => (
              <span key={month.toISOString()} className="absolute text-[10px] uppercase tracking-[0.2em] font-bold"
                    style={{ left: `${pct(month < projectStart ? projectStart : month)}%`, color: 'rgba(255,255,255,0.15)' }}>
                {format(month, 'MMM', { locale: ptBR })}
              </span>
            ))}
          </div>

          {/* Phase rows */}
          <div className="space-y-1.5 relative">

            {/* Grid lines */}
            {months.map(month => (
              <div key={month.toISOString()} className="absolute top-0 bottom-0 w-px pointer-events-none"
                   style={{ left: `calc(${LABEL_W}px + ${pct(month < projectStart ? projectStart : month) / 100} * (100% - ${LABEL_W}px))`, background: 'rgba(255,255,255,0.04)' }} />
            ))}

            {/* Today line */}
            {isActive && (
              <div className="absolute top-0 bottom-0 w-px pointer-events-none"
                   style={{ left: `calc(${LABEL_W}px + ${todayPct / 100} * (100% - ${LABEL_W}px))`, background: 'var(--color-brand,#00D4AA)', opacity: 0.55, zIndex: 10 }}>
                <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] font-black px-2 py-0.5 rounded whitespace-nowrap"
                     style={{ background: 'var(--color-brand,#00D4AA)', color: '#050508' }}>HOJE</div>
              </div>
            )}

            {project.phases.map((phase, index) => {
              const pStart   = new Date(phase.startDate)
              const pEnd     = new Date(phase.endDate)
              const left     = pct(pStart)
              const width    = widthPct(pStart, pEnd)
              const isNow    = phase.status === 'in_progress'
              const cfg      = STATUS_CONFIG[phase.status]
              const progress = phaseProgress(phase)

              return (
                <motion.div
                  key={phase.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.035 }}
                  className="flex items-center relative group"
                  style={{ height: 40, cursor: 'context-menu' }}
                  onContextMenu={e => openEditPanel(e, phase)}
                >
                  <div className="flex-shrink-0 flex items-center gap-2 pr-4" style={{ width: LABEL_W }}>
                    <cfg.icon style={{ width: 13, height: 13, color: cfg.color, flexShrink: 0 }} />
                    <span className="text-xs flex-1"
                          style={{ color: isNow ? '#fff' : 'rgba(255,255,255,0.55)', fontWeight: isNow ? 600 : 400, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                          title={phase.name}>
                      {phase.name}
                    </span>
                  </div>

                  <div className="flex-1 relative h-full flex items-center">
                    <motion.div
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{ delay: index * 0.035 + 0.1, duration: 0.4, ease: 'easeOut' }}
                      style={{ position: 'absolute', left: `${left}%`, width: `${width}%`, originX: 0, height: 32, zIndex: 5, overflow: 'hidden', ...BAR_STYLE[phase.status] }}
                    >
                      {isNow && <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.08),transparent)', backgroundSize: '200% 100%', animation: 'shimmer 2s linear infinite' }} />}
                      {(isNow || phase.status === 'completed') && (
                        <div style={{ position: 'absolute', bottom: 0, left: 0, width: `${progress}%`, height: 3, background: isNow ? 'rgba(255,255,255,0.35)' : 'rgba(16,185,129,0.5)', transition: 'width 0.5s ease' }} />
                      )}
                      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'rgba(255,255,255,0.12)' }} />
                      {width > 8 && (
                        <div className="absolute inset-0 flex items-center justify-between px-2.5" style={{ pointerEvents: 'none' }}>
                          <span style={{ fontSize: 10, color: isNow ? 'rgba(0,0,0,0.65)' : 'rgba(255,255,255,0.45)' }}>{format(pStart, 'dd/MM')}</span>
                          {width > 14 && <span style={{ fontSize: 10, color: isNow ? 'rgba(0,0,0,0.65)' : 'rgba(255,255,255,0.45)' }}>{format(pEnd, 'dd/MM')}</span>}
                        </div>
                      )}
                      {isNow && (
                        <motion.div animate={{ y: [0, -3, 0] }} transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                          style={{ position: 'absolute', top: -24, left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', pointerEvents: 'none' }}>
                          <div style={{ fontSize: 8, fontWeight: 900, padding: '2px 7px', borderRadius: 5, background: 'var(--color-brand,#00D4AA)', color: '#050508', whiteSpace: 'nowrap' }}>📍 ESTAMOS AQUI</div>
                          <div style={{ width: 1, height: 5, background: 'var(--color-brand,#00D4AA)', marginTop: 1 }} />
                        </motion.div>
                      )}
                    </motion.div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Edit Panel */}
      <AnimatePresence>
        {editPanel && (
          <motion.div
            ref={panelRef}
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1,    y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.15 }}
            style={{
              position: 'fixed', top: editPanel.y, left: editPanel.x, zIndex: 9999, width: 280,
              background: 'rgba(10,10,16,0.98)',
              border: `1px solid ${STATUS_CONFIG[editPanel.phase.status].color}35`,
              borderRadius: 5,
              padding: '14px 16px',
              boxShadow: '0 16px 48px rgba(0,0,0,0.75), 0 0 0 1px rgba(255,255,255,0.04)',
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-widest font-bold" style={{ color: 'rgba(255,255,255,0.25)' }}>Editar Fase</span>
                <AnimatePresence>
                  {saved && (
                    <motion.span initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                      className="flex items-center gap-1 text-[10px]" style={{ color: '#10B981' }}>
                      <Check style={{ width: 10, height: 10 }} /> salvo
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
              <button onClick={() => setEditPanel(null)} className="p-1 rounded hover:bg-white/10" style={{ color: 'rgba(255,255,255,0.3)', borderRadius: 5 }}>
                <X style={{ width: 13, height: 13 }} />
              </button>
            </div>

            {/* Name */}
            <div className="mb-3">
              <label className="text-[10px] uppercase tracking-widest block mb-1.5" style={{ color: 'rgba(255,255,255,0.2)' }}>Nome</label>
              <input
                value={editName}
                onChange={e => { setEditName(e.target.value); triggerAutoSave(e.target.value, editStart, editEnd, editPanel.phase.id) }}
                autoFocus
                className="w-full text-sm text-white outline-none px-3 py-2"
                style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 5 }}
              />
            </div>

            {/* Dates — DatePicker com Popover */}
            <div className="flex gap-2 mb-3">
              <div className="flex-1">
                <label className="text-[10px] uppercase tracking-widest block mb-1.5" style={{ color: 'rgba(255,255,255,0.2)' }}>Início</label>
                <DatePicker
                  value={editStart}
                  onChange={v => {
                    setEditStart(v)
                    triggerAutoSave(editName, v, editEnd, editPanel.phase.id)
                  }}
                />
              </div>
              <div className="flex-1">
                <label className="text-[10px] uppercase tracking-widest block mb-1.5" style={{ color: 'rgba(255,255,255,0.2)' }}>Fim</label>
                <DatePicker
                  value={editEnd}
                  onChange={v => {
                    setEditEnd(v)
                    triggerAutoSave(editName, editStart, v, editPanel.phase.id)
                  }}
                />
              </div>
            </div>

            {/* Status chips — largura igual com grid */}
            <div className="mb-3">
              <label className="text-[10px] uppercase tracking-widest block mb-1.5" style={{ color: 'rgba(255,255,255,0.2)' }}>Status</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                {(Object.entries(STATUS_CONFIG) as [PhaseStatus, typeof STATUS_CONFIG[PhaseStatus]][]).map(([s, cfg]) => {
                  const isSelected = editPanel.phase.status === s
                  return (
                    <button key={s} onClick={() => changeStatus(editPanel.phase.id, s)}
                      style={{
                        padding: '6px 8px', borderRadius: 5, fontSize: 11, fontWeight: 600,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                        cursor: 'pointer', transition: 'all 150ms',
                        background: isSelected ? `${cfg.color}22` : 'rgba(255,255,255,0.04)',
                        border: `1px solid ${isSelected ? cfg.color + '55' : 'rgba(255,255,255,0.07)'}`,
                        color: isSelected ? cfg.color : 'rgba(255,255,255,0.3)',
                      }}>
                      <cfg.icon style={{ width: 11, height: 11 }} />
                      {cfg.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Delete */}
            <div className="pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <button onClick={() => deletePhase(editPanel.phase.id)}
                className="w-full flex items-center justify-center gap-1.5 py-2 text-xs transition-all"
                style={{ color: 'rgba(255,255,255,0.2)', borderRadius: 5 }}
                onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = 'rgba(239,68,68,0.08)' }}
                onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.2)'; e.currentTarget.style.background = 'transparent' }}>
                <Trash2 style={{ width: 12, height: 12 }} />
                Remover fase
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
