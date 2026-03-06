'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  LayoutDashboard, BarChart3, GanttChart,
  Presentation, Sparkles, Settings, LogOut
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import Image from 'next/image'

interface TopNavProps {
  projectId:            string
  brandColor?:          string
  brandColorSecondary?: string
}

export default function TopNav({
  projectId,
  brandColor = '#00D4AA',
}: TopNavProps) {
  const pathname = usePathname()
  const { user, logout } = useAuth()

  const navItems = [
    { icon: LayoutDashboard, label: 'Projetos',     href: '/dashboard'                    },
    { icon: BarChart3,       label: 'Dashboard',    href: `/project/${projectId}`         },
    { icon: GanttChart,      label: 'Gantt',        href: `/project/${projectId}/gantt`   },
    { icon: Presentation,    label: 'Apresentação', href: `/project/${projectId}/slides`  },
    { icon: Sparkles,        label: 'Chat AI',      href: `/project/${projectId}/chat`    },
    { icon: Settings,        label: 'Config',       href: `/project/${projectId}/settings`},
  ]

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8"
      style={{
        height: 64,
        // Funde com o app — preto sólido no topo, transparente embaixo
        background: 'linear-gradient(to bottom, #050508 0%, #050508 40%, rgba(5,5,8,0.6) 75%, transparent 100%)',
        // Sem borda, sem backdrop-filter
      }}
    >
      {/* ── Logo LAT ─────────────────────────────── */}
      <Link href="/dashboard" className="flex items-center shrink-0">
        <span
          className="font-black text-white tracking-tighter leading-none"
          style={{
            fontFamily: "'Conthrax', 'Arial Black', sans-serif",
            fontSize: '1.35rem',
            letterSpacing: '-0.03em',
            WebkitTextStroke: '0.5px rgba(255,255,255,0.12)',
          }}
        >
          LAT
        </span>
      </Link>

      {/* ── Nav ícones ───────────────────────────── */}
      <nav className="flex items-center gap-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className="group relative flex items-center justify-center w-11 h-11 rounded-xl transition-all duration-150"
              style={{
                background: isActive ? `${brandColor}12` : 'transparent',
              }}
            >
              <Icon
                className="w-[22px] h-[22px] transition-all duration-150"
                style={{
                  color: isActive ? brandColor : 'rgba(255,255,255,0.32)',
                  strokeWidth: isActive ? 2 : 1.5,
                }}
              />

              {/* Dot indicator */}
              {isActive && (
                <motion.div
                  layoutId="nav-dot"
                  className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
                  style={{ background: brandColor }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}

              {/* Tooltip */}
              <span
                className="absolute top-full mt-2 px-2.5 py-1.5 rounded-lg text-[11px] font-medium
                           whitespace-nowrap pointer-events-none
                           opacity-0 group-hover:opacity-100 transition-opacity duration-100"
                style={{
                  background: 'rgba(14,14,20,0.96)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  color: '#F0F0F5',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                }}
              >
                {item.label}
              </span>
            </Link>
          )
        })}
      </nav>

      {/* ── User ─────────────────────────────────── */}
      <div className="flex items-center gap-3 shrink-0">
        {user?.photoURL ? (
          <Image
            src={user.photoURL}
            alt={user.displayName || ''}
            width={28} height={28}
            className="rounded-full"
            style={{ boxShadow: `0 0 0 1.5px ${brandColor}40` }}
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
          className="flex items-center justify-center w-8 h-8 rounded-lg transition-colors"
          style={{ color: 'rgba(255,255,255,0.2)' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.5)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.2)')}
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  )
}