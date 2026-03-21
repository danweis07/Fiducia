# Demo Recipes

Standalone scripts that exercise the Fiducia demo-data layer **without starting the full app**. Each recipe imports handlers directly from `src/lib/demo-data/` and prints realistic JSON responses, so you can see exact data shapes, explore the gateway action catalogue, and prototype new features.

## Quick start

```bash
# Run any recipe with tsx (already in devDependencies)
npx tsx scripts/recipes/accounts-overview.ts
npx tsx scripts/recipes/payments-and-transfers.ts
npx tsx scripts/recipes/cards-and-loans.ts
npx tsx scripts/recipes/financial-insights.ts
npx tsx scripts/recipes/admin-portal.ts
npx tsx scripts/recipes/list-all-actions.ts
```

## What each recipe shows

| Recipe                   | Gateway actions exercised                                                               |
| ------------------------ | --------------------------------------------------------------------------------------- |
| `accounts-overview`      | `accounts.list`, `accounts.get`, `accounts.transactions`, `accounts.summary`            |
| `payments-and-transfers` | `payments.bills`, `payments.billpay.create`, `transfers.internal`, `payments.wire.send` |
| `cards-and-loans`        | `cards.list`, `cards.lock`, `loans.list`, `loans.payment-schedule`                      |
| `financial-insights`     | `financial.spending`, `financial.merchants`, `financial.offers`, `ai.insights`          |
| `admin-portal`           | `admin.users`, `admin.accounts`, `admin.audit-log`, `admin.integrations`                |
| `list-all-actions`       | Prints every registered demo action name                                                |

## Using recipes to prototype

To add a new gateway action, start by adding a handler in `src/lib/demo-data/`, then create (or extend) a recipe script to verify the response shape before wiring up hooks and UI.
