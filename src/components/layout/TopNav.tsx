'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, GanttChart, Users,
  Presentation, Settings, LogOut, Plus, ChevronRight
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useState } from 'react'
import Image from 'next/image'
import type { Project } from '@/types'
import WeeklyUpdateDrawer from '@/components/ui/WeeklyUpdateDrawer'

const ClaudeIcon = ({ size = 18, ...props }: any) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 50 50" {...props}>
    <path d="M19.861,27.625v-0.716l-16.65-0.681L2.07,25.985L1,24.575l0.11-0.703l0.959-0.645l17.95,1.345l0.11-0.314L5.716,14.365l-0.729-0.924l-0.314-2.016L5.985,9.98l2.214,0.24l11.312,8.602l0.327-0.353L12.623,5.977c0,0-0.548-2.175-0.548-2.697l1.494-2.029l0.827-0.266l2.833,0.995l7.935,17.331h0.314l1.348-14.819l0.752-1.822l1.494-0.985l1.167,0.557l0.959,1.374l-2.551,14.294h0.425l0.486-0.486l8.434-10.197l1.092-0.862h2.065l1.52,2.259l-0.681,2.334l-7.996,11.108l0.146,0.217l0.376-0.036l12.479-2.405l1.666,0.778l0.182,0.791l-0.655,1.617l-15.435,3.523l-0.084,0.062l0.097,0.12l13.711,0.814l1.578,1.044L49,29.868l-0.159,0.972l-2.431,1.238l-13.561-3.254h-0.363v0.217l11.218,10.427l0.256,1.154l-0.645,0.911l-0.681-0.097l-9.967-8.058h-0.256v0.34l5.578,8.35l0.243,2.162l-0.34,0.703l-1.215,0.425l-1.335-0.243l-7.863-12.083l-0.279,0.159l-1.348,14.524l-0.632,0.742l-1.459,0.558l-1.215-0.924L21.9,46.597l2.966-14.939l-0.023-0.084l-0.279,0.036L13.881,45.138l-0.827,0.327l-1.433-0.742l0.133-1.326l0.801-1.18l9.52-12.019l-0.013-0.314h-0.11l-12.69,8.239l-2.259,0.292L6.03,37.505l0.12-1.494l0.46-0.486L19.861,27.625z" fill="currentColor"/>
  </svg>
)

interface TopNavProps {
  projectId?:    string
  clientName?:   string
  brandColor?:   string
  project?:      Project | null
  onToggleLAT?:  () => void
  showLAT?:      boolean
  // modo dashboard (sem projeto)
  isDashboard?:  boolean
  onNewProject?: () => void
}

const ROUTE_LABELS: Record<string, string> = {
  '':               'Dashboard',
  'gantt':          'Gantt',
  'slides':         'Slides',
  'settings':       'Settings',
  'distribuidores': 'Distribuidores',
}

