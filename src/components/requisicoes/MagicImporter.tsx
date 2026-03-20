'use client'

import { useState, useRef, useCallback, DragEvent } from 'react'
import * as XLSX from 'xlsx'

// ─── Types ───────────────────────────────────────────────────────────────────

type Priority = 'hi' | 'md' | 'lo'

interface DetectedTicket {
  title: string
  description: string
  priority: Priority
  assignee: string | null
  notes: string | null
  tipo: string
  criticidade: string
  impacto: string
  observacao: string
  selected: boolean
}

interface MagicImporterProps {
  projectId: string
  clientName: string
  brandColor: string
  onClose: () => void
  onCreateTicket: (data: {
    title: string
    description: string
    priority: Priority
    assignee: string | null
    notes: string | null
    tipo: string
    criticidade: string
    impacto: string
    observacao: string
  }) => Promise<void>
}

// ─── Constants ───────────────────────────────────────────────────────────────

const outfit = 'var(--font-outfit), sans-serif'
const mono = '"JetBrains Mono", monospace'
const R = '5px'
const PRIO_CFG: Record<Priority, { label: string; color: string; bg: string }> = {
  hi: { label: 'Alta',  color: '#EF4444', bg: 'rgba(239,68,68,.12)' },
  md: { label: 'Média', color: '#F5A623', bg: 'rgba(245,166,35,.12)' },
  lo: { label: 'Baixa', color: '#3B82F6', bg: 'rgba(59,130,246,.12)' },
}
const PRIO_CYCLE: Priority[] = ['lo', 'md', 'hi']

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      resolve(result.split(',')[1])
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function complexidadeToPriority(complexidade: string): Priority {
  const val = (complexidade ?? '').toLowerCase().trim()
  if (val === 'alto' || val === 'alta') return 'hi'
  if (val === 'médio' || val === 'medio' || val === 'média' || val === 'media') return 'md'
  return 'lo'
}

function tryParseExcelDirect(file: File): Promise<DetectedTicket[] | null> {
  return new Promise(async (resolve) => {
    try {
      const name = file.name.toLowerCase()
      if (!name.endsWith('.xlsx') && !name.endsWith('.xls') && !name.endsWith('.csv')) {
        return resolve(null)
      }

      const buffer = await file.arrayBuffer()
      const wb = XLSX.read(buffer, { type: 'array' })
      const sheet = wb.Sheets[wb.SheetNames[0]]
      const rows: Record<string, string>[] = XLSX.utils.sheet_to_json(sheet, { defval: '' })

      if (rows.length === 0) return resolve(null)

      // Check if known columns exist
      const firstRow = rows[0]
      const keys = Object.keys(firstRow).map(k => k.trim().toLowerCase())
      const hasTema = keys.some(k => k === 'tema')

      if (!hasTema) return resolve(null)

      // Direct mapping
      const tickets: DetectedTicket[] = rows
        .filter(r => {
          const tema = findCol(r, 'tema')
          return tema.trim().length > 0
        })
        .map(r => ({
          title: findCol(r, 'tema'),
          description: findCol(r, 'escopo'),
          priority: complexidadeToPriority(findCol(r, 'complexidade')),
          assignee: null,
          notes: null,
          tipo: findCol(r, 'tipo') || 'Melhoria',
          criticidade: findCol(r, 'criticidade') || 'Médio',
          impacto: findCol(r, 'impacto') || 'Médio',
          observacao: findCol(r, 'obs'),
          selected: true,
        }))

      resolve(tickets.length > 0 ? tickets : null)
    } catch {
      resolve(null)
    }
  })
}

function findCol(row: Record<string, string>, colName: string): string {
  const target = colName.toLowerCase().trim()
  for (const [key, value] of Object.entries(row)) {
    if (key.trim().toLowerCase() === target) return String(value ?? '').trim()
  }
  return ''
}

