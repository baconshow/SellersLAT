
"use client";

import { Card } from "@/components/ui/card";
import { 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Users, 
  TrendingUp, 
  Calendar,
  ChevronRight
} from "lucide-react";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import Image from "next/image";

const chartData = [
  { name: 'Sem 1', total: 0 },
  { name: 'Sem 4', total: 15 },
  { name: 'Sem 8', total: 45 },
  { name: 'Sem 12', total: 68 },
  { name: 'Sem 16', total: 85 },
];

export default function ProjectOverview() {
  return (
    <main className="p-8 max-w-[1400px] mx-auto w-full">
      <header className="flex items-end justify-between mb-12">
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 glass rounded-3xl p-4 flex items-center justify-center relative overflow-hidden">
            <Image 
              src="https://picsum.photos/seed/bombril-logo/100/100" 
              alt="Bombril" 
              width={60} 
              height={60}
              className="object-contain"
            />
          </div>
          <div>
            <div className="flex items-center gap-2 text-primary font-bold uppercase tracking-widest text-[10px] mb-1">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              Projeto em Andamento
            </div>
            <h1 className="text-4xl font-headline font-bold">Implantação Bombril</h1>
            <p className="text-white/40 mt-1">Status atualizado em 24 de Outubro, 2023</p>
          </div>
        </div>

        <div className="flex gap-4">
          <Card className="glass border-white/5 p-4 flex flex-col items-center justify-center min-w-[120px]">
            <span className="text-[10px] font-bold text-white/40 uppercase mb-1">Semana</span>
            <span className="text-2xl font-headline font-bold">12 / 24</span>
          </Card>
          <Card className="glass border-white/5 p-4 flex flex-col items-center justify-center min-w-[120px]">
            <span className="text-[10px] font-bold text-white/40 uppercase mb-1">Restantes</span>
            <span className="text-2xl font-headline font-bold">84 Dias</span>
          </Card>
        </div>
      </header>

      {/* KPI Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <KPICard 
          label="Total de Distribuidores" 
          value="150" 
          icon={Users} 
          trend="+12 na semana" 
        />
        <KPICard 
          label="Integrados ✅" 
          value="68" 
          icon={CheckCircle2} 
          color="hsl(var(--brand))"
          progress={45}
        />
        <KPICard 
          label="Pendentes ⏳" 
          value="54" 
          icon={Clock} 
          trend="22 em análise" 
        />
        <KPICard 
          label="Bloqueados 🚫" 
          value="28" 
          icon={AlertCircle} 
          color="#ef4444" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Evolution Chart */}
        <Card className="lg:col-span-2 glass border-white/5 p-8 flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-xl font-headline font-bold">Evolução de Integrações</h3>
              <p className="text-sm text-white/40">Progresso semanal acumulado</p>
            </div>
            <TrendingUp className="w-5 h-5 text-primary" />
          </div>
          
          <div className="h-[300px] w-full mt-auto">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--brand))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--brand))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  stroke="#ffffff40" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false} 
                />
                <YAxis 
                  stroke="#ffffff40" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false} 
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '12px' }}
                  itemStyle={{ color: 'hsl(var(--brand))' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="total" 
                  stroke="hsl(var(--brand))" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorTotal)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Milestone Card */}
        <div className="space-y-6">
          <Card className="glass border-white/5 p-6 brand-border-gradient">
            <h3 className="text-sm font-bold uppercase text-white/40 tracking-widest mb-4">Fase Atual</h3>
            <div className="flex items-start gap-4 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center shrink-0">
                <Calendar className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h4 className="text-lg font-bold">5. Implementação</h4>
                <p className="text-sm text-white/60">Integração de distribuidores e painéis BI</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between text-xs font-bold uppercase tracking-wider">
                <span className="text-white/40">Progresso da Fase</span>
                <span>72%</span>
              </div>
              <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-primary brand-glow" style={{ width: '72%' }} />
              </div>
            </div>
          </Card>

          <Card className="glass border-white/5 p-6 hover:bg-white/10 transition-colors cursor-pointer group">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold uppercase text-white/40 tracking-widest">Próximo Marco</h3>
              <ChevronRight className="w-4 h-4 text-white/40 group-hover:text-white transition-colors" />
            </div>
            <h4 className="text-lg font-bold mb-1">Treinamento Onboarding</h4>
            <p className="text-xs text-white/60">Agendado para 12 de Nov, 2023</p>
          </Card>

          <div className="flex justify-center p-4">
             <Image 
                src="https://picsum.photos/seed/mascot-bombril/300/300" 
                alt="Mascot" 
                width={180} 
                height={180}
                className="drop-shadow-[0_20px_40px_rgba(255,0,0,0.3)]"
             />
          </div>
        </div>
      </div>
    </main>
  );
}

function KPICard({ label, value, icon: Icon, trend, color, progress }: any) {
  return (
    <Card className="glass border-white/5 p-6 hover:bg-white/10 transition-all duration-300">
      <div className="flex items-center justify-between mb-4">
        <div 
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: color ? `${color}20` : 'rgba(255,255,255,0.05)' }}
        >
          <Icon className="w-5 h-5" style={{ color: color || 'white' }} />
        </div>
        {trend && <span className="text-[10px] font-bold text-white/40 uppercase">{trend}</span>}
      </div>
      <div className="space-y-1">
        <p className="text-xs font-bold text-white/40 uppercase tracking-wider">{label}</p>
        <p className="text-3xl font-headline font-bold">{value}</p>
      </div>
      {progress !== undefined && (
        <div className="mt-4 h-1 w-full bg-white/5 rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary brand-glow" 
            style={{ width: `${progress}%`, backgroundColor: color }} 
          />
        </div>
      )}
    </Card>
  );
}
