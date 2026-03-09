'use client'
import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    AlertTriangle, ArrowRight,
    ChevronDown, ChevronUp,
    MessageSquare, RefreshCw, Send, X,
  } from 'lucide-react'
import { differenceInDays } from 'date-fns'
import { analyzeProject, chatWithClaude } from '@/lib/claude'
import type { LATAnalysis } from '@/lib/claude'
import type { Project } from '@/types'
import { useAuth } from '@/contexts/AuthContext'

const ClaudeIcon = ({ size = 18, ...props }: any) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 50 50" {...props}>
    <path d="M19.861,27.625v-0.716l-16.65-0.681L2.07,25.985L1,24.575l0.11-0.703l0.959-0.645l17.95,1.345l0.11-0.314L5.716,14.365l-0.729-0.924l-0.314-2.016L5.985,9.98l2.214,0.24l11.312,8.602l0.327-0.353L12.623,5.977c0,0-0.548-2.175-0.548-2.697l1.494-2.029l0.827-0.266l2.833,0.995l7.935,17.331h0.314l1.348-14.819l0.752-1.822l1.494-0.985l1.167,0.557l0.959,1.374l-2.551,14.294h0.425l0.486-0.486l8.434-10.197l1.092-0.862h2.065l1.52,2.259l-0.681,2.334l-7.996,11.108l0.146,0.217l0.376-0.036l12.479-2.405l1.666,0.778l0.182,0.791l-0.655,1.617l-15.435,3.523l-0.084,0.062l0.097,0.12l13.711,0.814l1.578,1.044L49,29.868l-0.159,0.972l-2.431,1.238l-13.561-3.254h-0.363v0.217l11.218,10.427l0.256,1.154l-0.645,0.911l-0.681-0.097l-9.967-8.058h-0.256v0.34l5.578,8.35l0.243,2.162l-0.34,0.703l-1.215,0.425l-1.335-0.243l-7.863-12.083l-0.279,0.159l-1.348,14.524l-0.632,0.742l-1.459,0.558l-1.215-0.924L21.9,46.597l2.966-14.939l-0.023-0.084l-0.279,0.036L13.881,45.138l-0.827,0.327l-1.433-0.742l0.133-1.326l0.801-1.18l9.52-12.019l-0.013-0.314h-0.11l-12.69,8.239l-2.259,0.292L6.03,37.505l0.12-1.494l0.46-0.486L19.861,27.625z" fill="currentColor"/>
  </svg>
)

/* \u2500\u2500 Loading messages generator \u2500\u2500 */

const GENERIC_MESSAGES = [
  'Fazendo fotoss\u00edntese dos dados...',
  'Montando o quebra-cabe\u00e7a...',
  'Deixando o pomodoro pra depois...',
  'Investigando os culpados...',
  'Verificando se o Miguel j\u00e1 aprovou o or\u00e7amento...',
  'Apontando os respons\u00e1veis com o dedo...',
  'Consultando o or\u00e1culo de vendas...',
  'Aguardando o Miguel terminar a reuni\u00e3o que era pra ser r\u00e1pida...',
  'Ignorando as desculpas e focando nos n\u00fameros...',
  'O Miguel disse que resolve amanh\u00e3. Registrando a promessa...',
  'Traduzindo "t\u00e1 quase" para datas reais...',
  'Checando se o Miguel leu o email enviado h\u00e1 3 dias...',
]

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function firstName(email: string): string {
  return email.split('@')[0].split('.')[0].replace(/^\w/, c => c.toUpperCase())
}

function daysSinceStr(dateStr: string | undefined): number | null {
  if (!dateStr) return null
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return null
  return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24))
}

