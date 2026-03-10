'use client'

import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { useParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { differenceInDays, differenceInWeeks, format, eachMonthOfInterval } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  CheckCircle2, Clock, XCircle, Circle, AlertCircle,
  ChevronRight, Send, LogIn, LogOut, X, ArrowRight,
} from 'lucide-react'
import { getProjectBySlug, addDistributorCommentDoc, getDistributorComments, subscribeToDistributorsCollection } from '@/lib/firestore'
import { useAuth } from '@/contexts/AuthContext'
import { applyTheme } from '@/lib/theme'
import type { Project, Distributor, DistributorComment, PhaseStatus } from '@/types'
import ProjectTimeline from '@/components/timeline/ProjectTimeline'
import toast from 'react-hot-toast'

// ─── Status configs ──────────────────────────────────────────────────────────────────

const DIST_STATUS: Record<string, { color: string; Icon: any; label: string }> = {
  integrated:  { color: '#22c55e', Icon: CheckCircle2, label: 'Integrado'    },
  pending:     { color: '#f59e0b', Icon: Clock,        label: 'Pendente'     },
  blocked:     { color: '#ef4444', Icon: XCircle,      label: 'Bloqueado'    },
  not_started: { color: '#ffffff30', Icon: Circle,     label: 'Não iniciado' },
}

const PHASE_STATUS: Record<PhaseStatus, { color: string; icon: any; label: string }> = {
  completed:   { color: '#10B981', icon: CheckCircle2, label: 'Concluída'     },
  in_progress: { color: 'var(--color-brand, #00D4AA)', icon: Clock, label: 'Em Andamento' },
  blocked:     { color: '#EF4444', icon: AlertCircle,  label: 'Bloqueada'     },
  pending:     { color: '#64748B', icon: Circle,       label: 'Pendente'      },
}

// ─── Main Page ─────────────────────────────────────────────────────────────────────

