# Quickstart: Full Banking App in 5 Minutes

Get the entire Fiducia digital banking platform running locally with **zero backend dependencies**. Everything uses built-in mock data — no Supabase, no Docker, no API keys.

## The 3-Command Start

```bash
git clone <repo-url> && cd Fiducia
./scripts/setup.sh --demo    # installs deps, enables demo mode, verifies build
npm run dev                  # starts at http://localhost:8080
```

That's it. Open [http://localhost:8080](http://localhost:8080) and you'll see the demo selector with two portals:

| Portal      | URL                    | What you get                                                                                          |
| ----------- | ---------------------- | ----------------------------------------------------------------------------------------------------- |
| **Banking** | `/dashboard?demo=true` | Full member banking: accounts, transfers, bills, cards, loans, statements, spending insights, AI chat |
| **Admin**   | `/admin?demo=true`     | Admin dashboard: user management, audit logs, integration health, compliance                          |

## What's Running

In demo mode, the app is **100% client-side**:

- **60+ pages** are fully functional with realistic mock data
- **Gateway calls** (`gateway.accounts.list()`, etc.) return demo data instead of hitting Supabase
- **Authentication is bypassed** — you're automatically logged in as `demo@example.com`
- **All features work**: accounts, transactions, bill pay, cards, loans, deposits, spending analytics, AI insights, admin portal

## Key Pages to Explore

| Feature   | Route        | What it shows                                        |
| --------- | ------------ | ---------------------------------------------------- |
| Dashboard | `/dashboard` | Account balances, recent transactions, quick actions |
| Accounts  | `/accounts`  | All accounts with balances and details               |
| Transfer  | `/transfer`  | Internal transfers between accounts                  |
| Bill Pay  | `/bills`     | Upcoming bills, pay/schedule payments                |
| Cards     | `/cards`     | Debit/credit cards, lock/unlock, limits              |
| Financial | `/financial` | Spending breakdown, merchant analysis, goals         |
| Settings  | `/settings`  | Profile, security, notification preferences          |
| Admin     | `/admin`     | User management, audit log, integrations             |

## Explore the Data Layer

Want to see what data powers the app? Run recipe scripts directly:

```bash
# See all available gateway actions
npx tsx scripts/recipes/list-all-actions.ts

# See exact JSON responses for each domain
npx tsx scripts/recipes/accounts-overview.ts
npx tsx scripts/recipes/payments-and-transfers.ts
npx tsx scripts/recipes/cards-and-loans.ts
npx tsx scripts/recipes/financial-insights.ts
npx tsx scripts/recipes/admin-portal.ts
```

These print the exact JSON shapes that hooks receive, so you can understand the data model without reading source code.

## Scaffold a New Page

Generate a fully functional page wired to mock data in one command:

```bash
# Pick a template
./scripts/generate-app.sh account-dashboard    # Account balances + transactions
./scripts/generate-app.sh payment-form         # Bill pay form
./scripts/generate-app.sh card-manager         # Card lock/unlock controls
./scripts/generate-app.sh loan-calculator      # Loan products + payment schedule
./scripts/generate-app.sh spending-dashboard   # Spending breakdown + AI insights
./scripts/generate-app.sh custom MyFeature     # Blank page wired to gateway

# Then just run
npm run dev
# Open http://localhost:8080/<your-route>?demo=true
```

The generator:

1. Copies a template to `apps/web/src/pages/YourPage.tsx`
2. Registers the route in `bankingRoutes.tsx`
3. Ensures demo mode is enabled

Edit the generated file and HMR updates instantly.

## How Demo Mode Works

```
User navigates to any page
    ↓
ProtectedRoute checks isDemoMode()
    → true → skips authentication, renders page
    ↓
Page calls gateway.accounts.list() (or any action)
    ↓
callGateway() checks isDemoMode()
    → true → imports apps/web/src/lib/demo-data/
    → returns mock JSON matching production shape
    ↓
Page renders with realistic data
```

Demo mode activates via any of:

- `VITE_DEMO_MODE=true` in `.env.local` (set by `setup.sh --demo`)
- `?demo=true` query parameter (persisted to sessionStorage)

## Mock Data Coverage

The demo-data layer covers **16 domains** with **100+ gateway actions**:

- **Accounts** — checking, savings, CD, transactions, beneficiaries
- **Payments** — bills, bill pay, wires, P2P, stop payments
- **Cards** — debit/credit, lock/unlock, spending limits
- **Loans** — auto, mortgage, payment schedules, amortization, products
- **Deposits** — remote deposit capture, check deposits, statements
- **Financial** — spending analytics, merchant analysis, goals, alerts
- **AI** — chat, proactive insights, automation rules, knowledge base
- **Admin** — users, accounts, audit logs, integration health
- **Compliance** — KYC, sanctions, transaction monitoring
- **Content** — CMS banners, announcements, experiments
- **Integrations** — Plaid, ATM locator, account products
- **Incidents** — security events, fraud alerts, risk assessments

All data uses consistent IDs (`acct-demo-checking-001`, etc.) so cross-domain relationships work correctly.

## Moving Beyond Demo Mode

When you're ready to connect real services:

```bash
# Full stack with Docker (Supabase + Core Simulator)
./scripts/setup.sh --docker

# Or configure Supabase manually
cp .env.example .env.local
# Edit .env.local with your Supabase URL and key
# Set VITE_DEMO_MODE=false
```

The app auto-detects which adapters have credentials configured and falls back to mock for the rest — you can mix real and demo data during development.
