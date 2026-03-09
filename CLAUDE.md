# CLAUDE.md — Sellers LAT

> **Autônomo por design. Presente em cada etapa.**
> Live Autonomous Tracker — rastreamento de implantações com IA integrada.

---

## O Problema que o LAT Resolve

Antes do LAT, o trabalho de acompanhar implantações era feito na mão. Repetido para cada cliente. Toda semana.

O usuário acordava na segunda-feira sabendo que tinha que:

- Abrir o PowerPoint do cliente X, atualizar os status dos distribuidores um por um, exportar como PDF, anexar no email e enviar
- Repetir o mesmo processo para o cliente Y, Z, W — cada um com seu arquivo, sua pasta, seu template ligeiramente diferente
- Montar o Gantt manualmente no Excel ou Google Sheets, arrastar barras, colorir células, rezar para não desalinhar nada
- Criar uma apresentação no Google Slides para compartilhar com a indústria — que ficava desatualizada no dia seguinte
- Mandar email de follow-up para saber se o distribuidor avançou, se o blocker foi resolvido, se alguém leu o documento
- Guardar histórico de versões em pastas com nomes como `apresentação_bombril_v3_FINAL_revisado2.pptx`

Isso para **um** cliente. Multiplicado por dez, vinte, trinta projetos simultâneos.

O resultado era horas gastas em trabalho operacional sem valor. Documentos desatualizados chegando para a indústria. Contexto perdido entre semanas. Burnout real.

---

## O que o LAT faz no lugar disso

- **Apresentações geradas automaticamente** — o SlidesDeck monta os slides com dados reais. Sem PowerPoint. Sem Google Slides. Sem exportar nada manualmente.
- **Gantt em tempo real** — configurado uma vez, atualiza sozinho conforme o projeto avança.
- **Link de compartilhamento para a indústria** — em vez de enviar arquivo por email, o usuário gera um link público com login Google. O gestor acessa sempre a versão mais atual, direto no browser.
- **Interação direta na página** — gestores comentam em distribuidores bloqueados/pendentes. O usuário Sellers recebe notificação no LAT.
- **Histórico automático** — cada importação CSV e cada snapshot semanal ficam salvos. Nada se perde.
- **IA integrada** — analisa o projeto, detecta riscos, sugere próximos passos e preenche apresentações. O usuário revisa, não cria do zero.
- **Multi-cliente desde o início** — cada projeto tem identidade visual própria, tudo no mesmo lugar.

---

## Sobre o Produto

**Sellers LAT** (Live Autonomous Tracker) é uma aplicação B2B de gerenciamento de projetos de implantação para a empresa Sellers. Gerencia projetos de clientes industriais (Bombril, BIC, Peccin, Fruki, Ambev), rastreando fases, KPIs, atualizações semanais, integrações com distribuidores e análise via API da Anthropic. UI inteiramente em **pt-BR**.

**Acesso restrito a emails @sellers.com.br** — verificação feita no AuthContext após login Google.

---

## Stack

- **Next.js 15** (App Router, Turbopack)
- **TypeScript** — strict
- **Tailwind CSS** — utilitários core apenas, sem compiler customizado
- **Firebase Auth + Firestore** — autenticação Google
- **Framer Motion** — animações
- **Recharts** — gráficos
- **Anthropic API** — análise proativa e chat

---

## Comandos

```bash
npm run dev      # porta 9002 com Turbopack
npm run build
npm run lint
```

---

## Arquitetura

```
src/
├── app/
│   ├── dashboard/
│   ├── project/[id]/
│   │   ├── layout.tsx
│   │   ├── ProjectLayoutClient.tsx
│   │   ├── page.tsx                    # dashboard (fases, KPIs)
│   │   ├── gantt/
│   │   ├── distribuidores/             # gestão + importação CSV
│   │   ├── updates/
│   │   ├── slides/                     # SlidesDeck
│   │   └── settings/                  # config + compartilhamento
│   ├── share/
│   │   └── [token]/
│   │       ├── layout.tsx             # layout limpo sem TopNav
│   │       └── page.tsx               # página do gestor (read-only)
│   └── api/
│       └── chat/route.ts
├── components/
│   ├── layout/
│   │   └── TopNav.tsx
│   ├── kpi/
│   │   └── KPICards.tsx
│   ├── SlidesDeck.tsx
│   └── ui/
│       └── WeeklyUpdateDrawer.tsx
├── lib/
│   ├── firestore.ts
│   └── theme.ts
├── contexts/
│   └── AuthContext.tsx
└── types/
    └── index.ts
```

