# White-Label Deployment Guide

Deploy Fiducia as a branded digital banking platform for a single credit union or community bank. This guide covers everything from initial setup to going live.

---

## 1. Overview

Fiducia is a multi-tenant digital banking platform (React 19 + Supabase + TypeScript). "White-labeling" means deploying a fully branded instance for one institution: your name, your colors, your logo, your feature set. End users never see "Fiducia" -- they see your institution's brand.

The platform supports two branding layers:

- **Build-time defaults** in `apps/web/src/lib/tenant.config.ts` -- hardcoded into the bundle
- **Runtime overrides** via the admin BrandingEditor -- persisted to the database, applied dynamically

Both layers work together: `tenant.config.ts` provides fallbacks, and the BrandingEditor lets admins tweak branding without redeploying.

---

## 2. Prerequisites

| Requirement | Version | Notes                          |
| ----------- | ------- | ------------------------------ |
| Node.js     | 20+     | `.nvmrc` included              |
| npm         | 9+      | Comes with Node.js             |
| Docker      | 20+     | Docker Compose V2 required     |
| Disk space  | 2 GB+   | For Docker images and database |
| RAM         | 4 GB+   | 8 GB recommended               |

For production you will also need:

- A Supabase Cloud project (or self-hosted Supabase instance)
- A domain name with TLS certificate
- A core banking system connection (CU\*Answers, Symitar, Fineract, etc.) -- or use the built-in simulator

---

## 3. Quick Start (Demo Mode)

Get a fully functional demo running in under 5 minutes with no backend:

```bash
# Clone and install
git clone <repo-url> && cd Fiducia
npm install

# Start in demo mode (mock data, no database needed)
./scripts/setup.sh --demo
npm run dev
# Open http://localhost:8080
```

Demo mode uses built-in sample data. All features work, but nothing persists to a real database. This is the fastest way to evaluate the platform before customizing.

For a single-tenant deployment with a real database, use the setup script:

```bash
./scripts/single-tenant-setup.sh \
  --name "Arizona Federal Credit Union" \
  --admin-email "admin@azfcu.org" \
  --template us-credit-union
```

See `docs/SINGLE-TENANT-DEPLOYMENT.md` for full details on templates and options.

---

## 4. Configuration

### 4a. Institution Defaults (`tenant.config.ts`)

The single most important file for white-labeling is:

```
apps/web/src/lib/tenant.config.ts
```

This file contains every institution-specific default: name, phone number, address, branding colors, business info, legal disclosures. Edit it to match your institution:

```typescript
// apps/web/src/lib/tenant.config.ts
export const tenantConfig: TenantConfig = {
  // Identity
  name: "Arizona Federal Credit Union",
  shortName: "AZ Federal",
  legalName: "Arizona Federal Credit Union, Inc.",
  tagline: "Your financial partner since 1936",
  foundedYear: 1936,
  routingNumber: "322172496",
  nmlsId: "401726",

  // Contact
  phone: "+16025551234",
  phoneFormatted: "(602) 555-1234",
  fraudPhone: "+18005553728",
  fraudPhoneFormatted: "(800) 555-3728",
  email: "support@azfcu.org",
  supportEmail: "support@azfcu.org",

  // Address
  streetAddress: "1234 Camelback Rd",
  city: "Phoenix",
  state: "Arizona",
  stateAbbr: "AZ",
  postalCode: "85016",
  country: "US",

  // Online presence
  websiteUrl: "https://azfcu.org",
  appStoreUrl: "https://apps.apple.com/app/azfcu/id1234567890",
  playStoreUrl: "https://play.google.com/store/apps/details?id=org.azfcu.app",

  // Branding
  logoUrl: "/assets/azfcu-logo.svg",
  faviconUrl: "/assets/azfcu-favicon.ico",
  primaryColor: "#1B4D3E",
  accentColor: "#D4AF37",

  // Business info
  memberCount: "95,000+",
  branchCount: 12,
  totalAssets: "$1.8B",
  employeeCount: "450+",
  serviceArea: "Maricopa and Pinal counties, Arizona",
  eligibility: "Anyone who lives, works, or worships in Maricopa or Pinal County",

  // Hours
  phoneHours: "Mon-Fri 7am-6pm MST, Sat 9am-1pm MST",
  branchHours: "Mon-Fri 9am-5pm, Sat 9am-12pm",

  // Legal
  fdicMember: false,
  ncuaMember: true,
  equalHousingLender: true,
};
```

