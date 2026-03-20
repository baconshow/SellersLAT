'use client'
import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AlertTriangle, ArrowLeft, Palette, History,
  Target, Trash2, RotateCcw, Upload,
  CheckCircle2, Clock, XCircle, Circle, ChevronDown,
  Link, Copy, Plus, X, Share2, Users,
} from 'lucide-react'
import {
  subscribeToProject, updateProject, deleteProject, restoreDistributorsFromHistory,
  generateShareToken, toggleShare, updateAuthorizedEmails,
  addProjectMember, removeProjectMember,
} from '@/lib/firestore'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { applyTheme } from '@/lib/theme'
import type { Project, DistributorStatus } from '@/types'
import ColorPickerField from '@/components/ui/ColorPickerField'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const HISTORY_TYPE_CFG: Record<string, { label: string; color: string; icon: any }> = {
  import:          { label: 'Importação CSV',   color: '#00D4AA', icon: Upload       },
  manual_edit:     { label: 'Edição Manual',    color: '#f59e0b', icon: History      },
  weekly_snapshot: { label: 'Snapshot Semanal', color: '#8B5CF6', icon: CheckCircle2 },
}

type Tab = 'config' | 'history'

export default function SettingsPage() {
  const { id } = useParams<{ id: string }>()
  const { user, loading: authLoading } = useAuth()
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const router = useRouter()

  const FIELD: React.CSSProperties = {
    background:   isDark ? 'rgba(255,255,255,0.06)' : '#EDEEF2',
    border:       `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#C8C9D0'}`,
    borderRadius: 5,
    color:        isDark ? 'rgba(255,255,255,0.85)' : '#1A1A2E',
    fontSize:     13,
    padding:      '10px 14px',
    outline:      'none',
    width:        '100%',
    transition:   'border 150ms',
  }

  const BLUR_BORDER = isDark ? 'rgba(255,255,255,0.1)' : '#C8C9D0'

  const DIST_STATUS_CFG: Record<DistributorStatus, { color: string; Icon: any }> = {
    integrated:  { color: '#22c55e', Icon: CheckCircle2 },
    pending:     { color: '#f59e0b', Icon: Clock        },
    blocked:     { color: '#ef4444', Icon: XCircle      },
    not_started: { color: isDark ? '#ffffff30' : 'rgba(0,0,0,0.15)', Icon: Circle },
  }

  const [project,           setProject]           = useState<Project | null>(null)
  const [loading,           setLoading]           = useState(true)
  const [saveStatus,        setSaveStatus]        = useState<'idle' | 'saving' | 'saved'>('idle')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [activeTab,         setActiveTab]         = useState<Tab>('config')
  const [restoringId,       setRestoringId]       = useState<string | null>(null)
  const [expandedEntry,     setExpandedEntry]     = useState<string | null>(null)
  const [newEmail,           setNewEmail]          = useState('')
  const [newMemberEmail,     setNewMemberEmail]    = useState('')
  const [shareLoading,       setShareLoading]      = useState(false)

  const [form, setForm] = useState({
    clientName:           '',
    clientColor:          '#00D4AA',
    clientColorSecondary: '#8B5CF6',
    objective:            '',
    description:          '',
  })

  const isDirty       = useRef(false)
  const timerRef      = useRef<any>(null)
  const savedTimerRef = useRef<any>(null)

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
    isDirty.current = false
    try {
      await updateProject(id, data)
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
      {[...Array(4)].map((_, i) => <div key={i} className="h-20 rounded shimmer" />)}
    </div>
  )

  if (!project) return (
    <div className="p-8 text-sm" style={{ color: isDark ? 'rgba(255,255,255,0.4)' : '#8888A0' }}>Projeto não encontrado.</div>
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
            className="w-8 h-8 rounded flex items-center justify-center transition-all"
            style={{ background: isDark ? 'rgba(255,255,255,0.05)' : '#EDEEF2', color: isDark ? 'rgba(255,255,255,0.4)' : '#8888A0' }}
            onMouseEnter={e => (e.currentTarget.style.color = isDark ? 'rgba(255,255,255,0.8)' : '#1A1A2E')}
            onMouseLeave={e => (e.currentTarget.style.color = isDark ? 'rgba(255,255,255,0.4)' : '#8888A0')}
          >
            <ArrowLeft style={{ width: 15, height: 15 }} />
          </button>
          <div>
            <h2 className="text-base font-bold" style={{ color: isDark ? '#fff' : '#1A1A2E' }}>Configurações</h2>
            <p className="text-xs" style={{ color: isDark ? 'rgba(255,255,255,0.3)' : '#8888A0' }}>{project.clientName}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-6 p-1 rounded"
           style={{ background: isDark ? 'rgba(255,255,255,0.03)' : '#E8E9ED', border: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid #C8C9D0', width: 'fit-content' }}>
        {([
          { key: 'config' as Tab,  label: 'Configurações', Icon: Palette, badge: undefined as number | undefined },
          { key: 'history' as Tab, label: 'Histórico',      Icon: History,
            badge: history.length > 0 ? history.length : undefined },
        ]).map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className="flex items-center gap-2 px-4 py-2 rounded text-xs font-semibold transition-all"
            style={activeTab === tab.key
              ? { background: accent, color: isDark ? '#050508' : '#FFFFFF' }
              : { color: isDark ? 'rgba(255,255,255,0.4)' : '#8888A0' }}
          >
            <tab.Icon style={{ width: 13, height: 13 }} />
            {tab.label}
            {tab.badge !== undefined && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
                    style={activeTab === tab.key
                      ? { background: 'rgba(0,0,0,0.2)', color: isDark ? '#050508' : '#FFFFFF' }
                      : { background: isDark ? 'rgba(255,255,255,0.08)' : '#D5D6DC', color: isDark ? 'rgba(255,255,255,0.4)' : '#8888A0' }}>
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Tab: Config ── */}
      {activeTab === 'config' && (
        <div className="space-y-4">
          <Section icon={<Palette style={{ width: 14, height: 14 }} />} title="Identidade Visual" accent={accent} isDark={isDark}>
            <div className="space-y-4">
              <Field label="Nome do Cliente" isDark={isDark}>
                <input type="text" value={form.clientName}
                  onChange={e => updateForm({ clientName: e.target.value })}
                  style={FIELD}
                  onFocus={e => (e.target.style.border = `1px solid ${accent}60`)}
                  onBlur={e  => (e.target.style.border = `1px solid ${BLUR_BORDER}`)} />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Cor Primária" isDark={isDark}>
                  <ColorPickerField
                    value={form.clientColor}
                    onChange={v => updateForm({ clientColor: v })}
                    label="Cor Primária"
                  />
                </Field>
                <Field label="Cor Secundária" isDark={isDark}>
                  <ColorPickerField
                    value={form.clientColorSecondary}
                    onChange={v => updateForm({ clientColorSecondary: v })}
                    label="Cor Secundária"
                  />
                </Field>
              </div>
              <div className="flex items-center gap-3 px-4 py-3 rounded"
                   style={{ background: `${accent}08`, border: `1px solid ${accent}20` }}>
                <div className="w-8 h-8 rounded flex items-center justify-center text-sm font-bold"
                     style={{ background: accent, color: isDark ? '#050508' : '#FFFFFF' }}>
                  {form.clientName?.[0]?.toUpperCase() ?? '?'}
                </div>
                <div>
                  <p className="text-xs font-semibold" style={{ color: isDark ? '#fff' : '#1A1A2E' }}>{form.clientName || 'Nome do cliente'}</p>
                  <p className="text-[10px]" style={{ color: isDark ? 'rgba(255,255,255,0.3)' : '#8888A0' }}>Preview do card</p>
                </div>
                <div className="ml-auto flex gap-2">
                  <div className="w-4 h-4 rounded-full" style={{ background: form.clientColor }} />
                  <div className="w-4 h-4 rounded-full" style={{ background: form.clientColorSecondary }} />
                </div>
              </div>
            </div>
          </Section>

          <Section icon={<Target style={{ width: 14, height: 14 }} />} title="Planejamento" accent={accent} isDark={isDark}>
            <div className="space-y-4">
              <Field label="Objetivo Principal" isDark={isDark}>
                <input type="text" value={form.objective}
                  onChange={e => updateForm({ objective: e.target.value })}
                  placeholder="Ex: Integrar 100% dos distribuidores Tier 1"
                  style={FIELD}
                  onFocus={e => (e.target.style.border = `1px solid ${accent}60`)}
                  onBlur={e  => (e.target.style.border = `1px solid ${BLUR_BORDER}`)} />
              </Field>
              <Field label="Descrição" isDark={isDark}>
                <textarea value={form.description}
                  onChange={e => updateForm({ description: e.target.value })}
                  rows={4}
                  placeholder="Descreva o escopo e metas do projeto..."
                  style={{ ...FIELD, resize: 'none' } as React.CSSProperties}
                  onFocus={e => (e.target.style.border = `1px solid ${accent}60`)}
                  onBlur={e  => (e.target.style.border = `1px solid ${BLUR_BORDER}`)} />
              </Field>
            </div>
          </Section>

          {/* Compartilhamento */}
          <Section icon={<Share2 style={{ width: 14, height: 14 }} />} title="Compartilhamento" accent={accent} isDark={isDark}>
            <div className="space-y-4">
              {!project.shareToken ? (
                <button
                  onClick={async () => {
                    setShareLoading(true)
                    try {
                      await generateShareToken(id)
                      toast.success('Link gerado!')
                    } catch { toast.error('Erro ao gerar link.') }
                    finally { setShareLoading(false) }
                  }}
                  disabled={shareLoading}
                  className="flex items-center gap-2 px-4 py-2.5 rounded text-xs font-bold transition-all disabled:opacity-50"
                  style={{ background: `${accent}15`, border: `1px solid ${accent}30`, color: accent }}
                  onMouseEnter={e => (e.currentTarget.style.background = `${accent}25`)}
                  onMouseLeave={e => (e.currentTarget.style.background = `${accent}15`)}
                >
                  <Link style={{ width: 13, height: 13 }} />
                  {shareLoading ? 'Gerando...' : 'Gerar link de compartilhamento'}
                </button>
              ) : (
                <>
                  {/* Toggle ativo/inativo */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold" style={{ color: isDark ? '#fff' : '#1A1A2E' }}>Link {project.shareEnabled ? 'ativo' : 'inativo'}</p>
                      <p className="text-[10px] mt-0.5" style={{ color: isDark ? 'rgba(255,255,255,0.3)' : '#8888A0' }}>
                        {project.shareEnabled ? 'Gestores autorizados podem acessar.' : 'O link está desativado.'}
                      </p>
                    </div>
                    <button
                      onClick={async () => {
                        try {
                          await toggleShare(id, !project.shareEnabled)
                          toast.success(project.shareEnabled ? 'Link desativado.' : 'Link ativado.')
                        } catch { toast.error('Erro ao alterar.') }
                      }}
                      className="relative w-10 h-5 rounded-full transition-all"
                      style={{ background: project.shareEnabled ? accent : (isDark ? 'rgba(255,255,255,0.1)' : '#C8C9D0') }}
                    >
                      <div
                        className="absolute top-0.5 w-4 h-4 rounded-full transition-all"
                        style={{
                          background: '#fff',
                          left: project.shareEnabled ? 22 : 2,
                        }}
                      />
                    </button>
                  </div>

                  {/* URL copiável */}
                  {project.shareEnabled && (
                    <div className="flex items-center gap-2">
                      <div
                        className="flex-1 px-3 py-2.5 rounded text-xs font-mono truncate"
                        style={{ background: isDark ? 'rgba(255,255,255,0.04)' : '#EDEEF2', border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#C8C9D0'}`, color: isDark ? 'rgba(255,255,255,0.6)' : '#4A4A68' }}
                      >
                        sellers.lat/{project.slug ?? id}
                      </div>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(`https://sellers.lat/${project.slug ?? id}`)
                          toast.success('Link copiado!')
                        }}
                        className="flex items-center gap-1.5 px-3 py-2.5 rounded text-xs font-bold transition-all shrink-0"
                        style={{ background: `${accent}15`, border: `1px solid ${accent}30`, color: accent }}
                        onMouseEnter={e => (e.currentTarget.style.background = `${accent}25`)}
                        onMouseLeave={e => (e.currentTarget.style.background = `${accent}15`)}
                      >
                        <Copy style={{ width: 12, height: 12 }} />
                        Copiar
                      </button>
                    </div>
                  )}
                </>
              )}

              {/* Emails autorizados */}
              <div className="space-y-2">
                <p className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: isDark ? 'rgba(255,255,255,0.35)' : '#8888A0' }}>
                  Emails autorizados
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="email"
                    value={newEmail}
                    onChange={e => setNewEmail(e.target.value)}
                    placeholder="gestor@empresa.com.br"
                    style={FIELD}
                    onKeyDown={async e => {
                      if (e.key === 'Enter' && newEmail.trim()) {
                        e.preventDefault()
                        const emails = [...(project.authorizedEmails || []), newEmail.trim().toLowerCase()]
                        try {
                          await updateAuthorizedEmails(id, emails)
                          setNewEmail('')
                          toast.success('Email adicionado.')
                        } catch { toast.error('Erro ao adicionar email.') }
                      }
                    }}
                    onFocus={e => (e.target.style.border = `1px solid ${accent}60`)}
                    onBlur={e => (e.target.style.border = `1px solid ${BLUR_BORDER}`)}
                  />
                  <button
                    onClick={async () => {
                      if (!newEmail.trim()) return
                      const emails = [...(project.authorizedEmails || []), newEmail.trim().toLowerCase()]
                      try {
                        await updateAuthorizedEmails(id, emails)
                        setNewEmail('')
                        toast.success('Email adicionado.')
                      } catch { toast.error('Erro ao adicionar email.') }
                    }}
                    className="flex items-center justify-center w-10 h-10 rounded shrink-0 transition-all"
                    style={{ background: `${accent}15`, border: `1px solid ${accent}30`, color: accent }}
                    onMouseEnter={e => (e.currentTarget.style.background = `${accent}25`)}
                    onMouseLeave={e => (e.currentTarget.style.background = `${accent}15`)}
                  >
                    <Plus style={{ width: 14, height: 14 }} />
                  </button>
                </div>
                <p className="text-[10px]" style={{ color: isDark ? 'rgba(255,255,255,0.2)' : '#B8B9C4' }}>
                  Apenas esses emails têm acesso ao link compartilhado.
                </p>

                {(project.authorizedEmails || []).length > 0 && (
                  <div className="space-y-1 mt-2">
                    {project.authorizedEmails!.map((email, i) => (
                      <div key={email} className="flex items-center justify-between px-3 py-2 rounded"
                           style={{ background: isDark ? 'rgba(255,255,255,0.03)' : '#F4F5F7', border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : '#E8E9ED'}` }}>
                        <span className="text-xs font-mono" style={{ color: isDark ? 'rgba(255,255,255,0.6)' : '#4A4A68' }}>{email}</span>
                        <button
                          onClick={async () => {
                            const emails = project.authorizedEmails!.filter((_, idx) => idx !== i)
                            try {
                              await updateAuthorizedEmails(id, emails)
                              toast.success('Email removido.')
                            } catch { toast.error('Erro ao remover email.') }
                          }}
                          style={{ color: isDark ? 'rgba(255,255,255,0.3)' : '#B8B9C4' }}
                          className="hover:text-red-400 transition-colors"
                        >
                          <X style={{ width: 13, height: 13 }} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Section>

          {/* Gestores do Projeto */}
          <Section icon={<Users style={{ width: 14, height: 14 }} />} title="Gestores do Projeto" accent={accent} isDark={isDark}>
            <div className="space-y-3">
              <p className="text-[10px]" style={{ color: isDark ? 'rgba(255,255,255,0.3)' : '#8888A0' }}>
                Todos os gestores podem editar este projeto.
              </p>

              {(project.members ?? []).length > 0 && (
                <div className="space-y-1">
                  {project.members!.map(email => {
                    const isOwner = user?.email === email && project.ownerId === user?.uid
                    return (
                      <div key={email} className="flex items-center justify-between px-3 py-2 rounded"
                           style={{ background: isDark ? 'rgba(255,255,255,0.03)' : '#F4F5F7', border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : '#E8E9ED'}` }}>
                        <div className="flex items-center gap-2">
                          <span className="text-xs" style={{ color: isDark ? 'rgba(255,255,255,0.3)' : '#8888A0' }}>✉</span>
                          <span className="text-xs font-mono" style={{ color: isDark ? 'rgba(255,255,255,0.6)' : '#4A4A68' }}>{email}</span>
                        </div>
                        {isOwner ? (
                          <span className="text-[9px] px-2 py-0.5 rounded-full font-bold"
                                style={{ background: `${accent}20`, color: accent }}>
                            owner
                          </span>
                        ) : (
                          <button
                            onClick={async () => {
                              try {
                                await removeProjectMember(id, email)
                                toast.success('Gestor removido.')
                              } catch { toast.error('Erro ao remover gestor.') }
                            }}
                            style={{ color: isDark ? 'rgba(255,255,255,0.3)' : '#B8B9C4' }}
                            className="hover:text-red-400 transition-colors"
                          >
                            <X style={{ width: 13, height: 13 }} />
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              <div className="flex items-center gap-2">
                <input
                  type="email"
                  value={newMemberEmail}
                  onChange={e => setNewMemberEmail(e.target.value)}
                  placeholder="email do novo gestor..."
                  style={FIELD}
                  onKeyDown={async e => {
                    if (e.key === 'Enter' && newMemberEmail.trim()) {
                      e.preventDefault()
                      const email = newMemberEmail.trim().toLowerCase()
                      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                        toast.error('Email inválido.'); return
                      }
                      if (project.members?.includes(email)) {
                        toast.error('Já é gestor deste projeto.'); return
                      }
                      try {
                        await addProjectMember(id, email)
                        setNewMemberEmail('')
                        toast.success('Gestor adicionado.')
                      } catch { toast.error('Erro ao convidar gestor.') }
                    }
                  }}
                  onFocus={e => (e.target.style.border = `1px solid ${accent}60`)}
                  onBlur={e => (e.target.style.border = `1px solid ${BLUR_BORDER}`)}
                />
                <button
                  onClick={async () => {
                    if (!newMemberEmail.trim()) return
                    const email = newMemberEmail.trim().toLowerCase()
                    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                      toast.error('Email inválido.'); return
                    }
                    if (project.members?.includes(email)) {
                      toast.error('Já é gestor deste projeto.'); return
                    }
                    try {
                      await addProjectMember(id, email)
                      setNewMemberEmail('')
                      toast.success('Gestor adicionado.')
                    } catch { toast.error('Erro ao convidar gestor.') }
                  }}
                  className="flex items-center justify-center w-10 h-10 rounded shrink-0 transition-all"
                  style={{ background: `${accent}15`, border: `1px solid ${accent}30`, color: accent }}
                  onMouseEnter={e => (e.currentTarget.style.background = `${accent}25`)}
                  onMouseLeave={e => (e.currentTarget.style.background = `${accent}15`)}
                >
                  <Plus style={{ width: 14, height: 14 }} />
                </button>
              </div>
            </div>
          </Section>

          {/* Zona de perigo */}
          <div className="rounded p-5 space-y-4"
               style={{ background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.15)' }}>
            <div className="flex items-center gap-2">
              <AlertTriangle style={{ width: 14, height: 14, color: '#EF4444' }} />
              <p className="text-xs font-bold" style={{ color: '#EF4444' }}>Zona de Perigo</p>
            </div>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold" style={{ color: isDark ? '#fff' : '#1A1A2E' }}>Excluir projeto permanentemente</p>
                <p className="text-[11px] mt-0.5" style={{ color: isDark ? 'rgba(255,255,255,0.3)' : '#8888A0' }}>
                  Todos os dados, atualizações e histórico serão perdidos.
                </p>
              </div>
              {!showDeleteConfirm ? (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="px-4 py-2 rounded text-xs font-bold transition-all flex items-center gap-2 shrink-0"
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
                    className="px-4 py-2 rounded text-xs font-bold"
                    style={{ background: isDark ? 'rgba(255,255,255,0.05)' : '#EDEEF2', color: isDark ? 'rgba(255,255,255,0.5)' : '#4A4A68' }}>
                    Cancelar
                  </button>
                  <button onClick={handleDelete}
                    className="px-4 py-2 rounded text-xs font-bold transition-all"
                    style={{ background: '#EF4444', color: '#fff' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#DC2626')}
                    onMouseLeave={e => (e.currentTarget.style.background = '#EF4444')}>
                    Confirmar
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Auto-save status */}
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
              <History style={{ width: 28, height: 28, color: isDark ? 'rgba(255,255,255,0.1)' : '#C8C9D0', marginBottom: 12 }} />
              <p className="text-sm" style={{ color: isDark ? 'rgba(255,255,255,0.25)' : '#8888A0' }}>
                Nenhum histórico registrado ainda.
              </p>
              <p className="text-xs mt-1" style={{ color: isDark ? 'rgba(255,255,255,0.15)' : '#B8B9C4' }}>
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
                  className="rounded overflow-hidden"
                  style={{ background: isDark ? 'rgba(255,255,255,0.02)' : '#F4F5F7', border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : '#E8E9ED'}` }}
                >
                  <div className="flex items-center gap-4 px-4 py-3">
                    <div className="w-8 h-8 rounded flex items-center justify-center flex-shrink-0"
                         style={{ background: `${cfg.color}15` }}>
                      <Icon style={{ width: 14, height: 14, color: cfg.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-semibold" style={{ color: isDark ? '#fff' : '#1A1A2E' }}>{cfg.label}</p>
                        {entry.source === 'pre_restore_backup' && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full"
                                style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>
                            backup automático
                          </span>
                        )}
                        {entry.weekNumber && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full"
                                style={{ background: isDark ? 'rgba(255,255,255,0.06)' : '#E8E9ED', color: isDark ? 'rgba(255,255,255,0.4)' : '#8888A0' }}>
                            Semana {entry.weekNumber}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <p className="text-[10px]" style={{ color: isDark ? 'rgba(255,255,255,0.3)' : '#8888A0' }}>
                          {format(new Date(entry.timestamp), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </p>
                        <span className="text-[10px]" style={{ color: isDark ? 'rgba(255,255,255,0.2)' : '#B8B9C4' }}>
                          {entry.distributors.length} distribuidores
                        </span>
                        <div className="flex items-center gap-1.5">
                          {counts.integrated > 0 && <span className="text-[9px] font-bold" style={{ color: '#22c55e' }}>{counts.integrated}✓</span>}
                          {counts.pending > 0    && <span className="text-[9px] font-bold" style={{ color: '#f59e0b' }}>{counts.pending}⏳</span>}
                          {counts.blocked > 0    && <span className="text-[9px] font-bold" style={{ color: '#ef4444' }}>{counts.blocked}⚠</span>}
                        </div>
                      </div>
                      {entry.note && (
                        <p className="text-[10px] mt-0.5 truncate" style={{ color: isDark ? 'rgba(255,255,255,0.2)' : '#B8B9C4' }}>
                          {entry.note}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button onClick={() => setExpandedEntry(isExpand ? null : entry.id)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded text-[10px] font-medium transition-all"
                        style={{ background: isDark ? 'rgba(255,255,255,0.05)' : '#E8E9ED', color: isDark ? 'rgba(255,255,255,0.4)' : '#8888A0' }}
                        onMouseEnter={e => (e.currentTarget.style.color = isDark ? '#fff' : '#1A1A2E')}
                        onMouseLeave={e => (e.currentTarget.style.color = isDark ? 'rgba(255,255,255,0.4)' : '#8888A0')}>
                        <ChevronDown style={{ width: 10, height: 10, transform: isExpand ? 'rotate(180deg)' : 'none', transition: 'transform 150ms' }} />
                        Ver
                      </button>
                      <button onClick={() => handleRestore(entry.id)} disabled={restoringId === entry.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[10px] font-bold transition-all disabled:opacity-50"
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
                        style={{ borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : '#E8E9ED'}`, overflow: 'hidden' }}
                      >
                        <div className="px-4 py-3 space-y-1.5 max-h-64 overflow-y-auto"
                             style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}>
                          {entry.distributors.map(d => {
                            const scfg = DIST_STATUS_CFG[d.status] ?? DIST_STATUS_CFG.not_started
                            return (
                              <div key={d.id} className="flex items-center gap-3 py-1">
                                <scfg.Icon style={{ width: 11, height: 11, color: scfg.color, flexShrink: 0 }} />
                                <span className="text-xs flex-1 truncate" style={{ color: isDark ? 'rgba(255,255,255,0.7)' : '#4A4A68' }}>{d.name}</span>
                                {d.connectionType && (
                                  <span className="text-[10px]" style={{ color: isDark ? 'rgba(255,255,255,0.25)' : '#B8B9C4' }}>
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

function Section({ icon, title, accent, isDark, children }: {
  icon: React.ReactNode; title: string; accent: string; isDark: boolean; children: React.ReactNode
}) {
  return (
    <div className="rounded p-5 space-y-4"
         style={{ background: isDark ? 'rgba(255,255,255,0.02)' : '#F4F5F7', border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : '#E8E9ED'}` }}>
      <div className="flex items-center gap-2 pb-3"
           style={{ borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : '#E8E9ED'}` }}>
        <span style={{ color: accent }}>{icon}</span>
        <p className="text-xs font-bold tracking-wide" style={{ color: isDark ? '#fff' : '#1A1A2E' }}>{title}</p>
      </div>
      {children}
    </div>
  )
}

function Field({ label, isDark, children }: { label: string; isDark: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] uppercase tracking-widest font-semibold"
             style={{ color: isDark ? 'rgba(255,255,255,0.35)' : '#8888A0' }}>
        {label}
      </label>
      {children}
    </div>
  )
}