export default function SlugSharePage() {
  // ============================================================
  // 1. ALL HOOKS — no exceptions, no conditionals before this
  // ============================================================
  const { slug } = useParams<{ slug: string }>()
  const { user, loading: authLoading, signInWithGoogle, logout } = useAuth()

  const [project, setProject]             = useState<Project | null>(null)
  const [distributors, setDistributors]  = useState<Distributor[]>([])
  const [status, setStatus]              = useState<'loading' | 'invalid' | 'need_login' | 'unauthorized' | 'ready'>('loading')
  const [distFilter, setDistFilter]      = useState<string | null>(null)

  // ============================================================
  // 2. ALL EFFECTS — no exceptions
  // ============================================================

  // Fetch project by slug
  useEffect(() => {
    if (!slug) return
    getProjectBySlug(slug).then(p => {
      if (!p) { setStatus('invalid'); return }
      setProject(p)
      applyTheme(p.clientColor, p.clientColorSecondary, p.clientColorRgb)
    })
  }, [slug])

  // Resolve auth state
  useEffect(() => {
    if (!project) return
    if (authLoading) return

    if (!user) {
      setStatus('need_login')
      return
    }

    const email = user.email?.toLowerCase()
    const authorized = (project.authorizedEmails || []).map((e: string) => e.toLowerCase())
    if (!email || !authorized.includes(email)) {
      setStatus('unauthorized')
      return
    }

    setStatus('ready')
  }, [project, user, authLoading])

  // Subscribe to distributors subcollection
  useEffect(() => {
    if (!project?.id) return
    return subscribeToDistributorsCollection(project.id, setDistributors)
  }, [project?.id])

  // ============================================================
  // 3. ALL DERIVED DATA (useMemo, useCallback, computed values)
  // ============================================================

  const accent       = project?.clientColor ?? '#00D4AA'
  const weekNumber   = project ? differenceInWeeks(new Date(), new Date(project.startDate)) + 1 : 0
  const daysRunning  = project ? differenceInDays(new Date(), new Date(project.startDate)) : 0

  const counts = useMemo(() => ({
    total:      distributors.length,
    integrated: distributors.filter(d => d.status === 'integrated').length,
    pending:    distributors.filter(d => d.status === 'pending').length,
    blocked:    distributors.filter(d => d.status === 'blocked').length,
  }), [distributors])

  const integrationPct = counts.total > 0 ? Math.round((counts.integrated / counts.total) * 100) : 0

  const grouped = useMemo(() => [
    ...distributors.filter(d => d.status === 'blocked'),
    ...distributors.filter(d => d.status === 'pending'),
    ...distributors.filter(d => d.status === 'not_started'),
    ...distributors.filter(d => d.status === 'integrated'),
  ], [distributors])

  const scrollToDistributors = useCallback((s: string) => {
    setDistFilter(prev => prev === s ? null : s)
    setTimeout(() => {
      document.getElementById('distribuidores-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 50)
  }, [])

  // ============================================================
  // 4. CONDITIONAL RENDERS — only after ALL hooks above
  // ============================================================

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-5 h-5 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
      </div>
    )
  }

  if (status === 'invalid') {
    return (
      <GateScreen>
        <h2 className="text-lg font-bold text-white">Link inativo ou não encontrado</h2>
        <p className="text-sm mt-2 max-w-md" style={{ color: 'rgba(255,255,255,0.4)' }}>
          Este link de compartilhamento não existe ou foi desativado pelo responsável do projeto.
        </p>
      </GateScreen>
    )
  }

  if (status === 'need_login') {
    return (
      <GateScreen>
        <h2 className="text-2xl font-bold" style={{ color: accent }}>
          {project?.clientName}
        </h2>
        <p className="text-sm mt-3 max-w-md" style={{ color: 'rgba(255,255,255,0.4)' }}>
          Acesso restrito a convidados autorizados
        </p>
        <button
          onClick={signInWithGoogle}
          className="flex items-center gap-2 px-6 py-3 rounded text-sm font-bold transition-all mt-6"
          style={{ background: accent, color: '#050508' }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
        >
          <LogIn style={{ width: 16, height: 16 }} />
          Entrar com Google para continuar
        </button>
      </GateScreen>
    )
  }

  if (status === 'unauthorized') {
    return (
      <GateScreen>
        <h2 className="text-lg font-bold text-white">Acesso não autorizado</h2>
        <p className="text-sm mt-2 max-w-md" style={{ color: 'rgba(255,255,255,0.4)' }}>
          O email <span className="text-white/70 font-medium">{user?.email}</span> não tem
          permissão para acessar este projeto.
        </p>
        <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.25)' }}>
          Entre em contato com a Sellers para solicitar acesso.
        </p>
        <button
          onClick={logout}
          className="flex items-center gap-2 px-5 py-2.5 rounded text-xs font-bold transition-all mt-5"
          style={{ border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)' }}
          onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.5)')}
        >
          <LogOut style={{ width: 14, height: 14 }} />
          Sair
        </button>
      </GateScreen>
    )
  }

  // ============================================================
  // 5. MAIN RENDER — status === 'ready', project is guaranteed
  // ============================================================

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-5xl mx-auto px-6 py-8 space-y-8"
    >
      {/* A) Header do projeto */}
      <div>
        <h1 className="text-3xl font-bold" style={{ color: accent }}>
          {project!.clientName}
        </h1>
        <p className="text-sm mt-1.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
          Semana {weekNumber} · {daysRunning} dias de projeto
        </p>
        {/* Barra de progresso */}
        <div className="mt-4 flex items-center gap-3">
          <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${integrationPct}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="h-full rounded-full"
              style={{ background: `linear-gradient(90deg, ${accent}, ${project!.clientColorSecondary || accent})` }}
            />
          </div>
          <span className="text-xs font-bold shrink-0" style={{ color: accent }}>
            {integrationPct}%
          </span>
        </div>
        <p className="text-[10px] mt-1" style={{ color: 'rgba(255,255,255,0.2)' }}>
          {counts.integrated} de {counts.total} distribuidores integrados
        </p>
      </div>

      {/* B) KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Total */}
        <div
          className="group rounded p-4 relative overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div
            className="absolute top-0 right-0 w-32 h-32 opacity-10 rounded-full -translate-y-16 translate-x-16 blur-3xl transition-opacity group-hover:opacity-20"
            style={{ backgroundColor: accent }}
          />
          <p className="text-[10px] uppercase tracking-widest font-semibold relative z-10" style={{ color: 'rgba(255,255,255,0.3)' }}>
            Total
          </p>
          <p className="text-2xl font-bold mt-1 relative z-10" style={{ color: 'rgba(255,255,255,0.6)' }}>
            {counts.total}
          </p>
          <p className="text-[10px] mt-1 relative z-10" style={{ color: 'rgba(255,255,255,0.2)' }}>
            {weekNumber} semanas de projeto
          </p>
        </div>

        {/* Integrados */}
        <div
          className="group rounded p-4 relative overflow-hidden"
          style={{ background: 'rgba(34,197,94,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div
            className="absolute top-0 right-0 w-32 h-32 opacity-10 rounded-full -translate-y-16 translate-x-16 blur-3xl transition-opacity group-hover:opacity-20"
            style={{ backgroundColor: '#10B981' }}
          />
          <p className="text-[10px] uppercase tracking-widest font-semibold relative z-10" style={{ color: 'rgba(255,255,255,0.3)' }}>
            Integrados
          </p>
          <p className="text-2xl font-bold mt-1 relative z-10" style={{ color: '#22c55e' }}>
            {counts.integrated}
          </p>
          <p className="text-[10px] mt-1 relative z-10" style={{ color: '#10B981' }}>
            {integrationPct}% concluído
          </p>
        </div>

        {/* Pendentes */}
        <div
          className="group rounded p-4 relative overflow-hidden cursor-pointer transition-all hover:border-[#f59e0b]/20"
          style={{ background: 'rgba(245,158,11,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
          onClick={() => scrollToDistributors('pending')}
        >
          <div
            className="absolute top-0 right-0 w-32 h-32 opacity-10 rounded-full -translate-y-16 translate-x-16 blur-3xl transition-opacity group-hover:opacity-20"
            style={{ backgroundColor: '#F59E0B' }}
          />
          <p className="text-[10px] uppercase tracking-widest font-semibold relative z-10" style={{ color: 'rgba(255,255,255,0.3)' }}>
            Pendentes
          </p>
          <p className="text-2xl font-bold mt-1 relative z-10" style={{ color: '#f59e0b' }}>
            {counts.pending}
          </p>
          <ChevronRight
            className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ width: 14, height: 14, color: '#f59e0b' }}
          />
        </div>

        {/* Bloqueados */}
        <div
          className="group rounded p-4 relative overflow-hidden cursor-pointer transition-all hover:border-[#ef4444]/20"
          style={{ background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
          onClick={() => scrollToDistributors('blocked')}
        >
          <div
            className="absolute top-0 right-0 w-32 h-32 opacity-10 rounded-full -translate-y-16 translate-x-16 blur-3xl transition-opacity group-hover:opacity-20"
            style={{ backgroundColor: '#EF4444' }}
          />
          <p className="text-[10px] uppercase tracking-widest font-semibold relative z-10" style={{ color: 'rgba(255,255,255,0.3)' }}>
            Bloqueados
          </p>
          <p className="text-2xl font-bold mt-1 relative z-10" style={{ color: '#ef4444' }}>
            {counts.blocked}
          </p>
          <ChevronRight
            className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ width: 14, height: 14, color: '#ef4444' }}
          />
        </div>
      </div>

      {/* B2) Evolução das Integrações */}
      {(project!.weeklyUpdates?.length ?? 0) > 0 && (
        <section>
          <h3 style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.15em',
            color: 'rgba(255,255,255,0.3)',
            textTransform: 'uppercase',
            marginBottom: 16,
          }}>
            Evolução das Integrações
          </h3>
          <div style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 5,
            padding: 20,
          }}>
            <ProjectTimeline project={project!} />
          </div>
        </section>
      )}

      {/* C) Gantt read-only */}
      {project!.startDate && project!.endDate && project!.phases.length > 0 && (
        <SectionCard title="Timeline" accent={accent}>
          <ReadOnlyGantt project={project!} />
        </SectionCard>
      )}

      {/* D) Distribuidores */}
      <div id="distribuidores-section">
        <SectionCard title="Distribuidores" accent={accent}>
          {/* Filter pills */}
          {distFilter && (
            <div className="flex items-center gap-2 -mt-2 mb-1">
              <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>Filtro:</span>
              <button
                onClick={() => setDistFilter(null)}
                className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold transition-all"
                style={{
                  background: `${DIST_STATUS[distFilter]?.color ?? '#fff'}20`,
                  color: DIST_STATUS[distFilter]?.color ?? '#fff',
                  border: `1px solid ${DIST_STATUS[distFilter]?.color ?? '#fff'}40`,
                }}
              >
                {DIST_STATUS[distFilter]?.label}
                <X style={{ width: 10, height: 10 }} />
              </button>
            </div>
          )}
          <div className="space-y-2">
            {(distFilter ? grouped.filter(d => d.status === distFilter) : grouped).map(d => (
              <DistributorRow
                key={d.id}
                distributor={d}
                projectId={project!.id}
                accent={accent}
                userEmail={user?.email ?? ''}
                userName={user?.displayName ?? ''}
              />
            ))}
            {grouped.length === 0 && (
              <p className="text-xs text-center py-8" style={{ color: 'rgba(255,255,255,0.2)' }}>
                Nenhum distribuidor cadastrado.
              </p>
            )}
          </div>
        </SectionCard>
      </div>

      {/* E) LAT Intelligence Chat */}
      <PublicLATChat
        slug={slug}
        userEmail={user?.email ?? ''}
        userName={user?.displayName ?? ''}
        accent={accent}
        accentRgb={project!.clientColorRgb ?? '0,212,170'}
        clientName={project!.clientName}
        counts={counts}
      />
    </motion.div>
  )
}

