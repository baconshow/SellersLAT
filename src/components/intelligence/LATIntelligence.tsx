'use client'
import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AlertTriangle, ArrowRight, Brain,
  CheckCircle2, ChevronDown, ChevronUp,
  Loader2, MessageSquare, RefreshCw, Send, X,
} from 'lucide-react'
import { analyzeProject, chatWithClaude } from '@/lib/claude'
import type { LATAnalysis } from '@/lib/claude'
import type { Project } from '@/types'

interface Props {
  project: Project
  onClose?: () => void
}

const PRIORITY_COLOR = {
  high:   '#EF4444',
  medium: '#F59E0B',
  low:    'rgba(255,255,255,0.4)',
}

const SEVERITY_COLOR = {
  high:   '#EF4444',
  medium: '#F59E0B',
  low:    '#64748B',
}

export default function LATIntelligence({ project, onClose }: Props) {
  const [tab,       setTab]      = useState<'actions' | 'chat'>('actions')
  const [analysis,  setAnalysis] = useState<LATAnalysis | null>(null)
  const [loading,   setLoading]  = useState(false)
  const [expanded,  setExpanded] = useState<string | null>(null)

  // Chat
  const [messages,  setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([])
  const [input,     setInput]    = useState('')
  const [sending,   setSending]  = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const runAnalysis = async () => {
    setLoading(true)
    const result = await analyzeProject(project, 'manual_check')
    setAnalysis(result)
    setLoading(false)
  }

  useEffect(() => { runAnalysis() }, [project.id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async () => {
    if (!input.trim() || sending) return
    const userMsg = { role: 'user' as const, content: input.trim() }
    const next    = [...messages, userMsg]
    setMessages(next)
    setInput('')
    setSending(true)
  
    try {
      const res  = await fetch('/api/claude', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ project, messages: next }),
      })
      const json = await res.json()
      console.log('[LAT chat response]', json)
  
      if (json.ok && json.text) {
        setMessages(m => [...m, { role: 'assistant', content: json.text }])
      } else {
        setMessages(m => [...m, { role: 'assistant', content: `Erro: ${json.error ?? 'resposta vazia'}` }])
      }
    } catch (err: any) {
      console.error('[LAT chat error]', err)
      setMessages(m => [...m, { role: 'assistant', content: `Erro de conexão: ${err.message}` }])
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex flex-col h-full" style={{ color: 'rgba(255,255,255,0.85)' }}>

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4"
           style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center"
               style={{ background: 'var(--color-brand,#00D4AA)' }}>
            <Brain style={{ width: 14, height: 14, color: '#050508' }} />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">LAT Intelligence</p>
            <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
              Gestor autônomo do projeto
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={runAnalysis}
            disabled={loading}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
            style={{ background: 'rgba(255,255,255,0.05)' }}
            title="Reanalisar"
          >
            <RefreshCw style={{ width: 13, height: 13, color: 'rgba(255,255,255,0.4)',
              animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          </button>
          {onClose && (
            <button onClick={onClose}
              className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
              style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.3)' }}>
              <X style={{ width: 13, height: 13 }} />
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex px-5 pt-3 gap-1"
           style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        {[
          { id: 'actions', label: 'Ações & Riscos', icon: Brain       },
          { id: 'chat',    label: 'Conversar',       icon: MessageSquare },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as any)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-t-lg transition-all"
            style={{
              color:      tab === t.id ? 'var(--color-brand,#00D4AA)' : 'rgba(255,255,255,0.3)',
              borderBottom: tab === t.id ? '2px solid var(--color-brand,#00D4AA)' : '2px solid transparent',
              background: tab === t.id ? 'rgba(255,255,255,0.03)' : 'transparent',
            }}
          >
            <t.icon style={{ width: 12, height: 12 }} />
            {t.label}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">

        {/* ── Ações & Riscos ── */}
        {tab === 'actions' && (
          <div className="p-5 space-y-5">
            {loading && (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <Loader2 style={{ width: 24, height: 24, color: 'var(--color-brand,#00D4AA)',
                  animation: 'spin 1s linear infinite' }} />
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  Analisando o projeto...
                </p>
              </div>
            )}

            {!loading && analysis && (
              <>
                {/* Summary */}
                <div className="rounded-lg px-4 py-3"
                     style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>
                    {analysis.summary}
                  </p>
                </div>

                {/* Ações urgentes */}
                {analysis.urgentActions?.length > 0 && (
                  <div>
                    <p className="text-[10px] uppercase tracking-widest mb-2.5 font-semibold"
                       style={{ color: 'rgba(255,255,255,0.3)' }}>
                      Ações Necessárias
                    </p>
                    <div className="space-y-2">
                      {analysis.urgentActions.map((action, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.07 }}
                          className="rounded-lg overflow-hidden cursor-pointer"
                          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
                          onClick={() => setExpanded(expanded === `a${i}` ? null : `a${i}`)}
                        >
                          <div className="flex items-center gap-3 px-4 py-3">
                            <div className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                                 style={{ background: PRIORITY_COLOR[action.priority] }} />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-white truncate">
                                {action.title}
                              </p>
                              <p className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>
                                Prazo: {action.deadline}
                              </p>
                            </div>
                            {expanded === `a${i}`
                              ? <ChevronUp  style={{ width: 12, height: 12, color: 'rgba(255,255,255,0.2)', flexShrink: 0 }} />
                              : <ChevronDown style={{ width: 12, height: 12, color: 'rgba(255,255,255,0.2)', flexShrink: 0 }} />
                            }
                          </div>
                          <AnimatePresence>
                            {expanded === `a${i}` && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="px-4 pb-3"
                                style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
                              >
                                <p className="text-xs mt-2.5 leading-relaxed"
                                   style={{ color: 'rgba(255,255,255,0.5)' }}>
                                  {action.description}
                                </p>
                                <button
                                  className="mt-3 flex items-center gap-1.5 text-[10px] font-semibold px-3 py-1.5 rounded-lg transition-all hover:opacity-80"
                                  style={{
                                    background: `${PRIORITY_COLOR[action.priority]}18`,
                                    color:       PRIORITY_COLOR[action.priority],
                                    border:      `1px solid ${PRIORITY_COLOR[action.priority]}30`,
                                  }}
                                  onClick={e => {
                                    e.stopPropagation()
                                    setTab('chat')
                                    setInput(`Me ajude com: ${action.title}`)
                                  }}
                                >
                                  <MessageSquare style={{ width: 10, height: 10 }} />
                                  Pedir ajuda à IA
                                </button>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Riscos */}
                {analysis.risks?.length > 0 && (
                  <div>
                    <p className="text-[10px] uppercase tracking-widest mb-2.5 font-semibold"
                       style={{ color: 'rgba(255,255,255,0.3)' }}>
                      Riscos Identificados
                    </p>
                    <div className="space-y-2">
                      {analysis.risks.map((risk, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.07 + 0.2 }}
                          className="rounded-lg overflow-hidden cursor-pointer"
                          style={{
                            background: `${SEVERITY_COLOR[risk.severity]}08`,
                            border:     `1px solid ${SEVERITY_COLOR[risk.severity]}20`,
                          }}
                          onClick={() => setExpanded(expanded === `r${i}` ? null : `r${i}`)}
                        >
                          <div className="flex items-center gap-3 px-4 py-3">
                            <AlertTriangle style={{ width: 13, height: 13, flexShrink: 0,
                              color: SEVERITY_COLOR[risk.severity] }} />
                            <p className="text-xs font-medium flex-1 truncate"
                               style={{ color: SEVERITY_COLOR[risk.severity] }}>
                              {risk.title}
                            </p>
                            {expanded === `r${i}`
                              ? <ChevronUp  style={{ width: 12, height: 12, color: 'rgba(255,255,255,0.2)', flexShrink: 0 }} />
                              : <ChevronDown style={{ width: 12, height: 12, color: 'rgba(255,255,255,0.2)', flexShrink: 0 }} />
                            }
                          </div>
                          <AnimatePresence>
                            {expanded === `r${i}` && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="px-4 pb-3"
                                style={{ borderTop: `1px solid ${SEVERITY_COLOR[risk.severity]}15` }}
                              >
                                <p className="text-xs mt-2.5 leading-relaxed"
                                   style={{ color: 'rgba(255,255,255,0.45)' }}>
                                  {risk.description}
                                </p>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Próxima semana */}
                {analysis.nextWeekPreview && (
                  <div className="rounded-lg px-4 py-3"
                       style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <ArrowRight style={{ width: 11, height: 11, color: 'var(--color-brand,#00D4AA)' }} />
                      <p className="text-[10px] uppercase tracking-widest font-semibold"
                         style={{ color: 'var(--color-brand,#00D4AA)' }}>
                        Próxima semana
                      </p>
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)' }}>
                      {analysis.nextWeekPreview}
                    </p>
                  </div>
                )}

                {/* Nota motivacional */}
                {analysis.motivationalNote && (
                  <p className="text-[11px] text-center italic"
                     style={{ color: 'rgba(255,255,255,0.2)' }}>
                    {analysis.motivationalNote}
                  </p>
                )}
              </>
            )}

            {!loading && !analysis && (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>
                  Não foi possível carregar a análise.
                </p>
                <button onClick={runAnalysis}
                  className="text-xs px-4 py-2 rounded-lg"
                  style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)' }}>
                  Tentar novamente
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Chat ── */}
        {tab === 'chat' && (
          <div className="flex flex-col h-full">
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center py-10 gap-2">
                  <Brain style={{ width: 28, height: 28, color: 'rgba(255,255,255,0.1)' }} />
                  <p className="text-xs text-center" style={{ color: 'rgba(255,255,255,0.25)' }}>
                    Pergunte qualquer coisa sobre o projeto.<br />
                    Eu tenho todo o contexto.
                  </p>
                  {/* Sugestões rápidas */}
                  <div className="flex flex-col gap-1.5 mt-4 w-full">
                    {[
                      'O que está atrasado?',
                      'Gere o email de KickOff',
                      'Qual o risco maior agora?',
                      'Recalcule o Go-Live',
                    ].map(s => (
                      <button key={s} onClick={() => setInput(s)}
                        className="text-left text-xs px-3 py-2 rounded-lg transition-all hover:opacity-80"
                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
                          color: 'rgba(255,255,255,0.45)' }}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((m, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className="max-w-[85%] rounded-xl px-4 py-3 text-xs leading-relaxed"
                    style={m.role === 'user' ? {
                      background: 'var(--color-brand,#00D4AA)',
                      color:      '#050508',
                      fontWeight: 500,
                    } : {
                      background: 'rgba(255,255,255,0.05)',
                      border:     '1px solid rgba(255,255,255,0.08)',
                      color:      'rgba(255,255,255,0.75)',
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {m.content}
                  </div>
                </motion.div>
              ))}

              {sending && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-2 px-4 py-3 rounded-xl"
                       style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <Loader2 style={{ width: 12, height: 12, color: 'var(--color-brand,#00D4AA)',
                      animation: 'spin 1s linear infinite' }} />
                    <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
                      Pensando...
                    </span>
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>
          </div>
        )}
      </div>

      {/* Input de chat fixo no bottom */}
      {tab === 'chat' && (
        <div className="p-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex gap-2">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              placeholder="Pergunte sobre o projeto..."
              className="flex-1 rounded-lg px-3 py-2.5 text-xs text-white outline-none"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border:     '1px solid rgba(255,255,255,0.09)',
                color:      'rgba(255,255,255,0.8)',
              }}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || sending}
              className="w-9 h-9 rounded-lg flex items-center justify-center transition-all hover:opacity-80 disabled:opacity-30"
              style={{ background: 'var(--color-brand,#00D4AA)', flexShrink: 0 }}
            >
              <Send style={{ width: 13, height: 13, color: '#050508' }} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}