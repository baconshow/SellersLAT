'use client'

import {
  useEffect, useState, useCallback, useRef, useLayoutEffect,
} from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { format, differenceInDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  CheckCircle2, Clock, AlertCircle, Circle,
  ChevronLeft, ChevronRight,
  Lock, Unlock, Sun, Moon,
  Maximize2, Minimize2, Sparkles,
  Calendar, BarChart3,
} from 'lucide-react'
import type { Project, PhaseStatus } from '@/types'
import { updateProject } from '@/lib/firestore'
import toast from 'react-hot-toast'

// ─── Types ────────────────────────────────────────────────────────────────────

interface AIContent {
  tagline:            string
  statusSummary:      string
  nextStepsNarrative: string
  riskAssessment:     string
  keyInsight:         string
}

interface Draft {
  clientName:  string
  objective:   string
  description: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SLIDE_COUNT = 6
const SLIDE_LABEL = ['Capa','Status Geral','Timeline','KPIs & Métricas','Próximos Passos','Riscos & Bloqueios']

const STATUS_CFG: Record<PhaseStatus, { color: string; icon: React.ElementType; label: string }> = {
  completed:   { color: '#10B981', icon: CheckCircle2, label: 'Concluída'    },
  in_progress: { color: 'var(--color-brand,#00D4AA)', icon: Clock,           label: 'Em Andamento' },
  blocked:     { color: '#EF4444', icon: AlertCircle,  label: 'Bloqueada'   },
  pending:     { color: '#64748B', icon: Circle,       label: 'Pendente'    },
}

const DARK_THEME = {
  bg:       '#050508',
  surface:  'rgba(255,255,255,0.035)',
  border:   'rgba(255,255,255,0.07)',
  text:     '#F0F0F5',
  muted:    'rgba(255,255,255,0.35)',
  ghost:    'rgba(255,255,255,0.14)',
  aiBox:    'rgba(139,92,246,0.06)',
  aiBorder: 'rgba(139,92,246,0.15)',
  navBg:    'rgba(5,5,8,0.95)',
}

const LIGHT_THEME = {
  bg:       '#F2F2ED',
  surface:  'rgba(0,0,0,0.04)',
  border:   'rgba(0,0,0,0.08)',
  text:     '#0A0A0F',
  muted:    'rgba(0,0,0,0.42)',
  ghost:    'rgba(0,0,0,0.15)',
  aiBox:    'rgba(139,92,246,0.06)',
  aiBorder: 'rgba(139,92,246,0.2)',
  navBg:    'rgba(242,242,237,0.95)',
}

// text-entry animation stagger
const T = (i: number) => ({
  hidden: { opacity: 0, y: 18, filter: 'blur(5px)' },
  show: {
    opacity: 1, y: 0, filter: 'blur(0px)',
    transition: { delay: 0.1 + i * 0.09, duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  },
})

const SLIDE_VARIANTS = {
  enter:  (d: number) => ({ x: d > 0 ? '50%' : '-50%', opacity: 0 }),
  center:              ({ x: 0, opacity: 1 }),
  exit:   (d: number) => ({ x: d > 0 ? '-50%' : '50%', opacity: 0 }),
}

// ─── EditableText ─────────────────────────────────────────────────────────────
// Renders plain text in locked mode. In edit mode: becomes a styled textarea.

interface EditableProps {
  value:       string
  onChange:    (v: string) => void
  onBlur:      () => void
  isEditing:   boolean
  tag?:        'h1' | 'h2' | 'p' | 'span'
  className?:  string
  style?:      React.CSSProperties
  placeholder?: string
  multiline?:  boolean
}

function EditableText({
  value, onChange, onBlur, isEditing,
  className = '', style = {},
  placeholder = '…', multiline = false,
}: EditableProps) {
  const taRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea
  useLayoutEffect(() => {
    if (taRef.current) {
      taRef.current.style.height = 'auto'
      taRef.current.style.height = taRef.current.scrollHeight + 'px'
    }
  }, [value, isEditing])

  if (!isEditing) {
    return (
      <span className={className} style={style}>
        {value || <span style={{ opacity: 0.25 }}>{placeholder}</span>}
      </span>
    )
  }

  const editStyle: React.CSSProperties = {
    ...style,
    background:  'transparent',
    border:      'none',
    borderBottom: '1.5px solid var(--color-brand,#00D4AA)',
    outline:     'none',
    resize:      'none',
    width:       '100%',
    padding:     '0 0 3px 0',
    margin:      0,
    fontFamily:  'inherit',
    fontSize:    'inherit',
    fontWeight:  'inherit',
    lineHeight:  'inherit',
    letterSpacing:'inherit',
    color:       'inherit',
    display:     'block',
    cursor:      'text',
    overflow:    'hidden',
  }

  return (
    <textarea
      ref={taRef}
      value={value}
      onChange={e => onChange(e.target.value)}
      onBlur={onBlur}
      placeholder={placeholder}
      rows={1}
      style={editStyle}
      className={className}
      onClick={e => e.stopPropagation()}
      onKeyDown={e => e.stopPropagation()} // prevent slide nav while typing
    />
  )
}

// ─── AIBadge / AIBox ──────────────────────────────────────────────────────────

function AIBadge() {
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
          style={{ background: 'rgba(139,92,246,0.16)', border: '1px solid rgba(139,92,246,0.28)', color: '#A78BFA' }}>
      <Sparkles style={{ width: 8, height: 8 }} /> IA
    </span>
  )
}

function AIBox({ loading, children, th, motionIndex = 3 }:
  { loading: boolean; children: React.ReactNode; th: typeof DARK_THEME; motionIndex?: number }) {
  return (
    <motion.div variants={T(motionIndex)} initial="hidden" animate="show"
      className="rounded p-4"
      style={{ background: th.aiBox, border: `1px solid ${th.aiBorder}` }}>
      <div className="flex items-center gap-2 mb-2.5"><AIBadge /></div>
      {loading
        ? <div className="space-y-2">
            {[100, 80, 55].map(w => (
              <div key={w} className="h-2 rounded-full animate-pulse"
                   style={{ background: th.ghost, width: `${w}%` }} />
            ))}
          </div>
        : children
      }
    </motion.div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function SlidesDeck({ project }: { project: Project }) {
  const containerRef  = useRef<HTMLDivElement>(null)
  const paginateRef   = useRef<(d: number) => void>(() => {})

  const [slide,      setSlide]     = useState(0)
  const [direction,  setDirection] = useState(1)
  const [isDark,     setIsDark]    = useState(true)
  const [isEditing,  setIsEditing] = useState(false)
  const [isFullscr,  setIsFullscr] = useState(false)
  const [saving,     setSaving]    = useState(false)
  const [ai,         setAI]        = useState<AIContent | null>(null)
  const [aiLoading,  setAILoad]    = useState(true)
  const [draft,      setDraft]     = useState<Draft>({
    clientName:  project.clientName  ?? '',
    objective:   project.objective   ?? '',
    description: project.description ?? '',
  })

  const th = isDark ? DARK_THEME : LIGHT_THEME

  // ── Derived ──────────────────────────────────────────────────────────────
  const phases        = project.phases ?? []
  const completed     = phases.filter(p => p.status === 'completed')
  const blocked       = phases.filter(p => p.status === 'blocked')
  const pending       = phases.filter(p => p.status === 'pending')
  const active        = phases.find(p => p.status === 'in_progress')
  const completionPct = phases.length ? Math.round((completed.length / phases.length) * 100) : 0
  const today         = new Date()
  const start         = new Date(project.startDate)
  const end           = new Date(project.endDate)
  const totalDays     = differenceInDays(end, start) || 1
  const timePct       = Math.min(100, Math.round((differenceInDays(today, start) / totalDays) * 100))

  const healthColor = blocked.length > 0           ? '#EF4444'
                    : completionPct < timePct - 15  ? '#F59E0B'
                    : '#10B981'
  const healthLabel = blocked.length > 0           ? 'Bloqueado'
                    : completionPct < timePct - 15  ? 'Atenção'
                    : 'No Prazo'

  const pct  = (d: Date) => Math.min(100, Math.max(0, (differenceInDays(d, start) / totalDays) * 100))
  const barW = (s: Date, e: Date) => Math.max(2, (differenceInDays(e, s) / totalDays) * 100)

  // ── Navigation ───────────────────────────────────────────────────────────
  const paginate = useCallback((dir: number) => {
    setDirection(dir)
    setSlide(s => {
      const next = s + dir
      if (next < 0 || next >= SLIDE_COUNT) return s
      return next
    })
  }, [])

  // Keep ref always current — fixes stale closure in keyboard handler
  useEffect(() => { paginateRef.current = paginate }, [paginate])

  const goTo = useCallback((i: number) => {
    setDirection(i > slide ? 1 : -1)
    setSlide(i)
  }, [slide])

  // ── Keyboard ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase()
      const isInput = tag === 'input' || tag === 'textarea' || tag === 'select'
        || (e.target as HTMLElement)?.isContentEditable
      if (isInput) return

      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowDown':
          e.preventDefault()
          paginateRef.current(1)
          break
        case 'ArrowLeft':
        case 'ArrowUp':
          e.preventDefault()
          paginateRef.current(-1)
          break
        case 'F11':
          e.preventDefault()
          toggleFullscreen()
          break
        case 'Escape':
          if (isFullscr) exitFullscreen()
          break
        case 'e':
        case 'E':
          if (!isInput) setIsEditing(v => !v)
          break
        case 't':
        case 'T':
          if (!isInput) setIsDark(v => !v)
          break
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isFullscr]) // eslint-disable-line

  // ── Fullscreen ───────────────────────────────────────────────────────────
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      // Fullscreen the whole presentation container
      containerRef.current?.requestFullscreen().catch(() => {})
      // Tell sidebar to collapse
      document.dispatchEvent(new CustomEvent('sellers:presentation', { detail: { fullscreen: true } }))
    } else {
      exitFullscreen()
    }
  }, [])

  const exitFullscreen = useCallback(() => {
    document.exitFullscreen().catch(() => {})
    document.dispatchEvent(new CustomEvent('sellers:presentation', { detail: { fullscreen: false } }))
  }, [])

  useEffect(() => {
    const onFsChange = () => setIsFullscr(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onFsChange)
    return () => document.removeEventListener('fullscreenchange', onFsChange)
  }, [])

  // ── AI ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const gen = async () => {
      try {
        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 800,
            system: 'Consultor sênior B2B da Sellers. Responda SOMENTE JSON válido sem markdown ou texto externo.',
            messages: [{
              role: 'user',
              content: `Projeto:${project.clientName} Conclusão:${completionPct}%(${completed.length}/${phases.length}) Fase:${active?.name??'—'} Bloqueios:${blocked.map(p=>p.name).join(',')||'0'} Pendentes:${pending.slice(0,3).map(p=>p.name).join(',')||'0'}
Retorne: {"tagline":"10 palavras máx","statusSummary":"2-3 linhas","nextStepsNarrative":"3 itens separados por \\n","riskAssessment":"2-3 linhas","keyInsight":"12 palavras máx"}`,
            }],
          }),
        })
        const data = await res.json()
        const text = data.content?.find((b: { type: string }) => b.type === 'text')?.text ?? '{}'
        setAI(JSON.parse(text.replace(/```json|```/g, '').trim()))
      } catch {
        setAI({
          tagline:            `Status do projeto ${project.clientName}`,
          statusSummary:      'Análise automática indisponível.',
          nextStepsNarrative: 'Verificar fases pendentes.\nAlinhar bloqueios.\nAtualizar métricas.',
          riskAssessment:     'Verificar dependências críticas.',
          keyInsight:         'Foco nas entregas de maior impacto.',
        })
      } finally {
        setAILoad(false)
      }
    }
    gen()
  }, [project.id]) // eslint-disable-line

  // ── Save ──────────────────────────────────────────────────────────────────
  const saveDraft = useCallback(async () => {
    setSaving(true)
    try {
      await updateProject(project.id, {
        clientName:  draft.clientName,
        objective:   draft.objective,
        description: draft.description,
      })
      toast.success('Salvo')
    } catch {
      toast.error('Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }, [project.id, draft])

  const updateDraft = useCallback((key: keyof Draft) => (v: string) =>
    setDraft(d => ({ ...d, [key]: v })), [])

  // ─── Slide renders ────────────────────────────────────────────────────────

  const renderSlide = () => {
    switch (slide) {

      // ── 01 CAPA ───────────────────────────────────────────────────────────
      case 0: return (
        <div className="flex flex-col justify-center min-h-full px-16 py-20 max-w-3xl mx-auto w-full">

          <motion.div variants={T(0)} initial="hidden" animate="show"
            className="flex items-center gap-4 mb-14">
            <div className="w-14 h-14 flex items-center justify-center text-xl font-black shrink-0"
                 style={{ background: 'var(--color-brand,#00D4AA)', color: '#050508', borderRadius: 8 }}>
              {project.clientName.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.22em] font-bold"
                 style={{ color: th.ghost }}>Sellers Pulse</p>
              <p className="text-sm" style={{ color: th.muted }}>Apresentação de Status</p>
            </div>
          </motion.div>

          {/* HERO TITLE — editable */}
          <motion.div variants={T(1)} initial="hidden" animate="show"
            className="mb-4 leading-[0.97]"
            style={{ fontSize: 'clamp(3rem,8vw,7rem)', fontWeight: 900, color: th.text, letterSpacing: '-0.02em' }}>
            <EditableText
              value={draft.clientName}
              onChange={updateDraft('clientName')}
              onBlur={saveDraft}
              isEditing={isEditing}
              placeholder="Nome do projeto"
              style={{ fontSize: 'inherit', fontWeight: 'inherit', letterSpacing: 'inherit', lineHeight: 'inherit', color: th.text }}
            />
          </motion.div>

          {/* Objective — editable */}
          <motion.div variants={T(2)} initial="hidden" animate="show"
            className="mb-5">
            <EditableText
              value={draft.objective}
              onChange={updateDraft('objective')}
              onBlur={saveDraft}
              isEditing={isEditing}
              placeholder="Objetivo executivo do projeto…"
              multiline
              style={{ fontSize: '1.15rem', lineHeight: 1.6, color: th.muted, fontWeight: 300 }}
            />
          </motion.div>

          {/* AI tagline */}
          <motion.div variants={T(3)} initial="hidden" animate="show"
            className="flex items-start gap-2.5 mb-12">
            <AIBadge />
            <p className="text-base italic" style={{ color: th.ghost }}>
              {aiLoading ? '…' : `"${ai?.tagline}"`}
            </p>
          </motion.div>

          <motion.div variants={T(4)} initial="hidden" animate="show"
            className="flex flex-wrap items-center gap-4 pt-6"
            style={{ borderTop: `1px solid ${th.border}` }}>
            <div className="flex items-center gap-2">
              <Calendar style={{ width: 12, height: 12, color: th.ghost }} />
              <span className="text-sm" style={{ color: th.muted }}>
                {format(start, "dd MMM yyyy", { locale: ptBR })} → {format(end, "dd MMM yyyy", { locale: ptBR })}
              </span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1"
                 style={{ background: `${healthColor}18`, border: `1px solid ${healthColor}35`, borderRadius: 5 }}>
              <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: healthColor }} />
              <span className="text-xs font-bold" style={{ color: healthColor }}>{healthLabel}</span>
            </div>
            <span className="text-sm" style={{ color: th.muted }}>{completionPct}% concluído</span>
          </motion.div>

          <motion.p variants={T(5)} initial="hidden" animate="show"
            className="mt-4 text-xs" style={{ color: th.ghost }}>
            {format(today, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </motion.p>
        </div>
      )

      // ── 02 STATUS ─────────────────────────────────────────────────────────
      case 1: return (
        <div className="flex flex-col justify-center min-h-full px-16 py-20 max-w-3xl mx-auto w-full">
          <motion.p variants={T(0)} initial="hidden" animate="show"
            className="text-xs font-black uppercase tracking-[0.22em] mb-1"
            style={{ color: 'var(--color-brand,#00D4AA)' }}>02</motion.p>
          <motion.h2 variants={T(1)} initial="hidden" animate="show"
            className="font-black tracking-tight mb-8"
            style={{ fontSize: 'clamp(2rem,4vw,3rem)', color: th.text }}>
            Status Geral
          </motion.h2>

          <div className="grid grid-cols-2 gap-4 mb-5">
            {/* Donut */}
            <motion.div variants={T(2)} initial="hidden" animate="show"
              className="p-6 flex flex-col items-center gap-4"
              style={{ background: th.surface, border: `1px solid ${th.border}`, borderRadius: 5 }}>
              <div className="relative" style={{ width: 124, height: 124 }}>
                <svg viewBox="0 0 124 124" className="-rotate-90"
                     style={{ width: 124, height: 124, position: 'absolute' }}>
                  <circle cx="62" cy="62" r="50" fill="none" stroke={th.border} strokeWidth="8" />
                  <circle cx="62" cy="62" r="50" fill="none"
                    stroke="var(--color-brand,#00D4AA)" strokeWidth="8" strokeLinecap="round"
                    strokeDasharray={String(2 * Math.PI * 50)}
                    strokeDashoffset={String(2 * Math.PI * 50 * (1 - completionPct / 100))}
                    style={{ transition: 'stroke-dashoffset 1.4s cubic-bezier(0.22,1,0.36,1)' }} />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-black" style={{ color: th.text, lineHeight: 1 }}>{completionPct}%</span>
                  <span className="text-xs mt-0.5" style={{ color: th.muted }}>concluído</span>
                </div>
              </div>
              <p className="text-sm text-center" style={{ color: th.muted }}>
                {completed.length} de {phases.length} fases
              </p>
            </motion.div>

            {/* Stats */}
            <motion.div variants={T(3)} initial="hidden" animate="show"
              className="flex flex-col gap-2 justify-center">
              {[
                { l: 'Fase Atual',       v: active?.name ?? '—',    c: 'var(--color-brand,#00D4AA)' },
                { l: 'Bloqueadas',       v: String(blocked.length), c: blocked.length ? '#EF4444' : '#10B981' },
                { l: 'Tempo decorrido',  v: `${timePct}%`,          c: th.muted },
                { l: 'Saúde',            v: healthLabel,            c: healthColor },
              ].map(s => (
                <div key={s.l} className="flex items-center justify-between px-3.5 py-2.5"
                     style={{ background: th.surface, border: `1px solid ${th.border}`, borderRadius: 7 }}>
                  <span className="text-sm" style={{ color: th.muted }}>{s.l}</span>
                  <span className="text-sm font-semibold truncate max-w-[130px] text-right"
                        style={{ color: s.c }}>{s.v}</span>
                </div>
              ))}
            </motion.div>
          </div>

          <AIBox loading={aiLoading} th={th} motionIndex={4}>
            <p className="text-sm leading-relaxed" style={{ color: th.muted }}>{ai?.statusSummary}</p>
          </AIBox>
        </div>
      )

      // ── 03 TIMELINE ───────────────────────────────────────────────────────
      case 2: return (
        <div className="flex flex-col justify-center min-h-full px-16 py-20 max-w-3xl mx-auto w-full">
          <motion.p variants={T(0)} initial="hidden" animate="show"
            className="text-xs font-black uppercase tracking-[0.22em] mb-1"
            style={{ color: 'var(--color-brand,#00D4AA)' }}>03</motion.p>
          <motion.h2 variants={T(1)} initial="hidden" animate="show"
            className="font-black tracking-tight mb-1"
            style={{ fontSize: 'clamp(2rem,4vw,3rem)', color: th.text }}>Timeline</motion.h2>
          <motion.p variants={T(1)} initial="hidden" animate="show"
            className="text-sm mb-7" style={{ color: th.muted }}>
            {format(start, "dd MMM", { locale: ptBR })} → {format(end, "dd MMM yyyy", { locale: ptBR })}
          </motion.p>

          <motion.div variants={T(2)} initial="hidden" animate="show" className="mb-6">
            <div className="flex justify-between text-xs mb-1.5" style={{ color: th.ghost }}>
              <span>{format(start, 'MMM yyyy', { locale: ptBR })}</span>
              <span style={{ color: 'var(--color-brand,#00D4AA)', fontWeight: 700 }}>HOJE · {timePct}%</span>
              <span>{format(end, 'MMM yyyy', { locale: ptBR })}</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: th.surface }}>
              <motion.div initial={{ width: 0 }} animate={{ width: `${timePct}%` }}
                transition={{ duration: 1.3, ease: [0.22, 1, 0.36, 1] }}
                className="h-full" style={{ background: 'var(--color-brand,#00D4AA)', borderRadius: 4 }} />
            </div>
          </motion.div>

          <motion.div variants={T(3)} initial="hidden" animate="show" className="space-y-1.5 mb-5">
            {phases.map(ph => {
              const ps  = new Date(ph.startDate)
              const pe  = new Date(ph.endDate)
              const cfg = STATUS_CFG[ph.status]
              const isA = ph.status === 'in_progress'
              const bg  = ph.status === 'completed'   ? `${cfg.color}88`
                        : ph.status === 'in_progress' ? 'linear-gradient(90deg,var(--color-brand,#00D4AA),var(--color-brand-secondary,#8B5CF6))'
                        : ph.status === 'blocked'     ? `${cfg.color}77`
                        : `${cfg.color}28`
              return (
                <div key={ph.id} className="flex items-center gap-3 h-7">
                  <div className="flex items-center gap-1.5 shrink-0" style={{ width: 155 }}>
                    <cfg.icon style={{ width: 9, height: 9, color: cfg.color, flexShrink: 0 }} />
                    <span className="text-xs truncate"
                          style={{ color: isA ? th.text : th.muted, fontWeight: isA ? 700 : 400 }}>
                      {ph.name}
                    </span>
                  </div>
                  <div className="flex-1 relative h-5">
                    <div style={{
                      position: 'absolute', left: `${pct(ps)}%`, width: `${barW(ps, pe)}%`,
                      height: '100%', borderRadius: 3, background: bg,
                      boxShadow: isA ? '0 0 8px var(--color-brand-glow,rgba(0,212,170,0.3))' : undefined,
                    }} />
                    {today >= start && today <= end && (
                      <div style={{
                        position: 'absolute', left: `${pct(today)}%`,
                        top: 0, bottom: 0, width: 1,
                        background: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)',
                      }} />
                    )}
                  </div>
                </div>
              )
            })}
          </motion.div>

          <AIBox loading={aiLoading} th={th} motionIndex={4}>
            <p className="text-sm italic" style={{ color: th.muted }}>"{ai?.keyInsight}"</p>
          </AIBox>
        </div>
      )

      // ── 04 KPIs ───────────────────────────────────────────────────────────
      case 3: return (
        <div className="flex flex-col justify-center min-h-full px-16 py-20 max-w-3xl mx-auto w-full">
          <motion.p variants={T(0)} initial="hidden" animate="show"
            className="text-xs font-black uppercase tracking-[0.22em] mb-1"
            style={{ color: 'var(--color-brand,#00D4AA)' }}>04</motion.p>
          <motion.h2 variants={T(1)} initial="hidden" animate="show"
            className="font-black tracking-tight mb-7"
            style={{ fontSize: 'clamp(2rem,4vw,3rem)', color: th.text }}>KPIs & Métricas</motion.h2>

          {project.kpis && project.kpis.length > 0 ? (
            <motion.div variants={T(2)} initial="hidden" animate="show"
              className="grid grid-cols-2 gap-4 mb-5">
              {project.kpis.slice(0, 4).map(kpi => {
                const prog = kpi.target > 0 ? Math.min(100, Math.round((kpi.value / kpi.target) * 100)) : 0
                const pc   = prog >= 80 ? '#10B981' : prog >= 50 ? '#F59E0B' : '#EF4444'
                return (
                  <div key={kpi.id} className="p-5 space-y-3"
                       style={{ background: th.surface, border: `1px solid ${th.border}`, borderRadius: 5 }}>
                    <p className="text-xs uppercase tracking-wide" style={{ color: th.ghost }}>{kpi.label}</p>
                    <div className="flex items-end gap-2">
                      <span className="text-3xl font-black" style={{ color: th.text, lineHeight: 1 }}>
                        {kpi.value}{kpi.unit ?? ''}
                      </span>
                      <span className="text-sm mb-0.5" style={{ color: th.ghost }}>
                        / {kpi.target}{kpi.unit ?? ''}
                      </span>
                    </div>
                    <div>
                      <div className="h-1 rounded-full overflow-hidden mb-1"
                           style={{ background: th.ghost }}>
                        <motion.div initial={{ width: 0 }} animate={{ width: `${prog}%` }}
                          transition={{ duration: 1.1, ease: 'easeOut' }}
                          className="h-full rounded-full" style={{ background: pc }} />
                      </div>
                      <p className="text-xs font-bold" style={{ color: pc }}>{prog}% da meta</p>
                    </div>
                  </div>
                )
              })}
            </motion.div>
          ) : (
            <motion.div variants={T(2)} initial="hidden" animate="show"
              className="flex flex-col items-center gap-3 py-12 mb-5 text-center"
              style={{ background: th.surface, border: `1px dashed ${th.border}`, borderRadius: 5 }}>
              <BarChart3 style={{ width: 22, height: 22, color: th.ghost }} />
              <p className="text-sm" style={{ color: th.muted }}>Nenhum KPI cadastrado</p>
            </motion.div>
          )}

          <motion.div variants={T(3)} initial="hidden" animate="show"
            className="p-4 space-y-3"
            style={{ background: th.surface, border: `1px solid ${th.border}`, borderRadius: 5 }}>
            <p className="text-[10px] uppercase tracking-widest mb-3" style={{ color: th.ghost }}>
              distribuição por status
            </p>
            {Object.entries(STATUS_CFG).map(([st, cfg]) => {
              const cnt = phases.filter(p => p.status === st).length
              const w   = phases.length ? Math.round((cnt / phases.length) * 100) : 0
              return (
                <div key={st} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <cfg.icon style={{ width: 9, height: 9, color: cfg.color }} />
                      <span style={{ color: th.muted }}>{cfg.label}</span>
                    </div>
                    <span style={{ color: th.ghost }}>{cnt}</span>
                  </div>
                  <div className="h-0.5 rounded-full overflow-hidden" style={{ background: th.ghost }}>
                    <motion.div initial={{ width: 0 }} animate={{ width: `${w}%` }}
                      transition={{ duration: 0.9, ease: 'easeOut' }}
                      className="h-full rounded-full" style={{ background: cfg.color }} />
                  </div>
                </div>
              )
            })}
          </motion.div>
        </div>
      )

      // ── 05 PRÓXIMOS PASSOS ────────────────────────────────────────────────
      case 4: return (
        <div className="flex flex-col justify-center min-h-full px-16 py-20 max-w-3xl mx-auto w-full">
          <motion.p variants={T(0)} initial="hidden" animate="show"
            className="text-xs font-black uppercase tracking-[0.22em] mb-1"
            style={{ color: 'var(--color-brand,#00D4AA)' }}>05</motion.p>
          <motion.h2 variants={T(1)} initial="hidden" animate="show"
            className="font-black tracking-tight mb-7"
            style={{ fontSize: 'clamp(2rem,4vw,3rem)', color: th.text }}>Próximos Passos</motion.h2>

          {active && (
            <motion.div variants={T(2)} initial="hidden" animate="show"
              className="flex items-center gap-4 p-4 mb-4"
              style={{ background: isDark ? 'rgba(0,212,170,0.06)' : 'rgba(0,212,170,0.1)', border: '1px solid rgba(0,212,170,0.22)', borderRadius: 5 }}>
              <div className="w-10 h-10 flex items-center justify-center shrink-0"
                   style={{ background: 'var(--color-brand,#00D4AA)', borderRadius: 7 }}>
                <Clock style={{ width: 14, height: 14, color: '#050508' }} />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-0.5"
                   style={{ color: 'var(--color-brand,#00D4AA)' }}>em andamento</p>
                <p className="text-sm font-bold" style={{ color: th.text }}>{active.name}</p>
                <p className="text-xs" style={{ color: th.muted }}>
                  até {format(new Date(active.endDate), "dd 'de' MMM yyyy", { locale: ptBR })}
                </p>
              </div>
            </motion.div>
          )}

          {pending.length > 0 && (
            <motion.div variants={T(3)} initial="hidden" animate="show" className="space-y-1.5 mb-5">
              {pending.slice(0, 5).map((ph, i) => (
                <div key={ph.id} className="flex items-center gap-3 px-4 py-2.5"
                     style={{ background: th.surface, border: `1px solid ${th.border}`, borderRadius: 7 }}>
                  <span className="text-xs font-bold shrink-0" style={{ color: th.ghost, width: 18 }}>
                    {i + 1}
                  </span>
                  <span className="text-sm flex-1 truncate" style={{ color: th.muted }}>{ph.name}</span>
                  <span className="text-xs shrink-0" style={{ color: th.ghost }}>
                    {format(new Date(ph.startDate), 'dd/MM')} → {format(new Date(ph.endDate), 'dd/MM')}
                  </span>
                </div>
              ))}
            </motion.div>
          )}

          <AIBox loading={aiLoading} th={th} motionIndex={4}>
            <div className="space-y-1.5">
              {ai?.nextStepsNarrative.split('\n').filter(Boolean).map((line, i) => (
                <div key={i} className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
                       style={{ background: 'var(--color-brand,#00D4AA)' }} />
                  <p className="text-sm" style={{ color: th.muted }}>{line}</p>
                </div>
              ))}
            </div>
          </AIBox>
        </div>
      )

      // ── 06 RISCOS ─────────────────────────────────────────────────────────
      case 5: return (
        <div className="flex flex-col justify-center min-h-full px-16 py-20 max-w-3xl mx-auto w-full">
          <motion.p variants={T(0)} initial="hidden" animate="show"
            className="text-xs font-black uppercase tracking-[0.22em] mb-1"
            style={{ color: 'var(--color-brand,#00D4AA)' }}>06</motion.p>
          <motion.h2 variants={T(1)} initial="hidden" animate="show"
            className="font-black tracking-tight mb-7"
            style={{ fontSize: 'clamp(2rem,4vw,3rem)', color: th.text }}>Riscos & Bloqueios</motion.h2>

          {blocked.length > 0 ? (
            <motion.div variants={T(2)} initial="hidden" animate="show" className="space-y-2.5 mb-5">
              {blocked.map(ph => (
                <div key={ph.id} className="flex items-start gap-3 p-4"
                     style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.18)', borderRadius: 8 }}>
                  <AlertCircle style={{ width: 14, height: 14, color: '#EF4444', flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <p className="text-sm font-semibold" style={{ color: '#FCA5A5' }}>{ph.name}</p>
                    <p className="text-xs mt-0.5" style={{ color: th.muted }}>
                      {format(new Date(ph.startDate), 'dd/MM')} – {format(new Date(ph.endDate), 'dd/MM')}
                    </p>
                  </div>
                </div>
              ))}
            </motion.div>
          ) : (
            <motion.div variants={T(2)} initial="hidden" animate="show"
              className="flex items-center gap-4 px-5 py-5 mb-5"
              style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: 8 }}>
              <CheckCircle2 style={{ width: 20, height: 20, color: '#10B981', flexShrink: 0 }} />
              <div>
                <p className="text-sm font-semibold" style={{ color: '#6EE7B7' }}>Sem bloqueios ativos</p>
                <p className="text-xs mt-0.5" style={{ color: th.muted }}>Progresso normal</p>
              </div>
            </motion.div>
          )}

          <motion.div variants={T(3)} initial="hidden" animate="show"
            className="grid grid-cols-3 gap-3 mb-5">
            {[
              { l: 'Bloqueios', v: String(blocked.length), c: blocked.length ? '#EF4444' : '#10B981' },
              { l: 'Pendentes', v: String(pending.length), c: '#64748B' },
              { l: 'Risco', v: blocked.length ? 'Alto' : completionPct < timePct - 15 ? 'Médio' : 'Baixo',
                c: blocked.length ? '#EF4444' : completionPct < timePct - 15 ? '#F59E0B' : '#10B981' },
            ].map(s => (
              <div key={s.l} className="p-4 text-center"
                   style={{ background: th.surface, border: `1px solid ${th.border}`, borderRadius: 8 }}>
                <p className="text-2xl font-black" style={{ color: s.c }}>{s.v}</p>
                <p className="text-xs mt-1" style={{ color: th.muted }}>{s.l}</p>
              </div>
            ))}
          </motion.div>

          <AIBox loading={aiLoading} th={th} motionIndex={4}>
            <p className="text-sm leading-relaxed" style={{ color: th.muted }}>{ai?.riskAssessment}</p>
          </AIBox>

          <motion.div variants={T(5)} initial="hidden" animate="show"
            className="mt-10 pt-5 flex items-center justify-between"
            style={{ borderTop: `1px solid ${th.border}` }}>
            <p className="text-xs" style={{ color: th.ghost }}>
              Sellers Pulse · {project.clientName} · {format(today, 'dd/MM/yyyy')}
            </p>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--color-brand,#00D4AA)' }} />
              <span className="text-xs font-bold" style={{ color: 'var(--color-brand,#00D4AA)' }}>Sellers</span>
            </div>
          </motion.div>
        </div>
      )

      default: return null
    }
  }

  // ─── Layout ───────────────────────────────────────────────────────────────
  return (
    <div
      ref={containerRef}
      className="relative flex flex-col select-none"
      style={{
        minHeight: 'calc(100vh - 56px)',
        background: th.bg,
        // Fullscreen override
        ...(isFullscr ? { position: 'fixed', inset: 0, zIndex: 9999, minHeight: '100vh' } : {}),
        transition: 'background 0.35s ease',
      }}
    >
      {/* ── Slide viewport (NO card, NO border) ─────────────────────────── */}
      <div className="flex-1 relative overflow-hidden"
           style={{ minHeight: 'calc(100vh - 56px - 60px)' }}>
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={slide}
            custom={direction}
            variants={SLIDE_VARIANTS}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0 overflow-y-auto"
          >
            {renderSlide()}
          </motion.div>
        </AnimatePresence>

        {/* Edit mode hint overlay (top-right, subtle) */}
        {isEditing && (
          <div className="absolute top-4 right-4 text-xs px-3 py-1.5 rounded font-medium pointer-events-none"
               style={{ background: 'rgba(0,212,170,0.12)', color: 'var(--color-brand,#00D4AA)', border: '1px solid rgba(0,212,170,0.25)' }}>
            Modo Edição — clique nos textos
          </div>
        )}
      </div>

      {/* ── Nav bar ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-10 py-0 relative z-10 shrink-0"
           style={{
             height:       60,
             background:   th.navBg,
             backdropFilter: 'blur(16px)',
             borderTop:    `1px solid ${th.border}`,
           }}>

        {/* Slide dots */}
        <div className="flex items-center gap-2">
          {Array.from({ length: SLIDE_COUNT }).map((_, i) => (
            <button key={i} onClick={() => goTo(i)} title={SLIDE_LABEL[i]}
              className="rounded-full transition-all duration-300"
              style={{
                width:      i === slide ? 20 : 6,
                height:     6,
                background: i === slide
                  ? 'var(--color-brand,#00D4AA)'
                  : th.ghost,
                borderRadius: 3,
              }} />
          ))}
        </div>

        {/* Slide label */}
        <AnimatePresence mode="wait">
          <motion.p key={slide}
            initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.15 }}
            className="absolute left-1/2 -translate-x-1/2 text-xs uppercase tracking-[0.18em] font-semibold"
            style={{ color: th.ghost }}>
            {SLIDE_LABEL[slide]}
          </motion.p>
        </AnimatePresence>

        {/* Controls */}
        <div className="flex items-center gap-1.5">

          {/* Keyboard hints */}
          <div className="hidden md:flex items-center gap-1 mr-1 select-none"
               style={{ color: th.ghost }}>
            {['←','→','E','T','F11'].map(k => (
              <kbd key={k} className="text-[9px] px-1.5 py-0.5 rounded border font-mono"
                   style={{ borderColor: th.border, background: th.surface, color: th.ghost }}>
                {k}
              </kbd>
            ))}
          </div>

          {/* Theme toggle */}
          <button onClick={() => setIsDark(v => !v)} title="Alternar tema (T)"
            className="w-8 h-8 flex items-center justify-center transition-all"
            style={{ background: th.surface, border: `1px solid ${th.border}`, borderRadius: 7, color: th.muted }}>
            {isDark
              ? <Sun    style={{ width: 13, height: 13 }} />
              : <Moon   style={{ width: 13, height: 13 }} />}
          </button>

          {/* Lock/Edit toggle */}
          <button onClick={() => setIsEditing(v => !v)} title="Edição inline (E)"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-all"
            style={{
              background:   isEditing ? 'rgba(0,212,170,0.1)' : th.surface,
              border:       isEditing ? '1px solid rgba(0,212,170,0.28)' : `1px solid ${th.border}`,
              color:        isEditing ? 'var(--color-brand,#00D4AA)' : th.muted,
              borderRadius: 7,
            }}>
            {isEditing
              ? <><Unlock style={{ width: 11, height: 11 }} /> Editando</>
              : <><Lock   style={{ width: 11, height: 11 }} /> Bloqueado</>}
          </button>

          {/* Fullscreen */}
          <button onClick={toggleFullscreen} title="Tela cheia (F11)"
            className="w-8 h-8 flex items-center justify-center transition-all"
            style={{ background: th.surface, border: `1px solid ${th.border}`, borderRadius: 7, color: th.muted }}>
            {isFullscr
              ? <Minimize2 style={{ width: 13, height: 13 }} />
              : <Maximize2 style={{ width: 13, height: 13 }} />}
          </button>

          {/* Prev / Next */}
          <div className="flex gap-1 ml-1">
            <button onClick={() => paginate(-1)} disabled={slide === 0}
              className="w-8 h-8 flex items-center justify-center transition-all"
              style={{
                background:   th.surface,
                border:       `1px solid ${th.border}`,
                borderRadius: 7,
                color:        slide === 0 ? th.ghost : th.muted,
                opacity:      slide === 0 ? 0.4 : 1,
              }}>
              <ChevronLeft style={{ width: 14, height: 14 }} />
            </button>
            <button onClick={() => paginate(1)} disabled={slide === SLIDE_COUNT - 1}
              className="w-8 h-8 flex items-center justify-center transition-all"
              style={{
                background:   slide < SLIDE_COUNT - 1 ? 'var(--color-brand,#00D4AA)' : th.surface,
                border:       `1px solid ${th.border}`,
                borderRadius: 7,
                color:        slide < SLIDE_COUNT - 1 ? '#050508' : th.ghost,
                opacity:      slide === SLIDE_COUNT - 1 ? 0.4 : 1,
              }}>
              <ChevronRight style={{ width: 14, height: 14 }} />
            </button>
          </div>
        </div>
      </div>

      {/* Saving indicator */}
      {saving && (
        <div className="fixed bottom-20 right-6 text-xs px-3 py-1.5 rounded"
             style={{ background: 'rgba(0,212,170,0.1)', color: 'var(--color-brand,#00D4AA)', border: '1px solid rgba(0,212,170,0.2)' }}>
          Salvando…
        </div>
      )}
    </div>
  )
}