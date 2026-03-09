'use client'
import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Palette, Building2, Users, Calendar, ArrowRight } from 'lucide-react'
import { createProject } from '@/lib/firestore'
import DatePicker from '@/components/ui/DatePicker'
import ColorPickerField from '@/components/ui/ColorPickerField'
import { hexToRgb } from '@/lib/theme'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import type { PhaseStatus } from '@/types'

interface Props {
  onClose: () => void
  onCreated?: (id: string) => void
}

function generatePhases(startDate: string, distributorCount: number) {
  const addDays = (date: Date, days: number) => {
    const d = new Date(date)
    d.setDate(d.getDate() + days)
    return d
  }
  const fmt = (d: Date) => d.toISOString().split('T')[0]
  let cursor = new Date(startDate)

  const phase = (name: string, days: number) => {
    const s = new Date(cursor)
    const e = addDays(cursor, days - 1)
    cursor = addDays(cursor, days)
    return {
      id:        `phase-${Math.random().toString(36).slice(2)}`,
      name,
      startDate: fmt(s),
      endDate:   fmt(e),
      status:    'pending' as PhaseStatus,
    }
  }

  const totalWeeks = Math.max(1, Math.ceil(distributorCount / 7))

  const phases = [
    phase('Apresentação de KickOff',               3),
    phase('Levantamento e Definição de Requisitos', 15),
    phase('PIC Interno',                            7),
    phase('Apresentação PIC ao Cliente',            15),
    phase('Apresentação ao Time Comercial',         7),
    phase('Apresentação aos Distribuidores',        7),
    phase('Integrações com as Distribuidoras',      Math.max(1, distributorCount)),
    phase('Status Report',                          7),
    phase('Alinhamento Semanal',                    totalWeeks),
    phase('Apresentação do BI',                     7),
    phase('Go-Live',                                2),
    phase('Handover',                               2),
  ]

  const estimatedEnd = fmt(addDays(cursor, -1))
  return { phases, estimatedEnd }
}

const FIELD_STYLE = {
  background: 'rgba(255,255,255,0.04)',
  border:     '1px solid rgba(255,255,255,0.08)',
  borderRadius: 5,
}

const FOCUS_STYLE = '1px solid rgba(255,255,255,0.22)'