export default function TopNav({
  projectId,
  clientName   = 'Projeto',
  brandColor   = '#00D4AA',
  project      = null,
  onToggleLAT,
  showLAT      = false,
  isDashboard  = false,
  onNewProject,
}: TopNavProps) {
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const [drawerOpen, setDrawerOpen] = useState(false)

  const segment   = projectId
    ? pathname.replace(`/project/${projectId}`, '').replace(/^\//, '')
    : ''
  const pageLabel = ROUTE_LABELS[segment] ?? segment

  const currentWeek = project?.startDate
    ? Math.max(1, Math.ceil(
        (new Date().getTime() - new Date(project.startDate).getTime())
        / (1000 * 60 * 60 * 24 * 7)
      ))
    : (project?.weeklyUpdates?.slice(-1)[0]?.weekNumber ?? 1)

  const navItems = projectId ? [
    { icon: LayoutDashboard, label: 'Dashboard',      href: `/project/${projectId}`                },
    { icon: GanttChart,      label: 'Gantt',          href: `/project/${projectId}/gantt`          },
    { icon: Presentation,    label: 'Slides',         href: `/project/${projectId}/slides`         },
    { icon: Users,           label: 'Distribuidores', href: `/project/${projectId}/distribuidores` },
    { icon: Settings,        label: 'Settings',       href: `/project/${projectId}/settings`       },
    { icon: ClaudeIcon,      label: 'LAT Intelligence', href: '', isLAT: true },
  ] : []

  const accent = isDashboard ? '#00D4AA' : brandColor

  return (
    <>
      <header
        className="fixed top-0 left-0 right-0 z-50 pointer-events-none"
        style={{ height: 100 }}
      >
        {/* Gradiente fundo */}
        <div className="absolute inset-0" style={{
          background: `linear-gradient(to bottom,
            rgba(5,5,8,0.97) 0%,
            rgba(5,5,8,0.82) 45%,
            rgba(5,5,8,0.20) 78%,
            transparent 100%
          )`,
        }} />
        <div className="absolute inset-0" style={{
          background: `linear-gradient(to bottom,
            ${accent}12 0%,
            transparent 60%
          )`,
        }} />

        <div
          className="relative z-10 flex items-center justify-between px-8 pointer-events-auto"
          style={{ height: 64 }}
        >

          {/* ── Esquerda: Logo LAT + Breadcrumb ── */}
          <div className="flex items-center gap-4 shrink-0">

            {/* Logo LAT — Conthrax */}
            <Link href="/dashboard" className="shrink-0" style={{ lineHeight: 1 }}>
              <span style={{
                fontFamily:    "'Conthrax', 'Orbitron', 'Share Tech Mono', monospace",
                fontSize:      18,
                fontWeight:    700,
                letterSpacing: '0.08em',
                color:         accent,
                textTransform: 'uppercase',
              }}>
                LAT
              </span>
            </Link>

            {/* Separador vertical */}
            <div style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.08)' }} />

            {/* Breadcrumb */}
            <div className="flex items-center gap-1.5">
              <Link
                href="/dashboard"
                className="text-xs font-semibold tracking-widest transition-colors"
                style={{ color: 'rgba(255,255,255,0.3)' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.6)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.3)')}
              >
                SELLERS
              </Link>

              {isDashboard && (
                <>
                  <ChevronRight style={{ width: 11, height: 11, color: 'rgba(255,255,255,0.15)' }} strokeWidth={2.5} />
                  <span className="text-xs font-semibold tracking-widest" style={{ color: accent }}>
                    PROJETOS
                  </span>
                </>
              )}

              {!isDashboard && projectId && (
                <>
                  <ChevronRight style={{ width: 11, height: 11, color: 'rgba(255,255,255,0.15)' }} strokeWidth={2.5} />
                  <Link
                    href={`/project/${projectId}`}
                    className="text-xs font-semibold tracking-widest transition-colors"
                    style={{ color: 'rgba(255,255,255,0.45)' }}
                    onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.7)')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.45)')}
                  >
                    {clientName.toUpperCase()}
                  </Link>

                  {pageLabel && (
                    <>
                      <ChevronRight style={{ width: 11, height: 11, color: 'rgba(255,255,255,0.15)' }} strokeWidth={2.5} />
                      <span className="text-xs font-semibold tracking-widest" style={{ color: accent }}>
                        {pageLabel.toUpperCase()}
                      </span>
                    </>
                  )}

                  {/* Semana na header */}
                  <div style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.08)', margin: '0 6px' }} />
                  <span className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.25)' }}>
                    SEMANA
                  </span>
                  <span className="text-xs font-bold" style={{ color: accent }}>
                    {currentWeek}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* ── Centro: Nav ── */}
          {!isDashboard && (
            <nav className="flex items-center gap-0.5">
              {navItems.map((item) => {
                const Icon = item.icon

                if ((item as any).isLAT) {
                  return (
                    <button
                      key="lat"
                      onClick={onToggleLAT}
                      className="group relative flex items-center justify-center w-10 h-10 rounded-md transition-all"
                    >
                      <Icon style={{
                        width:       20,
                        height:      20,
                        color:       showLAT ? accent : 'rgba(255,255,255,0.25)',
                        strokeWidth: showLAT ? 2 : 1.5,
                        transition:  'all 150ms',
                      }} />
                      <span className="absolute top-full mt-2 px-2.5 py-1.5 rounded-md text-[10px]
                                       font-medium whitespace-nowrap pointer-events-none
                                       opacity-0 group-hover:opacity-100 transition-opacity z-50"
                        style={{
                          background: 'rgba(14,14,20,0.96)',
                          border:     '1px solid rgba(255,255,255,0.07)',
                          color:      '#F0F0F5',
                        }}>
                        LAT Intelligence
                      </span>
                    </button>
                  )
                }

                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="group relative flex items-center justify-center w-10 h-10 rounded-md transition-all"
                  >
                    <Icon style={{
                      width:       20,
                      height:      20,
                      color:       isActive ? accent : 'rgba(255,255,255,0.25)',
                      strokeWidth: isActive ? 2 : 1.5,
                      transition:  'all 150ms',
                    }} />
                    <span className="absolute top-full mt-2 px-2.5 py-1.5 rounded-md text-[10px]
                                     font-medium whitespace-nowrap pointer-events-none
                                     opacity-0 group-hover:opacity-100 transition-opacity z-50"
                      style={{
                        background: 'rgba(14,14,20,0.96)',
                        border:     '1px solid rgba(255,255,255,0.07)',
                        color:      '#F0F0F5',
                      }}>
                      {item.label}
                    </span>
                  </Link>
                )
              })}
            </nav>
          )}

{/* ── Direita ── */}
<div className="flex items-center gap-2 shrink-0">

{/* Atualizar Semana (projeto) */}
{!isDashboard && project && (
  <button
    onClick={() => setDrawerOpen(true)}
    className="flex items-center gap-2 px-4 py-2 rounded-md text-xs font-semibold tracking-wide transition-all"
    style={{
      background: `${accent}15`,
      border:     `1px solid ${accent}30`,
      color:       accent,
    }}
    onMouseEnter={e => {
      e.currentTarget.style.background  = `${accent}25`
      e.currentTarget.style.borderColor = `${accent}55`
    }}
    onMouseLeave={e => {
      e.currentTarget.style.background  = `${accent}15`
      e.currentTarget.style.borderColor = `${accent}30`
    }}
  >
    <Plus style={{ width: 13, height: 13 }} strokeWidth={2.5} />
    Atualizar Semana
  </button>
)}

</div>

</div>
</header>

      <AnimatePresence>
        {drawerOpen && project && (
          <WeeklyUpdateDrawer
            project={project}
            onClose={() => setDrawerOpen(false)}
          />
        )}
      </AnimatePresence>
    </>
  )
}