
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, LayoutGrid, Search, Bell, UserCircle } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { ThemeHandler } from "@/components/ThemeHandler";

// Mock Data
const PROJECTS = [
  {
    id: "bombril-1",
    clientName: "Bombril",
    clientLogo: "https://picsum.photos/seed/bombril-logo/100/100",
    clientColor: "#FF0000",
    mascotImageUrl: "https://picsum.photos/seed/mascot-bombril/300/300",
    progress: 65,
    status: "Fase 5: Implementação",
    week: "Semana 12"
  },
  {
    id: "bic-1",
    clientName: "BIC",
    clientLogo: "https://picsum.photos/seed/bic-logo/100/100",
    clientColor: "#F5B041",
    mascotImageUrl: "https://picsum.photos/seed/mascot-bic/300/300",
    progress: 30,
    status: "Fase 3: PIC",
    week: "Semana 4"
  },
  {
    id: "peccin-1",
    clientName: "Peccin",
    clientLogo: "https://picsum.photos/seed/peccin-logo/100/100",
    clientColor: "#27AE60",
    mascotImageUrl: "https://picsum.photos/seed/mascot-peccin/300/300",
    progress: 90,
    status: "Fase 7: On Going",
    week: "Semana 24"
  }
];

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-black text-white">
      <ThemeHandler />
      
      <header className="h-20 border-b border-white/10 flex items-center justify-between px-8 sticky top-0 bg-black/80 backdrop-blur-xl z-20">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center">
            <Image 
                src="https://picsum.photos/seed/sellers-logo/80/80"
                alt="Logo"
                width={24}
                height={24}
             />
          </div>
          <div>
            <h2 className="text-xl font-headline font-bold">Sellers <span className="text-primary">Pulse</span></h2>
            <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Hub de Projetos</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="hidden md:flex items-center bg-white/5 border border-white/10 rounded-full px-4 py-2 gap-2">
            <Search className="w-4 h-4 text-white/40" />
            <input 
              type="text" 
              placeholder="Buscar indústria..." 
              className="bg-transparent border-none outline-none text-sm w-48 placeholder:text-white/20"
            />
          </div>
          <Button variant="ghost" size="icon" className="rounded-full hover:bg-white/5">
            <Bell className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-3 pl-4 border-l border-white/10">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold">Alexandre Sellers</p>
              <p className="text-xs text-white/40">Gerente de Implantação</p>
            </div>
            <div className="w-10 h-10 rounded-full overflow-hidden border border-white/10 bg-white/5 flex items-center justify-center">
              <UserCircle className="w-6 h-6 text-white/40" />
            </div>
          </div>
        </div>
      </header>

      <main className="p-8 max-w-[1600px] mx-auto">
        <div className="flex items-center justify-between mb-12">
          <div>
            <h1 className="text-3xl font-headline font-bold mb-2">Seus Projetos Ativos</h1>
            <p className="text-white/60">Gerencie a evolução das implantações e apresente para os clientes.</p>
          </div>
          <Button className="h-12 px-6 rounded-2xl bg-primary hover:bg-primary/90 text-white font-bold gap-2">
            <Plus className="w-5 h-5" />
            Novo Projeto
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {PROJECTS.map((project) => (
            <Link key={project.id} href={`/project/${project.id}`}>
              <Card 
                className="group overflow-hidden bg-white/5 border-white/10 hover:border-white/20 transition-all duration-300 rounded-3xl cursor-pointer relative"
              >
                {/* Brand Accent */}
                <div 
                  className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-500"
                  style={{ background: `radial-gradient(circle at top right, ${project.clientColor}, transparent)` }}
                />

                <div className="p-6 relative z-10">
                  <div className="flex items-start justify-between mb-6">
                    <div className="w-12 h-12 rounded-2xl glass p-2 flex items-center justify-center overflow-hidden">
                      <Image 
                        src={project.clientLogo} 
                        alt={project.clientName} 
                        width={40} 
                        height={40}
                        className="object-contain"
                      />
                    </div>
                    <div className="px-3 py-1 rounded-full glass text-[10px] font-bold uppercase tracking-wider text-white/60">
                      {project.week}
                    </div>
                  </div>

                  <h3 className="text-2xl font-headline font-bold mb-1">{project.clientName}</h3>
                  <p className="text-sm text-white/40 mb-6 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    {project.status}
                  </p>

                  <div className="relative mb-6 flex justify-center py-4">
                    <Image 
                      src={project.mascotImageUrl} 
                      alt="Mascot" 
                      width={160} 
                      height={160}
                      className="drop-shadow-[0_10px_30px_rgba(0,0,0,0.5)] transform group-hover:scale-110 transition-transform duration-500"
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-white/40">
                      <span>Progresso Geral</span>
                      <span>{project.progress}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                      <div 
                        className="h-full transition-all duration-1000 group-hover:brand-glow"
                        style={{ width: `${project.progress}%`, backgroundColor: project.clientColor }}
                      />
                    </div>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
          
          <button className="h-[460px] border-2 border-dashed border-white/10 hover:border-primary/50 rounded-3xl flex flex-col items-center justify-center gap-4 transition-all duration-300 group bg-white/2">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-primary/20 group-hover:scale-110 transition-all">
              <Plus className="w-8 h-8 text-white/40 group-hover:text-primary transition-colors" />
            </div>
            <span className="font-headline font-bold text-white/40 group-hover:text-white transition-colors">Criar Nova Indústria</span>
          </button>
        </div>
      </main>
    </div>
  );
}
