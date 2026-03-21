# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Developer Experience

- Add `docs/QUICKSTART-DEMO.md` — 5-minute guide to running the full banking app with zero backend
- Add `scripts/generate-app.sh` — scaffold functional pages from 6 templates (account-dashboard, payment-form, card-manager, loan-calculator, spending-dashboard, custom)
- Add `scripts/recipes/` — standalone scripts that print exact gateway response shapes for each domain
- Add `docs/GETTING_STARTED.md` — step-by-step developer setup guide
- Add `.vscode/extensions.json` — recommended VS Code extensions for the project
- Add `.devcontainer/devcontainer.json` — GitHub Codespaces / Dev Container support

### Testing

- Add `docs/TESTING_PATTERNS.md` — documented testing conventions, hook/component/E2E patterns, and coverage expectations
- Coverage thresholds enforced in CI: 30% statements/lines, 25% branches/functions (configured in `vitest.config.ts`)
- Excluded `scripts/recipes/` and `scripts/templates/` from ESLint (CLI scripts and code-gen templates)

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
