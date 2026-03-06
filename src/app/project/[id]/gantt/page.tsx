'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { subscribeToProject } from '@/lib/firestore';
import type { Project } from '@/types';
import GanttChartComponent from '@/components/gantt/GanttChart';
import { useAuth } from '@/contexts/AuthContext';

export default function GanttPage() {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) router.replace('/');
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!id) return;
    const unsub = subscribeToProject(id, (p) => {
      setProject(p);
      setLoading(false);
    });
    return unsub;
  }, [id]);

  if (loading) {
    return (
      <div className="p-8 space-y-4">
        <div className="h-8 w-48 rounded-md shimmer" />
        <div className="h-[400px] rounded-md shimmer" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-8 text-white/40">Projeto não encontrado.</div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-8"
    >
      <div className="mb-6">
        <h2 className="text-2xl font-black text-white">Cronograma</h2>
        <p className="text-white/40 text-sm mt-1">
          Gerenciamento detalhado das fases do projeto {project.clientName}.
        </p>
      </div>
      <GanttChartComponent project={project} />
    </motion.div>
  );
}
