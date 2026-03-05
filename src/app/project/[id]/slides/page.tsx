'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Presentation, ChevronLeft, ChevronRight, Sparkles, Loader2, Download } from 'lucide-react';
import { subscribeToProject } from '@/lib/firestore';
import { generatePresentationContent } from '@/ai/flows/generate-presentation-content-flow';
import type { Project } from '@/types';
import { useAuth } from '@/contexts/AuthContext';

export default function SlidesPage() {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [content, setContent] = useState<any>(null);
  const [generating, setGenerating] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    if (!authLoading && !user) router.replace('/');
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!id) return;
    return subscribeToProject(id, setProject);
  }, [id]);

  const handleGenerate = async () => {
    if (!project) return;
    setGenerating(true);
    try {
      const activePhase = project.phases.find(p => p.status === 'in_progress')?.name || 'Concluído';
      const result = await generatePresentationContent({
        clientName: project.clientName,
        currentPhase: activePhase,
        startDate: project.startDate,
        endDate: project.endDate,
        weeklyUpdates: project.weeklyUpdates || [],
        phases: project.phases.map(p => ({
          ...p,
          status: p.status as any
        })),
      });
      setContent(result);
    } catch (error) {
      console.error(error);
    } finally {
      setGenerating(false);
    }
  };

  if (!project) return null;

  const slides = content ? [
    { title: "Resumo Executivo", content: content.executiveSummary },
    { title: "Status de Integrações", content: content.statusOfIntegrations },
    { title: "Fase Atual", content: content.currentPhaseSummary },
    { title: "Destaques da Semana", items: content.weeklyHighlights },
    { title: "Bloqueios e Riscos", items: content.weeklyBlockers },
    { title: "Próximos Passos", items: content.weeklyNextSteps },
  ] : [];

  return (
    <div className="flex-1 flex flex-col h-screen bg-[#050508]">
      <header className="h-16 border-b border-white/5 flex items-center justify-between px-8 bg-black/40 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <Presentation className="w-5 h-5 text-brand" />
          <h1 className="text-sm font-bold text-white">Slides de Apresentação • {project.clientName}</h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-white hover:bg-white/10 transition-all disabled:opacity-50"
          >
            {generating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3 text-brand" />}
            {content ? 'Atualizar Slides' : 'Gerar com IA'}
          </button>
          <button className="p-2 rounded-xl bg-white/5 border border-white/10 text-white/40 hover:text-white transition-all">
            <Download className="w-4 h-4" />
          </button>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-12 relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-brand/5 rounded-full blur-[120px] pointer-events-none" />
        
        {!content ? (
          <div className="text-center space-y-6 relative z-10">
            <div className="w-20 h-20 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-6">
              <Presentation className="w-10 h-10 text-white/20" />
            </div>
            <h2 className="text-2xl font-bold text-white">Nenhum slide gerado</h2>
            <p className="text-white/40 text-sm max-w-xs mx-auto">
              Utilize nossa IA para analisar todos os dados do projeto e gerar uma apresentação executiva completa.
            </p>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="px-8 py-3 rounded-2xl bg-brand text-black font-bold text-sm hover:scale-105 active:scale-95 transition-all flex items-center gap-2 mx-auto"
            >
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Gerar Apresentação Agora
            </button>
          </div>
        ) : (
          <div className="w-full max-w-5xl aspect-[16/9] glass-strong rounded-[32px] p-16 relative overflow-hidden flex flex-col justify-center border-white/10 shadow-[0_40px_100px_rgba(0,0,0,0.6)]">
            <div className="absolute top-0 right-0 w-64 h-64 bg-brand/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2" />
            
            <AnimatePresence mode="wait">
              <motion.div
                key={currentSlide}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="relative z-10"
              >
                <h3 className="text-brand text-xs font-bold uppercase tracking-[0.2em] mb-4">
                  Slide {currentSlide + 1} • {slides[currentSlide].title}
                </h3>
                <h2 className="text-4xl md:text-5xl font-black text-white mb-8 leading-tight">
                  {slides[currentSlide].title}
                </h2>
                
                {slides[currentSlide].content && (
                  <p className="text-xl md:text-2xl text-white/60 leading-relaxed font-light">
                    {slides[currentSlide].content}
                  </p>
                )}
                
                {slides[currentSlide].items && (
                  <ul className="space-y-4">
                    {slides[currentSlide].items.map((item: string, idx: number) => (
                      <motion.li
                        key={idx}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="flex items-start gap-4 text-xl text-white/70"
                      >
                        <div className="w-2 h-2 rounded-full bg-brand mt-3" />
                        {item}
                      </motion.li>
                    ))}
                  </ul>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Pagination */}
            <div className="absolute bottom-12 left-16 right-16 flex items-center justify-between">
              <div className="flex gap-2">
                {slides.map((_, idx) => (
                  <div
                    key={idx}
                    className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentSlide ? 'w-8 bg-brand' : 'w-2 bg-white/10'}`}
                  />
                ))}
              </div>
              <div className="flex gap-4">
                <button
                  onClick={() => setCurrentSlide(prev => Math.max(0, prev - 1))}
                  disabled={currentSlide === 0}
                  className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-white/10 disabled:opacity-20 transition-all"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  onClick={() => setCurrentSlide(prev => Math.min(slides.length - 1, prev + 1))}
                  disabled={currentSlide === slides.length - 1}
                  className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-white/10 disabled:opacity-20 transition-all"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