Every public-facing page (About, Contact, Rates, Footer, SEO metadata) pulls from this config. Change it once, and the entire app updates.

### 4b. Admin BrandingEditor (Runtime)

For ongoing branding changes without redeployment, use the admin BrandingEditor:

1. Log in as an admin user
2. Navigate to **Admin > Branding**
3. Adjust colors (primary, secondary, accent), upload a logo, choose a font family, select a layout theme (Modern / Classic / Minimal), and add custom CSS
4. Click **Save & Publish** -- changes persist to the database and take effect immediately

The BrandingEditor saves via the `admin.branding.update` gateway action and overrides `tenant.config.ts` defaults at runtime.

### 4c. Environment Variables

Set backend connection and mode in `.env.local`:

```bash
# Single-tenant mode
VITE_SINGLE_TENANT=true
VITE_TENANT_NAME="Arizona Federal Credit Union"
VITE_TENANT_REGION=us
VITE_TENANT_COUNTRY=US
VITE_DEFAULT_CURRENCY=USD

# Backend
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Feature flags (comma-separated; omit to enable all)
VITE_FEATURES=rdc,billPay,cardControls,externalTransfers,mobileDeposit,instantPayments
```

See `docs/SINGLE-TENANT-DEPLOYMENT.md` section 4 for the full environment variable reference.

---

## 5. Branding

### Logo

Place your logo in `apps/web/public/assets/` and set the path in `tenant.config.ts`:

```typescript
logoUrl: "/assets/your-logo.svg",
faviconUrl: "/assets/your-favicon.ico",
```

Alternatively, upload the logo through the admin BrandingEditor (it stores the URL in the database).

Recommended formats: SVG for the logo (scales cleanly), ICO or PNG for the favicon.

### Colors

Two places to set colors:

1. **`tenant.config.ts`** -- `primaryColor` and `accentColor` (build-time defaults)
2. **BrandingEditor** -- primary, secondary, and accent colors (runtime overrides)

The BrandingEditor also shows a live preview of how the colors look in the app (light and dark mode).

### Fonts

The BrandingEditor supports these font families: Inter, Roboto, Open Sans, Poppins, DM Sans, IBM Plex Sans. The selected font is applied globally via inline styles.

To add a custom font, load it in `apps/web/index.html` and add it to the `fontOptions` array in `apps/web/src/pages/admin/BrandingEditor.tsx`.

### Layout Themes

Three built-in themes selectable from the BrandingEditor:

| Theme       | Description                                  |
| ----------- | -------------------------------------------- |
| **Modern**  | Clean lines, rounded cards, generous spacing |
| **Classic** | Traditional banking look with sharp edges    |
| **Minimal** | Stripped-down, content-focused design        |

---

## 6. Content (CMS)

Public-facing pages (About Us, Help, Rates, etc.) use a two-tier content model:

### CMS-Driven Content

Pages fetch content from the CMS via the `useCMSContent` hook:

```typescript
import { useCMSContent, useCMSBanners, useCMSAnnouncements } from "@/hooks/useCMSContent";

// Fetch all published content for web
const { data: content } = useCMSContent({ channel: "web_portal", contentType: "page" });

// Fetch banners
const { data: banners } = useCMSBanners();

// Fetch announcements
const { data: announcements } = useCMSAnnouncements();
```

Content is fetched via the `gateway.cms.listContent` action, filtered by channel (`web_portal` or `mobile`), content type, and publication status. Results are cached for 5 minutes.

### Static Fallbacks

When no CMS content exists for a given page, the app falls back to values from `tenant.config.ts`. This means the app always renders something meaningful even before you populate the CMS.

