[![CI](https://github.com/danweis07/Fiducia/actions/workflows/ci.yml/badge.svg)](https://github.com/danweis07/Fiducia/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-20%2B-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-blue.svg)](https://react.dev/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

# Fiducia — Open Banking Platform

Multi-tenant digital banking platform for credit unions and community banks. React + TypeScript + pluggable backend and core banking adapters.

**Demo mode works out of the box — no backend, no API keys, no signup.** Clone, install, run.

## Quick Start

```bash
git clone https://github.com/danweis07/Fiducia.git && cd Fiducia
./scripts/setup.sh --demo   # installs deps, creates .env.local, verifies build
npm run dev                  # http://localhost:8080
```

Or with Docker (full stack — React + Supabase + Core Banking Simulator):

```bash
docker compose up            # http://localhost:8080
```

Demo credentials: `demo@fiducia.dev` / `demo1234`

## What's Inside

| Layer        | Tech                                   | Details                                                              |
| ------------ | -------------------------------------- | -------------------------------------------------------------------- |
| Frontend     | React 19, Vite, TypeScript, Tailwind   | 60+ pages, 50 UI components (Radix), dark mode, i18n (33 languages)  |
| Backend      | Supabase (PostgreSQL + Edge Functions) | 41 migrations, 11 edge functions, RLS, realtime subscriptions        |
| Core Banking | Adapter pattern                        | CU\*Answers, Symitar SymXchange, Apache Fineract — or bring your own |
| Simulator    | Express.js                             | Mimics CU\*Answers, Symitar, and Fineract APIs locally (port 9090)   |
| Mobile       | Flutter                                | iOS/Android companion app                                            |
| Monitoring   | Prometheus + Grafana + Alertmanager    | Optional `--profile monitoring` in Docker Compose                    |

### Key Features

- **Multi-tenant** — provision tenants by region with `scripts/provision-tenant.ts`
- **Adapter-based integrations** — every external service (core banking, KYC, payments, AI) has a mock fallback
- **Consumer banking** — accounts, transfers, bill pay, cards, loans, RDC, statements, P2P, wires
- **Business banking** — treasury, invoicing, payroll, cash sweeps, liquidity dashboard
- **Compliance** — KYC/AML, audit logs, GDPR/LGPD consent, PSD2, SCA, FFIEC, NCUA
- **International** — multi-currency, IBAN/SWIFT, FX, international payments
- **AI** — RAG knowledge base, financial insights, recommendations (Google AI / OpenAI / Anthropic)
- **Open Banking** — consent management, AISP/PISP stubs, API gateway

## What's Next

Once the app is running, here's how to get oriented:

1. **Explore the demo** — log in with `demo@fiducia.dev` / `demo1234` and browse accounts, transfers, cards, and the admin portal
2. **Run the tests** — `npm run test` (unit) or `npm run test:e2e` (end-to-end)
3. **Read the architecture** — [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) explains the adapter pattern, API gateway, and multi-tenancy model
4. **Make a change** — try editing a page in `src/pages/`, watch HMR update instantly, then run `npm run validate` to check everything passes

## Prerequisites

| Tool         | Version | Required for                               |
| ------------ | ------- | ------------------------------------------ |
| Node.js      | 20+     | All development (`.nvmrc` included)        |
| npm          | 9+      | Bundled with Node                          |
| Docker       | 24+     | Full-stack local dev (`docker compose up`) |
| Supabase CLI | latest  | Backend/migration development only         |

## Project Structure

```
Fiducia/
├── src/                    # React frontend
│   ├── pages/              # Route page components (60+)
│   ├── components/         # Reusable components (ui/, banking/, admin/, sdui/)
│   ├── contexts/           # Auth, Theme, Tenant providers
│   ├── hooks/              # Custom React hooks
│   ├── lib/                # Core logic: gateway, backend, i18n, demo-data, services
│   ├── integrations/       # Supabase client & auto-generated types
│   ├── routes/             # Public, banking, admin route definitions
│   ├── services/           # Domain service layer
│   └── types/              # TypeScript domain types (20+ files)
├── supabase/               # Backend
│   ├── migrations/         # 41 SQL migrations (schema + seed data)
│   └── functions/          # 11 Deno edge functions (gateway, SSO, OAuth, etc.)
├── core-simulator/         # Mock core banking server (Express, port 9090)
├── mobile/                 # Flutter mobile app
├── e2e/                    # Playwright E2E tests (7 spec files)
├── tests/                  # Load tests (k6, smoke, soak, stress)
├── load-tests/             # Additional k6 performance tests
├── deploy/                 # Cloud configs (AWS, GCP, Azure, Cloudflare, networking, secrets)
├── helm/                   # Kubernetes Helm chart
├── monitoring/             # Prometheus, Grafana, Alertmanager configs
├── scripts/                # Setup, deploy, provisioning, compliance, backup
├── docs/                   # Developer guides
└── docker-compose.yml      # Full-stack local development
```

## Development

```bash
npm run dev              # Vite dev server with HMR
npm run test             # Vitest in watch mode
npm run test:e2e         # Playwright (Chromium, Firefox, WebKit, mobile Chrome)
npm run lint             # ESLint
npm run typecheck        # TypeScript strict checking
npm run validate         # All of the above + production build
```

### Full Stack with Docker

```bash
docker compose up                          # React + Supabase + Core Simulator
docker compose --profile monitoring up     # + Prometheus + Grafana
docker compose down -v                     # Stop and reset all data
```

| Service         | URL                    |
| --------------- | ---------------------- |
| React App       | http://localhost:8080  |
| Supabase API    | http://localhost:54321 |
| Supabase Studio | http://localhost:54323 |
| Core Simulator  | http://localhost:9090  |

### Core Banking Simulator

The simulator (port 9090) mimics real core banking APIs for local development:

- **CU\*Answers:** `http://localhost:9090/api/credit_unions/:cuId/membership/...`
- **SymXchange:** `http://localhost:9090/symxchange/accounts/...`
- **Fineract:** `http://localhost:9090/fineract-provider/api/v1/...`

Inject errors for resilience testing:

```bash
curl -X POST http://localhost:9090/admin/config \
  -H 'Content-Type: application/json' \
  -d '{"latencyMs": 500, "coreBusyRate": 0.3}'
```

## Environment Variables

Copy `.env.example` to `.env.local` and fill in values. Only two are required to get started:

| Variable                 | Required               | Description                                             |
| ------------------------ | ---------------------- | ------------------------------------------------------- |
| `VITE_SUPABASE_URL`      | Yes (or use demo mode) | Supabase project URL                                    |
| `VITE_SUPABASE_ANON_KEY` | Yes (or use demo mode) | Supabase public key                                     |
| `VITE_DEMO_MODE`         | No                     | Set `true` to use built-in demo data (default in setup) |

All integration adapters (Plaid, Alloy, MX, AI services, etc.) are optional and fall back to mock implementations. See `.env.example` for the full list with documentation.

## Deployment

Configs are provided for multiple platforms. Pick one:

| Platform                  | Config                                  | Deploy                            |
| ------------------------- | --------------------------------------- | --------------------------------- |
| **Vercel**                | `vercel.json`                           | Connect repo in Vercel dashboard  |
| **Netlify**               | `netlify.toml`                          | Connect repo in Netlify dashboard |
| **Railway**               | `railway.json`                          | `railway up`                      |
| **Cloudflare Pages**      | `wrangler.toml`                         | `npx wrangler pages deploy dist`  |
| **AWS**                   | `deploy/aws/cloudformation.yaml`        | `aws cloudformation deploy`       |
| **GCP Cloud Run**         | `deploy/gcp/cloud-run.yaml`             | `gcloud run deploy`               |
| **Azure Static Web Apps** | `deploy/azure/staticwebapp.config.json` | Connect via Azure Portal          |
| **Docker**                | `Dockerfile`                            | Multi-stage build → nginx         |
| **Kubernetes**            | `helm/banking-platform/`                | `helm install`                    |

For multi-tenant deployment: `./scripts/deploy-all-tenants.sh`

## Regional Readiness

| Region             | Status           | Payment Rails                                   | Notes                                           |
| ------------------ | ---------------- | ----------------------------------------------- | ----------------------------------------------- |
| US Credit Unions   | Production-ready | Simulator covers CU\*Answers, Symitar, Fineract | ACH cutoffs, ABA routing, FFIEC/NCUA compliance |
| US Community Banks | Production-ready | Wire transfers, dual-approval workflows         | CRA reporting hooks                             |
| UK Digital Banks   | In development   | Stubs (Faster Payments, BACS, CHAPS)            | FCA compliance, sort code validation            |
| EU Neobanks        | In development   | Stubs (SEPA, SCT Inst)                          | IBAN validation, PSD2, GDPR, TARGET2 calendar   |
| Brazil             | Early            | Not started (PIX blocker)                       | CPF/CNPJ validation, BRL, pt-BR i18n            |
| Mexico             | Early            | Not started (SPEI)                              | CLABE validation, MXN, es i18n                  |

See [docs/DEVELOPER-SETUP-BY-REGION.md](docs/DEVELOPER-SETUP-BY-REGION.md) for region-specific setup, recommended adapters, and known gaps.

## Testing

- **Unit tests:** 169 test files using Vitest + Testing Library (`npm test`)
- **E2E tests:** 7 Playwright specs — auth, accounts, dashboard, navigation, i18n, accessibility, performance (`npm run test:e2e`)
- **Load tests:** k6 scripts for smoke, load, stress, and soak testing (`tests/load/`, `load-tests/k6/`)
- **Coverage:** `npm run test:coverage` (thresholds: 50% statements/lines, 40% branches/functions)

## API

The backend uses an RPC-style gateway through a single Supabase Edge Function:

```
POST /functions/v1/gateway
Authorization: Bearer <supabase-jwt>

{
  "action": "accounts.list",
  "params": { "limit": 10 }
}
```

Full API specification: [`openapi.yaml`](openapi.yaml)

## Documentation

| Document                                                       | Description                                         |
| -------------------------------------------------------------- | --------------------------------------------------- |
| [Developer Setup by Region](docs/DEVELOPER-SETUP-BY-REGION.md) | Region-specific onboarding, adapters, and gaps      |
| [QA Environment Guide](docs/QA-ENVIRONMENT.md)                 | QA promotion flow and environment options           |
| [Architecture Overview](docs/ARCHITECTURE.md)                  | System design, data flow, and adapter pattern       |
| [OpenAPI Spec](openapi.yaml)                                   | Full API reference                                  |
| [Contributing](CONTRIBUTING.md)                                | How to contribute, PR conventions, code style       |
| [Security Policy](SECURITY.md)                                 | Vulnerability reporting and security practices      |
| [Troubleshooting](docs/TROUBLESHOOTING.md)                     | Common setup and development issues                 |
| [Sandbox Integrations](docs/SANDBOX-INTEGRATIONS.md)           | How to get sandbox credentials for each integration |
| [API Guide](docs/API-GUIDE.md)                                 | Gateway API examples with curl                      |
| [Production Checklist](docs/PRODUCTION-CHECKLIST.md)           | Pre- and post-deployment verification               |
| [Legal Disclaimer](LEGAL.md)                                   | Regulatory, liability, and usage disclaimers        |
| [Governance](GOVERNANCE.md)                                    | Maintainer roles, decision process, releases        |
| [Support](SUPPORT.md)                                          | How to get help and where to ask questions          |

## Disclaimer

Fiducia is an experimental software framework provided as-is for research and educational purposes. Usage of this code does not grant or constitute a banking license. See [LEGAL.md](LEGAL.md) for full terms.

## License

[MIT](LICENSE) — Copyright 2026 Open Banking Platform Contributors
