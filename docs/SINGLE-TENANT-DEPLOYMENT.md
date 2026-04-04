# Single-Tenant Deployment Guide

Deploy Fiducia as a self-hosted, single-institution installation. Ideal for credit unions and community banks running Fiducia for themselves without needing multi-tenant SaaS infrastructure.

---

## 1. Prerequisites

| Requirement | Version | Notes                                        |
| ----------- | ------- | -------------------------------------------- |
| Node.js     | 20+     | `.nvmrc` included                            |
| Docker      | 20+     | Docker Compose V2 required                   |
| npm         | 9+      | Comes with Node.js                           |
| Disk space  | 2 GB+   | For Docker images and database               |
| RAM         | 4 GB+   | 8 GB recommended for comfortable development |

Optional for production:

- A Supabase Cloud project (or self-hosted Supabase)
- A domain name with TLS certificate
- A core banking system (CU\*Answers, Symitar, Fineract, etc.)

## 2. Quick Start

### One-Command Setup

```bash
./scripts/single-tenant-setup.sh \
  --name "Arizona Federal Credit Union" \
  --admin-email "admin@azfcu.org" \
  --template us-credit-union
```

This will:

1. Check prerequisites (Node.js 20+, Docker)
2. Install npm dependencies
3. Start PostgreSQL, Supabase API, and Core Banking Simulator via Docker
4. Wait for all services to be healthy
5. Run `provision-self-hosted.ts` to seed the database with your institution
6. Create the admin user
7. Generate `.env.local` with all settings
8. Print login URL and credentials
9. Optionally start the dev server

### Script Options

| Flag               | Description                       | Default              |
| ------------------ | --------------------------------- | -------------------- |
| `--name`           | Institution name (required)       |                      |
| `--admin-email`    | Admin email (required)            |                      |
| `--template`       | Institution template              | `us-credit-union`    |
| `--admin-password` | Admin password **(required)**     | *(none — must be provided)* |
| `--no-dev-server`  | Skip starting dev server          | starts by default    |
| `--features`       | Comma-separated feature overrides | from template        |

### Templates

| Template            | Region | Currency | Key Features                                                               |
| ------------------- | ------ | -------- | -------------------------------------------------------------------------- |
| `us-credit-union`   | US     | USD      | RDC, Bill Pay, P2P, Card Controls, Mobile Deposit, Instant Payments        |
| `us-community-bank` | US     | USD      | RDC, Bill Pay, P2P, Card Controls, Wire Transfers, Direct Deposit          |
| `uk-digital-bank`   | UK     | GBP      | Open Banking, SCA, Confirmation of Payee, Multi-Currency, Instant Payments |
| `eu-neobank`        | EU     | EUR      | Open Banking, SCA, Multi-Currency, SEPA Instant, International Payments    |

### Manual Setup

If you prefer step-by-step control:

```bash
# 1. Install dependencies
npm install

# 2. Start Docker services
docker compose -f docker/docker-compose.single-tenant.yml up -d

# 3. Wait for services
until curl -sf http://localhost:54321/rest/v1/ > /dev/null; do sleep 2; done

# 4. Provision your institution
npx tsx scripts/provision-self-hosted.ts \
  --name "My Credit Union" \
  --admin-email admin@example.com \
  --template us-credit-union

# 5. Start the dev server
npm run dev
```

## 3. Configuration Options

### Provisioning Script (`provision-self-hosted.ts`)

Unlike `provision-tenant.ts` which creates new Supabase projects via the Management API, this script assumes you already have a Supabase instance and:

- Seeds the `firms` table with a single institution record
- Creates the admin user via Supabase Auth Admin API
- Generates a `.env.local` file with all settings

```bash
npx tsx scripts/provision-self-hosted.ts \
  --name "My Credit Union" \
  --admin-email admin@example.com \
  --template us-credit-union \
  --supabase-url http://localhost:54321 \
  --supabase-key <service-role-key> \
  --features "rdc,billPay,wires" \
  --admin-password "MySecurePassword123!" \
  --output-env .env.local \
  --dry-run
```

### Docker Compose

The single-tenant compose file (`docker/docker-compose.single-tenant.yml`) provides a complete stack:

```bash
# Start all services
docker compose -f docker/docker-compose.single-tenant.yml up -d

# View logs
docker compose -f docker/docker-compose.single-tenant.yml logs -f app

# Stop
docker compose -f docker/docker-compose.single-tenant.yml down

# Reset all data
docker compose -f docker/docker-compose.single-tenant.yml down -v
```

Services:

| Service         | URL                    | Description                    |
| --------------- | ---------------------- | ------------------------------ |
| Web App         | http://localhost:8080  | React frontend with hot reload |
| Supabase API    | http://localhost:54321 | PostgREST + GoTrue + Realtime  |
| Supabase Studio | http://localhost:54323 | Database admin UI              |
| Core Simulator  | http://localhost:9090  | Mock core banking endpoints    |

## 4. Environment Variables Reference

Set in `.env.local` (generated by the setup script):

