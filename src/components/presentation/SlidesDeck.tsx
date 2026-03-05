'use client'

import { useEffect, useState, useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { format, differenceInDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  CheckCircle2, Clock, AlertCircle, Circle,
  ChevronDown, Calendar, Target, BarChart3,
  ArrowRight, Sparkles,
} from 'lucide-react'
import type { Project, PhaseStatus } from '@/types'

// ─── Types ────────────────────────────────────────────────────────────────────

interface AIContent {
  tagline:              string
  statusSummary:        string
  nextStepsNarrative:   string
  riskAssessment:       string
  keyInsight:           string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_CFG: Record<PhaseStatus, { color: string; icon: React.ElementType; label: string }> = {
  completed:   { color: '#10B981', icon: CheckCircle2, label: 'Concluída'     },
  in_progress: { color: 'var(--color-brand, #00D4AA)', icon: Clock, label: 'Em Andamento' },
  blocked:     { color: '#EF4444', icon: AlertCircle,  label: 'Bloqueada'     },
  pending:     { color: '#64748B', icon: Circle,       label: 'Pendente'      },
}

const HEALTH = {
  on_track: { label: 'No Prazo',   color: '#10B981', bg: 'rgba(16,185,129,0.12)'  },
  attention: { label: 'Atenção',   color: '#F59E0B', bg: 'rgba(245,158,11,0.12)'  },
  delayed:   { label: 'Atrasado',  color: '#EF4444', bg: 'rgba(239,68,68,0.12)'   },
  blocked:   { label: 'Bloqueado', color: '#EF4444', bg: 'rgba(239,68,68,0.12)'   },
} as const

// ─── Sub-components ───────────────────────────────────────────────────────────

function Slide({ children, index }: { children: React.ReactNode; index: number }) {
  const ref     = useRef<HTMLDivElement>(null)
  const inView  = useInView(ref, { once: true, margin: '-8% 0px' })
  return (
    <motion.section
      ref={ref}
      initial={{ opacity: 0, y: 28 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1], delay: 0.08 }}
      className="relative w-full min-h-screen flex flex-col justify-center px-8 py-20"
      style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
    >
      <span className="absolute top-8 right-10 font-mono text-xs select-none"
            style={{ color: 'rgba(255,255,255,0.1)' }}>
        {String(index + 1).padStart(2, '0')} / 06
      </span>
      {children}
    </motion.section>
  )
}

function AIBadge() {
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
          style={{ background: 'rgba(139,92,246,0.18)', border: '1px solid rgba(139,92,246,0.3)', color: '#A78BFA' }}>
      <Sparkles style={{ width: 8, height: 8 }} /> IA
    </span>
  )
}

function Skeleton({ lines = 2 }: { lines?: number }) {
  return (
    <div className="space-y-2.5 animate-pulse w-full">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="h-3 rounded-full"
             style={{ background: 'rgba(255,255,255,0.07)', width: i === lines - 1 ? '55%' : '100%' }} />
      ))}
    </div>
  )
}

