# UI Refactoring Analysis

> Generated: 2026-03-17
> Scope: Full UI layer review of the Fiducia digital banking platform

## Overview

Analysis of the React 19 + TypeScript + Vite codebase covering 130+ components, 80+ hooks, 70+ routes, and 95 lazy-loaded pages. The UI architecture is solid overall — good use of Radix UI primitives, Tailwind CSS theming, React Query for server state, and a clean SDUI system. However, several refactoring opportunities would significantly improve developer experience and maintainability.

---

## Findings

### 1. Monolithic Route Configuration in App.tsx (P0 — HIGH impact)

**Problem:** `src/App.tsx` is 270 lines with 95 lazy imports and 70+ route definitions. The `<ProtectedRoute><ErrorBoundary>...</ErrorBoundary></ProtectedRoute>` wrapper pattern is repeated 43 times.

**Recommendation:**

- Extract routes into domain-specific files (`src/routes/publicRoutes.tsx`, `bankingRoutes.tsx`, `businessRoutes.tsx`, `adminRoutes.tsx`)
- Create a `protectedRoute()` helper to eliminate wrapper boilerplate
- Use React Router layout routes to share `AppShell` across protected pages
- Target: reduce App.tsx from 270 to ~30 lines

### 2. Large Page Components Without Form Abstraction (P0 — HIGH impact)

**Problem:** The largest pages are monolithic (AgentPolicies: 699 lines, Settings: 632, Transfer: 610). `react-hook-form` and `zod` are installed but zero pages use them — all forms are hand-rolled with raw `useState` (Transfer.tsx has 12 useState calls for form fields alone).

**Recommendation:**

- Adopt `react-hook-form` + `zod` schemas for all forms (libraries already in package.json)
- Extract reusable form patterns: `TransferForm`, `PaymentForm`, `SettingsForm`
- Break 500+ line pages into sub-components (e.g., `TransferForm` + `TransferConfirmation` + `TransferReceipt`)

### 3. God Context in TenantContext (P1 — MEDIUM impact)

**Problem:** `src/contexts/TenantContext.tsx` combines auth state, auth actions, tenant state, permission helpers, and refresh logic into one context with 7 `useState` calls and 22 exposed values. Any change re-renders all consumers.

**Recommendation:**

- Split into `AuthContext` (user/session/auth actions) and `TenantContext` (tenant/permissions/features)
- Keep `useAuth()` and `useTenant()` hooks as the public API for a non-breaking change

### 4. Duplicate Toast Systems (P1 — MEDIUM impact)

**Problem:** Both `@radix-ui/react-toast` (`<Toaster />`) and `sonner` (`<Sonner />`) are mounted in App.tsx simultaneously. All pages import `useToast` from `@/hooks/use-toast`. Sonner is never used by any page component.

**Recommendation:**

- Remove `sonner` dependency and `<Sonner />` from App.tsx
- Delete `src/components/ui/sonner.tsx`
- Standardize on `useToast` from `@/hooks/use-toast`

### 5. Empty `components/banking/` Directory (P2 — MEDIUM impact)

**Problem:** `src/components/banking/` contains only `.gitkeep`. Banking-specific UI (transaction rows, account cards, balance displays) is scattered across individual page files with significant duplication.

**Recommendation:**

- Extract shared banking UI: `AccountCard`, `TransactionList`, `BalanceDisplay`, `PaymentStepper`
- These patterns repeat across Dashboard, Accounts, AccountDetail, Transfer, BillPay, and P2P pages

### 6. No Shared Layout Route for Protected Pages (P2 — MEDIUM impact)

**Problem:** Every protected banking route wraps individually in `<ProtectedRoute><ErrorBoundary>`, and each page renders `AppShell` internally. This causes the shell to re-mount on every navigation and produces navigation flicker.

**Recommendation:**

- Use React Router layout routes with `<Outlet />`:
  ```tsx
  <Route
    element={
      <ProtectedRoute>
        <AppShell />
      </ProtectedRoute>
    }
  >
    <Route path="/dashboard" element={<Dashboard />} />
    ...
  </Route>
  ```
- Gives persistent layout, smoother transitions, and eliminates per-route wrappers

### 7. SDUI Widget Naming Inconsistency (P3 — LOW impact)

**Problem:** Some SDUI widget files have a "Widget" suffix (`CreditScoreWidget`) while others don't (`UpcomingBills`, `CTAButton`). Inconsistent naming.

**Recommendation:** Standardize — either all widgets get a `Widget` suffix or none do.

---

## Priority Matrix

| Priority | Refactoring                                           | Effort | Impact |
| -------- | ----------------------------------------------------- | ------ | ------ |
| P0       | Split App.tsx routes + layout routes                  | Medium | High   |
| P0       | Break up large pages + adopt react-hook-form          | High   | High   |
| P1       | Split TenantContext into Auth + Tenant                | Low    | Medium |
| P1       | Remove duplicate toast system (sonner)                | Low    | Medium |
| P2       | Populate `components/banking/` with shared components | Medium | Medium |
| P2       | Use layout routes for persistent AppShell             | Medium | Medium |
| P3       | Standardize SDUI widget naming                        | Low    | Low    |

## Architecture Summary

| Layer          | Technology                                | Status                  |
| -------------- | ----------------------------------------- | ----------------------- |
| Framework      | React 19.2.4 + Vite 5.4.21                | Good                    |
| Routing        | React Router 6.30.3                       | Needs restructuring     |
| State          | React Context + React Query 5             | Context needs splitting |
| UI Primitives  | Radix UI + Tailwind 3.4.17                | Good                    |
| Forms          | react-hook-form + Zod (installed, unused) | Needs adoption          |
| i18n           | i18next 25.8.17                           | Good                    |
| SDUI           | Custom renderer with lazy widgets         | Good                    |
| Error Tracking | Sentry 10.38                              | Good                    |
| Toasts         | Radix toast + sonner (duplicate)          | Needs consolidation     |
