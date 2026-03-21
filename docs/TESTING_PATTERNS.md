# Testing Patterns

Conventions and patterns used across Fiducia's test suite.

## Running Tests

```bash
npm run test             # Vitest watch mode
npm run test:run         # Single run (what CI uses)
npm run test:coverage    # With coverage report
npm run test:e2e         # Playwright E2E (auto-starts dev server)
npm run test:e2e:headed  # E2E with visible browser

# Single file
npx vitest run src/hooks/__tests__/useAccounts.test.ts
```

## File Organization

- Place tests in `__tests__/` directories next to the source code
- Name files `*.test.ts` for pure logic, `*.test.tsx` for component tests
- Global setup lives in `src/test/setup.ts` (auto-loaded by vitest)

```
src/hooks/
├── useAccounts.ts
├── __tests__/
│   └── useAccounts.test.ts
```

## Coverage

Thresholds (from `vitest.config.ts`):

- Statements: 30%, Lines: 30%, Branches: 25%, Functions: 25%
- `src/components/ui/**` is excluded (shadcn primitives)

## Unit Test Patterns

### Testing React Hooks (TanStack Query)

Reference: `src/hooks/__tests__/useAccounts.test.ts`

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";

// 1. Mock the gateway BEFORE importing hooks that use it
vi.mock("@/lib/gateway", () => ({
  gateway: {
    accounts: { list: vi.fn(), get: vi.fn() },
  },
}));

import { gateway } from "@/lib/gateway";
import { useAccounts } from "../useAccounts";

// 2. Create a wrapper with retry disabled
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
}

describe("useAccounts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches accounts successfully", async () => {
    const mockAccounts = [{ id: "acct-1", type: "checking" }];
    vi.mocked(gateway.accounts.list).mockResolvedValue({ accounts: mockAccounts });

    const { result } = renderHook(() => useAccounts(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.accounts).toHaveLength(1);
  });
});
```

Key points:

- `vi.mock()` must be called **before** the import that uses the mocked module
- Always set `retry: false` in tests to avoid flaky timeouts
- Use `vi.mocked()` for type-safe mock setup
- Call `vi.clearAllMocks()` in `beforeEach`

### Testing Components

Reference: `src/components/common/__tests__/Spinner.test.tsx`

```ts
import { render, screen } from '@testing-library/react';
import { Spinner } from '../Spinner';

it('renders with default size', () => {
  render(<Spinner />);
  const spinner = screen.getByRole('status');
  expect(spinner).toBeInTheDocument();
});
```

Prefer accessible queries: `getByRole`, `getByText`, `getByLabelText` over CSS selectors.

### Testing Context Providers

Reference: `src/contexts/__tests__/TenantContext.test.tsx`

Context tests typically mock the backend module, then test state transitions:

```ts
vi.mock("@/lib/backend");

// Test initialization, loading states, error fallbacks
```

## Mocking Conventions

| What to mock    | How                                                                             |
| --------------- | ------------------------------------------------------------------------------- |
| Gateway calls   | `vi.mock('@/lib/gateway')` then `vi.mocked(gateway.xxx).mockResolvedValue(...)` |
| Backend/auth    | `vi.mock('@/lib/backend')`                                                      |
| Demo mode       | `vi.mock('@/lib/demo')`                                                         |
| Supabase client | Pre-mocked in `src/test/setup.ts` (automatic)                                   |
| Browser APIs    | `matchMedia`, `IntersectionObserver`, `ResizeObserver` pre-mocked in setup      |

## E2E Test Patterns

Reference: `e2e/auth.spec.ts`

```ts
import { test, expect } from "@playwright/test";

test.describe("Authentication", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("should display login form", async ({ page }) => {
    const signInButton = page.getByRole("button", { name: /sign in/i });
    await expect(signInButton).toBeVisible();
  });
});
```

- Dev server starts automatically (configured in `playwright.config.ts`)
- Browser matrix: Chromium, Firefox, WebKit, Mobile Chrome
- Use `page.getByRole()`, `page.getByText()`, `page.getByPlaceholder()` for locators
- Traces collected on first retry, screenshots on failure

## What to Test

- **Hooks:** Public API (return values, side effects). Mock the gateway/backend layer.
- **Components:** Rendering, user interactions, accessibility roles.
- **Contexts:** State machine behavior (init -> loading -> loaded/error).
- **Skip:** shadcn/ui primitives in `src/components/ui/` (excluded from coverage).

## Adding a New Test

1. Create `__tests__/YourThing.test.ts(x)` next to the source file
2. Import from vitest: `describe`, `it`, `expect`, `vi`, `beforeEach`
3. Set up `vi.mock()` calls before imports that depend on them
4. For hooks needing providers, use the `createWrapper()` pattern shown above
5. Run: `npx vitest run src/path/__tests__/your-file.test.ts`
6. Check coverage: `npm run test:coverage`
