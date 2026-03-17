import { describe, it, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { createElement } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/hooks/useSCA", () => ({
  useSCAConfig: vi.fn(() => ({
    data: {
      config: {
        enabled: true,
        defaultThreshold: 3000,
        biometricPreferred: true,
        challengeExpirySeconds: 300,
        supportedMethods: ["biometric", "otp"],
      },
    },
    isLoading: false,
    error: null,
  })),
  useSCATrustedDevices: vi.fn(() => ({ data: { devices: [] }, isLoading: false, error: null })),
  useBindSCADevice: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useUnbindSCADevice: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: vi.fn(() => ({ toast: vi.fn() })),
}));

vi.mock("@/hooks/useErrorHandler", () => ({
  useErrorHandler: vi.fn(() => ({ handleError: vi.fn() })),
}));

vi.mock("@/components/common/LoadingSkeleton", () => ({
  PageSkeleton: () => createElement("div", null, "Loading..."),
}));

vi.mock("@/components/common/EmptyState", () => ({
  EmptyState: () => createElement("div", null, "Empty"),
}));

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, createElement(MemoryRouter, null, children));
}

describe("SCAManagement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders without crashing", async () => {
    const { default: SCAManagement } = await import("../SCAManagement");
    render(createElement(SCAManagement), { wrapper: createWrapper() });
  });
});
