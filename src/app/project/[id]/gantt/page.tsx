
'use client'

import { useParams, useRouter } from 'next/navigation'
import { doc } from 'firebase/firestore'
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase'
import type { Project } from '@/types'
import GanttChartComponent from '@/components/gantt/GanttChart'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { ChevronLeft, Info } from 'lucide-react'
import Link from 'next/link'

export default function GanttPage() {
  const { id } = useParams<{ id: string }>()
  const db = useFirestore()
  const router = useRouter()
  
  const projectRef = useMemoFirebase(() => {
    if (!db || !id) return null
    return doc(db, 'projects', id)
  }, [db, id])

  const { data: project, isLoading } = useDoc<Project>(projectRef)

  if (isLoading) return <GanttSkeleton />
  if (!project) return <NotFound />

  return (
    <main className="p-8 max-w-[1400px] mx-auto w-full space-y-8">
      {/* Header com navegação e contexto */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 mb-2">
            <Link href={`/project/${id}`}>
              <Button variant="ghost" size="sm" className="h-8 px-2 text-white/40 hover:text-white hover:bg-white/5">
                <ChevronLeft className="w-4 h-4 mr-1" />
                Voltar
              </Button>
            </Link>
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/20">Cronograma Detalhado</span>
          </div>
          <h1 className="text-3xl font-black text-white">
            Gantt: <span className="text-brand-gradient">{project.clientName}</span>
          </h1>
          <p className="text-white/40 text-sm max-w-2xl">
            Acompanhe a linha do tempo e gerencie as fases de implantação. Clique no nome para renomear ou use o hover para trocar o status.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="glass px-4 py-2.5 rounded-xl border-white/5 flex items-center gap-3">
            <Info className="w-4 h-4 text-primary" />
            <div className="text-[11px] leading-tight">
              <p className="text-white font-bold">Dica de Gestão</p>
              <p className="text-white/40">Mantenha os status sempre atualizados para o cliente.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Componente Centralizado de Gantt */}
      <div className="relative">
        <GanttChartComponent project={project} />
      </div>

      {/* Legenda e Rodapé da Página */}
      <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4 pt-4 border-t border-white/5 text-[10px] font-bold uppercase tracking-[0.2em] text-white/20">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-[#10B981]" />
          <span>Concluído</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-primary" />
          <span>Em Progresso</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
          <span>Bloqueado</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full border border-white/20" />
          <span>Aguardando</span>
        </div>
      </div>
    </main>
  )
}

function GanttSkeleton() {
  return (
    <div className="p-8 max-w-[1400px] mx-auto w-full space-y-8 animate-pulse">
      <div className="h-10 w-64 bg-white/5 rounded-xl" />
      <div className="h-[500px] w-full bg-white/5 rounded-2xl" />
    </div>
  )
}

function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-8">
      <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-6">
        <Info className="w-8 h-8 text-white/20" />
      </div>
      <h2 className="text-xl font-bold text-white mb-2">Projeto não localizado</h2>
      <p className="text-white/40 text-sm mb-6 max-w-xs">Não conseguimos encontrar os detalhes deste projeto para gerar o cronograma.</p>
      <Link href="/dashboard">
        <Button variant="outline" className="glass border-white/10">Voltar ao Dashboard</Button>
      </Link>
    </div>
  )
}