### Adding/Editing CMS Content

1. Log in as an admin
2. Navigate to **Admin > Content Management**
3. Create content items with:
   - A **slug** (e.g., `about-us`, `holiday-hours`)
   - A **content type** (page, banner, announcement)
   - A **channel** (web_portal, mobile, email)
   - A **body** (Markdown or HTML)
   - A **publish date** (content is only shown after this date)

Content published to the `web_portal` channel appears on the web app. Content published to the `mobile` channel appears in the Flutter app. Both platforms consume the same CMS API.

---

## 7. Feature Stripping

### Feature Flags

Control which banking features are available by editing `DEFAULT_FEATURES` in `apps/web/src/contexts/TenantContext.tsx`:

```typescript
// apps/web/src/contexts/TenantContext.tsx
export const DEFAULT_FEATURES: TenantFeatures = {
  rdc: true, // Remote Deposit Capture
  billPay: true, // Bill payments
  p2p: false, // Peer-to-peer payments
  cardControls: true, // Card lock/unlock, spending limits
  externalTransfers: true, // External account transfers
  wires: false, // Wire transfers
  mobileDeposit: true, // Mobile check deposit
  directDeposit: false, // Direct deposit setup
  openBanking: false, // Open Banking APIs
  sca: false, // Strong Customer Authentication (EU/UK)
  confirmationOfPayee: false, // UK CoP
  multiCurrency: false, // Multi-currency accounts
  internationalPayments: false,
  internationalBillPay: false,
  openBankingAggregation: false,
  aliasPayments: false, // Pay by email/phone
  amlScreening: false, // AML transaction screening
  instantPayments: false, // FedNow / SEPA Instant / Faster Payments
};
```

Set a feature to `false` to hide it from the UI. The corresponding menu items, pages, and action buttons will not render.

You can also set features via the `VITE_FEATURES` environment variable (comma-separated list of enabled features). When set, only the listed features are enabled; all others default to `false`.

### International Feature Exclusion

If your institution operates only in the US, you can exclude international adapters entirely from the build. The adapter registry (`supabase/functions/_shared/adapters/registry.ts`) auto-detects which adapters have credentials configured. Adapters without credentials fall back to mocks.

For a lighter build, unused adapter code is tree-shaken during the Vite production build. Features like `openBanking`, `sca`, `confirmationOfPayee`, and `multiCurrency` pull in no code when disabled.

---

## 8. Database

### Running Migrations

Migrations live in `supabase/migrations/` (41 SQL files). They run automatically when Docker containers start.

For manual migration:

```bash
# Via Supabase CLI
npx supabase db push --db-url postgresql://postgres:postgres@localhost:54322/postgres

# Or via Docker Compose (auto-applies on container start)
docker compose -f docker/docker-compose.single-tenant.yml up -d
```

### Seed Data

The provisioning script seeds the database with your institution's record:

```bash
npx tsx scripts/provision-self-hosted.ts \
  --name "Arizona Federal Credit Union" \
  --admin-email admin@azfcu.org \
  --template us-credit-union
```

This creates a row in the `firms` table, an admin user, and generates `.env.local`.

### Writing New Migrations

If you need to extend the schema:

1. Create `supabase/migrations/YYYYMMDD_description.sql`
2. Write idempotent SQL (`IF NOT EXISTS`, `CREATE OR REPLACE`)
3. Restart Docker containers or run `npx supabase db push`

Do not edit existing applied migration files. Always create new ones.

---

## 9. Deployment

Pre-built deployment configs exist for all major cloud providers in the `deploy/` directory:

| Provider   | Config Location      | Notes                   |
| ---------- | -------------------- | ----------------------- |
| AWS        | `deploy/aws/`        | ECS, CloudFront, RDS    |
| GCP        | `deploy/gcp/`        | Cloud Run, Cloud CDN    |
| Azure      | `deploy/azure/`      | App Service, Front Door |
| Cloudflare | `deploy/cloudflare/` | Pages, Workers          |

### Build and Deploy

