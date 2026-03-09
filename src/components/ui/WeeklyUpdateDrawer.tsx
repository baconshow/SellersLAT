'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Plus, Trash2, Loader2, Save, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { addWeeklyUpdate, addDistributorHistory } from '@/lib/firestore';
import type { Project } from '@/types';
import toast from 'react-hot-toast';

interface Props {
  project: Project;
  onClose: () => void;
}

export default function WeeklyUpdateDrawer({ project, onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const nextWeek = (project.weeklyUpdates?.length || 0) + 1;
  const distributors = project.distributors ?? [];

  // Números calculados automaticamente
  const autoStats = {
    total:      distributors.length,
    integrated: distributors.filter(d => d.status === 'integrated').length,
    pending:    distributors.filter(d => d.status === 'pending').length,
    blocked:    distributors.filter(d => d.status === 'blocked').length,
  };

  const [form, setForm] = useState({
    weekNumber: nextWeek,
    date:       new Date().toISOString().split('T')[0],
    highlights: [''],
    blockers:   [''],
    nextSteps:  [''],
  });

  const handleArrayChange = (key: 'highlights' | 'blockers' | 'nextSteps', index: number, value: string) => {
    const newArr = [...form[key]];
    newArr[index] = value;
    setForm({ ...form, [key]: newArr });
  };

  const addArrayItem = (key: 'highlights' | 'blockers' | 'nextSteps') => {
    setForm({ ...form, [key]: [...form[key], ''] });
  };

  const removeArrayItem = (key: 'highlights' | 'blockers' | 'nextSteps', index: number) => {
    const newArr = form[key].filter((_, i) => i !== index);
    setForm({ ...form, [key]: newArr.length ? newArr : [''] });
  };

  const accent = project.clientColor || '#00D4AA';

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await addWeeklyUpdate(project.id, {
        weekNumber:             form.weekNumber,
        date:                   form.date,
        distributorsTotal:      autoStats.total,
        distributorsIntegrated: autoStats.integrated,
        distributorsPending:    autoStats.pending,
        distributorsBlocked:    autoStats.blocked,
        highlights: form.highlights.filter(i => i.trim()),
        blockers:   form.blockers.filter(i => i.trim()),
        nextSteps:  form.nextSteps.filter(i => i.trim()),
      });
      await addDistributorHistory(project.id, {
        type:         'weekly_snapshot',
        source:       'weekly_update',
        distributors: distributors,
        weekNumber:   form.weekNumber,
        note:         `Snapshot automático — Semana ${form.weekNumber}`,
      });
      toast.success('Atualização semanal salva!');
      onClose();
    } catch (error) {
      toast.error('Erro ao salvar atualização.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex justify-end">
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="relative w-full max-w-xl h-full flex flex-col"
        style={{ background: '#0a0a0f', borderLeft: '1px solid rgba(255,255,255,0.08)' }}
      >
        {/* Header */}
        <header className="p-6 flex items-center justify-between flex-shrink-0"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div>
            <h2 className="text-base font-bold text-white">Atualização Semanal</h2>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
              Semana {form.weekNumber} · {project.clientName}
            </p>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded flex items-center justify-center transition-colors"
            style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.4)')}>
            <X style={{ width: 15, height: 15 }} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-6 space-y-8"
             style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.08) transparent' }}>

          {/* Stats automáticos — read only */}
          <section>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-3"
               style={{ color: 'rgba(255,255,255,0.25)' }}>
              Distribuidores — calculado automaticamente
            </p>
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: 'Total',      value: autoStats.total,      color: '#ffffff',  Icon: null          },
                { label: 'Integrados', value: autoStats.integrated, color: '#22c55e',  Icon: CheckCircle2  },
                { label: 'Pendentes',  value: autoStats.pending,    color: '#f59e0b',  Icon: Clock         },
                { label: 'Bloqueados', value: autoStats.blocked,    color: '#ef4444',  Icon: XCircle       },
              ].map(s => (
                <div key={s.label} className="rounded p-3 text-center"
                     style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <p className="text-xl font-black" style={{ color: s.color }}>{s.value}</p>
                  <p className="text-[9px] uppercase tracking-wider mt-0.5"
                     style={{ color: 'rgba(255,255,255,0.3)' }}>{s.label}</p>
                </div>
              ))}
            </div>
            {distributors.length === 0 && (
              <p className="text-[10px] mt-2" style={{ color: 'rgba(255,255,255,0.25)' }}>
                Nenhum distribuidor cadastrado. Importe um CSV na página de Distribuidores.
              </p>
            )}
          </section>

          {/* Listas dinâmicas */}
          {([
            { key: 'highlights', label: 'Destaques',      placeholder: 'Adicionar destaque...'      },
            { key: 'blockers',   label: 'Bloqueios',       placeholder: 'Adicionar bloqueio...'      },
            { key: 'nextSteps',  label: 'Próximos Passos', placeholder: 'Adicionar próximo passo...' },
          ] as const).map(({ key, label, placeholder }) => (
            <section key={key}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] font-bold uppercase tracking-widest"
                   style={{ color: 'rgba(255,255,255,0.25)' }}>{label}</p>
                <button onClick={() => addArrayItem(key)}
                  className="w-6 h-6 rounded flex items-center justify-center transition-all"
                  style={{ background: `${accent}15`, color: accent }}
                  onMouseEnter={e => (e.currentTarget.style.background = `${accent}25`)}
                  onMouseLeave={e => (e.currentTarget.style.background = `${accent}15`)}>
                  <Plus style={{ width: 12, height: 12 }} />
                </button>
              </div>
              <div className="space-y-2">
                {form[key].map((item, idx) => (
                  <div key={idx} className="flex gap-2">
                    <input
                      value={item}
                      onChange={e => handleArrayChange(key, idx, e.target.value)}
                      placeholder={placeholder}
                      className="flex-1 text-sm text-white outline-none"
                      style={{
                        background:   'rgba(255,255,255,0.04)',
                        border:       '1px solid rgba(255,255,255,0.08)',
                        borderRadius: 5,
                        padding:      '9px 14px',
                      }}
                      onFocus={e  => (e.target.style.border = `1px solid ${accent}50`)}
                      onBlur={e   => (e.target.style.border = '1px solid rgba(255,255,255,0.08)')}
                    />
                    <button onClick={() => removeArrayItem(key, idx)}
                      className="w-8 h-8 rounded flex items-center justify-center transition-colors flex-shrink-0"
                      style={{ color: 'rgba(255,255,255,0.2)' }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
                      onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.2)')}>
                      <Trash2 style={{ width: 13, height: 13 }} />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* Footer */}
        <footer className="p-6 flex-shrink-0 flex gap-3"
                style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded text-sm font-semibold transition-all"
            style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.4)')}>
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded text-sm font-bold transition-all disabled:opacity-50"
            style={{ background: accent, color: '#050508' }}>
            {loading
              ? <Loader2 style={{ width: 15, height: 15 }} className="animate-spin" />
              : <Save style={{ width: 15, height: 15 }} />
            }
            {loading ? 'Salvando...' : 'Salvar Atualização'}
          </button>
        </footer>
      </motion.div>
    </div>
  );
}