function getLoadingMessages(project: Project, userName: string): string[] {
  const contextual: string[] = []
  const distributors = project.distributors ?? []
  const blocked = distributors.filter(d => d.status === 'blocked')
  const emails = project.authorizedEmails ?? []
  const integrated = distributors.filter(d => d.status === 'integrated').length
  const total = distributors.length
  const progress = total > 0 ? (integrated / total) * 100 : 0
  const weekNumber = project.startDate
    ? Math.max(1, Math.ceil(differenceInDays(new Date(), new Date(project.startDate)) / 7))
    : 1
  const daysToEnd = project.endDate
    ? differenceInDays(new Date(project.endDate), new Date())
    : 999

  if (blocked.length > 0) {
    const pick = blocked[Math.floor(Math.random() * blocked.length)]
    contextual.push(`Perguntando por que ${pick.name} ainda n\u00e3o respondeu...`)
    if (pick.responsible) {
      contextual.push(`Verificando o que a ${pick.responsible} fez com o ${pick.name}...`)
      contextual.push(`${pick.responsible} foi avisada sobre o ${pick.name}? Checando...`)
    }
  }
  if (emails.length > 0) {
    const pick = emails[Math.floor(Math.random() * emails.length)]
    contextual.push(`Verificando quantas liga\u00e7\u00f5es foram feitas para ${firstName(pick)}...`)
  }
  const blockedPhase = project.phases.find(p => p.status === 'blocked')
  if (blockedPhase) {
    contextual.push(`Tentando entender o que travou o ${blockedPhase.name}...`)
  }
  if (weekNumber > 3) {
    contextual.push(`Calculando quantos caf\u00e9s o ${userName} j\u00e1 tomou nesse projeto...`)
  }
  if (progress < 30 && total > 0) {
    contextual.push('Respirando fundo antes de mostrar os n\u00fameros...')
  }
  if (progress > 80) {
    contextual.push('Preparando os fogos de artif\u00edcio...')
  }
  if (daysToEnd < 14 && daysToEnd > 0) {
    contextual.push('Contando os dias. E ficando nervoso junto com voc\u00ea...')
  }

  // Distribuidores parados
  for (const d of distributors) {
    if (d.status === 'integrated') continue
    const lastComment = d.comments?.length
      ? d.comments.reduce((latest, c) => c.timestamp > latest ? c.timestamp : latest, '')
      : undefined
    const days = daysSinceStr(lastComment || d.integratedAt)
    if (days !== null && days > 7) {
      contextual.push(`${d.name} parado h\u00e1 ${days} dias. Isso n\u00e3o \u00e9 normal...`)
    }
  }

  // Henrique
  contextual.push('Calculando o que contar pro Henrique na pr\u00f3xima reuni\u00e3o...')
  contextual.push('Preparando o relat\u00f3rio que o Henrique vai pedir amanh\u00e3...')

  const shuffled = shuffle(GENERIC_MESSAGES)
  const mixed: string[] = []
  let gi = 0
  let ci = 0
  const shuffledCtx = shuffle(contextual)

  while (gi < shuffled.length || ci < shuffledCtx.length) {
    if (gi < shuffled.length) mixed.push(shuffled[gi++])
    if (ci < shuffledCtx.length) mixed.push(shuffledCtx[ci++])
  }

  return mixed
}

const DONE_MESSAGE = 'Pronto. Pode culpar algu\u00e9m agora.'

/* \u2500\u2500 Terminal Log component \u2500\u2500 */

interface TerminalLogProps {
  messages: string[]
  active: boolean
  onDoneTyping?: () => void
  finalMessage?: string | null
}

