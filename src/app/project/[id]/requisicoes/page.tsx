'use client'

// Adicione GEMINI_API_KEY=sua_chave em .env.local

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
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

const STATUS_CFG: Record<TicketStatus, { label: string; color: string; bg: string; border: string }> = {
  aberto:       { label: '○ Aberto',       color: '#9898B0', bg: 'rgba(255,255,255,.04)', border: 'rgba(255,255,255,.10)' },
  andamento:    { label: '⟳ Em Andamento', color: '#3B82F6', bg: 'rgba(59,130,246,.13)',  border: 'rgba(59,130,246,.28)'  },
  implementado: { label: '✓ Implementado', color: '#10B981', bg: 'rgba(16,185,129,.13)',  border: 'rgba(16,185,129,.28)'  },
  cancelado:    { label: '✕ Cancelado',    color: '#EF4444', bg: 'rgba(239,68,68,.10)',   border: 'rgba(239,68,68,.25)'   },
}

const PRIO_COLOR = { hi: '#EF4444', md: '#F5A623', lo: '#3B82F6' }
const PRIO_LABEL = { hi: 'Alta', md: 'Média', lo: 'Baixa' }
const EFFORT_LABEL = { low: 'Baixo', medium: 'Médio', high: 'Alto' }

const mono = '"JetBrains Mono", monospace'
const outfit = 'var(--font-outfit), sans-serif'
const glass = { background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.065)' }
const R = '5px'

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

  // ── Botões na TopNav ──
  useEffect(() => {
    const accent = project?.clientColor ?? '#00D4AA'
    setActions(
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button
          onClick={() => setShowImporter(true)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '6px 14px', borderRadius: R,
            background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.10)',
            color: '#9898B0', fontFamily: outfit,
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
  }, [setActions, clearActions, project])

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
      await createTicket(projectId, project.clientName, {
        title: form.title,
        description: form.description,
        source: 'internal',
        createdByEmail: user.email ?? '',
        createdByName: user.displayName ?? user.email ?? 'Gestor',
        priority: classified.priority,
        sprint: classified.sprint,
        estimatedDate: classified.estimatedDate,
        effort: classified.effort,
      })
      setForm({ title: '', description: '' })
      setClassified(null)
      setShowModal(false)
    } catch (e) { console.error(e) }
    finally { setSubmitting(false) }
  }, [classified, project, user, projectId, form])

  const handleStatus = useCallback(async (ticketId: string, status: TicketStatus) => {
    setSavingId(ticketId)
    await updateTicketStatus(projectId, ticketId, status)
    setSavingId(null)
  }, [projectId])

  // ── Import ticket from MagicImporter ──
  const handleImportTicket = useCallback(async (data: {
    title: string
    description: string
    priority: 'hi' | 'md' | 'lo'
    assignee: string | null
    notes: string | null
  }) => {
    if (!project || !user) return
    await createTicket(projectId, project.clientName, {
      title: data.title,
      description: data.description,
      source: 'internal',
      createdByEmail: user.email ?? '',
      createdByName: user.displayName ?? user.email ?? 'Gestor',
      priority: data.priority,
      sprint: 2,
      estimatedDate: 'A definir',
      effort: 'medium',
    })
  }, [project, user, projectId])

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
        .ticket-row:hover { background: rgba(255,255,255,0.018) !important; }
        .modal-overlay {
          position:fixed;inset:0;background:rgba(0,0,0,.75);
          backdrop-filter:blur(6px);z-index:200;
          display:flex;align-items:center;justify-content:center;padding:24px;
        }
        .modal {
          background:#0E0E18;border:1px solid rgba(255,255,255,.09);
          border-radius:5px;width:100%;max-width:540px;padding:26px;
          animation:fadeIn .18s ease-out both;
        }
        select option { background:#1A1A2C;color:#F0F0F5; }
        textarea:focus, input:focus {
          outline:none;
          border-color:rgba(59,130,246,.4)!important;
          background:rgba(59,130,246,.04)!important;
        }
      `}</style>

      <div style={{ minHeight: '100vh', background: '#050508', color: '#F0F0F5', fontFamily: outfit, paddingBottom: 80 }}>
        <div style={{ maxWidth: 1180, margin: '0 auto', padding: '28px 24px 0' }}>

          {/* ── Stats ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 8, marginBottom: 20 }}>
            {([
              ['all',          'Total',         '#F0F0F5'],
              ['aberto',       'Abertos',        '#9898B0'],
              ['andamento',    'Em Andamento',   '#3B82F6'],
              ['implementado', 'Implementados',  '#10B981'],
              ['cancelado',    'Cancelados',     '#EF4444'],
            ] as const).map(([k, l, c]) => (
              <div key={k} style={{ ...glass, borderRadius: R, padding: '12px 14px' }}>
                <div style={{ fontFamily: outfit, fontSize: '1.4rem', fontWeight: 700, color: c, lineHeight: 1, marginBottom: 3 }}>
                  {counts[k]}
                </div>
                <div style={{ fontSize: '.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: '#5A5A72' }}>{l}</div>
              </div>
            ))}
          </div>

          {/* ── Filtros ── */}
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 16 }}>
            {([
              ['all',          'Todos',          '#00D4AA'],
              ['aberto',       'Abertos',        '#9898B0'],
              ['andamento',    'Em Andamento',   '#3B82F6'],
              ['implementado', 'Implementados',  '#10B981'],
              ['cancelado',    'Cancelados',     '#EF4444'],
            ] as const).map(([k, l, c]) => {
              const on = filterStatus === k
              return (
                <button key={k}
                  onClick={() => setFilterStatus(k)}
                  style={{
                    padding: '5px 12px', borderRadius: R,
                    border: `1px solid ${on ? `${c}55` : 'rgba(255,255,255,.07)'}`,
                    background: on ? `${c}12` : 'transparent',
                    color: on ? c : '#5A5A72',
                    fontFamily: outfit,
                    fontSize: '.72rem', fontWeight: 600,
                    cursor: 'pointer', transition: 'all 140ms',
                  }}
                >{l}</button>
              )
            })}
          </div>

          {/* ── Lista ── */}
          <div style={{ ...glass, borderRadius: R, overflow: 'hidden' }}>
            {visible.length === 0 ? (
              <div style={{ padding: '40px 24px', textAlign: 'center', color: '#5A5A72', fontSize: '.84rem' }}>
                {tickets.length === 0
                  ? 'Nenhuma requisição registrada ainda.'
                  : 'Nenhum item com o filtro selecionado.'}
              </div>
            ) : visible.map((t, i) => {
              const sc = STATUS_CFG[t.status]
              return (
                <div key={t.id} className="ticket-row" style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '12px 16px',
                  borderTop: i === 0 ? 'none' : '1px solid rgba(255,255,255,0.055)',
                  background: '#0E0E18', transition: 'background 140ms',
                }}>
                  {/* Prio strip */}
                  <div style={{ width: 3, height: 34, borderRadius: 2, background: PRIO_COLOR[t.priority], flexShrink: 0 }} />

                  {/* ID */}
                  <div style={{ fontFamily: mono, fontSize: '.63rem', fontWeight: 600, color: '#5A5A72', minWidth: 56, flexShrink: 0 }}>{t.id}</div>

                  {/* Body */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: outfit, fontSize: '.79rem', fontWeight: 500, color: '#F0F0F5', marginBottom: 4, lineHeight: 1.35 }}>{t.title}</div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                      {[
                        `Sprint ${t.sprint}`,
                        t.estimatedDate,
                        `Esforço: ${EFFORT_LABEL[t.effort]}`,
                        t.source === 'public' ? '🌐 Indústria' : '🔒 Interno',
                      ].map((item, idx, arr) => (
                        <span key={idx} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontFamily: outfit, fontSize: '.6rem', color: '#5A5A72' }}>{item}</span>
                          {idx < arr.length - 1 && <span style={{ width: 2, height: 2, borderRadius: '50%', background: '#5A5A72', flexShrink: 0 }} />}
                        </span>
                      ))}
                      {t.aiClassified && (
                        <span style={{ fontFamily: outfit, fontSize: '.58rem', color: '#00D4AA', opacity: .7 }}>· ✦ IA</span>
                      )}
                    </div>
                  </div>

                  {/* Controls */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    {savingId === t.id && <span style={{ fontFamily: mono, fontSize: '.6rem', color: '#5A5A72' }}>···</span>}
                    <div style={{ position: 'relative' }}>
                      <select
                        value={t.status}
                        onChange={e => handleStatus(t.id, e.target.value as TicketStatus)}
                        style={{
                          appearance: 'none', WebkitAppearance: 'none',
                          border: `1px solid ${sc.border}`, outline: 'none', cursor: 'pointer',
                          padding: '5px 22px 5px 9px', borderRadius: R,
                          fontSize: '.7rem', fontWeight: 700,
                          fontFamily: outfit,
                          background: sc.bg, color: sc.color,
                          minWidth: 136, transition: 'all 140ms',
                        }}
                      >
                        {Object.entries(STATUS_CFG).map(([k, v]) => (
                          <option key={k} value={k}>{v.label}</option>
                        ))}
                      </select>
                      <span style={{ position: 'absolute', right: 7, top: '50%', transform: 'translateY(-50%)', fontSize: '.5rem', pointerEvents: 'none', color: sc.color }}>▾</span>
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
              <button onClick={() => { setShowModal(false); setClassified(null) }} style={{ background: 'none', border: 'none', color: '#5A5A72', fontSize: '1.1rem', cursor: 'pointer', lineHeight: 1, padding: 4 }}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontFamily: outfit, fontSize: '.63rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: '#5A5A72', display: 'block', marginBottom: 5 }}>Título</label>
                <input
                  type="text"
                  placeholder="Ex: Adicionar filtro de período no painel DOH"
                  value={form.title}
                  onChange={e => { setForm(f => ({ ...f, title: e.target.value })); setClassified(null) }}
                  style={{ width: '100%', background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.09)', borderRadius: R, padding: '8px 11px', color: '#F0F0F5', fontSize: '.83rem', fontFamily: outfit, transition: 'all 140ms' }}
                />
              </div>

              <div>
                <label style={{ fontFamily: outfit, fontSize: '.63rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: '#5A5A72', display: 'block', marginBottom: 5 }}>Descrição</label>
                <textarea
                  placeholder="Detalhe o problema ou melhoria. Quanto mais contexto, melhor a classificação automática."
                  value={form.description}
                  onChange={e => { setForm(f => ({ ...f, description: e.target.value })); setClassified(null) }}
                  rows={4}
                  style={{ width: '100%', background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.09)', borderRadius: R, padding: '8px 11px', color: '#F0F0F5', fontSize: '.83rem', fontFamily: outfit, resize: 'vertical', transition: 'all 140ms' }}
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
                    color: (!form.title.trim() || !form.description.trim()) ? '#5A5A72' : '#00D4AA',
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
                  <div style={{ fontFamily: outfit, fontSize: '.62rem', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: '#00D4AA', marginBottom: 10 }}>✦ Classificação LAT</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 10 }}>
                    {[
                      { label: 'Prioridade', value: PRIO_LABEL[classified.priority], color: PRIO_COLOR[classified.priority] },
                      { label: 'Sprint',     value: `Sprint ${classified.sprint}`,   color: '#9898B0' },
                      { label: 'Previsão',   value: classified.estimatedDate,         color: '#9898B0' },
                    ].map(item => (
                      <div key={item.label} style={{ background: 'rgba(255,255,255,.03)', borderRadius: R, padding: '7px 9px' }}>
                        <div style={{ fontFamily: outfit, fontSize: '.56rem', color: '#5A5A72', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 3 }}>{item.label}</div>
                        <div style={{ fontFamily: mono, fontSize: '.76rem', fontWeight: 700, color: item.color }}>{item.value}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ fontFamily: outfit, fontSize: '.74rem', color: '#9898B0', lineHeight: 1.45, fontStyle: 'italic' }}>{classified.reasoning}</div>
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
