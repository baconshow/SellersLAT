'use server';
/**
 * @fileOverview Gerador de Slides desabilitado (Mock).
 */

export type GeneratePresentationContentInput = {
  clientName: string;
  currentPhase: string;
  startDate: string;
  endDate: string;
  weeklyUpdates: any[];
  phases: any[];
};

export type GeneratePresentationContentOutput = {
  executiveSummary: string;
  statusOfIntegrations: string;
  currentPhaseSummary: string;
  weeklyHighlights: string[];
  weeklyBlockers: string[];
  weeklyNextSteps: string[];
  overallSentiment: 'positive' | 'neutral' | 'negative';
};

export async function generatePresentationContent(
  input: GeneratePresentationContentInput
): Promise<GeneratePresentationContentOutput> {
  // Conteúdo estático para permitir a visualização dos slides sem erro de build
  return {
    executiveSummary: `Projeto de implantação para ${input.clientName} iniciado em ${input.startDate}. O cronograma está sendo seguido conforme planejado.`,
    statusOfIntegrations: "Resumo das integrações pendente de análise da IA.",
    currentPhaseSummary: `Atualmente na fase: ${input.currentPhase}.`,
    weeklyHighlights: ["Dados de distribuidores coletados", "Cronograma inicial validado"],
    weeklyBlockers: ["Nenhum bloqueio crítico identificado no momento."],
    weeklyNextSteps: ["Finalizar configuração de ambiente", "Iniciar integração da primeira leva"],
    overallSentiment: 'neutral'
  };
}
