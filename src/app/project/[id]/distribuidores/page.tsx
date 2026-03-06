'use client'
import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Search, CheckCircle2, Clock, XCircle, Circle,
  Pencil, Trash2, X, Wifi, HardDrive, Globe, FileText, Upload, AlertTriangle,
} from 'lucide-react'
import { subscribeToProject, addDistributor, updateDistributor, deleteDistributor, addDistributorHistory } from '@/lib/firestore'
import { useAuth } from '@/contexts/AuthContext'
import type { Project, Distributor, DistributorStatus } from '@/types'

// ─── Config ───────────────────────────────────────────────────────────────────

const STATUS_CFG: Record<DistributorStatus, { label: string; color: string; bg: string; Icon: any }> = {
  integrated:  { label: 'Integrado',    color: '#22c55e',   bg: 'rgba(34,197,94,0.1)',    Icon: CheckCircle2 },
  pending:     { label: 'Pendente',     color: '#f59e0b',   bg: 'rgba(245,158,11,0.1)',   Icon: Clock        },
  blocked:     { label: 'Bloqueado',    color: '#ef4444',   bg: 'rgba(239,68,68,0.1)',    Icon: XCircle      },
  not_started: { label: 'Não iniciado', color: '#ffffff40', bg: 'rgba(255,255,255,0.05)', Icon: Circle       },
}

const CONNECTION_TYPES = ['Ello', 'FTP', 'API', 'Manual', 'Outro']
const CONNECTION_ICONS: Record<string, any> = {
  Ello: Wifi, FTP: HardDrive, API: Globe, Manual: FileText, Outro: FileText,
}

// ─── CSV Parser ───────────────────────────────────────────────────────────────

function parseClickupStatus(s: string): DistributorStatus {
  const v = s.toLowerCase().trim()
  if (['concluido','fechado','validação - interna','validacao - interna'].includes(v)) return 'integrated'
  if (['bloqueado','pendência externa','pendencia externa'].includes(v)) return 'blocked'
  if (v === 'pendente') return 'pending'
  return 'not_started'
}

function parseConnectionType(s: string): string {
  if (!s) return ''
  if (s.toLowerCase().includes('ello')) return 'Ello'
  if (s.toLowerCase().includes('ftp'))  return 'FTP'
  if (s.toLowerCase().includes('api'))  return 'API'
  return 'Manual'
}

function cleanName(taskName: string): string {
  // Remove "N. " prefix e " [Cliente]" suffix
  return taskName
    .replace(/^\d+\.\s*/, '')
    .replace(/\s*\[.*?\]\s*$/, '')
    .trim()
}

function parseCSV(text: string): Omit<Distributor, 'id'>[] {
  const lines = text.split('\n').filter(Boolean)
  if (lines.length < 2) return []

  const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim())
  const idx = (name: string) => headers.findIndex(h => h.toLowerCase().includes(name.toLowerCase()))

  const iName       = idx('Task Name')
  const iAssignee   = idx('Assignee')
  const iComment    = idx('Latest Comment')
  const iStatus     = idx('Status')
  const iMode       = idx('Modo de Integração')
  const iPhase      = idx('Fase de Integração')

  return lines.slice(1).map(line => {
    // Parse respeitando campos com vírgulas dentro de aspas
    const cols: string[] = []
    let cur = '', inQuote = false
    for (const ch of line) {
      if (ch === '"') { inQuote = !inQuote }
      else if (ch === ',' && !inQuote) { cols.push(cur.trim()); cur = '' }
      else cur += ch
    }
    cols.push(cur.trim())

    const get = (i: number) => (cols[i] ?? '').replace(/^"|"$/g, '').trim()

    const name = cleanName(get(iName))
    if (!name) return null

    const assigneeRaw = get(iAssignee).replace(/^\[|\]$/g, '')
    const status      = parseClickupStatus(get(iStatus))
    const connType    = parseConnectionType(get(iMode))
    const notes       = get(iPhase) ? `Fase: ${get(iPhase)}` : ''
    const comment     = get(iComment)
    const blockerDesc = status === 'blocked' ? comment : ''

    return {
      name,
      status,
      connectionType: connType,
      responsible:    assigneeRaw,
      notes,
      blockerDescription: blockerDesc,
      solution: '',
    } as Omit<Distributor, 'id'>
  }).filter(Boolean) as Omit<Distributor, 'id'>[]
}

