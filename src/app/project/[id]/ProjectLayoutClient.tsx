'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import { cn } from '@/lib/utils';
import { getProject } from '@/lib/firestore';
import type { Project } from '@/types';

interface ProjectLayoutClientProps {
  children: React.ReactNode;
  projectId: string;
}

export default function ProjectLayoutClient({
  children,
  projectId,
}: ProjectLayoutClientProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [project,   setProject]   = useState<Project | null>(null);

  useEffect(() => {
    getProject(projectId).then(setProject).catch(() => null);
  }, [projectId]);

  const brandColor          = project?.clientColor          ?? '#00D4AA';
  const brandColorSecondary = project?.clientColorSecondary ?? '#8B5CF6';

  return (
    <div className="flex min-h-screen" style={{ background: '#050508' }}>
      <Sidebar
        projectId={projectId}
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        brandColor={brandColor}
        brandColorSecondary={brandColorSecondary}
      />
      <main
        className={cn(
          'flex-1 flex flex-col min-h-screen transition-all duration-300 ease-in-out min-w-0',
          collapsed ? 'ml-[72px]' : 'ml-[240px]'
        )}
      >
        {children}
      </main>
    </div>
  );
}