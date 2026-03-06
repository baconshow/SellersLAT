"use client";

import { useState, useRef, useEffect } from "react";
import { useParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Send, 
  Sparkles, 
  Mic, 
  User, 
  Bot, 
  ShieldAlert, 
  Lightbulb
} from "lucide-react";
import { cn } from "@/lib/utils";
import { projectAIChatAssistant } from "@/ai/flows/project-ai-chat-assistant";

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function ChatPage() {
  const { id } = useParams<{ id: string }>();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    { 
      role: 'assistant', 
      content: "Olá! Sou a Sellers AI. Posso ajudar com análises do projeto, resumos de status, identificação de riscos ou até atualizar os slides da sua apresentação. Como posso ajudar hoje?" 
    }
  ]);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input;
    setInput("");
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const projectDataMock = {
        projectName: "Projeto Sellers Pulse",
        clientName: "Cliente Ativo",
        currentPhase: "Implementação",
        startDate: new Date().toISOString(),
        endDate: new Date().toISOString(),
        phases: [],
        weeklyUpdates: [],
        currentPresentationContent: {}
      };

      const result = await projectAIChatAssistant({
        userQuery: userMessage,
        projectData: projectDataMock
      });

      setMessages(prev => [...prev, { role: 'assistant', content: result.aiResponse }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: "Desculpe, tive um problema ao processar sua solicitação." }]);
    } finally {
      setLoading(false);
    }
  };

  const suggestions = [
    { label: "Resumo Executivo", icon: Sparkles, query: "Gere um resumo executivo para este projeto." },
    { label: "Análise de Riscos", icon: ShieldAlert, query: "Quais são os principais riscos atuais?" },
    { label: "Próximas Ações", icon: Lightbulb, query: "Sugira os próximos passos para a próxima semana." },
  ];

  return (
    <main className="flex-1 flex flex-col h-screen overflow-hidden">
      <header className="h-20 border-b border-white/10 flex items-center justify-between px-8 bg-black/50 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-primary/20 flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-headline font-bold">Sellers AI</h2>
            <p className="text-[10px] text-white/40 uppercase font-bold tracking-widest">Assistente Inteligente</p>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col relative">
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-8 space-y-8 scroll-smooth">
            {messages.map((msg, i) => (
              <div key={i} className={cn("flex gap-4 max-w-[800px]", msg.role === 'user' ? "ml-auto flex-row-reverse" : "")}>
                <div className={cn("w-10 h-10 rounded-md flex items-center justify-center shrink-0 glass", msg.role === 'assistant' ? "bg-primary/20" : "bg-white/5")}>
                  {msg.role === 'assistant' ? <Bot className="w-6 h-6 text-primary" /> : <User className="w-6 h-6 text-white/40" />}
                </div>
                <div className={cn("p-5 rounded-md text-sm leading-relaxed", msg.role === 'assistant' ? "bg-white/5 border border-white/5" : "bg-primary text-white")}>
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-4 max-w-[800px]">
                <div className="w-10 h-10 rounded-md bg-primary/20 flex items-center justify-center glass shrink-0">
                  <Bot className="w-6 h-6 text-primary" />
                </div>
                <div className="p-5 rounded-md bg-white/5 border border-white/5">
                  <div className="flex gap-2">
                    <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" />
                    <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce delay-100" />
                    <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce delay-200" />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="p-8">
            <div className="max-w-[800px] mx-auto space-y-6">
              <div className="flex flex-wrap gap-3">
                {suggestions.map((s, i) => (
                  <button key={i} onClick={() => { setInput(s.query); }} className="flex items-center gap-2 px-4 py-2 rounded-full glass hover:bg-white/10 text-xs font-medium transition-all">
                    <s.icon className="w-3 h-3 text-primary" />
                    {s.label}
                  </button>
                ))}
              </div>
              <div className="relative">
                <Input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()} placeholder="Pergunte qualquer coisa sobre o projeto..." className="h-16 pl-6 pr-24 bg-white/5 border-white/10 rounded-md focus-visible:ring-primary focus-visible:ring-offset-0 placeholder:text-white/20" />
                <div className="absolute right-2 top-2 bottom-2 flex gap-2">
                  <Button variant="ghost" size="icon" className="rounded-md hover:bg-white/5 h-full w-12 text-white/40">
                    <Mic className="w-5 h-5" />
                  </Button>
                  <Button onClick={handleSend} disabled={loading} className="bg-primary hover:bg-primary/90 rounded-md h-full w-12">
                    <Send className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <aside className="w-80 border-l border-white/10 p-8 hidden xl:block bg-black/20">
          <h3 className="text-xs font-bold uppercase text-white/40 tracking-widest mb-6">Sugestões de Análise</h3>
          <div className="space-y-4">
            <Card className="glass border-white/5 p-4 hover:bg-white/5 transition-colors cursor-pointer rounded-md">
              <p className="text-xs font-bold text-primary mb-2">KPIs Semanais</p>
              <p className="text-sm font-medium">Como está a evolução da integração de distribuidores comparada à meta?</p>
            </Card>
            <Card className="glass border-white/5 p-4 hover:bg-white/5 transition-colors cursor-pointer rounded-md">
              <p className="text-xs font-bold text-primary mb-2">Bloqueios</p>
              <p className="text-sm font-medium">Resuma os principais impedimentos técnicos relatados na última reunião.</p>
            </Card>
            <Card className="glass border-white/5 p-4 hover:bg-white/5 transition-colors cursor-pointer rounded-md">
              <p className="text-xs font-bold text-primary mb-2">Ações Sugeridas</p>
              <p className="text-sm font-medium">O que devemos priorizar para desbloquear a fase de Implementação?</p>
            </Card>
          </div>
        </aside>
      </div>
    </main>
  );
}