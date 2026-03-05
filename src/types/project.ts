
export type ProjectStatus = 'pending' | 'in_progress' | 'completed' | 'blocked';

export interface ProjectPhase {
  id: string;
  name: string;
  order: number;
  startDate: string;
  endDate: string;
  status: ProjectStatus;
  color?: string;
}

export interface WeeklyUpdate {
  id: string;
  weekNumber: number;
  date: string;
  distributorsTotal: number;
  distributorsIntegrated: number;
  distributorsPending: number;
  distributorsBlocked: number;
  highlights: string[];
  blockers: string[];
  nextSteps: string[];
  aiSummary?: string;
}

export interface Project {
  id: string;
  userId: string;
  clientName: string;
  clientLogo: string;
  clientColor: string;
  clientColorSecondary: string;
  mascotImageUrl: string;
  startDate: string;
  endDate: string;
  currentPhase: string;
  createdAt: string;
  updatedAt: string;
}

export const DEFAULT_PHASES = [
  "Reunião de Boas-Vindas",
  "Coleta de Dados",
  "PIC — Plano de Impacto Conjunto",
  "Entrega Lista de Distribuidores",
  "Implementação",
  "Onboarding",
  "On Going"
];
