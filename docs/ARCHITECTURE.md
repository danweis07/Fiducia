# Architecture Overview

This document describes the high-level system design of the Fiducia digital banking platform.

## System Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                          Client Layer                               │
│                                                                     │
│   ┌──────────────┐    ┌──────────────┐    ┌──────────────────────┐ │
│   │  React SPA   │    │ Flutter App  │    │  Third-Party Apps    │ │
│   │  (Vite)      │    │ (iOS/Android)│    │  (via OpenAPI)       │ │
│   └──────┬───────┘    └──────┬───────┘    └──────────┬───────────┘ │
└──────────┼───────────────────┼───────────────────────┼─────────────┘
           │                   │                       │
           ▼                   ▼                       ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        Supabase Layer                               │
│                                                                     │
│   ┌──────────────────────────────────────────────────────────────┐  │
│   │  Edge Functions (Deno)                                       │  │
│   │  ┌──────────┐ ┌──────────┐ ┌────────┐ ┌──────────────────┐  │  │
│   │  │ Gateway  │ │   SSO    │ │  OAuth  │ │  Event Ingest    │  │  │
│   │  │ (RPC)    │ │ Init/CB  │ │ Start/CB│ │  Content API     │  │  │
│   │  └──────────┘ └──────────┘ └────────┘ └──────────────────┘  │  │
│   └──────────────────────────┬───────────────────────────────────┘  │
│                              │                                      │
│   ┌──────────────────────────▼───────────────────────────────────┐  │
│   │  PostgreSQL 15                                               │  │
│   │  ┌──────────┐ ┌──────────┐ ┌────────┐ ┌──────────────────┐  │  │
│   │  │  Tenants │ │ Accounts │ │  Audit │ │  pgvector (RAG)  │  │  │
│   │  │  (RLS)   │ │  Loans   │ │  Logs  │ │  AI Knowledge    │  │  │
│   │  └──────────┘ └──────────┘ └────────┘ └──────────────────┘  │  │
│   └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│   ┌────────────┐  ┌────────────┐  ┌────────────┐                   │
│   │  GoTrue    │  │  Realtime  │  │  Storage   │                   │
│   │  (Auth)    │  │ (WebSocket)│  │  (Files)   │                   │
│   └────────────┘  └────────────┘  └────────────┘                   │
└─────────────────────────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     Integration Layer (Adapters)                    │
│                                                                     │
│   ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐ │
│   │ Core Banking │  │   Payments   │  │   Identity / KYC         │ │
│   │ CU*Answers   │  │   Plaid      │  │   Alloy                  │ │
│   │ Symitar      │  │   Zelle      │  │   MX                     │ │
│   │ Fineract     │  │   FedNow/RTP │  │   BioCatch               │ │
│   └──────────────┘  └──────────────┘  └──────────────────────────┘ │
│                                                                     │
│   ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐ │
│   │ AI Services  │  │  Analytics   │  │   Messaging              │ │
│   │ Google AI    │  │  Mixpanel    │  │   Braze                  │ │
│   │ OpenAI       │  │  Amplitude   │  │   Airship                │ │
│   │ Anthropic    │  │  PostHog     │  │   (push, email, SMS)     │ │
│   └──────────────┘  └──────────────┘  └──────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

## Core Concepts

### Multi-Tenancy

Every row in the database belongs to a tenant. Row Level Security (RLS) policies enforce isolation at the PostgreSQL level — there is no application-level filtering to bypass.

Tenants are provisioned via `scripts/provision-tenant.ts` with region-specific templates (US credit union, UK digital bank, EU neobank, etc.). Each tenant gets its own subdomain, branding, feature flags, and adapter configuration.

### Adapter Pattern

External integrations follow a consistent adapter interface:

```
Environment variable set? ──yes──▶ Use real adapter (Plaid, Alloy, etc.)
         │
         no
         │
         ▼
Use mock adapter (returns realistic demo data)
```

This means the platform runs fully offline in demo mode. No API keys are needed for local development. Each adapter category (core banking, KYC, payments, analytics, messaging, AI) has:

1. A TypeScript interface defining the contract
2. A mock implementation with realistic fixture data
3. One or more real implementations
4. Auto-detection based on environment variables

### API Gateway

The backend uses a single RPC-style edge function (`/functions/v1/gateway`) rather than REST resource endpoints. Every request sends an `action` string and `params` object:

```json
{
  "action": "accounts.list",
  "params": { "limit": 10, "offset": 0 }
}
```

Actions are routed to modular handler files in `apps/web/src/lib/gateway/`:

| Module             | Actions                                                 |
| ------------------ | ------------------------------------------------------- |
| `accounts.ts`      | `accounts.list`, `accounts.get`, `accounts.create`      |
| `payments.ts`      | `payments.transfer`, `payments.billpay`, `payments.p2p` |
| `financial.ts`     | `financial.statements`, `financial.analytics`           |
| `compliance.ts`    | `compliance.kyc`, `compliance.audit`                    |
| `international.ts` | `international.wire`, `international.fx`                |

### Backend Provider Abstraction

The frontend doesn't talk to Supabase directly. A backend provider abstraction (`apps/web/src/lib/backend/`) allows swapping the entire backend:

- **Supabase provider** (default) — talks to Supabase client SDK
- **REST provider** — talks to any REST API matching the OpenAPI spec
- **Realtime providers** — Supabase Broadcast, Ably, or Kafka for live updates

