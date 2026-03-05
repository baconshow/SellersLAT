
"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, Edit2, GripVertical, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { DEFAULT_PHASES, ProjectStatus } from "@/types/project";

interface Phase {
  id: string;
  name: string;
  status: ProjectStatus;
  startWeek: number;
  durationWeeks: number;
}

const INITIAL_PHASES: Phase[] = [
  { id: '1', name: "Reunião de Boas-Vindas", status: 'completed', startWeek: 1, durationWeeks: 1 },
  { id: '2', name: "Coleta de Dados", status: 'completed', startWeek: 2, durationWeeks: 3 },
  { id: '3', name: "PIC — Plano de Impacto", status: 'completed', startWeek: 5, durationWeeks: 2 },
  { id: '4', name: "Entrega Lista Distribuidores", status: 'in_progress', startWeek: 7, durationWeeks: 2 },
  { id: '5', name: "Implementação", status: 'in_progress', startWeek: 9, durationWeeks: 8 },
  { id: '6', name: "Onboarding", status: 'pending', startWeek: 17, durationWeeks: 3 },
  { id: '7', name: "On Going", status: 'pending', startWeek: 20, durationWeeks: 4 },
];

export default function GanttPage() {
  const [phases, setPhases] = useState(INITIAL_PHASES);
  const totalWeeks = 24;
  const currentWeek = 12;

  return (
    <main className="p-8 max-w-[1400px] mx-auto w-full">
      <div className="flex items-center justify-between mb-12">
        <div>
          <h1 className="text-3xl font-headline font-bold">Cronograma Gantt</h1>
          <p className="text-white/60">Visão temporal e fases da implantação</p>
        </div>
        <div className="flex gap-3">
           <Button variant="outline" className="glass border-white/10 gap-2">
             <CalendarIcon className="w-4 h-4" />
             Ajustar Datas
           </Button>
           <Button className="bg-primary hover:bg-primary/90 gap-2">
             <Plus className="w-4 h-4" />
             Adicionar Fase
           </Button>
        </div>
      </div>

      <Card className="glass border-white/5 overflow-hidden">
        <div className="flex flex-col">
          {/* Header Time Axis */}
          <div className="flex border-b border-white/5">
            <div className="w-[300px] p-4 font-bold uppercase text-[10px] text-white/40 tracking-widest bg-white/[0.02]">Fases do Projeto</div>
            <div className="flex-1 flex overflow-x-auto">
              {Array.from({ length: totalWeeks }).map((_, i) => (
                <div 
                  key={i} 
                  className={cn(
                    "min-w-[40px] flex-1 text-center py-4 text-[10px] font-bold border-l border-white/5",
                    i + 1 === currentWeek ? "bg-primary/10 text-primary" : "text-white/40"
                  )}
                >
                  {i + 1}
                </div>
              ))}
            </div>
          </div>

          {/* Timeline Grid */}
          <div className="relative">
            {/* Current Week Indicator Line */}
            <div 
              className="absolute top-0 bottom-0 w-px bg-primary z-10 brand-glow flex flex-col items-center"
              style={{ left: `calc(300px + ${(currentWeek - 1) * (100 / totalWeeks)}%)` }}
            >
              <div className="bg-primary text-[8px] font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap -mt-2 uppercase tracking-tighter">
                📍 Estamos Aqui
              </div>
            </div>

            {phases.map((phase) => (
              <div key={phase.id} className="flex border-b border-white/5 group hover:bg-white/[0.02] transition-colors">
                <div className="w-[300px] p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <GripVertical className="w-4 h-4 text-white/10 group-hover:text-white/40 cursor-grab" />
                    <div>
                      <p className="text-sm font-bold">{phase.name}</p>
                      <StatusBadge status={phase.status} />
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <Edit2 className="w-3 h-3 text-white/40" />
                  </Button>
                </div>
                <div className="flex-1 flex relative items-center px-1">
                  <div 
                    className={cn(
                      "h-8 rounded-lg relative transition-all duration-500 brand-border-gradient overflow-hidden",
                      phase.status === 'completed' ? "opacity-40" : "opacity-100",
                      phase.id === '5' ? "brand-glow animate-pulse-glow" : ""
                    )}
                    style={{ 
                      marginLeft: `${(phase.startWeek - 1) * (100 / totalWeeks)}%`, 
                      width: `${(phase.durationWeeks) * (100 / totalWeeks)}%`,
                      background: `linear-gradient(to right, hsl(var(--brand)), hsl(var(--brand-secondary)))`
                    }}
                  >
                    <div className="absolute inset-0 bg-white/10 flex items-center justify-center text-[10px] font-bold uppercase truncate px-2">
                       {phase.durationWeeks} Semanas
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <div className="mt-8 flex items-center justify-center gap-8 text-[10px] font-bold uppercase text-white/40 tracking-widest">
         <div className="flex items-center gap-2">
           <div className="w-3 h-3 rounded-sm bg-white/40" />
           <span>Concluído</span>
         </div>
         <div className="flex items-center gap-2">
           <div className="w-3 h-3 rounded-sm bg-primary" />
           <span>Em Progresso</span>
         </div>
         <div className="flex items-center gap-2">
           <div className="w-3 h-3 rounded-sm border border-white/20" />
           <span>Pendente</span>
         </div>
      </div>
    </main>
  );
}

function StatusBadge({ status }: { status: ProjectStatus }) {
  const styles: Record<ProjectStatus, string> = {
    completed: "text-green-500",
    in_progress: "text-primary",
    pending: "text-white/40",
    blocked: "text-red-500"
  };
  
  const labels: Record<ProjectStatus, string> = {
    completed: "Finalizado",
    in_progress: "Em curso",
    pending: "Aguardando",
    blocked: "Bloqueado"
  };

  return (
    <span className={cn("text-[8px] font-bold uppercase tracking-wider", styles[status])}>
      {labels[status]}
    </span>
  );
}