export default function NewProjectModal({ onClose, onCreated }: Props) {
  const { user } = useAuth()
  const router   = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    clientName:           '',
    clientColor:          '#00D4AA',
    clientColorSecondary: '#8B5CF6',
    startDate:            new Date().toISOString().split('T')[0],
    endDate:              '',
    distributorCount:     30,
  })

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: k === 'distributorCount' ? Number(e.target.value) : e.target.value }))

  const { estimatedEnd } = useMemo(
    () => generatePhases(form.startDate, form.distributorCount),
    [form.startDate, form.distributorCount]
  )

  const fixedDays   = 3 + 15 + 7 + 15 + 7 + 7 + 7 + Math.max(1, Math.ceil(form.distributorCount / 7)) + 7 + 2 + 2
  const totalDays   = fixedDays + form.distributorCount

  const handleSubmit = async () => {
    if (!user)                   { toast.error('Usuário não autenticado'); return }
    if (!form.clientName.trim()) { toast.error('Informe o nome do cliente'); return }
    if (!form.startDate)         { toast.error('Informe a data de início'); return }

    setLoading(true)
    try {
      const { phases, estimatedEnd } = generatePhases(form.startDate, form.distributorCount)
      const endDate = form.endDate || estimatedEnd
      const id = await createProject(user.uid, {
        clientName:           form.clientName.trim(),
        clientColor:          form.clientColor,
        clientColorSecondary: form.clientColorSecondary,
        clientColorRgb:       hexToRgb(form.clientColor),
        startDate:            form.startDate,
        endDate,
        phases,
      })
      toast.success(`Projeto ${form.clientName} criado!`)
      if (onCreated) onCreated(id)
      else { onClose(); router.push(`/project/${id}`) }
    } catch (err: any) {
      toast.error(`Erro: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex justify-end">

        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="absolute inset-0"
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)' }}
          onClick={onClose}
        />

        {/* Drawer */}
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', stiffness: 300, damping: 32 }}
          className="relative z-10 h-full flex flex-col"
          style={{
            width:                520,
            background:           'rgba(10,10,16,0.96)',
            backdropFilter:       'blur(24px) saturate(150%)',
            WebkitBackdropFilter: 'blur(24px) saturate(150%)',
            borderLeft:           '1px solid rgba(255,255,255,0.07)',
            boxShadow:            '-32px 0 80px rgba(0,0,0,0.5)',
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-10 pt-10 pb-8"
               style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <div>
              <h2 className="text-base font-semibold text-white tracking-tight">Novo Projeto</h2>
              <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.3)' }}>
                Configure o cliente e o cronograma
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded flex items-center justify-center transition-all"
              style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.3)' }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.09)'
                e.currentTarget.style.color = 'rgba(255,255,255,0.7)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
                e.currentTarget.style.color = 'rgba(255,255,255,0.3)'
              }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-10 py-8 space-y-7">

            {/* Nome */}
            <div>
              <label className="text-[10px] uppercase tracking-[0.15em] mb-2.5 flex items-center gap-2"
                     style={{ color: 'rgba(255,255,255,0.28)' }}>
                <Building2 className="w-3 h-3" />
                Nome do Cliente
              </label>
              <input
                type="text"
                value={form.clientName}
                onChange={set('clientName')}
                placeholder="Ex: Bombril, BIC, Peccin..."
                className="w-full px-5 py-3.5 text-sm text-white outline-none transition-all placeholder-white/15"
                style={FIELD_STYLE}
                onFocus={e  => (e.target.style.border = FOCUS_STYLE)}
                onBlur={e   => (e.target.style.border = '1px solid rgba(255,255,255,0.08)')}
              />
            </div>

            {/* Cores */}
            <div>
              <label className="text-[10px] uppercase tracking-[0.15em] mb-2.5 flex items-center gap-2"
                     style={{ color: 'rgba(255,255,255,0.28)' }}>
                <Palette className="w-3 h-3" />
                Identidade Visual
              </label>
              <div className="grid grid-cols-2 gap-3">
                <ColorPickerField
                  value={form.clientColor}
                  onChange={v => setForm(f => ({ ...f, clientColor: v }))}
                  label="Cor Primária"
                />
                <ColorPickerField
                  value={form.clientColorSecondary}
                  onChange={v => setForm(f => ({ ...f, clientColorSecondary: v }))}
                  label="Cor Secundária"
                />
              </div>
            </div>

            {/* Distribuidores */}
            <div>
              <label className="text-[10px] uppercase tracking-[0.15em] mb-2.5 flex items-center gap-2"
                     style={{ color: 'rgba(255,255,255,0.28)' }}>
                <Users className="w-3 h-3" />
                Total de Distribuidores
              </label>
              <input
                type="number" min={1} max={999}
                value={form.distributorCount}
                onChange={set('distributorCount')}
                className="w-full px-5 py-3.5 text-sm text-white outline-none transition-all"
                style={FIELD_STYLE}
                onFocus={e  => (e.target.style.border = FOCUS_STYLE)}
                onBlur={e   => (e.target.style.border = '1px solid rgba(255,255,255,0.08)')}
              />
              <p className="text-[10px] mt-2" style={{ color: 'rgba(255,255,255,0.2)' }}>
                Cada distribuidor = 1 dia de integração
              </p>
            </div>

            {/* Datas */}
            <div>
              <label className="text-[10px] uppercase tracking-[0.15em] mb-2.5 flex items-center gap-2"
                     style={{ color: 'rgba(255,255,255,0.28)' }}>
                <Calendar className="w-3 h-3" />
                Período
              </label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] mb-2" style={{ color: 'rgba(255,255,255,0.25)' }}>Início</p>
                  <DatePicker
                    value={form.startDate}
                    onChange={v => setForm(f => ({ ...f, startDate: v }))}
                  />
                </div>
                <div>
                  <p className="text-[10px] mb-2" style={{ color: 'rgba(255,255,255,0.25)' }}>
                    Término
                    <span className="ml-1.5" style={{ color: 'rgba(255,255,255,0.15)' }}>opcional</span>
                  </p>
                  <DatePicker
                    value={form.endDate}
                    onChange={v => setForm(f => ({ ...f, endDate: v }))}
                  />
                </div>
              </div>
            </div>

            {/* Estimativa */}
            <div
              className="rounded px-5 py-4"
              style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] uppercase tracking-[0.15em]"
                      style={{ color: 'rgba(255,255,255,0.28)' }}>
                  Término Estimado
                </span>
                <span className="text-sm font-semibold tabular-nums"
                      style={{ color: form.clientColor }}>
                  {new Date(estimatedEnd).toLocaleDateString('pt-BR')}
                </span>
              </div>

              {/* Mini breakdown */}
              <div
                className="grid grid-cols-3 gap-2 pt-3"
                style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
              >
                {[
                  { label: 'Fases fixas',  value: `${fixedDays}d`              },
                  { label: 'Integração',   value: `${form.distributorCount}d`  },
                  { label: 'Total',        value: `${totalDays}d`              },
                ].map(item => (
                  <div key={item.label} className="text-center">
                    <p className="text-xs font-semibold text-white/70">{item.value}</p>
                    <p className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.2)' }}>
                      {item.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Footer */}
          <div
            className="px-10 py-7 flex gap-3"
            style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
          >
            <button
              onClick={onClose}
              className="flex-1 py-3.5 rounded text-sm font-medium transition-all"
              style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.09)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 py-3.5 rounded text-sm font-semibold flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-40"
              style={{
                background: `linear-gradient(135deg, ${form.clientColor}, ${form.clientColorSecondary})`,
                color: '#050508',
              }}
            >
              {loading ? 'Criando...' : (
                <>
                  Criar Projeto
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}