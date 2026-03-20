'use client'
import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronRight, MessageCircle, Send, Activity, Calendar } from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { Project, Distributor, ProjectMessage } from '@/types'
import { subscribeToProjectMessages, addProjectMessage } from '@/lib/firestore'

// ─── ClaudeIcon inline (LAT) ─────────────────────────────────────────────────
function ClaudeIcon({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 3c1.5 0 2.9.4 4.1 1.2L5.2 16.1A7.7 7.7 0 0 1 4 12c0-3.9 2.9-7.1 6.7-7.6L12 5zm0 14c-1.5 0-2.9-.4-4.1-1.2l10.9-9.9c.7 1.1 1.2 2.5 1.2 4.1 0 3.9-2.9 7.1-6.7 7.6L12 19z"
        fill={color}
      />
    </svg>
  )
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProjectCardProps {
  project: Project
  distributors: Distributor[]
  currentUserEmail: string
  currentUserName: string
  index: number
  onEnter: () => void
}

interface LATInsight {
  summary: string
  attentionPoints?: string[]
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ProjectCard({
  project,
  distributors,
  currentUserEmail,
  currentUserName,
  index,
  onEnter,
}: ProjectCardProps) {
  const router = useRouter()
  const accent = project.clientColor || '#00D4AA'

  // ── Stats em tempo real ──
  const integrated = distributors.filter(d => d.status === 'integrated').length
  const pending    = distributors.filter(d => d.status === 'pending').length
  const blocked    = distributors.filter(d => d.status === 'blocked').length
  const total      = distributors.length
  const progress   = total > 0 ? Math.round((integrated / total) * 100) : 0

  const currentPhase = project.phases.find(p => p.status === 'in_progress')

  // ── Chat state ──
  const [chatOpen,    setChatOpen]    = useState(false)
  const [messages,    setMessages]    = useState<ProjectMessage[]>([])
  const [msgInput,    setMsgInput]    = useState('')
  const [sending,     setSending]     = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!chatOpen) return
    return subscribeToProjectMessages(project.id, setMessages, 20)
  }, [chatOpen, project.id])

  useEffect(() => {
    if (chatOpen && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, chatOpen])

  const handleSend = async () => {
    const text = msgInput.trim()
    if (!text || sending) return
    setSending(true)
    setMsgInput('')
    try {
      await addProjectMessage(
        project.id,
        { email: currentUserEmail, name: currentUserName },
        text,
      )
    } catch { /* silently fail */ }
    finally { setSending(false) }
  }

  // ── LAT state ──
  const [latOpen,    setLatOpen]    = useState(false)
  const [latLoading, setLatLoading] = useState(false)
  const [latInsight, setLatInsight] = useState<LATInsight | null>(null)

  const handleLAT = async () => {
    if (latOpen && latInsight) { setLatOpen(false); return }
    setLatOpen(true)

    const cacheKey = `lat_cache_${project.id}`
    const cached = sessionStorage.getItem(cacheKey)
    if (cached) {
      try { setLatInsight(JSON.parse(cached)); return } catch { /* ignore */ }
    }

    setLatLoading(true)
    try {
      const res = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project, distributors, trigger: 'dashboard_insight' }),
      })
      const json = await res.json()
      if (json.ok && json.data) {
        const insight: LATInsight = {
          summary: json.data.summary || '',
          attentionPoints: [
            ...(json.data.urgentActions?.slice(0, 3).map((a: any) => a.title) ?? []),
            ...(json.data.risks?.slice(0, 2).map((r: any) => r.title) ?? []),
          ].slice(0, 3),
        }
        setLatInsight(insight)
        sessionStorage.setItem(cacheKey, JSON.stringify(insight))
      }
    } catch { /* silently fail */ }
    finally { setLatLoading(false) }
  }

  // ── Last message preview ──
  const lastUserMsg = [...messages].reverse().find(m => m.type === 'user')

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <div
        className="rounded overflow-hidden transition-all"
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 5,
        }}
        onMouseEnter={e => (e.currentTarget.style.borderColor = `${accent}40`)}
        onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--color-border)')}
      >
        {/* ── Header ── */}
        <div className="px-5 pt-5 pb-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ background: accent }}
              />
              <h3 className="text-sm font-bold" style={{ color: 'var(--color-text)', fontFamily: 'var(--font-outfit)', letterSpacing: '-0.01em' }}>{project.clientName}</h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold" style={{ color: accent }}>{progress}%</span>
              <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--color-border)' }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  className="h-full rounded-full"
                  style={{ background: accent }}
                />
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
            <span><b style={{ color: '#22c55e' }}>{integrated}</b> integrados</span>
            <span style={{ color: 'var(--color-text-muted)' }}>·</span>
            <span><b style={{ color: '#f59e0b' }}>{pending}</b> pendentes</span>
            <span style={{ color: 'var(--color-text-muted)' }}>·</span>
            <span><b style={{ color: '#ef4444' }}>{blocked}</b> bloqueados</span>
          </div>
        </div>

        {/* ── Preview row ── */}
        <div className="px-5 py-2.5" style={{ borderTop: '1px solid var(--color-muted)' }}>
          {lastUserMsg && (
            <p className="text-[11px] truncate mb-1" style={{ color: 'var(--color-text-muted)' }}>
              <span style={{ color: 'var(--color-text-2)' }}><MessageCircle size={11} style={{ display: 'inline', marginRight: 5, opacity: 0.5, flexShrink: 0 }} />{lastUserMsg.authorName.split(' ')[0]}:</span>{' '}
              "{lastUserMsg.text}"
            </p>
          )}
          {currentPhase && (
            <p className="text-[11px] truncate" style={{ color: 'var(--color-text-muted)' }}>
              <Calendar size={11} style={{ display: 'inline', marginRight: 5, opacity: 0.5, flexShrink: 0 }} />Fase atual: {currentPhase.name}
            </p>
          )}
          {!lastUserMsg && !currentPhase && (
            <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
              Sem atividade recente
            </p>
          )}
        </div>

        {/* ── Actions ── */}
        <div
          className="flex items-center gap-2 px-5 py-3"
          style={{ borderTop: '1px solid var(--color-muted)' }}
        >
          <button
            onClick={() => { setChatOpen(v => !v); setLatOpen(false) }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[11px] font-semibold transition-all"
            style={{
              background: chatOpen ? `${accent}20` : 'var(--color-muted)',
              border: `1px solid ${chatOpen ? `${accent}40` : 'var(--color-border)'}`,
              color: chatOpen ? accent : 'var(--color-text-muted)',
            }}
          >
            <MessageCircle style={{ width: 12, height: 12 }} />
            Chat
          </button>
          <button
            onClick={() => { handleLAT(); setChatOpen(false) }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[11px] font-semibold transition-all"
            style={{
              background: latOpen ? `${accent}20` : 'var(--color-muted)',
              border: `1px solid ${latOpen ? `${accent}40` : 'var(--color-border)'}`,
              color: latOpen ? accent : 'var(--color-text-muted)',
            }}
          >
            <ClaudeIcon size={12} color={latOpen ? accent : 'var(--color-text-muted)'} />
            LAT
          </button>
          <button
            onClick={onEnter}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[11px] font-semibold transition-all ml-auto"
            style={{
              background: `${accent}12`,
              border: `1px solid ${accent}30`,
              color: accent,
            }}
            onMouseEnter={e => (e.currentTarget.style.background = `${accent}25`)}
            onMouseLeave={e => (e.currentTarget.style.background = `${accent}12`)}
          >
            Entrar
            <ChevronRight style={{ width: 12, height: 12 }} />
          </button>
        </div>

        {/* ── Chat area (expandable) ── */}
        <AnimatePresence>
          {chatOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{ overflow: 'hidden', borderTop: '1px solid var(--color-muted)' }}
            >
              <div
                className="max-h-56 overflow-y-auto px-4 py-3 space-y-2"
                style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}
              >
                {messages.length === 0 && (
                  <p className="text-[11px] text-center py-4" style={{ color: 'var(--color-text-muted)' }}>
                    Nenhuma mensagem ainda. Comece a conversa!
                  </p>
                )}
                {messages.map(msg => (
                  <div key={msg.id} className="flex items-start gap-2">
                    {msg.type === 'activity' ? (
                      <div className="flex items-center gap-1.5 w-full">
                        <Activity style={{ width: 10, height: 10, color: 'var(--color-text-muted)', flexShrink: 0 }} />
                        <p className="text-[10px] italic" style={{ color: 'var(--color-text-muted)' }}>
                          {msg.text}
                        </p>
                      </div>
                    ) : (
                      <>
                        <div
                          className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[9px] font-bold"
                          style={{
                            background: msg.authorEmail === currentUserEmail ? `${accent}25` : 'var(--color-border-2)',
                            color: msg.authorEmail === currentUserEmail ? accent : 'var(--color-text-2)',
                          }}
                        >
                          {msg.authorName?.[0]?.toUpperCase() ?? '?'}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] font-semibold" style={{ color: 'var(--color-text-2)' }}>
                            {msg.authorName.split(' ')[0]}
                          </p>
                          <p className="text-[11px] break-words" style={{ color: 'var(--color-text-2)' }}>
                            {msg.text}
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>

              {/* Input */}
              <div className="flex items-center gap-2 px-4 py-2.5" style={{ borderTop: '1px solid var(--color-muted)' }}>
                <input
                  type="text"
                  value={msgInput}
                  onChange={e => setMsgInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleSend() }}
                  placeholder="Mensagem..."
                  className="flex-1 text-[11px] outline-none"
                  style={{
                    background: 'var(--input-bg)',
                    border: '1px solid var(--color-border-2)',
                    borderRadius: 5,
                    color: 'var(--color-text)',
                    padding: '7px 10px',
                  }}
                />
                <button
                  onClick={handleSend}
                  disabled={!msgInput.trim() || sending}
                  className="flex items-center justify-center w-7 h-7 rounded transition-all disabled:opacity-30"
                  style={{ background: `${accent}20`, color: accent }}
                >
                  <Send style={{ width: 12, height: 12 }} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── LAT area (expandable) ── */}
        <AnimatePresence>
          {latOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{ overflow: 'hidden', borderTop: '1px solid var(--color-muted)' }}
            >
              <div className="px-4 py-3">
                {latLoading && !latInsight && (
                  <div className="space-y-2">
                    {[0, 1, 2].map(i => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0.3 }}
                        animate={{ opacity: [0.3, 0.7, 0.3] }}
                        transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
                        className="flex items-center gap-2"
                      >
                        <span className="text-[10px] font-mono" style={{ color: `${accent}60` }}>{'>'}</span>
                        <div
                          className="h-2.5 rounded"
                          style={{
                            background: `${accent}15`,
                            width: `${60 + i * 15}%`,
                          }}
                        />
                      </motion.div>
                    ))}
                  </div>
                )}

                {latInsight && (
                  <div className="space-y-2.5">
                    <p className="text-[11px] leading-relaxed" style={{ color: 'var(--color-text-2)' }}>
                      {latInsight.summary}
                    </p>
                    {latInsight.attentionPoints && latInsight.attentionPoints.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-[9px] uppercase tracking-widest font-bold" style={{ color: 'var(--color-text-muted)' }}>
                          Atenção
                        </p>
                        {latInsight.attentionPoints.map((point, i) => (
                          <div key={i} className="flex items-start gap-1.5">
                            <span className="text-[10px] mt-px" style={{ color: '#f59e0b' }}>•</span>
                            <p className="text-[10px]" style={{ color: 'var(--color-text-2)' }}>{point}</p>
                          </div>
                        ))}
                      </div>
                    )}
                    <button
                      onClick={() => router.push(`/project/${project.id}?tab=intelligence`)}
                      className="text-[10px] font-semibold transition-all"
                      style={{ color: accent }}
                      onMouseEnter={e => (e.currentTarget.style.opacity = '0.7')}
                      onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                    >
                      Abrir LAT completo →
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
