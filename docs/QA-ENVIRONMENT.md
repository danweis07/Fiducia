# QA Environment Guide

How to get code from your local branch into a running QA environment.

---

## QA Promotion Flow

```
local dev  ──>  feature branch  ──>  PR (CI checks)  ──>  merge  ──>  deploy to QA  ──>  smoke test  ──>  promote to prod
```

### Step-by-step

1. **Develop locally** — `npm run dev` (demo mode or Docker Compose full stack)
2. **Validate before pushing** — `npm run validate` (typecheck + lint + test + build)
3. **Push feature branch** — `git push -u origin feature/your-feature`
4. **Open PR** — CI runs lint, typecheck, unit tests, and build
5. **Merge to main** — After review and CI passes
6. **Deploy to QA** — See deployment options below
7. **Smoke test** — Verify the feature in the QA environment
8. **Promote to prod** — Follow your institution's change management process

---

## QA Environment Options

### Option A: Vercel Preview (Fastest)

Every PR automatically gets a preview deployment if Vercel is connected:

```bash
# One-time: connect repo to Vercel
vercel link

# Each PR gets a unique URL: https://your-project-<hash>.vercel.app
# Merge to main auto-deploys to production URL
```

Set these environment variables in Vercel dashboard:
- `VITE_DEMO_MODE=true` (for QA without a live backend)
- `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` (for QA with a real backend)

### Option B: Docker on a QA Server

```bash
# On the QA server
git pull origin main
docker compose up -d

# App: http://qa-server:8080
# Demo credentials: demo@fiducia.dev / demo1234
```

### Option C: Cloud Deploy (AWS/GCP/Azure)

```bash
# Deploy to your QA cloud environment
./scripts/deploy.sh aws --bucket qa-banking-app --distribution-id QA_DIST_ID
./scripts/deploy.sh gcp --project qa-project --region us-central1
./scripts/deploy.sh azure --token <qa-deployment-token>
```

### Option D: Per-Tenant QA with Supabase

For testing with a real backend and tenant isolation:

```bash
# Provision a QA tenant
npx tsx scripts/provision-tenant.ts \
  --name "QA Test Bank" \
  --subdomain "qa-test" \
  --region "us-east-1" \
  --tier "starter" \
  --template "us-credit-union" \
  --admin-email "qa@yourorg.com"
```

This creates a dedicated Supabase project with migrations applied and seed data loaded.

---

## QA Environment Variables

Copy `.env.example` to `.env.qa` and configure:

```bash
# Required for live QA (not needed if VITE_DEMO_MODE=true)
VITE_SUPABASE_URL=https://your-qa-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...

# QA-specific settings
VITE_APP_ENV=qa
VITE_DEMO_MODE=false          # set to true for demo-data QA
VITE_SENTRY_DSN=               # optional: error tracking for QA

# Core banking simulator (if using Docker Compose)
CORE_SIM_URL=http://core-sim:9090
```

---

## QA Checklist

Before marking a feature as QA-complete:

- [ ] Feature works in demo mode (mock data)
- [ ] Feature works with real backend (if applicable)
- [ ] No console errors or warnings
- [ ] Responsive layout (desktop + mobile viewports)
- [ ] Accessibility basics (keyboard nav, screen reader labels)
- [ ] No PII in browser console or network responses
- [ ] Monetary values display correctly (formatted from cents)
- [ ] Multi-tenant: feature respects tenant isolation

### Region-Specific QA

| Region | Additional Checks |
|--------|------------------|
| **US** | ABA routing validation, ACH cutoff times (5 PM ET), US holiday calendar |
| **UK** | Sort code format (XX-XX-XX), GBP formatting, UK bank holiday calendar |
| **EU** | IBAN validation, SEPA payment flows, GDPR consent prompts, SCA challenge |
| **Brazil** | CPF/CNPJ validation, PIX key formats, BRL formatting (R$), pt-BR translations |
| **Mexico** | CLABE validation, SPEI flows, MXN formatting, es translations |

---

## Running E2E Tests Against QA

```bash
# Against local dev server
npm run test:e2e

# Against a deployed QA URL
PLAYWRIGHT_BASE_URL=https://qa.yourbank.com npx playwright test
```

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Build fails on QA server | Check Node version matches `.nvmrc` (Node 20) |
| Demo mode shows no data | Verify `VITE_DEMO_MODE=true` in environment |
| Supabase connection fails | Check `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set |
| E2E tests timeout | Ensure dev server is running on port 8080 |
| Core simulator unreachable | Check Docker Compose health: `docker compose ps` |
