# Contributing to Fiducia

Thanks for your interest in contributing. This document covers the conventions and process for getting your changes merged.

## Getting Started

```bash
git clone https://github.com/danweis07/Fiducia.git && cd Fiducia
./scripts/setup.sh --demo
npm run dev
```

See the [README](README.md) for full setup options (demo mode, Docker full stack, Supabase CLI).

## Development Workflow

1. **Fork the repo** and create a branch from `main`
2. **Name your branch** using the convention: `feature/short-description`, `fix/short-description`, or `chore/short-description`
3. **Make your changes** — keep PRs focused on a single concern
4. **Validate before pushing:**
   ```bash
   npm run validate    # typecheck + lint + test + build
   ```
5. **Open a pull request** against `main`

## Pull Request Guidelines

- Keep PRs small and focused. One feature or fix per PR.
- Write a clear title and description. Explain _what_ changed and _why_.
- Include screenshots for UI changes.
- Add or update tests for new functionality.
- Make sure CI passes (lint, typecheck, unit tests, build).
- PRs require at least one approving review before merge.

## Commit Messages

Use clear, imperative-mood commit messages:

```
Add wire transfer dual-approval workflow
Fix ACH cutoff timezone handling for Pacific time
Update Symitar adapter to support SymXchange v2 endpoints
Remove deprecated card activation flow
```

Prefix with the area if helpful: `[adapters]`, `[i18n]`, `[admin]`, `[mobile]`, etc.

## Code Style

- **TypeScript** — strict mode is enabled. No `any` unless unavoidable.
- **React** — functional components with hooks. No class components.
- **Styling** — Tailwind CSS utility classes. Use the existing design tokens in `tailwind.config.ts`.
- **UI primitives** — use components from `src/components/ui/` (Radix-based, shadcn/ui pattern).
- **Imports** — use the `@/` path alias (e.g., `import { Button } from "@/components/ui/button"`).
- **Formatting** — ESLint enforces style. Run `npm run lint:fix` to auto-fix.
- **Tests** — Vitest for unit tests, Playwright for E2E. Place unit tests in `__tests__/` directories or colocate as `*.test.ts(x)`.

## Testing Requirements

All PRs must pass `npm run validate` which includes tests. Coverage thresholds are enforced:

| Metric     | Threshold |
| ---------- | --------- |
| Statements | 50%       |
| Lines      | 50%       |
| Branches   | 40%       |
| Functions  | 40%       |

These thresholds are configured in `vitest.config.ts`. `src/components/ui/**` (shadcn primitives) is excluded from coverage.

**What to test:**

- New hooks: test with `renderHook` + mocked gateway (see `src/hooks/__tests__/useAccounts.test.ts`)
- New pages/components: test rendering and key interactions with Testing Library
- New gateway actions: add mock data in `src/lib/demo-data/` and verify with a recipe script
- Bug fixes: add a regression test that would have caught the bug

See `docs/TESTING_PATTERNS.md` for detailed patterns and examples.

## Demo Mode & Scaffolding

The fastest way to develop new features is in demo mode:

```bash
# Scaffold a new page wired to mock data
./scripts/generate-app.sh <template> [PageName]

# Available templates: account-dashboard, payment-form, card-manager,
# loan-calculator, spending-dashboard, custom

# Explore available gateway actions and data shapes
npx tsx scripts/recipes/list-all-actions.ts
npx tsx scripts/recipes/accounts-overview.ts
```

See `docs/QUICKSTART-DEMO.md` for the full guide.

## Adding a New Integration Adapter

Adapters follow a consistent pattern. Every adapter must:

1. Define a TypeScript interface in `src/types/`
2. Implement a mock/demo version in `src/lib/demo-data/`
3. Implement the real adapter (if applicable)
4. Register in the adapter registry so it can be selected via environment variable
5. Fall back gracefully to the mock when no credentials are configured

Use the "New Adapter" issue template to propose one before starting work.

## Adding Translations (i18n)

Translations live in `src/lib/i18n/locales/<lang-code>.json`. To add or update:

1. Edit the relevant locale JSON file
2. Run `npm run i18n:check` to verify all keys are present across languages
3. Run `npm run i18n:types` to regenerate TypeScript types

English (`en.json`) is the source of truth. All other locales should match its key structure.

## Database Migrations

Migrations are in `supabase/migrations/`. To add one:

1. Create a new SQL file with the naming convention: `YYYYMMDD_description.sql`
2. Write idempotent SQL (use `IF NOT EXISTS`, `CREATE OR REPLACE`, etc.)
3. Include both the migration and any necessary seed data
4. Test locally with `docker compose up` (migrations auto-apply)

## Reporting Bugs

Use the [Bug Report](https://github.com/danweis07/Fiducia/issues/new?template=bug_report.yml) issue template.

## Requesting Features

Use the [Feature Request](https://github.com/danweis07/Fiducia/issues/new?template=feature_request.yml) issue template.

## Security Vulnerabilities

**Do NOT open a public issue.** See [SECURITY.md](SECURITY.md) for responsible disclosure instructions.

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