function TerminalLog({ messages, active, onDoneTyping, finalMessage }: TerminalLogProps) {
  // Each log entry: { text: string, typed: string, done: boolean }
  const [log, setLog] = useState<{ text: string; typed: string; done: boolean }[]>([])
  const msgIndexRef = useRef(0)
  const charIndexRef = useRef(0)
  const phaseRef = useRef<'typing' | 'pausing' | 'idle'>('idle')
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const activeRef = useRef(active)
  const finalRef = useRef(finalMessage)

  activeRef.current = active
  finalRef.current = finalMessage

  const MAX_VISIBLE = 3

  const startNextMessage = useCallback(() => {
    if (!activeRef.current && !finalRef.current) return

    let nextText: string
    if (finalRef.current) {
      nextText = finalRef.current
      finalRef.current = null // consume it
    } else {
      if (msgIndexRef.current >= messages.length) msgIndexRef.current = 0
      nextText = messages[msgIndexRef.current]
      msgIndexRef.current++
    }

    charIndexRef.current = 0
    phaseRef.current = 'typing'

    setLog(prev => {
      const next = [...prev, { text: nextText, typed: '', done: false }]
      // Keep max visible + 1 for exit animation
      if (next.length > MAX_VISIBLE + 1) return next.slice(-MAX_VISIBLE - 1)
      return next
    })

    typeNextChar(nextText)
  }, [messages])

  const typeNextChar = useCallback((fullText: string) => {
    timerRef.current = setTimeout(() => {
      charIndexRef.current++
      const currentTyped = fullText.substring(0, charIndexRef.current)

      setLog(prev => {
        const updated = [...prev]
        const last = updated[updated.length - 1]
        if (last) {
          updated[updated.length - 1] = { ...last, typed: currentTyped }
        }
        return updated
      })

      if (charIndexRef.current >= fullText.length) {
        // Done typing this line
        setLog(prev => {
          const updated = [...prev]
          const last = updated[updated.length - 1]
          if (last) {
            updated[updated.length - 1] = { ...last, done: true }
          }
          return updated
        })

        // If this was the final message, notify parent
        if (fullText === DONE_MESSAGE) {
          phaseRef.current = 'idle'
          if (onDoneTyping) {
            timerRef.current = setTimeout(onDoneTyping, 800)
          }
          return
        }

        // Pause then start next
        phaseRef.current = 'pausing'
        timerRef.current = setTimeout(() => {
          if (activeRef.current || finalRef.current) {
            startNextMessage()
          } else {
            phaseRef.current = 'idle'
          }
        }, 600)
      } else {
        typeNextChar(fullText)
      }
    }, 28)
  }, [startNextMessage, onDoneTyping])

  // Start the cycle
  useEffect(() => {
    if (messages.length === 0) return
    startNextMessage()
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // When finalMessage arrives, if we're idle, kick it off
  useEffect(() => {
    if (finalMessage && phaseRef.current === 'idle') {
      startNextMessage()
    }
  }, [finalMessage, startNextMessage])

  // Visible entries: last MAX_VISIBLE
  const visible = log.slice(-MAX_VISIBLE)
  const exitingId = log.length > MAX_VISIBLE ? log.length - MAX_VISIBLE - 1 : -1

  return (
    <div
      className="flex flex-col justify-end overflow-hidden"
      style={{ height: 80, gap: 6 }}
    >
      <AnimatePresence initial={false}>
        {visible.map((entry, i) => {
          const globalIndex = log.length - MAX_VISIBLE + i
          const isLast = i === visible.length - 1
          const isMiddle = i === visible.length - 2
          const isTop = i <= visible.length - 3

          let textOpacity = 'rgba(255,255,255,0.6)'
          if (isMiddle) textOpacity = 'rgba(255,255,255,0.3)'
          if (isTop) textOpacity = 'rgba(255,255,255,0.15)'

          return (
            <motion.div
              key={globalIndex}
              className="flex items-center font-mono shrink-0"
              style={{ fontSize: 11, lineHeight: '16px' }}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8, transition: { duration: 0.4 } }}
              transition={{ duration: 0.25 }}
            >
              <span style={{ color: 'var(--color-brand,#00D4AA)', opacity: 0.9 }}>{'> '}</span>
              <span style={{ color: textOpacity }}>
                {isLast && !entry.done ? entry.typed : entry.text}
              </span>
              {isLast && !entry.done && (
                <motion.span
                  style={{ color: 'var(--color-brand,#00D4AA)', marginLeft: 1 }}
                  animate={{ opacity: [1, 0, 1] }}
                  transition={{ duration: 0.8, repeat: Infinity, times: [0, 0.5, 1], ease: 'linear' }}
                >
                  {'\u2588'}
                </motion.span>
              )}
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}

/* \u2500\u2500 Intro Screen \u2500\u2500 */

interface IntroScreenProps {
  messages: string[]
  active: boolean
  finalMessage: string | null
  onDoneTyping: () => void
}

function IntroScreen({ messages, active, finalMessage, onDoneTyping }: IntroScreenProps) {
  return (
    <motion.div
      key="intro"
      className="absolute inset-0 z-50 flex flex-col items-center"
      style={{ background: 'rgba(5,5,8,0.98)' }}
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.4, delay: 0.1, ease: 'easeOut' }}
    >
      {/* Center content */}
      <div className="flex-1 flex flex-col items-center justify-center">
        {/* Icon with glow + pulse */}
        <motion.div
          className="relative flex items-center justify-center"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        >
          {/* Glow ring */}
          <motion.div
            className="absolute rounded-full"
            style={{ width: 80, height: 80 }}
            animate={{
              boxShadow: [
                '0 0 20px rgba(var(--color-brand-rgb,0,212,170),0.15), 0 0 60px rgba(var(--color-brand-rgb,0,212,170),0.08)',
                '0 0 30px rgba(var(--color-brand-rgb,0,212,170),0.3), 0 0 80px rgba(var(--color-brand-rgb,0,212,170),0.15)',
                '0 0 20px rgba(var(--color-brand-rgb,0,212,170),0.15), 0 0 60px rgba(var(--color-brand-rgb,0,212,170),0.08)',
              ],
            }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          />
          {/* Icon pulse */}
          <motion.div
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ duration: 0.8, delay: 0.3, ease: 'easeInOut' }}
          >
            <ClaudeIcon
              size={48}
              style={{ color: 'var(--color-brand,#00D4AA)' }}
            />
          </motion.div>
        </motion.div>

        {/* Label */}
        <motion.p
          className="text-[11px] uppercase tracking-[0.2em] font-semibold mt-5"
          style={{ color: 'rgba(255,255,255,0.3)' }}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4, ease: 'easeOut' }}
        >
          LAT Intelligence
        </motion.p>
      </div>

      {/* Terminal at the bottom */}
      <div className="w-full px-8 pb-8">
        <TerminalLog
          messages={messages}
          active={active}
          finalMessage={finalMessage}
          onDoneTyping={onDoneTyping}
        />
      </div>
    </motion.div>
  )
}

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
  const { user } = useAuth()
  const [tab,        setTab]       = useState<'actions' | 'chat'>('actions')
  const [analysis,   setAnalysis]  = useState<LATAnalysis | null>(null)
  const [loading,    setLoading]   = useState(false)
  const [expanded,   setExpanded]  = useState<string | null>(null)
  const [showIntro,  setShowIntro] = useState(true)
  const [terminalActive, setTerminalActive] = useState(true)
  const [finalMsg,   setFinalMsg]  = useState<string | null>(null)

  // Chat
  const [messages,  setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([])
  const [input,     setInput]    = useState('')
  const [sending,   setSending]  = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Track whether intro and analysis are each done
  const introFinishedRef  = useRef(false)
  const analysisResultRef = useRef<LATAnalysis | null>(null)
  const analysisDoneRef   = useRef(false)

  const userName = user?.displayName ?? 'time Sellers'

  const userContext = {
    userName,
    authorizedEmails: project.authorizedEmails ?? [],
  }

  const loadingMessages = useMemo(
    () => getLoadingMessages(project, userName),
    [project.id, userName]
  )

  // Called when the "Pronto..." message finishes typing
  const handleDoneTyping = useCallback(() => {
    setShowIntro(false)
  }, [])

  // Trigger the final message + reveal
  const revealContent = useCallback(() => {
    if (analysisDoneRef.current && analysisResultRef.current) {
      setTerminalActive(false)
      setFinalMsg(DONE_MESSAGE)
    } else if (analysisDoneRef.current && !analysisResultRef.current) {
      // Analysis failed \u2014 show immediately
      setShowIntro(false)
    }
  }, [])

  const runAnalysis = async () => {
    setLoading(true)
    analysisDoneRef.current = false
    analysisResultRef.current = null
    const result = await analyzeProject(project, 'manual_check', userContext)
    analysisResultRef.current = result
    analysisDoneRef.current = true
    setAnalysis(result)
    setLoading(false)

    // If intro already finished, reveal now
    if (introFinishedRef.current) {
      revealContent()
    }
  }

  // Start analysis AND intro timer in parallel on mount
  useEffect(() => {
    introFinishedRef.current = false
    analysisDoneRef.current = false
    runAnalysis()

    const timer = setTimeout(() => {
      introFinishedRef.current = true
      if (analysisDoneRef.current) {
        revealContent()
      }
    }, 2800)

    return () => clearTimeout(timer)
  }, [project.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // When loading finishes and intro timer already passed, reveal
  useEffect(() => {
    if (!loading && introFinishedRef.current && showIntro) {
      revealContent()
    }
  }, [loading]) // eslint-disable-line react-hooks/exhaustive-deps

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
        body:    JSON.stringify({
          project,
          messages:         next,
          userName:         userContext.userName,
          authorizedEmails: userContext.authorizedEmails,
        }),
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
      setMessages(m => [...m, { role: 'assistant', content: `Erro de conex\u00e3o: ${err.message}` }])
    } finally {
      setSending(false)
    }
  }

  return (
    <motion.div
      className="relative flex flex-col h-full overflow-hidden"
      style={{ color: 'rgba(255,255,255,0.85)' }}
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
    >

      {/* \u2500\u2500 Intro overlay \u2500\u2500 */}
      <AnimatePresence>
        {showIntro && (
          <IntroScreen
            messages={loadingMessages}
            active={terminalActive}
            finalMessage={finalMsg}
            onDoneTyping={handleDoneTyping}
          />
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4"
           style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded flex items-center justify-center"
               style={{ background: 'var(--color-brand,#00D4AA)' }}>
            <ClaudeIcon style={{ width: 14, height: 14, color: '#050508' }} />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">LAT Intelligence</p>
            <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
              Live Autonomous Tracker
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={runAnalysis}
            disabled={loading}
            className="w-7 h-7 rounded flex items-center justify-center transition-colors"
            style={{ background: 'rgba(255,255,255,0.05)' }}
            title="Reanalisar"
          >
            <RefreshCw style={{ width: 13, height: 13, color: 'rgba(255,255,255,0.4)',
              animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          </button>
          {onClose && (
            <button onClick={onClose}
              className="w-7 h-7 rounded flex items-center justify-center transition-colors"
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
          { id: 'actions', label: 'A\u00e7\u00f5es & Riscos', icon: ClaudeIcon       },
          { id: 'chat',    label: 'Conversar',       icon: MessageSquare },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as any)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-t transition-all"
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

        {/* \u2500\u2500 A\u00e7\u00f5es & Riscos \u2500\u2500 */}
        {tab === 'actions' && (
          <div className="p-5 space-y-5">

            {/* Loading: terminal log (when intro is gone but still loading) */}
            {loading && !showIntro && (
              <div className="flex flex-col items-center justify-center py-12 gap-4">
                <ClaudeIcon size={32} style={{ color: 'var(--color-brand,#00D4AA)', animation: 'spin 3s linear infinite' }} />
                <div className="w-full px-4">
                  <TerminalLog
                    messages={loadingMessages}
                    active={true}
                    finalMessage={null}
                  />
                </div>
              </div>
            )}

            {!loading && analysis && (
              <motion.div
                className="space-y-5"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
              >
                {/* Summary */}
                <motion.div
                  className="rounded px-4 py-3"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0 }}
                >
                  <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>
                    {analysis.summary}
                  </p>
                </motion.div>

                {/* Acoes urgentes */}
                {analysis.urgentActions?.length > 0 && (
                  <div>
                    <p className="text-[10px] uppercase tracking-widest mb-2.5 font-semibold"
                       style={{ color: 'rgba(255,255,255,0.3)' }}>
                      A\u00e7\u00f5es Necess\u00e1rias
                    </p>
                    <div className="space-y-2">
                      {analysis.urgentActions.map((action, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: (i + 1) * 0.06 }}
                          className="rounded overflow-hidden cursor-pointer"
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
                                  className="mt-3 flex items-center gap-1.5 text-[10px] font-semibold px-3 py-1.5 rounded transition-all hover:opacity-80"
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
                                  Pedir ajuda \u00e0 IA
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
                      {analysis.risks.map((risk, i) => {
                        const actionsCount = analysis.urgentActions?.length ?? 0
                        return (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: (actionsCount + i + 2) * 0.06 }}
                            className="rounded overflow-hidden cursor-pointer"
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
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Pr\u00f3xima semana */}
                {analysis.nextWeekPreview && (
                  <motion.div
                    className="rounded px-4 py-3"
                    style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: ((analysis.urgentActions?.length ?? 0) + (analysis.risks?.length ?? 0) + 2) * 0.06 }}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <ArrowRight style={{ width: 11, height: 11, color: 'var(--color-brand,#00D4AA)' }} />
                      <p className="text-[10px] uppercase tracking-widest font-semibold"
                         style={{ color: 'var(--color-brand,#00D4AA)' }}>
                        Pr\u00f3xima semana
                      </p>
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)' }}>
                      {analysis.nextWeekPreview}
                    </p>
                  </motion.div>
                )}

              </motion.div>
            )}

            {!loading && !analysis && !showIntro && (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>
                  N\u00e3o foi poss\u00edvel carregar a an\u00e1lise.
                </p>
                <button onClick={runAnalysis}
                  className="text-xs px-4 py-2 rounded"
                  style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)' }}>
                  Tentar novamente
                </button>
              </div>
            )}
          </div>
        )}

        {/* \u2500\u2500 Chat \u2500\u2500 */}
        {tab === 'chat' && (
          <div className="flex flex-col h-full">
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {messages.length === 0 && (
                <div className="flex flex-col py-6 gap-4">
                  {/* Motivational welcome from AI */}
                  {analysis?.motivationalNote && (
                    <motion.div
                      className="flex items-start gap-2.5"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, ease: 'easeOut' }}
                    >
                      <div className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0 mt-0.5"
                           style={{ background: 'rgba(255,255,255,0.06)' }}>
                        <ClaudeIcon style={{ width: 14, height: 14, color: 'var(--color-brand,#00D4AA)' }} />
                      </div>
                      <div className="rounded px-4 py-3"
                           style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                        <p className="text-xs italic leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)' }}>
                          {analysis.motivationalNote}
                        </p>
                      </div>
                    </motion.div>
                  )}

                  {/* Empty state + suggestions */}
                  <div className="flex flex-col items-center gap-2 pt-2">
                    {!analysis?.motivationalNote && (
                      <>
                        <ClaudeIcon style={{ width: 28, height: 28, color: 'rgba(255,255,255,0.1)' }} />
                        <p className="text-xs text-center" style={{ color: 'rgba(255,255,255,0.25)' }}>
                          Pergunte qualquer coisa sobre o projeto.<br />
                          Eu tenho todo o contexto.
                        </p>
                      </>
                    )}
                    {/* Sugest\u00f5es r\u00e1pidas */}
                    <div className="flex flex-col gap-1.5 mt-2 w-full">
                      {[
                        'O que est\u00e1 atrasado?',
                        'Gere o email de KickOff',
                        'Qual o risco maior agora?',
                        'Recalcule o Go-Live',
                      ].map(s => (
                        <button key={s} onClick={() => setInput(s)}
                          className="text-left text-xs px-3 py-2 rounded transition-all hover:opacity-80"
                          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
                            color: 'rgba(255,255,255,0.45)' }}>
                          {s}
                        </button>
                      ))}
                    </div>
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
                    className="max-w-[85%] rounded px-4 py-3 text-xs leading-relaxed"
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
                  <div className="flex items-center gap-2 px-4 py-3 rounded"
                       style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <ClaudeIcon style={{ width: 12, height: 12, color: 'var(--color-brand,#00D4AA)',
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
              className="flex-1 rounded px-3 py-2.5 text-xs text-white outline-none"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border:     '1px solid rgba(255,255,255,0.09)',
                color:      'rgba(255,255,255,0.8)',
              }}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || sending}
              className="w-9 h-9 rounded flex items-center justify-center transition-all hover:opacity-80 disabled:opacity-30"
              style={{ background: 'var(--color-brand,#00D4AA)', flexShrink: 0 }}
            >
              <Send style={{ width: 13, height: 13, color: '#050508' }} />
            </button>
          </div>
        </div>
      )}
    </motion.div>
  )
}
