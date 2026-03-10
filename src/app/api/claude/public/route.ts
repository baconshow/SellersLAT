import Anthropic from '@anthropic-ai/sdk'
import { initializeApp, getApps, getApp } from 'firebase/app'
import { getFirestore, collection, getDocs, query, where, limit } from 'firebase/firestore'
import { firebaseConfig } from '@/firebase/config'
import type { Project, Distributor } from '@/types'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

function getDb() {
  const app = getApps().length ? getApp() : initializeApp(firebaseConfig)
  return getFirestore(app)
}

async function fetchProjectBySlug(slug: string): Promise<Project | null> {
  const db = getDb()
  const q = query(
    collection(db, 'projects'),
    where('slug', '==', slug),
    where('shareEnabled', '==', true),
    limit(1)
  )
  const snap = await getDocs(q)
  if (snap.empty) return null
  const d = snap.docs[0]
  return { id: d.id, ...d.data() } as Project
}

async function fetchDistributors(projectId: string): Promise<Distributor[]> {
  const db = getDb()
  const snap = await getDocs(collection(db, 'projects', projectId, 'distributors'))
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Distributor))
}

export async function POST(req: Request) {
  try {
    const { slug, mode, message, userName } = await req.json()
    if (!slug) return Response.json({ ok: false, error: 'Slug ausente' }, { status: 400 })

    const project = await fetchProjectBySlug(slug)
    if (!project) return Response.json({ ok: false, error: 'Projeto não encontrado ou inativo' }, { status: 404 })

    const distributors = await fetchDistributors(project.id)
    const integrated = distributors.filter(d => d.status === 'integrated').length
    const blocked = distributors.filter(d => d.status === 'blocked').length
    const total = distributors.length

    const context = `
PROJETO: ${project.clientName}
STATUS: ${integrated}/${total} integrados, ${blocked} bloqueados.
OBJETIVO: ${project.objective ?? 'Não definido'}
    `.trim()

    if (mode === 'analyze') {
      const response = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system: `Você é o LAT Intelligence para visualização pública. Seja direto e profissional. Retorne APENAS JSON válido.
{
  "summary": "resumo de 1 frase",
  "highlights": ["destaque 1", "destaque 2"],
  "attentionPoints": [{"title": "título", "description": "desc"}],
  "nextWeekMessage": "mensagem curta"
}`,
        messages: [{ role: 'user', content: `Analise o contexto: ${context}` }],
      })
      const raw = response.content[0].type === 'text' ? response.content[0].text : '{}'
      return Response.json({ ok: true, data: JSON.parse(raw) })
    }

    if (mode === 'chat') {
      const response = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system: `Você é o LAT Intelligence ajudando um gestor do cliente ${project.clientName}. O usuário é ${userName}.`,
        messages: [{ role: 'user', content: `Contexto: ${context}\nPergunta: ${message}` }],
      })
      const text = response.content[0].type === 'text' ? response.content[0].text : ''
      return Response.json({ ok: true, text })
    }

    return Response.json({ ok: false, error: 'Modo inválido' }, { status: 400 })
  } catch (err: any) {
    return Response.json({ ok: false, error: err.message }, { status: 500 })
  }
}