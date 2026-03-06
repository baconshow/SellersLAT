'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, GanttChart,
  Presentation, Sparkles, Settings, LogOut, Plus, ChevronRight
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useState } from 'react'
import Image from 'next/image'
import type { Project } from '@/types'
import WeeklyUpdateDrawer from '@/components/ui/WeeklyUpdateDrawer'

interface TopNavProps {
  projectId:   string
  clientName?: string
  brandColor?: string
  project?:    Project | null
}

const ROUTE_LABELS: Record<string, string> = {
  '':         'Dashboard',
  'gantt':    'Gantt',
  'slides':   'Slides',
  'chat':     'Chat AI',
  'settings': 'Settings',
  'kpis':     'KPIs',
}

export default function TopNav({
  projectId,
  clientName = 'LAT',
  brandColor = '#00D4AA',
  project    = null,
}: TopNavProps) {
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const [drawerOpen, setDrawerOpen] = useState(false)

  const segment   = pathname.replace(`/project/${projectId}`, '').replace(/^\//, '')
  const pageLabel = ROUTE_LABELS[segment] ?? segment

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard',    href: `/project/${projectId}`          },
    { icon: GanttChart,      label: 'Gantt',        href: `/project/${projectId}/gantt`    },
    { icon: Presentation,    label: 'Slides',       href: `/project/${projectId}/slides`   },
    { icon: Sparkles,        label: 'Chat AI',      href: `/project/${projectId}/chat`     },
    { icon: Settings,        label: 'Settings',     href: `/project/${projectId}/settings` },
  ]

  return (
    <>
      <header
        className="fixed top-0 left-0 right-0 z-50 pointer-events-none"
        style={{ height: 100 }}
      >
        {/* Escuridão sólida no topo, some suavemente */}
        <div className="absolute inset-0" style={{
          background: `linear-gradient(to bottom,
            rgba(5,5,8,0.97) 0%,
            rgba(5,5,8,0.82) 45%,
            rgba(5,5,8,0.20) 78%,
            transparent      100%
          )`,
        }} />
        {/* Tint sutil da cor do projeto */}
        <div className="absolute inset-0" style={{
          background: `linear-gradient(to bottom,
            ${brandColor}15 0%,
            ${brandColor}06 50%,
            transparent      100%
          )`,
        }} />

        {/* Barra de 64px — único elemento clicável */}
        <div
          className="relative z-10 flex items-center justify-between px-8 pointer-events-auto"
          style={{ height: 64 }}
        >

          {/* ── Breadcrumb ─────────────────────── */}
          <Link href="/dashboard" className="flex items-center gap-1.5 shrink-0 group">
            <span className="font-semibold text-sm tracking-wide text-white/80 group-hover:text-white transition-colors">
              {clientName.toUpperCase()}
            </span>
            {pageLabel && (
              <>
                <ChevronRight className="w-3.5 h-3.5 text-white/20" strokeWidth={2.5} />
                <span className="font-semibold text-sm tracking-wide" style={{ color: brandColor }}>
                  {pageLabel.toUpperCase()}
                </span>
              </>
            )}
          </Link>

          {/* ── Nav ícones ─────────────────────── */}
          <nav className="flex items-center gap-0.5">
            {navItems.map((item) => {
              const isActive = pathname === item.href
              const Icon     = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group relative flex items-center justify-center w-11 h-11 rounded-md transition-all duration-150"
                  style={{ background: 'transparent' }}
                >
                  <Icon
                    className="transition-all duration-150"
                    style={{
                      width:       22,
                      height:      22,
                      color:       isActive ? brandColor : 'rgba(255,255,255,0.28)',
                      strokeWidth: isActive ? 2 : 1.5,
                    }}
                  />
                  <span
                    className="absolute top-full mt-2 px-2.5 py-1.5 rounded-md text-[11px]
                               font-medium whitespace-nowrap pointer-events-none
                               opacity-0 group-hover:opacity-100 transition-opacity duration-100 z-50"
                    style={{
                      background: 'rgba(14,14,20,0.96)',
                      border:     '1px solid rgba(255,255,255,0.07)',
                      color:      '#F0F0F5',
                      boxShadow:  '0 4px 20px rgba(0,0,0,0.5)',
                    }}
                  >
                    {item.label}
                  </span>
                </Link>
              )
            })}
          </nav>

          {/* ── Direita ────────────────────────── */}
          <div className="flex items-center gap-3 shrink-0">

            {/* Botão abre o drawer existente */}
            {project && (
              <button
                onClick={() => setDrawerOpen(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-md text-xs font-semibold
                           tracking-wide transition-all duration-200"
                style={{
                  background: `${brandColor}15`,
                  border:     `1px solid ${brandColor}30`,
                  color:       brandColor,
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background    = `${brandColor}25`
                  e.currentTarget.style.borderColor   = `${brandColor}55`
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background    = `${brandColor}15`
                  e.currentTarget.style.borderColor   = `${brandColor}30`
                }}
              >
                <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
                Atualizar Semana
              </button>
            )}

            {/* Avatar */}
            {user?.photoURL ? (
              <Image
                src={user.photoURL} alt={user.displayName || ''}
                width={28} height={28} className="rounded-full"
                style={{ boxShadow: `0 0 0 1.5px ${brandColor}50` }}
              />
            ) : (
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                style={{ background: `${brandColor}20`, color: brandColor }}
              >
                {user?.displayName?.[0] ?? 'U'}
              </div>
            )}

            <button
              onClick={logout}
              className="flex items-center justify-center w-7 h-7 rounded-md transition-all"
              style={{ color: 'rgba(255,255,255,0.18)' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.55)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.18)')}
            >
              <LogOut style={{ width: 14, height: 14 }} />
            </button>
          </div>
        </div>
      </header>

      {/* Drawer original — sem alteração na lógica */}
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