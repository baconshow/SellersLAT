export type PhaseStatus = 'pending' | 'in_progress' | 'completed' | 'blocked'

export interface ProjectPhase {
  id: string
  name: string
  order: number
  startDate: string
  endDate: string
  status: PhaseStatus
  description?: string
}

export interface WeeklyUpdate {
  id: string
  weekNumber: number
  date: string
  distributorsTotal: number
  distributorsIntegrated: number
  distributorsPending: number
  distributorsBlocked: number
  highlights: string[]
  blockers: string[]
  nextSteps: string[]
  aiSummary?: string
}

export interface ProjectKPI {
  id:       string
  label:    string
  value:    number
  target:   number
  unit?:    string
  trend?:   'up' | 'down' | 'stable'
  history?: number[]
}

export interface Project {
  id: string
  userId: string
  name?: string
  clientName: string
  clientLogo?: string
  clientColor: string
  clientColorSecondary: string
  clientColorRgb: string
  mascotImageUrl?: string
  startDate: string
  endDate: string
  currentPhaseId?: string
  phases: ProjectPhase[]
  weeklyUpdates: WeeklyUpdate[]
  createdAt: string
  updatedAt: string
  // novos campos
  description?: string
  objective?:   string
  kpis?:        ProjectKPI[]
}

export interface AIMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

export const DEFAULT_PHASES: Omit<ProjectPhase, 'id' | 'startDate' | 'endDate'>[] = [
  {
    name: 'Reunião de Boas-Vindas',
    order: 0,
    status: 'pending',
    description: 'Kickoff e alinhamento inicial com o cliente',
  },
  {
    name: 'Coleta de Dados',
    order: 1,
    status: 'pending',
    description: 'Catálogo de Produtos, Unidades de Medida e Lista de Distribuidores',
  },
  {
    name: 'PIC — Plano de Impacto Conjunto',
    order: 2,
    status: 'pending',
    description: 'Apresentação para o Time Comercial',
  },
  {
    name: 'Entrega Lista de Distribuidores',
    order: 3,
    status: 'pending',
    description: 'Lista completa com dados de contato',
  },
  {
    name: 'Implementação',
    order: 4,
    status: 'pending',
    description: 'Integração de distribuidores, montagem de painéis BI e entrega de telas',
  },
  {
    name: 'Onboarding',
    order: 5,
    status: 'pending',
    description: 'Treinamento sobre BI, ferramentas e boas práticas',
  },
  {
    name: 'On Going',
    order: 6,
    status: 'pending',
    description: 'Consultoria estratégica sobre melhorias de vendas, mix, campanhas e oportunidades',
  },
]