'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  Settings, 
  Trash2, 
  Save, 
  Palette, 
  Target, 
  Info,
  AlertTriangle,
  ArrowLeft
} from 'lucide-react';
import { subscribeToProject, updateProject, deleteProject } from '@/lib/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { applyTheme } from '@/lib/theme';
import type { Project } from '@/types';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [form, setForm] = useState({
    clientName: '',
    clientColor: '',
    clientColorSecondary: '',
    objective: '',
    description: '',
  });

  useEffect(() => {
    if (!authLoading && !user) router.replace('/');
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!id) return;
    const unsub = subscribeToProject(id, (p) => {
      if (p) {
        setProject(p);
        setForm({
          clientName: p.clientName || '',
          clientColor: p.clientColor || '#00D4AA',
          clientColorSecondary: p.clientColorSecondary || '#8B5CF6',
          objective: p.objective || '',
          description: p.description || '',
        });
        applyTheme(p.clientColor, p.clientColorSecondary, p.clientColorRgb);
      }
      setLoading(false);
    });
    return unsub;
  }, [id]);

  const handleSave = async () => {
    if (!id || !project) return;
    setSaving(true);
    try {
      await updateProject(id, form);
      toast.success('Configurações salvas com sucesso!');
    } catch (error) {
      toast.error('Erro ao salvar configurações.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    try {
      await deleteProject(id);
      toast.success('Projeto excluído.');
      router.push('/dashboard');
    } catch (error) {
      toast.error('Erro ao excluir projeto.');
    }
  };

  if (loading) return <div className="p-8 space-y-4"><div className="h-8 w-48 rounded shimmer" /><div className="h-64 rounded-md shimmer" /></div>;
  if (!project) return <div className="p-8 text-white/40">Projeto não encontrado.</div>;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-8 max-w-4xl mx-auto"
    >
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.back()}
            className="p-2 rounded-md glass hover:bg-white/10 transition-all text-white/40 hover:text-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-2xl font-black text-white">Configurações</h2>
            <p className="text-white/40 text-sm">Ajuste os detalhes e a identidade do projeto</p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 rounded-md text-sm font-bold text-black transition-all hover:opacity-90 disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg, var(--color-brand), var(--color-brand-secondary))' }}
        >
          {saving ? <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
          Salvar Alterações
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Identidade Visual */}
        <section className="glass rounded-md p-6 border-white/5 space-y-6">
          <div className="flex items-center gap-3 text-brand">
            <Palette className="w-5 h-5" />
            <h3 className="font-bold">Identidade Visual</h3>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="text-xs uppercase tracking-widest text-white/30 mb-2 block">Nome do Cliente</label>
              <input
                type="text"
                value={form.clientName}
                onChange={(e) => setForm({ ...form, clientName: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-md px-4 py-3 text-sm focus:border-brand outline-none transition-all"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs uppercase tracking-widest text-white/30 mb-2 block">Cor Primária</label>
                <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-md px-4 py-2">
                  <input
                    type="color"
                    value={form.clientColor}
                    onChange={(e) => setForm({ ...form, clientColor: e.target.value })}
                    className="w-8 h-8 rounded-md cursor-pointer bg-transparent border-none"
                  />
                  <span className="text-xs font-mono text-white/60">{form.clientColor}</span>
                </div>
              </div>
              <div>
                <label className="text-xs uppercase tracking-widest text-white/30 mb-2 block">Cor Secundária</label>
                <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-md px-4 py-2">
                  <input
                    type="color"
                    value={form.clientColorSecondary}
                    onChange={(e) => setForm({ ...form, clientColorSecondary: e.target.value })}
                    className="w-8 h-8 rounded-md cursor-pointer bg-transparent border-none"
                  />
                  <span className="text-xs font-mono text-white/60">{form.clientColorSecondary}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Planejamento Estratégico */}
        <section className="glass rounded-md p-6 border-white/5 space-y-6">
          <div className="flex items-center gap-3 text-brand-secondary">
            <Target className="w-5 h-5" />
            <h3 className="font-bold">Planejamento Estratégico</h3>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="text-xs uppercase tracking-widest text-white/30 mb-2 block">Objetivo Principal</label>
              <input
                type="text"
                value={form.objective}
                onChange={(e) => setForm({ ...form, objective: e.target.value })}
                placeholder="Ex: Integrar 100% dos distribuidores Tier 1"
                className="w-full bg-white/5 border border-white/10 rounded-md px-4 py-3 text-sm focus:border-brand outline-none transition-all"
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-widest text-white/30 mb-2 block">Descrição Detalhada</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={4}
                placeholder="Descreva o escopo e as metas do projeto..."
                className="w-full bg-white/5 border border-white/10 rounded-md px-4 py-3 text-sm focus:border-brand outline-none transition-all resize-none"
              />
            </div>
          </div>
        </section>

        {/* Danger Zone */}
        <section className="md:col-span-2 rounded-md p-6 border border-red-500/20 bg-red-500/5 space-y-6">
          <div className="flex items-center gap-3 text-red-500">
            <AlertTriangle className="w-5 h-5" />
            <h3 className="font-bold">Zona de Perigo</h3>
          </div>
          
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-white/80 font-medium">Excluir este projeto permanentemente</p>
              <p className="text-xs text-white/40">Esta ação não pode ser desfeita. Todos os dados, atualizações e histórico serão perdidos.</p>
            </div>
            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="px-6 py-2.5 rounded-md border border-red-500/30 text-red-500 text-xs font-bold hover:bg-red-500 hover:text-white transition-all"
              >
                Excluir Projeto
              </button>
            ) : (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 rounded-md bg-white/5 text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDelete}
                  className="px-6 py-2.5 rounded-md bg-red-500 text-white text-xs font-bold hover:bg-red-600 transition-all shadow-lg shadow-red-500/20"
                >
                  Confirmar Exclusão
                </button>
              </div>
            )}
          </div>
        </section>
      </div>
    </motion.div>
  );
}