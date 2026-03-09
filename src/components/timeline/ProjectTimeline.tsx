'use client'
import { useMemo } from 'react'
import {
  Area, AreaChart, ReferenceLine,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { differenceInWeeks, parseISO, startOfWeek } from 'date-fns'
import type { Project } from '@/types'

interface Props { project: Project }

export default function ProjectTimeline({ project }: Props) {
  const chartData = useMemo(() => {
    const updates = [...(project.weeklyUpdates ?? [])].sort((a, b) => a.weekNumber - b.weekNumber)
    const distributors = project.distributors ?? []
    const totalDist = distributors.length || updates[updates.length - 1]?.distributorsTotal || 0

    if (totalDist === 0) return []

    // Calculate current week number from project start
    const start = project.startDate ? parseISO(project.startDate) : null
    const now = new Date()
    const currentWeek = start
      ? Math.max(1, differenceInWeeks(now, startOfWeek(start, { weekStartsOn: 1 })) + 1)
      : updates.length > 0 ? updates[updates.length - 1].weekNumber : 1

    // Total weeks: from endDate or last update + buffer
    const end = project.endDate ? parseISO(project.endDate) : null
    const totalWeeks = end && start
      ? Math.max(currentWeek, differenceInWeeks(end, startOfWeek(start, { weekStartsOn: 1 })) + 1)
      : updates.length > 0
        ? Math.max(currentWeek + 2, updates[updates.length - 1].weekNumber + 4)
        : currentWeek + 8

    // Current real counts from distributors array
    const integrated = distributors.filter(d => d.status === 'integrated').length
    const blocked = distributors.filter(d => d.status === 'blocked').length

    // Build data points
    const data: {
      semana: string
      label: string
      previsto: number
      realizado: number | null
      bloqueios: number
      isAnchor?: boolean
    }[] = []

    // S0 — Início
    data.push({
      semana: 'S0',
      label: 'Início',
      previsto: 0,
      realizado: 0,
      bloqueios: 0,
      isAnchor: true,
    })

    // Weekly data points S1..totalWeeks
    for (let w = 1; w <= totalWeeks; w++) {
      const update = updates.find(u => u.weekNumber === w)
      const isFuture = w > currentWeek

      const point: typeof data[number] = {
        semana: `S${w}`,
        label: `S${w}`,
        previsto: Math.round((w / totalWeeks) * totalDist),
        realizado: null,
        bloqueios: 0,
      }

      if (w === currentWeek) {
        // "Hoje" — use real distributor data or latest update
        point.label = 'Hoje'
        point.realizado = update?.distributorsIntegrated ?? integrated
        point.bloqueios = update?.distributorsBlocked ?? blocked
        point.isAnchor = true
      } else if (w === totalWeeks) {
        // "Meta" — target
        point.label = 'Meta'
        point.previsto = totalDist
        point.realizado = isFuture ? null : (update?.distributorsIntegrated ?? null)
        point.bloqueios = update?.distributorsBlocked ?? 0
        point.isAnchor = true
      } else if (!isFuture && update) {
        // Past weeks with data
        point.realizado = update.distributorsIntegrated
        point.bloqueios = update.distributorsBlocked ?? 0
      } else if (!isFuture) {
        // Past weeks without data — keep null (gap)
        point.realizado = null
      }
      // Future weeks: realizado stays null

      data.push(point)
    }

    return data
  }, [project.weeklyUpdates, project.distributors, project.startDate, project.endDate])

  if (!chartData.length) return (
    <div className="rounded px-6 py-8 flex items-center justify-center mb-4"
         style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
      <p className="text-sm" style={{ color: 'rgba(255,255,255,0.2)' }}>
        Adicione distribuidores ao projeto para visualizar o gráfico de progresso.
      </p>
    </div>
  )

  // Find "Hoje" index for the reference line
  const hojeIndex = chartData.findIndex(d => d.label === 'Hoje')

  return (
    <div className="rounded p-6 mb-4"
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
            tick={(props: any) => {
              const { x, y, payload } = props
              const point = chartData.find(d => d.semana === payload.value)
              const isAnchor = point?.isAnchor
              const displayLabel = point?.label ?? payload.value

              return (
                <text
                  x={x} y={y + 12}
                  textAnchor="middle"
                  fill={isAnchor ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.2)'}
                  fontSize={isAnchor ? 11 : 10}
                  fontWeight={isAnchor ? 600 : 400}
                >
                  {displayLabel}
                </text>
              )
            }}
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
              borderRadius: 5,
              fontSize:     11,
              color:        '#fff',
            }}
            labelStyle={{ color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}
            labelFormatter={(label: string) => {
              const point = chartData.find(d => d.semana === label)
              return point?.label !== label ? `${point?.label} (${label})` : label
            }}
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
              const isAnchor = payload.isAnchor
              return (
                <circle key={props.key} cx={cx} cy={cy} r={isAnchor ? 5 : 4}
                  fill={payload.label === 'Meta' ? 'rgba(255,255,255,0.3)' : 'var(--color-brand,#00D4AA)'}
                  stroke="#050508" strokeWidth={2}
                />
              )
            }}
            name="Realizado"
            connectNulls={false}
          />

          {/* "Hoje" vertical reference line */}
          {hojeIndex >= 0 && (
            <ReferenceLine
              x={chartData[hojeIndex].semana}
              stroke="var(--color-brand,#00D4AA)"
              strokeWidth={1}
              strokeDasharray="3 3"
              strokeOpacity={0.3}
            />
          )}

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