Set `VITE_BACKEND_PROVIDER=rest` and `VITE_API_BASE_URL` to point at a custom backend.

### Server-Driven UI (SDUI)

Screen layouts can be defined server-side in the `sdui_screen_manifests` table and rendered dynamically by the SDUI components in `apps/web/src/components/sdui/`. This allows updating UI without deploying new frontend code — useful for A/B tests and per-tenant customization.

## Data Flow

### Authentication

```
User ──▶ Supabase GoTrue ──▶ JWT issued
                                │
                                ▼
              JWT included in all API requests
                                │
                                ▼
              Edge Function validates JWT + extracts tenant_id
                                │
                                ▼
              RLS policies enforce row-level access
```

### Transaction Flow (e.g., Transfer)

```
React form ──▶ Zod validation (client-side)
                     │
                     ▼
              Gateway edge function (action: "payments.transfer")
                     │
                     ▼
              Server-side validation + rate limit check
                     │
                     ▼
              Core banking adapter (CU*Answers / Symitar / Fineract / mock)
                     │
                     ▼
              Audit log entry written
                     │
                     ▼
              Realtime broadcast to connected clients
                     │
                     ▼
              Response to client ──▶ React Query cache update ──▶ UI refresh
```

## Frontend Architecture

### State Management

| Concern                               | Solution                                                           |
| ------------------------------------- | ------------------------------------------------------------------ |
| Server state (accounts, transactions) | TanStack React Query with 5-minute stale time                      |
| Auth state                            | `AuthProvider` context (`apps/web/src/contexts/TenantContext.tsx`) |
| Theme (dark/light)                    | `ThemeProvider` context (`apps/web/src/contexts/ThemeContext.tsx`) |
| Form state                            | react-hook-form + Zod schemas                                      |
| URL state                             | React Router v6                                                    |

### Route Organization

Routes are split into three groups, loaded in `App.tsx`:

- **Public routes** (`apps/web/src/routes/publicRoutes.tsx`) — marketing pages, auth, no login required
- **Banking routes** (`apps/web/src/routes/bankingRoutes.tsx`) — consumer/business banking, wrapped in `ProtectedRoute`
- **Admin routes** (`apps/web/src/routes/adminRoutes.tsx`) — admin portal, requires admin role

All page components are lazy-loaded with `React.lazy()` and wrapped in `Suspense` with a spinner fallback.

### Component Organization

```
apps/web/src/components/
├── ui/          # Radix-based primitives (button, dialog, form, etc.) — shadcn/ui pattern
├── banking/     # Domain components (account cards, transaction lists, etc.)
├── admin/       # Admin-specific components
├── common/      # Shared utilities (Spinner, SkipLink, ErrorBoundary)
├── sdui/        # Server-Driven UI renderers
└── public/      # Public-facing marketing components
```

## Database Schema

Key table groups (41 migrations total):

| Group         | Tables                                                                 | Purpose                     |
| ------------- | ---------------------------------------------------------------------- | --------------------------- |
| Multi-tenancy | `tenants`, `tenant_registry`, `tenant_settings`                        | Tenant isolation and config |
| Auth          | `auth_settings`, `password_policies`, `sso_providers`                  | Authentication policies     |
| Banking       | `banking_accounts`, `banking_account_products`, `banking_transactions` | Core banking data           |
| Loans         | `banking_loans`, `banking_loan_products`, `banking_loan_schedule`      | Lending                     |
| Cards         | `card_services`, `card_devices`                                        | Card management             |
| Compliance    | `audit_logs`, `kyc_records`, `open_banking_consent`                    | Regulatory                  |
| Messaging     | `secure_messages`, `notification_preferences`                          | Communication               |
| Content       | `cms_channels`, `cms_content`, `sdui_screen_manifests`                 | CMS and SDUI                |
| AI            | `ai_knowledge_base`, `ai_embeddings`                                   | RAG and vector search       |
| Integrations  | `integration_configs`, `adapter_cache`                                 | Adapter state               |
| Experiments   | `experiments`, `experiment_variants`                                   | A/B testing                 |

## Deployment Architecture

### Single-Region (Simple)

```
Vercel/Netlify/Cloudflare ──▶ Static SPA
         │
         ▼
Supabase Cloud ──▶ PostgreSQL + Edge Functions + Auth + Storage
```

### Multi-Region (Production)

```
CDN (Cloudflare/CloudFront)
         │
         ▼
Container (Docker/K8s) ──▶ nginx serving static assets
         │
         ▼
Supabase (self-hosted or cloud) ──▶ PostgreSQL with read replicas
         │
         ▼
Core Banking ──▶ VPN (Tailscale/WireGuard) ──▶ On-prem core systems
```

The Helm chart (`helm/banking-platform/`) includes:

- Horizontal Pod Autoscaler (HPA)
- Network policies for pod-to-pod isolation
- RBAC and security contexts
- Prometheus scrape annotations
- Ingress with TLS (cert-manager) and rate limiting

## Monitoring

The optional monitoring stack (`docker compose --profile monitoring up`):

- **Prometheus** — scrapes app and core simulator metrics
- **Grafana** — pre-configured dashboards for banking operations
- **Alertmanager** — alerts for error rates, latency, and availability

Sentry is used for frontend error tracking and performance monitoring.
OpenTelemetry is supported for distributed tracing across edge functions.
