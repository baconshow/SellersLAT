'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, ChevronRight, Loader2,
  Maximize2, Minimize2, CheckCircle2, Clock,
  XCircle, Circle, ArrowLeft, Wifi, HardDrive, Globe, FileText,
} from 'lucide-react';
import { subscribeToProject, subscribeToDistributorsCollection } from '@/lib/firestore';
import type { Project, Distributor, DistributorStatus } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// ─── Helper ───────────────────────────────────────────────────────────────────

function toDate(val: any): Date {
  if (!val) return new Date();
  if (typeof val?.toDate === 'function') return val.toDate();
  return new Date(val);
}

// ─── Types ────────────────────────────────────────────────────────────────────

type SlideType = 'cover' | 'together' | 'phases' | 'kpis' | 'drilldown'
  | 'highlights' | 'blockers' | 'nextsteps' | 'retro' | 'summary';

interface Slide {
  id:           string;
  type:         SlideType;
  label:        string;
  drillStatus?: DistributorStatus;
}

function buildSlides(project: Project, aiContent: any): Slide[] {
  const latest = project.weeklyUpdates?.slice(-1)[0];
  const prev   = project.weeklyUpdates?.slice(-2)[0];
  const slides: Slide[] = [
    { id: 'cover',    type: 'cover',    label: 'Capa'   },
    { id: 'together', type: 'together', label: 'Juntos' },
    { id: 'phases',   type: 'phases',   label: 'Fases'  },
  ];

  if (latest) {
    slides.push({ id: 'kpis', type: 'kpis', label: 'Integrações' });

    if ((latest.distributorsIntegrated ?? 0) > 0)
      slides.push({ id: 'drill-integrated', type: 'drilldown', label: 'Integrados',   drillStatus: 'integrated'  });
    if ((latest.distributorsPending ?? 0) > 0)
      slides.push({ id: 'drill-pending',    type: 'drilldown', label: 'Pendentes',    drillStatus: 'pending'     });
    if ((latest.distributorsBlocked ?? 0) > 0)
      slides.push({ id: 'drill-blocked',    type: 'drilldown', label: 'Bloqueados',   drillStatus: 'blocked'     });

    if (latest.highlights?.length)  slides.push({ id: 'highlights', type: 'highlights', label: 'Destaques'       });
    if (latest.blockers?.length)    slides.push({ id: 'blockers',   type: 'blockers',   label: 'Bloqueios'        });
    if (latest.nextSteps?.length)   slides.push({ id: 'nextsteps',  type: 'nextsteps',  label: 'Próximos Passos'  });
    if (prev) slides.push({ id: 'retro', type: 'retro', label: 'Retrospectiva' });
  }

  if (aiContent?.executiveSummary) slides.push({ id: 'summary', type: 'summary', label: 'Resumo' });
  return slides;
}

// ─── Config ───────────────────────────────────────────────────────────────────

const STATUS = {
  completed:   { label: 'Concluído',    color: '#22c55e',   Icon: CheckCircle2 },
  in_progress: { label: 'Em Andamento', color: '#f59e0b',   Icon: Clock        },
  blocked:     { label: 'Bloqueado',    color: '#ef4444',   Icon: XCircle      },
  pending:     { label: 'Pendente',     color: '#ffffff30', Icon: Circle       },
} as const;

const DIST_CFG: Record<DistributorStatus, { label: string; color: string; bg: string; Icon: any }> = {
  integrated:  { label: 'Integrado',    color: '#22c55e',   bg: 'rgba(34,197,94,0.12)',    Icon: CheckCircle2 },
  pending:     { label: 'Pendente',     color: '#f59e0b',   bg: 'rgba(245,158,11,0.12)',   Icon: Clock        },
  blocked:     { label: 'Bloqueado',    color: '#ef4444',   bg: 'rgba(239,68,68,0.12)',    Icon: XCircle      },
  not_started: { label: 'Não iniciado', color: '#ffffff40', bg: 'rgba(255,255,255,0.05)', Icon: Circle       },
};

