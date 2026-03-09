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

O resultado era horas gastas em trabalho operacional sem valor. Documentos desatualizados chegando para a indústria. Contexto perdido entre semanas. Sensação constante de estar apagando incêndio. Burnout real.

---

## O que o LAT faz no lugar disso

- **Apresentações geradas automaticamente** — o SlidesDeck monta os slides com dados reais. Sem PowerPoint. Sem Google Slides. Sem exportar nada manualmente.
- **Gantt em tempo real** — configurado uma vez, atualiza sozinho conforme o projeto avança.
- **Link de compartilhamento para a indústria** — em vez de enviar arquivo por email, o usuário gera um link público somente leitura. A indústria acessa sempre a versão mais atual, direto no browser.
- **Histórico automático** — cada importação CSV e cada snapshot semanal ficam salvos. Nada se perde.
- **IA integrada** — analisa o projeto, detecta riscos, sugere próximos passos e preenche apresentações. O usuário revisa, não cria do zero.
- **Multi-cliente desde o início** — cada projeto tem identidade visual própria (cores do cliente), tudo no mesmo lugar.

---

## Sobre o Produto

**Sellers LAT** (Live Autonomous Tracker) é uma aplicação B2B de gerenciamento de projetos de implantação para a empresa Sellers. Gerencia projetos de clientes industriais (Bombril, BIC, Peccin, Fruki, Ambev), rastreando fases, KPIs, atualizações semanais, integrações com distribuidores e análise via API da Anthropic. UI inteiramente em **pt-BR**.

---

## Stack

- **Next.js 15** (App Router, Turbopack)
- **TypeScript** — strict
- **Tailwind CSS** — utilitários core apenas, sem compiler customizado
- **Firebase Auth + Firestore** — autenticação Google + modo guest anônimo
- **Framer Motion** — animações
- **Recharts** — gráficos
- **Anthropic API** — análise proativa e chat

---

## Comandos

```bash
npm run dev      # porta 9002 com Turbopack
npm run build    # build de produção
npm run lint     # ESLint
```

---

## Arquitetura

```
src/
├── app/
│   ├── dashboard/               # lista de projetos do usuário
│   ├── project/[id]/
│   │   ├── layout.tsx           # async — passa projectId para ProjectLayoutClient
│   │   ├── ProjectLayoutClient  # client — busca projeto, injeta tema, renderiza TopNav
│   │   ├── page.tsx             # dashboard do projeto (fases, KPIs)
│   │   ├── gantt/               # visualização Gantt
│   │   ├── distribuidores/      # gestão de distribuidores + importação CSV
│   │   ├── updates/             # histórico de atualizações semanais
│   │   ├── slides/              # SlidesDeck — apresentação para o cliente
│   │   ├── settings/            # configurações + histórico de distribuidores
│   │   └── share/[token]/       # ← NOVA: visão pública somente leitura
│   └── api/
│       └── chat/route.ts        # endpoint Anthropic (modo análise + chat)
├── components/
│   ├── TopNav.tsx               # navegação principal — header fixo no topo
│   ├── ThemeHandler.tsx         # injeta CSS variables de tema
│   ├── KPICards.tsx             # cards de KPI com drilldown
│   ├── SlidesDeck.tsx           # apresentação com 6+ slides
│   └── ui/
│       └── WeeklyUpdateDrawer.tsx
├── lib/
│   ├── firestore.ts             # CRUD — SEMPRE usar subscribeToProject, nunca getProject
│   └── theme.ts                 # applyTheme() — CSS variables dinâmicas por projeto
├── contexts/
│   └── AuthContext.tsx
└── types/
    └── index.ts
```

---

## Navegação

**Não existe sidebar.** A navegação é feita pelo `TopNav` — um header fixo no topo com duas zonas:

**Esquerda — Logo + Breadcrumb:**
- `LAT` (fonte Conthrax, cor accent do projeto) → link para /dashboard
- Separador vertical
- `SELLERS` → link para /dashboard
- `>` NOME DO CLIENTE → link para o projeto
- `>` PÁGINA ATUAL (accent)
- Separador + `SEMANA N`

**Centro — Nav Icons:**
Ícones sem label (tooltip no hover). Itens:
- LayoutDashboard → `/project/[id]`
- GanttChart → `/project/[id]/gantt`
- Presentation → `/project/[id]/slides`
- Users → `/project/[id]/distribuidores`
- Settings → `/project/[id]/settings`
- ClaudeIcon → toggle do painel LAT Intelligence (não é uma rota)

