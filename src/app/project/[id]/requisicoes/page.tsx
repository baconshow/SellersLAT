'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Circle, Clock, CheckCircle2, XCircle, ChevronDown } from 'lucide-react'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import * as XLSX from 'xlsx'
import { useAuth } from '@/contexts/AuthContext'
import { useNavActions } from '@/contexts/NavActionsContext'
import {
  subscribeToTickets,
  createTicket,
  updateTicketStatus,
  subscribeToProject,
} from '@/lib/firestore'
import MagicImporter from '@/components/requisicoes/MagicImporter'
import type { Ticket, TicketStatus, Project } from '@/types'

const STATUS_CFG: Record<TicketStatus, { label: string; color: string; bg: string; border: string; icon: any }> = {
  aberto:       { label: 'Aberto',       color: '#9898B0', bg: 'rgba(255,255,255,.04)', border: 'rgba(255,255,255,.10)', icon: Circle },
  andamento:    { label: 'Em Andamento', color: '#3B82F6', bg: 'rgba(59,130,246,.13)',  border: 'rgba(59,130,246,.28)',  icon: Clock },
  implementado: { label: 'Implementado', color: '#10B981', bg: 'rgba(16,185,129,.13)',  border: 'rgba(16,185,129,.28)',  icon: CheckCircle2 },
  cancelado:    { label: 'Cancelado',    color: '#EF4444', bg: 'rgba(239,68,68,.10)',   border: 'rgba(239,68,68,.25)',   icon: XCircle },
}

const PRIO_COLOR: Record<string, string> = { hi: '#EF4444', md: '#F5A623', lo: '#3B82F6' }
const PRIO_LABEL: Record<string, string> = { hi: 'Alta', md: 'Média', lo: 'Baixa' }
const EFFORT_LABEL: Record<string, string> = { low: 'Baixo', medium: 'Médio', high: 'Alto' }
const STATUS_LABEL: Record<string, string> = { aberto: 'Aberto', andamento: 'Em Andamento', implementado: 'Implementado', cancelado: 'Cancelado' }

const TIPO_OPTIONS = ['Melhoria', 'Novo Dashboard', 'Correção', 'Integração', 'Ajuste Visual', 'Outro']
const CRIT_OPTIONS = ['Alto', 'Médio', 'Baixo']
const IMPACTO_OPTIONS = ['Alto', 'Médio', 'Baixo']

const mono = '"JetBrains Mono", monospace'
const outfit = 'var(--font-outfit), sans-serif'
const glass = { background: 'var(--color-surface)', border: '1px solid var(--color-border)' }
const R = '5px'

const inputStyle: React.CSSProperties = {
  width: '100%', background: 'var(--input-bg)', border: '1px solid var(--color-border)',
  borderRadius: R, padding: '7px 10px', color: 'var(--color-text)', fontSize: '.78rem', fontFamily: outfit,
  transition: 'all 140ms',
}
const selectStyle: React.CSSProperties = {
  ...inputStyle, appearance: 'none', WebkitAppearance: 'none', cursor: 'pointer',
}
const labelStyle: React.CSSProperties = {
  fontFamily: outfit, fontSize: '.56rem', fontWeight: 700, textTransform: 'uppercase',
  letterSpacing: '.07em', color: 'var(--color-text-muted)', display: 'block', marginBottom: 4,
}

function estimateDeliveryDate(effort: string, existingTickets: Ticket[]): string {
  const days = effort === 'high' ? 45 : effort === 'medium' ? 21 : 7
  const base = new Date()
  base.setDate(base.getDate() + days)

  const targetMonth = `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, '0')}`
  const sameMonth = existingTickets.filter(t => {
    if (!t.deliveryDate) return false
    return t.deliveryDate.startsWith(targetMonth)
  })

  if (sameMonth.length >= 2) {
    base.setDate(base.getDate() + 14)
  }

  return base.toISOString().split('T')[0]
}

interface EditForm {
  title: string
  description: string
  sprint: string
  tipo: string
  criticidade: string
  impacto: string
  observacao: string
  deliveryDate: string
}