// ─── Gate Screen ───────────────────────────────────────────────────────────────────

// ─── ClaudeIcon (inline) ────────────────────────────────────────────────────

const ClaudeIcon = ({ size = 14, ...props }: any) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 50 50" {...props}>
    <path d="M19.861,27.625v-0.716l-16.65-0.681L2.07,25.985L1,24.575l0.11-0.703l0.959-0.645l17.95,1.345l0.11-0.314L5.716,14.365l-0.729-0.924l-0.314-2.016L5.985,9.98l2.214,0.24l11.312,8.602l0.327-0.353L12.623,5.977c0,0-0.548-2.175-0.548-2.697l1.494-2.029l0.827-0.266l2.833,0.995l7.935,17.331h0.314l1.348-14.819l0.752-1.822l1.494-0.985l1.167,0.557l0.959,1.374l-2.551,14.294h0.425l0.486-0.486l8.434-10.197l1.092-0.862h2.065l1.52,2.259l-0.681,2.334l-7.996,11.108l0.146,0.217l0.376-0.036l12.479-2.405l1.666,0.778l0.182,0.791l-0.655,1.617l-15.435,3.523l-0.084,0.062l0.097,0.12l13.711,0.814l1.578,1.044L49,29.868l-0.159,0.972l-2.431,1.238l-13.561-3.254h-0.363v0.217l11.218,10.427l0.256,1.154l-0.645,0.911l-0.681-0.097l-9.967-8.058h-0.256v0.34l5.578,8.35l0.243,2.162l-0.34,0.703l-1.215,0.425l-1.335-0.243l-7.863-12.083l-0.279,0.159l-1.348,14.524l-0.632,0.742l-1.459,0.558l-1.215-0.924L21.9,46.597l2.966-14.939l-0.023-0.084l-0.279,0.036L13.881,45.138l-0.827,0.327l-1.433-0.742l0.133-1.326l0.801-1.18l9.52-12.019l-0.013-0.314h-0.11l-12.69,8.239l-2.259,0.292L6.03,37.505l0.12-1.494l0.46-0.486L19.861,27.625z" fill="currentColor" />
  </svg>
)

