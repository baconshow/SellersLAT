import Anthropic from '@anthropic-ai/sdk'
import { initializeApp, getApps, getApp } from 'firebase/app'
import { getFirestore, collection, getDocs, query, orderBy } from 'firebase/firestore'
import { firebaseConfig } from '@/firebase/config'
import type { Project, Distributor, DistributorComment } from '@/types'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

// Firebase init para server route (sem 'use client')
function getDb() {
  const app = getApps().length ? getApp() : initializeApp(firebaseConfig)
  return getFirestore(app)
}

function daysSince(dateStr: string | undefined): number | null {
  if (!dateStr) return null
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return null
  return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24))
}

async function fetchDistributors(projectId: string): Promise<Distributor[]> {
  const db = getDb()
  const snap = await getDocs(collection(db, 'projects', projectId, 'distributors'))
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Distributor))
}

async function fetchComments(projectId: string, distributorId: string): Promise<DistributorComment[]> {
  const db = getDb()
  const q = query(
    collection(db, 'projects', projectId, 'distributors', distributorId, 'comments'),
    orderBy('timestamp', 'asc'),
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as DistributorComment))
}

async function buildProjectContext(
  project: Project,
  userName: string,
  authorizedEmails: string[],
): Promise<string> {
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

  // ── Busca distribuidores da subcoleção ──
  const distributors = await fetchDistributors(project.id)

  const gestores = authorizedEmails.length > 0
    ? authorizedEmails.join(', ')
    : 'nenhum cadastrado'

  // ── Responsáveis por integração ──
  const byResponsible = new Map<string, string[]>()
  for (const d of distributors) {
    const key = d.responsible?.trim() || 'Sem responsável definido'
    if (!byResponsible.has(key)) byResponsible.set(key, [])
    byResponsible.get(key)!.push(d.name)
  }
  const responsibleSection = Array.from(byResponsible.entries())
    .map(([resp, names]) => `  - ${resp}: ${names.join(', ')}`)
    .join('\n')

  // ── Distribuidores parados (>7 dias sem movimento) ──
  const stalled: string[] = []
  for (const d of distributors) {
    if (d.status === 'integrated') continue
    const lastComment = d.comments?.length
      ? d.comments.reduce((latest, c) => c.timestamp > latest ? c.timestamp : latest, '')
      : undefined
    const lastActivity = lastComment || d.integratedAt
    const days = daysSince(lastActivity)
    if (days !== null && days > 7) {
      const resp = d.responsible ? `responsável: ${d.responsible}` : 'sem responsável'
      stalled.push(`  - ${d.name}: ${days} dias parado — ${resp}`)
    }
  }

  // ── Status detalhado + comentários de gestores (subcoleção) ──
  const needsDetail = distributors.filter(d => d.status === 'blocked' || d.status === 'pending')
  const detailedLines: string[] = []

  for (const d of needsDetail) {
    const comments = await fetchComments(project.id, d.id)
    let line = `- ${d.name}: ${d.status} | Conexão: ${d.connectionType || '—'} | Responsável: ${d.responsible || '—'}`
    if (d.blockerDescription) {
      line += `\n  Último bloqueio: ${d.blockerDescription}`
    }
    if (comments.length > 0) {
      line += `\n  Comentários dos gestores (${comments.length} total):`
      for (const c of comments.slice(-5)) {
        const dateStr = new Date(c.timestamp).toLocaleDateString('pt-BR')
        line += `\n    [${dateStr}] ${c.name}: ${c.text}`
      }
    }
    detailedLines.push(line)
  }

  // ── Distribuidores integrados (lista simples) ──
  const integratedList = distributors
    .filter(d => d.status === 'integrated')
    .map(d => {
      const via = d.connectionType ? ` via ${d.connectionType}` : ''
      const at = d.integratedAt ? ` em ${new Date(d.integratedAt).toLocaleDateString('pt-BR')}` : ''
      return `- ${d.name}: integrado${at}${via}`
    })

  // ── Comentários não lidos ──
  const distWithUnread = distributors.filter(d => d.hasUnreadComment)
  const unreadComments: string[] = []
  for (const d of distWithUnread) {
    const comments = await fetchComments(project.id, d.id)
    const gestorComments = comments.filter(c => authorizedEmails.includes(c.email))
    const last = gestorComments.slice(-1)[0]
    if (last) {
      const dateStr = new Date(last.timestamp).toLocaleDateString('pt-BR')
      unreadComments.push(`  - ${d.name}: comentário de ${last.name} (${last.email}) em ${dateStr}: "${last.text}"`)
    } else {
      unreadComments.push(`  - ${d.name}: comentário pendente`)
    }
  }

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

DISTRIBUIDORES (${distributors.length} total):
  Integrados: ${distributors.filter(d => d.status === 'integrated').length}
  Pendentes: ${distributors.filter(d => d.status === 'pending').length}
  Bloqueados: ${distributors.filter(d => d.status === 'blocked').length}
  Não iniciados: ${distributors.filter(d => d.status === 'not_started').length}

${detailedLines.length > 0 ? `STATUS DETALHADO POR DISTRIBUIDOR (bloqueados e pendentes):
${detailedLines.join('\n')}
` : ''}\
${integratedList.length > 0 ? `DISTRIBUIDORES INTEGRADOS:
${integratedList.join('\n')}
` : ''}\
RESPONSÁVEIS POR INTEGRAÇÃO:
${responsibleSection}

${stalled.length > 0 ? `DISTRIBUIDORES PARADOS (sem atualização há mais de 7 dias):
${stalled.join('\n')}
` : ''}\
${unreadComments.length > 0 ? `COMENTÁRIOS PENDENTES DOS GESTORES (não respondidos):
${unreadComments.join('\n')}
` : ''}\
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

USUÁRIO LOGADO: ${userName}
GESTORES DO CLIENTE: ${gestores}

ESTRUTURA INTERNA SELLERS:
- Henrique: gestor do projeto acima dos usuários do app.
  Precisa ser atualizado frequentemente sobre o andamento.
  Reuniões com Henrique devem ser sugeridas quando houver riscos altos
  ou distribuidores parados há mais de 7 dias.
- Responsáveis de integração: identificados por distribuidor.responsible
  nos dados de cada distribuidora.
- Quando sugerir ações, cite o responsável específico pelo nome.
  `.trim()
}

async function buildCompactContext(project: Project): Promise<string> {
  const distributors = await fetchDistributors(project.id)

  const integrated  = distributors.filter(d => d.status === 'integrated').length
  const pending     = distributors.filter(d => d.status === 'pending').length
  const blocked     = distributors.filter(d => d.status === 'blocked').length
  const total       = distributors.length
  const pct         = total > 0 ? Math.round((integrated / total) * 100) : 0

  const currentPhase = project.phases.find(p => p.status === 'in_progress')
  const lastUpdate   = project.weeklyUpdates?.slice(-1)[0]

  const blockedList  = distributors
    .filter(d => d.status === 'blocked')
    .map(d => `- ${d.name}: ${d.blockerDescription || 'sem motivo registrado'}`)
    .join('\n')

  return `
PROJETO: ${project.clientName}
INTEGRAÇÃO: ${pct}% (${integrated}/${total})
Pendentes: ${pending} | Bloqueados: ${blocked}
FASE ATUAL: ${currentPhase?.name ?? 'Nenhuma em andamento'}
${blockedList ? `BLOQUEADOS:\n${blockedList}` : 'Nenhum bloqueado.'}
${lastUpdate ? `ÚLTIMA SEMANA (${lastUpdate.weekNumber}): integrados ${lastUpdate.distributorsIntegrated}/${lastUpdate.distributorsTotal} | destaques: ${lastUpdate.highlights?.join('; ') || 'nenhum'} | bloqueios: ${lastUpdate.blockers?.join('; ') || 'nenhum'}` : 'Sem atualização semanal.'}
`.trim()
}

function tryParseJSON(raw: string): Record<string, unknown> {
  const clean = raw.replace(/^```json\n?/, '').replace(/^```\n?/, '').replace(/\n?```$/, '').trim()

  try {
    return JSON.parse(clean)
  } catch {
    const lastBrace = clean.lastIndexOf('}')
    if (lastBrace === -1) throw new Error('Resposta da IA não contém JSON válido')

    let fixed = clean.substring(0, lastBrace + 1)
    if (!fixed.includes('"risks"')) {
      fixed = fixed.replace(/,?\s*$/, '') + ',"risks":[]}'
    }

    try {
      return JSON.parse(fixed)
    } catch {
      throw new Error('Resposta da IA truncada e não recuperável')
    }
  }
}

