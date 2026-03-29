# CLAUDE.md — AI Agent Quick Reference

## Project

Fiducia is a multi-tenant digital banking platform for credit unions and community banks. React 19 + Supabase + TypeScript + Tailwind CSS. Adapter pattern for swappable core banking integrations. Monorepo with npm workspaces.

## Key Commands

```bash
npm run dev              # Start dev server (http://localhost:8080)
npm run validate         # Lint + typecheck + test + build (run before every commit)
npm run test             # Vitest watch mode
npm run test:run         # Vitest single run
npm run test:e2e         # Playwright E2E tests
npm run lint:fix         # Auto-fix ESLint issues
npm run format           # Prettier formatting
npm run typecheck        # TypeScript strict check
npm run i18n:check       # Verify translation completeness (33 languages)
```

All commands can be run from the repo root (they delegate to the `@fiducia/web` workspace) or from `apps/web/` directly.

### Demo & Scaffolding

```bash
./scripts/setup.sh --demo                     # Full app with mock data, no backend
./scripts/generate-app.sh <template> [Name]   # Scaffold a new page from template
npx tsx scripts/recipes/list-all-actions.ts    # List all gateway actions
npx tsx scripts/recipes/accounts-overview.ts   # See account data shapes
```

Templates: `account-dashboard`, `payment-form`, `card-manager`, `loan-calculator`, `spending-dashboard`, `custom`

See `docs/QUICKSTART-DEMO.md` for the full 5-minute guide.

## Directory Map

```
apps/web/                   # React frontend (Vite + TypeScript)
├── src/
│   ├── pages/              # Route page components (60+), one file per page
│   ├── components/
│   │   ├── ui/             # Radix/shadcn primitives (button, dialog, form, etc.)
│   │   ├── banking/        # Domain components (account cards, transaction lists)
│   │   ├── admin/          # Admin portal components
│   │   ├── sdui/           # Server-Driven UI renderers
│   │   └── common/         # Shared (Spinner, ErrorBoundary, SkipLink)
│   ├── contexts/           # React context providers (Auth, Theme, Tenant)
│   ├── hooks/              # Custom React hooks
│   ├── lib/
│   │   ├── gateway/        # RPC action handlers (accounts, payments, compliance, etc.)
│   │   ├── backend/        # Backend provider abstraction (Supabase, REST, Realtime)
│   │   ├── demo-data/      # Mock data and demo adapter implementations
│   │   ├── i18n/           # i18next setup, 33 locales, 6 namespaces per locale
│   │   └── services/       # Shared service utilities
│   ├── integrations/       # Supabase client & auto-generated types
│   ├── routes/             # Route definitions (public, banking, admin)
│   ├── services/           # Domain service layer
│   ├── types/              # TypeScript domain types (20+ files)
│   └── test/               # Test setup & utilities
├── e2e/                    # Playwright E2E test specs
├── vite.config.ts          # Vite build config
├── vitest.config.ts        # Vitest test config
├── tsconfig.json           # TypeScript config
├── tailwind.config.ts      # Tailwind CSS config
└── eslint.config.js        # ESLint config

supabase/
├── migrations/             # 41 SQL migrations (schema + seed data)
└── functions/              # 11 Deno edge functions (gateway, SSO, OAuth, events)

core-simulator/             # Express.js mock core banking server (port 9090)
scripts/                    # Setup, deploy, provisioning, compliance, backup
docs/                       # Developer guides (architecture, QA, production checklist)
deploy/                     # Cloud configs (AWS, GCP, Azure, Cloudflare)
helm/                       # Kubernetes Helm chart
monitoring/                 # Prometheus, Grafana, Alertmanager configs
mobile/                     # Flutter iOS/Android app
```

## Architecture Quick Reference

- **Multi-tenancy:** Every DB row belongs to a tenant. Row Level Security (RLS) enforces isolation at PostgreSQL level.
- **Adapter pattern:** External integrations (core banking, KYC, payments, AI) auto-detect credentials via env vars. Missing credentials → mock fallback. No API keys needed for demo mode.
- **API Gateway:** Single RPC endpoint at `/functions/v1/gateway`. Actions like `accounts.list`, `payments.transfer`. Handlers in `apps/web/src/lib/gateway/`.
- **Backend provider:** Frontend uses `apps/web/src/lib/backend/` abstraction — can swap between Supabase, REST, or Realtime providers.
- **Demo mode:** `VITE_DEMO_MODE=true` enables built-in sample data. No backend required.

## Code Conventions

- **TypeScript strict mode** — no `any` unless unavoidable
- **Functional React** — hooks only, no class components
- **Styling** — Tailwind CSS utility classes, design tokens in `apps/web/tailwind.config.ts`, design system config in `apps/web/src/lib/theme/`
- **UI primitives** — use `apps/web/src/components/ui/` (Radix + shadcn/ui pattern)
- **Imports** — use `@/` path alias: `import { Button } from "@/components/ui/button"`
- **Forms** — react-hook-form + Zod schemas for validation
- **State** — TanStack React Query for server state, React Context for auth/theme

## Testing Conventions

- **Unit tests:** Vitest + Testing Library. Place in `__tests__/` dirs or colocate as `*.test.ts(x)`
- **E2E tests:** Playwright specs in `apps/web/e2e/`. Runs Chromium, Firefox, WebKit, mobile Chrome
- **Coverage thresholds:** 50% statements/lines, 40% branches/functions
- **Load tests:** k6 scripts in `tests/load/` and `load-tests/k6/`