// ─── Public LAT Intelligence Chat ───────────────────────────────────────────

interface AnalyzeData {
  summary?: string
  highlights?: string[]
  attentionPoints?: { title: string; description: string }[]
  nextWeekMessage?: string
}

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
}

const LOADING_MESSAGES = [
  '> Preparando seu resumo...',
  '> Analisando as integrações...',
  '> Quase lá...',
]

function PublicLATChat({
  slug,
  userEmail,
  userName,
  accent,
  accentRgb,
  clientName,
  counts,
}: {
  slug: string
  userEmail: string
  userName: string
  accent: string
  accentRgb: string
  clientName: string
  counts: { total: number; integrated: number; pending: number; blocked: number }
}) {
  const [analyzeData, setAnalyzeData] = useState<AnalyzeData | null>(null)
  const [analyzeLoading, setAnalyzeLoading] = useState(true)
  const [analyzeError, setAnalyzeError] = useState(false)
  const [loadingMsg, setLoadingMsg] = useState(LOADING_MESSAGES[0])
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [chatLoading, setChatLoading] = useState(false)
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Cycle loading messages
  useEffect(() => {
    if (!analyzeLoading) return
    let idx = 0
    const iv = setInterval(() => {
      idx = (idx + 1) % LOADING_MESSAGES.length
      setLoadingMsg(LOADING_MESSAGES[idx])
    }, 2500)
    return () => clearInterval(iv)
  }, [analyzeLoading])

  // Auto-fetch analyze on mount
  useEffect(() => {
    const run = async () => {
      try {
        const res = await fetch('/api/claude/public', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slug, userEmail, userName, mode: 'analyze' }),
        })
        const json = await res.json()
        if (json.ok && json.data) {
          setAnalyzeData(json.data as AnalyzeData)
        } else {
          setAnalyzeError(true)
        }
      } catch {
        setAnalyzeError(true)
      } finally {
        setAnalyzeLoading(false)
      }
    }
    run()
  }, [slug, userEmail, userName])

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    const text = input.trim()
    if (!text || chatLoading) return
    setInput('')

    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text }
    setMessages(prev => [...prev, userMsg])
    setChatLoading(true)

    try {
      const res = await fetch('/api/claude/public', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, userEmail, userName, message: text, mode: 'chat' }),
      })
      const json = await res.json()
      const reply = json.ok ? (json.text || 'Sem resposta.') : (json.error || 'Erro ao processar.')
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'assistant', text: reply }])
    } catch {
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'assistant', text: 'Erro de conexão. Tente novamente.' }])
    } finally {
      setChatLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="rounded overflow-hidden"
      style={{
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 5,
      }}
    >
      {/* Header */}
      <div
        className="px-5 py-4"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="flex items-center gap-2">
          <ClaudeIcon size={14} style={{ color: accent }} />
          <span className="text-xs font-bold text-white">LAT Intelligence</span>
        </div>
        <p className="text-[10px] mt-1" style={{ color: 'rgba(255,255,255,0.3)' }}>
          Tire dúvidas sobre o projeto
        </p>
      </div>

      {/* Analyze summary area */}
      <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        {analyzeLoading ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-2"
          >
            <p className="text-[11px] font-mono" style={{ color: accent }}>
              {loadingMsg}
            </p>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 border-2 rounded-full animate-spin" style={{ borderColor: `${accent}30`, borderTopColor: accent }} />
              <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.2)' }}>
                Consultando IA...
              </span>
            </div>
          </motion.div>
        ) : analyzeError ? (
          <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
            Não foi possível carregar a análise automática.
          </p>
        ) : analyzeData ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-3"
          >
            {analyzeData.summary && (
              <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>
                {analyzeData.summary}
              </p>
            )}

            {analyzeData.highlights && analyzeData.highlights.length > 0 && (
              <div className="space-y-1">
                {analyzeData.highlights.map((h, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <CheckCircle2 style={{ width: 11, height: 11, color: '#22c55e', marginTop: 2, flexShrink: 0 }} />
                    <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.5)' }}>{h}</span>
                  </div>
                ))}
              </div>
            )}

            {analyzeData.attentionPoints && analyzeData.attentionPoints.length > 0 && (
              <div className="space-y-1.5">
                {analyzeData.attentionPoints.map((p, i) => (
                  <div
                    key={i}
                    className="rounded px-3 py-2"
                    style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.1)', borderRadius: 5 }}
                  >
                    <p className="text-[11px] font-semibold" style={{ color: '#f59e0b' }}>{p.title}</p>
                    <p className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>{p.description}</p>
                  </div>
                ))}
              </div>
            )}

            {analyzeData.nextWeekMessage && (
              <div
                className="rounded px-3 py-2"
                style={{ background: `rgba(${accentRgb}, 0.06)`, border: `1px solid rgba(${accentRgb}, 0.1)`, borderRadius: 5 }}
              >
                <p className="text-[10px] font-bold mb-0.5" style={{ color: accent }}>Esta semana</p>
                <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.5)' }}>{analyzeData.nextWeekMessage}</p>
              </div>
            )}

            <div className="flex items-center gap-3 pt-1">
              <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.2)' }}>
                • {counts.integrated} distribuidores integrados
              </span>
              <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.2)' }}>
                • {counts.pending + counts.blocked} em andamento esta semana
              </span>
            </div>
          </motion.div>
        ) : null}
      </div>

      {/* Chat messages */}
      {messages.length > 0 && (
        <div
          className="px-5 py-4 space-y-3 max-h-80 overflow-y-auto"
          style={{
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            scrollbarWidth: 'thin',
            scrollbarColor: 'rgba(255,255,255,0.1) transparent',
          }}
        >
          {messages.map(msg => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className="rounded px-3.5 py-2.5 max-w-[80%]"
                style={{
                  background: msg.role === 'user'
                    ? `rgba(${accentRgb}, 0.1)`
                    : 'rgba(255,255,255,0.04)',
                  border: msg.role === 'user'
                    ? `1px solid rgba(${accentRgb}, 0.15)`
                    : '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 5,
                }}
              >
                {msg.role === 'assistant' && (
                  <div className="flex items-center gap-1.5 mb-1">
                    <ClaudeIcon size={10} style={{ color: accent }} />
                    <span className="text-[9px] font-bold" style={{ color: accent }}>LAT</span>
                  </div>
                )}
                <p
                  className="text-[11px] leading-relaxed whitespace-pre-wrap"
                  style={{
                    color: msg.role === 'user' ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.55)',
                  }}
                >
                  {msg.text}
                </p>
              </div>
            </motion.div>
          ))}

          {chatLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-start"
            >
              <div
                className="rounded px-3.5 py-2.5 flex items-center gap-2"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 5 }}
              >
                <div className="w-3 h-3 border-2 rounded-full animate-spin" style={{ borderColor: `${accent}30`, borderTopColor: accent }} />
                <span className="text-[10px] font-mono" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  Pensando...
                </span>
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>
      )}

      {/* Input */}
      <div className="px-5 py-3 flex items-center gap-2">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSend() }}
          placeholder="Digite sua pergunta..."
          disabled={chatLoading}
          className="flex-1 text-xs outline-none disabled:opacity-50"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 5,
            color: 'rgba(255,255,255,0.85)',
            padding: '9px 12px',
          }}
        />
        <button
          onClick={handleSend}
          disabled={chatLoading || !input.trim()}
          className="flex items-center justify-center w-9 h-9 rounded transition-all disabled:opacity-20"
          style={{
            background: `rgba(${accentRgb}, 0.12)`,
            border: `1px solid rgba(${accentRgb}, 0.15)`,
            borderRadius: 5,
            color: accent,
          }}
        >
          <ArrowRight style={{ width: 14, height: 14 }} />
        </button>
      </div>
    </motion.div>
  )
}

