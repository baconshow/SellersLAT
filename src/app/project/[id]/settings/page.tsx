'use client'
import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AlertTriangle, ArrowLeft, Palette, History,
  Target, Trash2, RotateCcw, Upload,
  CheckCircle2, Clock, XCircle, Circle, ChevronDown,
} from 'lucide-react'
import { subscribeToProject, updateProject, deleteProject, restoreDistributorsFromHistory } from '@/lib/firestore'
import { useAuth } from '@/contexts/AuthContext'
import { applyTheme } from '@/lib/theme'
import type { Project, DistributorHistoryEntry, DistributorStatus } from '@/types'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const FIELD = {
  background:   'rgba(255,255,255,0.04)',
  border:       '1px solid rgba(255,255,255,0.08)',
  borderRadius: 6,
  color:        'rgba(255,255,255,0.85)',
  fontSize:     13,
  padding:      '10px 14px',
  outline:      'none',
  width:        '100%',
  transition:   'border 150ms',
}

const DIST_STATUS_CFG: Record<DistributorStatus, { color: string; Icon: any }> = {
  integrated:  { color: '#22c55e', Icon: CheckCircle2 },
  pending:     { color: '#f59e0b', Icon: Clock        },
  blocked:     { color: '#ef4444', Icon: XCircle      },
  not_started: { color: '#ffffff30', Icon: Circle     },
}

const HISTORY_TYPE_CFG: Record<string, { label: string; color: string; icon: any }> = {
  import:          { label: 'Importação CSV',   color: '#00D4AA', icon: Upload       },
  manual_edit:     { label: 'Edição Manual',    color: '#f59e0b', icon: History      },
  weekly_snapshot: { label: 'Snapshot Semanal', color: '#8B5CF6', icon: CheckCircle2 },
}

type Tab = 'config' | 'history'

