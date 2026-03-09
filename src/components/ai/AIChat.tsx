'use client';

import { useState, useRef, useEffect } from "react";
import { Send, Sparkles, X, User, Bot, AlertTriangle, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";
import { projectAIChatAssistant } from "@/ai/flows/project-ai-chat-assistant";
import type { Project } from "@/types";

const ClaudeIcon = ({ size = 18, ...props }: any) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 50 50" {...props}>
    <path d="M19.861,27.625v-0.716l-16.65-0.681L2.07,25.985L1,24.575l0.11-0.703l0.959-0.645l17.95,1.345l0.11-0.314L5.716,14.365l-0.729-0.924l-0.314-2.016L5.985,9.98l2.214,0.24l11.312,8.602l0.327-0.353L12.623,5.977c0,0-0.548-2.175-0.548-2.697l1.494-2.029l0.827-0.266l2.833,0.995l7.935,17.331h0.314l1.348-14.819l0.752-1.822l1.494-0.985l1.167,0.557l0.959,1.374l-2.551,14.294h0.425l0.486-0.486l8.434-10.197l1.092-0.862h2.065l1.52,2.259l-0.681,2.334l-7.996,11.108l0.146,0.217l0.376-0.036l12.479-2.405l1.666,0.778l0.182,0.791l-0.655,1.617l-15.435,3.523l-0.084,0.062l0.097,0.12l13.711,0.814l1.578,1.044L49,29.868l-0.159,0.972l-2.431,1.238l-13.561-3.254h-0.363v0.217l11.218,10.427l0.256,1.154l-0.645,0.911l-0.681-0.097l-9.967-8.058h-0.256v0.34l5.578,8.35l0.243,2.162l-0.34,0.703l-1.215,0.425l-1.335-0.243l-7.863-12.083l-0.279,0.159l-1.348,14.524l-0.632,0.742l-1.459,0.558l-1.215-0.924L21.9,46.597l2.966-14.939l-0.023-0.084l-0.279,0.036L13.881,45.138l-0.827,0.327l-1.433-0.742l0.133-1.326l0.801-1.18l9.52-12.019l-0.013-0.314h-0.11l-12.69,8.239l-2.259,0.292L6.03,37.505l0.12-1.494l0.46-0.486L19.861,27.625z" fill="currentColor"/>
  </svg>
)

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
    { label: "Resumo", icon: ClaudeIcon, query: "Faça um resumo executivo da última semana." },
  ];

  return (
    <div className={cn("flex flex-col h-full bg-[#0a0a0f]", !embedded && "rounded border border-white/10 shadow-2xl overflow-hidden")}>
      <header className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-black/20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-brand/20 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-brand" />
          </div>
          <h3 className="text-sm font-bold text-white">Sellers AI Assistant</h3>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-1.5 hover:bg-white/5 rounded transition-colors">
            <X className="w-4 h-4 text-white/40" />
          </button>
        )}
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth">
        {messages.map((msg, i) => (
          <div key={i} className={cn("flex gap-3", msg.role === 'user' ? "flex-row-reverse" : "")}>
            <div className={cn("w-8 h-8 rounded flex items-center justify-center shrink-0 border border-white/5", msg.role === 'assistant' ? "bg-brand/10" : "bg-white/5")}>
              {msg.role === 'assistant' ? <Bot className="w-4 h-4 text-brand" /> : <User className="w-4 h-4 text-white/40" />}
            </div>
            <div className={cn("max-w-[85%] p-4 rounded text-xs leading-relaxed", msg.role === 'assistant' ? "bg-white/5 text-white/80" : "bg-brand text-black font-medium")}>
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded bg-brand/10 flex items-center justify-center shrink-0 animate-pulse">
              <Bot className="w-4 h-4 text-brand" />
            </div>
            <div className="p-4 rounded bg-white/5 border border-white/5">
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
            className="w-full bg-white/5 border border-white/10 rounded pl-4 pr-12 py-3 text-xs text-white focus:border-brand outline-none transition-all placeholder:text-white/20"
          />
          <button
            onClick={() => handleSend()}
            disabled={loading || !input.trim()}
            className="absolute right-2 top-1.5 bottom-1.5 w-9 rounded bg-brand flex items-center justify-center text-black hover:opacity-90 transition-all disabled:opacity-20"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </footer>
    </div>
  );
}