## Common Tasks

**Add a new page:**

1. Create component in `apps/web/src/pages/YourPage.tsx`
2. Add route in the appropriate routes file (`apps/web/src/routes/bankingRoutes.tsx`, `adminRoutes.tsx`, or `publicRoutes.tsx`)
3. Use `React.lazy()` for the import in the routes file

**Add an integration adapter:**

1. Define TypeScript interface in `apps/web/src/types/`
2. Implement mock version in `apps/web/src/lib/demo-data/`
3. Implement real adapter
4. Register in adapter registry (auto-detected via env var)
5. Ensure graceful fallback to mock when no credentials configured

**Add a translation:**

1. Edit locale JSON in `apps/web/src/lib/i18n/locales/<lang>/`
2. English (`en/`) is source of truth — 6 namespaces: common, banking, settings, errors, admin, public
3. Run `npm run i18n:check` to verify completeness
4. Run `npm run i18n:types` to regenerate TypeScript types

**Add a database migration:**

1. Create `supabase/migrations/YYYYMMDD_description.sql`
2. Write idempotent SQL (`IF NOT EXISTS`, `CREATE OR REPLACE`)
3. Test with `docker compose up` (migrations auto-apply)

## Design System

The BrandingEditor (`apps/web/src/pages/admin/BrandingEditor.tsx`) is a full token-based design system configurator controlling ~70 CSS design tokens across website, banking web app, and mobile app.

### Architecture

```
Admin saves DesignSystemConfig
  → gateway "admin.designSystem.update"
  → banking_tenant_theme.design_system (JSONB)

User loads app
  → useSiteConfig() fetches "config.theme"
  → ThemeContext applies all CSS variables to :root
  → Tailwind classes consume CSS variables automatically
  → SDUI components inherit via CSS — no changes needed
```

### Key Files

```
apps/web/src/types/admin.ts           # DesignSystemConfig, ColorPalette, etc.
apps/web/src/lib/theme/
├── color-utils.ts                    # hex ↔ HSL conversion
├── color-derivation.ts               # Auto-derive full palettes from 1-2 colors
├── apply-design-system.ts            # Apply all CSS vars to :root
├── presets.ts                        # 5 preset configs (Classic/Modern/Compact/Warmth/Professional)
├── font-loader.ts                    # Google Fonts dynamic loading
└── index.ts                          # Re-exports + theme types
apps/web/src/pages/admin/
├── BrandingEditor.tsx                # Main editor (Easy/Advanced mode tabs)
└── branding/                         # Sub-components
    ├── EasyModePanel.tsx             # Preset picker + brand color + logo
    ├── AdvancedModePanel.tsx         # Full token-level controls
    ├── ColorPickerField.tsx          # Hex ↔ HSL color picker
    ├── ColorPaletteSection.tsx       # Grid of color pickers
    ├── LogoSection.tsx               # 4 logo upload zones
    ├── TypographySection.tsx         # Fonts, weights, scale
    ├── SurfacesSection.tsx           # Radius, elevation, button shape, layout
    ├── GradientSection.tsx           # Hero/card/sidebar gradients
    ├── ChannelOverridesSection.tsx   # Per-channel branding overrides
    └── LivePreview.tsx               # Real-time preview panel
```

### Token Categories

| Category          | Tokens  | What It Controls                         |
| ----------------- | ------- | ---------------------------------------- |
| Brand Colors      | 6 pairs | Primary, secondary, accent + foregrounds |
| Surface Colors    | 4 pairs | Background, card, popover, muted         |
| Feedback/Utility  | 5       | Destructive, border, input, ring         |
| Sidebar           | 8       | Full sidebar palette                     |
| Semantic          | 12      | Risk levels (4), status colors (4)       |
| Neutrals          | 9       | Slate scale + gold highlights            |
| Typography        | 5       | Heading/body font, weights, scale        |
| Surfaces          | 4       | Radius, elevation, button shape, layout  |
| Gradients         | 3       | Hero, card highlight, sidebar            |
| Logos             | 4       | Primary, mark, dark variant, footer      |
| Channel Overrides | N       | Per-channel color/surface/logo overrides |
| Custom CSS        | 1       | Raw CSS escape hatch                     |

### Easy Mode vs Advanced Mode

- **Easy Mode**: Pick a preset → override primary/accent color → upload logo → done. `deriveFullPalette()` auto-generates the complete palette for both light and dark modes.
- **Advanced Mode**: Full control over every token. Collapsible sections for each category.

### Modify design tokens

1. Add the token to `DesignSystemConfig` in `apps/web/src/types/admin.ts`
2. Add CSS variable application in `apps/web/src/lib/theme/apply-design-system.ts`
3. Add to presets in `apps/web/src/lib/theme/presets.ts`
4. Add UI control in the appropriate section component
5. Add tests in the corresponding `__tests__/` directory

## Do Not Edit

- `apps/web/src/integrations/supabase/types.ts` — auto-generated from Supabase schema
- `apps/web/src/lib/i18n/i18n-resources.d.ts` — auto-generated by `npm run i18n:types`
- Applied migration files in `supabase/migrations/` — create new migrations instead
- `node_modules/`, `dist/`, `.env.local`

## Environment

- Node.js 20+ (`.nvmrc` included)
- Demo mode: `./scripts/setup.sh --demo` → `npm run dev`
- Full stack: `docker compose up` (React + Supabase + Core Simulator)
- Always run `npm run validate` before committing
