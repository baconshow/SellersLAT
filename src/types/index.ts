export type PhaseStatus = 'pending' | 'in_progress' | 'completed' | 'blocked'
export type DistributorStatus = 'integrated' | 'pending' | 'blocked' | 'not_started'

export interface ProjectPhase {
  id: string
  name: string
  order: number
  startDate: string
  endDate: string
  status: PhaseStatus
  description?: string
}

export interface DistributorComment {
  id: string
  email: string
  name: string
  text: string
  timestamp: string
}

export interface Distributor {
  id: string
  name: string
  status: DistributorStatus
  connectionType?: string
  responsible?: string
  notes?: string
  blockerDescription?: string
  solution?: string
  integratedAt?: string
  weekAdded?: number
  comments?: DistributorComment[]
  hasUnreadComment?: boolean
  erp?: string
  cnpj?: string
  valuePerConnection?: number
  palliative?: string
  connectionCategory?: string
}

export interface DistributorSnapshot {
  id:              string
  name:            string
  status:          DistributorStatus
  notes?:          string
  connectionType?: string
  responsible?:    string
  blockerDescription?: string
}

export type DistributorHistoryType = 'import' | 'manual_edit' | 'weekly_snapshot'

export interface DistributorHistoryEntry {
  id:           string
  type:         DistributorHistoryType
  timestamp:    string
  source?:      string
  distributors: Distributor[]
  weekNumber?:  number
  note?:        string
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
  distributorSnapshots?: DistributorSnapshot[]
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
  distributors?: Distributor[]
  distributorHistory?: DistributorHistoryEntry[]
  createdAt: string
  updatedAt: string
  description?: string
  objective?:   string
  kpis?:        ProjectKPI[]
  slug?: string
  shareToken?: string
  shareEnabled?: boolean
  authorizedEmails?: string[]
  showRevenueToClient?: boolean
  members?: string[]
  ownerId?: string
}

export interface ProjectMessage {
  id: string
  type: 'user' | 'activity'
  authorEmail: string
  authorName: string
  text: string
  timestamp: any
  projectId: string
}

export interface AIMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

export function generateDistributorId(name: string, cnpj?: string): string {
  const base = cnpj
    ? cnpj.replace(/[^0-9]/g, '')
    : name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .substring(0, 60)
  return `dist_${base}`
}

export type TicketStatus = 'aberto' | 'andamento' | 'implementado' | 'cancelado'
export type TicketPriority = 'hi' | 'md' | 'lo'
export type TicketSource = 'internal' | 'public'

export interface Ticket {
  id: string
  projectId: string
  title: string
  description: string
  status: TicketStatus
  priority: TicketPriority
  sprint: number
  estimatedDate: string
  effort: 'low' | 'medium' | 'high'
  source: TicketSource
  createdByEmail: string
  createdByName: string
  createdAt: any
  updatedAt: any
  aiClassified?: boolean
}

export const DEFAULT_PHASES: Omit<ProjectPhase, 'id' | 'startDate' | 'endDate'>[] = [
  {
    name: 'KickOff',
    order: 0,
    status: 'pending',
    description: 'Reunião de boas-vindas e alinhamento inicial com o cliente',
  },
  {
    name: 'Levantamento de Requisitos',
    order: 1,
    status: 'pending',
    description: 'Catálogo de Produtos, Unidades de Medida e Lista de Distribuidores',
  },
  {
    name: 'PIC Interno',
    order: 2,
    status: 'pending',
    description: 'Elaboração do Plano de Impacto Conjunto',
  },
  {
    name: 'PIC com Cliente',
    order: 3,
    status: 'pending',
    description: 'Apresentação do PIC ao time comercial do cliente',
  },
  {
    name: 'Apresentação Comercial',
    order: 4,
    status: 'pending',
    description: 'Apresentação ao time comercial e distribuidores',
  },
  {
    name: 'Apresentação aos Distribuidores',
    order: 5,
    status: 'pending',
    description: 'Onboarding dos distribuidores na plataforma',
  },
  {
    name: 'Processo de Integração',
    order: 6,
    status: 'pending',
    description: 'Integração técnica dos distribuidores — FTP, API, Ello ou Manual',
  },
  {
    name: 'Status Report',
    order: 7,
    status: 'pending',
    description: 'Acompanhamento contínuo durante todo o projeto',
  },
  {
    name: 'Alinhamento Semanal',
    order: 8,
    status: 'pending',
    description: 'Reuniões semanais — novas solicitações e customizações',
  },
  {
    name: 'BI Showtime',
    order: 9,
    status: 'pending',
    description: 'Apresentação dos painéis de BI e entrega de telas ao cliente',
  },
  {
    name: 'Go-Live',
    order: 10,
    status: 'pending',
    description: 'Ativação oficial da plataforma com todos os distribuidores integrados',
  },
  {
    name: 'Handover',
    order: 11,
    status: 'pending',
    description: 'Transição para On Going — consultoria estratégica e melhorias contínuas',
  },
]