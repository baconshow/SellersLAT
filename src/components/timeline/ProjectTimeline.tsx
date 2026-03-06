'use client'
import { useMemo } from 'react'
import {
  Area, AreaChart, ReferenceLine,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import type { Project } from '@/types'

interface Props { project: Project }

export default function ProjectTimeline({ project }: Props) {
  const chartData = useMemo(() => {
    const updates = [...(project.weeklyUpdates ?? [])].sort((a, b) => a.weekNumber - b.weekNumber)
    if (!updates.length) return []

    const maxWeek   = updates[updates.length - 1].weekNumber
    const totalDist = updates[updates.length - 1].distributorsTotal || 1

    return Array.from({ length: maxWeek }, (_, i) => {
      const w      = i + 1
      const update = updates.find(u => u.weekNumber === w)
      return {
        semana:    `S${w}`,
        previsto:  Math.round((w / maxWeek) * totalDist),
        realizado: update?.distributorsIntegrated ?? null,
        bloqueios: update?.distributorsBlocked ?? 0,
      }
    })
  }, [project.weeklyUpdates])

  if (!chartData.length) return (
    <div className="rounded-sm px-6 py-8 flex items-center justify-center mb-4"
         style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
      <p className="text-sm" style={{ color: 'rgba(255,255,255,0.2)' }}>
        Adicione atualizações semanais para visualizar o gráfico de progresso.
      </p>
    </div>
  )

  return (
    <div className="rounded-sm p-6 mb-4"
         style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em]"
              style={{ color: 'rgba(255,255,255,0.3)' }}>
          Previsto vs Realizado — Integrações
        </span>
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-1.5">
            <div style={{ width: 20, borderTop: '2px dashed rgba(255,255,255,0.25)' }} />
            <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>Previsto</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-0.5 rounded" style={{ background: 'var(--color-brand,#00D4AA)' }} />
            <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>Realizado</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ background: '#EF4444' }} />
            <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>Bloqueios</span>
          </div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="gradPrevisto" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="rgba(255,255,255,0.10)" />
              <stop offset="95%" stopColor="rgba(255,255,255,0)"    />
            </linearGradient>
            <linearGradient id="gradRealizado" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="var(--color-brand,#00D4AA)" stopOpacity={0.22} />
              <stop offset="95%" stopColor="var(--color-brand,#00D4AA)" stopOpacity={0}    />
            </linearGradient>
          </defs>

          <XAxis
            dataKey="semana"
            tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 10 }}
            axisLine={{ stroke: 'rgba(255,255,255,0.06)' }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              background:   'rgba(10,10,16,0.96)',
              border:       '1px solid rgba(255,255,255,0.1)',
              borderRadius: 6,
              fontSize:     11,
              color:        '#fff',
            }}
            labelStyle={{ color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}
            cursor={{ stroke: 'rgba(255,255,255,0.06)' }}
          />

          <Area
            type="monotone"
            dataKey="previsto"
            stroke="rgba(255,255,255,0.18)"
            strokeWidth={1.5}
            strokeDasharray="5 4"
            fill="url(#gradPrevisto)"
            dot={false}
            name="Previsto"
          />

          <Area
            type="monotone"
            dataKey="realizado"
            stroke="var(--color-brand,#00D4AA)"
            strokeWidth={2}
            fill="url(#gradRealizado)"
            dot={(props: any) => {
              const { cx, cy, payload } = props
              if (payload.realizado == null) return <g key={props.key} />
              return (
                <circle key={props.key} cx={cx} cy={cy} r={4}
                  fill="var(--color-brand,#00D4AA)"
                  stroke="#050508" strokeWidth={2}
                />
              )
            }}
            name="Realizado"
            connectNulls={false}
          />

          {chartData.map((d, i) =>
            d.bloqueios > 0 ? (
              <ReferenceLine
                key={i}
                x={d.semana}
                stroke="rgba(239,68,68,0.25)"
                strokeWidth={1}
                strokeDasharray="3 3"
                label={{ value: `⚠ ${d.bloqueios}`, position: 'top', fill: '#EF4444', fontSize: 9 }}
              />
            ) : null
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}