export default function SettingsPage() {
  const { id } = useParams<{ id: string }>()
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  const [project,           setProject]           = useState<Project | null>(null)
  const [loading,           setLoading]           = useState(true)
  const [saveStatus,        setSaveStatus]        = useState<'idle' | 'saving' | 'saved'>('idle')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [activeTab,         setActiveTab]         = useState<Tab>('config')
  const [restoringId,       setRestoringId]       = useState<string | null>(null)
  const [expandedEntry,     setExpandedEntry]     = useState<string | null>(null)

  const [form, setForm] = useState({
    clientName:           '',
    clientColor:          '#00D4AA',
    clientColorSecondary: '#8B5CF6',
    objective:            '',
    description:          '',
  })

  const isDirty       = useRef(false)
  const timerRef      = useRef<any>(null)
  const savedTimerRef = useRef<any>(null)   // ← controla o dismiss da mensagem "tudo salvo"

  // Wrapper — marca dirty e atualiza form
  const updateForm = (patch: Partial<typeof form>) => {
    isDirty.current = true
    setForm(prev => ({ ...prev, ...patch }))
  }

  useEffect(() => {
    if (!authLoading && !user) router.replace('/')
  }, [user, authLoading, router])

  useEffect(() => {
    if (!id) return
    const unsub = subscribeToProject(id, p => {
      if (p) {
        setProject(p)
        // Só seta o form sem marcar dirty
        setForm({
          clientName:           p.clientName           ?? '',
          clientColor:          p.clientColor          ?? '#00D4AA',
          clientColorSecondary: p.clientColorSecondary ?? '#8B5CF6',
          objective:            p.objective            ?? '',
          description:          p.description          ?? '',
        })
        applyTheme(p.clientColor, p.clientColorSecondary, p.clientColorRgb)
      }
      setLoading(false)
    })
    return unsub
  }, [id])

  const autoSave = useCallback(async (data: typeof form) => {
    if (!id || !project) return
    setSaveStatus('saving')
    isDirty.current = false   // ← evita re-trigger quando o Firestore atualiza o form
    try {
      await updateProject(id, data)
      // Cancela qualquer dismiss anterior e inicia um novo de 10s
      clearTimeout(savedTimerRef.current)
      setSaveStatus('saved')
      savedTimerRef.current = setTimeout(() => setSaveStatus('idle'), 10_000)
    } catch {
      toast.error('Erro ao salvar.')
      setSaveStatus('idle')
    }
  }, [id, project])

  useEffect(() => {
    if (!isDirty.current) return
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => autoSave(form), 1500)
    return () => clearTimeout(timerRef.current)
  }, [form])

  // Limpa o timer ao desmontar
  useEffect(() => () => clearTimeout(savedTimerRef.current), [])

  const handleDelete = async () => {
    if (!id) return
    try {
      await deleteProject(id)
      toast.success('Projeto excluído.')
      router.push('/dashboard')
    } catch {
      toast.error('Erro ao excluir.')
    }
  }

  const handleRestore = async (entryId: string) => {
    if (!id) return
    setRestoringId(entryId)
    try {
      await restoreDistributorsFromHistory(id, entryId)
      toast.success('Distribuidores restaurados!')
    } catch {
      toast.error('Erro ao restaurar.')
    } finally {
      setRestoringId(null)
    }
  }

  const accent = form.clientColor || '#00D4AA'

  if (loading) return (
    <div className="p-8 space-y-4">
      {[...Array(4)].map((_, i) => <div key={i} className="h-20 rounded-md shimmer" />)}
    </div>
  )

  if (!project) return (
    <div className="p-8 text-white/40 text-sm">Projeto não encontrado.</div>
  )

  const history = [...(project.distributorHistory ?? [])].reverse()

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="px-8 pb-12 pt-4 max-w-3xl mx-auto w-full"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="w-8 h-8 rounded-md flex items-center justify-center transition-all"
            style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.8)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.4)')}
          >
            <ArrowLeft style={{ width: 15, height: 15 }} />
          </button>
          <div>
            <h2 className="text-base font-bold text-white">Configurações</h2>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>{project.clientName}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-6 p-1 rounded-md"
           style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', width: 'fit-content' }}>
        {([
          { key: 'config',  label: 'Configurações', Icon: Palette },
          { key: 'history', label: 'Histórico',      Icon: History,
            badge: history.length > 0 ? history.length : undefined },
        ] as const).map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className="flex items-center gap-2 px-4 py-2 rounded-md text-xs font-semibold transition-all"
            style={activeTab === tab.key
              ? { background: accent, color: '#050508' }
              : { color: 'rgba(255,255,255,0.4)' }}
          >
            <tab.Icon style={{ width: 13, height: 13 }} />
            {tab.label}
            {tab.badge !== undefined && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
                    style={activeTab === tab.key
                      ? { background: 'rgba(0,0,0,0.2)', color: '#050508' }
                      : { background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)' }}>
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Tab: Config ── */}
      {activeTab === 'config' && (
        <div className="space-y-4">
          <Section icon={<Palette style={{ width: 14, height: 14 }} />} title="Identidade Visual" accent={accent}>
            <div className="space-y-4">
              <Field label="Nome do Cliente">
                <input type="text" value={form.clientName}
                  onChange={e => updateForm({ clientName: e.target.value })}
                  style={FIELD}
                  onFocus={e => (e.target.style.border = `1px solid ${accent}60`)}
                  onBlur={e  => (e.target.style.border = '1px solid rgba(255,255,255,0.08)')} />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Cor Primária">
                  <div className="flex items-center gap-3 px-3 py-2 rounded-md"
                       style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <input type="color" value={form.clientColor}
                      onChange={e => updateForm({ clientColor: e.target.value })}
                      className="w-7 h-7 rounded cursor-pointer bg-transparent border-none" />
                    <span className="text-xs font-mono" style={{ color: 'rgba(255,255,255,0.5)' }}>
                      {form.clientColor}
                    </span>
                  </div>
                </Field>
                <Field label="Cor Secundária">
                  <div className="flex items-center gap-3 px-3 py-2 rounded-md"
                       style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <input type="color" value={form.clientColorSecondary}
                      onChange={e => updateForm({ clientColorSecondary: e.target.value })}
                      className="w-7 h-7 rounded cursor-pointer bg-transparent border-none" />
                    <span className="text-xs font-mono" style={{ color: 'rgba(255,255,255,0.5)' }}>
                      {form.clientColorSecondary}
                    </span>
                  </div>
                </Field>
              </div>
              <div className="flex items-center gap-3 px-4 py-3 rounded-md"
                   style={{ background: `${accent}08`, border: `1px solid ${accent}20` }}>
                <div className="w-8 h-8 rounded-md flex items-center justify-center text-sm font-bold"
                     style={{ background: accent, color: '#050508' }}>
                  {form.clientName?.[0]?.toUpperCase() ?? '?'}
                </div>
                <div>
                  <p className="text-xs font-semibold text-white">{form.clientName || 'Nome do cliente'}</p>
                  <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>Preview do card</p>
                </div>
                <div className="ml-auto flex gap-2">
                  <div className="w-4 h-4 rounded-full" style={{ background: form.clientColor }} />
                  <div className="w-4 h-4 rounded-full" style={{ background: form.clientColorSecondary }} />
                </div>
              </div>
            </div>
          </Section>

          <Section icon={<Target style={{ width: 14, height: 14 }} />} title="Planejamento" accent={accent}>
            <div className="space-y-4">
              <Field label="Objetivo Principal">
                <input type="text" value={form.objective}
                  onChange={e => updateForm({ objective: e.target.value })}
                  placeholder="Ex: Integrar 100% dos distribuidores Tier 1"
                  style={FIELD}
                  onFocus={e => (e.target.style.border = `1px solid ${accent}60`)}
                  onBlur={e  => (e.target.style.border = '1px solid rgba(255,255,255,0.08)')} />
              </Field>
              <Field label="Descrição">
                <textarea value={form.description}
                  onChange={e => updateForm({ description: e.target.value })}
                  rows={4}
                  placeholder="Descreva o escopo e metas do projeto..."
                  style={{ ...FIELD, resize: 'none' } as React.CSSProperties}
                  onFocus={e => (e.target.style.border = `1px solid ${accent}60`)}
                  onBlur={e  => (e.target.style.border = '1px solid rgba(255,255,255,0.08)')} />
              </Field>
            </div>
          </Section>

          {/* Zona de perigo */}
          <div className="rounded-md p-5 space-y-4"
               style={{ background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.15)' }}>
            <div className="flex items-center gap-2">
              <AlertTriangle style={{ width: 14, height: 14, color: '#EF4444' }} />
              <p className="text-xs font-bold" style={{ color: '#EF4444' }}>Zona de Perigo</p>
            </div>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold text-white">Excluir projeto permanentemente</p>
                <p className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  Todos os dados, atualizações e histórico serão perdidos.
                </p>
              </div>
              {!showDeleteConfirm ? (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="px-4 py-2 rounded-md text-xs font-bold transition-all flex items-center gap-2 shrink-0"
                  style={{ border: '1px solid rgba(239,68,68,0.3)', color: '#EF4444' }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#EF4444'; e.currentTarget.style.color = '#fff' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#EF4444' }}
                >
                  <Trash2 style={{ width: 12, height: 12 }} />
                  Excluir
                </button>
              ) : (
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => setShowDeleteConfirm(false)}
                    className="px-4 py-2 rounded-md text-xs font-bold"
                    style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)' }}>
                    Cancelar
                  </button>
                  <button onClick={handleDelete}
                    className="px-4 py-2 rounded-md text-xs font-bold transition-all"
                    style={{ background: '#EF4444', color: '#fff' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#DC2626')}
                    onMouseLeave={e => (e.currentTarget.style.background = '#EF4444')}>
                    Confirmar
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Auto-save status — rodapé */}
          {/* Só monta o elemento quando saved, evitando o piscar do saving→saved→idle */}
          <AnimatePresence>
            {saveStatus === 'saved' && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                className="flex items-center justify-center gap-2 py-3 text-xs"
                style={{ color: accent }}
              >
                <span>✓</span>
                Tudo salvo, pode sair tranquilo
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* ── Tab: Histórico ── */}
      {activeTab === 'history' && (
        <div className="space-y-3">
          {history.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <History style={{ width: 28, height: 28, color: 'rgba(255,255,255,0.1)', marginBottom: 12 }} />
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.25)' }}>
                Nenhum histórico registrado ainda.
              </p>
              <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.15)' }}>
                Importações de CSV e snapshots semanais aparecerão aqui.
              </p>
            </div>
          ) : (
            history.map((entry, i) => {
              const cfg      = HISTORY_TYPE_CFG[entry.type] ?? HISTORY_TYPE_CFG.manual_edit
              const Icon     = cfg.icon
              const isExpand = expandedEntry === entry.id
              const counts   = {
                integrated: entry.distributors.filter(d => d.status === 'integrated').length,
                pending:    entry.distributors.filter(d => d.status === 'pending').length,
                blocked:    entry.distributors.filter(d => d.status === 'blocked').length,
              }

              return (
                <motion.div key={entry.id}
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="rounded-md overflow-hidden"
                  style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <div className="flex items-center gap-4 px-4 py-3">
                    <div className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0"
                         style={{ background: `${cfg.color}15` }}>
                      <Icon style={{ width: 14, height: 14, color: cfg.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-semibold text-white">{cfg.label}</p>
                        {entry.source === 'pre_restore_backup' && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full"
                                style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>
                            backup automático
                          </span>
                        )}
                        {entry.weekNumber && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full"
                                style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)' }}>
                            Semana {entry.weekNumber}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
                          {format(new Date(entry.timestamp), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </p>
                        <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.2)' }}>
                          {entry.distributors.length} distribuidores
                        </span>
                        <div className="flex items-center gap-1.5">
                          {counts.integrated > 0 && <span className="text-[9px] font-bold" style={{ color: '#22c55e' }}>{counts.integrated}✓</span>}
                          {counts.pending > 0    && <span className="text-[9px] font-bold" style={{ color: '#f59e0b' }}>{counts.pending}⏳</span>}
                          {counts.blocked > 0    && <span className="text-[9px] font-bold" style={{ color: '#ef4444' }}>{counts.blocked}⚠</span>}
                        </div>
                      </div>
                      {entry.note && (
                        <p className="text-[10px] mt-0.5 truncate" style={{ color: 'rgba(255,255,255,0.2)' }}>
                          {entry.note}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button onClick={() => setExpandedEntry(isExpand ? null : entry.id)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[10px] font-medium transition-all"
                        style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)' }}
                        onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
                        onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.4)')}>
                        <ChevronDown style={{ width: 10, height: 10, transform: isExpand ? 'rotate(180deg)' : 'none', transition: 'transform 150ms' }} />
                        Ver
                      </button>
                      <button onClick={() => handleRestore(entry.id)} disabled={restoringId === entry.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-bold transition-all disabled:opacity-50"
                        style={{ background: `${accent}15`, border: `1px solid ${accent}30`, color: accent }}
                        onMouseEnter={e => (e.currentTarget.style.background = `${accent}25`)}
                        onMouseLeave={e => (e.currentTarget.style.background = `${accent}15`)}>
                        <RotateCcw style={{ width: 10, height: 10 }} />
                        {restoringId === entry.id ? 'Restaurando...' : 'Restaurar'}
                      </button>
                    </div>
                  </div>

                  <AnimatePresence>
                    {isExpand && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
                        style={{ borderTop: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}
                      >
                        <div className="px-4 py-3 space-y-1.5 max-h-64 overflow-y-auto"
                             style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}>
                          {entry.distributors.map(d => {
                            const scfg = DIST_STATUS_CFG[d.status] ?? DIST_STATUS_CFG.not_started
                            return (
                              <div key={d.id} className="flex items-center gap-3 py-1">
                                <scfg.Icon style={{ width: 11, height: 11, color: scfg.color, flexShrink: 0 }} />
                                <span className="text-xs text-white/70 flex-1 truncate">{d.name}</span>
                                {d.connectionType && (
                                  <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.25)' }}>
                                    {d.connectionType}
                                  </span>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )
            })
          )}
        </div>
      )}
    </motion.div>
  )
}

function Section({ icon, title, accent, children }: {
  icon: React.ReactNode; title: string; accent: string; children: React.ReactNode
}) {
  return (
    <div className="rounded-md p-5 space-y-4"
         style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="flex items-center gap-2 pb-3"
           style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <span style={{ color: accent }}>{icon}</span>
        <p className="text-xs font-bold tracking-wide text-white">{title}</p>
      </div>
      {children}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] uppercase tracking-widest font-semibold"
             style={{ color: 'rgba(255,255,255,0.3)' }}>
        {label}
      </label>
      {children}
    </div>
  )
}