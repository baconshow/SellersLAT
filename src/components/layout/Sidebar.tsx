'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, BarChart3, GanttChart, Presentation,
  Sparkles, Settings, ChevronLeft, LogOut, Briefcase
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/utils'
import Image from 'next/image'

interface SidebarProps {
  projectId?: string
  onNewProject?: () => void
}

interface NavItem {
  icon: React.ElementType
  label: string
  href: string
  badge?: string
}

export default function Sidebar({ projectId, onNewProject }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()
  const { user, logout } = useAuth()

  const dashboardItems: NavItem[] = [
    { icon: LayoutDashboard, label: 'Projetos', href: '/dashboard' },
  ]

  const projectItems: NavItem[] = projectId ? [
    { icon: BarChart3,    label: 'Dashboard',    href: `/project/${projectId}` },
    { icon: GanttChart,   label: 'Gantt',        href: `/project/${projectId}/gantt` },
    { icon: Presentation, label: 'Apresentação', href: `/project/${projectId}/slides` },
    { icon: Sparkles,     label: 'IA',           href: `/project/${projectId}/ai`, badge: 'AI' },
    { icon: Settings,     label: 'Configurações',href: `/project/${projectId}/settings` },
  ] : []

  const w = collapsed ? 72 : 240

  return (
    <motion.aside
      animate={{ width: w }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className="fixed left-0 top-0 h-screen z-50 flex flex-col overflow-hidden"
      style={{
        width: w,
        minWidth: w,
        background: 'rgba(10,10,15,0.92)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderRight: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-5"
           style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="flex items-center gap-2"
            >
              <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                   style={{ background: 'linear-gradient(135deg, var(--color-brand, #00D4AA), var(--color-brand-secondary, #8B5CF6))' }}>
                <Briefcase className="w-4 h-4 text-black" />
              </div>
              <span className="font-bold text-sm text-white tracking-wide">Sellers Pulse</span>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={() => setCollapsed(c => !c)}
          className="w-8 h-8 rounded-lg flex items-center justify-center ml-auto transition-colors"
          style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)' }}
        >
          <motion.div animate={{ rotate: collapsed ? 180 : 0 }} transition={{ duration: 0.3 }}>
            <ChevronLeft className="w-4 h-4" />
          </motion.div>
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-2 flex flex-col gap-1 overflow-y-auto">
        {dashboardItems.map(item => (
          <NavLink key={item.href} item={item} collapsed={collapsed} active={pathname === item.href} />
        ))}

        {projectItems.length > 0 && (
          <>
            <div className="px-2 mt-4 mb-1">
              <AnimatePresence>
                {!collapsed && (
                  <motion.p
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="text-xs uppercase tracking-widest font-medium px-2"
                    style={{ color: 'rgba(255,255,255,0.25)' }}
                  >
                    Projeto
                  </motion.p>
                )}
              </AnimatePresence>
              {collapsed && <div className="h-px mx-2 my-1" style={{ background: 'rgba(255,255,255,0.08)' }} />}
            </div>
            {projectItems.map(item => (
              <NavLink key={item.href} item={item} collapsed={collapsed} active={pathname === item.href} />
            ))}
          </>
        )}
      </nav>

      {/* User footer */}
      <div className="p-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div className={`flex items-center gap-3 ${collapsed ? 'justify-center' : ''}`}>
          {user?.photoURL ? (
            <Image src={user.photoURL} alt={user.displayName || ''} width={32} height={32}
              className="rounded-full flex-shrink-0"
              style={{ boxShadow: '0 0 0 2px var(--color-brand, #00D4AA)' }}
            />
          ) : (
            <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold"
                 style={{ background: 'var(--color-brand-soft, rgba(0,212,170,0.12))', color: 'var(--color-brand, #00D4AA)' }}>
              {user?.displayName?.[0] ?? 'S'}
            </div>
          )}
          <AnimatePresence>
            {!collapsed && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 min-w-0">
                <p className="text-xs font-medium text-white truncate">{user?.displayName}</p>
                <p className="text-[10px] truncate" style={{ color: 'rgba(255,255,255,0.35)' }}>{user?.email}</p>
              </motion.div>
            )}
          </AnimatePresence>
          {!collapsed && (
            <button onClick={logout}
              className="p-1.5 rounded-lg transition-colors"
              style={{ color: 'rgba(255,255,255,0.3)' }}
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </motion.aside>
  )
}

function NavLink({ item, collapsed, active }: { item: NavItem; collapsed: boolean; active: boolean }) {
  const Icon = item.icon
  return (
    <Link
      href={item.href}
      className={`flex items-center gap-3 py-2.5 px-3 rounded-xl text-sm font-medium transition-all relative group ${collapsed ? 'justify-center' : 'justify-start'}`}
      style={active ? {
        background: 'var(--color-brand-soft, rgba(0,212,170,0.12))',
        color: 'var(--color-brand, #00D4AA)',
        boxShadow: '0 0 12px var(--color-brand-glow, rgba(0,212,170,0.2))',
      } : { color: 'rgba(255,255,255,0.45)' }}
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
      <AnimatePresence>
        {!collapsed && (
          <motion.span
            initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }} transition={{ duration: 0.15 }}
          >
            {item.label}
          </motion.span>
        )}
      </AnimatePresence>
      {item.badge && !collapsed && (
        <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-md text-black"
              style={{ background: 'var(--color-brand, #00D4AA)' }}>
          {item.badge}
        </span>
      )}
      {collapsed && (
        <div className="absolute left-full ml-3 px-2 py-1 rounded-lg text-xs text-white whitespace-nowrap
                        opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50"
             style={{ background: '#161622', border: '1px solid rgba(255,255,255,0.1)' }}>
          {item.label}
        </div>
      )}
    </Link>
  )
}