const CONN_ICONS: Record<string, any> = {
  Ello: Wifi, FTP: HardDrive, API: Globe, Manual: FileText, Outro: FileText,
};

// ─── Slide: Cover ─────────────────────────────────────────────────────────────

function CoverSlide({ project }: { project: Project }) {
  const now         = new Date();
  const activePhase = project.phases.find(p => p.status === 'in_progress');
  const daysElapsed = Math.max(0, differenceInDays(now, toDate(project.startDate)));
  const weekNumber  = project.weeklyUpdates?.slice(-1)[0]?.weekNumber ?? 1;
  const totalDays   = differenceInDays(toDate(project.endDate), toDate(project.startDate)) || 1;
  const pct         = Math.min(100, Math.round((daysElapsed / totalDays) * 100));

  return (
    <div className="w-full h-full flex flex-col justify-between p-14 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full blur-[120px] opacity-20 pointer-events-none"
           style={{ background: 'var(--color-brand)' }} />
      <div className="absolute bottom-0 left-0 w-[300px] h-[300px] rounded-full blur-[80px] opacity-10 pointer-events-none"
           style={{ background: 'var(--color-brand-secondary)' }} />

      <div className="flex items-center justify-between relative z-10">
        <div className="px-3 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase"
             style={{ background: 'color-mix(in srgb, var(--color-brand) 15%, transparent)',
                      color: 'var(--color-brand)', border: '1px solid color-mix(in srgb, var(--color-brand) 30%, transparent)' }}>
          Alinhamento Semanal
        </div>
        <span className="text-white/30 text-xs font-mono">
          {format(now, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
        </span>
      </div>

      <div className="relative z-10 flex-1 flex flex-col justify-center">
        <p className="text-white/30 text-xs font-medium mb-3 tracking-widest uppercase">Apresentação de Projeto</p>
        <h1 className="text-7xl font-black tracking-tight mb-5 leading-none" style={{ color: 'var(--color-brand)' }}>
          {project.clientName}
        </h1>
        {activePhase && (
          <div className="flex items-center gap-3 mb-8">
            <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-white/50 text-base font-medium">{activePhase.name}</span>
          </div>
        )}
        <div className="max-w-md">
          <div className="flex justify-between text-xs text-white/30 mb-2">
            <span>{format(toDate(project.startDate), 'MMM yyyy', { locale: ptBR })}</span>
            <span className="font-semibold" style={{ color: 'var(--color-brand)' }}>
              Semana {weekNumber} · {daysElapsed} dias juntos
            </span>
            <span>{format(toDate(project.endDate), 'MMM yyyy', { locale: ptBR })}</span>
          </div>
          <div className="h-1 bg-white/10 rounded-full overflow-hidden">
            <motion.div className="h-full rounded-full" style={{ background: 'var(--color-brand)' }}
              initial={{ width: 0 }} animate={{ width: `${pct}%` }}
              transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }} />
          </div>
        </div>
      </div>

      <div className="relative z-10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-white/10 flex items-center justify-center">
            <span className="text-white/60 text-xs font-black">S</span>
          </div>
          <span className="text-white/30 text-xs font-semibold tracking-wider">SELLERS</span>
        </div>
        <div className="flex gap-1">
          {project.phases.map(phase => (
            <div key={phase.id} className="w-1.5 h-1.5 rounded-full"
                 style={{ background: STATUS[phase.status]?.color ?? '#ffffff20' }} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Slide: Together ──────────────────────────────────────────────────────────

function TogetherSlide({ project }: { project: Project }) {
  const now         = new Date();
  const daysElapsed = Math.max(0, differenceInDays(now, toDate(project.startDate)));
  const weekNumber  = project.weeklyUpdates?.slice(-1)[0]?.weekNumber ?? 1;

  return (
    <div className="w-full h-full flex flex-col justify-between p-14 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none"
           style={{ background: 'radial-gradient(ellipse at 70% 50%, color-mix(in srgb, var(--color-brand) 10%, transparent) 0%, transparent 65%)' }} />

      <div className="flex items-center justify-between relative z-10">
        <div className="px-3 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase"
             style={{ background: 'color-mix(in srgb, var(--color-brand) 15%, transparent)',
                      color: 'var(--color-brand)', border: '1px solid color-mix(in srgb, var(--color-brand) 30%, transparent)' }}>
          Semana {weekNumber} em andamento
        </div>
        <span className="text-white/30 text-xs font-mono">
          {format(now, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
        </span>
      </div>

      <div className="relative z-10 flex-1 flex flex-col justify-center">
        <p className="text-white/30 text-xs font-medium mb-4 tracking-widest uppercase">Estamos juntos há</p>
        <p className="font-black leading-none mb-3"
           style={{ fontSize: 'clamp(96px, 16vw, 160px)', color: 'var(--color-brand)', lineHeight: 1 }}>
          {daysElapsed}
        </p>
        <p className="text-white/40 text-2xl font-light">dias</p>
      </div>

      <div className="relative z-10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-white/10 flex items-center justify-center">
            <span className="text-white/60 text-xs font-black">S</span>
          </div>
          <span className="text-white/30 text-xs font-semibold tracking-wider">SELLERS</span>
        </div>
        <div className="flex gap-1">
          {project.phases.map(phase => (
            <div key={phase.id} className="w-1.5 h-1.5 rounded-full"
                 style={{ background: STATUS[phase.status]?.color ?? '#ffffff20' }} />
          ))}
        </div>
      </div>
    </div>
  );
}

function PhasesSlide({ project }: { project: Project }) {
  return (
    <div className="w-full h-full flex flex-col p-14 relative overflow-hidden">
      <div className="relative z-10 mb-6 flex-shrink-0">
        <p className="text-xs font-bold uppercase tracking-[0.2em] mb-1" style={{ color: 'var(--color-brand)' }}>Cronograma</p>
        <h2 className="text-3xl font-black text-white">Fases do Projeto</h2>
      </div>
      <div className="relative z-10 flex-1 overflow-y-auto space-y-2 pr-1"
           style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}>
        {project.phases.map((phase, idx) => {
          const cfg      = STATUS[phase.status] ?? STATUS.pending;
          const isActive = phase.status === 'in_progress';
          return (
            <motion.div key={phase.id}
              initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.04 }}
              className="flex items-center gap-4 px-5 py-3 rounded border transition-all flex-shrink-0"
              style={isActive
                ? { background: `color-mix(in srgb, ${cfg.color} 10%, transparent)`, borderColor: `color-mix(in srgb, ${cfg.color} 35%, transparent)` }
                : { background: 'rgba(255,255,255,0.025)', borderColor: 'rgba(255,255,255,0.06)' }}>
              <cfg.Icon className="w-4 h-4 flex-shrink-0" style={{ color: cfg.color }} />
              <div className="flex-1 min-w-0 flex items-center gap-2">
                <span className={`text-sm font-semibold ${isActive ? 'text-white' : 'text-white/55'}`}>
                  {phase.name}
                </span>
                {isActive && (
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                        style={{ background: `color-mix(in srgb, ${cfg.color} 25%, transparent)`, color: cfg.color }}>
                    AGORA
                  </span>
                )}
              </div>
              <span className="text-xs text-white/25 font-mono flex-shrink-0">
                {format(toDate(phase.startDate), 'dd/MM')} – {format(toDate(phase.endDate), 'dd/MM')}
              </span>
              <div className="w-14 h-1 rounded-full bg-white/5 flex-shrink-0 overflow-hidden">
                <div className="h-full rounded-full"
                     style={{ background: cfg.color, width: phase.status === 'completed' ? '100%' : phase.status === 'in_progress' ? '55%' : '0%' }} />
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Slide: KPIs ─────────────────────────────────────────────────────────────

function KPIsSlide({
  project,
  onDrilldown,
}: {
  project:     Project;
  onDrilldown: (status: DistributorStatus) => void;
}) {
  const latest = project.weeklyUpdates?.slice(-1)[0];
  if (!latest) return null;

  const { distributorsTotal: total, distributorsIntegrated: done,
          distributorsPending: pending, distributorsBlocked: blocked } = latest;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  const stats = [
    { label: 'Total',      value: total,   color: '#ffffff',  bg: 'rgba(255,255,255,0.06)', border: 'rgba(255,255,255,0.12)', key: null              },
    { label: 'Integrados', value: done,    color: '#22c55e',  bg: 'rgba(34,197,94,0.08)',   border: 'rgba(34,197,94,0.22)',   key: 'integrated' as DistributorStatus },
    { label: 'Pendentes',  value: pending, color: '#f59e0b',  bg: 'rgba(245,158,11,0.08)',  border: 'rgba(245,158,11,0.22)',  key: 'pending'    as DistributorStatus },
    { label: 'Bloqueados', value: blocked, color: '#ef4444',  bg: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.22)',   key: 'blocked'    as DistributorStatus },
  ];

  return (
    <div className="w-full h-full flex flex-col p-14 relative overflow-hidden">
      <div className="relative z-10 mb-6 flex-shrink-0">
        <p className="text-xs font-bold uppercase tracking-[0.2em] mb-1" style={{ color: 'var(--color-brand)' }}>
          Semana {latest.weekNumber}
        </p>
        <h2 className="text-3xl font-black text-white">Status de Integrações</h2>
      </div>

      <div className="relative z-10 flex-1 flex flex-col justify-center gap-8">
        <div className="flex items-center gap-8">
          <div>
            <span className="text-7xl font-black" style={{ color: 'var(--color-brand)' }}>{pct}%</span>
            <p className="text-white/35 text-sm font-medium mt-1">taxa de integração</p>
          </div>
          <div className="flex-1">
            <div className="h-3 bg-white/5 rounded-full overflow-hidden">
              <motion.div className="h-full rounded-full" style={{ background: 'var(--color-brand)' }}
                initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                transition={{ duration: 1.2, ease: 'easeOut', delay: 0.2 }} />
            </div>
            <div className="flex justify-between text-xs text-white/25 mt-1.5">
              <span>0</span><span>{total} distribuidores</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4">
          {stats.map((s, i) => (
            <motion.button key={s.label}
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 + 0.3 }}
              onClick={() => s.key && onDrilldown(s.key)}
              className="rounded p-5 text-center transition-all group"
              style={{
                background:    s.bg,
                border:        `1px solid ${s.border}`,
                cursor:        s.key ? 'pointer' : 'default',
              }}
              onMouseEnter={e => { if (s.key) e.currentTarget.style.borderColor = s.color }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = s.border }}
            >
              <div className="text-4xl font-black mb-1.5" style={{ color: s.color }}>{s.value}</div>
              <div className="text-[10px] font-bold text-white/40 uppercase tracking-wider">{s.label}</div>
              {s.key && s.value > 0 && (
                <div className="text-[9px] mt-1.5 flex items-center justify-center gap-1"
                     style={{ color: 'rgba(255,255,255,0.2)' }}>
                  ver lista →
                </div>
              )}
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Slide: Drilldown ─────────────────────────────────────────────────────────

function DrilldownSlide({
  project,
  distributors,
  status,
  onBack,
}: {
  project:      Project;
  distributors: Distributor[];
  status:       DistributorStatus;
  onBack:       () => void;
}) {
  const cfg  = DIST_CFG[status];
  const list = distributors.filter(d => d.status === status);

  return (
    <div className="w-full h-full flex flex-col p-14 relative overflow-hidden">
      {/* Glow */}
      <div className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full blur-[120px] opacity-10 pointer-events-none"
           style={{ background: cfg.color }} />

      {/* Header */}
      <div className="relative z-10 mb-8 flex-shrink-0 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <cfg.Icon style={{ width: 14, height: 14, color: cfg.color }} />
            <p className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: cfg.color }}>
              {cfg.label}
            </p>
          </div>
          <h2 className="text-3xl font-black text-white">
            {list.length} Distribuidor{list.length !== 1 ? 'es' : ''}
          </h2>
        </div>
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-3 py-2 rounded text-xs font-medium transition-all"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)' }}
          onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.4)')}
        >
          <ArrowLeft style={{ width: 12, height: 12 }} />
          Integrações
        </button>
      </div>

      {/* List */}
      <div className="relative z-10 flex-1 overflow-y-auto space-y-2 pr-1"
           style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}>
        {list.length === 0 ? (
          <p className="text-white/25 text-lg">Nenhum distribuidor nessa categoria.</p>
        ) : (
          list.map((d, i) => {
            const ConnIcon = (d as any).connectionType ? (CONN_ICONS[(d as any).connectionType] ?? FileText) : null
            return (
              <motion.div key={d.id}
                initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className="flex items-center gap-4 px-5 py-3 rounded"
                style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}>

                {/* Index */}
                <span className="text-xs font-bold w-6 text-center flex-shrink-0"
                      style={{ color: cfg.color, opacity: 0.6 }}>
                  {i + 1}
                </span>

                {/* Name */}
                <p className="text-sm font-semibold text-white flex-1 min-w-0 truncate">{d.name}</p>

                {/* Connection */}
                {ConnIcon && (d as any).connectionType && (
                  <span className="flex items-center gap-1.5 text-xs flex-shrink-0"
                        style={{ color: 'rgba(255,255,255,0.3)' }}>
                    <ConnIcon style={{ width: 11, height: 11 }} />
                    {(d as any).connectionType}
                  </span>
                )}

                {/* Responsible */}
                {(d as any).responsible && (
                  <span className="text-xs flex-shrink-0" style={{ color: 'rgba(255,255,255,0.25)' }}>
                    {(d as any).responsible}
                  </span>
                )}

                {/* Blocker */}
                {status === 'blocked' && (d as any).blockerDescription && (
                  <span className="text-xs flex-shrink-0 max-w-[200px] truncate"
                        style={{ color: '#ef444460' }}>
                    ⚠ {(d as any).blockerDescription}
                  </span>
                )}

                {/* Notes */}
                {d.notes && !((d as any).blockerDescription) && (
                  <span className="text-xs flex-shrink-0 max-w-[180px] truncate"
                        style={{ color: 'rgba(255,255,255,0.2)' }}>
                    {d.notes}
                  </span>
                )}
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ─── Slide: List ─────────────────────────────────────────────────────────────

function ListSlide({ project, type }: { project: Project; type: 'highlights' | 'blockers' | 'nextsteps' }) {
  const latest = project.weeklyUpdates?.slice(-1)[0];
  if (!latest) return null;

  const cfg = {
    highlights: { label: 'Destaques', title: 'Destaques da Semana', items: latest.highlights ?? [], accent: 'var(--color-brand)', icon: '✦' },
    blockers:   { label: 'Riscos',    title: 'Bloqueios & Riscos',  items: latest.blockers   ?? [], accent: '#ef4444',            icon: '⚠' },
    nextsteps:  { label: 'Ações',     title: 'Próximos Passos',     items: latest.nextSteps  ?? [], accent: '#22c55e',            icon: '→' },
  }[type];

  return (
    <div className="w-full h-full flex flex-col p-14 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full blur-[100px] opacity-10 pointer-events-none"
           style={{ background: cfg.accent }} />
      <div className="relative z-10 mb-10">
        <p className="text-xs font-bold uppercase tracking-[0.2em] mb-1" style={{ color: cfg.accent }}>{cfg.label}</p>
        <h2 className="text-3xl font-black text-white">{cfg.title}</h2>
      </div>
      <div className="relative z-10 flex-1 flex flex-col justify-center gap-4">
        {cfg.items.length === 0
          ? <p className="text-white/25 text-lg">Nenhum item registrado.</p>
          : cfg.items.map((item, idx) => (
            <motion.div key={idx}
              initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="flex items-start gap-5">
              <div className="w-8 h-8 rounded flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5"
                   style={{ background: `color-mix(in srgb, ${cfg.accent} 18%, transparent)`, color: cfg.accent }}>
                {type === 'nextsteps' ? idx + 1 : cfg.icon}
              </div>
              <p className="text-white/70 text-lg font-medium leading-relaxed">{item}</p>
            </motion.div>
          ))}
      </div>
    </div>
  );
}

// ─── Slide: Retrospectiva ─────────────────────────────────────────────────────

function RetroSlide({ project }: { project: Project }) {
  const updates = project.weeklyUpdates ?? [];
  const curr    = updates.slice(-1)[0];
  const prev    = updates.slice(-2)[0];
  if (!curr || !prev) return null;

  const newIntegrated      = curr.distributorsIntegrated - prev.distributorsIntegrated;
  const resolvedBlockers   = prev.blockers?.filter(b => !curr.blockers?.includes(b)) ?? [];
  const newBlockers        = curr.blockers?.filter(b => !prev.blockers?.includes(b)) ?? [];
  const persistingBlockers = curr.blockers?.filter(b => prev.blockers?.includes(b)) ?? [];

  return (
    <div className="w-full h-full flex flex-col p-14 relative overflow-hidden">
      <div className="relative z-10 mb-8 flex-shrink-0">
        <p className="text-xs font-bold uppercase tracking-[0.2em] mb-1" style={{ color: 'var(--color-brand)' }}>
          Semana {prev.weekNumber} → Semana {curr.weekNumber}
        </p>
        <h2 className="text-3xl font-black text-white">Retrospectiva</h2>
      </div>
      <div className="relative z-10 flex-1 grid grid-cols-2 gap-5">
        <div className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-widest text-white/30 mb-4">Semana {prev.weekNumber}</p>
          <div className="rounded p-4 space-y-2" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-xs text-white/40 font-medium">Integrações</p>
            <p className="text-2xl font-black text-white">{prev.distributorsIntegrated} <span className="text-sm font-normal text-white/30">/ {prev.distributorsTotal}</span></p>
          </div>
          {prev.blockers?.length > 0 && (
            <div className="rounded p-4 space-y-2" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}>
              <p className="text-xs font-medium" style={{ color: '#ef444480' }}>Bloqueios ativos</p>
              <div className="space-y-1.5">
                {prev.blockers.map((b, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-xs mt-0.5" style={{ color: '#ef4444' }}>⚠</span>
                    <p className="text-xs text-white/50">{b}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: 'var(--color-brand)' }}>Semana {curr.weekNumber}</p>
          <div className="rounded p-4 space-y-2" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-xs text-white/40 font-medium">Integrações</p>
            <div className="flex items-end gap-2">
              <p className="text-2xl font-black text-white">{curr.distributorsIntegrated} <span className="text-sm font-normal text-white/30">/ {curr.distributorsTotal}</span></p>
              {newIntegrated > 0 && (
                <span className="text-xs font-bold mb-1 px-2 py-0.5 rounded-full"
                      style={{ background: 'rgba(34,197,94,0.15)', color: '#22c55e' }}>
                  +{newIntegrated} esta semana
                </span>
              )}
            </div>
          </div>
          {resolvedBlockers.length > 0 && (
            <div className="rounded p-4 space-y-2" style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)' }}>
              <p className="text-xs font-medium" style={{ color: '#22c55e80' }}>✅ Bloqueios resolvidos</p>
              {resolvedBlockers.map((b, i) => <p key={i} className="text-xs text-white/50 line-through">{b}</p>)}
            </div>
          )}
          {newBlockers.length > 0 && (
            <div className="rounded p-4 space-y-2" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}>
              <p className="text-xs font-medium" style={{ color: '#ef444480' }}>🆕 Novos bloqueios</p>
              {newBlockers.map((b, i) => <p key={i} className="text-xs text-white/50">{b}</p>)}
            </div>
          )}
          {persistingBlockers.length > 0 && (
            <div className="rounded p-4 space-y-2" style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)' }}>
              <p className="text-xs font-medium" style={{ color: '#f59e0b80' }}>⏳ Em acompanhamento</p>
              {persistingBlockers.map((b, i) => <p key={i} className="text-xs text-white/50">{b}</p>)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Slide: Summary ───────────────────────────────────────────────────────────

function SummarySlide({ aiContent }: { aiContent: any }) {
  return (
    <div className="w-full h-full flex flex-col p-14 relative overflow-hidden">
      <div className="absolute inset-0 opacity-5 pointer-events-none"
           style={{ background: 'radial-gradient(circle at 70% 50%, var(--color-brand), transparent 60%)' }} />
      <div className="relative z-10 mb-10">
        <p className="text-xs font-bold uppercase tracking-[0.2em] mb-1" style={{ color: 'var(--color-brand)' }}>Gerado por IA</p>
        <h2 className="text-3xl font-black text-white">Resumo Executivo</h2>
      </div>
      <div className="relative z-10 flex-1 flex items-center">
        <p className="text-2xl text-white/65 leading-relaxed font-light max-w-3xl">
          {aiContent?.executiveSummary ?? '—'}
        </p>
      </div>
    </div>
  );
}

// ─── Thumbnail Strip ──────────────────────────────────────────────────────────

function ThumbnailStrip({ slides, current, onSelect }: {
  slides: Slide[]; current: number; onSelect: (i: number) => void;
}) {
  return (
    <div className="flex items-center justify-center gap-2 px-8 py-3 border-t border-white/5 flex-shrink-0 flex-wrap">
      {slides.map((slide, idx) => (
        <button key={slide.id} onClick={() => onSelect(idx)} className="flex flex-col items-center gap-1 group transition-all">
          <div className="w-[72px] h-10 rounded border flex items-center justify-center text-[9px] font-bold uppercase tracking-wider transition-all"
               style={idx === current
                 ? { borderColor: 'var(--color-brand)', background: 'color-mix(in srgb, var(--color-brand) 12%, transparent)', color: 'var(--color-brand)' }
                 : { borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.25)' }}>
            {idx + 1}
          </div>
          <span className="text-[9px] font-medium transition-colors"
                style={{ color: idx === current ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.18)' }}>
            {slide.label}
          </span>
        </button>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SlidesPage() {
  const { id }                   = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const router                   = useRouter();
  const containerRef             = useRef<HTMLDivElement>(null);

  const [project,      setProject]      = useState<Project | null>(null);
  const [distributors, setDistributors] = useState<Distributor[]>([]);
  const [aiContent,    setAiContent]    = useState<any>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [direction,    setDirection]    = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.replace('/');
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!id) return;
    return subscribeToProject(id, setProject);
  }, [id]);

  useEffect(() => {
    if (!id) return;
    return subscribeToDistributorsCollection(id, setDistributors);
  }, [id]);

  const slides = project ? buildSlides(project, aiContent) : [];

  const goTo = useCallback((idx: number) => {
    setDirection(idx > currentSlide ? 1 : -1);
    setCurrentSlide(Math.min(Math.max(0, idx), slides.length - 1));
  }, [currentSlide, slides.length]);

  const go = useCallback((delta: number) => {
    goTo(currentSlide + delta);
  }, [currentSlide, goTo]);

  // Drilldown: navega para o slide de drill com o status correspondente
  const handleDrilldown = useCallback((status: DistributorStatus) => {
    const idx = slides.findIndex(s => s.type === 'drilldown' && s.drillStatus === status);
    if (idx !== -1) goTo(idx);
  }, [slides, goTo]);

  // Voltar do drilldown: navega para o slide kpis
  const handleDrillBack = useCallback(() => {
    const idx = slides.findIndex(s => s.type === 'kpis');
    if (idx !== -1) goTo(idx);
  }, [slides, goTo]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') go(1);
      if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')   go(-1);
      if (e.key === 'f' || e.key === 'F') toggleFullscreen();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [go]);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  if (!project) return null;

  const slide    = slides[currentSlide];
  const variants = {
    enter:  (d: number) => ({ opacity: 0, x: d > 0 ? 60 : -60 }),
    center: { opacity: 1, x: 0 },
    exit:   (d: number) => ({ opacity: 0, x: d > 0 ? -60 : 60 }),
  };

  return (
    <div ref={containerRef} className="flex-1 flex flex-col h-screen bg-[#050508]">

      <main className="flex-1 flex items-center justify-center gap-4 px-6 py-6 relative overflow-hidden min-h-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[140px] opacity-[0.04] pointer-events-none"
             style={{ background: 'var(--color-brand)' }} />

        <button onClick={() => go(-1)} disabled={currentSlide === 0}
          className="w-10 h-10 rounded flex-shrink-0 flex items-center justify-center transition-all disabled:opacity-0 disabled:pointer-events-none"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }}>
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="relative flex-1 max-w-5xl overflow-hidden rounded border border-white/[0.07]"
             style={{
               aspectRatio:    '16/9',
               background:     'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)',
               backdropFilter: 'blur(24px)',
               boxShadow:      '0 40px 100px rgba(0,0,0,0.7)',
             }}>
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div key={currentSlide} custom={direction} variants={variants}
              initial="enter" animate="center" exit="exit"
              transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
              className="absolute inset-0">
              {slide?.type === 'cover'      && <CoverSlide    project={project} />}
              {slide?.type === 'together'   && <TogetherSlide project={project} />}
              {slide?.type === 'phases'     && <PhasesSlide   project={project} />}
              {slide?.type === 'kpis'       && <KPIsSlide     project={project} onDrilldown={handleDrilldown} />}
              {slide?.type === 'drilldown'  && slide.drillStatus && (
                <DrilldownSlide project={project} distributors={distributors} status={slide.drillStatus} onBack={handleDrillBack} />
              )}
              {(slide?.type === 'highlights' || slide?.type === 'blockers' || slide?.type === 'nextsteps') && (
                <ListSlide project={project} type={slide.type} />
              )}
              {slide?.type === 'retro'    && <RetroSlide  project={project} />}
              {slide?.type === 'summary'  && <SummarySlide aiContent={aiContent} />}
            </motion.div>
          </AnimatePresence>
        </div>

        <button onClick={() => go(1)} disabled={currentSlide === slides.length - 1}
          className="w-10 h-10 rounded flex-shrink-0 flex items-center justify-center transition-all disabled:opacity-0 disabled:pointer-events-none"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }}>
          <ChevronRight className="w-5 h-5" />
        </button>
      </main>

      <ThumbnailStrip slides={slides} current={currentSlide}
        onSelect={i => goTo(i)} />

      <button onClick={toggleFullscreen}
        className="fixed bottom-6 right-6 w-9 h-9 rounded flex items-center justify-center transition-all z-50"
        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)' }}
        title={isFullscreen ? 'Sair do fullscreen (F)' : 'Fullscreen (F)'}>
        {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
      </button>
    </div>
  );
}