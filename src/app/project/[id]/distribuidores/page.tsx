'use client'
import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Search, CheckCircle2, Clock, XCircle, Circle,
  Pencil, Trash2, X, Wifi, HardDrive, Globe, FileText, Upload, AlertTriangle,
  ChevronRight, ChevronLeft, MessageSquare,
} from 'lucide-react'
import {
  subscribeToProject,
  subscribeToDistributorsCollection,
  upsertDistributorDoc,
  updateDistributorDoc,
  deleteDistributorDoc,
  getDistributorComments,
  addDistributorHistory,
  importWeeklyCSV,
  logProjectActivity,
} from '@/lib/firestore'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'
import { useNavActions } from '@/contexts/NavActionsContext'
import type { Project, Distributor, DistributorStatus, DistributorComment } from '@/types'
import { generateDistributorId } from '@/types'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

// ─── Config ───────────────────────────────────────────────────────────────────

const STATUS_CFG: Record<DistributorStatus, { label: string; color: string; bg: string; Icon: any }> = {
  integrated:  { label: 'Integrado',    color: '#22c55e',   bg: 'rgba(34,197,94,0.1)',    Icon: CheckCircle2 },
  pending:     { label: 'Pendente',     color: '#f59e0b',   bg: 'rgba(245,158,11,0.1)',   Icon: Clock        },
  blocked:     { label: 'Bloqueado',    color: '#ef4444',   bg: 'rgba(239,68,68,0.1)',    Icon: XCircle      },
  not_started: { label: 'Não iniciado', color: '#ffffff40', bg: 'rgba(255,255,255,0.05)', Icon: Circle       },
}

const translatePhaseLabel = (phase?: string, status?: string): string => {
  if (status === 'integrated' || status === 'concluido' || status === 'concluído')
    return 'Distribuidor Integrado com Sucesso'
  if (status === 'blocked') return 'Integração Bloqueada'
  if (status === 'pending') return 'Aguardando Integração'
  if (status === 'in_progress') return 'Integração em Andamento'
  if (phase) return phase
  return 'Sem status'
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
  const iERP        = idx('ERP')
  const iCNPJ       = idx('CNPJ')
  const iValue      = idx('Valor')
  const iPalliative = idx('Paliativo')
  const iCategory   = idx('Categoria')

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
      erp:                get(iERP),
      cnpj:               get(iCNPJ),
      valuePerConnection: parseFloat(get(iValue).replace(/[^0-9.]/g, '')) / 100 || 0,
      palliative:         get(iPalliative),
      connectionCategory: get(iCategory),
    } as Omit<Distributor, 'id'>
  }).filter(Boolean) as Omit<Distributor, 'id'>[]
}

// ─── Import Modal ─────────────────────────────────────────────────────────────

interface ImportResult {
  added: number
  updated: number
  removed: number
  integrated: number
  pending: number
  blocked: number
  diff: {
    newIntegrations: string[]
    newBlockers: string[]
    resolved: string[]
  }
  previousIntegrated: number
}

