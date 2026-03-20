'use client'
import { useEffect, useState, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  DollarSign, TrendingUp, AlertTriangle, Target,
  CheckCircle2, Clock, XCircle, Circle, Eye, EyeOff,
  Calendar, Zap,
} from 'lucide-react'
import {
  subscribeToProject,
  subscribeToDistributorsCollection,
  updateProject,
} from '@/lib/firestore'
import { useAuth } from '@/contexts/AuthContext'
import type { Project, Distributor, DistributorStatus } from '@/types'
import { format, addDays, startOfMonth, endOfMonth, isAfter } from 'date-fns'
import { ptBR } from 'date-fns/locale'

// ─── Config ───────────────────────────────────────────────────────────────────

const STATUS_CFG: Record<DistributorStatus, { label: string; color: string; Icon: any }> = {
  integrated:  { label: 'Integrado',    color: '#22c55e',   Icon: CheckCircle2 },
  pending:     { label: 'Pendente',     color: '#f59e0b',   Icon: Clock        },
  blocked:     { label: 'Bloqueado',    color: '#ef4444',   Icon: XCircle      },
  not_started: { label: 'Não iniciado', color: '#ffffff40', Icon: Circle       },
}

function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency', currency: 'BRL',
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  })
}

const FINAL_PHASES = ['onboarding opt-in', 'validação opt-in', 'validacao opt-in']

function isNearIntegration(d: Distributor): boolean {
  if (d.status === 'integrated') return false
  const notes = (d.notes ?? '').toLowerCase()
  return FINAL_PHASES.some(f => notes.includes(f))
}

function getNextBillingDate(): Date {
  const today = new Date()
  const firstNext = startOfMonth(addDays(endOfMonth(today), 1))
  return firstNext
}

