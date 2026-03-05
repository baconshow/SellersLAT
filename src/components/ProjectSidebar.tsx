
"use client";

import { useState } from "react";
import { 
  LayoutDashboard, 
  GanttChartSquare, 
  Presentation, 
  History, 
  MessageSquareText, 
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface SidebarProps {
  clientId: string;
}

export function ProjectSidebar({ clientId }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  const navItems = [
    { label: "Dashboard", icon: LayoutDashboard, href: `/project/${clientId}` },
    { label: "Gantt", icon: GanttChartSquare, href: `/project/${clientId}/gantt` },
    { label: "Apresentação", icon: Presentation, href: `/project/${clientId}/slides` },
    { label: "Atualizações", icon: History, href: `/project/${clientId}/updates` },
    { label: "Sellers AI", icon: MessageSquareText, href: `/project/${clientId}/chat` },
    { label: "Configurações", icon: Settings, href: `/project/${clientId}/settings` },
  ];

  return (
    <aside 
      className={cn(
        "h-screen sticky top-0 bg-[#080808] border-r border-white/10 transition-all duration-300 flex flex-col z-30",
        collapsed ? "w-20" : "w-64"
      )}
    >
      <div className="p-6 flex items-center justify-between">
        {!collapsed && (
          <Link href="/dashboard" className="font-headline font-bold text-lg tracking-tight">
            Sellers <span className="text-primary">Pulse</span>
          </Link>
        )}
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => setCollapsed(!collapsed)}
          className="ml-auto hover:bg-white/5 rounded-xl"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </Button>
      </div>

      <nav className="flex-1 px-3 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link 
              key={item.href} 
              href={item.href}
              className={cn(
                "flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 group relative",
                isActive ? "bg-primary text-white" : "text-white/40 hover:text-white hover:bg-white/5"
              )}
            >
              <item.icon className={cn("w-5 h-5 shrink-0", isActive && "text-white")} />
              {!collapsed && <span className="font-medium">{item.label}</span>}
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-white rounded-r-full" />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/10 space-y-4">
        <div className={cn("flex items-center gap-3 px-2", collapsed ? "justify-center" : "")}>
          <div className="w-8 h-8 rounded-full bg-primary/20 border border-white/10 flex items-center justify-center shrink-0">
            <span className="text-[10px] font-bold">AS</span>
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <p className="text-xs font-bold truncate">Alexandre Sellers</p>
              <p className="text-[10px] text-white/40 truncate">Admin Sellers</p>
            </div>
          )}
        </div>
        <Link href="/">
          <Button variant="ghost" className={cn("w-full justify-start gap-4 hover:bg-white/5 rounded-xl text-white/40", collapsed && "justify-center px-0")}>
            <LogOut className="w-5 h-5" />
            {!collapsed && <span>Sair</span>}
          </Button>
        </Link>
      </div>
    </aside>
  );
}