Ícone ativo: cor accent do projeto, strokeWidth 2. Inativo: `rgba(255,255,255,0.25)`, strokeWidth 1.5.

**Direita:**
- Botão "Atualizar Semana" (abre WeeklyUpdateDrawer)

**No dashboard** (isDashboard=true): centro vazio, breadcrumb mostra `SELLERS > PROJETOS`.

---

## Design System

- **Fundo:** `#050508` (pitch black)
- **Header:** gradiente `rgba(5,5,8,0.97)` → transparente + tint da cor accent
- **Glassmorphism:** `backdrop-filter: blur(20px) saturate(160%)`
- **Cards:** `background: rgba(255,255,255,0.02)`, `border: 1px solid rgba(255,255,255,0.06)`
- **Campos de input:** `background: rgba(255,255,255,0.04)`, border sutil
- **Accent por projeto:** injetado via CSS variables por `applyTheme()` / `ThemeHandler`
- **Fonte do logo LAT:** Conthrax (fallback: Orbitron, Share Tech Mono, monospace)

---

## Modelo de Dados (Firestore)

Coleção única: `projects/{id}`

```typescript
{
  clientName: string
  clientColor: string           // cor primária (hex)
  clientColorSecondary: string
  clientColorRgb: string        // para CSS variables
  objective: string
  description: string
  startDate?: string
  phases: Phase[]               // array embutido, não subcoleção
  kpis: ProjectKPI[]
  weeklyUpdates: WeeklyUpdate[]
  distributors: Distributor[]
  distributorHistory: DistributorHistoryEntry[]
  shareToken?: string           // ← token público para compartilhamento
  shareEnabled?: boolean        // ← liga/desliga o link público
}
```

**Regra crítica:** Usar sempre `subscribeToProject`. `getProject` não existe em `firestore.ts`.

---

## Componentes-Chave

### SlidesDeck (6 slides)
1. **Capa** — nome do cliente, "Semana X · N dias juntos"
2. **Status Geral**
3. **Timeline/Fases** — scrollável, inclui Go Live e Handover
4. **KPIs** — cards clicáveis com drilldown de distribuidores por status
5. **Próximos Passos**
6. **Retrospectiva** — blockers semana anterior vs atual

Comportamento: scroll → depois teclado. Edição inline com lock/unlock. F11 fullscreen. Tema claro/escuro. IA preenche conteúdo no mount via Anthropic API.

### Distribuidores
- Status: `integrated | pending | blocked | not_started`
- Conexão: Ello, FTP, API, Manual
- Importação CSV salva snapshot em `distributorHistory`
- Histórico em Settings permite restaurar estado anterior

---

## Features em Desenvolvimento

### 1. Compartilhamento de Link com a Indústria
- Em Settings: botão "Gerar link de compartilhamento"
- Gera `shareToken` (UUID) salvo no Firestore (`shareToken`, `shareEnabled: true`)
- Rota pública: `app/project/[id]/share/[token]/page.tsx`
- **Sem AuthContext** — valida apenas pelo token
- Firestore rule: permitir `get` se token bater
- Botão para revogar (`shareEnabled: false`)
- Link copiável para enviar por WhatsApp/email

### 2. Modo Somente Leitura
- Rota `/share/[token]` é sempre read-only por natureza
- Prop `readOnly?: boolean` nos componentes principais
- Quando `readOnly`:
  - TopNav sem botão "Atualizar Semana" e sem nav icons de edição
  - SlidesDeck sempre em lock mode
  - Sem botões de importar CSV, editar fase, adicionar distribuidor
  - Gráficos e visualizações funcionam normalmente

---

## Padrões de Código

### Entrega
- **Um arquivo por vez**, completo, pronto para colar
- Mudanças cirúrgicas (< 5 linhas): fornecer old/new com número de linha
- Mudanças espalhadas por muitos lugares: reescrever o arquivo inteiro

### Commits
```
feat: descrição em português
fix: descrição em português
chore: descrição em português
```

### Proibido
- Nunca usar Firebase Studio AI para gerar código
- Nunca criar prompts para o Gemini — sempre entregar o código diretamente
- Nunca escrever "Alexandre Sellers" — o usuário é **Bacon**
- Nunca usar `getProject` — usar `subscribeToProject`
- Nunca adicionar efeitos visuais desnecessários em camadas
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
- Cards de distribuidores não atualizam após importação CSV