'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, GanttChart,
  Presentation, Settings, LogOut, Plus, ChevronRight, Brain
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useState } from 'react'
import Image from 'next/image'
import type { Project } from '@/types'
import WeeklyUpdateDrawer from '@/components/ui/WeeklyUpdateDrawer'

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
  '':         'Dashboard',
  'gantt':    'Gantt',
  'slides':   'Slides',
  'settings': 'Settings',
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
    { icon: LayoutDashboard, label: 'Dashboard', href: `/project/${projectId}`          },
    { icon: GanttChart,      label: 'Gantt',     href: `/project/${projectId}/gantt`    },
    { icon: Presentation,    label: 'Slides',    href: `/project/${projectId}/slides`   },
    { icon: Settings,        label: 'Settings',  href: `/project/${projectId}/settings` },
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
                    semana
                  </span>
                  <span className="text-xs font-bold" style={{ color: accent }}>
                    {currentWeek}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* ── Centro: Nav ── */}
          {!isDashboard && navItems.length > 0 && (
            <nav className="flex items-center gap-0.5">
              {navItems.map((item) => {
                const isActive = pathname === item.href
                const Icon     = item.icon
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

            {/* Novo Projeto (dashboard) */}
            {isDashboard && onNewProject && (
              <button
                onClick={onNewProject}
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
                Novo Projeto
              </button>
            )}

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

            {/* Botão LAT Intelligence (projeto) */}
            {!isDashboard && onToggleLAT && (
              <button
                onClick={onToggleLAT}
                className="flex items-center gap-2 px-3 py-2 rounded-md text-xs font-semibold transition-all"
                style={showLAT ? {
                  background: accent,
                  color:      '#050508',
                  border:     `1px solid ${accent}`,
                } : {
                  background: 'rgba(255,255,255,0.05)',
                  border:     '1px solid rgba(255,255,255,0.08)',
                  color:      'rgba(255,255,255,0.45)',
                }}
                title="LAT Intelligence"
              >
                <Brain style={{ width: 13, height: 13 }} />
                <span style={{
                  fontFamily:    "'Conthrax', 'Orbitron', monospace",
                  fontSize:      11,
                  letterSpacing: '0.06em',
                }}>
                  LAT
                </span>
              </button>
            )}

            {/* Avatar Google */}
            {user?.photoURL ? (
              <Image
                src={user.photoURL}
                alt={user.displayName ?? 'User'}
                width={30} height={30}
                referrerPolicy="no-referrer"
                className="rounded-full"
                style={{ boxShadow: `0 0 0 1.5px ${accent}50` }}
              />
            ) : (
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                style={{ background: `${accent}20`, color: accent }}
              >
                {user?.displayName?.[0] ?? user?.email?.[0]?.toUpperCase() ?? 'U'}
              </div>
            )}

            {/* Logout */}
            <button
              onClick={logout}
              className="flex items-center justify-center w-8 h-8 rounded-md transition-all"
              style={{ color: 'rgba(255,255,255,0.18)' }}
              title="Sair"
              onMouseEnter={e => (e.currentTarget.style.color = '#EF4444')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.18)')}
            >
              <LogOut style={{ width: 14, height: 14 }} />
            </button>
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