### Single-Tenant Mode

| Variable                 | Required | Default          | Description                                         |
| ------------------------ | -------- | ---------------- | --------------------------------------------------- |
| `VITE_SINGLE_TENANT`     | Yes      | `false`          | Set to `true` to enable single-tenant mode          |
| `VITE_TENANT_ID`         | No       | `default`        | Tenant identifier (used in DB records)              |
| `VITE_TENANT_NAME`       | No       | `My Institution` | Display name shown in the UI                        |
| `VITE_SUBSCRIPTION_TIER` | No       | `enterprise`     | `trial`, `starter`, `professional`, `enterprise`    |
| `VITE_TENANT_REGION`     | No       | `us`             | `us`, `eu`, `uk`, `latam`, `apac`, `mena`, `africa` |
| `VITE_TENANT_COUNTRY`    | No       | `US`             | ISO 3166-1 alpha-2 country code                     |
| `VITE_DEFAULT_CURRENCY`  | No       | `USD`            | ISO 4217 currency code                              |
| `VITE_FEATURES`          | No       | all enabled      | Comma-separated feature flags                       |

### Backend Connection

| Variable                 | Required | Default    | Description                     |
| ------------------------ | -------- | ---------- | ------------------------------- |
| `VITE_SUPABASE_URL`      | Yes      |            | Supabase project URL            |
| `VITE_SUPABASE_ANON_KEY` | Yes      |            | Supabase anonymous key          |
| `VITE_CORE_SIM_URL`      | No       |            | Core banking simulator URL      |
| `VITE_DEMO_MODE`         | No       | `false`    | Use mock data (no real backend) |
| `VITE_BACKEND_PROVIDER`  | No       | `supabase` | `supabase` or `rest`            |

### Available Feature Flags

| Feature Key              | Description                                   |
| ------------------------ | --------------------------------------------- |
| `rdc`                    | Remote Deposit Capture (mobile check deposit) |
| `billPay`                | Bill payment service                          |
| `p2p`                    | Peer-to-peer payments                         |
| `cardControls`           | Card lock/unlock, spending limits             |
| `externalTransfers`      | Transfer to external accounts                 |
| `wires`                  | Wire transfers                                |
| `mobileDeposit`          | Mobile check deposit                          |
| `directDeposit`          | Direct deposit setup                          |
| `openBanking`            | Open Banking API access                       |
| `sca`                    | Strong Customer Authentication (EU/UK)        |
| `confirmationOfPayee`    | UK Confirmation of Payee                      |
| `multiCurrency`          | Multi-currency accounts                       |
| `internationalPayments`  | Cross-border payments                         |
| `internationalBillPay`   | International bill payment                    |
| `openBankingAggregation` | Account aggregation via Open Banking          |
| `aliasPayments`          | Pay by alias (email/phone)                    |
| `amlScreening`           | AML transaction screening                     |
| `instantPayments`        | FedNow / SEPA Instant / Faster Payments       |

If `VITE_FEATURES` is not set, all features are enabled (enterprise default). When set, only the listed features are enabled.

## 5. Production Deployment

### Build for Production

```bash
cd apps/web
npm run build
# Output in apps/web/dist/
```

### Docker Production

```bash
# Build production images
docker compose -f docker/docker-compose.single-tenant.yml build

# Start in detached mode
docker compose -f docker/docker-compose.single-tenant.yml up -d
```

### Cloud Deployment

Use the existing deployment scripts with single-tenant env vars:

```bash
# Set environment
export VITE_SINGLE_TENANT=true
export VITE_TENANT_NAME="My Credit Union"
export VITE_SUPABASE_URL=https://your-project.supabase.co
export VITE_SUPABASE_ANON_KEY=your-anon-key
# ... other vars from section 4

# AWS
./scripts/deploy.sh --platform aws --project my-cu-prod

# GCP
./scripts/deploy.sh --platform gcp --project my-cu-prod

# Azure
./scripts/deploy.sh --platform azure --project my-cu-prod
```

### Kubernetes

```bash
helm install fiducia helm/banking-platform/ \
  --set env.VITE_SINGLE_TENANT=true \
  --set env.VITE_TENANT_NAME="My Credit Union" \
  --set env.VITE_SUPABASE_URL=https://your-project.supabase.co \
  --set env.VITE_SUPABASE_ANON_KEY=your-anon-key \
  --set env.VITE_FEATURES="rdc,billPay,p2p,cardControls,externalTransfers"
```

### Connecting a Real Core Banking System

Once you are ready to go beyond the simulator:

1. Stop setting `VITE_DEMO_MODE=true`
2. Configure the appropriate adapter environment variables:
   - **CU\*Answers**: `CUANSWERS_API_URL`, `CUANSWERS_API_KEY`
   - **Symitar (SymXchange)**: `SYMITAR_API_URL`, `SYMITAR_CLIENT_CERT`
   - **Fineract**: `FINERACT_API_URL`, `FINERACT_API_KEY`
3. Restart the application
4. The adapter pattern auto-detects credentials and switches from mock to real

