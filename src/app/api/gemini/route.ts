import { GoogleGenerativeAI } from '@google/generative-ai'

const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? '')

const SYSTEM_PROMPT = `Você é um especialista em gestão de projetos BI e analista de requisitos sênior.
Seu trabalho é ler qualquer tipo de conteúdo — email, lista, planilha, imagem,
texto informal — e extrair TODAS as solicitações de melhoria, ajustes ou tarefas
mencionadas, transformando-as em tickets de requisição estruturados.

Regras de classificação de prioridade:
- 'hi': impacta dados, métricas, decisões estratégicas ou está com bug crítico
- 'md': melhoria de usabilidade, ajuste visual relevante ou mudança de fonte de dados
- 'lo': cosmético, renomeação, ajuste de tamanho ou item opcional

Retorne APENAS um JSON array válido, sem markdown, sem texto fora do array:
[{
  "title": "Título curto e direto — use as palavras do documento original",
  "description": "Descrição detalhada do que foi solicitado e por quê",
  "priority": "hi" | "md" | "lo",
  "assignee": "Nome do responsável se mencionado explicitamente, senão null",
  "notes": "Contexto adicional, dependências ou observações relevantes, senão null"
}]

Extraia todos os itens encontrados, até 30. Não invente nada que não esteja
no conteúdo. Se um item tiver subItens, crie um ticket separado para cada um.`

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { content, mimeType } = body as { content: string; mimeType?: string }

    if (!content) {
      return Response.json({ ok: false, error: 'content é obrigatório' }, { status: 400 })
    }

    // Atualizado para o modelo Gemini 2.0 Flash (o mais recente disponível)
    const model = genai.getGenerativeModel({ model: 'gemini-2.0-flash' })

    let result

    if (mimeType && mimeType.startsWith('image/')) {
      result = await model.generateContent([
        { text: SYSTEM_PROMPT },
        {
          inlineData: {
            mimeType,
            data: content,
          },
        },
      ])
    } else {
      result = await model.generateContent([
        { text: SYSTEM_PROMPT },
        { text: content },
      ])
    }

    const raw = result.response.text().trim()

    // Parse JSON — limpa markdown fences se houver
    const clean = raw
      .replace(/^```json\n?/, '')
      .replace(/^```\n?/, '')
      .replace(/\n?```$/, '')
      .trim()

    const tickets = JSON.parse(clean)

    return Response.json({ ok: true, tickets })
  } catch (err: any) {
    console.error('[Gemini API]', err)
    return Response.json({ ok: false, error: err.message }, { status: 500 })
  }
}
