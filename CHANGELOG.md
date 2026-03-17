# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-03-17

### Added

- Multi-tenant digital banking platform with React 19, Vite, TypeScript, and Tailwind CSS
- Supabase backend with 41 database migrations, RLS policies, and 11 edge functions
- Adapter-based core banking integrations: CU*Answers, Symitar SymXchange, Apache Fineract
- Core banking simulator (Express.js) mimicking CU*Answers, Symitar, and Fineract APIs
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
