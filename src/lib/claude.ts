import type { Project, Distributor } from '@/types'

export interface LATAction {
  title:       string
  description: string
  deadline:    string
  priority:    'high' | 'medium' | 'low'
}

export interface LATRisk {
  title:       string
  description: string
  severity:    'high' | 'medium' | 'low'
}

export interface LATAnalysis {
  summary:          string
  urgentActions:    LATAction[]
  risks:            LATRisk[]
  nextWeekPreview:  string
  motivationalNote: string
}

interface UserContext {
  userName:         string
  authorizedEmails: string[]
}

export async function analyzeProject(
  project: Project,
  trigger: string,
  userContext?: UserContext,
  distributors?: Distributor[],
): Promise<LATAnalysis | null> {
  try {
    const res = await fetch('/api/claude', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        project,
        distributors,
        trigger,
        userName:         userContext?.userName,
        authorizedEmails: userContext?.authorizedEmails,
      }),
    })
    const json = await res.json()
    if (!json.ok) throw new Error(json.error)
    return json.data as LATAnalysis
  } catch (err) {
    console.error('[analyzeProject]', err)
    return null
  }
}

export async function chatWithClaude(
  project: Project,
  messages: { role: 'user' | 'assistant'; content: string }[],
  userContext?: UserContext,
  distributors?: Distributor[],
): Promise<string | null> {
  try {
    const res = await fetch('/api/claude', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        project,
        distributors,
        messages,
        userName:         userContext?.userName,
        authorizedEmails: userContext?.authorizedEmails,
      }),
    })
    const json = await res.json()
    if (!json.ok) throw new Error(json.error)
    return json.text as string
  } catch (err) {
    console.error('[chatWithClaude]', err)
    return null
  }
}