// ─── Gate Screen ─────────────────────────────────────────────────────────────

function GateScreen({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
      <div
        className="w-14 h-14 rounded flex items-center justify-center mb-5"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <span
          style={{
            fontFamily: 'Conthrax, Orbitron, "Share Tech Mono", monospace',
            fontSize: 14,
            fontWeight: 700,
            color: '#00D4AA',
            letterSpacing: 2,
          }}
        >
          LAT
        </span>
      </div>
      {children}
    </div>
  )
}

// ─── Section Card ──────────────────────────────────────────────────────────────────

function SectionCard({ title, accent, children }: { title: string; accent: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded p-5 space-y-4"
      style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      <div className="flex items-center gap-2 pb-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <span style={{ color: accent, fontSize: 10 }}>●</span>
        <p className="text-xs font-bold tracking-wide text-white">{title}</p>
      </div>
      {children}
    </div>
  )
}

// ─── Read-only Gantt ───────────────────────────────────────────────────────────────

function ReadOnlyGantt({ project }: { project: Project }) {
  const projectStart = new Date(project.startDate)
  const projectEnd   = new Date(project.endDate)
  const totalDays    = differenceInDays(projectEnd, projectStart) || 1
  const today        = new Date()
  const months       = eachMonthOfInterval({ start: projectStart, end: projectEnd })
  const isActive     = today >= projectStart && today <= projectEnd
  const LABEL_WIDTH  = 180

  const pct      = (d: Date) => Math.min(100, Math.max(0, (differenceInDays(d, projectStart) / totalDays) * 100))
  const widthPct = (s: Date, e: Date) => Math.max(1, (differenceInDays(e, s) / totalDays) * 100)
  const todayPct = pct(today)

  return (
    <div className="w-full overflow-x-auto">
      <div className="min-w-[600px]">
        {/* Legend */}
        <div className="flex items-center justify-end gap-5 mb-3 px-1">
          {Object.entries(PHASE_STATUS).map(([s, cfg]) => (
            <span key={s} className="flex items-center gap-1.5 text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
              <cfg.icon style={{ width: 10, height: 10, color: cfg.color }} />
              {cfg.label}
            </span>
          ))}
        </div>

        {/* Month labels */}
        <div className="relative mb-4 h-5" style={{ marginLeft: LABEL_WIDTH }}>
          {months.map(month => (
            <span
              key={month.toISOString()}
              className="absolute text-[11px] uppercase tracking-widest font-semibold"
              style={{ left: `${pct(month < projectStart ? projectStart : month)}%`, color: 'rgba(255,255,255,0.2)' }}
            >
              {format(month, 'MMM', { locale: ptBR })}
            </span>
          ))}
        </div>

        {/* Phase rows */}
        <div className="space-y-2 relative">
          {/* Today line */}
          {isActive && (
            <div
              className="absolute top-0 bottom-0 w-px pointer-events-none"
              style={{
                left: `calc(${LABEL_WIDTH}px + ${todayPct / 100} * (100% - ${LABEL_WIDTH}px))`,
                background: 'var(--color-brand, #00D4AA)',
                opacity: 0.7,
                zIndex: 10,
              }}
            >
              <div
                className="absolute -top-6 left-1/2 -translate-x-1/2 text-[9px] font-black px-2 py-0.5 rounded whitespace-nowrap"
                style={{ background: 'var(--color-brand, #00D4AA)', color: '#050508', borderRadius: 5 }}
              >
                HOJE
              </div>
            </div>
          )}

          {project.phases.map((phase, index) => {
            const pStart = new Date(phase.startDate)
            const pEnd   = new Date(phase.endDate)
            const left   = pct(pStart)
            const width  = widthPct(pStart, pEnd)
            const active = phase.status === 'in_progress'
            const cfg    = PHASE_STATUS[phase.status]

            const barStyle = (() => {
              switch (phase.status) {
                case 'completed':
                  return { background: `linear-gradient(90deg, ${cfg.color}cc, ${cfg.color}55)`, borderRadius: 5 }
                case 'in_progress':
                  return {
                    background: 'linear-gradient(90deg, var(--color-brand,#00D4AA), var(--color-brand-secondary,#8B5CF6))',
                    boxShadow: '0 0 18px var(--color-brand-glow, rgba(0,212,170,0.35))',
                    borderRadius: 5,
                  }
                case 'blocked':
                  return { background: `linear-gradient(90deg, ${cfg.color}bb, ${cfg.color}66)`, borderRadius: 5 }
                default:
                  return { background: `linear-gradient(90deg, ${cfg.color}55, ${cfg.color}25)`, border: `1px solid ${cfg.color}60`, borderRadius: 5 }
              }
            })()

            return (
              <motion.div
                key={phase.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.04 }}
                className="flex items-center h-10"
              >
                <div className="flex-shrink-0 flex items-center gap-2 pr-4" style={{ width: LABEL_WIDTH }}>
                  <cfg.icon style={{ width: 13, height: 13, color: cfg.color, flexShrink: 0 }} />
                  <span
                    className="text-xs truncate"
                    style={{ color: active ? '#fff' : 'rgba(255,255,255,0.5)', fontWeight: active ? 600 : 400 }}
                  >
                    {phase.name}
                  </span>
                </div>
                <div className="flex-1 relative h-full flex items-center">
                  <div
                    style={{
                      position: 'absolute',
                      left: `${left}%`,
                      width: `${width}%`,
                      height: 30,
                      ...barStyle,
                    }}
                  >
                    {width > 8 && (
                      <div className="absolute inset-0 flex items-center justify-between px-2.5">
                        <span style={{ fontSize: 10, fontWeight: 500, color: active ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.5)' }}>
                          {format(pStart, 'dd/MM')}
                        </span>
                        {width > 15 && (
                          <span style={{ fontSize: 10, fontWeight: 500, color: active ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.5)' }}>
                            {format(pEnd, 'dd/MM')}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── Distributor Row ───────────────────────────────────────────────────────────────

function DistributorRow({
  distributor,
  projectId,
  accent,
  userEmail,
  userName,
}: {
  distributor: Distributor
  projectId: string
  accent: string
  userEmail: string
  userName: string
}) {
  // All hooks at top of this sub-component
  const [expanded, setExpanded]   = useState(false)
  const [comments, setComments]   = useState<DistributorComment[]>([])
  const [loadingComments, setLoadingComments] = useState(false)
  const [comment, setComment]     = useState('')
  const [sending, setSending]     = useState(false)

  // Derived
  const cfg = DIST_STATUS[distributor.status] ?? DIST_STATUS.not_started
  const canComment = distributor.status === 'blocked' || distributor.status === 'pending'

  // Functions
  const loadComments = async () => {
    setLoadingComments(true)
    try {
      const c = await getDistributorComments(projectId, distributor.id)
      setComments(c)
    } catch { setComments([]) }
    finally { setLoadingComments(false) }
  }

  const toggleExpand = () => {
    const next = !expanded
    setExpanded(next)
    if (next) loadComments()
  }

  const handleSend = async () => {
    if (!comment.trim()) return
    setSending(true)
    try {
      await addDistributorCommentDoc(projectId, distributor.id, {
        name: userName,
        email: userEmail,
        text: comment.trim(),
      })
      setComment('')
      toast.success('Comentário enviado.')
      await loadComments()
    } catch {
      toast.error('Erro ao enviar comentário.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div
      className="rounded overflow-hidden"
      style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      {/* Main row */}
      <div className="flex items-center gap-3 px-4 py-3">
        <cfg.Icon style={{ width: 14, height: 14, color: cfg.color, flexShrink: 0 }} />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-white truncate">{distributor.name}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px]" style={{ color: cfg.color }}>{cfg.label}</span>
            {distributor.connectionType && (
              <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.2)' }}>{distributor.connectionType}</span>
            )}
          </div>
        </div>
        {canComment && (
          <button
            onClick={toggleExpand}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded text-[10px] font-medium transition-all"
            style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)' }}
          >
            <ChevronRight
              style={{
                width: 10, height: 10,
                transform: expanded ? 'rotate(90deg)' : 'none',
                transition: 'transform 150ms',
              }}
            />
            Comentar
          </button>
        )}
      </div>

      {/* Blocker description */}
      {canComment && distributor.blockerDescription && (
        <div className="px-4 pb-2">
          <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.25)' }}>
            {distributor.blockerDescription}
          </p>
        </div>
      )}

      {/* Expandable comments panel */}
      <AnimatePresence>
        {expanded && canComment && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ borderTop: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}
          >
            <div className="px-4 py-3 space-y-3">
              {/* Existing comments from subcollection */}
              {loadingComments ? (
                <div className="flex items-center justify-center py-3">
                  <div className="w-4 h-4 border-2 border-white/10 border-t-white/40 rounded-full animate-spin" />
                </div>
              ) : comments.length > 0 ? (
                <div
                  className="space-y-2 max-h-48 overflow-y-auto"
                  style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}
                >
                  {comments.map((c: DistributorComment) => (
                    <div
                      key={c.id}
                      className="flex items-start gap-3 px-3 py-2.5 rounded"
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 5 }}
                    >
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold"
                        style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }}
                      >
                        {c.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-semibold text-white/70">{c.name}</span>
                          <span className="text-[9px]" style={{ color: 'rgba(255,255,255,0.2)' }}>
                            {format(new Date(c.timestamp), "dd/MM 'às' HH:mm", { locale: ptBR })}
                          </span>
                        </div>
                        <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.5)' }}>{c.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}

              {/* New comment input */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  placeholder="Digite seu comentário..."
                  onKeyDown={e => { if (e.key === 'Enter') handleSend() }}
                  className="flex-1 text-xs outline-none"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 5,
                    color: 'rgba(255,255,255,0.85)',
                    padding: '8px 12px',
                  }}
                />
                <button
                  onClick={handleSend}
                  disabled={sending || !comment.trim()}
                  className="flex items-center gap-1.5 px-3 py-2 rounded text-[11px] font-bold transition-all disabled:opacity-30"
                  style={{ background: `${accent}20`, color: accent }}
                >
                  Enviar
                  <Send style={{ width: 12, height: 12 }} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
