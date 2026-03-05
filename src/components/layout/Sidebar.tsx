'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, BarChart3, GanttChart, Presentation,
  Sparkles, Settings, ChevronLeft, LogOut, Briefcase
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import Image from 'next/image'

interface SidebarProps {
  projectId?:           string
  collapsed?:           boolean
  setCollapsed?:        (v: boolean) => void
  brandColor?:          string
  brandColorSecondary?: string
}

interface NavItem {
  icon:   React.ElementType
  label:  string
  href:   string
  badge?: string
}

export default function Sidebar({
  projectId,
  collapsed:    externalCollapsed,
  setCollapsed: setExternalCollapsed,
  brandColor          = '#00D4AA',
  brandColorSecondary = '#8B5CF6',
}: SidebarProps) {
  const [internalCollapsed, setInternalCollapsed] = useState(false)
  const pathname = usePathname()
  const { user, logout } = useAuth()

  const collapsed    = externalCollapsed    !== undefined ? externalCollapsed    : internalCollapsed
  const setCollapsed = setExternalCollapsed !== undefined ? setExternalCollapsed : setInternalCollapsed

  useEffect(() => {
    const handler = (e: Event) => {
      const ev = e as CustomEvent<{ fullscreen: boolean }>
      setCollapsed(ev.detail.fullscreen)
    }
    document.addEventListener('sellers:presentation', handler as EventListener)
    return () => document.removeEventListener('sellers:presentation', handler as EventListener)
  }, [setCollapsed])

  const navItems: NavItem[] = projectId ? [
    { icon: LayoutDashboard, label: 'Projetos',      href: '/dashboard'                               },
    { icon: BarChart3,       label: 'Dashboard',     href: `/project/${projectId}`                    },
    { icon: GanttChart,      label: 'Gantt',         href: `/project/${projectId}/gantt`              },
    { icon: Presentation,    label: 'Apresentação',  href: `/project/${projectId}/slides`             },
    { icon: Sparkles,        label: 'Chat AI',       href: `/project/${projectId}/chat` },
    { icon: Settings,        label: 'Configurações', href: `/project/${projectId}/settings`           },
  ] : [
    { icon: LayoutDashboard, label: 'Projetos', href: '/dashboard' },
  ]

  const w = collapsed ? 72 : 240

  return (
    <motion.aside
      animate={{ width: w }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      style={{
        position: 'fixed', left: 0, top: 0,
        height: '100vh', zIndex: 50,
        width: w, minWidth: w,
        display: 'flex', flexDirection: 'column',
        backdropFilter:       'blur(20px) saturate(160%)',
        WebkitBackdropFilter: 'blur(20px) saturate(160%)',
        background: 'rgba(10,10,14,0.80)',
        border: 'none',
        // Gradiente suave na borda direita — não uma linha dura
        boxShadow: `
          1px 0 0 rgba(255,255,255,0.04),
          8px 0 32px rgba(0,0,0,0.35),
          20px 0 60px rgba(0,0,0,0.15)
        `,
        overflow: 'visible',
      }}
    >
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div
        className="flex items-center px-4 shrink-0"
        style={{ height: 64, position: 'relative', zIndex: 2 }}
      >
        <AnimatePresence mode="wait">
          {collapsed ? (
            <motion.div key="logo-sm"
              initial={{ opacity: 0, scale: 0.75 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.75 }}
              transition={{ duration: 0.15 }}
              className="mx-auto"
            >
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{
                  background: `linear-gradient(135deg, ${brandColor}, ${brandColorSecondary})`,
                }}
              >
                <Briefcase className="w-4 h-4 text-black" />
              </div>
            </motion.div>
          ) : (
            <motion.div key="logo-lg"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.15 }}
              className="flex items-center gap-2.5 flex-1 min-w-0"
            >
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: `linear-gradient(135deg, ${brandColor}, ${brandColorSecondary})` }}
              >
                <Briefcase className="w-4 h-4 text-black" />
              </div>
              <span className="font-bold text-sm text-white tracking-wide truncate">
                Sellers Pulse
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors"
          style={{
            background: 'rgba(255,255,255,0.06)',
            color:      'rgba(255,255,255,0.4)',
            marginLeft: collapsed ? 'auto' : 8,
          }}
        >
          <motion.div animate={{ rotate: collapsed ? 180 : 0 }} transition={{ duration: 0.28 }}>
            <ChevronLeft className="w-3.5 h-3.5" />
          </motion.div>
        </button>
      </div>

      {/* ── Nav ────────────────────────────────────────────────────── */}
      <nav
        className="flex-1 py-2 px-2 flex flex-col gap-0.5 overflow-y-auto overflow-x-hidden"
        style={{ position: 'relative', zIndex: 2 }}
      >
        {projectId ? (
          <>
            <NavLink item={navItems[0]} collapsed={collapsed}
              active={pathname === navItems[0].href} brandColor={brandColor} />

            <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', margin: '8px 10px' }} />

            {!collapsed && (
              <p className="text-[10px] uppercase tracking-widest font-bold px-3 pb-1"
                 style={{ color: 'rgba(255,255,255,0.18)' }}>Projeto</p>
            )}

            {navItems.slice(1).map(item => (
              <NavLink key={item.href} item={item} collapsed={collapsed}
                active={pathname === item.href} brandColor={brandColor} />
            ))}
          </>
        ) : (
          navItems.map(item => (
            <NavLink key={item.href} item={item} collapsed={collapsed}
              active={pathname === item.href} brandColor={brandColor} />
          ))
        )}
      </nav>

      {/* Fade bottom */}
      <div
        className="pointer-events-none absolute bottom-[72px] left-0 right-0"
        style={{
          height: 48,
          background: 'linear-gradient(to top, rgba(10,10,14,0.90) 0%, transparent 100%)',
          zIndex: 3,
        }}
      />

      {/* ── User ───────────────────────────────────────────────────── */}
      <div
        className="shrink-0 px-3 pb-4 pt-2"
        style={{ position: 'relative', zIndex: 4 }}
      >
        <div className={`flex items-center gap-2.5 ${collapsed ? 'justify-center' : ''}`}>
          {user?.photoURL ? (
            <Image
              src={user.photoURL} alt={user.displayName || ''}
              width={30} height={30}
              className="rounded-full shrink-0"
              style={{ boxShadow: `0 0 0 1.5px ${brandColor}` }}
            />
          ) : (
            <div
              className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-xs font-bold"
              style={{ background: `${brandColor}20`, color: brandColor }}
            >
              {user?.displayName?.[0] ?? 'B'}
            </div>
          )}

          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="flex-1 min-w-0 flex items-center gap-1.5"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-white truncate">
                    {user?.displayName || 'Usuário'}
                  </p>
                  <p className="text-[10px] truncate" style={{ color: 'rgba(255,255,255,0.28)' }}>
                    {user?.email}
                  </p>
                </div>
                <button onClick={logout}
                  className="p-1.5 rounded-lg shrink-0 transition-colors"
                  style={{ color: 'rgba(255,255,255,0.2)' }}>
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.aside>
  )
}