function SectionLabel({ n, title, subtitle }: { n: string; title: string; subtitle?: string }) {
  return (
    <div className="space-y-1 mb-8">
      <p className="text-xs font-bold uppercase tracking-[0.2em]"
         style={{ color: 'var(--color-brand, #00D4AA)' }}>{n}</p>
      <h2 className="text-3xl font-black tracking-tight" style={{ color: '#F0F0F5' }}>{title}</h2>
      {subtitle && <p className="text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>{subtitle}</p>}
    </div>
  )
}

function AIBox({ loading, children }: { loading: boolean; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl p-5 space-y-3"
         style={{ background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.15)' }}>
      <div className="flex items-center gap-2">
        <AIBadge />
        <span className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>gerado automaticamente</span>
      </div>
      {loading ? <Skeleton lines={3} /> : children}
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function SlidesDeck({ project }: { project: Project }) {
  const [ai,        setAI]      = useState<AIContent | null>(null)
  const [aiLoading, setLoading] = useState(true)

  // ── Derived ──────────────────────────────────────────────────────────────
  const phases         = project.phases ?? []
  const completed      = phases.filter(p => p.status === 'completed')
  const blocked        = phases.filter(p => p.status === 'blocked')
  const pending        = phases.filter(p => p.status === 'pending')
  const active         = phases.find(p => p.status === 'in_progress')
  const completionPct  = phases.length ? Math.round((completed.length / phases.length) * 100) : 0

  const start      = new Date(project.startDate)
  const end        = new Date(project.endDate)
  const today      = new Date()
  const totalDays  = differenceInDays(end, start) || 1
  const timePct    = Math.min(100, Math.round((differenceInDays(today, start) / totalDays) * 100))

  const healthKey: keyof typeof HEALTH =
    blocked.length > 0            ? 'blocked'
    : completionPct < timePct - 15 ? 'delayed'
    : completionPct < timePct - 5  ? 'attention'
    : 'on_track'
  const health = HEALTH[healthKey]

  const pct = (d: Date) =>
    Math.min(100, Math.max(0, (differenceInDays(d, start) / totalDays) * 100))
  const barW = (s: Date, e: Date) =>
    Math.max(2, (differenceInDays(e, s) / totalDays) * 100)

  // ── AI generation on mount ───────────────────────────────────────────────
  useEffect(() => {
    const generate = async () => {
      setLoading(true)
      try {
        const res  = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 1000,
            system:
              'Você é um consultor sênior de projetos B2B da empresa Sellers. ' +
              'Gere conteúdo executivo conciso para apresentação de status. ' +
              'Responda APENAS com JSON válido. Sem markdown, sem backticks, sem texto fora do JSON.',
            messages: [{
              role: 'user',
              content:
`Projeto: ${project.name}
Cliente: ${project.client ?? 'Não informado'}
Período: ${format(start, "dd 'de' MMMM", { locale: ptBR })} a ${format(end, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
Objetivo: ${project.objective ?? 'Não definido'}
Descrição: ${project.description ?? 'Não definida'}
Conclusão: ${completionPct}% (${completed.length}/${phases.length} fases)
Saúde: ${health.label}
Fase atual: ${active?.name ?? 'Nenhuma em andamento'}
Bloqueios: ${blocked.map(p => p.name).join(', ') || 'Nenhum'}
Próximas fases: ${pending.slice(0, 3).map(p => p.name).join(', ') || 'Nenhuma'}

Retorne EXATAMENTE este JSON sem nenhum texto antes ou depois:
{
  "tagline": "frase executiva de uma linha sobre o projeto (máx 12 palavras)",
  "statusSummary": "2-3 linhas sobre o status atual do projeto de forma executiva",
  "nextStepsNarrative": "3 recomendações práticas separadas por \\n",
  "riskAssessment": "análise objetiva dos riscos identificados em 2-3 linhas",
  "keyInsight": "um insight estratégico sobre o projeto (máx 15 palavras)"
}`,
            }],
          }),
        })
        const data   = await res.json()
        const text   = data.content?.find((b: { type: string }) => b.type === 'text')?.text ?? '{}'
        const parsed = JSON.parse(text.replace(/```json|```/g, '').trim()) as AIContent
        setAI(parsed)
      } catch {
        setAI({
          tagline:            `Apresentação de status — ${project.name}`,
          statusSummary:      'Análise automática indisponível no momento.',
          nextStepsNarrative: 'Verificar fases pendentes.\nAlinhar bloqueios com equipe.\nAtualizar métricas semanais.',
          riskAssessment:     'Verificar fases bloqueadas e identificar dependências críticas.',
          keyInsight:         'Manter foco nas entregas prioritárias do projeto.',
        })
      } finally {
        setLoading(false)
      }
    }
    generate()
  }, [project.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="w-full" style={{ background: '#050508' }}>

      {/* ═══════════════════════════════════════════════════════════
          SLIDE 01 — CAPA
      ══════════════════════════════════════════════════════════════ */}
      <Slide index={0}>
        <div className="max-w-3xl mx-auto w-full">

          {/* Client badge */}
          <div className="flex items-center gap-4 mb-10">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black shrink-0"
                 style={{ background: 'var(--color-brand, #00D4AA)', color: '#050508' }}>
              {(project.client ?? project.name).charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest font-semibold"
                 style={{ color: 'rgba(255,255,255,0.28)' }}>
                {project.client ?? 'Sellers'}
              </p>
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
                Apresentação de Status do Projeto
              </p>
            </div>
          </div>

          {/* Title */}
          <h1 className="font-black leading-[1.05] tracking-tight mb-5"
              style={{ fontSize: 'clamp(2.8rem,6vw,5.5rem)', color: '#F0F0F5' }}>
            {project.name}
          </h1>

          {/* AI tagline */}
          <div className="flex items-start gap-2.5 mb-10">
            <AIBadge />
            <p className="text-lg font-light italic leading-relaxed"
               style={{ color: 'rgba(255,255,255,0.4)' }}>
              {aiLoading ? '...' : `"${ai?.tagline}"`}
            </p>
          </div>

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-5 pt-6"
               style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-2">
              <Calendar style={{ width: 13, height: 13, color: 'rgba(255,255,255,0.28)' }} />
              <span className="text-sm" style={{ color: 'rgba(255,255,255,0.38)' }}>
                {format(start, "dd 'de' MMM", { locale: ptBR })} →{' '}
                {format(end, "dd 'de' MMM yyyy", { locale: ptBR })}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Target style={{ width: 13, height: 13, color: 'rgba(255,255,255,0.28)' }} />
              <span className="text-sm" style={{ color: 'rgba(255,255,255,0.38)' }}>
                {phases.length} fases · {completionPct}% concluído
              </span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full"
                 style={{ background: health.bg }}>
              <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: health.color }} />
              <span className="text-xs font-bold" style={{ color: health.color }}>{health.label}</span>
            </div>
          </div>

          <p className="mt-6 text-xs" style={{ color: 'rgba(255,255,255,0.15)' }}>
            Gerado em {format(today, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </p>
        </div>

        {/* Scroll hint */}
        <motion.div
          animate={{ y: [0, 7, 0] }}
          transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 select-none"
          style={{ color: 'rgba(255,255,255,0.12)' }}
        >
          <span className="text-[9px] uppercase tracking-[0.25em]">scroll</span>
          <ChevronDown style={{ width: 15, height: 15 }} />
        </motion.div>
      </Slide>

      {/* ═══════════════════════════════════════════════════════════
          SLIDE 02 — STATUS GERAL
      ══════════════════════════════════════════════════════════════ */}
      <Slide index={1}>
        <div className="max-w-3xl mx-auto w-full">
          <SectionLabel n="02" title="Status Geral" />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">

            {/* Donut */}
            <div className="rounded-2xl p-7 flex flex-col items-center gap-4"
                 style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="relative" style={{ width: 148, height: 148 }}>
                <svg viewBox="0 0 148 148" className="-rotate-90" style={{ width: 148, height: 148, position: 'absolute', inset: 0 }}>
                  <circle cx="74" cy="74" r="60"
                    fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="12" />
                  <circle cx="74" cy="74" r="60"
                    fill="none"
                    stroke="var(--color-brand, #00D4AA)"
                    strokeWidth="12"
                    strokeLinecap="round"
                    strokeDasharray={String(2 * Math.PI * 60)}
                    strokeDashoffset={String(2 * Math.PI * 60 * (1 - completionPct / 100))}
                    style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.22,1,0.36,1)' }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-4xl font-black" style={{ color: '#F0F0F5', lineHeight: 1 }}>
                    {completionPct}%
                  </span>
                  <span className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.3)' }}>concluído</span>
                </div>
              </div>
              <p className="text-sm text-center" style={{ color: 'rgba(255,255,255,0.35)' }}>
                {completed.length} de {phases.length} fases entregues
              </p>
            </div>

            {/* Stats */}
            <div className="flex flex-col gap-2.5 justify-center">
              {[
                { label: 'Fase Atual',        value: active?.name ?? '—',                     color: 'var(--color-brand, #00D4AA)' },
                { label: 'Bloqueadas',        value: `${blocked.length} fase${blocked.length !== 1 ? 's' : ''}`, color: blocked.length ? '#EF4444' : '#10B981' },
                { label: 'Pendentes',         value: `${pending.length} fase${pending.length !== 1 ? 's' : ''}`, color: '#64748B' },
                { label: 'Tempo Decorrido',   value: `${timePct}%`,                           color: 'rgba(255,255,255,0.5)' },
              ].map(s => (
                <div key={s.label}
                     className="flex items-center justify-between px-4 py-3 rounded-xl"
                     style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <span className="text-sm" style={{ color: 'rgba(255,255,255,0.38)' }}>{s.label}</span>
                  <span className="text-sm font-semibold truncate max-w-[140px] text-right"
                        style={{ color: s.color }}>
                    {s.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <AIBox loading={aiLoading}>
            <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>
              {ai?.statusSummary}
            </p>
          </AIBox>
        </div>
      </Slide>

      {/* ═══════════════════════════════════════════════════════════
          SLIDE 03 — TIMELINE
      ══════════════════════════════════════════════════════════════ */}
      <Slide index={2}>
        <div className="max-w-3xl mx-auto w-full">
          <SectionLabel
            n="03" title="Timeline"
            subtitle={`${format(start, "dd MMM", { locale: ptBR })} → ${format(end, "dd MMM yyyy", { locale: ptBR })}`}
          />

          {/* Time progress */}
          <div className="mb-6 space-y-1.5">
            <div className="flex justify-between text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>
              <span>{format(start, 'MMM yyyy', { locale: ptBR })}</span>
              <span style={{ color: 'var(--color-brand, #00D4AA)', fontWeight: 600 }}>
                HOJE · {timePct}% do prazo
              </span>
              <span>{format(end, 'MMM yyyy', { locale: ptBR })}</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${timePct}%` }}
                transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
                className="h-full rounded-full"
                style={{ background: 'var(--color-brand, #00D4AA)' }}
              />
            </div>
          </div>

          {/* Mini Gantt (read-only) */}
          <div className="space-y-2 mb-6">
            {phases.map((phase, i) => {
              const ps  = new Date(phase.startDate)
              const pe  = new Date(phase.endDate)
              const cfg = STATUS_CFG[phase.status]
              const isA = phase.status === 'in_progress'

              const bg = phase.status === 'completed'   ? `${cfg.color}99`
                       : phase.status === 'in_progress' ? 'linear-gradient(90deg, var(--color-brand,#00D4AA), var(--color-brand-secondary,#8B5CF6))'
                       : phase.status === 'blocked'     ? `${cfg.color}88`
                       : undefined

              return (
                <motion.div
                  key={phase.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.04 }}
                  className="flex items-center gap-3 h-8"
                >
                  <div className="flex items-center gap-1.5 shrink-0" style={{ width: 156 }}>
                    <cfg.icon style={{ width: 10, height: 10, color: cfg.color, flexShrink: 0 }} />
                    <span className="text-xs truncate"
                          style={{ color: isA ? '#fff' : 'rgba(255,255,255,0.42)', fontWeight: isA ? 600 : 400 }}>
                      {phase.name}
                    </span>
                  </div>

                  <div className="flex-1 relative h-6">
                    <div style={{
                      position: 'absolute',
                      left:     `${pct(ps)}%`,
                      width:    `${barW(ps, pe)}%`,
                      height:   '100%',
                      borderRadius: 4,
                      background: bg,
                      border: !bg ? `1px solid ${cfg.color}44` : undefined,
                      ...(phase.status === 'pending' ? { background: `${cfg.color}28` } : {}),
                      ...(phase.status === 'in_progress' ? { boxShadow: '0 0 10px var(--color-brand-glow, rgba(0,212,170,0.3))' } : {}),
                    }} />
                    {/* Today marker */}
                    {today >= start && today <= end && (
                      <div style={{
                        position: 'absolute', left: `${pct(today)}%`,
                        top: 0, bottom: 0, width: 1,
                        background: 'rgba(255,255,255,0.25)',
                        zIndex: 2,
                      }} />
                    )}
                  </div>
                </motion.div>
              )
            })}
          </div>

          {/* Key insight */}
          <div className="flex items-start gap-3 rounded-xl px-5 py-4"
               style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <AIBadge />
            {aiLoading
              ? <Skeleton lines={1} />
              : <p className="text-sm italic" style={{ color: 'rgba(255,255,255,0.48)' }}>
                  "{ai?.keyInsight}"
                </p>
            }
          </div>
        </div>
      </Slide>

      {/* ═══════════════════════════════════════════════════════════
          SLIDE 04 — KPIs & MÉTRICAS
      ══════════════════════════════════════════════════════════════ */}
      <Slide index={3}>
        <div className="max-w-3xl mx-auto w-full">
          <SectionLabel n="04" title="KPIs & Métricas" />

          {project.kpis && project.kpis.length > 0 ? (
            <div className="grid grid-cols-2 gap-4 mb-6">
              {project.kpis.slice(0, 4).map((kpi) => {
                const prog = kpi.target > 0 ? Math.min(100, Math.round((kpi.value / kpi.target) * 100)) : 0
                const progressColor = prog >= 80 ? '#10B981' : prog >= 50 ? '#F59E0B' : '#EF4444'
                return (
                  <div key={kpi.id} className="rounded-2xl p-5 space-y-3"
                       style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                    <p className="text-xs uppercase tracking-wide"
                       style={{ color: 'rgba(255,255,255,0.3)' }}>{kpi.label}</p>
                    <div className="flex items-end gap-2">
                      <span className="text-3xl font-black" style={{ color: '#F0F0F5', lineHeight: 1 }}>
                        {kpi.value}{kpi.unit ?? ''}
                      </span>
                      <span className="text-sm mb-0.5" style={{ color: 'rgba(255,255,255,0.28)' }}>
                        / {kpi.target}{kpi.unit ?? ''}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <div className="h-1 rounded-full overflow-hidden"
                           style={{ background: 'rgba(255,255,255,0.06)' }}>
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${prog}%` }}
                          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
                          className="h-full rounded-full"
                          style={{ background: progressColor }}
                        />
                      </div>
                      <p className="text-xs font-semibold" style={{ color: progressColor }}>
                        {prog}% da meta
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="rounded-2xl p-10 flex flex-col items-center gap-4 text-center mb-6"
                 style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.07)' }}>
              <BarChart3 style={{ width: 28, height: 28, color: 'rgba(255,255,255,0.12)' }} />
              <div>
                <p className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.28)' }}>
                  Nenhum KPI cadastrado ainda
                </p>
                <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.16)' }}>
                  Adicione métricas via WeeklyUpdate para visualizar aqui
                </p>
              </div>
            </div>
          )}

          {/* Progress by status */}
          <div className="rounded-2xl p-5 space-y-3"
               style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <p className="text-xs uppercase tracking-widest mb-4"
               style={{ color: 'rgba(255,255,255,0.22)' }}>distribuição por status</p>
            {Object.entries(STATUS_CFG).map(([st, cfg]) => {
              const count = phases.filter(p => p.status === st).length
              const w     = phases.length ? Math.round((count / phases.length) * 100) : 0
              return (
                <div key={st} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <cfg.icon style={{ width: 10, height: 10, color: cfg.color }} />
                      <span style={{ color: 'rgba(255,255,255,0.38)' }}>{cfg.label}</span>
                    </div>
                    <span style={{ color: 'rgba(255,255,255,0.25)' }}>{count}</span>
                  </div>
                  <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${w}%` }}
                      transition={{ duration: 1, ease: 'easeOut' }}
                      className="h-full rounded-full"
                      style={{ background: cfg.color }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </Slide>

      {/* ═══════════════════════════════════════════════════════════
          SLIDE 05 — PRÓXIMOS PASSOS
      ══════════════════════════════════════════════════════════════ */}
      <Slide index={4}>
        <div className="max-w-3xl mx-auto w-full">
          <SectionLabel n="05" title="Próximos Passos" />

          {/* Active phase highlight */}
          {active && (
            <div className="rounded-2xl p-5 flex items-center gap-4 mb-5"
                 style={{
                   background: 'linear-gradient(135deg, rgba(0,212,170,0.07), rgba(139,92,246,0.07))',
                   border: '1px solid rgba(0,212,170,0.2)',
                 }}>
              <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                   style={{ background: 'var(--color-brand, #00D4AA)' }}>
                <Clock style={{ width: 18, height: 18, color: '#050508' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-widest mb-0.5"
                   style={{ color: 'var(--color-brand, #00D4AA)' }}>em andamento agora</p>
                <p className="text-base font-bold truncate" style={{ color: '#F0F0F5' }}>{active.name}</p>
                <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  até {format(new Date(active.endDate), "dd 'de' MMM yyyy", { locale: ptBR })}
                </p>
              </div>
            </div>
          )}

          {/* Pending list */}
          {pending.length > 0 && (
            <div className="space-y-2 mb-5">
              <p className="text-xs uppercase tracking-widest mb-3" style={{ color: 'rgba(255,255,255,0.2)' }}>
                fases pendentes
              </p>
              {pending.map((phase, i) => (
                <motion.div
                  key={phase.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.05)' }}
                >
                  <div className="w-5 h-5 rounded-full border shrink-0 flex items-center justify-center text-[10px] font-bold"
                       style={{ borderColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.18)' }}>
                    {i + 1}
                  </div>
                  <span className="text-sm flex-1 truncate" style={{ color: 'rgba(255,255,255,0.48)' }}>
                    {phase.name}
                  </span>
                  <span className="text-xs shrink-0" style={{ color: 'rgba(255,255,255,0.2)' }}>
                    {format(new Date(phase.startDate), 'dd/MM')}
                  </span>
                  <ArrowRight style={{ width: 11, height: 11, color: 'rgba(255,255,255,0.12)', flexShrink: 0 }} />
                  <span className="text-xs shrink-0" style={{ color: 'rgba(255,255,255,0.2)' }}>
                    {format(new Date(phase.endDate), 'dd/MM')}
                  </span>
                </motion.div>
              ))}
            </div>
          )}

          {pending.length === 0 && !active && (
            <div className="flex items-center gap-3 px-5 py-4 rounded-xl mb-5"
                 style={{ background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.15)' }}>
              <CheckCircle2 style={{ width: 20, height: 20, color: '#10B981', flexShrink: 0 }} />
              <p className="text-sm" style={{ color: '#6EE7B7' }}>Todas as fases concluídas</p>
            </div>
          )}

          <AIBox loading={aiLoading}>
            <div className="space-y-2">
              {ai?.nextStepsNarrative.split('\n').filter(Boolean).map((line, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <div className="w-1.5 h-1.5 rounded-full mt-[5px] shrink-0"
                       style={{ background: 'var(--color-brand, #00D4AA)' }} />
                  <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.58)' }}>{line}</p>
                </div>
              ))}
            </div>
          </AIBox>
        </div>
      </Slide>

      {/* ═══════════════════════════════════════════════════════════
          SLIDE 06 — RISCOS & BLOQUEIOS
      ══════════════════════════════════════════════════════════════ */}
      <Slide index={5}>
        <div className="max-w-3xl mx-auto w-full">
          <SectionLabel n="06" title="Riscos & Bloqueios" />

          {blocked.length > 0 ? (
            <div className="space-y-3 mb-6">
              {blocked.map((phase) => (
                <div key={phase.id}
                     className="rounded-xl p-4 flex items-start gap-4"
                     style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)' }}>
                  <AlertCircle style={{ width: 18, height: 18, color: '#EF4444', flexShrink: 0, marginTop: 1 }} />
                  <div>
                    <p className="text-sm font-semibold" style={{ color: '#FCA5A5' }}>{phase.name}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>
                      Bloqueada · {format(new Date(phase.startDate), 'dd/MM', { locale: ptBR })} – {format(new Date(phase.endDate), 'dd/MM', { locale: ptBR })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-4 px-6 py-5 rounded-2xl mb-6"
                 style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)' }}>
              <CheckCircle2 style={{ width: 26, height: 26, color: '#10B981', flexShrink: 0 }} />
              <div>
                <p className="text-base font-semibold" style={{ color: '#6EE7B7' }}>Sem bloqueios ativos</p>
                <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  Todas as fases estão progredindo normalmente
                </p>
              </div>
            </div>
          )}

          {/* Risk scores */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[
              {
                label: 'Bloqueios',
                value: String(blocked.length),
                color: blocked.length > 0 ? '#EF4444' : '#10B981',
              },
              {
                label: 'Pendentes',
                value: String(pending.length),
                color: '#64748B',
              },
              {
                label: 'Risco Geral',
                value: blocked.length > 0 ? 'Alto'
                     : completionPct < timePct - 15 ? 'Médio'
                     : 'Baixo',
                color: blocked.length > 0 ? '#EF4444'
                     : completionPct < timePct - 15 ? '#F59E0B'
                     : '#10B981',
              },
            ].map(item => (
              <div key={item.label} className="rounded-xl p-4 text-center"
                   style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <p className="text-2xl font-black" style={{ color: item.color }}>{item.value}</p>
                <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.28)' }}>{item.label}</p>
              </div>
            ))}
          </div>

          <AIBox loading={aiLoading}>
            <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.58)' }}>
              {ai?.riskAssessment}
            </p>
          </AIBox>

          {/* Footer / end mark */}
          <div className="mt-10 pt-6 flex items-center justify-between"
               style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.13)' }}>
              Sellers Pulse · {project.name} · {format(today, 'dd/MM/yyyy')}
            </p>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full"
                   style={{ background: 'var(--color-brand, #00D4AA)' }} />
              <span className="text-xs font-bold"
                    style={{ color: 'var(--color-brand, #00D4AA)' }}>Sellers</span>
            </div>
          </div>
        </div>
      </Slide>
    </div>
  )
}