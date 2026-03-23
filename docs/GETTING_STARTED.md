# Getting Started

A step-by-step guide to get Fiducia running locally and start developing.

## TL;DR

```bash
git clone https://github.com/danweis07/Fiducia.git && cd Fiducia
./scripts/setup.sh --demo
npm run dev
# Open http://localhost:8080 — login with demo@fiducia.dev / demo1234
```

## Prerequisites

| Tool    | Version | Check                                         |
| ------- | ------- | --------------------------------------------- |
| Node.js | 20+     | `node --version`                              |
| npm     | 9+      | `npm --version`                               |
| Docker  | 24+     | `docker --version` (optional, for full stack) |

An `.nvmrc` file is included — run `nvm use` to switch to the correct Node version.

## Choose Your Setup Path

### Path A: Demo Mode (recommended for first run)

No backend, no database, no API keys. The app runs entirely in the browser with mock data.

```bash
./scripts/setup.sh --demo   # Installs deps, creates .env.local with VITE_DEMO_MODE=true
npm run dev                  # Starts Vite dev server at http://localhost:8080
```

**What you get:** All UI pages, mock accounts/transactions, sample member data, adapter fallbacks.

**What you don't get:** Persistent data, real database, edge functions, realtime subscriptions.

### Path B: Docker Compose (full stack)

Runs the React app, Supabase (PostgreSQL + API + Studio), and the core banking simulator together.

```bash
docker compose up
```

| Service         | URL                    | Purpose                |
| --------------- | ---------------------- | ---------------------- |
| React app       | http://localhost:8080  | Frontend with HMR      |
| Supabase API    | http://localhost:54321 | Backend API            |
| Supabase Studio | http://localhost:54323 | Database admin UI      |
| PostgreSQL      | localhost:54322        | Direct DB access       |
| Core Simulator  | http://localhost:9090  | Mock core banking APIs |

Add monitoring (Prometheus + Grafana):

```bash
docker compose --profile monitoring up
```

### Path C: Full Local with Supabase CLI

Use this when working on database migrations or edge functions.

```bash
./scripts/setup.sh --full   # Installs deps + starts Supabase CLI
```

Requires the [Supabase CLI](https://supabase.com/docs/guides/cli) installed separately.

### Path D: GitHub Codespaces (zero local setup)

Click the green **Code** button on GitHub, then **Open with Codespaces**. The dev container auto-installs dependencies, enables demo mode, and starts the dev server. The app opens in your browser automatically.

## Key Environment Variables

The `.env.example` file documents all available variables. The most important ones:

| Variable                 | Default | Purpose                              |
| ------------------------ | ------- | ------------------------------------ |
| `VITE_DEMO_MODE`         | `false` | Enable mock data (no backend needed) |
| `VITE_SUPABASE_URL`      | —       | Supabase project URL                 |
| `VITE_SUPABASE_ANON_KEY` | —       | Supabase public API key              |

All integration adapters (Plaid, MX, Alloy, AI services, etc.) are **optional** — if credentials are missing, the app automatically falls back to mock implementations.

## First Things to Try

1. **Log in** — Use `demo@fiducia.dev` / `demo1234` and explore accounts, transfers, cards, and the admin portal
2. **Edit a page** — Open `apps/web/src/pages/DashboardPage.tsx`, make a change, and watch HMR update instantly
3. **Run the tests** — `npm run test` starts Vitest in watch mode
4. **Run validation** — `npm run validate` runs the same checks as CI (typecheck + lint + test + build)
5. **Explore Supabase Studio** — Open http://localhost:54323 (Docker mode only) to browse the database

## IDE Setup

### VS Code

This repo includes `.vscode/` workspace configuration. When you open the project:

1. VS Code will prompt you to install recommended extensions — accept
2. Format-on-save and ESLint auto-fix are preconfigured
3. Use **Ctrl+Shift+B** to run the `validate` task (typecheck + lint + test + build)
4. Debug configs are in the Run & Debug panel: "Dev Server", "Vitest: Current File", "Playwright: Debug"

### Other IDEs

- Configure the `@/` path alias to resolve to `apps/web/src/` (see `apps/web/tsconfig.json`)
- Use Prettier for formatting (config in `package.json`)
- Use ESLint with the flat config in `apps/web/eslint.config.js`

## Common Issues

**`setup.sh` fails with "permission denied"**

```bash
chmod +x scripts/setup.sh
```

**Wrong Node.js version**

```bash
nvm use   # reads .nvmrc, switches to Node 20
```

**Port 8080 already in use**

```bash
lsof -i :8080           # find what's using it
npx vite --port 3000    # or use a different port
```

**`npm install` fails**

```bash
rm -rf node_modules package-lock.json && npm install
```

**Docker containers won't start**

```bash
docker compose down -v && docker compose up
```

See [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for more solutions.

## Next Steps

- [ARCHITECTURE.md](ARCHITECTURE.md) — System design, adapter pattern, multi-tenancy, API gateway
- [CONTRIBUTING.md](../CONTRIBUTING.md) — Development workflow, PR guidelines, commit conventions
- [TESTING_PATTERNS.md](TESTING_PATTERNS.md) — Testing conventions and examples
- [API-GUIDE.md](API-GUIDE.md) — RPC gateway endpoint examples
- [SANDBOX-INTEGRATIONS.md](SANDBOX-INTEGRATIONS.md) — How to get sandbox credentials for real integrations
- [DEVELOPER-SETUP-BY-REGION.md](DEVELOPER-SETUP-BY-REGION.md) — Region-specific onboarding (US, UK, EU, Brazil)
