# Short Links

A URL shortener with per-link click analytics. Built with Next.js (App Router) and Supabase.

## Features

- Email/password sign-up and login (Supabase Auth)
- Create short links from the dashboard (random base62 codes, 7 characters by default)
- Public redirect at `/<code>` (307, so every click reaches the server)
- Deactivate, reactivate and delete your links
- Custom 404 (unknown code) and 410 (deactivated or expired link) pages
- Click analytics: total clicks, clicks per day, top referrers and top countries, with bots excluded
- Click count shown next to each link in the dashboard
- Rate limit: 20 new links per user per hour
- Rejects non-http(s) URLs and links that point back at the app itself

## Tech stack

- [Next.js 16](https://nextjs.org) (App Router, Turbopack), React 19, TypeScript
- Tailwind CSS v4
- Supabase (Postgres, Auth) via `@supabase/supabase-js` and `@supabase/ssr`
- Vitest

> This Next.js version has breaking changes from older releases. Before writing Next-specific code, read the matching guide in `node_modules/next/dist/docs/` (see `AGENTS.md`).

## Getting started

### Prerequisites

- Node.js 22 or later (Supabase's client warns that Node 20 is deprecated)
- A Supabase project

### Setup

```bash
npm install
```

Create `.env.local` in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable key>
SUPABASE_SECRET_KEY=<secret key>

# Optional. Base URL used to build displayed short links and to block
# shortening links to this site. Defaults to http://localhost:3000.
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

`SUPABASE_SECRET_KEY` bypasses Row Level Security. It is used only on the server, in the public redirect route. Never expose it to the browser.

Then start the dev server:

```bash
npm run dev
```

Open <http://localhost:3000>. It redirects to `/dashboard`, which sends you to `/login` until you are signed in.

### Database

The schema and RLS policies are not stored in this repository. Your Supabase project needs the following, as used by the code:

| Object | Details |
| --- | --- |
| `links` table | `id` (uuid), `code` (unique), `target_url`, `user_id`, `is_active`, `expires_at` (nullable), `created_at` |
| `clicks` table | `link_id` (foreign key to `links.id`, ideally `ON DELETE CASCADE` so deleting a link works), `referrer`, `user_agent`, `country`, `city`, `is_bot`, plus a timestamp |
| `link_click_stats(p_link_id, p_days)` function | Returns JSON: `total`, `by_day` (`day`, `clicks`), `top_referrers` (`referrer`, `clicks`), `top_countries` (`country`, `clicks`) |

RLS policies on `links`: owners can select, insert, update and delete their own rows. Owners also need to read the `clicks` rows of their own links, which the click counts and the stats function rely on. Anonymous visitors get no direct access. The redirect route uses the secret key to read `links` and write `clicks`.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm start` | Run the production build |
| `npm run lint` | ESLint |
| `npm test` | Run Vitest once |

Run a single test file with `npx vitest run src/lib/link.test.ts`, or a single test by name with `npx vitest run -t "<name>"`. Test files are named `*.test.ts` and live next to the code.

## How it works

```
src/
  proxy.ts                 Session refresh + auth redirects (/dashboard, /login only)
  app/
    [code]/route.ts        Public redirect, 404/410 pages, click logging
    login/                 Login page and server actions (login, signup, logout)
    dashboard/             Links list, create form, deactivate/delete, per-link stats
  lib/
    links.ts               createLink (validation, rate limit, retry), setLinkActive, deleteLink
    resolve-link.ts        Look up a code: ok | not_found | inactive | expired
    log-click.ts           Insert a click row (never breaks the redirect)
    click-info.ts          Referrer, user agent, bot detection, geo headers
    stats.ts               Calls link_click_stats and fills in missing days
    target-url.ts          Rejects URLs that point back at this app
    generate-code.ts       Random base62 codes
    unavailable-page.ts    HTML for the 404 and 410 responses
    supabase/
      user.ts              Per-request client with the visitor's session (RLS applies)
      admin.ts             Server-only client with the secret key (bypasses RLS)
```

### Redirect flow

`GET /<code>` looks the code up with the admin client. Unknown codes return 404. Deactivated or expired links return 410. Otherwise the visitor gets a 307 redirect, and the click (referrer origin, user agent, country and city from Vercel's geo headers, bot flag) is logged after the response is sent.

### Two Supabase clients

- **User client** (`createUserClient`) uses the publishable key and the visitor's cookies, so RLS applies. Use it for everything done on behalf of a signed-in user. Create it per request and never keep it at module level.
- **Admin client** (`supabase` from `admin.ts`) uses the secret key and skips RLS. Use it only where the visitor is anonymous, as in the redirect route.

Data-layer functions take the client as a parameter, so the caller chooses which one to use and tests can pass a mock.

### Security notes

- `proxy.ts` guards `/dashboard`, and every server action also re-checks the user, because server actions are public POST endpoints.
- Link updates and deletes filter on both the link id and the user id, as a second check on top of RLS.
- Only `http:` and `https:` targets are accepted, and links pointing at this site are refused, which prevents redirect loops.

## Deployment

The app is designed for Vercel. Set the same environment variables in the project settings, and set `NEXT_PUBLIC_APP_URL` to your production URL. Country and city analytics come from Vercel's `x-vercel-ip-*` headers, so they are empty on other hosts.
