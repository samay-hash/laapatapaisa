# LaapataPaisa

Helps Indian families find and claim money that went unclaimed after someone passed away: bank deposits, shares, insurance, mutual funds, provident fund and post office savings.

## Structure

```
apps/
  web/            Next.js 16 app: landing page and the free check
    src/app/        routes (/, /check), metadata, robots, sitemap
    src/components/ UI components
    src/content/    sources.ts, the single source of truth for where money sits
    src/lib/check/  free check questions and scoring (pure, unit tested)
packages/         shared code, added as the backend arrives
```

## Getting started

Needs Node 20.9+ and pnpm 10.

```bash
pnpm install
cp apps/web/.env.example apps/web/.env.local
pnpm dev                 # http://localhost:3000
```

## Before every commit

```bash
pnpm check               # format, lint, typecheck, tests, production build
```

CI runs the same steps on every push and pull request.

## Ground rules

- **No secrets in git.** Only `.env.example` is committed. Anything prefixed `NEXT_PUBLIC_` is shipped to the browser, so never put keys there.
- **The free check never sends answers anywhere.** It runs entirely in the browser and shares only the public `/check` link.
- **Security headers** (CSP, HSTS, frame denial and more) live in `apps/web/next.config.ts`. Public pages use a static CSP. Signed-in pages must move to a per-request nonce CSP in `proxy.ts` when they are built.
- **Facts about institutions** live in `src/content/sources.ts`. Re-check rules and official links there before launch and whenever regulators change them.
- **Design tokens** (colours, fonts) live in `src/app/globals.css`. Don't hard-code colours in components.
