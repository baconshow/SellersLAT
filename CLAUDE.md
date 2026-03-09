# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Sellers Pulse** is a project implementation management tool ("Gerenciamento de Implantação de Projetos") built for tracking client onboarding projects at Sellers. The app is in Brazilian Portuguese (pt-BR). It tracks project phases, distributor integrations, weekly updates, and provides AI-powered analysis via Claude API.

## Commands

- `npm run dev` — Start dev server with Turbopack on port 9002
- `npm run build` — Production build (TypeScript and ESLint errors are ignored in builds via `next.config.ts`)
- `npm run lint` — Run ESLint

## Architecture

### Tech Stack
- **Next.js 15** (App Router) with React 19 and TypeScript
- **Firebase**: Firestore for data, Firebase Auth (Google + anonymous login)
- **Tailwind CSS** with **shadcn/ui** components (default style, CSS variables, lucide icons)
- **Zustand** for client state, **Framer Motion** for animations, **Recharts** for charts
- **Claude API** (`@anthropic-ai/sdk`) for AI features (project analysis and chat)

### Key Directories
- `src/app/` — Next.js App Router pages
- `src/app/api/claude/route.ts` — Claude API route (proactive analysis + chat modes)
- `src/components/ui/` — shadcn/ui primitives
- `src/components/` — Feature components organized by domain (dashboard, gantt, intelligence, kpi, presentation, timeline, layout)
- `src/lib/firestore.ts` — All Firestore CRUD operations (projects, phases, distributors, weekly updates, history)
- `src/lib/claude.ts` — Client-side helpers for calling the Claude API route
- `src/firebase/` — Firebase initialization, providers, and Firestore hooks (`use-doc`, `use-collection`)
- `src/contexts/AuthContext.tsx` — Auth context with Google sign-in and anonymous guest mode
- `src/types/index.ts` — Core type definitions (Project, ProjectPhase, Distributor, WeeklyUpdate, etc.)

### Data Model
All data lives in a single Firestore `projects` collection. Phases, distributors, weekly updates, and distributor history are stored as arrays within each project document (not subcollections). The `userId` field enforces ownership. Key types are defined in `src/types/index.ts`.

### Auth Flow
Landing page (`src/app/page.tsx`) → Google sign-in or anonymous guest → redirects to `/dashboard`. The `AuthProvider` wraps the app and provides `useAuth()`. Anonymous users get mock display data.

### Project Routes
Projects use dynamic routing at `/project/[id]/` with sub-pages: main dashboard, `/gantt`, `/chat`, `/distribuidores`, `/slides`, `/settings`. The project layout (`ProjectLayoutClient`) provides sidebar navigation and project context.

### AI Integration
The `/api/claude` route has two modes:
1. **Proactive analysis** (trigger + project context → structured JSON with actions, risks, summary)
2. **Chat mode** (conversation messages + project context → text response)

Both use `claude-haiku-4-5-20251001` and build a Portuguese project context string with phases, weekly updates, and blockers.

### Environment Variables
- `ANTHROPIC_API_KEY` — Required for Claude API features (set in `.env.local`)
- Firebase config is hardcoded in `src/firebase/config.ts`

## Conventions
- UI text and error messages are in Brazilian Portuguese
- shadcn/ui components are added via the CLI (`npx shadcn@latest add <component>`) and live in `src/components/ui/`
- Path aliases: `@/` maps to `src/`
- Firestore operations go through `src/lib/firestore.ts` — all mutations use `serverTimestamp()` for `updatedAt`
