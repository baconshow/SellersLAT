'use client'
import { motion } from 'framer-motion'
import { CheckCircle2, Clock, AlertCircle, TrendingUp, Calendar, Zap } from 'lucide-react'
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis } from 'recharts'
import type { Project } from '@/types'
import { differenceInDays } from 'date-fns'

interface Props { project: Project }

export default function KPICards({ project }: Props) {
  const latest = project.weeklyUpdates?.[project.weeklyUpdates.length - 1]
  const total      = latest?.distributorsTotal      ?? 0
  const integrated = latest?.distributorsIntegrated ?? 0
  const pending    = latest?.distributorsPending    ?? 0
  const blocked    = latest?.distributorsBlocked    ?? 0
  const integrationPct = total > 0 ? Math.round((integrated / total) * 100) : 0

  const daysTotal  = differenceInDays(new Date(project.endDate), new Date(project.startDate)) || 1
  const daysPassed = Math.max(0, differenceInDays(new Date(), new Date(project.startDate)))
  const daysLeft   = Math.max(0, daysTotal - daysPassed)
  const timelinePct = Math.min(100, Math.round((daysPassed / daysTotal) * 100))

  const currentPhase    = project.phases.find(p => p.status === 'in_progress')
  const completedPhases = project.phases.filter(p => p.status === 'completed').length
  const totalPhases     = project.phases.length

  const rawChartData = (project.weeklyUpdates ?? []).slice(-8).map(u => ({
    week: `S${u.weekNumber}`,
    integrados: u.distributorsIntegrated,
    pendentes:  u.distributorsPending,
  }))
  
  const chartData = rawChartData.length < 2
    ? [{ week: '', integrados: 0, pendentes: 0 }, ...rawChartData]
    : rawChartData

  const kpis = [
    { icon: CheckCircle2, label: 'Integrados', value: integrated, color: '#10B981', bg: '#10B98118', delta: '' },
    { icon: Clock,        label: 'Pendentes',  value: pending,    color: '#F59E0B', bg: '#F59E0B18', delta: '' },
    { icon: AlertCircle,  label: 'Bloqueados', value: blocked,    color: '#EF4444', bg: '#EF444418', delta: '' },
    { icon: TrendingUp,   label: 'Integração', value: `${integrationPct}%`,
      color: 'var(--color-brand,#00D4AA)', bg: 'var(--color-brand-soft,rgba(0,212,170,0.12))', delta: '' },
  ]

  return (
    <div className="space-y-4">
      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map((kpi, i) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="rounded-md p-5 relative overflow-hidden"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.07)',
            }}
          >
            <div className="absolute -bottom-6 -left-6 w-20 h-20 rounded-full blur-2xl opacity-15"
                 style={{ background: kpi.color }} />
            <div className="relative z-10">
              <div className="w-9 h-9 rounded-md flex items-center justify-center mb-3"
                   style={{ background: kpi.bg }}>
                <kpi.icon style={{ width: 18, height: 18, color: kpi.color }} />
              </div>
              <p className="text-3xl font-black text-white">{kpi.value}</p>
              <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>{kpi.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Chart + Status row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Area chart */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }}
          className="lg:col-span-2 rounded-md p-5"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-white">Evolução das Integrações</h3>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>Últimas 8 semanas</p>
            </div>
            <div className="flex items-center gap-4 text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />Integrados
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500" />Pendentes
              </span>
            </div>
          </div>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={140}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="gI" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10B981" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gP" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#F59E0B" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#F59E0B" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="week"
                  tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }}
                  axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    background: 'rgba(22,22,34,0.97)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 6, fontSize: 12,
                  }}
                  labelStyle={{ color: 'rgba(255,255,255,0.5)' }}
                />
                <Area type="monotone" dataKey="integrados" stroke="#10B981" strokeWidth={2} fill="url(#gI)" />
                <Area type="monotone" dataKey="pendentes"  stroke="#F59E0B" strokeWidth={2} fill="url(#gP)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[140px] flex items-center justify-center">
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.2)' }}>
                Nenhuma atualização semanal ainda
              </p>
            </div>
          )}
        </motion.div>

        {/* Project status */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.34 }}
          className="rounded-md p-5 flex flex-col gap-4"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          <h3 className="text-sm font-semibold text-white">Status do Projeto</h3>
          <div className="space-y-3">
            <ProgressBar label="Cronograma" icon={Calendar} value={timelinePct} />
            <ProgressBar label={`Fases ${completedPhases}/${totalPhases}`} icon={Zap} value={Math.round((completedPhases / totalPhases) * 100)} color="#8B5CF6" />
          </div>
          <div className="space-y-2 mt-auto">
            <InfoPill label="Fase Atual"       value={currentPhase?.name ?? '—'} />
            <InfoPill label="Dias Restantes"   value={`${daysLeft} dias`} />
            <InfoPill label="Total Distribuidores" value={`${total}`} />
          </div>
        </motion.div>
      </div>
    </div>
  )
}

function ProgressBar({ label, icon: Icon, value, color }: {
  label: string; icon: React.ElementType; value: number; color?: string
}) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
        <span className="flex items-center gap-1">
          <Icon style={{ width: 12, height: 12 }} />{label}
        </span>
        <span>{value}%</span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
          className="h-full rounded-full"
          style={{ background: color ?? 'linear-gradient(90deg, var(--color-brand,#00D4AA), var(--color-brand-secondary,#8B5CF6))' }}
        />
      </div>
    </div>
  )
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2 px-3 rounded-md"
         style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
      <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{label}</span>
      <span className="text-xs font-semibold text-white truncate ml-2">{value}</span>
    </div>
  )
}