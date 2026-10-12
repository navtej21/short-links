# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` / `npm run build` / `npm start` â€” Next.js 16 (App Router, Turbopack, Tailwind v4)
- `npm run lint` â€” ESLint
- `npm test` — Vitest (`vitest run`); single file: `npx vitest run src/lib/link.test.ts`; by name: `npx vitest run -t "<name>"`. Tests live next to the code as `*.test.ts` (the default Vitest pattern; `.tests.ts` is not picked up).

`AGENTS.md` warns this Next.js version has breaking changes: read the relevant guide in `node_modules/next/dist/docs/` before writing Next-specific code. Example: middleware is `src/proxy.ts` exporting `proxy`, not `middleware.ts`.

Required env vars (`.env.local`): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`. Optional: `NEXT_PUBLIC_APP_URL` (base for displayed short URLs, default `http://localhost:3000`; also used to block shortening links to this site).

## Architecture

URL shortener: Next.js + Supabase (Postgres tables `links`, `clicks`, an RPC `link_click_stats`; Supabase Auth with email/password). All source is under `src/` (`@/` alias); there is no top-level `app/` directory. The database schema and RLS policies are not in the repo.

### Request flows

- **Redirect** â€” `src/app/[code]/route.ts` (public, anonymous). Uses `resolveLink` (`lib/resolve-link.ts`: validates the code pattern, then returns `ok | not_found | inactive | expired`). Not found gives 404; inactive or expired gives 410. On `ok` it returns a 307 redirect (not cached, so every click hits the server) and logs the click inside `after()`, so logging never delays the redirect or breaks it. `lib/click-info.ts` extracts referrer origin, user agent, bot flag and Vercel geo headers (`x-vercel-ip-country`, `x-vercel-ip-city`). `lib/log-click.ts` inserts into `clicks` and swallows errors.
- **Auth guard** â€” `src/proxy.ts` refreshes the Supabase session cookies and redirects: no user on `/dashboard/*` goes to `/login`, and a logged-in user on `/login` goes to `/dashboard`. Its `matcher` is limited to `/dashboard/:path*` and `/login`, so the public `/[code]` route pays no Supabase round trip. Keep the matcher narrow. Server actions re-check `getUser()` themselves because they are public POST endpoints.
- **Login** â€” `src/app/login/action.ts` (`login`/`signup`/`logout`); errors go back via `/login?error=`.
- **Dashboard** â€” `src/app/dashboard/` has the links list, a create-link form (`actions.ts` `createLinkAction`, used with `useActionState`), and a per-link analytics page at `links/[id]`. `lib/stats.ts` calls the `link_click_stats` RPC and `fillMissingDays` pads the series; day bucketing uses the `Asia/Kolkata` timezone.
- **Link creation** â€” `lib/links.ts` `createLink` validates the URL (http/https only), then inserts a random base62 code (`lib/generate-code.ts`, `crypto.randomInt`, length 3â€“32, default 7), retrying up to 5 times only on Postgres unique violation (`23505`). Before inserting it counts the user's links created in the last hour and throws `RateLimitError` at `MAX_LINKS_PER_HOUR` (20). `InvalidUrlError` and `RateLimitError` messages are safe to show to users; other errors are logged and replaced with a generic message. `lib/target-url.ts` (`checkTargetUrl`) rejects links pointing back at the app's own host; `createLinkAction` runs it before `createLink`.

### Two Supabase clients (keep them distinct)

- `src/lib/supabase/user.ts` â€” `createUserClient()`: per-request client using the publishable key plus the visitor's session cookies via `@supabase/ssr`, so RLS applies as that user. Must be called per request, never stored at module level. Its cookie `setAll` swallows errors in Server Components; the proxy does the actual session refresh.
- `src/lib/supabase/admin.ts` â€” module-level `supabase` client using `SUPABASE_SECRET_KEY` (bypasses RLS, `server-only`, throws at import if env is missing). Used by the redirect route for reads of `links` and writes to `clicks`. Use it only where the visitor is anonymous. For anything acting on behalf of a logged-in user, pass the user client so RLS enforces ownership.

Data-layer functions (`createLink`, `resolveLink`, `logClick`, `getLinkStats`) take the Supabase client as a parameter instead of importing one, so the caller picks user vs admin and tests can pass a mock.