function ImportModal({
  projectId,
  project,
  onClose,
}: {
  projectId: string
  project: Project
  onClose: () => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [preview,   setPreview]   = useState<Omit<Distributor, 'id'>[]>([])
  const [importing, setImporting] = useState(false)
  const [result,    setResult]    = useState<ImportResult | null>(null)
  const [error,     setError]     = useState('')

  const weekNumber = (project.weeklyUpdates?.length ?? 0) + 1
  const [selectedWeek, setSelectedWeek] = useState(weekNumber)

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
      const previousIntegrated = (project.distributors ?? []).filter(d => d.status === 'integrated').length

      const res = await importWeeklyCSV(projectId, preview, selectedWeek)

      // Remove distribuidores que não vieram no CSV
      const csvIds = preview.map(d => generateDistributorId(d.name, d.cnpj))
      const existingSnap = await getDocs(
        collection(db, 'projects', projectId, 'distributors')
      )
      const toDelete = existingSnap.docs.filter(d => !csvIds.includes(d.id))
      for (const d of toDelete) {
        await deleteDistributorDoc(projectId, d.id)
      }

      await addDistributorHistory(projectId, {
        type:         'import',
        source:       'clickup_csv',
        distributors: preview.map(d => ({ ...d, id: generateDistributorId(d.name, d.cnpj) })),
        note:         `Semana ${selectedWeek} — ${preview.length} distribuidores via CSV` +
                      (toDelete.length > 0 ? ` (${toDelete.length} removidos)` : ''),
      })

      setResult({ ...res, removed: toDelete.length, previousIntegrated })

      await logProjectActivity(projectId,
        `CSV importado — ${res.added} novos, ${res.updated} atualizados, ${toDelete.length} removidos`
      )

      setTimeout(onClose, 3000)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setImporting(false)
    }
  }

  // ── Result screen ──
  if (result) {
    const integrationPct = (result.integrated + result.pending + result.blocked) > 0
      ? Math.round((result.integrated / (result.integrated + result.pending + result.blocked + (preview.length - result.integrated - result.pending - result.blocked))) * 100)
      : 0
    const totalAfter = result.integrated + result.pending + result.blocked + (preview.length - result.integrated - result.pending - result.blocked)
    const pct = totalAfter > 0 ? Math.round((result.integrated / totalAfter) * 100) : 0

    return (
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
      >
        <motion.div
          initial={{ scale: 0.96, y: 16 }} animate={{ scale: 1, y: 0 }}
          className="w-full max-w-md rounded p-6 space-y-5"
          style={{ background: '#0e0e16', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <div className="text-center space-y-1">
            <p className="text-lg font-bold text-white flex items-center justify-center gap-2">
              <CheckCircle2 style={{ width: 18, height: 18, color: '#22c55e' }} />
              Importação concluída
            </p>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
              Semana {selectedWeek}
            </p>
          </div>

          {/* Progress bar */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
              <span>Integração</span>
              <span style={{ color: 'var(--color-brand)' }}>{pct}%</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className="h-full rounded-full"
                style={{ background: 'linear-gradient(90deg, var(--color-brand, #00D4AA), var(--color-brand-secondary, #8B5CF6))' }}
              />
            </div>
          </div>

          {/* Diff badges */}
          <div className="space-y-2">
            {result.diff.newIntegrations.length > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 rounded"
                   style={{ background: STATUS_CFG.integrated.bg, border: `1px solid ${STATUS_CFG.integrated.color}30` }}>
                <CheckCircle2 style={{ width: 12, height: 12, color: STATUS_CFG.integrated.color }} />
                <span className="text-xs font-medium" style={{ color: STATUS_CFG.integrated.color }}>
                  +{result.diff.newIntegrations.length} {result.diff.newIntegrations.length === 1 ? 'nova integração' : 'novas integrações'}
                </span>
              </div>
            )}
            {result.diff.newBlockers.length > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 rounded"
                   style={{ background: STATUS_CFG.blocked.bg, border: `1px solid ${STATUS_CFG.blocked.color}30` }}>
                <XCircle style={{ width: 12, height: 12, color: STATUS_CFG.blocked.color }} />
                <span className="text-xs font-medium" style={{ color: STATUS_CFG.blocked.color }}>
                  +{result.diff.newBlockers.length} {result.diff.newBlockers.length === 1 ? 'novo bloqueio' : 'novos bloqueios'}
                </span>
              </div>
            )}
            {result.diff.resolved.length > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 rounded"
                   style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)' }}>
                <CheckCircle2 style={{ width: 12, height: 12, color: '#10B981' }} />
                <span className="text-xs font-medium" style={{ color: '#10B981' }}>
                  {result.diff.resolved.length} {result.diff.resolved.length === 1 ? 'bloqueio resolvido' : 'bloqueios resolvidos'}
                </span>
              </div>
            )}
            {result.removed > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 rounded"
                   style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <Trash2 style={{ width: 12, height: 12, color: 'rgba(255,255,255,0.4)' }} />
                <span className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  {result.removed} {result.removed === 1 ? 'removido' : 'removidos'} (não constam no CSV)
                </span>
              </div>
            )}
          </div>

          {/* Counts summary */}
          <div className="flex items-center justify-center gap-4 text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
            <span>{result.updated} atualizados</span>
            <span>·</span>
            <span>{result.added} novos</span>
            {result.removed > 0 && (<><span>·</span><span>{result.removed} removidos</span></>)}
          </div>

          {/* Before/after comparison */}
          <div className="text-center text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
            Semana anterior: {result.previousIntegrated} integrados → Agora: {result.integrated} integrados
          </div>

          {/* Auto-close indicator */}
          <div className="flex justify-center">
            <div className="w-4 h-4 border-2 border-white/10 border-t-white/40 rounded-full animate-spin" />
          </div>
        </motion.div>
      </motion.div>
    )
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
        className="w-full max-w-2xl rounded overflow-hidden"
        style={{ background: '#0e0e16', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4"
             style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div>
            <p className="text-sm font-bold text-white">
              Importar CSV do ClickUp
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>
              Campos mapeados: Nome, Status, Responsável, Modo de Integração, Fase
            </p>
          </div>
          <button onClick={onClose} style={{ color: 'rgba(255,255,255,0.3)' }}>
            <X style={{ width: 15, height: 15 }} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Instruction box */}
          <div
            className="rounded"
            style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 5,
              padding: '12px 14px',
            }}
          >
            <p className="text-[11px] font-semibold mb-1" style={{ color: 'rgba(255,255,255,0.5)' }}>
              Como funciona
            </p>
            <p className="text-[11px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.35)' }}>
              Exporte a lista de distribuidores do ClickUp toda segunda-feira e importe aqui.
              O LAT compara com a semana anterior e atualiza o relatório automaticamente.
            </p>
            <p className="text-[11px] mt-1.5" style={{ color: 'rgba(255,255,255,0.25)' }}>
              Enquanto a gente não conecta direto com o ClickUp... é assim que rola. 🥲
            </p>
          </div>

          {/* Upload zone */}
          {!preview.length && (
            <div
              onClick={() => fileRef.current?.click()}
              className="flex flex-col items-center justify-center py-10 rounded cursor-pointer transition-all"
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
            <div className="flex items-center gap-2 px-3 py-2 rounded"
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
                    <span key={s} className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded font-medium"
                          style={{ background: cfg.bg, color: cfg.color }}>
                      <cfg.Icon style={{ width: 11, height: 11 }} />
                      {count} {cfg.label}
                    </span>
                  )
                })}
              </div>

              {/* Week selector */}
              <div className="flex items-center justify-between px-3 py-2.5 rounded"
                   style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  Para qual semana é esse import?
                </span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSelectedWeek(w => Math.max(1, w - 1))}
                    className="w-6 h-6 rounded flex items-center justify-center transition-all"
                    style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)' }}
                  >
                    <ChevronLeft style={{ width: 12, height: 12 }} />
                  </button>
                  <span className="text-xs font-bold text-white" style={{ minWidth: 60, textAlign: 'center' }}>
                    Semana {selectedWeek}
                  </span>
                  <button
                    onClick={() => setSelectedWeek(w => w + 1)}
                    className="w-6 h-6 rounded flex items-center justify-center transition-all"
                    style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)' }}
                  >
                    <ChevronRight style={{ width: 12, height: 12 }} />
                  </button>
                </div>
              </div>

              {/* Table */}
              <div className="rounded overflow-hidden max-h-60 overflow-y-auto"
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
              <button onClick={onClose} className="px-4 py-2 rounded text-xs"
                      style={{ color: 'rgba(255,255,255,0.35)' }}>
                Cancelar
              </button>
              <button
                onClick={handleImport}
                disabled={importing}
                className="flex items-center gap-2 px-5 py-2 rounded text-xs font-semibold transition-all disabled:opacity-60"
                style={{ background: 'var(--color-brand)', color: '#050508' }}
              >
                {importing ? 'Importando...' : `Importar ${preview.length} distribuidores`}
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
    erp:                distributor?.erp                ?? '',
  })
  const [saving, setSaving] = useState(false)
  const set = (k: keyof typeof form, v: any) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      if (isEdit && distributor) {
        await updateDistributorDoc(projectId, distributor.id, form)
        // Log status changes
        if (distributor.status !== form.status) {
          if (form.status === 'blocked') {
            await logProjectActivity(projectId,
              `${form.name} marcado como bloqueado — ${form.blockerDescription || 'sem descrição'}`
            )
          } else if (form.status === 'integrated') {
            await logProjectActivity(projectId,
              `${form.name} integrado com sucesso 🎉`
            )
          }
        }
      } else {
        await upsertDistributorDoc(projectId, form)
      }
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
        className="w-full max-w-lg rounded p-6 space-y-5"
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
            className="w-full px-3 py-2.5 rounded text-sm text-white placeholder-white/20 outline-none"
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
                    className="flex items-center gap-1.5 px-2 py-1.5 rounded text-xs font-medium transition-all"
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
                    className="flex items-center gap-1.5 px-2 py-1.5 rounded text-xs font-medium transition-all"
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
            className="w-full px-3 py-2.5 rounded text-sm text-white placeholder-white/20 outline-none"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
          />
        </Field>

        <Field label="ERP">
          <input
            value={form.erp ?? ''}
            onChange={e => set('erp', e.target.value)}
            placeholder="Ex: SAP, Sankhya, Winthor..."
            className="w-full px-3 py-2.5 rounded text-sm text-white placeholder-white/20 outline-none"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
          />
        </Field>

        <Field label="Observações">
          <textarea
            value={form.notes ?? ''}
            onChange={e => set('notes', e.target.value)}
            rows={2}
            placeholder="Status atual, observações gerais..."
            className="w-full px-3 py-2.5 rounded text-sm text-white placeholder-white/20 outline-none resize-none"
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
              className="w-full px-3 py-2.5 rounded text-sm text-white placeholder-white/20 outline-none resize-none"
              style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)' }}
            />
          </Field>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="px-4 py-2 rounded text-xs"
                  style={{ color: 'rgba(255,255,255,0.35)' }}>
            Cancelar
          </button>
          <button onClick={handleSave} disabled={saving || !form.name.trim()}
            className="px-5 py-2 rounded text-xs font-semibold transition-all disabled:opacity-40"
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
  const [deleting, setDeleting]   = useState(false)
  const [expanded, setExpanded]   = useState(false)
  const [comments, setComments]   = useState<DistributorComment[]>([])
  const [loadingComments, setLoadingComments] = useState(false)

  const handleDelete = async () => {
    if (!confirm(`Remover "${distributor.name}"?`)) return
    setDeleting(true)
    await deleteDistributorDoc(projectId, distributor.id)
  }

  const toggleExpand = useCallback(async () => {
    const next = !expanded
    setExpanded(next)
    if (next) {
      setLoadingComments(true)
      try {
        const c = await getDistributorComments(projectId, distributor.id)
        setComments(c)
      } catch { setComments([]) }
      finally { setLoadingComments(false) }
    }
  }, [expanded, projectId, distributor.id])

  const hasComments = distributor.hasUnreadComment || (distributor.comments?.length ?? 0) > 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: deleting ? 0 : 1, y: 0 }}
      className="rounded overflow-hidden"
      style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}
    >
      <div className="flex items-center gap-4 px-4 py-3 group">
        {/* Status icon */}
        <div className="w-8 h-8 rounded flex items-center justify-center flex-shrink-0"
             style={{ background: cfg.bg }}>
          <cfg.Icon style={{ width: 14, height: 14, color: cfg.color }} />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-white truncate" style={{ fontFamily: 'inherit', fontSize: 13, fontWeight: 500 }}>{distributor.name}</p>
          <div className="flex items-center gap-3 mt-0.5">
            {distributor.connectionType && ConnIcon && (
              <span className="text-[10px] flex items-center gap-1" style={{ color: 'rgba(255,255,255,0.3)' }}>
                <ConnIcon style={{ width: 10, height: 10 }} />
                {distributor.connectionType}
              </span>
            )}
            {distributor.erp && (
              <span className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                    style={{ background: 'rgba(139,92,246,0.12)', color: 'rgba(139,92,246,0.7)' }}>
                {distributor.erp}
              </span>
            )}
            {distributor.responsible && (
              <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.25)' }}>
                {distributor.responsible}
              </span>
            )}
            {distributor.notes && (
              <span className="text-[10px] truncate" style={{ color: 'rgba(255,255,255,0.2)' }}>
                {distributor.notes.startsWith('Fase:')
                  ? translatePhaseLabel(distributor.notes.replace('Fase: ', ''), distributor.status)
                  : distributor.notes}
              </span>
            )}
          </div>
          {distributor.status === 'blocked' && distributor.blockerDescription && (
            <p className="text-[10px] mt-0.5 truncate" style={{ color: '#ef444470' }}>
              ⚠ {distributor.blockerDescription}
            </p>
          )}
        </div>

        {/* Status label */}
        <span className="text-xs font-medium flex-shrink-0 flex items-center gap-1.5"
              style={{ color: cfg.color }}>
          <cfg.Icon style={{ width: 11, height: 11 }} />
          {cfg.label}
        </span>

        {/* Comments toggle */}
        <button
          onClick={toggleExpand}
          className="relative flex items-center gap-1 px-2 py-1.5 rounded text-[10px] font-medium transition-all flex-shrink-0"
          style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.35)' }}
        >
          <ChevronRight
            style={{
              width: 10, height: 10,
              transform: expanded ? 'rotate(90deg)' : 'none',
              transition: 'transform 150ms',
            }}
          />
          <MessageSquare style={{ width: 10, height: 10 }} />
          {distributor.hasUnreadComment && (
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full" style={{ background: '#EF4444' }} />
          )}
        </button>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <button onClick={() => onEdit(distributor)}
            className="w-7 h-7 rounded flex items-center justify-center transition-colors"
            style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.3)' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.7)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.3)')}>
            <Pencil style={{ width: 11, height: 11 }} />
          </button>
          <button onClick={handleDelete}
            className="w-7 h-7 rounded flex items-center justify-center transition-colors"
            style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.3)' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.3)')}>
            <Trash2 style={{ width: 11, height: 11 }} />
          </button>
        </div>
      </div>

      {/* Comments panel */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ borderTop: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}
          >
            <div className="px-4 py-3">
              {loadingComments ? (
                <div className="flex items-center justify-center py-4">
                  <div className="w-4 h-4 border-2 border-white/10 border-t-white/40 rounded-full animate-spin" />
                </div>
              ) : comments.length === 0 ? (
                <p className="text-[11px] text-center py-4" style={{ color: 'rgba(255,255,255,0.2)' }}>
                  Nenhum comentário de gestores.
                </p>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}>
                  {comments.map(c => (
                    <div
                      key={c.id}
                      className="flex items-start gap-3 px-3 py-2.5 rounded"
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 5 }}
                    >
                      {/* Avatar */}
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
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DistribuidoresPage() {
  const { id } = useParams<{ id: string }>()
  const { user, loading } = useAuth()
  const router = useRouter()

  const [project,      setProject]      = useState<Project | null>(null)
  const [distributors, setDistributors] = useState<Distributor[]>([])
  const [search,       setSearch]       = useState('')
  const [filterStatus, setFilterStatus] = useState<DistributorStatus | 'all'>('all')
  const [modalOpen,        setModalOpen]        = useState(false)
  const [importOpen,       setImportOpen]       = useState(false)
  const [editTarget,       setEditTarget]       = useState<Distributor | undefined>()
  const { setActions, clearActions } = useNavActions()

  useEffect(() => {
    if (!loading && !user) router.replace('/')
  }, [user, loading, router])

  useEffect(() => {
    if (!id) return
    return subscribeToProject(id, setProject)
  }, [id])

  useEffect(() => {
    if (!id) return
    return subscribeToDistributorsCollection(id, setDistributors)
  }, [id])

  useEffect(() => {
    setActions(
      <div className="flex items-center gap-2">
        <button
          onClick={() => setImportOpen(true)}
          className="flex items-center gap-2 px-3 py-2 rounded text-xs font-medium transition-all"
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: 'rgba(255,255,255,0.5)',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.5)')}
        >
          <Upload style={{ width: 12, height: 12 }} />
          Importar CSV
        </button>
        <button
          onClick={() => { setEditTarget(undefined); setModalOpen(true) }}
          className="flex items-center gap-2 px-3 py-2 rounded text-xs font-semibold"
          style={{ background: 'var(--color-brand)', color: '#050508', borderRadius: 5 }}
        >
          <Plus style={{ width: 12, height: 12 }} />
          Novo
        </button>
      </div>
    )
    return () => clearActions()
  }, [setActions, clearActions, setImportOpen, setModalOpen, setEditTarget])

  if (!project) return null

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
    <div className="flex-1 px-8 pt-2 pb-12">

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
              borderRadius: 5,
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
                className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all"
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
          <ImportModal projectId={id} project={project} onClose={() => setImportOpen(false)} />
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