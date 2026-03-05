'use server';
/**
 * @fileOverview Fluxo de resumo semanal desabilitado (Mock).
 */

export type GenerateWeeklySummaryInput = {
  weekNumber: number;
  highlights: string[];
  blockers: string[];
  nextSteps: string[];
};

export type GenerateWeeklySummaryOutput = {
  aiSummary: string;
};

export async function generateWeeklySummary(
  input: GenerateWeeklySummaryInput
): Promise<GenerateWeeklySummaryOutput> {
  // Simulação de resposta enquanto a IA está desabilitada
  return {
    aiSummary: "A funcionalidade de resumo automático da IA está temporariamente desativada. Seus destaques e bloqueios foram salvos com sucesso, mas a síntese textual não foi gerada."
  };
}