function getCutoffDate(): Date {
  const today = new Date()
  return new Date(today.getFullYear(), today.getMonth(), 25)
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FaturamentoPage() {
  const { id } = useParams<{ id: string }>()
  const { user, loading } = useAuth()
  const router = useRouter()

  const [project,      setProject]      = useState<Project | null>(null)
  const [distributors, setDistributors] = useState<Distributor[]>([])
  const [showValues,   setShowValues]   = useState(false)

  useEffect(() => {
    if (!loading && !user) router.replace('/')
  }, [user, loading, router])

  useEffect(() => {
    if (!id) return
    return subscribeToProject(id, p => {
      setProject(p)
      if (p?.showRevenueToClient) setShowValues(p.showRevenueToClient)
    })
  }, [id])

  useEffect(() => {
    if (!id) return
    return subscribeToDistributorsCollection(id, setDistributors)
  }, [id])

  const toggleShowValues = async () => {
    const next = !showValues
    setShowValues(next)
    if (project) {
      await updateProject(project.id, { showRevenueToClient: next } as any)
    }
  }

  const data = useMemo(() => {
    const integrated = distributors.filter(d => d.status === 'integrated')
    const pending    = distributors.filter(d => d.status === 'pending')
    const blocked    = distributors.filter(d => d.status === 'blocked')
    const total      = distributors.length

    const revenueConfirmed = integrated.reduce((s, d) => s + (d.valuePerConnection ?? 0), 0)

    const avgValue = total > 0
      ? distributors.reduce((s, d) => s + (d.valuePerConnection ?? 0), 0) / distributors.filter(d => (d.valuePerConnection ?? 0) > 0).length || 0
      : 0

    const revenuePending  = pending.reduce((s, d) => s + (d.valuePerConnection || avgValue), 0)
    const revenueBlocked  = blocked.reduce((s, d) => s + (d.valuePerConnection || avgValue), 0)
    const revenueTotal    = distributors.reduce((s, d) => s + (d.valuePerConnection || avgValue), 0)

    const pct = revenueTotal > 0 ? Math.round((revenueConfirmed / revenueTotal) * 100) : 0

    const sorted = [
      ...integrated,
      ...pending,
      ...blocked,
      ...distributors.filter(d => d.status === 'not_started'),
    ]

    const nextBilling   = getNextBillingDate()
    const cutoff        = getCutoffDate()
    const today2        = new Date()
    const daysUntilCutoff = Math.ceil((cutoff.getTime() - today2.getTime()) / (1000 * 60 * 60 * 24))
    const cutoffPassed  = isAfter(today2, cutoff)

    const nearIntegration = distributors.filter(d => isNearIntegration(d))
    const revenueNearIntegration = nearIntegration.reduce((s, d) => s + (d.valuePerConnection || avgValue), 0)
    const revenueNextCycle = revenueConfirmed + revenueNearIntegration

    return {
      integrated, pending, blocked, total,
      revenueConfirmed, revenuePending, revenueBlocked, revenueTotal,
      avgValue, pct, sorted,
      nearIntegration, revenueNearIntegration, revenueNextCycle,
      nextBilling, cutoff, daysUntilCutoff, cutoffPassed,
    }
  }, [distributors])

  if (!project) return null

  const accent = project.clientColor ?? '#00D4AA'
  const accentRgb = project.clientColorRgb ?? '0,212,170'

  return (
    <div className="flex-1 px-8 pt-4 pb-12">

      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h2 className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>Faturamento</h2>
            <span
              className="text-[10px] font-bold tracking-widest px-2.5 py-1 rounded"
              style={{ background: `${accent}18`, color: accent, border: `1px solid ${accent}30` }}
            >
              {project.clientName}
            </span>
          </div>
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            Receita por conexão integrada
          </p>
        </div>

        <button
          onClick={toggleShowValues}
          className="flex items-center gap-2 px-3 py-2 rounded text-xs font-medium transition-all"
          style={{
            background: showValues ? `${accent}15` : 'var(--color-surface2)',
            border: `1px solid ${showValues ? accent + '30' : 'var(--color-border-2)'}`,
            color: showValues ? accent : 'var(--color-text-muted)',
          }}
        >
          {showValues ? <Eye style={{ width: 13, height: 13 }} /> : <EyeOff style={{ width: 13, height: 13 }} />}
          {showValues ? 'Valores visíveis ao cliente' : 'Valores ocultos ao cliente'}
        </button>
      </div>

      {/* Card principal — Receita Total */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded p-8 mb-6 relative overflow-hidden"
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 5,
        }}
      >
        <div
          className="absolute pointer-events-none"
          style={{
            top: '-40%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 500,
            height: 400,
            background: `radial-gradient(ellipse, rgba(${accentRgb}, 0.08) 0%, transparent 70%)`,
          }}
        />

        <div className="relative z-10 text-center">
          <p
            className="text-5xl font-black mb-2"
            style={{
              fontFamily: 'var(--font-outfit)',
              color: 'var(--color-text)',
              letterSpacing: '0.02em',
            }}
          >
            {formatBRL(data.revenueConfirmed)}
          </p>
          <p className="text-xs mb-6" style={{ color: 'var(--color-text-muted)' }}>
            receita confirmada
          </p>

          <div className="max-w-md mx-auto">
            <div className="h-3 rounded-full overflow-hidden mb-2" style={{ background: 'var(--color-border)' }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${data.pct}%` }}
                transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
                className="h-full rounded-full"
                style={{ background: `linear-gradient(90deg, ${accent}, ${project.clientColorSecondary || accent})` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs">
              <span style={{ color: 'var(--color-text-muted)' }}>
                {data.integrated.length} de {data.total} conexões integradas
              </span>
              <span className="font-bold" style={{ color: accent }}>
                {data.pct}% do potencial
              </span>
            </div>
          </div>

          <div className="mt-6 pt-5" style={{ borderTop: '1px solid var(--color-border)' }}>
            <div className="flex flex-col items-center gap-3">

              <div className="flex items-center gap-2">
                <Calendar style={{ width: 13, height: 13, color: 'var(--color-text-muted)' }} />
                <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  Próximo faturamento:
                </span>
                <span className="text-xs font-bold" style={{ color: 'var(--color-text)' }}>
                  {format(data.nextBilling, "1 'de' MMMM", { locale: ptBR })}
                </span>
                <span className="text-xs font-black" style={{ color: accent }}>
                  {formatBRL(data.revenueNextCycle)}
                </span>
              </div>

              {data.nearIntegration.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="flex items-start gap-3 px-4 py-3 rounded max-w-lg w-full"
                  style={{
                    background: data.cutoffPassed
                      ? 'rgba(239,68,68,0.08)'
                      : 'rgba(245,158,11,0.08)',
                    border: `1px solid ${data.cutoffPassed ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)'}`,
                  }}
                >
                  <Zap style={{
                    width: 14, height: 14, flexShrink: 0, marginTop: 1,
                    color: data.cutoffPassed ? '#ef4444' : '#f59e0b',
                  }} />
                  <div className="text-left">
                    <p className="text-xs font-semibold" style={{
                      color: data.cutoffPassed ? '#ef4444' : '#f59e0b',
                    }}>
                      {data.cutoffPassed
                        ? `Corte passou — ${data.nearIntegration.length} distribuidores ficaram fora deste ciclo`
                        : `${data.nearIntegration.length} distribuidores podem entrar no ciclo de ${format(data.nextBilling, "MMMM", { locale: ptBR })}`
                      }
                    </p>
                    <p className="text-[11px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                      {data.cutoffPassed
                        ? `Integre-os agora para garantir o faturamento de ${format(data.nextBilling, "1 'de' MMMM", { locale: ptBR })}`
                        : `Integrar até dia 25/${format(data.cutoff, 'MM')} garante +${formatBRL(data.revenueNearIntegration)} neste ciclo`
                      }
                    </p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {data.nearIntegration.slice(0, 5).map(d => (
                        <span key={d.id} className="text-[10px] px-2 py-0.5 rounded font-medium"
                          style={{
                            background: 'var(--color-border)',
                            color: 'var(--color-text-2)',
                            border: '1px solid var(--color-border-2)',
                          }}>
                          {d.name.split(' ')[0]}
                        </span>
                      ))}
                      {data.nearIntegration.length > 5 && (
                        <span className="text-[10px] px-2 py-0.5 rounded"
                          style={{ color: 'var(--color-text-muted)' }}>
                          +{data.nearIntegration.length - 5} mais
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Grid de cards secundários */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          {
            icon: Clock,
            label: 'Receita pendente',
            value: formatBRL(data.revenuePending),
            color: '#f59e0b',
            bg: 'rgba(245,158,11,0.06)',
            sub: `${data.pending.length} conexões`,
          },
          {
            icon: AlertTriangle,
            label: 'Receita em risco',
            value: formatBRL(data.revenueBlocked),
            color: '#ef4444',
            bg: 'rgba(239,68,68,0.06)',
            sub: `${data.blocked.length} conexões`,
          },
          {
            icon: DollarSign,
            label: 'Ticket médio',
            value: formatBRL(data.avgValue),
            color: accent,
            bg: `rgba(${accentRgb}, 0.06)`,
            sub: 'por conexão',
          },
          {
            icon: Target,
            label: 'Projeção 100%',
            value: formatBRL(data.revenueTotal),
            color: '#8B5CF6',
            bg: 'rgba(139,92,246,0.06)',
            sub: `${data.total} conexões`,
          },
        ].map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + i * 0.06 }}
            className="rounded p-5 relative overflow-hidden"
            style={{
              background: card.bg,
              border: '1px solid var(--color-border)',
              borderRadius: 5,
            }}
          >
            <div
              className="absolute -bottom-6 -right-6 w-20 h-20 rounded-full blur-2xl opacity-20"
              style={{ background: card.color }}
            />
            <div className="relative z-10">
              <div
                className="w-8 h-8 rounded flex items-center justify-center mb-3"
                style={{ background: `${card.color}18` }}
              >
                <card.icon style={{ width: 16, height: 16, color: card.color }} />
              </div>
              <p className="text-xl font-black" style={{ color: 'var(--color-text)' }}>{card.value}</p>
              <p className="text-[10px] mt-1 font-medium" style={{ color: 'var(--color-text-muted)' }}>
                {card.label}
              </p>
              <p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                {card.sub}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Tabela detalhada */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="rounded overflow-hidden"
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 5,
        }}
      >
        <div
          className="flex items-center justify-between px-5 py-3"
          style={{ borderBottom: '1px solid var(--color-border)' }}
        >
          <p className="text-xs font-bold" style={{ color: 'var(--color-text)' }}>Detalhamento por distribuidor</p>
          <p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
            {data.total} distribuidores
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}>
                <th className="text-left px-4 py-2.5 font-semibold" style={{ color: 'var(--color-text-muted)' }}>Nome</th>
                <th className="text-left px-4 py-2.5 font-semibold" style={{ color: 'var(--color-text-muted)' }}>ERP</th>
                <th className="text-left px-4 py-2.5 font-semibold" style={{ color: 'var(--color-text-muted)' }}>Modo</th>
                <th className="text-left px-4 py-2.5 font-semibold" style={{ color: 'var(--color-text-muted)' }}>Status</th>
                <th className="text-left px-4 py-2.5 font-semibold" style={{ color: 'var(--color-text-muted)' }}>Fase</th>
                <th className="text-right px-4 py-2.5 font-semibold" style={{ color: 'var(--color-text-muted)' }}>Valor</th>
                <th className="text-left px-4 py-2.5 font-semibold" style={{ color: 'var(--color-text-muted)' }}>Data Integração</th>
              </tr>
            </thead>
            <tbody>
              {data.sorted.map((d, i) => {
                const cfg = STATUS_CFG[d.status]
                const value = d.valuePerConnection ?? 0
                const valueColor =
                  d.status === 'integrated' ? '#22c55e' :
                  d.status === 'pending'    ? '#f59e0b' :
                  d.status === 'blocked'    ? '#ef4444' : 'var(--color-text-muted)'
                const valueSuffix =
                  d.status === 'pending' ? ' previsto' :
                  d.status === 'blocked' ? ' em risco' : ''

                return (
                  <motion.tr
                    key={d.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.45 + i * 0.015 }}
                    style={{ borderBottom: '1px solid var(--color-muted)' }}
                  >
                    <td className="px-4 py-2.5 font-medium" style={{ color: 'var(--color-text)' }}>{d.name}</td>
                    <td className="px-4 py-2.5">
                      {d.erp ? (
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                          style={{ background: 'rgba(139,92,246,0.12)', color: 'rgba(139,92,246,0.7)' }}
                        >
                          {d.erp}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--color-text-muted)' }}>—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5" style={{ color: 'var(--color-text-muted)' }}>{d.connectionType || '—'}</td>
                    <td className="px-4 py-2.5">
                      <span className="flex items-center gap-1.5" style={{ color: cfg.color }}>
                        <cfg.Icon style={{ width: 11, height: 11 }} />
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      {(() => {
                        const fase = (d.notes ?? '').replace('Fase: ', '')
                        const isNear = isNearIntegration(d)
                        if (!fase) return <span style={{ color: 'var(--color-text-muted)' }}>—</span>
                        return (
                          <span className="text-[10px] px-1.5 py-0.5 rounded font-medium flex items-center gap-1"
                            style={{
                              background: isNear ? 'rgba(245,158,11,0.12)' : 'var(--color-surface2)',
                              color: isNear ? '#f59e0b' : 'var(--color-text-muted)',
                              border: isNear ? '1px solid rgba(245,158,11,0.25)' : 'none',
                            }}>
                            {isNear && <Zap style={{ width: 9, height: 9 }} />}
                            {fase}
                          </span>
                        )
                      })()}
                    </td>
                    <td className="px-4 py-2.5 text-right font-semibold" style={{ color: valueColor }}>
                      {value > 0 ? (
                        <>
                          {formatBRL(value)}
                          {valueSuffix && (
                            <span className="text-[9px] ml-1 font-normal opacity-60">{valueSuffix}</span>
                          )}
                        </>
                      ) : (
                        <span style={{ color: 'var(--color-text-muted)' }}>—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5" style={{ color: 'var(--color-text-muted)' }}>
                      {d.status === 'integrated' && d.integratedAt
                        ? format(new Date(d.integratedAt), 'dd MMM yyyy', { locale: ptBR })
                        : '—'}
                    </td>
                  </motion.tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {data.total === 0 && (
          <div className="flex items-center justify-center py-12">
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              Nenhum distribuidor cadastrado.
            </p>
          </div>
        )}
      </motion.div>
    </div>
  )
}