```bash
# Build production bundle
npm run build
# Output: apps/web/dist/

# Deploy via script
./scripts/deploy.sh --platform aws --project azfcu-prod

# Or via Kubernetes
helm install fiducia helm/banking-platform/ \
  --set env.VITE_SINGLE_TENANT=true \
  --set env.VITE_TENANT_NAME="Arizona Federal Credit Union" \
  --set env.VITE_SUPABASE_URL=https://your-project.supabase.co \
  --set env.VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Monitoring

Production monitoring configs are in `monitoring/`:

- **Prometheus** -- metrics collection
- **Grafana** -- dashboards
- **Alertmanager** -- alert routing

See `docs/PRODUCTION-CHECKLIST.md` for the full production readiness checklist.

---

## 10. Mobile App

The Flutter mobile app lives in `mobile/` and connects to the same Supabase backend as the web app.

### Building for Your Institution

```bash
npx tsx scripts/build-tenant-app.ts \
  --name "Arizona Federal Credit Union" \
  --bundle-id org.azfcu.app \
  --supabase-url https://your-project.supabase.co \
  --supabase-anon-key your-anon-key
```

### Shared Content Contract

Web and mobile share the same CMS content types defined in `packages/content-contract/`. Both platforms consume the same `gateway.cms.listContent` API and render the same content items (announcements, banners, product offers, branch data, rate sheets).

To generate Dart types for the mobile app from the shared TypeScript definitions, use `openapi-generator` or `json_serializable` against the types in `packages/content-contract/src/index.ts`.

### Content Channels

When creating CMS content, set the `channels` field to control where content appears:

- `web_portal` -- web app only
- `mobile` -- mobile app only
- Both -- appears on both platforms

---

## 11. Go-Live Checklist

Use this checklist when deploying a new institution:

### Identity and Branding

- [ ] Edit `apps/web/src/lib/tenant.config.ts` with institution name, contact info, address, legal details
- [ ] Set `primaryColor` and `accentColor` to match institution brand guidelines
- [ ] Place logo SVG and favicon in `apps/web/public/assets/`
- [ ] Set `logoUrl` and `faviconUrl` in `tenant.config.ts`
- [ ] Update `apps/web/index.html` page title and meta description
- [ ] Verify BrandingEditor preview looks correct (Admin > Branding)

### Features

- [ ] Review `DEFAULT_FEATURES` in `apps/web/src/contexts/TenantContext.tsx`
- [ ] Disable features the institution does not offer (set to `false`)
- [ ] Set `VITE_FEATURES` in `.env.local` for production

### Content

- [ ] Populate CMS with institution-specific pages (About, Help, Contact, Disclosures)
- [ ] Create at least one welcome announcement for the dashboard
- [ ] Add branch/ATM location data
- [ ] Add current rate sheet data

### Backend

- [ ] Provision Supabase project (cloud or self-hosted)
- [ ] Run `scripts/provision-self-hosted.ts` to seed institution data
- [ ] Configure core banking adapter environment variables (or use simulator for testing)
- [ ] Verify database migrations applied cleanly

### Security

- [ ] Set strong admin password (not the default)
- [ ] Configure TLS/HTTPS on your domain
- [ ] Review `docs/PRODUCTION-CHECKLIST.md` security section
- [ ] Verify RLS policies are active (`SELECT * FROM pg_policies`)

### Deployment

- [ ] Run `npm run validate` (lint + typecheck + test + build)
- [ ] Build production bundle (`npm run build`)
- [ ] Deploy to target cloud provider (see `deploy/` configs)
- [ ] Set up monitoring (Prometheus + Grafana from `monitoring/`)
- [ ] Set up automated database backups
- [ ] Verify the app loads at the production URL
- [ ] Test login, account view, transfer, and bill pay flows end-to-end

### Mobile (if applicable)

- [ ] Build Flutter app with `scripts/build-tenant-app.ts`
- [ ] Point app at production Supabase URL
- [ ] Submit to App Store and Google Play
- [ ] Verify CMS content appears on both web and mobile