export default function RequisicoesPage() {
  const { id: projectId } = useParams<{ id: string }>()
  const router = useRouter()
  const { user, loading } = useAuth()
  const { setActions, clearActions } = useNavActions()

  const [project, setProject] = useState<Project | null>(null)
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [filterStatus, setFilterStatus] = useState<TicketStatus | 'all'>('all')
  const [showModal, setShowModal] = useState(false)
  const [showImporter, setShowImporter] = useState(false)

  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [dropdownOpenId, setDropdownOpenId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<EditForm>({
    title: '', description: '', sprint: '', tipo: '', criticidade: '', impacto: '', observacao: '', deliveryDate: '',
  })
  const expandedRef = useRef<HTMLDivElement>(null)
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [form, setForm] = useState({ title: '', description: '' })
  const [classifying, setClassifying] = useState(false)
  const [classified, setClassified] = useState<{
    priority: 'hi' | 'md' | 'lo'
    sprint: number
    estimatedDate: string
    effort: 'low' | 'medium' | 'high'
    reasoning: string
  } | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [savingId, setSavingId] = useState<string | null>(null)

  // Close dropdown on outside click
  useEffect(() => {
    if (!dropdownOpenId) return
    const handler = () => setDropdownOpenId(null)
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [dropdownOpenId])

  useEffect(() => {
    if (!loading && !user) router.replace('/login')
  }, [user, loading, router])

  useEffect(() => {
    if (!projectId) return
    const unsub = subscribeToProject(projectId, setProject)
    return () => unsub()
  }, [projectId])

  useEffect(() => {
    if (!projectId) return
    const unsub = subscribeToTickets(projectId, setTickets)
    return () => unsub()
  }, [projectId])

  const exportToExcel = useCallback(() => {
    const data = visible.map(t => ({
      'ID': t.id,
      'Título': t.title,
      'Tipo': t.tipo ?? '',
      'Sprint': t.sprint ?? '',
      'Criticidade': t.criticidade ?? '',
      'Impacto': t.impacto ?? '',
      'Status': STATUS_LABEL[t.status] ?? t.status,
      'Prioridade': PRIO_LABEL[t.priority] ?? t.priority,
      'Esforço': EFFORT_LABEL[t.effort] ?? t.effort,
      'Criado em': t.createdAt?.toDate ? t.createdAt.toDate().toLocaleDateString('pt-BR') : '',
      'Entrega Prevista': t.deliveryDate ? new Date(t.deliveryDate + 'T12:00:00').toLocaleDateString('pt-BR') : '',
      'Descrição': t.description ?? '',
      'Observação': t.observacao ?? '',
    }))

    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Requisições')
    XLSX.writeFile(wb, `requisicoes-${projectId}-${new Date().toISOString().slice(0, 10)}.xlsx`)
  }, [tickets, filterStatus, projectId])

  useEffect(() => {
    const accent = project?.clientColor ?? '#00D4AA'
    setActions(
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button
          onClick={exportToExcel}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '6px 14px', borderRadius: R,
            background: 'var(--color-surface2)', border: '1px solid var(--color-border-2)',
            color: 'var(--color-text-muted)', fontFamily: outfit,
            fontSize: '.78rem', fontWeight: 700, cursor: 'pointer',
            whiteSpace: 'nowrap', transition: 'all 140ms',
          }}
        >
          ↓ Exportar
        </button>
        <button
          onClick={() => setShowImporter(true)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '6px 14px', borderRadius: R,
            background: 'var(--color-surface2)', border: '1px solid var(--color-border-2)',
            color: 'var(--color-text-muted)', fontFamily: outfit,
            fontSize: '.78rem', fontWeight: 700, cursor: 'pointer',
            whiteSpace: 'nowrap', transition: 'all 140ms',
          }}
        >
          ⬆ Importar
        </button>
        <button
          onClick={() => setShowModal(true)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '6px 14px', borderRadius: R,
            background: `${accent}26`, border: `1px solid ${accent}59`,
            color: accent, fontFamily: outfit,
            fontSize: '.78rem', fontWeight: 700, cursor: 'pointer',
            whiteSpace: 'nowrap', transition: 'all 140ms',
          }}
        >
          + Nova Requisição
        </button>
      </div>
    )
    return () => clearActions()
  }, [setActions, clearActions, project, exportToExcel])

  const classify = useCallback(async () => {
    if (!form.title.trim() || !form.description.trim()) return
    setClassifying(true)
    setClassified(null)
    try {
      const res = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project: project ?? { id: projectId, clientName: 'Projeto' },
          trigger: 'ticket_classify',
          ticketTitle: form.title,
          ticketDescription: form.description,
          currentSprint: 2,
        }),
      })
      const data = await res.json()
      if (data.ok) setClassified(data.data)
    } catch (e) { console.error(e) }
    finally { setClassifying(false) }
  }, [form, project, projectId])

  const submit = useCallback(async () => {
    if (!classified || !project || !user) return
    setSubmitting(true)
    try {
      const deliveryDate = estimateDeliveryDate(classified.effort, tickets)
      await createTicket(projectId, project.clientName, {
        title: form.title,
        description: form.description,
        source: 'internal',
        createdByEmail: user.email ?? '',
        createdByName: user.displayName ?? user.email ?? 'Gestor',
        priority: classified.priority,
        sprint: `Sprint ${classified.sprint}`,
        estimatedDate: classified.estimatedDate,
        effort: classified.effort,
        tipo: 'Melhoria',
        criticidade: classified.effort === 'high' ? 'Alto' : classified.effort === 'medium' ? 'Médio' : 'Baixo',
        impacto: classified.priority === 'hi' ? 'Alto' : classified.priority === 'md' ? 'Médio' : 'Baixo',
        deliveryDate,
      })
      setForm({ title: '', description: '' })
      setClassified(null)
      setShowModal(false)
    } catch (e) { console.error(e) }
    finally { setSubmitting(false) }
  }, [classified, project, user, projectId, form, tickets])

  const handleStatus = useCallback(async (ticketId: string, status: TicketStatus) => {
    setSavingId(ticketId)
    await updateTicketStatus(projectId, ticketId, status)
    setSavingId(null)
  }, [projectId])

  const handleImportTicket = useCallback(async (data: {
    title: string
    description: string
    priority: 'hi' | 'md' | 'lo'
    assignee: string | null
    notes: string | null
    tipo: string
    criticidade: string
    impacto: string
    observacao: string
  }) => {
    if (!project || !user) return
    const deliveryDate = estimateDeliveryDate('medium', tickets)
    await createTicket(projectId, project.clientName, {
      title: data.title,
      description: data.description,
      source: 'internal',
      createdByEmail: user.email ?? '',
      createdByName: user.displayName ?? user.email ?? 'Gestor',
      priority: data.priority,
      sprint: 'Sprint 2',
      estimatedDate: 'A definir',
      effort: 'medium',
      tipo: data.tipo || 'Melhoria',
      criticidade: data.criticidade || 'Médio',
      impacto: data.impacto || 'Médio',
      observacao: data.observacao,
      deliveryDate,
    })
  }, [project, user, projectId, tickets])

  const handleRowClick = useCallback((ticketId: string) => {
    if (editingId) return
    if (clickTimerRef.current) clearTimeout(clickTimerRef.current)
    clickTimerRef.current = setTimeout(() => {
      setExpandedId(prev => prev === ticketId ? null : ticketId)
    }, 220)
  }, [editingId])

  const startEditing = useCallback((t: Ticket) => {
    setEditingId(t.id)
    setEditForm({
      title: t.title ?? '',
      description: t.description ?? '',
      sprint: t.sprint ?? '',
      tipo: t.tipo ?? 'Melhoria',
      criticidade: t.criticidade ?? 'Médio',
      impacto: t.impacto ?? 'Médio',
      observacao: t.observacao ?? '',
      deliveryDate: t.deliveryDate ?? '',
    })
  }, [])

  const saveEdit = useCallback(async () => {
    if (!editingId) return
    try {
      await updateDoc(doc(db, 'projects', projectId, 'tickets', editingId), {
        title: editForm.title,
        description: editForm.description,
        sprint: editForm.sprint,
        tipo: editForm.tipo,
        criticidade: editForm.criticidade,
        impacto: editForm.impacto,
        observacao: editForm.observacao || null,
        deliveryDate: editForm.deliveryDate || null,
      })
    } catch (e) { console.error(e) }
    setEditingId(null)
  }, [editingId, editForm, projectId])

  const handleBlur = useCallback((e: React.FocusEvent<HTMLDivElement>) => {
    if (!editingId) return
    const related = e.relatedTarget as HTMLElement | null
    if (related && e.currentTarget.contains(related)) return
    saveEdit()
  }, [editingId, saveEdit])

  const visible = tickets.filter(t => filterStatus === 'all' || t.status === filterStatus)
  const counts = {
    all: tickets.length,
    aberto: tickets.filter(t => t.status === 'aberto').length,
    andamento: tickets.filter(t => t.status === 'andamento').length,
    implementado: tickets.filter(t => t.status === 'implementado').length,
    cancelado: tickets.filter(t => t.status === 'cancelado').length,
  }

  if (loading || !user) return null

  return (
    <>
      <style>{`
        @keyframes fadeIn { from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)} }
        .ticket-row:hover { background: var(--color-surface) !important; }
        .kpi-card { cursor:pointer; transition:all 140ms; }
        .kpi-card:hover { border-color:var(--color-border-2)!important; }
        .modal-overlay {
          position:fixed;inset:0;background:rgba(0,0,0,.75);
          backdrop-filter:blur(6px);z-index:200;
          display:flex;align-items:center;justify-content:center;padding:24px;
        }
        .modal {
          background:var(--color-bg);border:1px solid var(--color-border);
          border-radius:5px;width:100%;max-width:540px;padding:26px;
          animation:fadeIn .18s ease-out both;
        }
        select option { background:var(--color-bg);color:var(--color-text); }
        textarea:focus, input:focus {
          outline:none;
          border-color:rgba(59,130,246,.4)!important;
          background:rgba(59,130,246,.04)!important;
        }
      `}</style>

      <div style={{ minHeight: '100vh', background: 'var(--color-bg)', color: 'var(--color-text)', fontFamily: outfit, paddingBottom: 80 }}>
        <div style={{ maxWidth: 1180, margin: '0 auto', padding: '28px 24px 0' }}>

          {/* ── Stats (clicáveis) ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 8, marginBottom: 20 }}>
            {([
              ['all',          'Total',         'var(--color-text)'],
              ['aberto',       'Abertos',        '#9898B0'],
              ['andamento',    'Em Andamento',   '#3B82F6'],
              ['implementado', 'Implementados',  '#10B981'],
              ['cancelado',    'Cancelados',     '#EF4444'],
            ] as const).map(([k, l, c]) => {
              const isActive = filterStatus === k
              return (
                <div
                  key={k}
                  className="kpi-card"
                  onClick={() => setFilterStatus(k)}
                  style={{
                    background: isActive ? 'rgba(0,212,170,.06)' : 'var(--color-surface)',
                    border: isActive ? '1px solid rgba(0,212,170,.4)' : '1px solid var(--color-border)',
                    borderRadius: R, padding: '12px 14px',
                  }}
                >
                  <div style={{ fontFamily: outfit, fontSize: '1.4rem', fontWeight: 700, color: c, lineHeight: 1, marginBottom: 3 }}>
                    {counts[k]}
                  </div>
                  <div style={{ fontSize: '.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--color-text-muted)' }}>{l}</div>
                </div>
              )
            })}
          </div>

          {/* ── Lista ── */}
          <div style={{ ...glass, borderRadius: R, overflow: 'hidden' }}>
            {visible.length === 0 ? (
              <div style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '.84rem' }}>
                {tickets.length === 0
                  ? 'Nenhuma requisição registrada ainda.'
                  : 'Nenhum item com o filtro selecionado.'}
              </div>
            ) : visible.map((t, i) => {
              const sc = STATUS_CFG[t.status]
              const StatusIcon = sc.icon
              const isExpanded = expandedId === t.id
              const isEditing = editingId === t.id

              return (
                <div
                  key={t.id}
                  ref={isExpanded ? expandedRef : undefined}
                  onBlur={isEditing ? handleBlur : undefined}
                  style={{
                    borderBottom: i < visible.length - 1 ? '1px solid var(--color-border)' : 'none',
                    background: isExpanded ? 'var(--color-surface)' : 'var(--color-bg)',
                    transition: 'background 140ms',
                  }}
                >
                  {/* ── Row principal ── */}
                  <div
                    className="ticket-row"
                    onClick={() => handleRowClick(t.id)}
                    onDoubleClick={() => { if (clickTimerRef.current) clearTimeout(clickTimerRef.current); setExpandedId(t.id); startEditing(t) }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '12px 16px', cursor: 'pointer',
                    }}
                  >
                    <div style={{ width: 3, height: 34, borderRadius: 2, background: PRIO_COLOR[t.priority], flexShrink: 0 }} />

                    <div style={{ fontFamily: mono, fontSize: '.63rem', fontWeight: 600, color: 'var(--color-text-muted)', minWidth: 56, flexShrink: 0 }}>{t.id}</div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: outfit, fontSize: '.79rem', fontWeight: 500, color: 'var(--color-text)', marginBottom: 4, lineHeight: 1.35 }}>{t.title}</div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                        {[
                          t.sprint ?? '',
                          t.tipo ?? '',
                          t.estimatedDate,
                          `Esforço: ${EFFORT_LABEL[t.effort] ?? t.effort}`,
                          t.source === 'public' ? '🌐 Indústria' : '🔒 Interno',
                        ].filter(Boolean).map((item, idx, arr) => (
                          <span key={idx} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontFamily: outfit, fontSize: '.6rem', color: 'var(--color-text-muted)' }}>{item}</span>
                            {idx < arr.length - 1 && <span style={{ width: 2, height: 2, borderRadius: '50%', background: 'var(--color-text-muted)', flexShrink: 0 }} />}
                          </span>
                        ))}
                        {t.aiClassified && (
                          <span style={{ fontFamily: outfit, fontSize: '.58rem', color: 'var(--color-brand)', opacity: .7 }}>· ✦ IA</span>
                        )}
                      </div>
                    </div>

                    <span style={{
                      fontSize: '.6rem', color: 'var(--color-text-muted)', transition: 'transform 180ms',
                      transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', flexShrink: 0,
                    }}>▾</span>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                      {savingId === t.id && <span style={{ fontFamily: mono, fontSize: '.6rem', color: 'var(--color-text-muted)' }}>···</span>}
                      <div style={{ position: 'relative' }}>
                        <button
                          onClick={() => setDropdownOpenId(dropdownOpenId === t.id ? null : t.id)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            padding: '5px 10px', borderRadius: R,
                            border: `1px solid ${sc.border}`,
                            background: sc.bg, color: sc.color,
                            fontFamily: outfit, fontSize: '.7rem', fontWeight: 700,
                            cursor: 'pointer', minWidth: 136,
                            transition: 'all 140ms',
                          }}
                        >
                          <StatusIcon size={11} style={{ color: sc.color }} />
                          {sc.label}
                          <ChevronDown size={11} style={{ marginLeft: 'auto', opacity: 0.6 }} />
                        </button>

                        {dropdownOpenId === t.id && (
                          <div style={{
                            position: 'absolute', top: '100%', right: 0, marginTop: 4,
                            background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                            borderRadius: R, overflow: 'hidden', zIndex: 50, minWidth: 140,
                            boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                          }}>
                            {(Object.entries(STATUS_CFG) as [TicketStatus, typeof STATUS_CFG[TicketStatus]][]).map(([k, v]) => (
                              <button
                                key={k}
                                onClick={() => { handleStatus(t.id, k); setDropdownOpenId(null) }}
                                style={{
                                  display: 'flex', alignItems: 'center', gap: 6,
                                  width: '100%', padding: '8px 12px', textAlign: 'left',
                                  fontFamily: outfit, fontSize: '.7rem', fontWeight: 600,
                                  color: v.color, border: 'none', cursor: 'pointer',
                                  background: t.status === k ? 'var(--color-muted)' : 'transparent',
                                  transition: 'background 100ms',
                                }}
                                onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-muted)')}
                                onMouseLeave={e => (e.currentTarget.style.background = t.status === k ? 'var(--color-muted)' : 'transparent')}
                              >
                                <v.icon size={11} />
                                {v.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* ── Área expandida ── */}
                  <div style={{
                    maxHeight: isExpanded ? 600 : 0,
                    opacity: isExpanded ? 1 : 0,
                    overflow: 'hidden',
                    transition: 'max-height 220ms ease, opacity 180ms ease',
                  }}>
                    <div style={{ padding: '0 16px 16px 16px' }}>
                      <div style={{
                        background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                        borderRadius: R, padding: 16,
                      }}>

                        {isEditing ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <div>
                              <label style={labelStyle}>Título</label>
                              <input
                                value={editForm.title}
                                onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                                style={inputStyle}
                              />
                            </div>

                            <div>
                              <label style={labelStyle}>Descrição</label>
                              <textarea
                                value={editForm.description}
                                onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                                rows={3}
                                style={{ ...inputStyle, resize: 'vertical' }}
                              />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10 }}>
                              <div>
                                <label style={labelStyle}>Sprint</label>
                                <input
                                  value={editForm.sprint}
                                  onChange={e => setEditForm(f => ({ ...f, sprint: e.target.value }))}
                                  style={inputStyle}
                                />
                              </div>
                              <div>
                                <label style={labelStyle}>Entrega Prevista</label>
                                <input
                                  type="date"
                                  value={editForm.deliveryDate}
                                  onChange={e => setEditForm(f => ({ ...f, deliveryDate: e.target.value }))}
                                  style={inputStyle}
                                />
                              </div>
                              <div>
                                <label style={labelStyle}>Tipo</label>
                                <select
                                  value={editForm.tipo}
                                  onChange={e => setEditForm(f => ({ ...f, tipo: e.target.value }))}
                                  style={selectStyle}
                                >
                                  {TIPO_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                                </select>
                              </div>
                              <div>
                                <label style={labelStyle}>Criticidade</label>
                                <select
                                  value={editForm.criticidade}
                                  onChange={e => setEditForm(f => ({ ...f, criticidade: e.target.value }))}
                                  style={selectStyle}
                                >
                                  {CRIT_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                                </select>
                              </div>
                              <div>
                                <label style={labelStyle}>Impacto</label>
                                <select
                                  value={editForm.impacto}
                                  onChange={e => setEditForm(f => ({ ...f, impacto: e.target.value }))}
                                  style={selectStyle}
                                >
                                  {IMPACTO_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                                </select>
                              </div>
                            </div>

                            <div>
                              <label style={labelStyle}>Observação</label>
                              <textarea
                                value={editForm.observacao}
                                onChange={e => setEditForm(f => ({ ...f, observacao: e.target.value }))}
                                rows={2}
                                style={{ ...inputStyle, resize: 'vertical' }}
                              />
                            </div>

                            <div style={{ fontFamily: outfit, fontSize: '.6rem', color: 'var(--color-text-muted)', textAlign: 'right' }}>
                              Clique fora para salvar
                            </div>
                          </div>
                        ) : (
                          <div
                            onDoubleClick={() => startEditing(t)}
                            style={{ cursor: 'default' }}
                          >
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8, marginBottom: 12 }}>
                              {[
                                { label: 'Tipo',             value: t.tipo ?? 'Melhoria' },
                                { label: 'Criticidade',      value: t.criticidade ?? '—' },
                                { label: 'Impacto',          value: t.impacto ?? '—' },
                                { label: 'Sprint',           value: t.sprint ?? '—' },
                                { label: 'Criado em',        value: t.createdAt?.toDate ? t.createdAt.toDate().toLocaleDateString('pt-BR') : '—' },
                                { label: 'Entrega prevista', value: t.deliveryDate ? new Date(t.deliveryDate + 'T12:00:00').toLocaleDateString('pt-BR') : 'A definir' },
                              ].map(item => (
                                <div key={item.label} style={{ background: 'var(--color-surface)', borderRadius: R, padding: '7px 10px' }}>
                                  <div style={labelStyle}>{item.label}</div>
                                  <div style={{ fontFamily: outfit, fontSize: '.76rem', fontWeight: 600, color: 'var(--color-text)' }}>{item.value}</div>
                                </div>
                              ))}
                            </div>

                            <div style={{ marginBottom: t.observacao ? 10 : 0 }}>
                              <div style={{ ...labelStyle, marginBottom: 4 }}>Descrição</div>
                              <div style={{ fontFamily: outfit, fontSize: '.76rem', color: 'var(--color-text-2)', lineHeight: 1.5 }}>
                                {t.description || '—'}
                              </div>
                            </div>

                            {t.observacao && (
                              <div style={{ marginBottom: 10 }}>
                                <div style={{ ...labelStyle, marginBottom: 4 }}>Observação</div>
                                <div style={{ fontFamily: outfit, fontSize: '.74rem', color: 'var(--color-text-muted)', lineHeight: 1.45, fontStyle: 'italic' }}>
                                  {t.observacao}
                                </div>
                              </div>
                            )}

                            {t.aiClassified && (
                              <div style={{ background: 'rgba(0,212,170,.04)', border: '1px solid rgba(0,212,170,.12)', borderRadius: R, padding: '10px 12px', marginTop: 10 }}>
                                <div style={{ fontFamily: outfit, fontSize: '.56rem', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--color-brand)', marginBottom: 8 }}>✦ Classificação LAT</div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
                                  {[
                                    { label: 'Prioridade', value: PRIO_LABEL[t.priority] ?? t.priority, color: PRIO_COLOR[t.priority] ?? 'var(--color-text-muted)' },
                                    { label: 'Esforço',    value: EFFORT_LABEL[t.effort] ?? t.effort,   color: 'var(--color-text-muted)' },
                                    { label: 'Previsão',   value: t.estimatedDate ?? '—',                color: 'var(--color-text-muted)' },
                                  ].map(item => (
                                    <div key={item.label} style={{ background: 'var(--color-surface)', borderRadius: R, padding: '6px 8px' }}>
                                      <div style={{ fontFamily: outfit, fontSize: '.52rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 2 }}>{item.label}</div>
                                      <div style={{ fontFamily: mono, fontSize: '.72rem', fontWeight: 700, color: item.color }}>{item.value}</div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            <div style={{ fontFamily: outfit, fontSize: '.56rem', color: 'var(--color-text-muted)', marginTop: 10, textAlign: 'right' }}>
                              duplo clique para editar
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

        </div>
      </div>

      {/* ── Modal Nova Requisição ── */}
      {showModal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) { setShowModal(false); setClassified(null) } }}>
          <div className="modal">
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
              <div>
                <div style={{ fontFamily: outfit, fontSize: '.64rem', fontWeight: 700, letterSpacing: '.09em', textTransform: 'uppercase', color: '#3B82F6', marginBottom: 4 }}>Nova Requisição</div>
                <div style={{ fontFamily: outfit, fontSize: '1rem', fontWeight: 700, letterSpacing: '-.02em' }}>Descreva a solicitação</div>
              </div>
              <button onClick={() => { setShowModal(false); setClassified(null) }} style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', fontSize: '1.1rem', cursor: 'pointer', lineHeight: 1, padding: 4 }}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontFamily: outfit, fontSize: '.63rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--color-text-muted)', display: 'block', marginBottom: 5 }}>Título</label>
                <input
                  type="text"
                  placeholder="Ex: Adicionar filtro de período no painel DOH"
                  value={form.title}
                  onChange={e => { setForm(f => ({ ...f, title: e.target.value })); setClassified(null) }}
                  style={{ width: '100%', background: 'var(--input-bg)', border: '1px solid var(--color-border)', borderRadius: R, padding: '8px 11px', color: 'var(--color-text)', fontSize: '.83rem', fontFamily: outfit, transition: 'all 140ms' }}
                />
              </div>

              <div>
                <label style={{ fontFamily: outfit, fontSize: '.63rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--color-text-muted)', display: 'block', marginBottom: 5 }}>Descrição</label>
                <textarea
                  placeholder="Detalhe o problema ou melhoria. Quanto mais contexto, melhor a classificação automática."
                  value={form.description}
                  onChange={e => { setForm(f => ({ ...f, description: e.target.value })); setClassified(null) }}
                  rows={4}
                  style={{ width: '100%', background: 'var(--input-bg)', border: '1px solid var(--color-border)', borderRadius: R, padding: '8px 11px', color: 'var(--color-text)', fontSize: '.83rem', fontFamily: outfit, resize: 'vertical', transition: 'all 140ms' }}
                />
              </div>

              {!classified && (
                <button
                  onClick={classify}
                  disabled={classifying || !form.title.trim() || !form.description.trim()}
                  style={{
                    padding: '9px', borderRadius: R,
                    background: classifying ? 'rgba(0,212,170,.05)' : 'rgba(0,212,170,.10)',
                    border: '1px solid rgba(0,212,170,.25)',
                    color: (!form.title.trim() || !form.description.trim()) ? 'var(--color-text-muted)' : 'var(--color-brand)',
                    fontFamily: outfit, fontSize: '.8rem', fontWeight: 700,
                    cursor: classifying || !form.title.trim() || !form.description.trim() ? 'not-allowed' : 'pointer',
                    transition: 'all 140ms',
                  }}
                >
                  {classifying ? '✦ Classificando···' : '✦ Classificar com LAT Intelligence'}
                </button>
              )}

              {classified && (
                <div style={{ background: 'rgba(0,212,170,.04)', border: '1px solid rgba(0,212,170,.16)', borderRadius: R, padding: '13px 15px' }}>
                  <div style={{ fontFamily: outfit, fontSize: '.62rem', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--color-brand)', marginBottom: 10 }}>✦ Classificação LAT</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 10 }}>
                    {[
                      { label: 'Prioridade', value: PRIO_LABEL[classified.priority], color: PRIO_COLOR[classified.priority] },
                      { label: 'Sprint',     value: `Sprint ${classified.sprint}`,   color: 'var(--color-text-muted)' },
                      { label: 'Previsão',   value: classified.estimatedDate,         color: 'var(--color-text-muted)' },
                    ].map(item => (
                      <div key={item.label} style={{ background: 'var(--color-surface)', borderRadius: R, padding: '7px 9px' }}>
                        <div style={{ fontFamily: outfit, fontSize: '.56rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 3 }}>{item.label}</div>
                        <div style={{ fontFamily: mono, fontSize: '.76rem', fontWeight: 700, color: item.color }}>{item.value}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ fontFamily: outfit, fontSize: '.74rem', color: 'var(--color-text-muted)', lineHeight: 1.45, fontStyle: 'italic' }}>{classified.reasoning}</div>
                </div>
              )}

              {classified && (
                <button
                  onClick={submit}
                  disabled={submitting}
                  style={{
                    padding: '10px', borderRadius: R,
                    background: submitting ? 'rgba(59,130,246,.08)' : 'rgba(59,130,246,.16)',
                    border: '1px solid rgba(59,130,246,.35)',
                    color: '#3B82F6', fontFamily: outfit,
                    fontSize: '.83rem', fontWeight: 700,
                    cursor: submitting ? 'not-allowed' : 'pointer', transition: 'all 140ms',
                  }}
                >
                  {submitting ? 'Registrando···' : '+ Registrar Requisição'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Magic Importer ── */}
      {showImporter && (
        <MagicImporter
          projectId={projectId}
          clientName={project?.clientName ?? ''}
          brandColor={project?.clientColor ?? '#00D4AA'}
          onClose={() => setShowImporter(false)}
          onCreateTicket={handleImportTicket}
        />
      )}
    </>
  )
}
