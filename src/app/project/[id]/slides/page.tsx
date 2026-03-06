'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, ChevronRight, Sparkles, Loader2,
  Maximize2, Minimize2, CheckCircle2, Clock,
  XCircle, Circle,
} from 'lucide-react';
import { subscribeToProject } from '@/lib/firestore';
import { generatePresentationContent } from '@/ai/flows/generate-presentation-content-flow';
import type { Project } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// ─── Types ────────────────────────────────────────────────────────────────────

type SlideType = 'cover' | 'phases' | 'kpis' | 'highlights' | 'blockers' | 'nextsteps' | 'summary';
interface Slide { id: string; type: SlideType; label: string; }

function buildSlides(project: Project, aiContent: any): Slide[] {
  const latest = project.weeklyUpdates?.slice(-1)[0];
  const slides: Slide[] = [
    { id: 'cover',  type: 'cover',  label: 'Capa'  },
    { id: 'phases', type: 'phases', label: 'Fases' },
  ];
  if (latest) {
    slides.push({ id: 'kpis', type: 'kpis', label: 'Integrações' });
    if (latest.highlights?.length)  slides.push({ id: 'highlights', type: 'highlights', label: 'Destaques'       });
    if (latest.blockers?.length)    slides.push({ id: 'blockers',   type: 'blockers',   label: 'Bloqueios'        });
    if (latest.nextSteps?.length)   slides.push({ id: 'nextsteps',  type: 'nextsteps',  label: 'Próximos Passos'  });
  }
  if (aiContent?.executiveSummary) slides.push({ id: 'summary', type: 'summary', label: 'Resumo' });
  return slides;
}

// ─── Status config ─────────────────────────────────────────────────────────────

const STATUS = {
  completed:   { label: 'Concluído',    color: '#22c55e', Icon: CheckCircle2 },
  in_progress: { label: 'Em Andamento', color: '#f59e0b', Icon: Clock        },
  blocked:     { label: 'Bloqueado',    color: '#ef4444', Icon: XCircle      },
  pending:     { label: 'Pendente',     color: '#ffffff30', Icon: Circle     },
} as const;

// ─── Slide: Cover ─────────────────────────────────────────────────────────────

function CoverSlide({ project }: { project: Project }) {
  const now = new Date();
  const activePhase = project.phases.find(p => p.status === 'in_progress');
  const total   = differenceInDays(new Date(project.endDate),   new Date(project.startDate)) || 1;
  const elapsed = differenceInDays(now,                          new Date(project.startDate));
  const pct = Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));

  return (
    <div className="w-full h-full flex flex-col justify-between p-14 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full blur-[120px] opacity-20 pointer-events-none"
           style={{ background: 'var(--color-brand)' }} />
      <div className="absolute bottom-0 left-0 w-[300px] h-[300px] rounded-full blur-[80px] opacity-10 pointer-events-none"
           style={{ background: 'var(--color-brand-secondary)' }} />

      {/* Top */}
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

      {/* Center */}
      <div className="relative z-10 flex-1 flex flex-col justify-center">
        <p className="text-white/30 text-xs font-medium mb-3 tracking-widest uppercase">
          Apresentação de Projeto
        </p>
        <h1 className="text-7xl font-black tracking-tight mb-5 leading-none"
            style={{ color: 'var(--color-brand)' }}>
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
            <span>{format(new Date(project.startDate), 'MMM yyyy', { locale: ptBR })}</span>
            <span className="font-bold" style={{ color: 'var(--color-brand)' }}>{pct}% concluído</span>
            <span>{format(new Date(project.endDate),   'MMM yyyy', { locale: ptBR })}</span>
          </div>
          <div className="h-1 bg-white/10 rounded-full overflow-hidden">
            <motion.div className="h-full rounded-full" style={{ background: 'var(--color-brand)' }}
              initial={{ width: 0 }} animate={{ width: `${pct}%` }}
              transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }} />
          </div>
        </div>
      </div>

      {/* Bottom */}
      <div className="relative z-10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center">
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

// ─── Slide: Phases ────────────────────────────────────────────────────────────

