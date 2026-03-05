'use client';

import { useState, useRef, useEffect } from "react";
import { Send, Sparkles, X, User, Bot, AlertTriangle, Lightbulb, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { projectAIChatAssistant } from "@/ai/flows/project-ai-chat-assistant";
import type { Project } from "@/types";

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface Props {
  project: Project;
  onClose?: () => void;
  embedded?: boolean;
}

export default function AIChat({ project, onClose, embedded }: Props) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    { 
      role: 'assistant', 
      content: `Olá! Sou a Sellers AI. Estou analisando o projeto **${project.clientName}**. Como posso ajudar você hoje?` 
    }
  ]);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (customQuery?: string) => {
    const query = customQuery || input;
    if (!query.trim() || loading) return;

    setInput("");
    setMessages(prev => [...prev, { role: 'user', content: query }]);
    setLoading(true);

    try {
      const activePhase = project.phases.find(p => p.status === 'in_progress')?.name || 'Concluído';
      
      const result = await projectAIChatAssistant({
        userQuery: query,
        projectData: {
          projectName: project.clientName,
          clientName: project.clientName,
          currentPhase: activePhase,
          startDate: project.startDate,
          endDate: project.endDate,
          phases: project.phases.map(p => ({
            name: p.name,
            status: p.status,
            startDate: p.startDate,
            endDate: p.endDate
          })),
          weeklyUpdates: (project.weeklyUpdates || []).map(u => ({
            ...u,
            date: new Date(u.date).toISOString()
          })),
          currentPresentationContent: {} // Opcional para este MVP
        }
      });

      setMessages(prev => [...prev, { role: 'assistant', content: result.aiResponse }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: "Desculpe, tive um problema ao processar sua análise." }]);
    } finally {
      setLoading(false);
    }
  };

  const suggestions = [
    { label: "Riscos", icon: AlertTriangle, query: "Quais são os principais riscos deste projeto hoje?" },
    { label: "Próximas Ações", icon: Lightbulb, query: "Sugira ações para acelerar a integração de distribuidores." },
    { label: "Resumo", icon: Zap, query: "Faça um resumo executivo da última semana." },
  ];

  return (
    <div className={cn("flex flex-col h-full bg-[#0a0a0f]", !embedded && "rounded-2xl border border-white/10 shadow-2xl overflow-hidden")}>
      <header className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-black/20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-brand/20 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-brand" />
          </div>
          <h3 className="text-sm font-bold text-white">Sellers AI Assistant</h3>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-1.5 hover:bg-white/5 rounded-lg transition-colors">
            <X className="w-4 h-4 text-white/40" />
          </button>
        )}
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth">
        {messages.map((msg, i) => (
          <div key={i} className={cn("flex gap-3", msg.role === 'user' ? "flex-row-reverse" : "")}>
            <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border border-white/5", msg.role === 'assistant' ? "bg-brand/10" : "bg-white/5")}>
              {msg.role === 'assistant' ? <Bot className="w-4 h-4 text-brand" /> : <User className="w-4 h-4 text-white/40" />}
            </div>
            <div className={cn("max-w-[85%] p-4 rounded-2xl text-xs leading-relaxed", msg.role === 'assistant' ? "bg-white/5 text-white/80" : "bg-brand text-black font-medium")}>
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-xl bg-brand/10 flex items-center justify-center shrink-0 animate-pulse">
              <Bot className="w-4 h-4 text-brand" />
            </div>
            <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
              <div className="flex gap-1">
                <span className="w-1 h-1 bg-brand rounded-full animate-bounce" />
                <span className="w-1 h-1 bg-brand rounded-full animate-bounce [animation-delay:0.2s]" />
                <span className="w-1 h-1 bg-brand rounded-full animate-bounce [animation-delay:0.4s]" />
              </div>
            </div>
          </div>
        )}
      </div>

      <footer className="p-4 bg-black/40 border-t border-white/5 space-y-4">
        <div className="flex flex-wrap gap-2">
          {suggestions.map((s, i) => (
            <button
              key={i}
              onClick={() => handleSend(s.query)}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/5 text-[10px] font-medium text-white/60 hover:bg-white/10 hover:text-white transition-all disabled:opacity-50"
            >
              <s.icon className="w-3 h-3 text-brand" />
              {s.label}
            </button>
          ))}
        </div>
        <div className="relative">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Pergunte sobre o status, riscos ou próximos passos..."
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-4 pr-12 py-3 text-xs text-white focus:border-brand outline-none transition-all placeholder:text-white/20"
          />
          <button
            onClick={() => handleSend()}
            disabled={loading || !input.trim()}
            className="absolute right-2 top-1.5 bottom-1.5 w-9 rounded-lg bg-brand flex items-center justify-center text-black hover:opacity-90 transition-all disabled:opacity-20"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </footer>
    </div>
  );
}
