'use client';

import { useState } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import { cn } from '@/lib/utils';

interface ProjectLayoutClientProps {
  children: React.ReactNode;
  projectId: string;
}

export default function ProjectLayoutClient({
  children,
  projectId,
}: ProjectLayoutClientProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex min-h-screen" style={{ background: '#050508' }}>
      <Sidebar 
        projectId={projectId} 
        collapsed={collapsed} 
        setCollapsed={setCollapsed} 
      />
      <main 
        className={cn(
          "flex-1 flex flex-col min-h-screen transition-all duration-300 ease-in-out min-w-0",
          collapsed ? "ml-[72px]" : "ml-[240px]"
        )}
      >
        {children}
      </main>
    </div>
  );
}
