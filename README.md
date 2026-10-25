# LaapataPaisa

Helps Indian families find and claim money that went unclaimed after someone passed away: bank deposits, shares, insurance, mutual funds, provident fund and post office savings.

## Structure

```
apps/web/                 Next.js 16 app (frontend and backend)
  drizzle/                  SQL migrations (generated, committed)
  src/app/                  routes
    page.tsx, check/          public pages
    login/                    email code and Google sign-in
    (app)/                    signed-in pages: dashboard, cases
    api/auth/                 Better Auth endpoints
  src/components/           UI components
  src/content/sources.ts    single source of truth for where money sits
  src/lib/                  pure logic: free check, name variants, validation
  src/server/               server-only code
    env.ts                    validated environment variables
    db/                       Drizzle schema and client
    auth.ts, session.ts       Better Auth setup and current-user helpers
    cases.ts                  data access layer, scoped to the signed-in user
  src/proxy.ts              redirects signed-out visitors away from app pages
docker-compose.yml        local Postgres for development
```

## Getting started

Needs Node 20.9+ and pnpm 10.

Needs Docker Desktop running for the local database.

```bash
pnpm install
cp apps/web/.env.example apps/web/.env.local
# put a secret in BETTER_AUTH_SECRET: openssl rand -base64 32
pnpm db:up               # start local Postgres
pnpm db:migrate          # create tables
pnpm dev                 # http://localhost:3000
```

Without `RESEND_API_KEY`, login codes are printed in the `pnpm dev` terminal.

To store a secret without it showing on screen or in shell history:

```bash
pnpm env:set DATABASE_URL     # prompts, then writes apps/web/.env.local
```

To use Supabase instead of the local Docker database, set `DATABASE_URL` to the project's Session pooler connection string, then run `pnpm db:migrate`.

## Changing the database

1. Edit `apps/web/src/server/db/schema/`.
2. `pnpm --filter web db:generate` to write a migration, and commit it.
3. `pnpm db:migrate` to apply it.

CI fails if the schema changes without a migration.

## Before every commit

```bash
pnpm check               # format, lint, typecheck, tests, production build
```

CI runs the same steps on every push and pull request.

## Ground rules

- **No secrets in git.** Only `.env.example` is committed. Anything prefixed `NEXT_PUBLIC_` is shipped to the browser, so never put keys there.
- **All case data goes through `src/server/cases.ts`.** Every function there resolves the signed-in user itself and scopes queries to them. Never pass a user id in from a page or action.
- **Validate every input** with the zod schemas in `src/lib/validation/` before it reaches the database. Server actions re-check ids too, since they can be called directly.
- **The free check never sends answers anywhere.** It runs entirely in the browser and shares only the public `/check` link.
- **Security headers** (CSP, HSTS, frame denial and more) live in `apps/web/next.config.ts`. The CSP allows inline scripts because Next.js needs them for prerendered pages; a nonce-based CSP would turn off prerendering. So never use `dangerouslySetInnerHTML` with user content.
- **Database connections are encrypted and verified.** `src/server/db/ssl.ts` pins Supabase's root CA (valid until 2031-04-26). Never switch to `rejectUnauthorized: false`.
- **Supabase's auto-generated APIs are locked out.** Every table has row level security on and the `anon`/`authenticated` roles have no grants (migration `0002`). New tables must call `.enableRLS()` in the schema.
- **Scanned photos are never stored.** `/api/scan` sends the image to Claude, returns the extracted fields and discards the image; only that a scan happened is logged. Signed-in users only, 20 scans a day.
- **Login codes** are hashed in the database, expire in 10 minutes, allow 5 attempts, and sending is rate limited in production.
- **Facts about institutions** live in `src/content/sources.ts`. Re-check rules and official links there before launch and whenever regulators change them.
- **Design tokens** (colours, fonts) live in `src/app/globals.css`. Don't hard-code colours in components.