See `docs/INTEGRATION-CATALOG.md` for full adapter setup instructions.

## 6. Upgrading

```bash
# 1. Pull latest code
git pull origin main

# 2. Install dependencies
npm ci

# 3. Rebuild
npm run build

# 4. Restart services (migrations auto-apply via Docker)
docker compose -f docker/docker-compose.single-tenant.yml up -d

# 5. Verify
npm run validate
```

Your `.env.local`, database data, and user accounts persist across upgrades. Database migrations are applied automatically when the Docker containers start.

If you need to apply migrations manually (non-Docker):

```bash
npx supabase db push --db-url postgresql://postgres:postgres@localhost:54322/postgres
```

## 7. Backup & Restore

Uses the standard backup scripts included in the platform:

```bash
# Create a backup
./scripts/backup/backup-database.sh

# List available backups
ls -la backups/

# Restore from backup
./scripts/backup/restore-database.sh --file backups/latest.sql

# Verify backup integrity
./scripts/backup/verify-backup.sh
```

For production, set up automated backups:

```bash
# Add to crontab: daily backup at 2 AM
0 2 * * * /path/to/fiducia/scripts/backup/backup-database.sh >> /var/log/fiducia-backup.log 2>&1
```

If using Supabase Cloud, point-in-time recovery is available on Pro plans.

## 8. How Single-Tenant Mode Works

When `VITE_SINGLE_TENANT=true`, the `single-tenant.ts` module provides:

1. **`SINGLE_TENANT_CONFIG`** -- static configuration read from environment variables at build time
2. **`getSingleTenantFeatures()`** -- builds the feature flags from `VITE_FEATURES` env var (or enables all by default)
3. **`getSingleTenantContext()`** -- returns a complete `TenantContext` object without any database queries

The `TenantContext` provider checks `SINGLE_TENANT_MODE` and, when true, calls `getSingleTenantContext()` instead of querying the `firms` and `firm_users` tables. This eliminates per-request DB overhead.

### What's Different from Multi-Tenant

| Aspect            | Multi-Tenant                            | Single-Tenant                             |
| ----------------- | --------------------------------------- | ----------------------------------------- |
| Tenant context    | DB lookup per request                   | Environment variables                     |
| Provisioning      | Supabase Management API + control plane | `provision-self-hosted.ts` local seed     |
| Feature flags     | Per-tenant in `firms.features` column   | `VITE_FEATURES` env var                   |
| Subscription tier | Per-tenant in `firms.subscription_tier` | `VITE_SUBSCRIPTION_TIER` env var          |
| Docker Compose    | Base `docker-compose.yml`               | `docker/docker-compose.single-tenant.yml` |
| Scaling model     | Separate Supabase project per tenant    | Single Supabase project                   |
| Control plane     | Required                                | Not needed                                |
| Database schema   | Identical                               | Identical                                 |

### Same Security Model

RLS (Row Level Security) policies remain active in single-tenant mode. Every row still belongs to a `firm_id`, and PostgreSQL enforces isolation at the query level. This means:

- No code changes needed to switch between single and multi-tenant
- Data integrity constraints are always enforced
- Upgrading to multi-tenant later requires zero schema changes

## 9. FAQ

**Q: When should I use single-tenant vs multi-tenant?**

| Scenario                               | Recommended Mode                        |
| -------------------------------------- | --------------------------------------- |
| One institution, self-hosted           | Single-tenant                           |
| One institution, hosted by vendor      | Single-tenant or multi-tenant           |
| Multiple institutions, shared platform | Multi-tenant                            |
| Demo or evaluation                     | Demo mode (`./scripts/setup.sh --demo`) |

**Q: Is single-tenant less secure than multi-tenant?**

No. RLS policies still enforce data isolation. Single-tenant mode skips the overhead of looking up tenant config from the database on every request, but all security constraints remain in place.

**Q: Can I run multiple single-tenant instances?**

Yes. Each instance gets its own Supabase project and database. They are completely independent and can be managed separately.

**Q: Do I need a Supabase account?**

No. You can run Supabase locally via Docker (included in the setup). For production, you can use Supabase Cloud or self-host Supabase.

**Q: Can I migrate to multi-tenant later?**

Yes. The database schema is identical in both modes. To migrate:

1. Remove `VITE_SINGLE_TENANT=true` from your environment
2. Set up a control plane Supabase project
3. Register your existing institution in the `tenant_registry`
4. Use `provision-tenant.ts` for any new institutions

Your existing data, users, and configuration carry over with no changes.

**Q: What about the mobile app?**

The Flutter mobile app (`mobile/`) uses the same Supabase backend. Point it at your instance URL and build with `scripts/build-tenant-app.ts`.

**Q: How do I add more users?**

Log in as admin, go to Settings > User Management, and invite users by email. They will receive an invitation and can set their own password.

**Q: How do I change the institution name or features after setup?**

Edit `.env.local` and restart the dev server (or rebuild for production). For features, update the `VITE_FEATURES` variable. For the name, update `VITE_TENANT_NAME`.
