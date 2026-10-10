# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` / `npm run build` / `npm start` — Next.js 16 (App Router, Turbopack, Tailwind v4)
- `npm run lint` — ESLint
- `npm test` — Vitest (`vitest run`); single file: `npx vitest run src/test/generate-code.test.ts`; by name: `npx vitest run -t "<name>"`

`AGENTS.md` warns this Next.js version has breaking changes: read the relevant guide in `node_modules/next/dist/docs/` before writing Next-specific code.

## Architecture

URL shortener: Next.js + Supabase (Postgres `links` table, Supabase Auth with email/password). All source is under `src/` (`@/` alias); there is no top-level `app/` directory.

- `src/app/` — routes: `login` (page + server actions `login`/`singup`/`logout` in `actions.ts`; errors are passed back via `/login?error=`), `dashboard` (server component that redirects to `/login` when `supabase.auth.getUser()` has no user).
- `src/lib/links.ts` — `server-only` data layer. `createLink` validates the URL (http/https only), then inserts a random code, retrying up to 5 times only on Postgres unique violation (`23505`).
- `src/lib/generate-code.ts` — base62 code via `crypto.randomInt` (length 3–32, default 7).
- `src/test/` — Vitest tests.

### Two Supabase clients (keep them distinct)

- `src/lib/supabase/user.ts` — `createUserClient()`: per-request client using the publishable key plus the visitor's session cookies via `@supabase/ssr`, so RLS applies as that user. Must be called per request, never stored at module level. Its cookie `setAll` swallows errors in Server Components; session refresh via proxy/middleware is not yet implemented (noted as "Task 2.2" in the code).
- `src/lib/supabase/admin.ts` — module-level `supabase` client with no session persistence, used by `links.ts`. Currently it reads `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, not `SUPABASE_SECRET_KEY`, despite the file name, so it does not bypass RLS. `SUPABASE_SECRET_KEY` exists in `.env.local` but is unused so far.

Required env vars (`.env.local`): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`.