async function fileToText(file: File): Promise<{ content: string; mimeType?: string }> {
  const name = file.name.toLowerCase()

  // Excel / CSV
  if (name.endsWith('.xlsx') || name.endsWith('.xls') || name.endsWith('.csv')) {
    const buffer = await file.arrayBuffer()
    const wb = XLSX.read(buffer, { type: 'array' })
    const lines: string[] = []
    for (const sheetName of wb.SheetNames) {
      const sheet = wb.Sheets[sheetName]
      const csv = XLSX.utils.sheet_to_csv(sheet)
      lines.push(`--- ${sheetName} ---\n${csv}`)
    }
    return { content: lines.join('\n\n') }
  }

  // Image
  if (file.type.startsWith('image/')) {
    const b64 = await fileToBase64(file)
    return { content: b64, mimeType: file.type }
  }

  // PDF
  if (file.type === 'application/pdf') {
    const b64 = await fileToBase64(file)
    return { content: b64, mimeType: 'application/pdf' }
  }

  // Fallback: read as text
  const text = await file.text()
  return { content: text }
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function MagicImporter({
  projectId,
  clientName,
  brandColor,
  onClose,
  onCreateTicket,
}: MagicImporterProps) {
  const [step, setStep] = useState<'input' | 'preview' | 'importing'>('input')

  // Input state
  const [text, setText] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [interpreting, setInterpreting] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // Preview state
  const [tickets, setTickets] = useState<DetectedTicket[]>([])

  // Import state
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 })

  // ── File handling ──
  const handleFile = useCallback((f: File) => {
    setFile(f)
  }, [])

  const onDrop = useCallback((e: DragEvent) => {
    e.preventDefault()
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }, [handleFile])

  const onDragOver = useCallback((e: DragEvent) => {
    e.preventDefault()
  }, [])

  // ── Interpret ──
  const interpret = useCallback(async () => {
    setInterpreting(true)
    try {
      // Try direct Excel parsing first
      if (file) {
        const direct = await tryParseExcelDirect(file)
        if (direct) {
          setTickets(direct)
          setStep('preview')
          return
        }
      }

      // Fallback to Gemini
      let payload: { content: string; mimeType?: string }

      if (file) {
        payload = await fileToText(file)
      } else {
        payload = { content: text }
      }

      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()

      if (data.ok && Array.isArray(data.tickets)) {
        setTickets(data.tickets.map((t: any) => ({
          title: t.title ?? '',
          description: t.description ?? '',
          priority: (['hi', 'md', 'lo'].includes(t.priority) ? t.priority : 'md') as Priority,
          assignee: t.assignee ?? null,
          notes: t.notes ?? null,
          tipo: t.tipo ?? 'Melhoria',
          criticidade: t.criticidade ?? 'Médio',
          impacto: t.impacto ?? 'Médio',
          observacao: t.observacao ?? '',
          selected: true,
        })))
        setStep('preview')
      } else {
        console.error('Gemini error:', data.error)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setInterpreting(false)
    }
  }, [text, file])

  // ── Toggle / edit ──
  const toggleTicket = (idx: number) => {
    setTickets(prev => prev.map((t, i) => i === idx ? { ...t, selected: !t.selected } : t))
  }

  const editTitle = (idx: number, title: string) => {
    setTickets(prev => prev.map((t, i) => i === idx ? { ...t, title } : t))
  }

  const cyclePriority = (idx: number) => {
    setTickets(prev => prev.map((t, i) => {
      if (i !== idx) return t
      const currentIdx = PRIO_CYCLE.indexOf(t.priority)
      const next = PRIO_CYCLE[(currentIdx + 1) % PRIO_CYCLE.length]
      return { ...t, priority: next }
    }))
  }

  // ── Create tickets ──
  const createAll = useCallback(async () => {
    const selected = tickets.filter(t => t.selected)
    if (selected.length === 0) return

    setStep('importing')
    setImportProgress({ current: 0, total: selected.length })

    for (let i = 0; i < selected.length; i++) {
      const t = selected[i]
      await onCreateTicket({
        title: t.title,
        description: t.description,
        priority: t.priority,
        assignee: t.assignee,
        notes: t.notes,
        tipo: t.tipo,
        criticidade: t.criticidade,
        impacto: t.impacto,
        observacao: t.observacao,
      })
      setImportProgress({ current: i + 1, total: selected.length })
    }

    onClose()
  }, [tickets, onCreateTicket, onClose])

  const selectedCount = tickets.filter(t => t.selected).length
  const canInterpret = text.trim().length > 0 || file !== null

  return (
    <>
      <style>{`
        @keyframes magicFadeIn { from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)} }
        .magic-overlay {
          position:fixed;inset:0;background:rgba(0,0,0,.75);
          backdrop-filter:blur(6px);z-index:200;
          display:flex;align-items:center;justify-content:center;padding:24px;
        }
        .magic-modal {
          background:#0E0E18;border:1px solid rgba(255,255,255,.09);
          border-radius:5px;width:100%;max-width:620px;padding:28px;
          animation:magicFadeIn .18s ease-out both;
          max-height:85vh;overflow-y:auto;
        }
        .magic-modal::-webkit-scrollbar { width:4px; }
        .magic-modal::-webkit-scrollbar-track { background:transparent; }
        .magic-modal::-webkit-scrollbar-thumb { background:rgba(255,255,255,.08);border-radius:2px; }
        .magic-ticket:hover { background:rgba(255,255,255,.015)!important; }
        .magic-title-input:focus { outline:none;border-color:rgba(255,255,255,.18)!important;background:rgba(255,255,255,.03)!important; }
        .magic-drop-zone:hover { border-color:rgba(255,255,255,.22)!important;background:rgba(255,255,255,.02)!important; }
      `}</style>

      <div className="magic-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
        <div className="magic-modal">

          {/* ── Header ── */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>
              <div style={{ fontFamily: outfit, fontSize: '1rem', fontWeight: 700, letterSpacing: '-.02em', color: '#F0F0F5', marginBottom: 4 }}>
                Importar Requisições
              </div>
              <div style={{ fontFamily: outfit, fontSize: '.78rem', color: '#5A5A72' }}>
                {step === 'input' && 'Cole um email, lista ou envie um arquivo — a IA interpreta tudo.'}
                {step === 'preview' && `${tickets.length} solicitações encontradas — revise e confirme`}
                {step === 'importing' && 'Criando tickets···'}
              </div>
            </div>
            <button
              onClick={onClose}
              style={{ background: 'none', border: 'none', color: '#5A5A72', fontSize: '1.1rem', cursor: 'pointer', lineHeight: 1, padding: 4 }}
            >✕</button>
          </div>

          {/* ── STEP: INPUT ── */}
          {step === 'input' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <textarea
                placeholder="Cole aqui o conteúdo do email, lista de ajustes, texto do WhatsApp... qualquer formato."
                value={text}
                onChange={e => setText(e.target.value)}
                style={{
                  width: '100%', height: 160, resize: 'vertical',
                  background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.09)',
                  borderRadius: R, padding: '10px 12px',
                  color: '#F0F0F5', fontSize: '.83rem', fontFamily: outfit,
                  transition: 'all 140ms',
                }}
              />

              {/* Drop zone */}
              <div
                className="magic-drop-zone"
                onDrop={onDrop}
                onDragOver={onDragOver}
                onClick={() => fileRef.current?.click()}
                style={{
                  border: '1px dashed rgba(255,255,255,.12)',
                  borderRadius: R, padding: 20, textAlign: 'center',
                  cursor: 'pointer', color: '#5A5A72',
                  fontFamily: outfit, fontSize: '.78rem',
                  transition: 'all 140ms',
                }}
              >
                {file ? (
                  <span style={{ color: '#00D4AA', fontWeight: 600 }}>{file.name}</span>
                ) : (
                  'ou arraste um arquivo aqui — imagem, Excel, PDF, qualquer coisa'
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*,.pdf,.xlsx,.xls,.csv"
                  style={{ display: 'none' }}
                  onChange={e => {
                    const f = e.target.files?.[0]
                    if (f) handleFile(f)
                  }}
                />
              </div>

              {/* Interpret button */}
              <button
                onClick={interpret}
                disabled={interpreting || !canInterpret}
                style={{
                  padding: '10px', borderRadius: R,
                  background: interpreting ? 'rgba(0,212,170,.05)' : 'rgba(0,212,170,.12)',
                  border: '1px solid rgba(0,212,170,.25)',
                  color: !canInterpret ? '#5A5A72' : '#00D4AA',
                  fontFamily: outfit, fontSize: '.8rem', fontWeight: 700,
                  cursor: interpreting || !canInterpret ? 'not-allowed' : 'pointer',
                  transition: 'all 140ms',
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width={14} height={14} viewBox="0 0 50 50" style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }}>
                  <path d="M19.861,27.625v-0.716l-16.65-0.681L2.07,25.985L1,24.575l0.11-0.703l0.959-0.645l17.95,1.345l0.11-0.314L5.716,14.365l-0.729-0.924l-0.314-2.016L5.985,9.98l2.214,0.24l11.312,8.602l0.327-0.353L12.623,5.977c0,0-0.548-2.175-0.548-2.697l1.494-2.029l0.827-0.266l2.833,0.995l7.935,17.331h0.314l1.348-14.819l0.752-1.822l1.494-0.985l1.167,0.557l0.959,1.374l-2.551,14.294h0.425l0.486-0.486l8.434-10.197l1.092-0.862h2.065l1.52,2.259l-0.681,2.334l-7.996,11.108l0.146,0.217l0.376-0.036l12.479-2.405l1.666,0.778l0.182,0.791l-0.655,1.617l-15.435,3.523l-0.084,0.062l0.097,0.12l13.711,0.814l1.578,1.044L49,29.868l-0.159,0.972l-2.431,1.238l-13.561-3.254h-0.363v0.217l11.218,10.427l0.256,1.154l-0.645,0.911l-0.681-0.097l-9.967-8.058h-0.256v0.34l5.578,8.35l0.243,2.162l-0.34,0.703l-1.215,0.425l-1.335-0.243l-7.863-12.083l-0.279,0.159l-1.348,14.524l-0.632,0.742l-1.459,0.558l-1.215-0.924L21.9,46.597l2.966-14.939l-0.023-0.084l-0.279,0.036L13.881,45.138l-0.827,0.327l-1.433-0.742l0.133-1.326l0.801-1.18l9.52-12.019l-0.013-0.314h-0.11l-12.69,8.239l-2.259,0.292L6.03,37.505l0.12-1.494l0.46-0.486L19.861,27.625z" fill="currentColor" />
                </svg>
                {interpreting ? '✦ Importando···' : '✦ Importar com LAT'}
              </button>
            </div>
          )}

          {/* ── STEP: PREVIEW ── */}
          {step === 'preview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{
                background: 'rgba(255,255,255,.025)', border: '1px solid rgba(255,255,255,.065)',
                borderRadius: R, overflow: 'hidden',
              }}>
                {tickets.map((t, i) => {
                  const pc = PRIO_CFG[t.priority]
                  return (
                    <div
                      key={i}
                      className="magic-ticket"
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '10px 14px',
                        borderTop: i === 0 ? 'none' : '1px solid rgba(255,255,255,.055)',
                        background: 'transparent', transition: 'background 140ms',
                      }}
                    >
                      {/* Checkbox */}
                      <div
                        onClick={() => toggleTicket(i)}
                        style={{
                          width: 18, height: 18, borderRadius: 5,
                          border: `1px solid ${t.selected ? '#00D4AA' : 'rgba(255,255,255,.15)'}`,
                          background: t.selected ? 'rgba(0,212,170,.15)' : 'transparent',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          cursor: 'pointer', flexShrink: 0, transition: 'all 140ms',
                          fontSize: '.6rem', color: '#00D4AA',
                        }}
                      >
                        {t.selected && '✓'}
                      </div>

                      {/* Title (editable) */}
                      <input
                        className="magic-title-input"
                        value={t.title}
                        onChange={e => editTitle(i, e.target.value)}
                        style={{
                          flex: 1, minWidth: 0,
                          background: 'transparent', border: '1px solid transparent',
                          borderRadius: 5, padding: '3px 6px',
                          fontFamily: mono, fontSize: '.76rem', fontWeight: 500,
                          color: t.selected ? '#F0F0F5' : '#5A5A72',
                          transition: 'all 140ms',
                        }}
                      />

                      {/* Tipo badge */}
                      {t.tipo && (
                        <span style={{ fontFamily: outfit, fontSize: '.56rem', color: '#5A5A72', flexShrink: 0 }}>
                          {t.tipo}
                        </span>
                      )}

                      {/* Priority badge (clickable) */}
                      <button
                        onClick={() => cyclePriority(i)}
                        style={{
                          padding: '3px 8px', borderRadius: 5,
                          background: pc.bg, border: 'none',
                          fontFamily: outfit, fontSize: '.6rem', fontWeight: 700,
                          textTransform: 'uppercase', letterSpacing: '.05em',
                          color: pc.color, cursor: 'pointer',
                          flexShrink: 0, transition: 'all 140ms',
                        }}
                      >
                        {pc.label}
                      </button>

                      {/* Assignee */}
                      {t.assignee && (
                        <span style={{ fontFamily: mono, fontSize: '.6rem', color: '#5A5A72', flexShrink: 0 }}>
                          {t.assignee}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <button
                  onClick={() => { setStep('input'); setTickets([]) }}
                  style={{
                    padding: '9px 16px', borderRadius: R,
                    background: 'transparent', border: '1px solid rgba(255,255,255,.09)',
                    color: '#5A5A72', fontFamily: outfit,
                    fontSize: '.78rem', fontWeight: 600, cursor: 'pointer',
                    transition: 'all 140ms',
                  }}
                >
                  Voltar
                </button>
                <button
                  onClick={createAll}
                  disabled={selectedCount === 0}
                  style={{
                    flex: 1, padding: '9px', borderRadius: R,
                    background: selectedCount === 0 ? 'rgba(59,130,246,.06)' : 'rgba(59,130,246,.15)',
                    border: '1px solid rgba(59,130,246,.35)',
                    color: selectedCount === 0 ? '#5A5A72' : '#3B82F6',
                    fontFamily: outfit, fontSize: '.8rem', fontWeight: 700,
                    cursor: selectedCount === 0 ? 'not-allowed' : 'pointer',
                    transition: 'all 140ms',
                  }}
                >
                  Criar {selectedCount} ticket{selectedCount !== 1 ? 's' : ''} selecionado{selectedCount !== 1 ? 's' : ''}
                </button>
              </div>
            </div>
          )}

          {/* ── STEP: IMPORTING ── */}
          {step === 'importing' && (
            <div style={{
              padding: '40px 20px', textAlign: 'center',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
            }}>
              <div style={{ fontFamily: outfit, fontSize: '.9rem', fontWeight: 700, color: '#F0F0F5' }}>
                Criando tickets···
              </div>
              <div style={{ fontFamily: mono, fontSize: '.8rem', color: '#5A5A72' }}>
                {importProgress.current} de {importProgress.total}
              </div>
              <div style={{
                width: 200, height: 3, background: 'rgba(255,255,255,.06)',
                borderRadius: 100, overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%', borderRadius: 100,
                  background: '#3B82F6',
                  width: importProgress.total > 0
                    ? `${Math.round((importProgress.current / importProgress.total) * 100)}%`
                    : '0%',
                  transition: 'width .3s ease',
                }} />
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  )
}