---

## Navegação

**Não existe sidebar.** Navegação feita pelo `TopNav` — header fixo no topo.

**Esquerda:** `LAT` (Conthrax, cor accent) → `SELLERS` → `CLIENTE` → `PÁGINA` → `SEMANA N`

**Centro:** ícones sem label (tooltip no hover)
- LayoutDashboard, GanttChart, Presentation, Users, Settings, ClaudeIcon (toggle LAT Intelligence)
- Badge de notificação no ícone Users quando há comentários não lidos de gestores

**Direita:** botão "Atualizar Semana"

**No dashboard** (isDashboard=true): centro vazio.

---

## Modelo de Dados (Firestore)

Coleção única: `projects/{id}`

```typescript
{
  clientName: string
  clientColor: string
  clientColorSecondary: string
  clientColorRgb: string
  objective: string
  description: string
  startDate?: string
  endDate?: string
  phases: Phase[]
  kpis: ProjectKPI[]
  weeklyUpdates: WeeklyUpdate[]
  distributors: Distributor[]
  distributorHistory: DistributorHistoryEntry[]

  // Compartilhamento
  shareToken?: string           // UUID gerado uma vez, nunca muda
  shareEnabled?: boolean        // liga/desliga o link
  authorizedEmails?: string[]   // ex: ["joao@bombril.com.br"]
}
```

```typescript
// Distribuidor — campos novos para comentários
interface Distributor {
  id: string
  name: string
  status: DistributorStatus
  connectionType?: string
  responsible?: string
  notes?: string
  blockerDescription?: string
  solution?: string
  comments?: DistributorComment[]      // ← NOVO
  hasUnreadComment?: boolean           // ← NOVO flag para badge
}

interface DistributorComment {
  id: string
  email: string
  name: string
  text: string
  timestamp: string
}
```

**Regra crítica:** Usar sempre `subscribeToProject`. `getProject` não existe em `firestore.ts`.

---

## Design System

- **Fundo:** `#050508` (pitch black)
- **Header:** gradiente `rgba(5,5,8,0.97)` → transparente + tint accent
- **Glassmorphism:** `backdrop-filter: blur(20px) saturate(160%)`
- **Cards:** `background: rgba(255,255,255,0.02)`, `border: 1px solid rgba(255,255,255,0.06)`
- **Accent por projeto:** injetado via CSS variables por `applyTheme()` / `ThemeHandler`
- **Fonte do logo LAT:** Conthrax (fallback: Orbitron, Share Tech Mono, monospace)

---

## Feature: Link Compartilhável com Acesso Autorizado

### Conceito
Em vez de enviar PDF por email, o usuário Sellers gera um link permanente do projeto. O gestor da indústria (ex: Bombril) acessa via login Google. Apenas emails cadastrados na lista `authorizedEmails` do projeto têm acesso.

### Fluxo completo

```
1. Em Settings → seção "Compartilhamento"
   → Usuário clica "Gerar link"
   → shareToken (UUID) é salvo no Firestore
   → Link copiável: sellers.lat/share/[token]
   → Campo para adicionar/remover emails autorizados

2. Gestor abre o link
   → Token inválido ou shareEnabled=false → tela "Link inativo"
   → Token válido → tela de login Google

3. Gestor faz login com Google
   → Email não está em authorizedEmails → tela "Acesso não autorizado"
   → Email autorizado → página do gestor ✓

4. Página do gestor (scroll único, sem edição):
   ┌─────────────────────────────────┐
   │ LAT · BOMBRIL   👁 Visualização │
   ├─────────────────────────────────┤
   │ KPIs (total, integrados, etc.)  │
   ├─────────────────────────────────┤
   │ GANTT                           │
   ├─────────────────────────────────┤
   │ DISTRIBUIDORES                  │
   │ ✓ integrados (sem interação)    │
   │ ⏳⚠ pendentes/bloqueados → [→] │
   │   └ campo de comentário         │
   ├─────────────────────────────────┤
   │ SLIDES (lock mode)              │
   └─────────────────────────────────┘

5. Gestor comenta num distribuidor bloqueado
   → Comentário salvo em distributors[].comments[]
   → hasUnreadComment = true
   → Badge aparece no ícone Users da TopNav para o usuário Sellers
```