export async function POST(req: Request) {
  console.log('[Claude API] KEY:', process.env.ANTHROPIC_API_KEY?.slice(0, 20) + '...')

  try {
    const body = await req.json()
    const { project, trigger, messages, userName: rawUserName, authorizedEmails: rawEmails } = body as {
      project:           Project
      trigger?:          string
      messages?:         { role: 'user' | 'assistant'; content: string }[]
      userName?:         string
      authorizedEmails?: string[]
    }

    const userName         = rawUserName || 'time Sellers'
    const authorizedEmails = rawEmails ?? project.authorizedEmails ?? []
    const gestores         = authorizedEmails.length > 0 ? authorizedEmails.join(', ') : 'nenhum cadastrado'

    // ── Modo dashboard_insight — contexto compacto, resposta leve ──
    if (trigger === 'dashboard_insight') {
      const compactCtx = await buildCompactContext(project)
      const response = await anthropic.messages.create({
        model:      'claude-haiku-4-5-20251001',
        max_tokens: 512,
        system: `Você é o LAT Intelligence. Retorne APENAS JSON válido, sem texto extra.

{
  "summary": "1 frase direta sobre o estado geral do projeto",
  "status": "ok" | "attention" | "critical",
  "attentionPoints": [
    { "title": "string curto", "description": "1 frase" }
  ],
  "winOfTheWeek": "1 conquista recente para celebrar (ou null)"
}

Máximo 3 attentionPoints. Seja direto. Sem jargões.

CONTEXTO:
${compactCtx}`,
        messages: [{ role: 'user', content: 'Analise e retorne o JSON.' }],
      })

      const raw  = response.content[0].type === 'text' ? response.content[0].text.trim() : '{}'
      const json = tryParseJSON(raw)
      return Response.json({ ok: true, data: json })
    }

    const context = await buildProjectContext(project, userName, authorizedEmails)

    // ── Modo proativo — retorna JSON ──────────────────────────
    if (trigger && !messages) {
      const response = await anthropic.messages.create({
        model:      'claude-haiku-4-5-20251001',
        max_tokens: 2048,
        system: `Você é o LAT Intelligence — gestor sênior de implantação da Sellers.
Você está conversando com ${userName}.
Seu tom é direto, próximo e estratégico — como um colega sênior de confiança, não um robô.

Contexto organizacional importante:
- Henrique é o gestor acima de ${userName} e precisa ser atualizado sobre riscos e atrasos. Sugira reunião com Henrique quando necessário.
- Quando um distribuidor estiver parado há mais de 7 dias, cite o responsável pelo nome na urgentAction. Ex: "OKAJIMA parado há 15 dias — acionar Juliane para retomar contato."
- Se houver comentários não lidos de gestores do cliente, isso é prioridade máxima — o cliente está esperando resposta.
- Nas urgentActions, prefira ações com nome+verbo+prazo específico. Ex: "Juliane confirmar status OKAJIMA até sexta" em vez de "verificar distribuidores pendentes".

Analise o projeto ${project.clientName} e retorne APENAS um JSON válido, sem markdown, sem texto fora do JSON.

Quando identificar ações urgentes, mencione o nome do responsável quando souber.
Os gestores do cliente que acompanham esse projeto são: ${gestores}.
Se houver distribuidores bloqueados com comentários pendentes dos gestores, priorize isso nas ações.

Formato exato:
{
  "summary": "string — direto ao ponto, máx 2 frases, pode mencionar ${userName}",
  "urgentActions": [{ "title": "string", "description": "string", "deadline": "string", "priority": "high|medium|low" }],
  "risks": [{ "title": "string", "description": "string", "severity": "high|medium|low" }],
  "nextWeekPreview": "string — o que ${userName} precisa garantir essa semana",
  "motivationalNote": "string — mensagem curta e humana para ${userName}, mencione o nome"
}

Seja conciso nas descriptions — máximo 100 caracteres cada.
Retorne no máximo 3 urgentActions e 3 risks.

CONTEXTO DO PROJETO:
${context}`,
        messages: [{
          role:    'user',
          content: `Analise o estado atual e retorne o JSON. Evento: ${trigger}`,
        }],
      })

      const raw  = response.content[0].type === 'text' ? response.content[0].text.trim() : '{}'
      const json = tryParseJSON(raw)
      return Response.json({ ok: true, data: json })
    }

    // ── Modo chat — retorna texto normal ────────────────────────
    if (messages) {
      const response = await anthropic.messages.create({
        model:      'claude-haiku-4-5-20251001',
        max_tokens: 2048,
        system: `Você é o LAT Intelligence — gestor sênior de implantação da Sellers.
Você está conversando com ${userName}.
Seu tom é direto, próximo e humano — como um colega experiente de confiança.

Use o nome ${userName} naturalmente na conversa quando fizer sentido.
Os gestores do cliente que acompanham esse projeto são: ${gestores}.
Se perguntarem sobre distribuidores bloqueados ou pendentes, verifique se há comentários dos gestores no contexto e use essas informações.

- Henrique é o gestor acima de ${userName}. Se perguntarem sobre atualizar o Henrique, sugira o que comunicar e como.
- Você conhece os responsáveis de cada integração pelos dados do projeto. Quando mencionar um distribuidor com problema, cite o responsável.
- Se houver comentários não lidos de gestores do cliente, mencione proativamente mesmo que não seja perguntado.

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