function PhasesSlide({ project }: { project: Project }) {
  return (
    <div className="w-full h-full flex flex-col p-14 relative overflow-hidden">
      <div className="relative z-10 mb-8">
        <p className="text-xs font-bold uppercase tracking-[0.2em] mb-1" style={{ color: 'var(--color-brand)' }}>
          Cronograma
        </p>
        <h2 className="text-3xl font-black text-white">Fases do Projeto</h2>
      </div>

      <div className="relative z-10 flex-1 flex flex-col justify-center gap-2.5">
        {project.phases.map((phase, idx) => {
          const cfg = STATUS[phase.status] ?? STATUS.pending;
          const isActive = phase.status === 'in_progress';
          return (
            <motion.div key={phase.id}
              initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="flex items-center gap-4 px-5 py-3 rounded-2xl border transition-all"
              style={isActive
                ? { background: `color-mix(in srgb, ${cfg.color} 10%, transparent)`, borderColor: `color-mix(in srgb, ${cfg.color} 35%, transparent)` }
                : { background: 'rgba(255,255,255,0.025)', borderColor: 'rgba(255,255,255,0.06)' }}>
              <cfg.Icon className="w-4 h-4 flex-shrink-0" style={{ color: cfg.color }} />
              <div className="flex-1 min-w-0 flex items-center gap-2">
                <span className={`text-sm font-semibold ${isActive ? 'text-white' : 'text-white/55'}`}>
                  {phase.name}
                </span>
                {isActive && (
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full"
                        style={{ background: `color-mix(in srgb, ${cfg.color} 25%, transparent)`, color: cfg.color }}>
                    AGORA
                  </span>
                )}
              </div>
              <span className="text-xs text-white/25 font-mono flex-shrink-0">
                {format(new Date(phase.startDate), 'dd/MM')} – {format(new Date(phase.endDate), 'dd/MM')}
              </span>
              <div className="w-14 h-1 rounded-full bg-white/5 flex-shrink-0 overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{
                  background: cfg.color,
                  width: phase.status === 'completed' ? '100%' : phase.status === 'in_progress' ? '55%' : '0%',
                }} />
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Slide: KPIs ─────────────────────────────────────────────────────────────

function KPIsSlide({ project }: { project: Project }) {
  const latest = project.weeklyUpdates?.slice(-1)[0];
  if (!latest) return null;

  const { distributorsTotal: total, distributorsIntegrated: done,
          distributorsPending: pending, distributorsBlocked: blocked } = latest;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  const stats = [
    { label: 'Total',      value: total,   color: '#ffffff',  bg: 'rgba(255,255,255,0.06)', border: 'rgba(255,255,255,0.12)' },
    { label: 'Integrados', value: done,    color: '#22c55e',  bg: 'rgba(34,197,94,0.08)',   border: 'rgba(34,197,94,0.22)'   },
    { label: 'Pendentes',  value: pending, color: '#f59e0b',  bg: 'rgba(245,158,11,0.08)',  border: 'rgba(245,158,11,0.22)'  },
    { label: 'Bloqueados', value: blocked, color: '#ef4444',  bg: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.22)'   },
  ];

  return (
    <div className="w-full h-full flex flex-col p-14 relative overflow-hidden">
      <div className="relative z-10 mb-8">
        <p className="text-xs font-bold uppercase tracking-[0.2em] mb-1" style={{ color: 'var(--color-brand)' }}>
          Semana {latest.weekNumber}
        </p>
        <h2 className="text-3xl font-black text-white">Status de Integrações</h2>
      </div>

      <div className="relative z-10 flex-1 flex flex-col justify-center gap-7">
        {/* Big number + bar */}
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

        {/* 4 stat cards */}
        <div className="grid grid-cols-4 gap-4">
          {stats.map((s, i) => (
            <motion.div key={s.label}
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 + 0.3 }}
              className="rounded-2xl p-5 text-center"
              style={{ background: s.bg, border: `1px solid ${s.border}` }}>
              <div className="text-4xl font-black mb-1.5" style={{ color: s.color }}>{s.value}</div>
              <div className="text-[10px] font-bold text-white/40 uppercase tracking-wider">{s.label}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Slide: List (Highlights / Blockers / Next Steps) ────────────────────────

function ListSlide({ project, type }: { project: Project; type: 'highlights' | 'blockers' | 'nextsteps' }) {
  const latest = project.weeklyUpdates?.slice(-1)[0];
  if (!latest) return null;

  const cfg = {
    highlights: { label: 'Destaques',  title: 'Destaques da Semana', items: latest.highlights ?? [], accent: 'var(--color-brand)', icon: '✦' },
    blockers:   { label: 'Riscos',     title: 'Bloqueios & Riscos',  items: latest.blockers   ?? [], accent: '#ef4444',             icon: '⚠' },
    nextsteps:  { label: 'Ações',      title: 'Próximos Passos',     items: latest.nextSteps  ?? [], accent: '#22c55e',             icon: '→' },
  }[type];

  return (
    <div className="w-full h-full flex flex-col p-14 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full blur-[100px] opacity-10 pointer-events-none"
           style={{ background: cfg.accent }} />
      <div className="relative z-10 mb-10">
        <p className="text-xs font-bold uppercase tracking-[0.2em] mb-1" style={{ color: cfg.accent }}>
          {cfg.label}
        </p>
        <h2 className="text-3xl font-black text-white">{cfg.title}</h2>
      </div>
      <div className="relative z-10 flex-1 flex flex-col justify-center gap-4">
        {cfg.items.length === 0
          ? <p className="text-white/25 text-lg">Nenhum item registrado.</p>
          : cfg.items.map((item, idx) => (
            <motion.div key={idx} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }} className="flex items-start gap-5">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5"
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

// ─── Slide: Summary (AI) ──────────────────────────────────────────────────────

function SummarySlide({ project, aiContent }: { project: Project; aiContent: any }) {
  return (
    <div className="w-full h-full flex flex-col p-14 relative overflow-hidden">
      <div className="absolute inset-0 opacity-5 pointer-events-none"
           style={{ background: 'radial-gradient(circle at 70% 50%, var(--color-brand), transparent 60%)' }} />
      <div className="relative z-10 mb-10">
        <p className="text-xs font-bold uppercase tracking-[0.2em] mb-1" style={{ color: 'var(--color-brand)' }}>
          Gerado por IA
        </p>
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
    <div className="flex items-center justify-center gap-2 px-8 py-3 border-t border-white/5 flex-shrink-0">
      {slides.map((slide, idx) => (
        <button key={slide.id} onClick={() => onSelect(idx)}
          className="flex flex-col items-center gap-1 group transition-all">
          <div className="w-[72px] h-10 rounded-lg border flex items-center justify-center text-[9px] font-bold uppercase tracking-wider transition-all"
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
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);

  const [project,     setProject]     = useState<Project | null>(null);
  const [aiContent,   setAiContent]   = useState<any>(null);
  const [generating,  setGenerating]  = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [direction,   setDirection]   = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.replace('/');
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!id) return;
    return subscribeToProject(id, setProject);
  }, [id]);

  const slides = project ? buildSlides(project, aiContent) : [];

  const go = useCallback((delta: number) => {
    setDirection(delta);
    setCurrentSlide(prev => Math.min(Math.max(0, prev + delta), slides.length - 1));
  }, [slides.length]);

  // Keyboard
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
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
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

  const handleGenerate = async () => {
    if (!project) return;
    setGenerating(true);
    try {
      const activePhase = project.phases.find(p => p.status === 'in_progress')?.name ?? 'Concluído';
      const result = await generatePresentationContent({
        clientName: project.clientName,
        currentPhase: activePhase,
        startDate: project.startDate,
        endDate: project.endDate,
        weeklyUpdates: project.weeklyUpdates ?? [],
        phases: project.phases.map(p => ({ ...p, status: p.status as any })),
      });
      setAiContent(result);
    } catch (err) {
      console.error(err);
    } finally {
      setGenerating(false);
    }
  };

  if (!project) return null;

  const slide = slides[currentSlide];

  const variants = {
    enter:  (d: number) => ({ opacity: 0, x: d > 0 ? 60 : -60 }),
    center: { opacity: 1, x: 0 },
    exit:   (d: number) => ({ opacity: 0, x: d > 0 ? -60 : 60 }),
  };

  return (
    <div ref={containerRef} className="flex-1 flex flex-col h-screen bg-[#050508]">

      {/* Header */}
      <header className="h-14 border-b border-white/5 flex items-center justify-between px-6 bg-black/40 backdrop-blur-md flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-white">{project.clientName}</span>
          <span className="text-white/20 text-xs">·</span>
          <span className="text-xs text-white/35">Slides de Apresentação</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/20 font-mono mr-1">
            {currentSlide + 1} / {slides.length}
          </span>
          <button onClick={handleGenerate} disabled={generating}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-white/60 hover:bg-white/10 hover:text-white transition-all disabled:opacity-40">
            {generating
              ? <Loader2 className="w-3 h-3 animate-spin" />
              : <Sparkles className="w-3 h-3" style={{ color: 'var(--color-brand)' }} />}
            {aiContent ? 'Atualizar IA' : 'Resumo IA'}
          </button>
          <button onClick={toggleFullscreen}
            className="p-1.5 rounded-xl bg-white/5 border border-white/10 text-white/35 hover:text-white transition-all">
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Slide */}
      <main className="flex-1 flex items-center justify-center p-8 relative overflow-hidden min-h-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[140px] opacity-[0.04] pointer-events-none"
             style={{ background: 'var(--color-brand)' }} />

        <div className="relative w-full max-w-5xl overflow-hidden rounded-[28px] border border-white/[0.07]"
             style={{
               aspectRatio: '16/9',
               background: 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)',
               backdropFilter: 'blur(24px)',
               boxShadow: '0 40px 100px rgba(0,0,0,0.7)',
             }}>
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div key={currentSlide} custom={direction} variants={variants}
              initial="enter" animate="center" exit="exit"
              transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
              className="absolute inset-0">
              {slide && (
                <>
                  {slide.type === 'cover'      && <CoverSlide   project={project} />}
                  {slide.type === 'phases'     && <PhasesSlide  project={project} />}
                  {slide.type === 'kpis'       && <KPIsSlide    project={project} />}
                  {(slide.type === 'highlights' || slide.type === 'blockers' || slide.type === 'nextsteps') && (
                    <ListSlide project={project} type={slide.type} />
                  )}
                  {slide.type === 'summary'    && <SummarySlide project={project} aiContent={aiContent} />}
                </>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Arrow buttons */}
          <button onClick={() => go(-1)} disabled={currentSlide === 0}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl bg-black/50 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:bg-black/70 disabled:opacity-0 disabled:pointer-events-none transition-all">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button onClick={() => go(1)} disabled={currentSlide === slides.length - 1}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl bg-black/50 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:bg-black/70 disabled:opacity-0 disabled:pointer-events-none transition-all">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </main>

      {/* Thumbnail strip */}
      <ThumbnailStrip slides={slides} current={currentSlide}
        onSelect={i => { setDirection(i > currentSlide ? 1 : -1); setCurrentSlide(i); }} />
    </div>
  );
}