### Arquivos a criar/modificar (nessa ordem)

```
1. types/index.ts
   → adicionar shareToken, shareEnabled, authorizedEmails ao Project
   → adicionar DistributorComment interface
   → adicionar comments[], hasUnreadComment ao Distributor

2. lib/firestore.ts
   → generateShareToken(projectId): salva UUID como shareToken
   → toggleShare(projectId, enabled): liga/desliga shareEnabled
   → updateAuthorizedEmails(projectId, emails): atualiza array
   → getProjectByShareToken(token): busca projeto pelo token (sem auth)
   → addDistributorComment(projectId, distributorId, comment): adiciona comentário
   → markCommentsAsRead(projectId): seta hasUnreadComment=false em todos

3. app/project/[id]/settings/page.tsx
   → nova seção "Compartilhamento" com:
     - toggle liga/desliga link
     - campo copiável com a URL
     - lista de emails autorizados com add/remove

4. app/share/[token]/layout.tsx
   → layout limpo: sem TopNav de projeto, sem edição
   → mantém tema/cores do projeto
   → badge "👁 Somente visualização" fixo

5. app/share/[token]/page.tsx
   → busca projeto pelo token
   → verifica shareEnabled
   → exige login Google
   → verifica email em authorizedEmails
   → renderiza: KPIs + Gantt + lista distribuidores + Slides
   → apenas distribuidores blocked/pending têm campo de comentário

6. components/layout/TopNav.tsx
   → badge vermelho no ícone Users quando
     project.distributors.some(d => d.hasUnreadComment)

7. Firestore security rules
   → permitir get em projects/{id} se shareEnabled==true
     (validação de token e email feita no Next.js)
```

---

## Componentes-Chave

### SlidesDeck (6 slides)
1. Capa — "Semana X · N dias juntos"
2. Status Geral
3. Timeline/Fases — scrollável
4. KPIs — com drilldown
5. Próximos Passos
6. Retrospectiva — blockers semana anterior vs atual

Comportamento: scroll → teclado. Lock/unlock. F11 fullscreen. Tema claro/escuro. IA preenche no mount.

### KPICards
Lê de `project.distributors[]` diretamente (não de weeklyUpdates). Atualiza em tempo real após importação CSV.

### Distribuidores
- Status: `integrated | pending | blocked | not_started`
- Conexão: Ello, FTP, API, Manual
- Importação CSV salva snapshot em `distributorHistory`

---

## Padrões de Código

### Entrega
- **Um arquivo por vez**, completo, pronto para colar
- Mudanças cirúrgicas: fornecer old/new com número de linha
- Mudanças espalhadas: reescrever o arquivo inteiro

### Commits
```
feat: descrição em português
fix: descrição em português
chore: descrição em português
```

### Proibido
- Nunca usar Firebase Studio AI para gerar código
- Nunca criar prompts para o Gemini
- Nunca escrever "Alexandre Sellers" — o usuário é **Bacon**
- Nunca usar `getProject` — usar `subscribeToProject`
- Nunca perder funcionalidades existentes ao modificar componentes

### Firestore
- Arrays embutidos no documento (não subcoleções)
- Separar `list` vs `get` nas security rules
- Subscription em tempo real é o padrão

---

## Problemas Conhecidos (Backlog)

- Gantt bars de fases pendentes sem cor distinta
- Tooltip atrás do header sticky (z-index)
- Badge e nome da fase somem em certos breakpoints