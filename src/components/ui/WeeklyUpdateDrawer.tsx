'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Trash2, Sparkles, Loader2, Save } from 'lucide-react';
import { addWeeklyUpdate } from '@/lib/firestore';
import { generateWeeklySummary } from '@/ai/flows/generate-weekly-summary';
import type { Project } from '@/types';
import toast from 'react-hot-toast';

interface Props {
  project: Project;
  onClose: () => void;
}

export default function WeeklyUpdateDrawer({ project, onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const [generatingAI, setGeneratingAI] = useState(false);
  
  const nextWeek = (project.weeklyUpdates?.length || 0) + 1;
  
  const [form, setForm] = useState({
    weekNumber: nextWeek,
    date: new Date().toISOString().split('T')[0],
    distributorsTotal: project.weeklyUpdates?.[project.weeklyUpdates.length - 1]?.distributorsTotal || 0,
    distributorsIntegrated: project.weeklyUpdates?.[project.weeklyUpdates.length - 1]?.distributorsIntegrated || 0,
    distributorsPending: project.weeklyUpdates?.[project.weeklyUpdates.length - 1]?.distributorsPending || 0,
    distributorsBlocked: project.weeklyUpdates?.[project.weeklyUpdates.length - 1]?.distributorsBlocked || 0,
    highlights: [''],
    blockers: [''],
    nextSteps: [''],
    aiSummary: '',
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

  const handleGenerateAISummary = async () => {
    if (form.highlights.filter(h => h.trim()).length === 0) {
      toast.error('Adicione pelo menos um destaque para gerar o resumo.');
      return;
    }
    setGeneratingAI(true);
    try {
      const result = await generateWeeklySummary({
        weekNumber: form.weekNumber,
        highlights: form.highlights.filter(i => i.trim()),
        blockers: form.blockers.filter(i => i.trim()),
        nextSteps: form.nextSteps.filter(i => i.trim()),
      });
      setForm({ ...form, aiSummary: result.aiSummary });
      toast.success('Resumo gerado pela IA!');
    } catch (error) {
      toast.error('Erro ao gerar resumo pela IA.');
    } finally {
      setGeneratingAI(false);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await addWeeklyUpdate(project.id, {
        ...form,
        highlights: form.highlights.filter(i => i.trim()),
        blockers: form.blockers.filter(i => i.trim()),
        nextSteps: form.nextSteps.filter(i => i.trim()),
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
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="relative w-full max-w-xl h-full bg-[#0a0a0f] border-l border-white/10 shadow-2xl flex flex-col"
      >
        <header className="p-6 border-b border-white/5 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">Atualização Semanal</h2>
            <p className="text-xs text-white/40">Semana {form.weekNumber} • {project.clientName}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-md transition-colors">
            <X className="w-5 h-5 text-white/40" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* Métricas de Distribuidores */}
          <section>
            <h3 className="text-xs font-bold uppercase tracking-widest text-white/30 mb-4">Distribuidores</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] uppercase text-white/40 mb-1.5 block">Total</label>
                <input
                  type="number"
                  value={form.distributorsTotal}
                  onChange={(e) => setForm({ ...form, distributorsTotal: parseInt(e.target.value) || 0 })}
                  className="w-full bg-white/5 border border-white/10 rounded-md px-4 py-2.5 text-sm focus:border-brand outline-none transition-all"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase text-white/40 mb-1.5 block">Integrados</label>
                <input
                  type="number"
                  value={form.distributorsIntegrated}
                  onChange={(e) => setForm({ ...form, distributorsIntegrated: parseInt(e.target.value) || 0 })}
                  className="w-full bg-white/5 border border-white/10 rounded-md px-4 py-2.5 text-sm focus:border-brand outline-none transition-all"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase text-white/40 mb-1.5 block">Pendentes</label>
                <input
                  type="number"
                  value={form.distributorsPending}
                  onChange={(e) => setForm({ ...form, distributorsPending: parseInt(e.target.value) || 0 })}
                  className="w-full bg-white/5 border border-white/10 rounded-md px-4 py-2.5 text-sm focus:border-brand outline-none transition-all"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase text-white/40 mb-1.5 block">Bloqueados</label>
                <input
                  type="number"
                  value={form.distributorsBlocked}
                  onChange={(e) => setForm({ ...form, distributorsBlocked: parseInt(e.target.value) || 0 })}
                  className="w-full bg-white/5 border border-white/10 rounded-md px-4 py-2.5 text-sm focus:border-brand outline-none transition-all"
                />
              </div>
            </div>
          </section>

          {/* Listas Dinâmicas */}
          {(['highlights', 'blockers', 'nextSteps'] as const).map((key) => (
            <section key={key}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-bold uppercase tracking-widest text-white/30">
                  {key === 'highlights' ? 'Destaques' : key === 'blockers' ? 'Bloqueios' : 'Próximos Passos'}
                </h3>
                <button
                  onClick={() => addArrayItem(key)}
                  className="p-1.5 rounded-md bg-white/5 hover:bg-white/10 text-brand transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="space-y-3">
                {form[key].map((item, idx) => (
                  <div key={idx} className="flex gap-2">
                    <input
                      value={item}
                      onChange={(e) => handleArrayChange(key, idx, e.target.value)}
                      placeholder={`Adicionar ${key.slice(0, -1)}...`}
                      className="flex-1 bg-white/5 border border-white/10 rounded-md px-4 py-2 text-sm focus:border-brand outline-none transition-all"
                    />
                    <button
                      onClick={() => removeArrayItem(key, idx)}
                      className="p-2 text-white/20 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          ))}

          {/* Resumo da IA */}
          <section className="pt-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-white/30">Resumo da IA</h3>
              <button
                onClick={handleGenerateAISummary}
                disabled={generatingAI}
                className="flex items-center gap-2 px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-brand/10 text-brand border border-brand/20 hover:bg-brand/20 transition-all disabled:opacity-50"
              >
                {generatingAI ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                Gerar com IA
              </button>
            </div>
            <textarea
              value={form.aiSummary}
              onChange={(e) => setForm({ ...form, aiSummary: e.target.value })}
              placeholder="O resumo gerado pela IA aparecerá aqui..."
              className="w-full h-32 bg-white/5 border border-white/10 rounded-md px-4 py-3 text-sm focus:border-brand outline-none transition-all resize-none"
            />
          </section>
        </div>

        <footer className="p-6 border-t border-white/5">
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-md bg-gradient-to-r from-brand to-brand-secondary text-black font-bold text-sm hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            Salvar Atualização
          </button>
        </footer>
      </motion.div>
    </div>
  );
}