// ─── NavLink ──────────────────────────────────────────────────────────────────

function NavLink({
  item, collapsed, active, brandColor = '#00D4AA',
}: {
  item: NavItem; collapsed: boolean; active: boolean; brandColor?: string
}) {
  const Icon = item.icon
  return (
    <Link
      href={item.href}
      className={`relative flex items-center gap-3 py-2.5 px-3 rounded-lg text-sm
        font-medium transition-all duration-150 group
        ${collapsed ? 'justify-center' : ''}`}
      style={{
        // Zero background — só a cor do ícone muda
        background: 'transparent',
        color: active ? brandColor : 'rgba(255,255,255,0.38)',
      }}
    >
      <Icon className="w-4 h-4 shrink-0" />

      {!collapsed && (
        <span
          className="truncate"
          style={{
            color:      active ? 'rgba(255,255,255,0.88)' : 'rgba(255,255,255,0.38)',
            fontWeight: active ? 500 : 400,
          }}
        >
          {item.label}
        </span>
      )}

      {item.badge && !collapsed && (
        <span
          className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded text-black shrink-0"
          style={{ background: brandColor }}
        >
          {item.badge}
        </span>
      )}

      {/* Tooltip quando collapsed */}
      {collapsed && (
        <span
          className="absolute left-full ml-2.5 px-2.5 py-1.5 rounded-lg text-xs
                     font-medium whitespace-nowrap z-50
                     opacity-0 group-hover:opacity-100 pointer-events-none
                     transition-opacity duration-100"
          style={{
            background: 'rgba(14,14,20,0.96)',
            border:     '1px solid rgba(255,255,255,0.07)',
            color:      '#F0F0F5',
            boxShadow:  '0 4px 20px rgba(0,0,0,0.5)',
          }}
        >
          {item.label}
          {item.badge && (
            <span className="ml-1.5 text-[9px] font-bold px-1 rounded"
                  style={{ background: brandColor, color: '#050508' }}>
              {item.badge}
            </span>
          )}
        </span>
      )}
    </Link>
  )
}