// ─── Import Modal ─────────────────────────────────────────────────────────────

function ImportModal({
  projectId,
  onClose,
}: {
  projectId: string
  onClose: () => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [preview,   setPreview]   = useState<Omit<Distributor, 'id'>[]>([])
  const [importing, setImporting] = useState(false)
  const [done,      setDone]      = useState(false)
  const [error,     setError]     = useState('')

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError('')
    const reader = new FileReader()
    reader.onload = ev => {
      const text = ev.target?.result as string
      const parsed = parseCSV(text)
      if (!parsed.length) { setError('Nenhum distribuidor encontrado no CSV.'); return }
      setPreview(parsed)
    }
    reader.readAsText(file, 'utf-8')
  }
  const handleImport = async () => {
    setImporting(true)
    try {
      for (const d of preview) {
        await addDistributor(projectId, d)
      }
      await addDistributorHistory(projectId, {
        type:         'import',
        source:       'clickup_csv',
        distributors: preview.map(d => ({ ...d, id: Math.random().toString(36).substring(2) })),
        note:         `Importação de ${preview.length} distribuidores via CSV`,
      })
      setDone(true)
      setTimeout(onClose, 1200)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setImporting(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.96, y: 16 }} animate={{ scale: 1, y: 0 }}
        className="w-full max-w-2xl rounded-md overflow-hidden"
        style={{ background: '#0e0e16', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4"
             style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div>
            <p className="text-sm font-bold text-white">Importar CSV do ClickUp</p>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>
              Campos mapeados: Nome, Status, Responsável, Modo de Integração, Fase
            </p>
          </div>
          <button onClick={onClose} style={{ color: 'rgba(255,255,255,0.3)' }}>
            <X style={{ width: 15, height: 15 }} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Upload zone */}
          {!preview.length && (
            <div
              onClick={() => fileRef.current?.click()}
              className="flex flex-col items-center justify-center py-10 rounded-md cursor-pointer transition-all"
              style={{ border: '2px dashed rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.02)' }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
            >
              <Upload style={{ width: 24, height: 24, color: 'rgba(255,255,255,0.2)', marginBottom: 10 }} />
              <p className="text-sm text-white/50">Clique para selecionar o CSV</p>
              <p className="text-xs text-white/25 mt-1">Exportado do ClickUp — lista de distribuidores</p>
              <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFile} />
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-md"
                 style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <AlertTriangle style={{ width: 13, height: 13, color: '#ef4444' }} />
              <p className="text-xs" style={{ color: '#ef4444' }}>{error}</p>
            </div>
          )}

          {/* Preview */}
          {preview.length > 0 && (
            <>
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-white">
                  {preview.length} distribuidores encontrados
                </p>
                <button
                  onClick={() => { setPreview([]); setError('') }}
                  className="text-xs"
                  style={{ color: 'rgba(255,255,255,0.3)' }}
                >
                  Trocar arquivo
                </button>
              </div>

              {/* Summary badges */}
              <div className="flex gap-2 flex-wrap">
                {(['integrated','pending','blocked','not_started'] as DistributorStatus[]).map(s => {
                  const count = preview.filter(d => d.status === s).length
                  if (!count) return null
                  const cfg = STATUS_CFG[s]
                  return (
                    <span key={s} className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md font-medium"
                          style={{ background: cfg.bg, color: cfg.color }}>
                      <cfg.Icon style={{ width: 11, height: 11 }} />
                      {count} {cfg.label}
                    </span>
                  )
                })}
              </div>

              {/* Table */}
              <div className="rounded-md overflow-hidden max-h-60 overflow-y-auto"
                   style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      <th className="text-left px-3 py-2 font-semibold text-white/40">Nome</th>
                      <th className="text-left px-3 py-2 font-semibold text-white/40">Status</th>
                      <th className="text-left px-3 py-2 font-semibold text-white/40">Conexão</th>
                      <th className="text-left px-3 py-2 font-semibold text-white/40">Responsável</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((d, i) => {
                      const cfg = STATUS_CFG[d.status]
                      return (
                        <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                          <td className="px-3 py-2 text-white/80">{d.name}</td>
                          <td className="px-3 py-2">
                            <span className="flex items-center gap-1" style={{ color: cfg.color }}>
                              <cfg.Icon style={{ width: 10, height: 10 }} />
                              {cfg.label}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-white/40">{d.connectionType || '—'}</td>
                          <td className="px-3 py-2 text-white/40">{d.responsible || '—'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* Actions */}
          {preview.length > 0 && (
            <div className="flex justify-end gap-2 pt-1">
              <button onClick={onClose} className="px-4 py-2 rounded-md text-xs"
                      style={{ color: 'rgba(255,255,255,0.35)' }}>
                Cancelar
              </button>
              <button
                onClick={handleImport}
                disabled={importing || done}
                className="flex items-center gap-2 px-5 py-2 rounded-md text-xs font-semibold transition-all disabled:opacity-60"
                style={{ background: 'var(--color-brand)', color: '#050508' }}
              >
                {done ? '✓ Importado!' : importing ? 'Importando...' : `Importar ${preview.length} distribuidores`}
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── Distributor Modal ────────────────────────────────────────────────────────

function DistributorModal({
  projectId, distributor, onClose,
}: {
  projectId: string
  distributor?: Distributor
  onClose: () => void
}) {
  const isEdit = !!distributor
  const [form, setForm] = useState<Omit<Distributor, 'id'>>({
    name:               distributor?.name               ?? '',
    status:             distributor?.status             ?? 'not_started',
    connectionType:     distributor?.connectionType     ?? '',
    responsible:        distributor?.responsible        ?? '',
    notes:              distributor?.notes              ?? '',
    blockerDescription: distributor?.blockerDescription ?? '',
    solution:           distributor?.solution           ?? '',
  })
  const [saving, setSaving] = useState(false)
  const set = (k: keyof typeof form, v: any) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      if (isEdit && distributor) await updateDistributor(projectId, distributor.id, form)
      else await addDistributor(projectId, form)
      onClose()
    } catch (e) { console.error(e) }
    finally { setSaving(false) }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }}
        className="w-full max-w-lg rounded-md p-6 space-y-5"
        style={{ background: '#0e0e16', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white">
            {isEdit ? 'Editar Distribuidor' : 'Novo Distribuidor'}
          </h2>
          <button onClick={onClose} style={{ color: 'rgba(255,255,255,0.3)' }}>
            <X style={{ width: 14, height: 14 }} />
          </button>
        </div>

        <Field label="Nome *">
          <input
            value={form.name}
            onChange={e => set('name', e.target.value)}
            placeholder="Ex: Distribuidora Sul Minas"
            className="w-full px-3 py-2.5 rounded-md text-sm text-white placeholder-white/20 outline-none"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Status">
            <div className="grid grid-cols-2 gap-1.5">
              {(Object.keys(STATUS_CFG) as DistributorStatus[]).map(s => {
                const cfg = STATUS_CFG[s]
                const active = form.status === s
                return (
                  <button key={s} onClick={() => set('status', s)}
                    className="flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium transition-all"
                    style={active
                      ? { background: cfg.bg, border: `1px solid ${cfg.color}40`, color: cfg.color }
                      : { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.35)' }}>
                    <cfg.Icon style={{ width: 11, height: 11 }} />{cfg.label}
                  </button>
                )
              })}
            </div>
          </Field>

          <Field label="Tipo de Conexão">
            <div className="grid grid-cols-2 gap-1.5">
              {CONNECTION_TYPES.map(ct => {
                const Icon = CONNECTION_ICONS[ct]
                const active = form.connectionType === ct
                return (
                  <button key={ct} onClick={() => set('connectionType', ct)}
                    className="flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium transition-all"
                    style={active
                      ? { background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff' }
                      : { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.35)' }}>
                    <Icon style={{ width: 11, height: 11 }} />{ct}
                  </button>
                )
              })}
            </div>
          </Field>
        </div>

        <Field label="Responsável">
          <input
            value={form.responsible ?? ''}
            onChange={e => set('responsible', e.target.value)}
            placeholder="Nome do contato"
            className="w-full px-3 py-2.5 rounded-md text-sm text-white placeholder-white/20 outline-none"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
          />
        </Field>

        <Field label="Observações">
          <textarea
            value={form.notes ?? ''}
            onChange={e => set('notes', e.target.value)}
            rows={2}
            placeholder="Status atual, observações gerais..."
            className="w-full px-3 py-2.5 rounded-md text-sm text-white placeholder-white/20 outline-none resize-none"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
          />
        </Field>

        {(form.status === 'blocked' || form.blockerDescription) && (
          <Field label="Descrição do Bloqueio">
            <textarea
              value={form.blockerDescription ?? ''}
              onChange={e => set('blockerDescription', e.target.value)}
              rows={2}
              placeholder="O que está impedindo a integração?"
              className="w-full px-3 py-2.5 rounded-md text-sm text-white placeholder-white/20 outline-none resize-none"
              style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)' }}
            />
          </Field>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="px-4 py-2 rounded-md text-xs"
                  style={{ color: 'rgba(255,255,255,0.35)' }}>
            Cancelar
          </button>
          <button onClick={handleSave} disabled={saving || !form.name.trim()}
            className="px-5 py-2 rounded-md text-xs font-semibold transition-all disabled:opacity-40"
            style={{ background: 'var(--color-brand)', color: '#050508' }}>
            {saving ? 'Salvando...' : isEdit ? 'Salvar' : 'Adicionar'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── Distributor Row ──────────────────────────────────────────────────────────

function DistributorRow({
  distributor, projectId, onEdit,
}: {
  distributor: Distributor
  projectId: string
  onEdit: (d: Distributor) => void
}) {
  const cfg      = STATUS_CFG[distributor.status]
  const ConnIcon = distributor.connectionType ? (CONNECTION_ICONS[distributor.connectionType] ?? FileText) : null
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    if (!confirm(`Remover "${distributor.name}"?`)) return
    setDeleting(true)
    await deleteDistributor(projectId, distributor.id)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: deleting ? 0 : 1, y: 0 }}
      className="flex items-center gap-4 px-4 py-3 rounded-md group"
      style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}
    >
      {/* Status dot + icon */}
      <div className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0"
           style={{ background: cfg.bg }}>
        <cfg.Icon style={{ width: 14, height: 14, color: cfg.color }} />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">{distributor.name}</p>
        <div className="flex items-center gap-3 mt-0.5">
          {distributor.connectionType && ConnIcon && (
            <span className="text-[10px] flex items-center gap-1" style={{ color: 'rgba(255,255,255,0.3)' }}>
              <ConnIcon style={{ width: 10, height: 10 }} />
              {distributor.connectionType}
            </span>
          )}
          {distributor.responsible && (
            <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.25)' }}>
              {distributor.responsible}
            </span>
          )}
          {distributor.notes && (
            <span className="text-[10px] truncate" style={{ color: 'rgba(255,255,255,0.2)' }}>
              {distributor.notes}
            </span>
          )}
        </div>
        {distributor.status === 'blocked' && distributor.blockerDescription && (
          <p className="text-[10px] mt-0.5 truncate" style={{ color: '#ef444470' }}>
            ⚠ {distributor.blockerDescription}
          </p>
        )}
      </div>

      {/* Status inline (texto, sem cápsula) */}
      <span className="text-xs font-medium flex-shrink-0 flex items-center gap-1.5"
            style={{ color: cfg.color }}>
        <cfg.Icon style={{ width: 11, height: 11 }} />
        {cfg.label}
      </span>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        <button onClick={() => onEdit(distributor)}
          className="w-7 h-7 rounded-md flex items-center justify-center transition-colors"
          style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.3)' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.7)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.3)')}>
          <Pencil style={{ width: 11, height: 11 }} />
        </button>
        <button onClick={handleDelete}
          className="w-7 h-7 rounded-md flex items-center justify-center transition-colors"
          style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.3)' }}
          onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.3)')}>
          <Trash2 style={{ width: 11, height: 11 }} />
        </button>
      </div>
    </motion.div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DistribuidoresPage() {
  const { id } = useParams<{ id: string }>()
  const { user, loading } = useAuth()
  const router = useRouter()

  const [project,     setProject]     = useState<Project | null>(null)
  const [search,      setSearch]      = useState('')
  const [filterStatus, setFilterStatus] = useState<DistributorStatus | 'all'>('all')
  const [modalOpen,   setModalOpen]   = useState(false)
  const [importOpen,  setImportOpen]  = useState(false)
  const [editTarget,  setEditTarget]  = useState<Distributor | undefined>()

  useEffect(() => {
    if (!loading && !user) router.replace('/')
  }, [user, loading, router])

  useEffect(() => {
    if (!id) return
    return subscribeToProject(id, setProject)
  }, [id])

  if (!project) return null

  const distributors = project.distributors ?? []
  const filtered = distributors.filter(d => {
    const matchSearch = d.name.toLowerCase().includes(search.toLowerCase())
    const matchStatus = filterStatus === 'all' || d.status === filterStatus
    return matchSearch && matchStatus
  })

  const counts = {
    all:         distributors.length,
    integrated:  distributors.filter(d => d.status === 'integrated').length,
    pending:     distributors.filter(d => d.status === 'pending').length,
    blocked:     distributors.filter(d => d.status === 'blocked').length,
    not_started: distributors.filter(d => d.status === 'not_started').length,
  }

  const handleEdit = (d: Distributor) => { setEditTarget(d); setModalOpen(true) }
  const handleClose = () => { setModalOpen(false); setEditTarget(undefined) }

  return (
    <div className="flex-1 px-8 pt-4 pb-12">

      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-white">Distribuidores</h2>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>
            {distributors.length} cadastrados
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setImportOpen(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-md text-xs font-medium transition-all"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border:     '1px solid rgba(255,255,255,0.08)',
              color:      'rgba(255,255,255,0.5)',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.5)')}
          >
            <Upload style={{ width: 12, height: 12 }} />
            Importar CSV
          </button>
          <button
            onClick={() => { setEditTarget(undefined); setModalOpen(true) }}
            className="flex items-center gap-2 px-3 py-2 rounded-md text-xs font-semibold transition-all"
            style={{ background: 'var(--color-brand)', color: '#050508' }}
          >
            <Plus style={{ width: 12, height: 12 }} />
            Novo
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-5">
        <div className="relative flex-1 max-w-xs">
          <Search style={{ width: 13, height: 13, position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.2)' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar..."
            className="w-full text-xs text-white outline-none"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border:     '1px solid rgba(255,255,255,0.07)',
              borderRadius: 6,
              padding:    '7px 12px 7px 30px',
              color:      'rgba(255,255,255,0.8)',
            }}
          />
        </div>

        <div className="flex items-center gap-1">
          {(['all', 'integrated', 'pending', 'blocked', 'not_started'] as const).map(s => {
            const cfg    = s === 'all' ? null : STATUS_CFG[s]
            const active = filterStatus === s
            return (
              <button key={s} onClick={() => setFilterStatus(s)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all"
                style={active
                  ? { background: cfg ? cfg.bg : 'rgba(255,255,255,0.08)', color: cfg ? cfg.color : '#fff', border: `1px solid ${cfg ? cfg.color + '30' : 'rgba(255,255,255,0.15)'}` }
                  : { background: 'transparent', color: 'rgba(255,255,255,0.3)', border: '1px solid transparent' }}>
                {cfg && <cfg.Icon style={{ width: 10, height: 10 }} />}
                {s === 'all' ? 'Todos' : cfg!.label}
                <span style={{ opacity: 0.5 }}>{counts[s]}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.2)' }}>
            {distributors.length === 0
              ? 'Nenhum distribuidor cadastrado ainda.'
              : 'Nenhum resultado para os filtros aplicados.'}
          </p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {filtered.map(d => (
            <DistributorRow key={d.id} distributor={d} projectId={id} onEdit={handleEdit} />
          ))}
        </div>
      )}

      <AnimatePresence>
        {modalOpen && (
          <DistributorModal projectId={id} distributor={editTarget} onClose={handleClose} />
        )}
        {importOpen && (
          <ImportModal projectId={id} onClose={() => setImportOpen(false)} />
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Helper ───────────────────────────────────────────────────────────────────

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