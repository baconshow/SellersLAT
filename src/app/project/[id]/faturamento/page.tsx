'use client'
import { useEffect, useState, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  DollarSign, TrendingUp, AlertTriangle, Target,
  CheckCircle2, Clock, XCircle, Circle, Eye, EyeOff,
} from 'lucide-react'
import {
  subscribeToProject,
  subscribeToDistributorsCollection,
  updateProject,
} from '@/lib/firestore'
import { useAuth } from '@/contexts/AuthContext'
import type { Project, Distributor, DistributorStatus } from '@/types'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

// ─── Config ───────────────────────────────────────────────────────────────────

const STATUS_CFG: Record<DistributorStatus, { label: string; color: string; Icon: any }> = {
  integrated:  { label: 'Integrado',    color: '#22c55e',   Icon: CheckCircle2 },
  pending:     { label: 'Pendente',     color: '#f59e0b',   Icon: Clock        },
  blocked:     { label: 'Bloqueado',    color: '#ef4444',   Icon: XCircle      },
  not_started: { label: 'Não iniciado', color: '#ffffff40', Icon: Circle       },
}

function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
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

  // ── Computed ──
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

    // Sorted: integrated → pending → blocked → not_started
    const sorted = [
      ...integrated,
      ...pending,
      ...blocked,
      ...distributors.filter(d => d.status === 'not_started'),
    ]

    return {
      integrated, pending, blocked, total,
      revenueConfirmed, revenuePending, revenueBlocked, revenueTotal,
      avgValue, pct, sorted,
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
            <h2 className="text-lg font-bold text-white">Faturamento</h2>
            <span
              className="text-[10px] font-bold tracking-widest px-2.5 py-1 rounded"
              style={{ background: `${accent}18`, color: accent, border: `1px solid ${accent}30` }}
            >
              {project.clientName}
            </span>
          </div>
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
            Receita por conexão integrada
          </p>
        </div>

        {/* Toggle visibilidade */}
        <button
          onClick={toggleShowValues}
          className="flex items-center gap-2 px-3 py-2 rounded text-xs font-medium transition-all"
          style={{
            background: showValues ? `${accent}15` : 'rgba(255,255,255,0.05)',
            border: `1px solid ${showValues ? accent + '30' : 'rgba(255,255,255,0.08)'}`,
            color: showValues ? accent : 'rgba(255,255,255,0.4)',
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
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 5,
        }}
      >
        {/* Radial glow */}
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
              fontFamily: "'Conthrax', 'Orbitron', 'Share Tech Mono', monospace",
              color: '#fff',
              letterSpacing: '0.02em',
            }}
          >
            {formatBRL(data.revenueConfirmed)}
          </p>
          <p className="text-xs mb-6" style={{ color: 'rgba(255,255,255,0.35)' }}>
            receita confirmada
          </p>

          {/* Progress bar */}
          <div className="max-w-md mx-auto">
            <div className="h-3 rounded-full overflow-hidden mb-2" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${data.pct}%` }}
                transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
                className="h-full rounded-full"
                style={{ background: `linear-gradient(90deg, ${accent}, ${project.clientColorSecondary || accent})` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs">
              <span style={{ color: 'rgba(255,255,255,0.3)' }}>
                {data.integrated.length} de {data.total} conexões integradas
              </span>
              <span className="font-bold" style={{ color: accent }}>
                {data.pct}% do potencial
              </span>
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
              border: '1px solid rgba(255,255,255,0.06)',
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
              <p className="text-xl font-black text-white">{card.value}</p>
              <p className="text-[10px] mt-1 font-medium" style={{ color: 'rgba(255,255,255,0.35)' }}>
                {card.label}
              </p>
              <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.2)' }}>
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
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 5,
        }}
      >
        <div
          className="flex items-center justify-between px-5 py-3"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        >
          <p className="text-xs font-bold text-white">Detalhamento por distribuidor</p>
          <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.25)' }}>
            {data.total} distribuidores
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <th className="text-left px-4 py-2.5 font-semibold text-white/40">Nome</th>
                <th className="text-left px-4 py-2.5 font-semibold text-white/40">ERP</th>
                <th className="text-left px-4 py-2.5 font-semibold text-white/40">Modo</th>
                <th className="text-left px-4 py-2.5 font-semibold text-white/40">Status</th>
                <th className="text-right px-4 py-2.5 font-semibold text-white/40">Valor</th>
                <th className="text-left px-4 py-2.5 font-semibold text-white/40">Data Integração</th>
              </tr>
            </thead>
            <tbody>
              {data.sorted.map((d, i) => {
                const cfg = STATUS_CFG[d.status]
                const value = d.valuePerConnection ?? 0
                const valueColor =
                  d.status === 'integrated' ? '#22c55e' :
                  d.status === 'pending'    ? '#f59e0b' :
                  d.status === 'blocked'    ? '#ef4444' : 'rgba(255,255,255,0.2)'
                const valueSuffix =
                  d.status === 'pending' ? ' previsto' :
                  d.status === 'blocked' ? ' em risco' : ''

                return (
                  <motion.tr
                    key={d.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.45 + i * 0.015 }}
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                  >
                    <td className="px-4 py-2.5 text-white/80 font-medium">{d.name}</td>
                    <td className="px-4 py-2.5">
                      {d.erp ? (
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                          style={{ background: 'rgba(139,92,246,0.12)', color: 'rgba(139,92,246,0.7)' }}
                        >
                          {d.erp}
                        </span>
                      ) : (
                        <span style={{ color: 'rgba(255,255,255,0.15)' }}>—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-white/40">{d.connectionType || '—'}</td>
                    <td className="px-4 py-2.5">
                      <span className="flex items-center gap-1.5" style={{ color: cfg.color }}>
                        <cfg.Icon style={{ width: 11, height: 11 }} />
                        {cfg.label}
                      </span>
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
                        <span style={{ color: 'rgba(255,255,255,0.15)' }}>—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-white/30">
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
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>
              Nenhum distribuidor cadastrado.
            </p>
          </div>
        )}
      </motion.div>
    </div>
  )
}
