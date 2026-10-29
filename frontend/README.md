# Frontend — Next.js + TypeScript + Tailwind CSS

This folder contains the Detox Tracker frontend: a Next.js application using the App Router.

## What belongs here

- `src/app/` — Next.js App Router pages and layouts
- `src/components/` — Reusable React components
- `src/lib/` — API client (`api.ts`), utilities
- `src/types/` — Shared TypeScript types
- `public/` — Static assets (images, icons)

## What does NOT belong here

- Backend or server-side business logic (that's in `../backend/`)
- Database credentials or backend secrets
- Direct Supabase client calls — all data goes through the Express API

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Start Next.js dev server on port 3000 |
| `npm run build` | Production build |
| `npm start` | Start production server |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |

## Rule: No secrets in the frontend

Any variable prefixed with `NEXT_PUBLIC_` is **visible in the browser**.
Never put database URLs, session secrets, or API keys in `NEXT_PUBLIC_*` variables.
The only frontend env var we use is `NEXT_PUBLIC_API_URL` (the backend URL — not secret).

## Structure (Phases 7 and 8)

- `src/app/` pages: `/` (home), `/login`, `/register`, `/logs`, `/dashboard`, `/focus`, `/goals`, `/analytics`
- `src/components/Protected.tsx` — wraps signed-in pages: checks `GET /api/auth/me`, redirects to `/login` on 401, renders the text nav
- `src/components/AuthForm.tsx` — shared login/register form
- `src/lib/api.ts` — typed client (`authApi`, `logsApi`, `dashboardApi`, `goalsApi`, `sessionsApi`, `analyticsApi`) and `ApiError`. Network failures throw a plain TypeError; HTTP errors throw `ApiError`. Phase 8 response shapes are isolated here.
- `src/lib/validation.ts` — client-side rules mirroring the backend (advisory only)
- `src/app/globals.css` — a few CSS-variable tokens and plain component classes; no UI library

Design: neutral palette, system fonts, 1px borders, no gradients or shadows.
Run: `cp .env.example .env.local && npm install && npm run dev` (backend on port 4000).
