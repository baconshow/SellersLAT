'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Palette, Calendar, Building2 } from 'lucide-react'
import { createProject } from '@/lib/firestore'
import { hexToRgb } from '@/lib/theme'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

interface Props {
  onClose: () => void
  onCreated?: (id: string) => void
}

const BRAND_PRESETS = [
  { id: 'bombril',  name: 'Bombril',  primary: '#E8312A', secondary: '#C41E18' },
  { id: 'bic',      name: 'BIC',      primary: '#F57C00', secondary: '#E65100' },
  { id: 'peccin',   name: 'Peccin',   primary: '#1565C0', secondary: '#0D47A1' },
  { id: 'fruki',    name: 'Fruki',    primary: '#2E7D32', secondary: '#1B5E20' },
  { id: 'unilever', name: 'Unilever', primary: '#1F5CB4', secondary: '#173F7C' },
  { id: 'ambev',    name: 'Ambev',    primary: '#FFD600', secondary: '#F9A825' },
]

export default function NewProjectModal({ onClose, onCreated }: Props) {
  const { user } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    clientName: '',
    clientColor: '#00D4AA',
    clientColorSecondary: '#8B5CF6',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
  })

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const handlePreset = (preset: typeof BRAND_PRESETS[0]) => {
    setForm(f => ({
      ...f,
      clientName: preset.name,
      clientColor: preset.primary,
      clientColorSecondary: preset.secondary,
    }))
  }

  const handleSubmit = async () => {
    console.log('Tentativa de criar projeto. Usuário atual:', user);

    if (!user) { 
      toast.error('Usuário não autenticado no Firestore'); 
      return 
    }
    
    if (!form.clientName.trim()) { toast.error('Informe o nome do cliente'); return }
    if (!form.startDate) { toast.error('Informe a data de início'); return }
    if (!form.endDate) { toast.error('Informe a data de término'); return }
    if (form.endDate <= form.startDate) { toast.error('Data de término deve ser após o início'); return }

    setLoading(true)
    try {
      const id = await createProject(user.uid, {
        clientName: form.clientName.trim(),
        clientColor: form.clientColor,
        clientColorSecondary: form.clientColorSecondary,
        clientColorRgb: hexToRgb(form.clientColor),
        startDate: form.startDate,
        endDate: form.endDate,
      })
      toast.success(`Projeto ${form.clientName} criado!`)
      if (onCreated) {
        onCreated(id)
      } else {
        onClose()
        router.push(`/project/${id}`)
      }
    } catch (err: any) {
      console.error('Erro detalhado ao criar projeto:', err)
      toast.error(`Erro: ${err.message || 'Falha ao salvar no banco de dados'}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0"
          style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
          onClick={onClose}
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 24 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="relative w-full max-w-lg rounded-2xl z-10 overflow-hidden"
          style={{
            background: 'rgba(15,15,24,0.98)',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
          }}
        >
          <div className="h-1 w-full" style={{
            background: `linear-gradient(90deg, ${form.clientColor}, ${form.clientColorSecondary})`
          }} />

          <div className="p-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-white">Novo Projeto</h2>
                <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  Configure o cliente e o cronograma
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-xl transition-colors"
                style={{ color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.05)' }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-6">
              <label className="text-xs uppercase tracking-widest mb-3 block"
                     style={{ color: 'rgba(255,255,255,0.35)' }}>
                Indústrias Frequentes
              </label>
              <div className="flex flex-wrap gap-2">
                {BRAND_PRESETS.map(p => (
                  <button
                    key={p.id}
                    onClick={() => handlePreset(p)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:scale-105"
                    style={{
                      background: `${p.primary}18`,
                      border: `1px solid ${p.primary}40`,
                      color: p.primary,
                    }}
                  >
                    <div className="w-2 h-2 rounded-full" style={{ background: p.primary }} />
                    {p.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs uppercase tracking-widest mb-1.5 flex items-center gap-1.5"
                       style={{ color: 'rgba(255,255,255,0.35)' }}>
                  <Building2 className="w-3 h-3" /> Nome do Cliente
                </label>
                <input
                  type="text"
                  value={form.clientName}
                  onChange={set('clientName')}
                  placeholder="Ex: Bombril, BIC, Peccin..."
                  className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none transition-all"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: `1px solid ${form.clientName ? form.clientColor + '60' : 'rgba(255,255,255,0.08)'}`,
                  }}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: 'clientColor', label: 'Cor Primária' },
                  { key: 'clientColorSecondary', label: 'Cor Secundária' },
                ].map(f => (
                  <div key={f.key}>
                    <label className="text-xs uppercase tracking-widest mb-1.5 flex items-center gap-1.5"
                           style={{ color: 'rgba(255,255,255,0.35)' }}>
                      <Palette className="w-3 h-3" /> {f.label}
                    </label>
                    <div className="flex items-center gap-3 rounded-xl px-4 py-3"
                         style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <input
                        type="color"
                        value={form[f.key as keyof typeof form]}
                        onChange={set(f.key as keyof typeof form)}
                        className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
                      />
                      <span className="text-sm font-mono" style={{ color: 'rgba(255,255,255,0.6)' }}>
                        {form[f.key as keyof typeof form]}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: 'startDate', label: 'Início', min: undefined },
                  { key: 'endDate',   label: 'Término', min: form.startDate },
                ].map(f => (
                  <div key={f.key}>
                    <label className="text-xs uppercase tracking-widest mb-1.5 flex items-center gap-1.5"
                           style={{ color: 'rgba(255,255,255,0.35)' }}>
                      <Calendar className="w-3 h-3" /> {f.label}
                    </label>
                    <input
                      type="date"
                      value={form[f.key as keyof typeof form]}
                      onChange={set(f.key as keyof typeof form)}
                      min={f.min}
                      className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none"
                      style={{
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        colorScheme: 'dark',
                      }}
                    />
                  </div>
                ))}
              </div>

              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                <div className="h-full rounded-full transition-all duration-300" style={{
                  background: `linear-gradient(90deg, ${form.clientColor}, ${form.clientColorSecondary})`,
                  boxShadow: `0 0 12px ${form.clientColor}66`,
                  width: form.clientName ? '100%' : '30%',
                }} />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={onClose}
                className="flex-1 py-3 rounded-xl text-sm font-medium transition-all"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: 'rgba(255,255,255,0.5)',
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 py-3 rounded-xl text-sm font-bold transition-all hover:opacity-90 disabled:opacity-40"
                style={{
                  background: `linear-gradient(135deg, ${form.clientColor}, ${form.clientColorSecondary})`,
                  color: '#050508',
                }}
              >
                {loading ? 'Criando...' : 'Criar Projeto'}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
