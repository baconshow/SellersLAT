'use server';
/**
 * @fileOverview Assistente de Chat desabilitado (Mock).
 */

export type ProjectAIChatAssistantInput = {
  userQuery: string;
  projectData: any;
};

export type ProjectAIChatAssistantOutput = {
  aiResponse: string;
  toolOutput?: any;
};

export async function projectAIChatAssistant(input: ProjectAIChatAssistantInput): Promise<ProjectAIChatAssistantOutput> {
  // Resposta padrão simulada
  return {
    aiResponse: "O Assistente Sellers AI está operando em modo offline. No momento, não consigo processar consultas complexas ou realizar análises de dados, mas você pode continuar explorando as outras funcionalidades do dashboard."
  };
}
