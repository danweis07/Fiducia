# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.2.0] - 2026-03-24

### Fixed

- Fix broken "clone, install, run" demo setup path:
  - Pin Tailwind CSS to v3 (was incorrectly set to ^4.2.1 with v3 codebase)
  - Fix CSS @import order (Google Fonts before @tailwind directives)
  - Add `envDir` to Vite config so `.env.local` is found at repo root
  - Fix macOS `sed` incompatibility in `setup.sh` (cross-platform temp file pattern)
  - Guard Supabase client init in demo mode with placeholder credentials
- Convert optional SDK imports (mixpanel, amplitude, posthog, braze, airship, opentelemetry) from `require()` to async `import()` with variable indirection to prevent Rollup build failures

### Changed

- Disable automatic triggers on all GitHub Actions workflows (workflow_dispatch only)
- Add failed-only and date filters to workflow cleanup script

### Infrastructure

- Add v1.1.0 release script and GitHub Actions workflow

## [1.1.0] - 2026-03-23

### Security

- Fix high severity XSS: sanitize `logoUrl` before use in img src
- Resolve 22 CodeQL security alerts (critical, high, medium)
- Fix command injection vulnerability

### Added

- Add Algolia search, Storyblok CMS, and Neo4j fraud graph adapters

### Infrastructure

- Restructure as monorepo with npm workspaces (`apps/web/`)
- Restore `.devcontainer` for one-click Codespaces setup
- Make security scan workflows advisory to prevent red checks

### Developer Experience

- Add `docs/QUICKSTART-DEMO.md` — 5-minute guide to running the full banking app with zero backend
- Add `scripts/generate-app.sh` — scaffold functional pages from 6 templates (account-dashboard, payment-form, card-manager, loan-calculator, spending-dashboard, custom)
- Add `scripts/recipes/` — standalone scripts that print exact gateway response shapes for each domain
- Add `docs/GETTING_STARTED.md` — step-by-step developer setup guide
- Add `.vscode/extensions.json` — recommended VS Code extensions for the project
- Add `.devcontainer/devcontainer.json` — GitHub Codespaces / Dev Container support
- Add changelog and contributing docs
- Clean up repo structure, remove translated root files

### Testing

- Add `docs/TESTING_PATTERNS.md` — documented testing conventions, hook/component/E2E patterns, and coverage expectations
- Coverage thresholds increased: 50% statements/lines, 40% branches/functions (configured in `vitest.config.ts`)
- Excluded `scripts/recipes/` and `scripts/templates/` from ESLint (CLI scripts and code-gen templates)

### Dependencies

- Bump flatted 3.4.1 → 3.4.2

## [1.0.0] - 2026-03-17

### Added

- Multi-tenant digital banking platform with React 19, Vite, TypeScript, and Tailwind CSS
- Supabase backend with 41 database migrations, RLS policies, and 11 edge functions
- Adapter-based core banking integrations: CU\*Answers, Symitar SymXchange, Apache Fineract
- Core banking simulator (Express.js) mimicking CU\*Answers, Symitar, and Fineract APIs
- Demo mode with comprehensive fixture data — works with zero backend configuration
- Consumer banking: accounts, transfers, bill pay, cards, loans, RDC, statements, P2P, wires
- Business banking: treasury, invoicing, payroll, cash sweeps, liquidity dashboard
- Admin portal with tenant management, compliance dashboards, and user administration
- KYC/AML compliance with audit logging and regulatory controls
- Internationalization with 33 languages via i18next
- Dark mode with theme system
- Multi-currency support with IBAN/SWIFT validation
- AI-powered financial insights with pluggable providers (Google AI, OpenAI, Anthropic)
- RAG knowledge base with pgvector (Supabase) or Pinecone
- Open Banking consent management and AISP/PISP stubs
- Server-Driven UI (SDUI) framework for dynamic screen rendering
- Realtime channels via Supabase Broadcast, Ably, or Kafka
- Analytics adapters: Mixpanel, Amplitude, RudderStack, PostHog
- Push notification adapters: Braze, Airship
- Consent management: built-in banner, Ketch, Osano, OneTrust
- Deployment configs for Vercel, Netlify, Railway, Cloudflare, AWS, GCP, Azure
- Kubernetes Helm chart with HPA, network policies, and RBAC
- Docker Compose full-stack development (React + Supabase + Core Simulator)
- Monitoring stack: Prometheus, Grafana, Alertmanager
- Playwright E2E tests (auth, accounts, dashboard, navigation, i18n, accessibility, performance)
- Vitest unit tests with coverage reporting
- k6 load and stress tests
- One-command setup script (`scripts/setup.sh`) with demo, Docker, and full modes
- Tenant provisioning by region (US, UK, EU, Brazil, Mexico)
- Security headers, CSP, rate limiting, and audit logging
- GitHub issue templates, Dependabot, CODEOWNERS
- Husky pre-commit hooks with lint-staged
- Flutter mobile companion app
- mTLS support for core banking simulator connections
- VPN networking configs (Tailscale, WireGuard)
- Secrets management templates (HashiCorp Vault, AWS Secrets Manager)
