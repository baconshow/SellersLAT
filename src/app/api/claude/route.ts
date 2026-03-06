import Anthropic from '@anthropic-ai/sdk'
import type { Project } from '@/types'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

function buildProjectContext(project: Project): string {
  const today       = new Date()
  const start       = new Date(project.startDate)
  const end         = new Date(project.endDate)
  const totalDays   = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  const elapsedDays = Math.ceil((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  const daysLeft    = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  const currentWeek = Math.max(1, Math.ceil(elapsedDays / 7))

  const currentPhase    = project.phases.find(p => p.status === 'in_progress')
  const lastUpdate      = project.weeklyUpdates?.slice(-1)[0]
  const openBlockers    = project.weeklyUpdates?.flatMap(u => u.blockers?.filter(b => b.trim()) ?? []) ?? []
  const completedPhases = project.phases.filter(p => p.status === 'completed').length
  const totalPhases     = project.phases.length

  return `
PROJETO: ${project.clientName}
DATA HOJE: ${today.toLocaleDateString('pt-BR')}
INÍCIO: ${new Date(project.startDate).toLocaleDateString('pt-BR')}
FIM PREVISTO: ${new Date(project.endDate).toLocaleDateString('pt-BR')}
DIAS TOTAIS: ${totalDays} | DIAS DECORRIDOS: ${elapsedDays} | DIAS RESTANTES: ${daysLeft}
SEMANA ATUAL: ${currentWeek}

FASE ATUAL: ${currentPhase?.name ?? 'Nenhuma em andamento'}
FASES CONCLUÍDAS: ${completedPhases}/${totalPhases}

TODAS AS FASES:
${project.phases.map(p => `  [${p.status.toUpperCase()}] ${p.name} — ${new Date(p.startDate).toLocaleDateString('pt-BR')} até ${new Date(p.endDate).toLocaleDateString('pt-BR')}`).join('\n')}

ÚLTIMA ATUALIZAÇÃO SEMANAL: ${lastUpdate ? `
  Semana ${lastUpdate.weekNumber} — ${new Date(lastUpdate.date).toLocaleDateString('pt-BR')}
  Integrados: ${lastUpdate.distributorsIntegrated}/${lastUpdate.distributorsTotal}
  Pendentes: ${lastUpdate.distributorsPending}
  Bloqueados: ${lastUpdate.distributorsBlocked}
  Destaques: ${lastUpdate.highlights?.join('; ') ?? 'Nenhum'}
  Bloqueios: ${lastUpdate.blockers?.join('; ') ?? 'Nenhum'}
  Próximos passos: ${lastUpdate.nextSteps?.join('; ') ?? 'Nenhum'}
` : 'Nenhuma atualização registrada ainda.'}

BLOQUEIOS ACUMULADOS:
${openBlockers.length ? openBlockers.map(b => `  ⚠ ${b}`).join('\n') : '  Nenhum bloqueio registrado.'}
  `.trim()
}

export async function POST(req: Request) {
  console.log('[Claude API] KEY:', process.env.ANTHROPIC_API_KEY?.slice(0, 20) + '...')

  try {
    const body = await req.json()
    const { project, trigger, messages } = body as {
      project:   Project
      trigger?:  string
      messages?: { role: 'user' | 'assistant'; content: string }[]
    }

    const context = buildProjectContext(project)

    // ── Modo proativo — retorna JSON ──────────────────────
    if (trigger && !messages) {
      const response = await anthropic.messages.create({
        model:      'claude-haiku-4-5-20251001',
        max_tokens: 1500,
        system: `Você é o LAT Intelligence — gestor sênior de implantação da Sellers.
Analise o projeto e retorne APENAS um JSON válido, sem markdown, sem texto fora do JSON.
Formato exato:
{
  "summary": "string",
  "urgentActions": [{ "title": "string", "description": "string", "deadline": "string", "priority": "high|medium|low" }],
  "risks": [{ "title": "string", "description": "string", "severity": "high|medium|low" }],
  "nextWeekPreview": "string",
  "motivationalNote": "string"
}

CONTEXTO DO PROJETO:
${context}`,
        messages: [{
          role:    'user',
          content: `Analise o estado atual e retorne o JSON. Evento: ${trigger}`,
        }],
      })

      const raw   = response.content[0].type === 'text' ? response.content[0].text.trim() : '{}'
      const clean = raw.replace(/^```json\n?/, '').replace(/^```\n?/, '').replace(/\n?```$/, '').trim()
      const json  = JSON.parse(clean)
      return Response.json({ ok: true, data: json })
    }

    // ── Modo chat — retorna texto normal ──────────────────
    if (messages) {
      const response = await anthropic.messages.create({
        model:      'claude-haiku-4-5-20251001',
        max_tokens: 1500,
        system: `Você é o LAT Intelligence — gestor sênior de implantação da Sellers.
Você é direto, prático e age como um colega experiente — não como um robô.
Responda em texto corrido, sem JSON, sem markdown excessivo.
Quando sugerir ações, seja específico com datas e responsáveis.
Quando pedido um email ou documento, escreva o conteúdo completo pronto para usar.

CONTEXTO COMPLETO DO PROJETO:
${context}`,
        messages,
      })

      const text = response.content[0].type === 'text' ? response.content[0].text : ''
      return Response.json({ ok: true, text })
    }

    return Response.json({ ok: false, error: 'Payload inválido' }, { status: 400 })

  } catch (err: any) {
    console.error('[Claude API]', err)
    return Response.json({ ok: false, error: err.message }, { status: 500 })
  }
}