import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { createElement } from "react";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("@/contexts/TenantContext", () => ({
  useAuth: vi.fn(() => ({
    user: { id: "u-1" },
    isAuthenticated: true,
    isLoading: false,
    tenant: { tenantId: "t-1" },
  })),
}));

vi.mock("react-router-dom", () => ({
  useNavigate: vi.fn(() => vi.fn()),
  useSearchParams: vi.fn(() => [new URLSearchParams(), vi.fn()]),
  useParams: vi.fn(() => ({})),
  Link: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock("@/hooks/useAccounts", () => ({
  useAccounts: vi.fn(() => ({
    data: {
      accounts: [{ id: "acct-1", nickname: "Checking", accountNumberMasked: "****1234" }],
    },
    isLoading: false,
  })),
}));

vi.mock("@/hooks/useStatements", () => ({
  useStatements: vi.fn(() => ({
    data: { statements: [] },
    isLoading: false,
  })),
  useStatementConfig: vi.fn(() => ({
    data: {
      config: {
        supportedFormats: ["pdf"],
        retentionMonths: 24,
        eStatementsEnabled: true,
      },
    },
  })),
}));

vi.mock("@/lib/gateway", () => ({
  gateway: {
    statements: { download: vi.fn().mockResolvedValue({ downloadUrl: "https://example.com" }) },
    request: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Statements page", () => {
  it("renders without crashing", async () => {
    const { default: Statements } = await import("../Statements");
    const { container } = render(createElement(Statements));
    expect(container).toBeTruthy();
  });

  it("displays the page heading", async () => {
    const { default: Statements } = await import("../Statements");
    render(createElement(Statements));
    expect(screen.getByText("Statements")).toBeTruthy();
  });

  it("shows statement config info", async () => {
    const { default: Statements } = await import("../Statements");
    render(createElement(Statements));
    expect(screen.getByText("24 months")).toBeTruthy();
    expect(screen.getByText("eStatements Enabled")).toBeTruthy();
  });

  it("shows account selector prompt when no account selected", async () => {
    const { default: Statements } = await import("../Statements");
    render(createElement(Statements));
    expect(screen.getByText("Select an account to view statements.")).toBeTruthy();
  });
});
